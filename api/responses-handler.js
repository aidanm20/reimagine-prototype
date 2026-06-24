const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_SUPABASE_TIMEOUT_MS = 10000;

function loadLocalEnv() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '..', '.env'),
  ];

  candidates.forEach(file => {
    if (!fs.existsSync(file)) return;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) return;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    });
  });
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function cleanString(value, maxLength) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function normalizeBrowserContext(browser) {
  if (!browser || typeof browser !== 'object') return null;
  return {
    userAgent: cleanString(browser.userAgent, 500),
    language: cleanString(browser.language, 50),
    online: typeof browser.online === 'boolean' ? browser.online : null,
  };
}

function normalizeSupabaseProjectUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '');
}

function isJsonRequest(req) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  return contentType.includes('application/json') || contentType.includes('+json');
}

function readJson(req, maxBodyBytes) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(JSON.parse(req.body));

  return new Promise((resolve, reject) => {
    let raw = '';
    let bytes = 0;
    let tooLarge = false;
    req.on('data', chunk => {
      if (tooLarge) return;
      bytes += Buffer.byteLength(chunk);
      raw += chunk;
      if (bytes > maxBodyBytes) {
        tooLarge = true;
        const error = new Error('Request body is too large.');
        error.statusCode = 413;
        reject(error);
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooLarge) return;
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function handleResponseSubmit(req, res) {
  loadLocalEnv();

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed.' });
    return;
  }

  if (!isJsonRequest(req)) {
    send(res, 415, { error: 'Content-Type must be application/json.' });
    return;
  }

  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.SUPABASE_URL);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = process.env.SUPABASE_TABLE || process.env.SUPABASE_RESPONSES_TABLE || 'research_responses';
  const maxBodyBytes = envNumber('MAX_REQUEST_BODY_BYTES', DEFAULT_MAX_BODY_BYTES);
  const supabaseTimeoutMs = envNumber('SUPABASE_TIMEOUT_MS', DEFAULT_SUPABASE_TIMEOUT_MS);

  if (!supabaseUrl || !serviceRoleKey) {
    send(res, 500, { error: 'Supabase environment variables are missing.' });
    return;
  }

  let payload;
  try {
    payload = await readJson(req, maxBodyBytes);
  } catch (error) {
    if (error && error.statusCode === 413) {
      send(res, 413, { error: 'Request body is too large.' });
      return;
    }
    send(res, 400, { error: 'Invalid JSON payload.' });
    return;
  }

  const responses = payload.responses;
  if (!responses || typeof responses !== 'object') {
    send(res, 400, { error: 'Missing responses object.' });
    return;
  }

  const responseData = {
    ...responses,
    clientContext: normalizeBrowserContext(payload.browser),
  };

  const row = {
    participant_name: cleanString(payload.participant_name, 100),
    session_id: cleanString(payload.session_id, 120) || crypto.randomUUID(),
    responses: responseData,
    source: cleanString(payload.source, 80) || 'reimagine-renting',
    user_agent: cleanString(req.headers['user-agent'], 500),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), supabaseTimeoutMs);

  try {
    const url = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      signal: controller.signal,
      body: JSON.stringify(row),
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        data = { message: text.slice(0, 500) };
      }
    }

    if (!response.ok) {
      send(res, response.status, {
        error: 'Supabase insert failed.',
        details: data && (data.message || data.error || 'Supabase returned an error.'),
      });
      return;
    }

    send(res, 200, { ok: true, id: Array.isArray(data) && data[0] ? data[0].id : null });
  } catch (error) {
    const isTimeout = error && error.name === 'AbortError';
    send(res, 500, {
      error: isTimeout ? 'Response save timed out.' : 'Response could not be saved.',
      details: isTimeout ? 'Supabase did not respond in time.' : (error && error.message ? error.message : 'Unknown error.'),
    });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { handleResponseSubmit };
