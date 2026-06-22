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
    const isFlowScreen = ci < 0;
    document.querySelector('.app').classList.toggle('is-flow', isFlowScreen);
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('show', v.id===id));
    document.querySelectorAll('.step').forEach((el,i)=>{
      el.classList.toggle('active', !isFlowScreen && el.dataset.target===id);
      el.classList.toggle('done', !isFlowScreen && i<ci);
      el.querySelector('.ic').innerHTML = (!isFlowScreen && i<ci) ? tick : SVG(STEPS[i].ic,1.8,17);
    });
    if(isFlowScreen){
      window.scrollTo({top:0,behavior:'instant'});
      return;
    }
    const pct=Math.round(((ci+1)/STEPS.length)*100);
    document.getElementById('progBar').style.width=pct+'%';
    document.getElementById('progPct').textContent=pct+'%';
    document.getElementById('progStep').textContent=`${ci+1} of ${STEPS.length} steps`;
    const topTitle = document.getElementById('topTitle');
    if(topTitle) topTitle.textContent=STEPS[ci].label;
    if(id==='v4') requestAnimationFrame(refreshCompareMap);
    if(id==='v5') requestAnimationFrame(()=>animateScores('#toCards'));
    window.scrollTo({top:0,behavior:'instant'});
  };
  function animateScores(scope){
    document.querySelectorAll(`${scope} .st > i`).forEach(i=>{ const w=i.dataset.w; i.style.width='0%'; requestAnimationFrame(()=>{ i.style.width=w; }); });
  }

  const welcomeForm=document.getElementById('welcomeForm');
  if(welcomeForm){
    welcomeForm.addEventListener('submit', e=>{
      e.preventDefault();
      const name=document.getElementById('participantName').value.trim();
      if(!name){
        document.getElementById('participantName').focus();
        return;
      }
      window.participantName=name;
      go('v2');
    });
  }

  function responseSessionId(){
    const key='rr_session_id';
    let id=sessionStorage.getItem(key);
    if(!id){
      id=(window.crypto&&crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(key,id);
    }
    return id;
  }

  function cleanText(value){
    return String(value || '').replace(/\s+/g,' ').trim();
  }

  function chipText(chip){
    return cleanText(chip.textContent);
  }

  function selectedChipTexts(root){
    return [...root.querySelectorAll('.chip.is-on')].map(chipText).filter(Boolean);
  }

  function questionTitle(root){
    const title=root.querySelector('.q-t,.dq-t');
    if(!title) return '';
    const clone=title.cloneNode(true);
    clone.querySelectorAll('.n').forEach(n=>n.remove());
    return cleanText(clone.textContent);
  }

  function collectPriorityAnswers(){
    return [...document.querySelectorAll('#v3 .q')].map((card,i)=>({
      index:i+1,
      question:questionTitle(card),
      selected:selectedChipTexts(card),
      text:cleanText((card.querySelector('textarea,input') || {}).value),
    }));
  }

  function collectDecisionMatrix(id){
    const matrix=document.getElementById(id);
    if(!matrix) return [];
    return [...matrix.querySelectorAll('.drow')].map(row=>({
      option:cleanText((row.querySelector('.dopt') || {}).textContent),
      decision:chipText(row.querySelector('.chip.is-on') || ''),
    }));
  }

  function collectDebriefAnswers(){
    const debrief=document.querySelector('.trade-debrief');
    if(!debrief) return [];
    return [...debrief.querySelectorAll('.dq')].map((item,i)=>({
      index:i+1,
      question:questionTitle(item) || cleanText((item.querySelector('.dq-t') || {}).textContent),
      selected:selectedChipTexts(item),
      text:[...item.querySelectorAll('textarea,input')]
        .map(input=>cleanText(input.value))
        .filter(Boolean),
    }));
  }

  function collectResponses(){
    return {
      participantName:window.participantName || cleanText((document.getElementById('participantName') || {}).value),
      sessionId:responseSessionId(),
      submittedAt:new Date().toISOString(),
      priorities:collectPriorityAnswers(),
      listingDecisions:collectDecisionMatrix('decMatrixListings'),
      tradeoffDecisions:collectDecisionMatrix('decMatrix'),
      comparisonControls:{
        transportation:(document.getElementById('compareMode') || {}).value || null,
        destination:(document.getElementById('comparePlace') || {}).value || null,
        optionsPerListing:(document.getElementById('compareCount') || {}).value || null,
      },
      debrief:collectDebriefAnswers(),
    };
  }

  async function submitResponses(){
    const responses=collectResponses();
    const res=await fetch('/api/responses',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        participant_name:responses.participantName,
        session_id:responses.sessionId,
        responses,
        source:'reimagine-renting',
      }),
    });
    if(!res.ok){
      const body=await res.json().catch(()=>({}));
      throw new Error(body.details || body.error || 'Response save failed.');
    }
  }

  const finishButton=document.getElementById('finishButton');
  if(finishButton){
    finishButton.addEventListener('click',async ()=>{
      const original=finishButton.textContent;
      finishButton.disabled=true;
      finishButton.textContent='Saving...';
      try{
        await submitResponses();
        go('thanks');
      }catch(error){
        console.error(error);
        alert(`Your response could not be saved. ${error.message}`);
        finishButton.disabled=false;
        finishButton.textContent=original;
      }
    });
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
    updateFutureContact();
  });

  function updateFutureContact(){
    const field=document.getElementById('futureContactField');
    if(!field) return;
    const selected=document.querySelector('.chip[data-group="future-review"].is-on');
    field.classList.toggle('show', !!(selected && selected.dataset.contact==='show'));
  }

  /* =================== DATA =================== */
  const LISTINGS=[
    {tag:'a',name:'East Boston Studio',hood:'East Boston',rent:'$1,975',bed:'Studio',bath:'1 bath',size:'281 sqft',
     snap:'Compact studio with the lowest listed rent and basic apartment features.',
     rows:[['Amenities','Refrigerator; basic',1],['Laundry','Not listed',0],['Pet policy','Not listed',0],['Parking','Not listed',0],['Visible fees','May apply',0]],
     dist:'Farther from Kendall / Mit — likely cross-harbor commute.'},
    {tag:'b',name:'Cambridge Micro-Studio',hood:'Cambridge / Inman–Central',rent:'$1,900',bed:'Studio',bath:'1 bath',size:'290 sqft',
     snap:'Very small studio in a central, well-connected Cambridge location.',
     rows:[['Amenities','Basic; verify',0],['Laundry','Not listed',0],['Pet policy','Not listed',0],['Parking','Not listed',0],['Visible fees','Total shown; verify',0]],
     dist:'Closest to Kendall / Mit / Central.'},
    {tag:'c',name:'Allston 1-Bedroom',hood:'Allston',rent:'$2,400',bed:'1 bed',bath:'1 bath',size:'637 sqft',
     snap:'Larger 1br in a brick building near Bu, the Green Line b, and Star Market.',
     rows:[['Amenities','a/c, dishwasher, hardwood',1],['Laundry','On-site',1],['Pet policy','Not listed',0],['Parking','On-site available',1],['Visible fees','May apply',0]],
     dist:'Farther than Cambridge, but more spacious & lifestyle-rich.'},
  ];
  const LISTING_DETAILS=[
    {tag:'a',name:'East Boston Studio',hood:'East Boston',rent:'$1,975',feeNote:'Price may not include required fees and charges.',bed:'Studio',bath:'1 bath',size:'281 sqft',
     snap:'Recently renovated lofted studio with a private entrance, updated kitchen, and refreshed bathroom.',
     rows:[['Kitchen','Updated; quartz counters',1],['Laundry','Shared on-site',1],['Pets','Cats and dogs allowed',1],['Deposit','$750',1],['Income','Approx. 2.5x rent',1],['Available','Now',1]],
     detailSections:[
       {title:'Apartment',items:[['Appliances','Refrigerator; range/oven'],['Kitchen','Updated kitchen; quartz countertops'],['Flooring','Vinyl plank flooring'],['Other features','Private entrance; lofted layout']]},
       {title:'Building and Rules',items:[['Laundry','Shared on-site laundry'],['Pets','Cats and dogs allowed'],['Parking','Contact property manager for details'],['Utilities','Not specified']]},
       {title:'Move-In and Approval',items:[['Security deposit','$750'],['Lease term','Contact property manager for details'],['Income requirement','Monthly gross income of approximately 2.5x rent'],['Credit requirement','Minimum credit score of 600'],['Availability','Available now']]}
     ],
     confirm:'Additional required, optional, or usage-based fees may apply. Contact the property manager for complete pricing details.'},
    {tag:'b',name:'Cambridge Micro-Studio',hood:'Cambridge / Inman-Central area',rent:'$1,900',feeNote:'No broker fee advertised.',bed:'Studio',bath:'1 bath',size:'290 sqft',
     snap:'Very small studio in a central Cambridge location, with convenient access to Central Square, Harvard, MIT, Whole Foods, and the Charles River.',
     rows:[['Utilities in','Heat, water, hot water',1],['Laundry','Shared basement',1],['Parking','$160/mo available',1],['Broker fee','None advertised',1],['Pets','Approval required',0],['Move-in','First, last, deposit',1]],
     detailSections:[
       {title:'Apartment',items:[['Appliances','Refrigerator; oven'],['Cooling','Wall-unit cooling'],['Flooring','Hardwood flooring']]},
       {title:'Building and Rules',items:[['Laundry','Shared washer and dryer in basement'],['Pets','Pets considered with landlord approval'],['Parking','Off-street backyard parking available for $160/month']]},
       {title:'Utilities and Fees',items:[['Utilities included','Heat; water; hot water; landscaping'],['Utilities not included','Electricity; internet'],['First month\'s rent','Required'],['Last month\'s rent','Required'],['Security deposit','$1,900'],['Broker fee','No broker fee advertised']]},
       {title:'Lease and Approval',items:[['Lease term','Not listed'],['Income requirement','Not listed'],['Credit requirement','Not listed']]}
     ],
     confirm:'Additional application, pet, or other charges may apply. Confirm all required payments and approval criteria with the landlord.'},
    {tag:'c',name:'Allston 1BR',hood:'Gardner Street Apartments, Allston',rent:'$2,400',feeNote:'Price may not include required fees and charges.',bed:'1 bed',bath:'1 bath',size:'637 sqft',
     snap:'Larger one-bedroom apartment in a brick building near Boston University, Green Line B, Star Market, dining, and entertainment.',
     rows:[['Utilities in','Heat and hot water',1],['Laundry','Shared on-site',1],['Parking','$175/mo if available',1],['Lease','12 months',1],['Offer','1 month free possible',1],['Available','Sep 1, 2026',1]],
     detailSections:[
       {title:'Apartment',items:[['Address','75-84 Gardner St, Unit 2B, Allston'],['Appliances','Dishwasher; garbage disposal'],['Cooling','Air conditioning'],['Flooring','Hardwood flooring'],['Kitchen','Eat-in kitchen']]},
       {title:'Building and Rules',items:[['Building features','Sundeck; 24-hour emergency maintenance'],['Laundry','Shared on-site laundry'],['Pets','Pet-friendly; $75 pet charge listed'],['Parking','Covered or off-street parking available for $175/month, subject to availability']]},
       {title:'Utilities and Fees',items:[['Utilities included','Heat; hot water'],['Utilities not included','Electricity, internet, and other tenant-paid services not specified'],['First month\'s rent','$2,400 required'],['Last month\'s rent','$2,400 required'],['Security deposit','Up to one month may be required'],['Renters insurance','Required']]},
       {title:'Lease and Approval',items:[['Lease term','12 months'],['Special offer','One month free on qualifying vacant units; conditions apply'],['Income requirement','Not listed'],['Credit requirement','Not listed'],['Availability','September 1, 2026']]}
     ],
     confirm:'Additional required, optional, or variable fees may apply. Confirm the security deposit, pet-charge structure, parking availability, insurance cost, and promotional eligibility with the property manager.'},
  ];
  const lc=document.getElementById('listingCards');
  if(lc){
    LISTING_DETAILS.forEach(L=>{
      const rows=L.rows.map(r=>`<div class="d"><span class="dk">${r[0]}</span>${r[2]?`<span class="dv">${r[1]}</span>`:`<span class="dv unk">${r[1]}<span class="qmark">?</span></span>`}</div>`).join('');
      const sections=L.detailSections.map(section=>`
        <section class="detail-group">
          <h4>${section.title}</h4>
          <div class="detail-list">
            ${section.items.map(item=>`<div class="detail-item"><span>${item[0]}</span><strong>${item[1]}</strong></div>`).join('')}
          </div>
        </section>`).join('');
      const el=document.createElement('article');
      el.className='card listing';
      el.innerHTML=`
        <div class="media">${SVG(ICON.home,1.6,30)}
          <span class="opt">Option ${L.tag.toUpperCase()}</span>
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
          <details class="listing-more">
            <summary><span>Full listing details</span>${SVG('<path d="m6 9 6 6 6-6"/>',2,16)}</summary>
            <div class="listing-detail">
              <p class="fee-note">${L.feeNote}</p>
              ${sections}
              <p class="confirm-note">${L.confirm}</p>
            </div>
          </details>
        </div>`;
      lc.appendChild(el);
    });
  }

  /* ----- priorities ----- */
  const QS=[
    {q:'Besides rent, what matters most?',hint:'choose up to 2',type:'multi',max:2,
     opts:['Short commute','Lower total cost','Daily convenience','Quiet environment','Social / lively','Larger space','Safety / comfort','Flexibility','Lower upfront cost']},
    {q:'What neighborhood feeling do you prefer?',hint:'pick one',type:'single',
     opts:['Quiet & residential','Lively & social','Walkable & convenient','Close to work','Diverse & local','Clean & predictable','Creative / artsy','No preference']},
    {q:'What would make an apartment feel wrong?',hint:'choose up to 2',type:'multi',max:2,
     opts:['Too noisy','Too isolated','Too small','Bad commute','No grocery nearby','Unclear fees','Pricey after extras','Not enough light','Doesn’t feel safe','Too far from friends']},
    {q:'Will you be living with a pet?',hint:'Pick one.',type:'single',
     opts:['No pets','One cat','One dog','Multiple cats and/or dogs','Other pet(s)']},
    {q:'Will you need a parking space?',hint:'Pick one.',type:'single',
     opts:['No','Yes, regularly','Maybe','Not sure yet']},
    {q:'Which places would matter most near home?',hint:'choose up to 3',type:'multi',max:3,
     opts:['Grocery store','Pharmacy','Coffee shop','Gym or fitness studio','Park or outdoor space','Restaurants and bars','Laundry','Transit stop','Work or school','Friends or family','Healthcare','Library or community space']},
    {q:'How much walking before transit feels acceptable?',hint:'Pick one.',type:'single',
     opts:['5 minutes or less','6-10 minutes','11-15 minutes','16-20 minutes','More than 20 minutes is okay','Depends on the route']},
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
    a:{Commute:35,Space:32,Value:70},
    b:{Commute:95,Space:20,Value:76},
    c:{Commute:55,Space:92,Value:48},
  };
  const SCORE_IC={Commute:ICON.train, Space:ICON.box, Value:ICON.gauge};
  function scoresHTML(tag){
    return '<div class="scores">'+Object.entries(SCORES[tag]).map(([k,v])=>
      `<div class="score"><div class="sl"><span class="sk">${SVG(SCORE_IC[k],2,13)}${k}</span><span class="sv">${v}</span></div><div class="st"><i data-w="${v}%" style="width:${v}%"></i></div></div>`
    ).join('')+'</div>';
  }
  const tagLabel=tag=>String(tag).toUpperCase();

  /* ----- comparison: fit-at-a-glance ----- */
  const HEADS=[
    {tag:'a',name:'East Boston Studio',hood:'East Boston',rent:'$1,975',best:'Lowest rent'},
    {tag:'b',name:'Cambridge Micro-Studio',hood:'Inman / Central',rent:'$1,900',best:'Best commute'},
    {tag:'c',name:'Allston 1-Bedroom',hood:'Allston',rent:'$2,400',best:'Most space'},
  ];
  const fg=document.getElementById('fitGlance');
  if(fg){
    fg.innerHTML='<div class="fit-grid">'+HEADS.map(h=>
      `<div class="fit-col"><div class="fc-h"><span class="tag">${tagLabel(h.tag)}</span><span class="nm">${h.name}<small>${h.hood} · ${h.rent}/mo</small></span></div>${scoresHTML(h.tag)}</div>`
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
    HEADS.forEach(hd=>{ h+=`<div class="ch"><div class="ch-top"><span class="tag">${tagLabel(hd.tag)}</span><div><h4>${hd.name}</h4></div></div></div>`; });
    CMP.core.forEach(r=>{ h+=`<div class="rl">${r.lab}</div>`+r.v.map(c=>cell(c,false)).join(''); });
    h+=`<div class="seclab you">${star(12)}Your priorities</div>`;
    CMP.you.forEach(r=>{ h+=`<div class="rl you">${star(11)}${r.lab}</div>`+r.v.map(c=>cell(c,true)).join(''); });
    ct.innerHTML=h;
  }

  /* ----- trade-offs ----- */
  const TO=[
    {tag:'a',name:'East Boston',rent:'$1,975',pos:'Lowest listed rent of the three.',neg:'The rent edge shrinks once commute, utilities, laundry & unclear fees are counted.',fit:'Someone who prioritizes listed rent and can tolerate a less direct commute.'},
    {tag:'b',name:'Cambridge',rent:'$1,900',pos:'Strongest central access — lowest friction to Kendall / Mit.',neg:'Very small (290 sqft) — tough for storage, wfh, or a sense of home.',fit:'Commute-first renters who travel light.'},
    {tag:'c',name:'Allston',rent:'$2,400',pos:'Most space & daily-life convenience — grocery, cafés, a livable home.',neg:'Highest true monthly cost; less direct to Kendall / Mit / Central.',fit:'Renters trading budget for comfort & neighborhood life.'},
  ];
  TO.splice(0, TO.length,
    {tag:'a',name:'East Boston Studio',rent:'$1,975/month advertised',pos:'Pet-friendly, renovated, and potentially lower upfront cost than the other options.',neg:'The 281 sqft studio is very small, the commute to Kendall / MIT / Central is less direct, and several costs are still not fully listed.',fit:'You want a pet-friendly, more residential option and can tolerate a longer commute and some cost uncertainty.'},
    {tag:'b',name:'Cambridge Micro-Studio',rent:'$1,900/month advertised',pos:'Lowest estimated monthly cost and strongest access to Kendall / MIT / Central.',neg:'The 290 sqft studio offers very limited storage and work-from-home space, and approximately $5,700 is required before move-in.',fit:'You prioritize a short commute and lower monthly cost more than living space or lower upfront cost.'},
    {tag:'c',name:'Allston 1BR',rent:'$2,400/month advertised',pos:'By far the most space, with a separate bedroom, heat and hot water included, and strong access to groceries, caf&eacute;s, transit, dining, and neighborhood activity.',neg:'It has the highest estimated monthly cost, a less direct commute to Kendall / MIT / Central, and approximately $4,800&ndash;$7,200 may be needed before move-in, plus renters insurance.',fit:'You are willing to pay more for a larger, more livable home and stronger neighborhood convenience.'}
  );
  const toc=document.getElementById('toCards');
  if(toc){
    TO.forEach(o=>{
      const el=document.createElement('div'); el.className='card to';
      el.innerHTML=`
        <div class="to-h"><div class="to-ht"><span class="tag">${tagLabel(o.tag)}</span><h4>${o.name}</h4></div><span class="pill soft">${o.rent}</span></div>
        <div class="to-b">
          <div class="tob pos"><div class="tl"><i></i>Strongest on</div><p>${o.pos}</p></div>
          <div class="tob neg"><div class="tl"><i></i>Watch out</div><p>${o.neg}</p></div>
          <div class="tob fit"><div class="tl"><i></i>Best fit if</div><p>${o.fit}</p></div></div>
        <div class="to-scores">${scoresHTML(o.tag)}</div>
        `;
      toc.appendChild(el);
    });
  }

  /* ----- decision matrix ----- */
  const DEC=['Apply','Save for later','Reject','Not sure'];
  function renderDecisionMatrix(dm, groupPrefix){
    if(!dm) return;
    dm.innerHTML='';
    [['a','East Boston'],['b','Cambridge'],['c','Allston']].forEach((o,ri)=>{
      const row=document.createElement('div'); row.className='drow';
      row.innerHTML=`<div class="dopt"><span class="tag">${tagLabel(o[0])}</span>Option ${tagLabel(o[0])} — ${o[1]}</div>
        <div class="seg">${DEC.map(d=>`<span class="chip radio" data-chip data-group="${groupPrefix}${ri}"><span class="tick">${tick}</span>${d}</span>`).join('')}</div>`;
      dm.appendChild(row);
    });
  }

  renderDecisionMatrix(document.getElementById('decMatrix'), 'dec');
  renderDecisionMatrix(document.getElementById('decMatrixListings'), 'decListing');

  /* ===================== GOOGLE MAPS ===================== */
  const PLACES=[
    {tag:'a',name:'East Boston Studio',hood:'East Boston',rent:'$1,975',lat:42.3702,lng:-71.0389},
    {tag:'b',name:'Cambridge Micro-Studio',hood:'Inman / Central',rent:'$1,900',lat:42.3656,lng:-71.1010},
    {tag:'c',name:'Allston 1-Bedroom',hood:'Allston',rent:'$2,400',lat:42.3536,lng:-71.1318},
  ];
  const DEST={name:'Main Destination',hood:'Kendall Square / Mit / Central Square area',lat:42.3623,lng:-71.0843};
  const DAILY_TARGETS={
    'Grocery store':{name:'Star Market',hood:'Central Square grocery',lat:42.3652,lng:-71.1035},
    Cafe:{name:'Tatte Bakery & Cafe',hood:'Kendall Square cafe',lat:42.3628,lng:-71.0838},
    'CafÃ©':{name:'Tatte Bakery & Cafe',hood:'Kendall Square cafe',lat:42.3628,lng:-71.0838},
    'Gym':{name:'Mit Recreation',hood:'Campus gym',lat:42.3594,lng:-71.0951},
    'Park':{name:'Danehy Park',hood:'North Cambridge park',lat:42.3896,lng:-71.1323},
    'Library':{name:'Cambridge Public Library',hood:'Mid-Cambridge library',lat:42.3735,lng:-71.1106},
    'Pharmacy':{name:'Cvs Pharmacy',hood:'Central Square pharmacy',lat:42.3658,lng:-71.1031},
    'Restaurants':{name:'Central Square restaurants',hood:'Central Square',lat:42.3655,lng:-71.1037},
    'Arts':{name:'Mit List Visual Arts Center',hood:'Kendall / Mit arts',lat:42.3603,lng:-71.0871},
    'Nightlife':{name:'The Sinclair',hood:'Harvard Square nightlife',lat:42.3736,lng:-71.1190},
    'Transit stop':{name:'Kendall/Mit Station',hood:'Red Line transit stop',lat:42.3625,lng:-71.0862},
  };
  const COMPARE_MODES=['Walk','Bike','Public transit','Drive','Mixed','Easiest, any mode'];
  const PLACE_SEARCH={
    Work:null,
    'Grocery store':{keyword:'grocery store'},
    Cafe:{keyword:'cafe'},
    Gym:{keyword:'gym'},
    Park:{keyword:'park'},
    Library:{keyword:'library'},
    Pharmacy:{keyword:'pharmacy'},
    Restaurants:{keyword:'restaurant'},
    Arts:{keyword:'arts'},
    Nightlife:{keyword:'nightlife'},
    'Transit stop':{keyword:'transit stop'},
  };
  const FALLBACK_TARGETS={
    'Grocery store':[
      {name:'Shaw\'s East Boston',hood:'East Boston grocery',lat:42.3709,lng:-71.0385},
      {name:'Star Market',hood:'Central Square grocery',lat:42.3652,lng:-71.1035},
      {name:'Trader Joe\'s Allston',hood:'Allston grocery',lat:42.3550,lng:-71.1347},
    ],
    Cafe:[
      {name:'Caffe Vittoria',hood:'East Boston cafe',lat:42.3691,lng:-71.0396},
      {name:'1369 Coffee House',hood:'Central Square cafe',lat:42.3657,lng:-71.1031},
      {name:'Pavement Coffeehouse',hood:'Allston cafe',lat:42.3522,lng:-71.1314},
    ],
    Gym:[
      {name:'Planet Fitness East Boston',hood:'East Boston gym',lat:42.3742,lng:-71.0391},
      {name:'Mit Recreation',hood:'Campus gym',lat:42.3594,lng:-71.0951},
      {name:'Boston Sports Clubs Allston',hood:'Allston gym',lat:42.3529,lng:-71.1321},
    ],
    Park:[
      {name:'Piers Park',hood:'East Boston park',lat:42.3648,lng:-71.0352},
      {name:'Sennott Park',hood:'Cambridge park',lat:42.3666,lng:-71.1017},
      {name:'Ringer Park',hood:'Allston park',lat:42.3507,lng:-71.1344},
    ],
    Library:[
      {name:'East Boston Branch Library',hood:'East Boston library',lat:42.3755,lng:-71.0391},
      {name:'Cambridge Public Library',hood:'Mid-Cambridge library',lat:42.3735,lng:-71.1106},
      {name:'Honan-Allston Branch Library',hood:'Allston library',lat:42.3523,lng:-71.1372},
    ],
    Pharmacy:[
      {name:'Cvs Pharmacy',hood:'East Boston pharmacy',lat:42.3708,lng:-71.0390},
      {name:'Cvs Pharmacy',hood:'Central Square pharmacy',lat:42.3658,lng:-71.1031},
      {name:'Walgreens Pharmacy',hood:'Allston pharmacy',lat:42.3529,lng:-71.1308},
    ],
    Restaurants:[
      {name:'Angela\'s Cafe',hood:'East Boston restaurant',lat:42.3711,lng:-71.0398},
      {name:'Central Square restaurants',hood:'Central Square',lat:42.3655,lng:-71.1037},
      {name:'Lone Star Taco Bar',hood:'Allston restaurant',lat:42.3507,lng:-71.1342},
    ],
    Arts:[
      {name:'Ica Watershed',hood:'East Boston arts',lat:42.3626,lng:-71.0316},
      {name:'Mit List Visual Arts Center',hood:'Kendall / Mit arts',lat:42.3603,lng:-71.0871},
      {name:'Studio 52',hood:'Allston arts',lat:42.3568,lng:-71.1274},
    ],
    Nightlife:[
      {name:'The Quiet Few',hood:'East Boston nightlife',lat:42.3710,lng:-71.0402},
      {name:'The Sinclair',hood:'Harvard Square nightlife',lat:42.3736,lng:-71.1190},
      {name:'Silhouette Lounge',hood:'Allston nightlife',lat:42.3524,lng:-71.1315},
    ],
    'Transit stop':[
      {name:'Maverick Station',hood:'Blue Line transit stop',lat:42.3691,lng:-71.0395},
      {name:'Central Station',hood:'Red Line transit stop',lat:42.3655,lng:-71.1038},
      {name:'Harvard Ave Station',hood:'Green Line transit stop',lat:42.3502,lng:-71.1317},
    ],
  };
  const COMPARE_PLACES=['Work','Grocery store','Cafe','Gym','Park','Library','Pharmacy','Restaurants','Arts','Nightlife','Transit stop'];
  const compareState={map:null,info:null,listingMarkers:[],targetMarkers:[],routeRenderers:[],results:[],targets:[],searchToken:0};
  function pin(color){ return {path:'M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z',fillColor:color,fillOpacity:1,strokeColor:'#fff',strokeWeight:2,scale:1.15,anchor:new google.maps.Point(12,36),labelOrigin:new google.maps.Point(12,13)}; }
  function commuteLine(p){
    if(!p.commute) return 'Travel time calculating...';
    if(p.commute.error) return p.commute.error;
    return `${p.commute.duration} to ${DEST.hood} - ${p.commute.distance}`;
  }
  function infoHTML(t,s,extra){
    const extraLine=extra?`<br><span style="font-size:12px;color:#2c3038;font-weight:500;">${extra}</span>`:'';
    return `<div style="font-family:Ubuntu,Arial,Helvetica,sans-serif;padding:2px 4px 4px;min-width:170px;"><strong style="font-size:13px;font-weight:500;">${t}</strong><br><span style="font-size:12px;color:#7c828f;">${s}</span>${extraLine}</div>`;
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
  function selectedComparePlace(){
    const place=document.getElementById('comparePlace');
    return place&&place.value ? place.value : 'Work';
  }
  function isWorkCompare(){
    return selectedComparePlace()==='Work';
  }
  function selectedOptionCount(){
    const count=document.getElementById('compareCount');
    return Math.max(1,Math.min(5,Number(count&&count.value) || 3));
  }
  function updateOptionCountControl(){
    const hidden=isWorkCompare();
    const count=document.getElementById('compareCount');
    const value=document.getElementById('compareCountValue');
    const field=document.getElementById('compareCountField');
    if(count) count.disabled=hidden;
    if(value) value.textContent=hidden ? '1' : String(selectedOptionCount());
    if(field) field.hidden=hidden;
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
  function routeColor(i){
    return ['#e1582f','#3d7c5f','#5b6ee0'][i] || '#e1582f';
  }
  function milesBetween(a,b){
    const toRad=n=>n*Math.PI/180;
    const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
    const lat1=toRad(a.lat), lat2=toRad(b.lat);
    const h=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
    return 3958.8 * 2 * Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
  }
  function fallbackTargets(place,p,count){
    const opts=FALLBACK_TARGETS[place] || [];
    const sorted=[...opts].sort((a,b)=>milesBetween(p,a)-milesBetween(p,b));
    return (sorted.length ? sorted : [DEST]).slice(0,count);
  }
  function placeResultToTarget(result,place){
    const loc=result.geometry&&result.geometry.location;
    return {
      name:result.name || place,
      hood:result.vicinity || result.formatted_address || place,
      lat:typeof loc.lat==='function' ? loc.lat() : loc.lat,
      lng:typeof loc.lng==='function' ? loc.lng() : loc.lng,
    };
  }
  function findNearestTargets(place,p,count){
    if(place==='Work') return Promise.resolve([{...DEST}]);
    if(!(window.google&&google.maps&&google.maps.places&&compareState.map)){
      return Promise.resolve(fallbackTargets(place,p,count));
    }
    return new Promise(resolve=>{
      const service=new google.maps.places.PlacesService(compareState.map);
      service.nearbySearch({
        location:{lat:p.lat,lng:p.lng},
        rankBy:google.maps.places.RankBy.DISTANCE,
        keyword:(PLACE_SEARCH[place]&&PLACE_SEARCH[place].keyword) || place,
      },(results,status)=>{
        if(status===google.maps.places.PlacesServiceStatus.OK && results && results.length){
          const places=results.filter(r=>r.geometry).slice(0,count).map(r=>placeResultToTarget(r,place));
          resolve(places.length ? places : fallbackTargets(place,p,count));
        }else{
          resolve(fallbackTargets(place,p,count));
        }
      });
    });
  }
  function clearCompareTargets(){
    compareState.targetMarkers.forEach(m=>m.setMap(null));
    compareState.targetMarkers=[];
    compareState.routeRenderers.forEach(r=>r.setMap(null));
    compareState.routeRenderers=[];
  }
  function routeTargetForIndex(i){
    const target=compareState.targets[i];
    if(Array.isArray(target)) return target[0] || (isWorkCompare() ? DEST : null);
    return target || (isWorkCompare() ? DEST : null);
  }
  function compareRouteRows(status){
    if(!isWorkCompare()){
      return PLACES.map((p,i)=>{
        const targets=Array.isArray(compareState.targets[i]) ? compareState.targets[i] : [];
        if(status && !targets.length){
          return `<div class="compare-route muted"><span class="tag">${tagLabel(p.tag)}</span><div><b>${p.name}</b><small>${status}</small></div></div>`;
        }
        const details=targets.length ? targets.map((target,ti)=>`<span>${ti+1}. ${target.name} - ${milesBetween(p,target).toFixed(1)} mi</span>`).join('') : '<span>Nearest places unavailable</span>';
        return `<div class="compare-route stack"><span class="tag">${tagLabel(p.tag)}</span><div><b>${p.name}</b><small>${targets.length} nearest ${selectedComparePlace().toLowerCase()}</small><div class="nearby-options">${details}</div></div></div>`;
      }).join('');
    }
    return PLACES.map((p,i)=>{
      const result=compareState.results[i];
      const target=routeTargetForIndex(i);
      const targetName=target ? target.name : 'Nearest place';
      const detail=status || (result&&result.detail) || 'Travel time unavailable';
      const cls=result&&result.error?' muted':'';
      return `<div class="compare-route${cls}"><span class="tag">${tagLabel(p.tag)}</span><div><b>${p.name}</b><small>${targetName} - ${detail}</small></div></div>`;
    }).join('');
  }
  function renderCompareRoutes(status){
    const el=document.getElementById('compareRouteList');
    if(!el) return;
    const place=selectedComparePlace();
    const label=place==='Work' ? `${DEST.name}: ${DEST.hood}` : `${selectedOptionCount()} nearest ${place.toLowerCase()} for each listing`;
    el.innerHTML=`<div class="commute-title">${selectedModeLabel()} to ${label}</div>${compareRouteRows(status)}`;
  }
  function loadCompareTimes(){
    if(!(window.google&&google.maps)) return;
    if(!isWorkCompare()){
      compareState.results=[];
      renderCompareRoutes();
      drawCompareRoutes();
      return;
    }
    const travelMode=selectedTravelMode();
    const targets=compareState.targets.length ? compareState.targets.map((target,i)=>routeTargetForIndex(i)) : PLACES.map(()=>DEST);
    const request={
      origins:PLACES.map(p=>({lat:p.lat,lng:p.lng})),
      destinations:targets.map(t=>({lat:t.lat,lng:t.lng})),
      travelMode,
      unitSystem:google.maps.UnitSystem.IMPERIAL,
    };
    if(travelMode===google.maps.TravelMode.TRANSIT) request.transitOptions={departureTime:new Date()};
    const svc=new google.maps.DistanceMatrixService();
    svc.getDistanceMatrix(request,(response,status)=>{
      if(status!=='OK'||!response||!response.rows){
        compareState.results=PLACES.map(()=>({error:1,detail:'Travel time unavailable'}));
        renderCompareRoutes();
        drawCompareRoutes();
        return;
      }
      compareState.results=response.rows.map((row,i)=>{
        const result=row.elements&&row.elements[isWorkCompare()?0:i];
        if(result&&result.status==='OK') return {detail:`${result.duration.text} - ${result.distance.text}`};
        return {error:1,detail:`${selectedModeLabel()} route unavailable`};
      });
      renderCompareRoutes();
      drawCompareRoutes();
    });
  }
  function drawCompareRoutes(){
    if(!(compareState.map&&window.google&&google.maps)) return;
    compareState.routeRenderers.forEach(r=>r.setMap(null));
    compareState.routeRenderers=[];
    if(!isWorkCompare()) return;
    const directions=new google.maps.DirectionsService();
    const travelMode=selectedTravelMode();
    PLACES.forEach((p,i)=>{
      const target=routeTargetForIndex(i);
      if(!target) return;
      const renderer=new google.maps.DirectionsRenderer({
        map:compareState.map,
        suppressMarkers:true,
        preserveViewport:true,
        polylineOptions:{strokeColor:routeColor(i),strokeOpacity:.78,strokeWeight:4},
      });
      compareState.routeRenderers.push(renderer);
      const request={
        origin:{lat:p.lat,lng:p.lng},
        destination:{lat:target.lat,lng:target.lng},
        travelMode,
      };
      if(travelMode===google.maps.TravelMode.TRANSIT) request.transitOptions={departureTime:new Date()};
      directions.route(request,(response,status)=>{
        if(status==='OK') renderer.setDirections(response);
      });
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
    PLACES.forEach(p=>{ const m=new google.maps.Marker({position:{lat:p.lat,lng:p.lng},map,icon:pin('#e1582f'),label:{text:p.tag,color:'#fff',fontSize:'12px',fontWeight:'500'},title:p.name}); m.addListener('click',()=>{iw.setContent(infoHTML(`Option ${p.tag.toUpperCase()} - ${p.name}`,`${p.hood} - ${p.rent}/mo`,commuteLine(p)));iw.open({map,anchor:m});}); bounds.extend(m.getPosition()); });
    const dmk=new google.maps.Marker({position:{lat:DEST.lat,lng:DEST.lng},map,icon:pin('#5b6ee0'),label:{text:'\u2605',color:'#fff',fontSize:'13px',fontWeight:'500'},title:DEST.name}); dmk.addListener('click',()=>{iw.setContent(infoHTML(DEST.name,DEST.hood));iw.open({map,anchor:dmk});}); bounds.extend(dmk.getPosition());
    map.fitBounds(bounds,64);
    loadCommuteTimes();
  }
  function initCompareControls(){
    const mode=fillSelect('compareMode',COMPARE_MODES,2);
    const place=fillSelect('comparePlace',COMPARE_PLACES,0);
    const count=document.getElementById('compareCount');
    if(mode&&!mode.dataset.bound){
      mode.addEventListener('change',updateCompareMap);
      mode.dataset.bound='1';
    }
    if(place&&!place.dataset.bound){
      place.addEventListener('change',updateCompareMap);
      place.dataset.bound='1';
    }
    if(count&&!count.dataset.bound){
      count.addEventListener('input',()=>{
        updateOptionCountControl();
        updateCompareMap();
      });
      count.dataset.bound='1';
    }
    updateOptionCountControl();
    renderCompareRoutes('Choose options to compare travel time.');
  }
  function updateCompareMap(){
    initCompareControls();
    if(!compareState.map||!(window.google&&google.maps)){
      renderCompareRoutes('Map unavailable until Google Maps loads.');
      return;
    }
    const place=selectedComparePlace();
    const token=++compareState.searchToken;
    clearCompareTargets();
    compareState.results=[];
    compareState.targets=[];
    renderCompareRoutes(place==='Work' ? 'Preparing main destination...' : 'Finding nearest places...');
    Promise.all(PLACES.map(p=>findNearestTargets(place,p,place==='Work' ? 1 : selectedOptionCount()))).then(targets=>{
      if(token!==compareState.searchToken) return;
      compareState.targets=place==='Work' ? PLACES.map(()=>[{...DEST}]) : targets;
      const markerTargets=place==='Work'
        ? [{...DEST,markerLabel:'\u2605'}]
        : targets.flatMap((group,i)=>group.map((target,ti)=>({...target,markerLabel:`${PLACES[i].tag}${ti+1}`})));
      markerTargets.forEach(target=>{
        const marker=new google.maps.Marker({
          position:{lat:target.lat,lng:target.lng},
          map:compareState.map,
          icon:pin('#5b6ee0'),
          label:{text:target.markerLabel,color:'#fff',fontSize:'11px',fontWeight:'500'},
          title:target.name,
        });
        marker.addListener('click',()=>{
          compareState.info.setContent(infoHTML(target.name,target.hood));
          compareState.info.open({map:compareState.map,anchor:marker});
        });
        compareState.targetMarkers.push(marker);
      });
      const bounds=new google.maps.LatLngBounds();
      compareState.listingMarkers.forEach(m=>bounds.extend(m.getPosition()));
      markerTargets.forEach(t=>bounds.extend({lat:t.lat,lng:t.lng}));
      compareState.map.fitBounds(bounds,64);
      renderCompareRoutes(place==='Work' ? 'Calculating travel time...' : null);
      loadCompareTimes();
    });
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
      const marker=new google.maps.Marker({position:{lat:p.lat,lng:p.lng},map:compareState.map,icon:pin('#e1582f'),label:{text:p.tag,color:'#fff',fontSize:'12px',fontWeight:'500'},title:p.name});
      marker.addListener('click',()=>{ compareState.info.setContent(infoHTML(`Option ${p.tag.toUpperCase()} - ${p.name}`,`${p.hood} - ${p.rent}/mo`)); compareState.info.open({map:compareState.map,anchor:marker}); });
      return marker;
    });
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
    const s=document.createElement('script'); s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(GOOGLE_MAPS_API_KEY)+'&libraries=places&callback=__rrInitMap'; s.async=true; s.defer=true; document.head.appendChild(s);
  }
  initCompareControls();
  loadMaps();

  go('welcome');
})();
