
(function(){
  const root = document.getElementById('gsRoot');

  /* ================= ICONS ================= */
  const ICON = {
    sat:'<path d="M14 9l1-1 4 4-1 1"/><path d="M9 14l-1 1 4 4 1-1"/><path d="M7 17l-4 4"/><rect x="9.5" y="9.5" width="5" height="5" rx="1" transform="rotate(45 12 12)"/><path d="M14.5 4.5l1.8 1.8M17.7 7.7l1.8 1.8"/>',
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
    branch:'<circle cx="6" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="10" r="2"/><path d="M6 6v12"/><path d="M6 12c0-3 4-3 8-4.5 2-.7 4-1.5 4-1.5"/>',
    clipboard:'<rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="3" rx="1"/><path d="M9 11h6M9 15h6M9 19h3"/>',
    radio:'<circle cx="12" cy="15" r="2"/><path d="M12 13V4"/><circle cx="12" cy="4" r="1.4"/><path d="M8 8a5.6 5.6 0 0 1 8 0M5.5 5.5a9 9 0 0 1 13 0"/><path d="M6 21l3-5M18 21l-3-5"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 13.9a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1z"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.5-4 4.5-6 7-6s5.5 2 7 6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    zap:'<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
    pin:'<path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9S9.5 5.5 12 3z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
    moon:'<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
    logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    x:'<path d="M6 6l12 12M18 6L6 18"/>',
    refresh:'<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
    download:'<path d="M12 3v13"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    bolt:'<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
  };
  function ic(name, cls){ return '<svg class="icon '+(cls||'')+'" viewBox="0 0 24 24">'+(ICON[name]||'')+'</svg>'; }

  /* ================= STATE ================= */
  const state = {
    view:'login', page:'home', session:null, theme:'light', search:'',
    drawerId:null, zoom:1, authMsg:null, toast:null, toastTimer:null,
    rain:15, radius:2.7,
  };
  const baseNow = Date.now();
  function clockAt(hoursFromNow){
    const d = new Date(baseNow + hoursFromNow*3600000);
    return d.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit',hour12:false});
  }

  /* ================= AUTH LOGIC ================= */
  const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PW_CHECKS = [
    { label:'8+ chars', test:p=>p.length>=8 },
    { label:'uppercase', test:p=>/[A-Z]/.test(p) },
    { label:'lowercase', test:p=>/[a-z]/.test(p) },
    { label:'number', test:p=>/\d/.test(p) },
    { label:'symbol', test:p=>/[!@#$%^&*_\-]/.test(p) },
  ];
  function pwValid(p){ return PW_CHECKS.every(c=>c.test(p)); }
  async function sha256(str){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  /* Standard browser storage for this standalone demo. */
  const USER_KEY_PREFIX = 'gsaas:user:';

  function storageKey(username){
    return USER_KEY_PREFIX + username.trim().toLowerCase();
  }

  async function getUser(u){
    try{
      const raw = window.localStorage.getItem(storageKey(u));
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      console.error('Unable to read account from localStorage:', e);
      return null;
    }
  }

  async function setUser(u,d){
    try{
      window.localStorage.setItem(storageKey(u), JSON.stringify(d));
      return true;
    }catch(e){
      console.error('Unable to save account to localStorage:', e);
      return false;
    }
  }

  /* ================= DOMAIN DATA ================= */
  const ANTENNAS = ['ANT-01','ANT-02','ANT-03','ANT-04','ANT-05','ANT-06'];
  const AZ_RATE = 20, EL_RATE = 10; // deg/s, per NRSC SGSS spec figures cited in the project doc
  const CABLE_WRAP_LIMIT = 380; // deg
  const KEYHOLE_DEG = 85;
  const TIER_LABEL = {1:'Tier 1', 2:'Tier 2', 3:'Tier 3'};

  // Raw pass catalogue — deliberately includes overlaps/tight gaps so conflicts are visible before auto-scheduling.
  const RAW_PASSES = [
    { id:'p1', sat:'CARTOSAT-3',    tier:2, ant:'ANT-01', start:0.15, dur:0.35, aosAz:40,  losAz:190, elevMax:61, uplinkRequired:false },
    { id:'p2', sat:'RESOURCESAT-2A',tier:2, ant:'ANT-01', start:0.30, dur:0.30, aosAz:200, losAz:10,  elevMax:34, uplinkRequired:true, uplinkNeededMin:6, uplinkAvailableMin:5 },
    { id:'p3', sat:'OCEANSAT-3',    tier:1, ant:'ANT-02', start:0.05, dur:0.40, aosAz:300, losAz:90,  elevMax:78, uplinkRequired:false },
    { id:'p4', sat:'RISAT-2BR2',    tier:3, ant:'ANT-02', start:0.35, dur:0.25, aosAz:95,  losAz:260, elevMax:22, uplinkRequired:false },
    { id:'p5', sat:'EOS-06',        tier:2, ant:'ANT-03', start:0.20, dur:0.35, aosAz:10,  losAz:200, elevMax:45, uplinkRequired:false },
    { id:'p6', sat:'GSAT-30',       tier:3, ant:'ANT-03', start:0.552,dur:0.30, aosAz:20,  losAz:150, elevMax:55, uplinkRequired:false },
    { id:'p7', sat:'INSAT-3DS',     tier:1, ant:'ANT-04', start:0.40, dur:0.30, aosAz:88,  losAz:300, elevMax:89, uplinkRequired:false },
    { id:'p8', sat:'IRNSS-1K',      tier:2, ant:'ANT-05', start:0.10, dur:0.25, aosAz:15,  losAz:140, elevMax:28, uplinkRequired:false },
    { id:'p9', sat:'GSAT-11',       tier:3, ant:'ANT-05', start:0.45, dur:0.30, aosAz:145, losAz:300, elevMax:40, uplinkRequired:false },
    { id:'p10',sat:'ASTROSAT',      tier:2, ant:'ANT-06', start:0.15, dur:0.40, aosAz:50,  losAz:220, elevMax:33, uplinkRequired:false },
  ];
  const TOTAL_WINDOW_H = 2; // Gantt covers the next 2 hours
  let bookings = RAW_PASSES.map(p=>({...p}));
  let preemptedLog = [];
  let ledger = {}; // per-antenna: {preemptions, creditsMin}
  ANTENNAS.forEach(a=>ledger[a]={preemptions:0, creditsMin:0});

  const SLA_TARGETS = { 'ANT-01':120,'ANT-02':110,'ANT-03':95,'ANT-04':80,'ANT-05':100,'ANT-06':70 };
  const SLA_DELIVERED_BASE = { 'ANT-01':120,'ANT-02':108,'ANT-03':86,'ANT-04':62,'ANT-05':99,'ANT-06':70 };

  const antennaAngles = {};
  ANTENNAS.forEach((a,i)=>{
    antennaAngles[a] = { curAz: (i*47)%360, curEl: 0, targetAz:(i*47)%360, targetEl:0, slewing:false, timer:null };
  });

  /* ---------- scheduling math ---------- */
  function angDelta(a,b){ let d=Math.abs(a-b)%360; return d>180?360-d:d; }
  function slewSeconds(azDelta, elDelta){ return Math.max(azDelta/AZ_RATE, elDelta/EL_RATE) + 3; } // +3s settle

  function validateList(list){
    const sorted = [...list].sort((a,b)=>a.start-b.start);
    let azPos = 0;
    sorted.forEach((b,i)=>{
      b.flags = [];
      if(i>0){
        const prev = sorted[i-1];
        const gapSec = (b.start - (prev.start+prev.dur))*3600;
        if(gapSec < 0){ b.flags.push('overlap'); }
        else{
          const req = slewSeconds(angDelta(prev.losAz, b.aosAz), 0);
          if(gapSec < req) b.flags.push('slew');
        }
      }
      if(b.elevMax > KEYHOLE_DEG) b.flags.push('keyhole');
      if(b.uplinkRequired && b.uplinkAvailableMin < b.uplinkNeededMin) b.flags.push('uplink');
      let diff = ((b.aosAz - (azPos%360) + 540) % 360) - 180;
      azPos += diff;
      if(Math.abs(azPos) > CABLE_WRAP_LIMIT) b.flags.push('wrap');
    });
    return sorted;
  }
  function validateAll(list){
    ANTENNAS.forEach(ant=>{ validateList(list.filter(b=>b.ant===ant)); });
    return list;
  }
  function statusOf(b){
    if(b.preempted) return 'preempted';
    if(b.flags && (b.flags.includes('overlap')||b.flags.includes('wrap')||b.flags.includes('uplink'))) return 'red';
    if(b.flags && (b.flags.includes('slew')||b.flags.includes('keyhole'))) return 'amber';
    return 'green';
  }
  function flagLabel(f){
    return { overlap:'Overlap', slew:'Slew gap too short', keyhole:'Keyhole risk (>85° el)',
      uplink:'Uplink window insufficient', wrap:'Cable wrap limit' }[f] || f;
  }

  function fitsWithout(list, cand){
    const tmp = [...list, cand];
    const sorted = validateList(tmp);
    const found = sorted.find(x=>x===cand);
    return !found.flags.some(f=>f==='overlap'||f==='wrap'||f==='slew');
  }

  function autoSchedule(){
    const pool = bookings.map(p=>({sat:p.sat,tier:p.tier,start:p.start,dur:p.dur,aosAz:p.aosAz,losAz:p.losAz,
      elevMax:p.elevMax,uplinkRequired:p.uplinkRequired,uplinkNeededMin:p.uplinkNeededMin,
      uplinkAvailableMin:p.uplinkAvailableMin,id:p.id,origAnt:p.ant}))
      .sort((a,b)=> a.tier-b.tier || a.start-b.start);
    const assigned = {}; ANTENNAS.forEach(a=>assigned[a]=[]);
    const bumped = [];
    const unscheduled = [];
    for(const p of pool){
      // prefer the pass's original antenna, then try the rest — keeps results legible instead of
      // shuffling everything onto ANT-01 by default.
      const order = [p.origAnt, ...ANTENNAS.filter(a=>a!==p.origAnt)];
      let placed=false;
      for(const ant of order){
        const cand = {...p, ant};
        if(fitsWithout(assigned[ant], cand)){ assigned[ant].push(cand); placed=true; break; }
      }
      if(!placed){
        let bestAnt=null, bestVictim=null;
        for(const ant of ANTENNAS){
          for(const victim of assigned[ant]){
            if(victim.tier > p.tier){
              const without = assigned[ant].filter(x=>x.id!==victim.id);
              const cand = {...p, ant};
              if(fitsWithout(without, cand) && (!bestVictim || victim.tier > bestVictim.tier)){
                bestAnt=ant; bestVictim=victim;
              }
            }
          }
        }
        if(bestVictim){
          assigned[bestAnt] = assigned[bestAnt].filter(x=>x.id!==bestVictim.id);
          bestVictim.preempted = true; bestVictim.preemptedBy = p.sat;
          bumped.push(bestVictim);
          ledger[bestAnt].preemptions++;
          ledger[bestAnt].creditsMin += Math.round(bestVictim.dur*60);
          assigned[bestAnt].push({...p, ant:bestAnt});
          placed=true;
        }
      }
      // Passes that genuinely can't fit anywhere (no lower-tier victim exists to bump) get their own
      // "Unscheduled" lane instead of being dumped onto a real antenna, which would fake new overlaps.
      if(!placed){ p.unscheduled = true; p.ant = 'UNSCHEDULED'; p.flags = ['overlap']; unscheduled.push(p); }
    }
    let all = [];
    ANTENNAS.forEach(ant=> all = all.concat(assigned[ant]));
    validateAll(all);
    all = all.concat(bumped).concat(unscheduled);
    bookings = all;
    preemptedLog = bumped.concat(unscheduled);
    const parts = [];
    if(bumped.length) parts.push(bumped.length+' preempted ('+bumped.map(b=>b.sat+(b.preemptedBy?' by '+b.preemptedBy:'')).join(', ')+')');
    if(unscheduled.length) parts.push(unscheduled.length+' could not be placed in this window ('+unscheduled.map(u=>u.sat).join(', ')+')');
    showToast(parts.length ? 'Auto-scheduled: '+parts.join(' · ') : 'Auto-scheduled: all '+all.length+' passes placed cleanly, no conflicts or slew violations.');
  }

  function injectEmergency(){
    const id = 'emg'+Date.now();
    bookings.push({ id, sat:'RISAT-2B (Flood Response)', tier:1, ant:ANTENNAS[0], start:0.32, dur:0.28,
      aosAz:100, losAz:250, elevMax:52, uplinkRequired:true, uplinkNeededMin:4, uplinkAvailableMin:10 });
    autoSchedule();
  }

  function exportCSV(){
    validateAll(bookings);
    const rows = [['Antenna','Satellite','Tier','AOS','LOS','MaxElevDeg','AzAOS','AzLOS','Status','Flags']];
    [...bookings].sort((a,b)=>a.ant.localeCompare(b.ant)||a.start-b.start).forEach(b=>{
      rows.push([b.ant,b.sat,TIER_LABEL[b.tier]||b.tier,clockAt(b.start),clockAt(b.start+b.dur),
        b.elevMax,b.aosAz,b.losAz,statusOf(b),(b.flags||[]).map(flagLabel).join('; ')||'—']);
    });
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'shadnagar-schedule.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function showToast(text){
    state.toast = text;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(()=>{ state.toast=null; renderToast(); }, 5200);
    renderToast();
  }
  function renderToast(){
    const old = root.querySelector('.toast'); if(old) old.remove();
    if(!state.toast) return;
    const el = document.createElement('div');
    el.className='toast';
    el.innerHTML = ic('bolt')+'<span>'+state.toast+'</span>';
    root.appendChild(el);
  }

  /* ---------- link budget model (simplified, for demonstration) ---------- */
  const MODCOD_TABLE = [
    { name:'32APSK 9/10', minCN0:16, rate:620 },
    { name:'16APSK 8/9',  minCN0:13, rate:480 },
    { name:'8PSK 3/4',    minCN0:10, rate:360 },
    { name:'QPSK 3/4',    minCN0:7,  rate:220 },
    { name:'QPSK 1/2',    minCN0:4,  rate:140 },
    { name:'No Lock',     minCN0:-999, rate:0 },
  ];
  const BASE_CN0 = 18; // dB, nominal clear-sky link margin for this demo
  function linkBudget(rainMmHr, radiusKm){
    const rainAtten = Math.min(12, 0.06*rainMmHr);
    const shrink = Math.max(0, 2.7 - radiusKm);
    const interference = Math.min(4, (shrink/1.7)*4);
    const cn0 = BASE_CN0 - rainAtten - interference;
    const modcod = MODCOD_TABLE.find(m=>cn0>=m.minCN0) || MODCOD_TABLE[MODCOD_TABLE.length-1];
    return { rainAtten, interference, cn0, modcod };
  }

  /* ================= RENDER ROOT ================= */
  function render(){
    if(state.view !== 'app'){ renderAuth(); }
    else { renderApp(); }
    root.setAttribute('data-theme', state.theme);
    renderToast();
  }

  /* ================= AUTH SCREENS ================= */
  function renderAuth(){
    const isLogin = state.view === 'login';
    root.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-card">
          <div class="auth-brand">
            <div class="logo">${ic('sat')}</div>
            <div><div class="name">ISRO · GSaaS</div><div class="sub">Ground Station Console</div></div>
          </div>
          <div class="auth-tabs">
            <button class="auth-tab ${isLogin?'active':''}" id="tabLogin">Login</button>
            <button class="auth-tab ${!isLogin?'active':''}" id="tabSignup">Sign Up</button>
          </div>
          <div id="authFields"></div>
          <div class="a-note">Demo-grade auth: passwords hashed (SHA-256) and stored only in your browser.</div>
        </div>
      </div>
    `;
    document.getElementById('tabLogin').onclick = ()=>{ state.view='login'; state.authMsg=null; render(); };
    document.getElementById('tabSignup').onclick = ()=>{ state.view='signup'; state.authMsg=null; render(); };
    isLogin ? renderLoginFields() : renderSignupFields();
  }
  function renderLoginFields(){
    const wrap = document.getElementById('authFields');
    wrap.innerHTML = `
      <div class="a-field"><label>USERNAME</label><input id="lgUser" placeholder="operator_id" /></div>
      <div class="a-field"><label>PASSWORD</label><input id="lgPass" type="password" placeholder="••••••••" /></div>
      <button class="a-btn" id="lgBtn">Sign In</button>
      <div id="lgMsg"></div>
      <div class="a-switch">No account? <a id="lgToSignup">Register as an operator</a></div>
    `;
    if(state.authMsg) showMsg('lgMsg', state.authMsg);
    document.getElementById('lgToSignup').onclick = ()=>{ state.view='signup'; state.authMsg=null; render(); };
    document.getElementById('lgBtn').onclick = doLogin;
    wrap.querySelector('#lgPass').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
  }
  function renderSignupFields(){
    const wrap = document.getElementById('authFields');
    wrap.innerHTML = `
      <div class="a-field"><label>USERNAME</label><input id="suUser" placeholder="3-20 chars" />
        <div class="a-hint" id="suUserHint">letters, numbers, underscore — 3 to 20 characters</div></div>
      <div class="a-field"><label>EMAIL</label><input id="suEmail" placeholder="operator@isro.gov.in" />
        <div class="a-hint" id="suEmailHint"></div></div>
      <div class="a-field"><label>PASSWORD</label><input id="suPass" type="password" placeholder="••••••••" />
        <div class="pw-checks" id="pwChecks"></div></div>
      <div class="a-field"><label>CONFIRM PASSWORD</label><input id="suPass2" type="password" placeholder="••••••••" />
        <div class="a-hint" id="suPass2Hint"></div></div>
      <button class="a-btn" id="suBtn">Create Account</button>
      <div id="suMsg"></div>
      <div class="a-switch">Already registered? <a id="suToLogin">Return to login</a></div>
    `;
    if(state.authMsg) showMsg('suMsg', state.authMsg);
    document.getElementById('suToLogin').onclick = ()=>{ state.view='login'; state.authMsg=null; render(); };
    document.getElementById('suBtn').onclick = doSignup;
    renderPwChecks('');
    document.getElementById('suPass').addEventListener('input', e=>renderPwChecks(e.target.value));
    document.getElementById('suUser').addEventListener('input', e=>{
      const v=e.target.value, h=document.getElementById('suUserHint');
      if(!v){ h.className='a-hint'; h.textContent='letters, numbers, underscore — 3 to 20 characters'; }
      else if(USERNAME_RE.test(v)){ h.className='a-hint ok'; h.textContent='valid format'; }
      else { h.className='a-hint bad'; h.textContent='invalid — 3-20 letters, numbers or _'; }
    });
    document.getElementById('suEmail').addEventListener('input', e=>{
      const v=e.target.value, h=document.getElementById('suEmailHint');
      if(!v){ h.textContent=''; h.className='a-hint'; }
      else if(EMAIL_RE.test(v)){ h.className='a-hint ok'; h.textContent='valid format'; }
      else { h.className='a-hint bad'; h.textContent='invalid email format'; }
    });
    document.getElementById('suPass2').addEventListener('input', e=>{
      const v=e.target.value, p1=document.getElementById('suPass').value, h=document.getElementById('suPass2Hint');
      if(!v){ h.textContent=''; h.className='a-hint'; }
      else if(v===p1){ h.className='a-hint ok'; h.textContent='passwords match'; }
      else { h.className='a-hint bad'; h.textContent='passwords do not match'; }
    });
  }
  function renderPwChecks(pw){
    document.getElementById('pwChecks').innerHTML = PW_CHECKS.map(c=>`<span class="${c.test(pw)?'ok':''}">${c.label}</span>`).join('');
  }
  function showMsg(id, msg){
    const el = document.getElementById(id); if(!el) return;
    el.innerHTML = `<div class="a-msg ${msg.type==='error'?'err':'ok'}">${msg.text}</div>`;
  }
  async function doLogin(){
    const u = document.getElementById('lgUser').value.trim();
    const p = document.getElementById('lgPass').value;
    if(!u||!p){ showMsg('lgMsg',{type:'error',text:'Enter both username and password.'}); return; }
    const btn = document.getElementById('lgBtn'); btn.disabled=true; btn.textContent='Verifying…';
    const user = await getUser(u);
    if(!user){ btn.disabled=false; btn.textContent='Sign In'; showMsg('lgMsg',{type:'error',text:'No account found for "'+u+'".'}); return; }
    const hash = await sha256(p);
    if(hash !== user.passwordHash){ btn.disabled=false; btn.textContent='Sign In'; showMsg('lgMsg',{type:'error',text:'Incorrect password.'}); return; }
    state.session = { username:u, email:user.email };
    state.view='app'; state.page='home';
    render();
  }
  async function doSignup(){
    const u=document.getElementById('suUser').value.trim();
    const email=document.getElementById('suEmail').value.trim();
    const p=document.getElementById('suPass').value, p2=document.getElementById('suPass2').value;
    if(!USERNAME_RE.test(u)){ showMsg('suMsg',{type:'error',text:'Username must be 3-20 letters, numbers or underscore.'}); return; }
    if(!EMAIL_RE.test(email)){ showMsg('suMsg',{type:'error',text:'Enter a valid email address.'}); return; }
    if(!pwValid(p)){ showMsg('suMsg',{type:'error',text:'Password does not meet all requirements above.'}); return; }
    if(p!==p2){ showMsg('suMsg',{type:'error',text:'Passwords do not match.'}); return; }
    const btn=document.getElementById('suBtn'); btn.disabled=true; btn.textContent='Registering…';
    const existing = await getUser(u);
    if(existing){ btn.disabled=false; btn.textContent='Create Account'; showMsg('suMsg',{type:'error',text:'Username already registered.'}); return; }
    const passwordHash = await sha256(p);
    const saved = await setUser(u, { email, passwordHash, createdAt:new Date().toISOString() });
    if(!saved){
      btn.disabled=false;
      btn.textContent='Create Account';
      showMsg('suMsg',{type:'error',text:'Could not save the account in this browser. Check storage permissions and try again.'});
      return;
    }
    state.view='login'; state.authMsg={type:'ok', text:'Account created — you can now log in, '+u+'.'};
    render();
  }

  /* ================= APP SHELL ================= */
  const PAGES = [
    { id:'home', label:'Home', icon:'home' },
    { id:'schedule', label:'Schedule', icon:'branch' },
    { id:'linkbudget', label:'Link Budget', icon:'zap' },
    { id:'sla', label:'SLA Ledger', icon:'clipboard' },
    { id:'antennas', label:'Antennas', icon:'radio' },
    { id:'settings', label:'Settings', icon:'gear' },
  ];
  const PAGE_META = {
    home:{ title:'Ground Station Console', sub:'Track satellite passes in real-time' },
    schedule:{ title:'Pass Schedule', sub:'Antenna allocation, conflict detection and auto-scheduling' },
    linkbudget:{ title:'Link Budget & Interference', sub:'Rain and 5G exclusion-zone impact on downlink rate' },
    sla:{ title:'SLA Ledger', sub:'Contracted vs. delivered passes this month' },
    antennas:{ title:'Antennas', sub:'Live status and manual pointing for every dish at Shadnagar' },
    settings:{ title:'Settings', sub:'Account, appearance and preferences' },
  };

  function renderApp(){
    const meta = PAGE_META[state.page];
    root.innerHTML = `
      <div class="shell">
        <div class="sidebar">
          <div class="side-brand"><div class="logo">${ic('sat')}</div><div class="name">GSaaS</div></div>
          <div class="side-nav">
            ${PAGES.map(p=>`<button class="nav-item ${state.page===p.id?'active':''}" data-page="${p.id}">${ic(p.icon)}${p.label}</button>`).join('')}
          </div>
          <div class="side-foot">
            <div class="foot-row">
              <button class="foot-btn" id="langBtn">${ic('globe')}English</button>
              <button class="foot-btn" id="themeBtn">${ic(state.theme==='light'?'sun':'moon')}${state.theme==='light'?'Light':'Dark'}</button>
            </div>
            <button class="logout-btn" id="logoutBtn">${ic('logout')}Logout</button>
          </div>
        </div>
        <div class="main">
          <div class="top-row">
            <div><div class="page-title">${meta.title}</div><div class="page-sub">${meta.sub}</div></div>
            <button class="user-pill">${ic('user')}${state.session.username}</button>
          </div>
          <div id="pageBody"></div>
        </div>
      </div>
    `;
    root.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{ stopAllSlews(); state.page=b.dataset.page; render(); });
    document.getElementById('logoutBtn').onclick = ()=>{ stopAllSlews(); state.session=null; state.view='login'; state.page='home'; render(); };
    document.getElementById('themeBtn').onclick = ()=>{ state.theme = state.theme==='light'?'dark':'light'; render(); };
    document.getElementById('langBtn').onclick = ()=>{};

    const body = document.getElementById('pageBody');
    if(state.page==='home') renderHome(body);
    else if(state.page==='schedule') renderSchedule(body);
    else if(state.page==='linkbudget') renderLinkBudget(body);
    else if(state.page==='sla') renderSLA(body);
    else if(state.page==='antennas') renderAntennas(body);
    else if(state.page==='settings') renderSettings(body);

    if(state.drawerId) renderDrawer();
  }
  function stopAllSlews(){ ANTENNAS.forEach(a=>{ if(antennaAngles[a].timer){ clearInterval(antennaAngles[a].timer); antennaAngles[a].timer=null; antennaAngles[a].slewing=false; } }); }

  /* ================= HOME PAGE ================= */
  function activityFor(ant){
    const list = bookings.filter(b=>b.ant===ant && !b.preempted).sort((a,b)=>a.start-b.start);
    const cur = list.find(b=>b.start<=0.02 && 0<=b.start+b.dur);
    if(cur) return { text:'Tracking '+cur.sat, status:statusOf(cur) };
    const next = list.find(b=>b.start>0.02);
    if(next) return { text:'Idle · next pass in '+Math.max(1,Math.round(next.start*60))+' min', status:'amber' };
    return { text:'Idle · no passes scheduled', status:'amber' };
  }

  function renderHome(body){
    validateAll(bookings);
    const live = bookings.filter(b=>!b.preempted && !b.unscheduled);
    const activeCount = live.filter(p=>statusOf(p)==='green').length;
    const antOnline = ANTENNAS.filter(a=>activityFor(a).status!=='red').length;
    body.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-top"><span class="label">Active Passes</span>${ic('zap')}</div>
          <div class="stat-num">${activeCount}</div><div class="stat-cap">Currently being tracked cleanly</div></div>
        <div class="stat-card"><div class="stat-top"><span class="label">Ground Stations</span>${ic('pin')}</div>
          <div class="stat-num">1</div><div class="stat-cap">Shadnagar, Telangana</div></div>
        <div class="stat-card"><div class="stat-top"><span class="label">Antennas Online</span>${ic('radio')}</div>
          <div class="stat-num">${antOnline}/${ANTENNAS.length}</div><div class="stat-cap">Operational right now</div></div>
      </div>
      <div class="content-row">
        <div class="panel">
          <div class="panel-head"><div class="ph-title">${ic('pin')}Live Tracking — Shadnagar</div></div>
          <div class="map-box" id="mapBox">
            <div class="map-zoom"><button id="zIn">+</button><button id="zOut">–</button></div>
            <div class="map-legend">
              <div class="row"><span class="dot" style="background:var(--green-dot)"></span>Active</div>
              <div class="row"><span class="dot" style="background:var(--amber-dot)"></span>Scheduled</div>
              <div class="row"><span class="dot" style="background:var(--red-dot)"></span>Conflict</div>
              <div class="row"><span class="dot" style="background:var(--muted-2)"></span>5G exclusion (${state.radius.toFixed(1)} km)</div>
            </div>
            <div id="mapSvgWrap" style="position:absolute;inset:0;"></div>
            <div class="map-caption" id="mapCaption">Live coverage · Shadnagar ground station</div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><div class="ph-title">${ic('zap')}Active Passes</div></div>
          <div class="search-box">${ic('search')}<input id="passSearch" placeholder="Search satellite or antenna…" value="${state.search}"/></div>
          <div class="list-scroll" id="passList"></div>
          <div class="quick-stats">
            <div class="qs-row green"><span>Active</span><b>${live.filter(p=>statusOf(p)==='green').length}</b></div>
            <div class="qs-row amber"><span>Scheduled / flagged</span><b>${live.filter(p=>statusOf(p)==='amber').length}</b></div>
            <div class="qs-row red"><span>Conflict</span><b>${live.filter(p=>statusOf(p)==='red').length}</b></div>
            <div class="qs-row"><span>Total</span><b>${live.length}</b></div>
          </div>
        </div>
      </div>
    `;
    mountMap();
    document.getElementById('zIn').onclick = ()=>{ mapZoomIn(); };
    document.getElementById('zOut').onclick = ()=>{ mapZoomOut(); };
    document.getElementById('passSearch').addEventListener('input', e=>{ state.search=e.target.value; renderPassList(); });
    renderPassList();
  }

  /* ---------- Leaflet map (real OSM tiles, matching the reference app) with schematic fallback ---------- */
  const SHADNAGAR = [17.065, 78.196]; // NRSC campus, Shadnagar, Telangana — approximate
  const ANT_OFFSETS = {
    'ANT-01':[0.0009,0.0007],'ANT-02':[-0.0008,0.0009],'ANT-03':[0.0011,-0.0006],
    'ANT-04':[-0.0010,-0.0008],'ANT-05':[0.0003,0.0013],'ANT-06':[-0.0005,-0.0013],
  };
  let leafletMap = null, leafletLoadPromise = null, exclusionCircle = null;
  function ensureLeaflet(){
    if(window.L) return Promise.resolve();
    if(leafletLoadPromise) return leafletLoadPromise;
    leafletLoadPromise = new Promise((resolve,reject)=>{
      const link = document.createElement('link');
      link.rel='stylesheet';
      link.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
      script.onload = ()=>resolve();
      script.onerror = ()=>reject(new Error('leaflet failed to load'));
      document.head.appendChild(script);
    });
    return leafletLoadPromise;
  }
  function destPoint(center, bearingDeg, distKm){
    const R=6371, brng=bearingDeg*Math.PI/180;
    const lat1=center[0]*Math.PI/180, lon1=center[1]*Math.PI/180;
    const lat2=Math.asin(Math.sin(lat1)*Math.cos(distKm/R)+Math.cos(lat1)*Math.sin(distKm/R)*Math.cos(brng));
    const lon2=lon1+Math.atan2(Math.sin(brng)*Math.sin(distKm/R)*Math.cos(lat1), Math.cos(distKm/R)-Math.sin(lat1)*Math.sin(lat2));
    return [lat2*180/Math.PI, lon2*180/Math.PI];
  }
  function mountMap(){
    const wrap = document.getElementById('mapSvgWrap'); if(!wrap) return;
    wrap.innerHTML = '<div id="leafletMap" style="position:absolute;inset:0;background:var(--bg);"></div>';
    const cap = document.getElementById('mapCaption');
    if(cap) cap.textContent = 'Loading live map…';
    ensureLeaflet().then(()=>{
      try{ initLeafletMap(); if(cap) cap.textContent = 'Live coverage · Shadnagar ground station'; }
      catch(e){ drawFallbackMap(); }
    }).catch(()=>{ drawFallbackMap(); });
  }
  function initLeafletMap(){
    const container = document.getElementById('leafletMap');
    if(!container || !window.L) return;
    if(leafletMap){ try{ leafletMap.remove(); }catch(e){} leafletMap=null; }
    leafletMap = L.map(container, { zoomControl:false, attributionControl:true }).setView(SHADNAGAR, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, attribution:'&copy; OpenStreetMap contributors'
    }).addTo(leafletMap);

    exclusionCircle = L.circle(SHADNAGAR, {
      radius: state.radius*1000, color:'#6b7280', weight:1, dashArray:'5 5', fillColor:'#6b7280', fillOpacity:.07
    }).addTo(leafletMap).bindPopup('5G exclusion zone — '+state.radius.toFixed(1)+' km radius');

    const stationIcon = L.divIcon({ className:'', html:
      '<div style="width:16px;height:16px;border-radius:50%;background:#0f9baa;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',
      iconSize:[16,16], iconAnchor:[8,8] });
    L.marker(SHADNAGAR, {icon:stationIcon}).addTo(leafletMap)
      .bindPopup('<b>Shadnagar Ground Station</b><br>NRSC campus, Telangana');

    const live = bookings.filter(b=>!b.preempted && !b.unscheduled);
    ANTENNAS.forEach(a=>{
      const off = ANT_OFFSETS[a];
      const pos = [SHADNAGAR[0]+off[0], SHADNAGAR[1]+off[1]];
      const act = activityFor(a);
      const color = act.status==='green' ? '#22c55e' : act.status==='amber' ? '#f59e0b' : '#ef4444';
      L.circleMarker(pos, { radius:7, color:'#fff', weight:2, fillColor:color, fillOpacity:1 })
        .addTo(leafletMap).bindPopup('<b>'+a+'</b><br>'+act.text);
      const cur = live.find(p=>p.ant===a && p.start<=0.02 && 0<=p.start+p.dur);
      if(cur){
        const dest = destPoint(pos, cur.aosAz, 2.5);
        const c = statusOf(cur)==='green'?'#22c55e':statusOf(cur)==='amber'?'#f59e0b':'#ef4444';
        L.polyline([pos, dest], { color:c, weight:2, dashArray:'2 5', opacity:.75 })
          .addTo(leafletMap).bindPopup(cur.sat+' — az '+cur.aosAz+'°');
      }
    });
  }
  function mapZoomIn(){ if(leafletMap) leafletMap.zoomIn(); else { state.zoom=Math.min(1.6,(state.zoom||1)+0.15); drawFallbackMap(); } }
  function mapZoomOut(){ if(leafletMap) leafletMap.zoomOut(); else { state.zoom=Math.max(0.7,(state.zoom||1)-0.15); drawFallbackMap(); } }

  function drawFallbackMap(){
    const wrap = document.getElementById('mapSvgWrap'); if(!wrap) return;
    const cap = document.getElementById('mapCaption');
    if(cap) cap.textContent = 'Schematic view — live map tiles unavailable in this preview';
    const s = state.zoom || 1;
    const dotColor = {green:'var(--green-dot)', amber:'var(--amber-dot)', red:'var(--red-dot)'};
    const live = bookings.filter(b=>!b.preempted && !b.unscheduled);
    let sats = live.map((p,i)=>{
      const st = statusOf(p);
      const r = 70 + (i%3)*32;
      const rad = (p.aosAz * Math.PI)/180;
      const x = 200 + Math.cos(rad)*r*s;
      const y = 150 + Math.sin(rad)*r*s;
      return `<line x1="200" y1="150" x2="${x}" y2="${y}" stroke="${dotColor[st]}" stroke-width="1" opacity=".35"/>
              <circle cx="${x}" cy="${y}" r="5" fill="${dotColor[st]}"><animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite"/></circle>`;
    }).join('');
    const exclR = (state.radius/2.7)*90*s;
    wrap.innerHTML = `<svg viewBox="0 0 400 300" style="width:100%;height:100%;">
      <circle cx="200" cy="150" r="${140*s}" fill="none" stroke="var(--border)" stroke-dasharray="3 4"/>
      <circle cx="200" cy="150" r="${exclR}" fill="var(--muted-2)" opacity=".08" stroke="var(--muted-2)" stroke-dasharray="4 3"/>
      ${sats}
      <circle cx="200" cy="150" r="7" fill="var(--teal)"/>
      <circle cx="200" cy="150" r="12" fill="none" stroke="var(--teal)" stroke-width="1.5"/>
      <text x="200" y="176" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="Inter">SHADNAGAR</text>
    </svg>`;
  }


  function renderPassList(){
    const el = document.getElementById('passList'); if(!el) return;
    const q = state.search.toLowerCase();
    const filtered = bookings.filter(p=>!p.preempted && !p.unscheduled && (p.sat.toLowerCase().includes(q) || p.ant.toLowerCase().includes(q)));
    el.innerHTML = filtered.map(p=>{
      const st = statusOf(p);
      const label = st==='green'?'Active':st==='amber'?'Scheduled':'Conflict';
      const flags = (p.flags||[]).filter(f=>f!=='—');
      return `
      <div class="pass-card" data-id="${p.id}">
        <div class="pass-top"><span class="pass-name">${p.sat}</span>
          <span style="display:flex;gap:6px;align-items:center;"><span class="tier-chip">${TIER_LABEL[p.tier]}</span><span class="badge ${st}">${label}</span></span></div>
        <div class="pass-route">${p.ant} · Shadnagar</div>
        <div class="pass-meta"><span>${ic('zap')}Max elev ${p.elevMax}°</span><span>${ic('clock')}AOS ${clockAt(p.start)} · LOS ${clockAt(p.start+p.dur)}</span></div>
        ${flags.length?`<div class="flag-row">${flags.map(f=>`<span class="flag-chip ${f==='overlap'||f==='wrap'||f==='uplink'?'red':'amber'}">${flagLabel(f)}</span>`).join('')}</div>`:''}
      </div>`;
    }).join('') || `<div style="font-size:12.5px;color:var(--muted);padding:14px 2px;">No passes match "${state.search}".</div>`;
    el.querySelectorAll('.pass-card').forEach(c=>c.onclick=()=>{ state.drawerId=c.dataset.id; renderApp(); });
  }

  /* ================= SCHEDULE PAGE ================= */
  function renderSchedule(body){
    validateAll(bookings);
    const hours = ['Now','+15m','+30m','+45m','+1h','+1h15','+1h30','+1h45'];
    body.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div class="ph-title">${ic('branch')}Antenna Allocation — Next 2 Hours</div>
          <div class="ph-actions">
            <button class="btn-sm" id="csvBtn">${ic('download')}Export CSV</button>
            <button class="btn-sm warn" id="emgBtn">${ic('bolt')}Inject Tier-1 Emergency</button>
            <button class="btn-sm primary" id="autoBtn">${ic('refresh')}Auto-Schedule</button>
          </div>
        </div>
        <div class="gantt-wrap"><div class="gantt">
          <div class="gantt-header"><div></div>${hours.map(h=>`<div class="hcell">${h}</div>`).join('')}</div>
          ${ANTENNAS.map(a=>`
            <div class="gantt-row">
              <div class="gantt-label">${a}</div>
              <div class="gantt-track">
                ${bookings.filter(p=>p.ant===a).map(p=>{
                  const st = statusOf(p);
                  const cls = p.preempted ? 'preempted' : st;
                  return `<div class="gantt-bar ${cls}" data-id="${p.id}"
                    style="left:${(p.start/TOTAL_WINDOW_H)*100}%; width:${Math.max(3,(p.dur/TOTAL_WINDOW_H)*100)}%;">${p.sat}</div>`;
                }).join('')}
              </div>
            </div>`).join('')}
          ${bookings.some(p=>p.ant==='UNSCHEDULED') ? `
            <div class="gantt-row">
              <div class="gantt-label" style="color:var(--red-tx);">Unscheduled</div>
              <div class="gantt-track">
                ${bookings.filter(p=>p.ant==='UNSCHEDULED').map(p=>`
                  <div class="gantt-bar red" data-id="${p.id}"
                    style="left:${(p.start/TOTAL_WINDOW_H)*100}%; width:${Math.max(3,(p.dur/TOTAL_WINDOW_H)*100)}%;">${p.sat}</div>`).join('')}
              </div>
            </div>` : ''}
        </div></div>
        <div class="disclaimer">Slew feasibility uses 20°/s azimuth · 10°/s elevation rates and a ±380° cable-wrap limit from the project spec's NRSC SGSS figures. This is a simplified single-axis-priority model, not the full accelerate–coast–decelerate–settle kinematic profile described in the spec.</div>
      </div>
    `;
    body.querySelectorAll('.gantt-bar').forEach(b=>b.onclick=()=>{ state.drawerId=b.dataset.id; renderApp(); });
    document.getElementById('autoBtn').onclick = ()=>{ autoSchedule(); renderApp(); };
    document.getElementById('emgBtn').onclick = ()=>{ injectEmergency(); renderApp(); };
    document.getElementById('csvBtn').onclick = exportCSV;
  }

  function renderDrawer(){
    const p = bookings.find(b=>b.id===state.drawerId);
    if(!p){ state.drawerId=null; return; }
    const st = statusOf(p);
    const label = p.unscheduled ? 'Unscheduled' : p.preempted ? 'Preempted' : (st==='green'?'Active':st==='amber'?'Scheduled':'Conflict');
    const wave = Array.from({length:40},(_,i)=>{
      const x = i*9;
      const y = 30 + Math.sin(i/3)*16*(p.elevMax/90);
      return (i===0?'M':'L')+x+' '+y;
    }).join(' ');
    const flags = (p.flags||[]);
    const el = document.createElement('div');
    el.className='drawer-overlay';
    el.innerHTML = `
      <div class="drawer">
        <div class="drawer-head"><h3>${p.sat}</h3><button class="drawer-close" id="drClose">${ic('x')}</button></div>
        <div class="drawer-row"><span>Status</span><b><span class="badge ${p.preempted?'red':st}">${label}</span></b></div>
        <div class="drawer-row"><span>Priority</span><b>${TIER_LABEL[p.tier]}${p.preemptedBy?' — bumped by '+p.preemptedBy:''}</b></div>
        <div class="drawer-row"><span>Antenna</span><b>${p.unscheduled ? 'None available in window' : p.ant}</b></div>
        <div class="drawer-row"><span>Ground Station</span><b>Shadnagar</b></div>
        <div class="drawer-row"><span>Max Elevation</span><b>${p.elevMax}°</b></div>
        <div class="drawer-row"><span>AOS → LOS</span><b>${clockAt(p.start)} → ${clockAt(p.start+p.dur)}</b></div>
        <div class="drawer-row"><span>Azimuth AOS → LOS</span><b>${p.aosAz}° → ${p.losAz}°</b></div>
        <div class="drawer-row"><span>Duration</span><b>${Math.round(p.dur*60)} min</b></div>
        ${p.uplinkRequired?`<div class="drawer-row"><span>Uplink window</span><b>${p.uplinkAvailableMin}m avail / ${p.uplinkNeededMin}m needed</b></div>`:''}
        ${flags.length?`<div class="flag-row">${flags.map(f=>`<span class="flag-chip ${f==='overlap'||f==='wrap'||f==='uplink'?'red':'amber'}">${flagLabel(f)}</span>`).join('')}</div>`:''}
        <div class="doppler-wrap">
          <div class="cap">Doppler curve (illustrative)</div>
          <svg viewBox="0 0 360 60" width="100%" height="60">
            <path d="${wave}" fill="none" stroke="var(--teal)" stroke-width="1.6"/>
          </svg>
        </div>
      </div>
    `;
    el.addEventListener('click', e=>{ if(e.target===el){ state.drawerId=null; renderApp(); } });
    root.appendChild(el);
    el.querySelector('#drClose').onclick = ()=>{ state.drawerId=null; renderApp(); };
  }

  /* ================= LINK BUDGET PAGE ================= */
  function renderLinkBudget(body){
    const lb = linkBudget(state.rain, state.radius);
    body.innerHTML = `
      <div class="lb-grid">
        <div class="panel">
          <div class="panel-head"><div class="ph-title">${ic('zap')}Conditions</div></div>
          <div class="lb-slider">
            <label>Monsoon rain rate <b id="rainVal">${state.rain} mm/hr</b></label>
            <input type="range" id="rainSlider" min="0" max="150" step="1" value="${state.rain}">
          </div>
          <div class="lb-slider">
            <label>5G exclusion-zone radius <b id="radiusVal">${state.radius.toFixed(1)} km</b></label>
            <input type="range" id="radiusSlider" min="1.0" max="2.7" step="0.1" value="${state.radius}">
          </div>
          <div class="lb-readouts">
            <div class="lb-read"><div class="k">Rain attenuation</div><div class="v" id="rainAttenOut">${lb.rainAtten.toFixed(1)} dB</div></div>
            <div class="lb-read"><div class="k">Interference margin</div><div class="v" id="interfOut">${lb.interference.toFixed(1)} dB</div></div>
            <div class="lb-read"><div class="k">C/N₀</div><div class="v" id="cn0Out">${lb.cn0.toFixed(1)} dB</div></div>
            <div class="lb-read"><div class="k">Data rate</div><div class="v" id="rateOut">${lb.modcod.rate} Mbps</div></div>
          </div>
          <div class="modcod-badge" id="modcodOut">MODCOD: ${lb.modcod.name}</div>
          <div class="disclaimer">Simplified demonstration model — linear rain/interference approximations, not the ITU-R P.618-14 / P.838-1 implementation the project spec calls for (that lives in the Rust engine + rain_svc cross-check).</div>
        </div>
        <div class="panel">
          <div class="panel-head"><div class="ph-title">${ic('branch')}Data Rate vs. Rain Rate</div></div>
          <div class="curve-cap">At current exclusion radius (${state.radius.toFixed(1)} km) — discrete steps are MODCOD transitions</div>
          <div class="curve-box" id="curveBox"></div>
        </div>
      </div>
    `;
    drawCurve();
    document.getElementById('rainSlider').addEventListener('input', e=>{ state.rain=+e.target.value; updateLB(); });
    document.getElementById('radiusSlider').addEventListener('input', e=>{ state.radius=+e.target.value; updateLB(); });
  }
  function updateLB(){
    const lb = linkBudget(state.rain, state.radius);
    document.getElementById('rainVal').textContent = state.rain+' mm/hr';
    document.getElementById('radiusVal').textContent = state.radius.toFixed(1)+' km';
    document.getElementById('rainAttenOut').textContent = lb.rainAtten.toFixed(1)+' dB';
    document.getElementById('interfOut').textContent = lb.interference.toFixed(1)+' dB';
    document.getElementById('cn0Out').textContent = lb.cn0.toFixed(1)+' dB';
    document.getElementById('rateOut').textContent = lb.modcod.rate+' Mbps';
    document.getElementById('modcodOut').textContent = 'MODCOD: '+lb.modcod.name;
    document.querySelector('.curve-cap').textContent = 'At current exclusion radius ('+state.radius.toFixed(1)+' km) — discrete steps are MODCOD transitions';
    drawCurve();
  }
  function drawCurve(){
    const box = document.getElementById('curveBox'); if(!box) return;
    const W=360,H=180,pad=28;
    const maxRate = MODCOD_TABLE[0].rate;
    let pts = [];
    for(let r=0;r<=150;r+=3){
      const lb = linkBudget(r, state.radius);
      const x = pad + (r/150)*(W-2*pad);
      const y = H-pad - (lb.modcod.rate/maxRate)*(H-2*pad);
      pts.push(x+','+y);
    }
    const curRain = state.rain;
    const curLb = linkBudget(curRain, state.radius);
    const cx = pad + (curRain/150)*(W-2*pad);
    const cy = H-pad - (curLb.modcod.rate/maxRate)*(H-2*pad);
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">
      <line x1="${pad}" y1="${H-pad}" x2="${W-8}" y2="${H-pad}" stroke="var(--border)"/>
      <line x1="${pad}" y1="8" x2="${pad}" y2="${H-pad}" stroke="var(--border)"/>
      <text x="${W-8}" y="${H-10}" text-anchor="end" font-size="9" fill="var(--muted)">150 mm/hr</text>
      <text x="${pad}" y="${H-10}" font-size="9" fill="var(--muted)">0</text>
      <text x="${pad}" y="16" font-size="9" fill="var(--muted)">${maxRate} Mbps</text>
      <polyline points="${pts.join(' ')}" fill="none" stroke="var(--teal)" stroke-width="2"/>
      <line x1="${cx}" y1="8" x2="${cx}" y2="${H-pad}" stroke="var(--muted-2)" stroke-dasharray="3 3"/>
      <circle cx="${cx}" cy="${cy}" r="4.5" fill="var(--orange)"/>
    </svg>`;
  }

  /* ================= SLA PAGE ================= */
  function slaColor(pct){ return pct>=97?'var(--green-dot)':pct>=85?'var(--amber-dot)':'var(--red-dot)'; }
  function slaBadge(pct){ return pct>=97?'green':pct>=85?'amber':'red'; }
  function renderSLA(body){
    const rows = ANTENNAS.map(a=>{
      const contracted = SLA_TARGETS[a];
      const delivered = Math.max(0, SLA_DELIVERED_BASE[a] - ledger[a].preemptions);
      const pct = Math.round((delivered/contracted)*100);
      return { station:'Shadnagar', ant:a, contracted, delivered, pct, preemptions:ledger[a].preemptions, credits:ledger[a].creditsMin };
    });
    body.innerHTML = `
      <div class="panel">
        <div class="panel-head"><div class="ph-title">${ic('clipboard')}SLA Ledger — This Month</div></div>
        <table class="sla-table">
          <thead><tr><th>Ground Station</th><th>Antenna</th><th>Contracted</th><th>Delivered</th><th>SLA %</th><th>Preemptions</th><th>Credits Owed</th><th>Status</th></tr></thead>
          <tbody>
            ${rows.map(r=>`
              <tr>
                <td>${r.station}</td><td>${r.ant}</td><td>${r.contracted}</td><td>${r.delivered}</td>
                <td><div style="display:flex;align-items:center;gap:8px;">
                  <div class="sla-bar-bg"><div class="sla-bar-fill" style="width:${Math.min(100,r.pct)}%;background:${slaColor(r.pct)}"></div></div>
                  <span>${r.pct}%</span></div></td>
                <td>${r.preemptions}</td>
                <td>${r.credits>0?r.credits+' min credit':'—'}</td>
                <td><span class="badge ${slaBadge(r.pct)}">${r.pct>=97?'Met':r.pct>=85?'At Risk':'Breached'}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="disclaimer">Delivered counts fall automatically when a booking on that antenna is preempted by a higher-tier pass (see Schedule → Inject Tier-1 Emergency); credits owed accrue per the doc's per-contract preemption tracking.</div>
      </div>
    `;
  }

  /* ================= ANTENNAS PAGE ================= */
  function renderAntennas(body){
    body.innerHTML = `<div class="ant-grid">
      ${ANTENNAS.map(a=>{
        const act = activityFor(a);
        const ang = antennaAngles[a];
        const label = ang.slewing ? 'Slewing' : (act.status==='red'?'Offline':act.status==='amber'?'Idle':'Online');
        return `<div class="ant-card" data-ant="${a}">
          <div class="ant-top"><div><div class="ant-name">${a}</div><div class="ant-station">Shadnagar</div></div>
            <span class="badge ${ang.slewing?'amber':act.status}">${label}</span></div>
          <div class="ant-activity" id="act-${a}">${act.text}</div>
          <div class="ant-body">
            <div class="ant-gauge-col">
              <svg class="ant-gauge" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)"/>
                <text x="50" y="12" text-anchor="middle" font-size="7" fill="var(--muted-2)">0°</text>
                <text x="92" y="53" text-anchor="middle" font-size="7" fill="var(--muted-2)">90°</text>
                <line id="needle-${a}" x1="50" y1="50" x2="50" y2="14" stroke="var(--teal)" stroke-width="3"
                  transform="rotate(${ang.curAz} 50 50)"/>
                <circle cx="50" cy="50" r="3" fill="var(--teal)"/>
              </svg>
              <div class="el-gauge"><div class="keyhole"></div><div class="fill" id="elfill-${a}" style="height:${(ang.curEl/90)*100}%"></div></div>
              <div style="font-size:10px;color:var(--muted);text-align:center;">AZ <b id="azread-${a}">${ang.curAz.toFixed(0)}°</b><br>EL <b id="elread-${a}">${ang.curEl.toFixed(0)}°</b></div>
            </div>
            <div class="ant-controls">
              <div class="ctl-row"><label>Target Azimuth <span id="azTargetLabel-${a}">${ang.targetAz.toFixed(0)}°</span></label>
                <input type="range" min="-380" max="380" step="1" value="${ang.targetAz}" id="azSlider-${a}" ${ang.slewing?'disabled':''}></div>
              <div class="ctl-row"><label>Target Elevation <span id="elTargetLabel-${a}">${ang.targetEl.toFixed(0)}°</span></label>
                <input type="range" min="0" max="90" step="1" value="${ang.targetEl}" id="elSlider-${a}" ${ang.slewing?'disabled':''}></div>
              <button class="btn-sm primary" id="slewBtn-${a}" ${ang.slewing?'disabled':''}>${ic('refresh')}${ang.slewing?'Slewing…':'Slew to Target'}</button>
              <div class="slew-status ${ang.slewing?'slewing':'idle'}" id="slewStatus-${a}">${ang.slewing?'Moving…':'Idle'}</div>
              <div class="keyhole-warn" id="keyholeWarn-${a}" style="display:${ang.targetEl>85?'block':'none'}">Above 85° elevation, azimuth rate needed to track approaches infinity — flagged as keyhole risk, not continuously trackable.</div>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;

    ANTENNAS.forEach(a=>{
      const azS = document.getElementById('azSlider-'+a);
      const elS = document.getElementById('elSlider-'+a);
      azS.addEventListener('input', e=>{
        document.getElementById('azTargetLabel-'+a).textContent = (+e.target.value).toFixed(0)+'°';
      });
      elS.addEventListener('input', e=>{
        const v = +e.target.value;
        document.getElementById('elTargetLabel-'+a).textContent = v.toFixed(0)+'°';
        document.getElementById('keyholeWarn-'+a).style.display = v>85 ? 'block':'none';
      });
      document.getElementById('slewBtn-'+a).onclick = ()=> startSlew(a, +azS.value, +elS.value);
    });
  }

  function startSlew(ant, targetAz, targetEl){
    const ang = antennaAngles[ant];
    if(ang.slewing) return;
    ang.targetAz = targetAz; ang.targetEl = targetEl;
    const azDelta = Math.abs(targetAz - ang.curAz);
    const elDelta = Math.abs(targetEl - ang.curEl);
    const durationMs = (slewSeconds(azDelta, elDelta)) * 1000 / 6; // sped up 6x so the demo is watchable
    const startAz = ang.curAz, startEl = ang.curEl;
    const t0 = performance.now();
    ang.slewing = true;
    renderApp();
    ang.timer = setInterval(()=>{
      const t = Math.min(1, (performance.now()-t0)/durationMs);
      ang.curAz = startAz + (targetAz-startAz)*t;
      ang.curEl = startEl + (targetEl-startEl)*t;
      const needle = document.getElementById('needle-'+ant);
      const elfill = document.getElementById('elfill-'+ant);
      const azread = document.getElementById('azread-'+ant);
      const elread = document.getElementById('elread-'+ant);
      const status = document.getElementById('slewStatus-'+ant);
      if(needle) needle.setAttribute('transform','rotate('+ang.curAz+' 50 50)');
      if(elfill) elfill.style.height = (Math.min(ang.curEl,90)/90*100)+'%';
      if(azread) azread.textContent = ang.curAz.toFixed(0)+'°';
      if(elread) elread.textContent = ang.curEl.toFixed(0)+'°';
      if(status) status.textContent = 'Moving… '+Math.round(t*100)+'%';
      if(t>=1){
        clearInterval(ang.timer); ang.timer=null; ang.slewing=false;
        if(status){ status.textContent = targetEl>85 ? 'On target (keyhole zone)' : 'On target'; status.className='slew-status ontarget'; }
        const btn = document.getElementById('slewBtn-'+ant);
        if(btn){ btn.disabled=false; btn.innerHTML = ic('refresh')+'Slew to Target'; }
        [document.getElementById('azSlider-'+ant), document.getElementById('elSlider-'+ant)].forEach(s=>{ if(s) s.disabled=false; });
      }
    }, 60);
  }

  /* ================= SETTINGS PAGE ================= */
  function renderSettings(body){
    body.innerHTML = `
      <div class="settings-grid">
        <div class="panel">
          <div class="panel-head"><div class="ph-title">${ic('user')}Operator Profile</div></div>
          <div class="profile-row"><span>Username</span><b>${state.session.username}</b></div>
          <div class="profile-row"><span>Email</span><b>${state.session.email}</b></div>
          <div class="profile-row"><span>Clearance</span><b>Ground Segment</b></div>
          <div class="profile-row"><span>Ground Station</span><b>Shadnagar</b></div>
        </div>
        <div class="panel">
          <div class="panel-head"><div class="ph-title">${ic('gear')}Preferences</div></div>
          <div class="toggle-row">
            <div><div class="t-label">Dark mode</div><div class="t-sub">Switch the console appearance</div></div>
            <div class="switch ${state.theme==='dark'?'on':''}" id="themeSwitch"><div class="knob"></div></div>
          </div>
          <div class="toggle-row">
            <div><div class="t-label">Language</div><div class="t-sub">English (only option in this demo)</div></div>
            <div class="switch on" style="opacity:.4;cursor:not-allowed;"><div class="knob"></div></div>
          </div>
        </div>
      </div>
    `;
    document.getElementById('themeSwitch').onclick = ()=>{ state.theme = state.theme==='light'?'dark':'light'; render(); };
  }

  validateAll(bookings);
  render();
})();
