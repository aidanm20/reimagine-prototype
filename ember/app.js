/* ===== Reimagine Renting — Ember prototype logic ===== */
(function(){
  /* Paste a Google Maps JS API key to enable the Step-1 map (pins for the
     3 apartments + destination). Leave "" to keep the static placeholder. */
  const GOOGLE_MAPS_API_KEY = "AIzaSyBXm34BHWVKOt9KIIUywGBorj97YOZmQNQ";

  /* ---------------- icons ---------------- */
  const SVG = (p, sw=1.9, s=15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const ICON = {
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9h14v-9"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    grid:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
    target:'<path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    dollar:'<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    bed:'<path d="M2 16V7a1 1 0 0 1 1-1h11a3 3 0 0 1 3 3v3"/><path d="M2 12h20v6"/><path d="M2 18v2M22 18v2"/>',
    bath:'<path d="M4 12V5a2 2 0 0 1 4 0"/><path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 19l-1 2M18 19l1 2"/>',
    size:'<path d="M3 3h18v18H3Z"/><path d="M9 3v4M3 9h4M21 15h-4M15 21v-4"/>',
    train:'<rect x="4" y="3" width="16" height="14" rx="3"/><path d="M4 11h16M8 21l2-3M16 21l-2-3"/><circle cx="8.5" cy="13.5" r="0"/>',
    box:'<path d="M3 9 12 4l9 5v6l-9 5-9-5Z"/><path d="M3 9l9 5 9-5M12 14v7"/>',
    gauge:'<path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="m13.4 10.6 4-4"/><path d="M4 17a9 9 0 1 1 16 0"/>',
  };
  const tick = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>';
  const star = (s=12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 20.5l1.4-6.8L2.2 9l6.9-.7Z"/></svg>`;

  /* ---------------- steps / nav ---------------- */
  const STEPS = [
    {id:'v2', label:'Listings',   sub:'3 saved',       ic:ICON.home},
    {id:'v3', label:'Priorities', sub:'What matters',  ic:ICON.list},
    {id:'v4', label:'Comparison', sub:'Analysis',      ic:ICON.grid},
    {id:'v5', label:'Trade offs', sub:'Summary',       ic:ICON.target},
  ];
  const idx = id => STEPS.findIndex(s=>s.id===id);

  const stepsEl = document.getElementById('steps');
  STEPS.forEach(s=>{
    const b=document.createElement('button');
    b.className='step'; b.dataset.target=s.id;
    b.innerHTML=`<span class="ic">${SVG(s.ic,1.8,17)}</span><span class="tx"><b>${s.label}</b></span>`;
    b.onclick=()=>go(s.id);
    stepsEl.appendChild(b);
  });

  window.go = function(id){
    const ci=idx(id);
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('show', v.id===id));
    document.querySelectorAll('.step').forEach((el,i)=>{
      el.classList.toggle('active', el.dataset.target===id);
      el.classList.toggle('done', i<ci);
      el.querySelector('.ic').innerHTML = i<ci ? tick : SVG(STEPS[i].ic,1.8,17);
    });
    const pct=Math.round(((ci+1)/STEPS.length)*100);
    document.getElementById('progBar').style.width=pct+'%';
    document.getElementById('progPct').textContent=pct+'%';
    document.getElementById('progStep').textContent=`${ci+1} of ${STEPS.length} steps`;
    const topTitle = document.getElementById('topTitle');
    if(topTitle) topTitle.textContent=STEPS[ci].label;
    // animate score bars and refresh the map when comparison shows
    if(id==='v4') requestAnimationFrame(()=>{ animateScores('#fitGlance'); refreshCompareMap(); });
    window.scrollTo({top:0,behavior:'instant'});
  };
  function animateScores(scope){
    document.querySelectorAll(`${scope} .st > i`).forEach(i=>{ const w=i.dataset.w; i.style.width='0%'; requestAnimationFrame(()=>{ i.style.width=w; }); });
  }

  /* ---------------- chip interactivity ---------------- */
  document.addEventListener('click', e=>{
    const chip=e.target.closest('.chip[data-chip]');
    if(!chip) return;
    const grp=chip.getAttribute('data-group');
    if(grp){ chip.parentElement.querySelectorAll(`.chip[data-group="${grp}"]`).forEach(c=>c.classList.remove('is-on')); chip.classList.add('is-on'); }
    else {
      const max=Number(chip.parentElement.getAttribute('data-max')) || 0;
      const isOn=chip.classList.contains('is-on');
      const selected=chip.parentElement.querySelectorAll('.chip.is-on').length;
      if(!isOn && max && selected>=max) return;
      chip.classList.toggle('is-on');
    }
  });

  /* =================== DATA =================== */
  const LISTINGS=[
    {tag:'A',name:'East Boston Studio',hood:'East Boston',rent:'$1,975',bed:'Studio',bath:'1 bath',size:'281 sqft',
     snap:'Compact studio with the lowest listed rent and basic apartment features.',
     rows:[['Amenities','Refrigerator; basic',1],['Laundry','Not listed',0],['Pet policy','Not listed',0],['Parking','Not listed',0],['Visible fees','May apply',0]],
     dist:'Farther from Kendall / MIT — likely cross-harbor commute.'},
    {tag:'B',name:'Cambridge Micro-Studio',hood:'Cambridge / Inman–Central',rent:'$1,900',bed:'Studio',bath:'1 bath',size:'290 sqft',
     snap:'Very small studio in a central, well-connected Cambridge location.',
     rows:[['Amenities','Basic; verify',0],['Laundry','Not listed',0],['Pet policy','Not listed',0],['Parking','Not listed',0],['Visible fees','Total shown; verify',0]],
     dist:'Closest to Kendall / MIT / Central.'},
    {tag:'C',name:'Allston 1-Bedroom',hood:'Allston',rent:'$2,400',bed:'1 bed',bath:'1 bath',size:'637 sqft',
     snap:'Larger 1BR in a brick building near BU, the Green Line B, and Star Market.',
     rows:[['Amenities','A/C, dishwasher, hardwood',1],['Laundry','On-site',1],['Pet policy','Not listed',0],['Parking','On-site available',1],['Visible fees','May apply',0]],
     dist:'Farther than Cambridge, but more spacious & lifestyle-rich.'},
  ];
  const lc=document.getElementById('listingCards');
  if(lc){
    LISTINGS.forEach(L=>{
      const confirmed=L.rows.filter(r=>r[2]).length, total=L.rows.length, pct=Math.round(confirmed/total*100);
      const rows=L.rows.map(r=>`<div class="d"><span class="dk">${r[0]}</span>${r[2]?`<span class="dv">${r[1]}</span>`:`<span class="dv unk">${r[1]}<span class="qmark">?</span></span>`}</div>`).join('');
      const el=document.createElement('article');
      el.className='card listing';
      el.innerHTML=`
        <div class="media">${SVG(ICON.home,1.6,30)}
          <span class="opt">Option ${L.tag}</span>
          <span class="price">${L.rent}<small>/mo</small></span></div>
        <div class="body">
          <h3>${L.name}</h3>
          <div class="hood">${SVG(ICON.pin,2,14)}${L.hood}</div>
          <div class="specs">
            <span class="s">${SVG(ICON.bed,2,15)}${L.bed}</span>
            <span class="s">${SVG(ICON.bath,2,15)}${L.bath}</span>
            <span class="s">${SVG(ICON.size,2,15)}${L.size}</span></div>
          <p class="snap">${L.snap}</p>
          <div class="det">${rows}</div>
          <div class="meter">
            <div class="ml"><span>Listing detail confirmed</span><span>${confirmed}/${total}</span></div>
            <div class="mt"><i style="width:${pct}%"></i></div></div>
          <details class="acts listing-actions">
            <summary>Actions</summary>
            <div class="listing-action-menu">
              <button type="button" class="listing-action-item primary">Apply</button>
              <button type="button" class="listing-action-item">Review</button>
              <button type="button" class="listing-action-item danger">Reject</button>
            </div>
          </details>
        </div>`;
      lc.appendChild(el);
    });
  }

  document.addEventListener('click', e=>{
    const openMenu=e.target.closest('.listing-actions[open]');
    document.querySelectorAll('.listing-actions[open]').forEach(menu=>{
      if(menu!==openMenu) menu.removeAttribute('open');
    });
    if(e.target.closest('.listing-action-item')){
      e.target.closest('.listing-actions')?.removeAttribute('open');
    }
  });

  /* ----- priorities ----- */
  const QS=[
    {q:'Besides rent, what matters most?',hint:'choose up to 2',type:'multi',max:2,
     opts:['Short commute','Lower total cost','Daily convenience','Quiet environment','Social / lively','Larger space','Safety / comfort','Flexibility','Lower upfront cost']},
    {q:'What neighborhood feeling do you prefer?',hint:'pick one',type:'single',
     opts:['Quiet & residential','Lively & social','Walkable & convenient','Close to work','Diverse & local','Clean & predictable','Creative / artsy','No preference']},
    {q:'What would make an apartment feel wrong?',hint:'choose up to 2',type:'multi',max:2,
     opts:['Too noisy','Too isolated','Too small','Bad commute','No grocery nearby','Unclear fees','Pricey after extras','Not enough light','Doesn’t feel safe','Too far from friends']},
    {q:'Which option are you leaning toward — and why?',hint:'open response',type:'text'},
  ];
  function qCard(item,i){
    const el=document.createElement('div'); el.className='card q';
    let chips;
    if(item.type==='text') chips=`<textarea class="input-ph tall q-text" rows="4" placeholder="Type your answer..."></textarea>`;
    else {
      const single=item.type==='single';
      const maxAttr=item.max?` data-max="${item.max}"`:'';
      chips=`<div class="chips-wrap"${maxAttr}>`+item.opts.map((o,oi)=>{
        const on=item.pre&&item.pre.includes(oi);
        const grp=single?` data-group="q${i}"`:'';
        return `<span class="chip ${single?'radio ':''}${on?'is-on':''}" data-chip${grp}><span class="tick">${tick}</span>${o}</span>`;
      }).join('')+'</div>';
    }
    el.innerHTML=`<div class="q-head"><span class="q-num">${i+1}</span><div><div class="q-t">${item.q}</div><div class="q-hint">${item.hint}</div></div></div>${chips}`;
    return el;
  }
  const qc1=document.getElementById('qCol1'), qc2=document.getElementById('qCol2');
  if(qc1&&qc2) QS.forEach((it,i)=>(i%2===0?qc1:qc2).appendChild(qCard(it,i)));

  /* ----- score meters (commute / space / value) ----- */
  const SCORES={
    A:{Commute:35,Space:32,Value:70},
    B:{Commute:95,Space:20,Value:76},
    C:{Commute:55,Space:92,Value:48},
  };
  const SCORE_IC={Commute:ICON.train, Space:ICON.box, Value:ICON.gauge};
  function scoresHTML(tag){
    return '<div class="scores">'+Object.entries(SCORES[tag]).map(([k,v])=>
      `<div class="score"><div class="sl"><span class="sk">${SVG(SCORE_IC[k],2,13)}${k}</span><span class="sv">${v}</span></div><div class="st"><i data-w="${v}%" style="width:${v}%"></i></div></div>`
    ).join('')+'</div>';
  }

  /* ----- comparison: fit-at-a-glance ----- */
  const HEADS=[
    {tag:'A',name:'East Boston Studio',hood:'East Boston',rent:'$1,975',best:'Lowest rent'},
    {tag:'B',name:'Cambridge Micro-Studio',hood:'Inman / Central',rent:'$1,900',best:'Best commute'},
    {tag:'C',name:'Allston 1-Bedroom',hood:'Allston',rent:'$2,400',best:'Most space'},
  ];
  const fg=document.getElementById('fitGlance');
  if(fg){
    fg.innerHTML='<div class="fit-grid">'+HEADS.map(h=>
      `<div class="fit-col"><div class="fc-h"><span class="tag">${h.tag}</span><span class="nm">${h.name}<small>${h.hood} · ${h.rent}/mo</small></span></div>${scoresHTML(h.tag)}</div>`
    ).join('')+'</div>';
  }

  /* ----- comparison table ----- */
  const CMP={
    core:[
      {lab:'Listed rent',v:[{t:'$1,975'},{t:'$1,900',best:1},{t:'$2,400'}]},
      {lab:'Est. true monthly',est:1,v:[{t:'$2,120–$2,250'},{t:'$2,025–$2,110',best:1},{t:'$2,550–$2,700'}]},
      {lab:'Main cost uncertainty',v:[{t:'Utilities, laundry & fees',unk:1},{t:'Utilities, laundry & unit fees',unk:1},{t:'Higher rent; fees & parking',unk:1}]},
      {lab:'Commute friction',v:[{t:'Likely longer & less direct'},{t:'Strongest commute access',best:1},{t:'Moderate; less direct'}]},
      {lab:'Lease / move-in',v:[{t:'Fees may apply; utils unclear',unk:1},{t:'Details unclear; space tight',unk:1},{t:'Fees & parking to check',unk:1}]},
    ],
    you:[
      {lab:'Grocery access',v:[{t:'Basic local; verify',unk:1},{t:'Multiple urban options'},{t:'Star Market nearby',best:1}]},
      {lab:'Quiet / noise fit',v:[{t:'Quieter residential',best:1},{t:'Central — may feel busy'},{t:'Lively / student-heavy'}]},
    ]
  };
  const ct=document.getElementById('cmpTable');
  if(ct){
    const cell=(c,you)=>{
      let inner = c.unk?`<span class="unk">${c.t}<span class="qmark">?</span></span>`
                : c.best?`<span class="best">${SVG(ICON.target,2.4,12)}${c.t}</span>` : c.t;
      return `<div class="cl${you?' you':''}">${inner}</div>`;
    };
    let h=`<div class="ch corner"><span class="sec-label"> Listings</span></div>`;
    HEADS.forEach(hd=>{ h+=`<div class="ch"><div class="ch-top"><span class="tag">${hd.tag}</span><div><h4>${hd.name}</h4><div class="ch-rent">${hd.rent}<small>/mo</small></div></div></div></div>`; });
    h+=`<div class="seclab">Core fields</div>`;
    CMP.core.forEach(r=>{ h+=`<div class="rl">${r.lab}</div>`+r.v.map(c=>cell(c,false)).join(''); });
    h+=`<div class="seclab you">${star(12)}Your priorities</div>`;
    CMP.you.forEach(r=>{ h+=`<div class="rl you">${star(11)}${r.lab}</div>`+r.v.map(c=>cell(c,true)).join(''); });
    ct.innerHTML=h;
  }

  /* ----- trade-offs ----- */
  const TO=[
    {tag:'A',name:'East Boston',rent:'$1,975',pos:'Lowest listed rent of the three.',neg:'The rent edge shrinks once commute, utilities, laundry & unclear fees are counted.',fit:'Someone who prioritizes listed rent and can tolerate a less direct commute.'},
    {tag:'B',name:'Cambridge',rent:'$1,900',pos:'Strongest central access — lowest friction to Kendall / MIT.',neg:'Very small (290 sqft) — tough for storage, WFH, or a sense of home.',fit:'Commute-first renters who travel light.'},
    {tag:'C',name:'Allston',rent:'$2,400',pos:'Most space & daily-life convenience — grocery, cafés, a livable home.',neg:'Highest true monthly cost; less direct to Kendall / MIT / Central.',fit:'Renters trading budget for comfort & neighborhood life.'},
  ];
  const toc=document.getElementById('toCards');
  if(toc){
    TO.forEach(o=>{
      const el=document.createElement('div'); el.className='card to';
      el.innerHTML=`
        <div class="to-h"><div class="to-ht"><span class="tag">${o.tag}</span><h4>${o.name}</h4></div><span class="pill soft">${o.rent}/mo</span></div>
        <div class="to-b">
          <div class="tob pos"><div class="tl"><i></i>Strongest on</div><p>${o.pos}</p></div>
          <div class="tob neg"><div class="tl"><i></i>Watch out</div><p>${o.neg}</p></div>
          <div class="tob fit"><div class="tl"><i></i>Fits</div><p>${o.fit}</p></div></div>
        `;
      toc.appendChild(el);
    });
  }

  /* ----- decision matrix ----- */
  const DEC=['Apply','Save for later','Reject','Not sure'];
  const dm=document.getElementById('decMatrix');
  if(dm){
    [['A','East Boston'],['B','Cambridge'],['C','Allston']].forEach((o,ri)=>{
      const row=document.createElement('div'); row.className='drow';
      row.innerHTML=`<div class="dopt"><span class="tag">${o[0]}</span>Option ${o[0]} — ${o[1]}</div>
        <div class="seg">${DEC.map(d=>`<span class="chip radio" data-chip data-group="dec${ri}"><span class="tick">${tick}</span>${d}</span>`).join('')}</div>`;
      dm.appendChild(row);
    });
  }

   

  /* ----- recommendation ----- */
  const rec=document.getElementById('recCard');
  if(rec){
    rec.innerHTML=`
      <div class="rec-main">
        <div class="rec-copy">
          <div class="sec-label">Recommended next step</div>
          <div class="rec-title"><span class="tag">B</span><h3>Apply to Cambridge first</h3></div>
          <p>It best matches the stated priorities: shortest commute, lowest listed rent, and the least day-to-day friction for Kendall / MIT. The space trade-off is real, so treat it as the option to move on only if the micro-studio size feels livable in person.</p>
          <div class="rec-checks">
            <div class="rec-check"><b>Before applying</b><span>Confirm total monthly cost, utilities, laundry, and any move-in fees.</span></div>
            <div class="rec-check"><b>Backup plan</b><span>Keep Allston warm if the Cambridge layout feels too small after a tour.</span></div>
          </div>
        </div>
        <div class="rec-side">
          <span class="pill star">${star(12)}Best current fit</span>
          <div class="rec-score">
            <div><b>12 min</b><span>commute</span></div>
            <div><b>$1,900</b><span>listed rent</span></div>
            <div><b>Low</b><span>daily friction</span></div>
          </div>
        </div>
      </div>`;
  }

  /* ===================== GOOGLE MAPS ===================== */
  const PLACES=[
    {tag:'A',name:'East Boston Studio',hood:'East Boston',rent:'$1,975',lat:42.3702,lng:-71.0389},
    {tag:'B',name:'Cambridge Micro-Studio',hood:'Inman / Central',rent:'$1,900',lat:42.3656,lng:-71.1010},
    {tag:'C',name:'Allston 1-Bedroom',hood:'Allston',rent:'$2,400',lat:42.3536,lng:-71.1318},
  ];
  const DEST={name:'Destination',hood:'Kendall Sq / MIT',lat:42.3623,lng:-71.0843};
  const DAILY_TARGETS={
    'Grocery store':{name:'Star Market',hood:'Central Square grocery',lat:42.3652,lng:-71.1035},
    Cafe:{name:'Tatte Bakery & Cafe',hood:'Kendall Square cafe',lat:42.3628,lng:-71.0838},
    'CafÃ©':{name:'Tatte Bakery & Cafe',hood:'Kendall Square cafe',lat:42.3628,lng:-71.0838},
    'Gym':{name:'MIT Recreation',hood:'Campus gym',lat:42.3594,lng:-71.0951},
    'Park':{name:'Danehy Park',hood:'North Cambridge park',lat:42.3896,lng:-71.1323},
    'Library':{name:'Cambridge Public Library',hood:'Mid-Cambridge library',lat:42.3735,lng:-71.1106},
    'Pharmacy':{name:'CVS Pharmacy',hood:'Central Square pharmacy',lat:42.3658,lng:-71.1031},
    'Restaurants':{name:'Central Square restaurants',hood:'Central Square',lat:42.3655,lng:-71.1037},
    'Arts':{name:'MIT List Visual Arts Center',hood:'Kendall / MIT arts',lat:42.3603,lng:-71.0871},
    'Nightlife':{name:'The Sinclair',hood:'Harvard Square nightlife',lat:42.3736,lng:-71.1190},
    'Transit stop':{name:'Kendall/MIT Station',hood:'Red Line transit stop',lat:42.3625,lng:-71.0862},
  };
  const COMPARE_MODES=['Walk','Bike','Public transit','Drive','Mixed','Easiest, any mode'];
  const COMPARE_PLACES=['Grocery store','Cafe','Gym','Park','Library','Pharmacy','Restaurants','Arts','Nightlife','Transit stop'];
  const compareState={map:null,info:null,listingMarkers:[],targetMarker:null,results:[]};
  function pin(color){ return {path:'M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z',fillColor:color,fillOpacity:1,strokeColor:'#fff',strokeWeight:2,scale:1.15,anchor:new google.maps.Point(12,36),labelOrigin:new google.maps.Point(12,13)}; }
  function commuteLine(p){
    if(!p.commute) return 'Travel time calculating...';
    if(p.commute.error) return p.commute.error;
    return `${p.commute.duration} to ${DEST.hood} - ${p.commute.distance}`;
  }
  function infoHTML(t,s,extra){
    const extraLine=extra?`<br><span style="font-size:12px;color:#2c3038;font-weight:600;">${extra}</span>`:'';
    return `<div style="font-family:Montserrat,system-ui,sans-serif;padding:2px 4px 4px;min-width:170px;"><strong style="font-size:13px;">${t}</strong><br><span style="font-size:12px;color:#7c828f;">${s}</span>${extraLine}</div>`;
  }
  function commuteRows(status){
    return PLACES.map(p=>{
      const detail=status || commuteLine(p);
      const cls=p.commute&&p.commute.error?' muted':'';
      return `<div class="commute-row${cls}"><span class="tag">${p.tag}</span><div><b>${p.name}</b><small>${detail}</small></div></div>`;
    }).join('');
  }
  function renderCommutes(status){
    const el=document.getElementById('mapCommutes');
    if(!el) return;
    el.innerHTML=`<div class="commute-title">Travel time to ${DEST.hood}</div>${commuteRows(status)}`;
  }
  function fillSelect(id,opts,selectedIndex){
    const el=document.getElementById(id);
    if(!el||el.options.length) return el;
    el.innerHTML=opts.map((o,i)=>`<option value="${o}"${i===selectedIndex?' selected':''}>${o}</option>`).join('');
    return el;
  }
  function selectedCompareTarget(){
    const place=document.getElementById('comparePlace');
    const value=place&&place.value;
    if(value&&value.indexOf('Caf')===0) return DAILY_TARGETS.Cafe;
    return DAILY_TARGETS[value] || DAILY_TARGETS['Transit stop'];
  }
  function selectedTravelMode(){
    const mode=document.getElementById('compareMode');
    const value=mode&&mode.value;
    if(value==='Walk') return google.maps.TravelMode.WALKING;
    if(value==='Bike') return google.maps.TravelMode.BICYCLING;
    if(value==='Drive') return google.maps.TravelMode.DRIVING;
    return google.maps.TravelMode.TRANSIT;
  }
  function selectedModeLabel(){
    const mode=document.getElementById('compareMode');
    return mode&&mode.value ? mode.value : 'Public transit';
  }
  function compareRouteRows(status){
    return PLACES.map((p,i)=>{
      const result=compareState.results[i];
      const detail=status || (result&&result.detail) || 'Travel time unavailable';
      const cls=result&&result.error?' muted':'';
      return `<div class="compare-route${cls}"><span class="tag">${p.tag}</span><div><b>${p.name}</b><small>${detail}</small></div></div>`;
    }).join('');
  }
  function renderCompareRoutes(status){
    const el=document.getElementById('compareRouteList');
    if(!el) return;
    const target=selectedCompareTarget();
    el.innerHTML=`<div class="commute-title">${selectedModeLabel()} to ${target.name}</div>${compareRouteRows(status)}`;
  }
  function loadCompareTimes(){
    if(!(window.google&&google.maps)) return;
    const target=selectedCompareTarget();
    const travelMode=selectedTravelMode();
    const request={
      origins:PLACES.map(p=>({lat:p.lat,lng:p.lng})),
      destinations:[{lat:target.lat,lng:target.lng}],
      travelMode,
      unitSystem:google.maps.UnitSystem.IMPERIAL,
    };
    if(travelMode===google.maps.TravelMode.TRANSIT) request.transitOptions={departureTime:new Date()};
    const svc=new google.maps.DistanceMatrixService();
    svc.getDistanceMatrix(request,(response,status)=>{
      if(status!=='OK'||!response||!response.rows){
        compareState.results=PLACES.map(()=>({error:1,detail:'Travel time unavailable'}));
        renderCompareRoutes();
        return;
      }
      compareState.results=response.rows.map(row=>{
        const result=row.elements&&row.elements[0];
        if(result&&result.status==='OK') return {detail:`${result.duration.text} - ${result.distance.text}`};
        return {error:1,detail:`${selectedModeLabel()} route unavailable`};
      });
      renderCompareRoutes();
    });
  }
  function loadCommuteTimes(){
    const svc=new google.maps.DistanceMatrixService();
    svc.getDistanceMatrix({
      origins:PLACES.map(p=>({lat:p.lat,lng:p.lng})),
      destinations:[{lat:DEST.lat,lng:DEST.lng}],
      travelMode:google.maps.TravelMode.TRANSIT,
      transitOptions:{departureTime:new Date()},
      unitSystem:google.maps.UnitSystem.IMPERIAL,
    },(response,status)=>{
      if(status!=='OK'||!response||!response.rows){
        PLACES.forEach(p=>{ p.commute={error:'Travel time unavailable'}; });
        renderCommutes();
        return;
      }
      response.rows.forEach((row,i)=>{
        const result=row.elements&&row.elements[0];
        if(result&&result.status==='OK'){
          PLACES[i].commute={duration:result.duration.text,distance:result.distance.text};
        }else{
          PLACES[i].commute={error:'Transit route unavailable'};
        }
      });
      renderCommutes();
    });
  }
  function initMap(){
    const box=document.getElementById('mapBox');
    if(!box||!(window.google&&google.maps))return;
    box.classList.add('map-live'); box.style.position='relative'; box.innerHTML='<div id="gmap"></div><button class="map-commute-toggle" id="mapCommuteToggle" type="button" aria-controls="mapCommutes" aria-expanded="true">Hide times</button><div class="map-commutes" id="mapCommutes"></div>';
    const commuteToggle=document.getElementById('mapCommuteToggle');
    commuteToggle.addEventListener('click',()=>{
      const hidden=box.classList.toggle('commutes-hidden');
      commuteToggle.textContent=hidden?'Show times':'Hide times';
      commuteToggle.setAttribute('aria-expanded',String(!hidden));
    });
    renderCommutes('Calculating transit time...');
    const map=new google.maps.Map(document.getElementById('gmap'),{center:{lat:DEST.lat,lng:DEST.lng},zoom:12,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'cooperative',styles:[{featureType:'poi',elementType:'labels',stylers:[{visibility:'off'}]}]});
    const bounds=new google.maps.LatLngBounds(), iw=new google.maps.InfoWindow();
    PLACES.forEach(p=>{ const m=new google.maps.Marker({position:{lat:p.lat,lng:p.lng},map,icon:pin('#e1582f'),label:{text:p.tag,color:'#fff',fontSize:'12px',fontWeight:'700'},title:p.name}); m.addListener('click',()=>{iw.setContent(infoHTML(`Option ${p.tag} - ${p.name}`,`${p.hood} - ${p.rent}/mo`,commuteLine(p)));iw.open({map,anchor:m});}); bounds.extend(m.getPosition()); });
    const dmk=new google.maps.Marker({position:{lat:DEST.lat,lng:DEST.lng},map,icon:pin('#5b6ee0'),label:{text:'\u2605',color:'#fff',fontSize:'13px',fontWeight:'700'},title:DEST.name}); dmk.addListener('click',()=>{iw.setContent(infoHTML(DEST.name,DEST.hood));iw.open({map,anchor:dmk});}); bounds.extend(dmk.getPosition());
    map.fitBounds(bounds,64);
    loadCommuteTimes();
  }
  function initCompareControls(){
    const mode=fillSelect('compareMode',COMPARE_MODES,2);
    const place=fillSelect('comparePlace',COMPARE_PLACES,0);
    if(mode&&!mode.dataset.bound){
      mode.addEventListener('change',updateCompareMap);
      mode.dataset.bound='1';
    }
    if(place&&!place.dataset.bound){
      place.addEventListener('change',updateCompareMap);
      place.dataset.bound='1';
    }
    renderCompareRoutes('Choose options to compare travel time.');
  }
  function updateCompareMap(){
    initCompareControls();
    if(!compareState.map||!(window.google&&google.maps)){
      renderCompareRoutes('Map unavailable until Google Maps loads.');
      return;
    }
    const target=selectedCompareTarget();
    const pos={lat:target.lat,lng:target.lng};
    if(compareState.targetMarker){
      compareState.targetMarker.setPosition(pos);
      compareState.targetMarker.setTitle(target.name);
    }
    const bounds=new google.maps.LatLngBounds();
    compareState.listingMarkers.forEach(m=>bounds.extend(m.getPosition()));
    bounds.extend(pos);
    compareState.map.fitBounds(bounds,64);
    compareState.results=[];
    renderCompareRoutes('Calculating travel time...');
    loadCompareTimes();
  }
  function refreshCompareMap(){
    initCompareControls();
    if(compareState.map&&window.google&&google.maps){
      google.maps.event.trigger(compareState.map,'resize');
      updateCompareMap();
    }
  }
  function initCompareMap(){
    initCompareControls();
    const box=document.getElementById('compareMapBox');
    if(!box||!(window.google&&google.maps)) return;
    if(compareState.map){ updateCompareMap(); return; }
    box.classList.add('map-live');
    box.innerHTML='<div id="compareGmap"></div>';
    compareState.map=new google.maps.Map(document.getElementById('compareGmap'),{center:{lat:DEST.lat,lng:DEST.lng},zoom:12,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'cooperative',styles:[{featureType:'poi',elementType:'labels',stylers:[{visibility:'off'}]}]});
    compareState.info=new google.maps.InfoWindow();
    compareState.listingMarkers=PLACES.map(p=>{
      const marker=new google.maps.Marker({position:{lat:p.lat,lng:p.lng},map:compareState.map,icon:pin('#e1582f'),label:{text:p.tag,color:'#fff',fontSize:'12px',fontWeight:'700'},title:p.name});
      marker.addListener('click',()=>{ compareState.info.setContent(infoHTML(`Option ${p.tag} - ${p.name}`,`${p.hood} - ${p.rent}/mo`)); compareState.info.open({map:compareState.map,anchor:marker}); });
      return marker;
    });
    const target=selectedCompareTarget();
    compareState.targetMarker=new google.maps.Marker({position:{lat:target.lat,lng:target.lng},map:compareState.map,icon:pin('#5b6ee0'),label:{text:'\u2605',color:'#fff',fontSize:'13px',fontWeight:'700'},title:target.name});
    compareState.targetMarker.addListener('click',()=>{ const t=selectedCompareTarget(); compareState.info.setContent(infoHTML(t.name,t.hood)); compareState.info.open({map:compareState.map,anchor:compareState.targetMarker}); });
    updateCompareMap();
  }
  function initMaps(){
    initMap();
    initCompareMap();
  }
  function loadMaps(){
    if(!GOOGLE_MAPS_API_KEY)return;
    if(window.google&&google.maps){initMaps();return;}
    window.__rrInitMap=initMaps;
    const s=document.createElement('script'); s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(GOOGLE_MAPS_API_KEY)+'&callback=__rrInitMap'; s.async=true; s.defer=true; document.head.appendChild(s);
  }
  initCompareControls();
  loadMaps();

  go('v2');
})();
