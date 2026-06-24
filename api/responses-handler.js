const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function normalizeSupabaseProjectUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '');
}

function readJson(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(JSON.parse(req.body));

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        const error = new Error('Request body is too large.');
        error.statusCode = 413;
        reject(error);
        req.destroy();
      }
    });
    req.on('end', () => {
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

  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.SUPABASE_URL);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = process.env.SUPABASE_TABLE || process.env.SUPABASE_RESPONSES_TABLE || 'research_responses';

  if (!supabaseUrl || !serviceRoleKey) {
    send(res, 500, { error: 'Supabase environment variables are missing.' });
    return;
  }

  let payload;
  try {
    payload = await readJson(req);
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
    clientContext: payload.browser && typeof payload.browser === 'object' ? payload.browser : null,
  };

  const row = {
    participant_name: String(payload.participant_name || '').trim() || null,
    session_id: String(payload.session_id || crypto.randomUUID()),
    responses: responseData,
    source: payload.source || 'reimagine-renting',
    user_agent: req.headers['user-agent'] || null,
  };

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
      body: JSON.stringify(row),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      send(res, response.status, {
        error: 'Supabase insert failed.',
        details: data && (data.message || data.error || data),
      });
      return;
    }

    send(res, 200, { ok: true, id: Array.isArray(data) && data[0] ? data[0].id : null });
  } catch (error) {
    send(res, 500, {
      error: 'Response could not be saved.',
      details: error && error.message ? error.message : 'Unknown error.',
    });
  }
}

module.exports = { handleResponseSubmit };
