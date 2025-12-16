// DOM refs
const worldFrame = document.getElementById('worldFrame');
const overlay = document.getElementById('overlay');
const panel = document.getElementById('panel');
const tabContent = document.getElementById('tabContent');
const openPanelBtn = document.getElementById('openPanelBtn');
const headshotBtn = document.getElementById('headshotBtn');
const hygieneMenu = document.getElementById('hygieneMenu');
const actionMenu = document.getElementById('actionMenu');

const moodMain = document.getElementById('moodMain');
const moodSub = document.getElementById('moodSub');
const moodGauge = document.getElementById('moodGauge');
const plumbob = document.getElementById('plumbob');
const needDots = document.getElementById('needDots');
const weatherChip = document.getElementById('weatherChip');

const xpFloatLayer = document.getElementById('xpFloatLayer');

const musicToggleBtn = document.getElementById('musicToggle');
const musicSkipBtn = document.getElementById('musicSkip');
const installBtn = document.getElementById('installBtn');

let selectedType = null;
let selectedIndex = null;

const EMOTIONS = [
  { key:'happy', label:'Happy', sub:'sparkly', nudge:{ fun:+2, social:+1 }, sfx:'sounds/happy.mp3' },
  { key:'playful', label:'Playful', sub:'bouncy', nudge:{ fun:+3 }, sfx:'sounds/playful.mp3' },
  { key:'flirty', label:'Flirty', sub:'charming', nudge:{ social:+2 }, sfx:'sounds/flirty.mp3' },
  { key:'inspired', label:'Inspired', sub:'creative', nudge:{ quiet:+1 }, sfx:'sounds/inspired.mp3' },
  { key:'focused', label:'Focused', sub:'locked in', nudge:{ quiet:+1 }, sfx:'sounds/focused.mp3' },
  { key:'fine', label:'Fine', sub:'steady', nudge:{}, sfx:'sounds/fine.mp3' },
  { key:'sad', label:'Sad', sub:'need comfort', nudge:{ fun:-1, social:-1 }, sfx:'sounds/sad.mp3' },
  { key:'upset', label:'Upset', sub:'overwhelmed', nudge:{ quiet:-1 }, sfx:'sounds/upset.mp3' },
  { key:'embarrassed', label:'Embarrassed', sub:'oof', nudge:{ social:-1 }, sfx:'sounds/embarrassed.mp3' },
  { key:'uncomfortable', label:'Uncomfortable', sub:'irritable', nudge:{ hygiene:-1 }, sfx:'sounds/uncomfortable.mp3' },
  { key:'scared', label:'Scared', sub:'need safety', nudge:{ quiet:+1 }, sfx:'sounds/scared.mp3' },
  { key:'aspired', label:'Aspired', sub:'ready', nudge:{ energy:+1 }, sfx:'sounds/aspired.mp3' }
];

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function clamp01(v){ return Math.max(0, Math.min(100, v)); }

function openPanel(){
  panel.classList.add('open');
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden','false');
  setTimeout(()=>tabContent?.focus?.(), 0);
}
function closePanel(){
  panel.classList.remove('open');
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden','true');
  hideActionMenu();
}
function showActionMenu(type, index){
  selectedType = type;
  selectedIndex = index;
  actionMenu.classList.add('show');
  actionMenu.setAttribute('aria-hidden','false');
}
function hideActionMenu(){
  actionMenu.classList.remove('show');
  actionMenu.setAttribute('aria-hidden','true');
  selectedType = null;
  selectedIndex = null;
}

function postToWorld(payload){
  try{
    worldFrame?.contentWindow?.postMessage(payload, '*');
  }catch{}
}

function moodFromNeeds(){
  const n = state.needs;
  const avg = (n.hunger+n.energy+n.social+n.fun+n.hygiene+n.quiet)/6;
  let tier = 'good';
  if(avg < 40) tier='low';
  else if(avg < 70) tier='neutral';
  state.mood.tier = tier;

  moodMain.textContent = state.mood.main || tier;
  moodSub.textContent = state.mood.sub || (tier==='good'?'balanced':tier==='neutral'?'steady':'need care');

  moodGauge.style.width = clamp01(avg) + '%';

  if(tier==='good'){
    plumbob.style.background = '#6ede8a';
    moodGauge.style.background = 'linear-gradient(90deg,#b7e4c7,#74c69d)';
  } else if(tier==='neutral'){
    plumbob.style.background = '#f4d35e';
    moodGauge.style.background = 'linear-gradient(90deg,#ffe8a3,#f4d35e)';
  } else {
    plumbob.style.background = '#ef476f';
    moodGauge.style.background = 'linear-gradient(90deg,#ff8fab,#ef476f)';
  }

  const minNeed = Math.min(...Object.values(n));
  needDots.textContent = minNeed < 30 ? '•' : (minNeed < 60 ? '••' : '•••');
}

function xp(skill, amount){
  state.skills[skill] = (state.skills[skill]||0) + amount;
  state.skills.overall = (state.skills.overall||0) + amount;

  const e = document.createElement('div');
  e.className = 'xp';
  const jitter = (Math.random()*90 - 45);
  e.style.transform = `translateX(${jitter}px)`;
  e.textContent = `+${amount} XP (${skill})`;
  xpFloatLayer.appendChild(e);
  setTimeout(()=>e.remove(), 1900);

  postToWorld({ type:'XP', skill, amount });
  saveState();
}

function levelFromXp(xpValue){
  return Math.floor(Math.sqrt((xpValue||0)/10));
}

function applyNeedNudge(nudge){
  for(const k in nudge){
    if(k in state.needs) state.needs[k] = clamp01(state.needs[k] + nudge[k]);
  }
}

function catchUpFromLastActive(){
  const last = state.lastActive || Date.now();
  const mins = Math.floor((Date.now() - last) / 60000);
  if(mins <= 0) return;
  for(const k in state.needs){
    state.needs[k] = clamp01(state.needs[k] - mins);
  }
  saveState();
}

function renderTab(tab){
  hideActionMenu();
  if(tab==='emotions') return renderEmotions();
  if(tab==='needs') return renderNeeds();
  if(tab==='recipes') return renderRecipes('');
  if(tab==='baking') return renderRecipes('baking');
  if(tab==='haircare') return renderHaircare();
  if(tab==='timers') return renderTimers();
  if(tab==='calendar') return renderCalendar();
  if(tab==='reactions') return renderReactions();
  if(tab==='skills') return renderSkills();
  if(tab==='notifications') return renderNotifications();
}

function renderEmotions(){
  tabContent.innerHTML = `
    <div class="card">
      <div style="font-weight:950">Emotions</div>
      <div style="font-size:12px;opacity:.75;margin-top:4px">Tap a feeling to update mood + HUD + world vibe.</div>
    </div>
    <div class="card"><div class="grid" id="emoGrid"></div></div>
  `;
  const g = document.getElementById('emoGrid');
  EMOTIONS.forEach((emo)=>{
    const b = document.createElement('button');
    b.className='tile';
    b.type='button';
    b.innerHTML = `<div class="tname">${escapeHtml(emo.label)}</div><div class="tmeta">${escapeHtml(emo.sub)}</div>`;
    b.onclick = ()=>{
      g.querySelectorAll('.tile').forEach(t=>t.classList.remove('sel'));
      b.classList.add('sel');

      state.mood.main = emo.key;
      state.mood.sub = emo.sub;

      applyNeedNudge(emo.nudge||{});
      moodFromNeeds();

      xp('mind', 5);
      playSFX(emo.sfx);
      postToWorld({ type:'EMOTION', key:emo.key });

      saveState();
    };
    g.appendChild(b);
  });
}

function renderNeeds(){
  const n = state.needs;
  tabContent.innerHTML = `
    <div class="card">
      <div style="font-weight:950">Needs</div>
      <div style="font-size:12px;opacity:.75;margin-top:4px">Decay over time and affects mood tier.</div>
    </div>
    <div class="card">
      ${Object.entries(n).map(([k,v])=>`
        <div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0">
          <div style="font-weight:900;text-transform:capitalize">${k}</div>
          <div style="font-weight:950">${v}</div>
        </div>
        <div class="gauge" style="margin:6px 0 12px">
          <div class="gauge-fill" style="width:${clamp01(v)}%"></div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderRecipes(filter){
  const list = state.recipes.filter(r => !filter || String(r.category||'').includes(filter));
  tabContent.innerHTML = `
    <div class="card">
      <div style="font-weight:950">Add Recipe</div>
      <input type="text" id="recipeName" placeholder="Recipe name" />
      <input type="text" id="recipeCategory" placeholder="Category (ex: baking)" />
      <textarea id="recipeNotes" placeholder="Notes"></textarea>
      <button id="addRecipeBtn" class="btn" style="margin-top:10px">Add</button>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:950">${filter ? 'Baking Recipes' : 'Recipes'}</div>
        <div style="font-size:12px;opacity:.75">${list.length} items</div>
      </div>
      <div class="grid" id="recipeGrid"></div>
    </div>
  `;

  const grid = document.getElementById('recipeGrid');
  list.forEach((r)=>{
    const idx = state.recipes.indexOf(r);
    const tile = document.createElement('button');
    tile.className='tile';
    tile.type='button';
    tile.innerHTML = `<div class="tname">${escapeHtml(r.name||'Untitled')}</div><div class="tmeta">${escapeHtml(r.category||'')}</div>`;
    tile.onclick = ()=>{
      grid.querySelectorAll('.tile').forEach(t=>t.classList.remove('sel'));
      tile.classList.add('sel');
      showActionMenu('recipes', idx);
    };
    grid.appendChild(tile);
  });

  document.getElementById('addRecipeBtn').onclick = ()=>{
    const name = (document.getElementById('recipeName').value||'').trim();
    const category = (document.getElementById('recipeCategory').value||'').trim().toLowerCase();
    const notes = (document.getElementById('recipeNotes').value||'').trim();
    if(!name && !category && !notes) return;

    state.recipes.push({ name, category, notes });

    if(category.includes('baking')) xp('baking', 15);
    else xp('cooking', 15);
    xp('nourish', 6);

    saveState();
    renderRecipes(filter);
  };
}

function renderHaircare(){
  tabContent.innerHTML = `
    <div class="card">
      <div style="font-weight:950">Add HairCare</div>
      <input id="hcName" placeholder="Routine name" />
      <input id="hcTag" placeholder="Tag (ex: wash day)" />
      <textarea id="hcNotes" placeholder="Notes"></textarea>
      <button id="addHairBtn" class="btn" style="margin-top:10px">Add</button>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:950">HairCare</div>
        <div style="font-size:12px;opacity:.75">${state.haircare.length} items</div>
      </div>
      <div class="grid" id="hairGrid"></div>
    </div>
  `;

  const grid = document.getElementById('hairGrid');
  state.haircare.forEach((h, idx)=>{
    const tile = document.createElement('button');
    tile.className='tile';
    tile.type='button';
    tile.innerHTML = `<div class="tname">${escapeHtml(h.name||'Untitled')}</div><div class="tmeta">${escapeHtml(h.tag||'')}</div>`;
    tile.onclick = ()=>{
      grid.querySelectorAll('.tile').forEach(t=>t.classList.remove('sel'));
      tile.classList.add('sel');
      showActionMenu('haircare', idx);
    };
    grid.appendChild(tile);
  });

  document.getElementById('addHairBtn').onclick = ()=>{
    const name = (document.getElementById('hcName').value||'').trim();
    const tag = (document.getElementById('hcTag').value||'').trim().toLowerCase();
    const notes = (document.getElementById('hcNotes').value||'').trim();
    if(!name && !tag && !notes) return;

    state.haircare.push({ name, tag, notes });
    xp('selfCare', 12);

    saveState();
    renderHaircare();
  };
}

const TIMER_KEYS = [
  ['hydration','Hydration','selfCare'],
  ['meal','Meal','nourish'],
  ['snack','Snack','nourish'],
  ['bathroom','Bathroom','selfCare'],
  ['shower','Shower','selfCare'],
  ['skincare','Skincare','selfCare']
];
let timerTick = null;

function renderTimers(){
  tabContent.innerHTML = `
    <div class="card">
      <div style="font-weight:950">Timers</div>
      <div style="font-size:12px;opacity:.75;margin-top:4px">Start/Stop. Completion awards XP + optional alarm.</div>
    </div>
    <div id="timerList"></div>
  `;
  const list = document.getElementById('timerList');
  TIMER_KEYS.forEach(([key,label])=>{
    const end = state.timers[key];
    const row = document.createElement('div');
    row.className='card';
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:950">${label}</div>
        <button class="btn" data-t="${key}">${end ? 'Stop' : 'Start'}</button>
      </div>
      <div style="margin-top:8px;font-weight:950" id="t_${key}">${formatCountdown(end)}</div>
    `;
    row.querySelector('button').onclick = ()=>toggleTimer(key);
    list.appendChild(row);
  });
  startTimerTick();
}

function formatCountdown(endTime){
  if(!endTime) return '—';
  const ms = endTime - Date.now();
  if(ms <= 0) return 'Done!';
  const s = Math.ceil(ms/1000);
  const m = Math.floor(s/60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2,'0')}`;
}

function toggleTimer(key){
  const cur = state.timers[key];
  if(cur){
    state.timers[key] = null;
    saveState();
    renderTimers();
    return;
  }
  const mins = (key==='meal')?30:(key==='shower')?20:(key==='skincare')?10:(key==='bathroom')?8:(key==='snack')?15:45;
  state.timers[key] = Date.now() + mins*60*1000;
  saveState();
  renderTimers();
}

function startTimerTick(){
  if(timerTick) return;
  timerTick = setInterval(()=>{
    if(!panel.classList.contains('open')) return;
    TIMER_KEYS.forEach(([key,label,skill])=>{
      const el = document.getElementById('t_'+key);
      if(!el) return;
      const end = state.timers[key];
      el.textContent = formatCountdown(end);
      if(end && end - Date.now() <= 0){
        state.timers[key] = null;
        saveState();
        playSFX('sounds/timer.mp3');
        xp(skill, 10);
        postToWorld({ type:'TIMER_DONE', key });
      }
    });
  }, 1000);
}

function dayKey(d=new Date()){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function ensureDailyTasks(){
  const dk = dayKey();
  if(state.calendar.dayKey !== dk){
    state.calendar.dayKey = dk;
    const pool = [...state.calendar.pool].sort(()=>Math.random()-0.5);
    state.calendar.tasks = pool.slice(0,2).map(t=>({ name:t, done:false }));
    saveState();
  }
}
function renderCalendar(){
  ensureDailyTasks();
  tabContent.innerHTML = `
    <div class="card">
      <div style="font-weight:950">Daily Cleaning</div>
      <div style="font-size:12px;opacity:.75;margin-top:4px">Two tiny tasks a day. Complete → XP + a fresh task.</div>
    </div>
    <div id="taskList"></div>
  `;
  const list = document.getElementById('taskList');
  state.calendar.tasks.forEach((t, idx)=>{
    const row = document.createElement('div');
    row.className='card';
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div style="font-weight:950">${escapeHtml(t.name)}</div>
        <button class="btn" data-i="${idx}">Complete</button>
      </div>
    `;
    row.querySelector('button').onclick = ()=>completeTask(idx);
    list.appendChild(row);
  });
}
function completeTask(idx){
  if(!state.calendar.tasks[idx]) return;
  xp('cleaning', 20);
  xp('homestead', 6);

  const pool = [...state.calendar.pool].sort(()=>Math.random()-0.5);
  const newTask = pool.find(x => !state.calendar.tasks.some(t=>t.name===x)) || pool[0] || 'Tiny tidy';
  state.calendar.tasks[idx] = { name:newTask, done:false };

  saveState();
  renderCalendar();
}

function startOf(period){
  const d = new Date();
  if(period==='day'){ d.setHours(0,0,0,0); return d.getTime(); }
  if(period==='week'){
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate()-diff);
    d.setHours(0,0,0,0);
    return d.getTime();
  }
  if(period==='month'){ d.setDate(1); d.setHours(0,0,0,0); return d.getTime(); }
  if(period==='year'){ d.setMonth(0,1); d.setHours(0,0,0,0); return d.getTime(); }
  return 0;
}
function timeAgo(ts){
  if(!ts) return 'never';
  const s = Math.floor((Date.now()-ts)/1000);
  const m = Math.floor(s/60);
  const h = Math.floor(m/60);
  const d = Math.floor(h/24);
  if(d>0) return d+'d ago';
  if(h>0) return h+'h ago';
  if(m>0) return m+'m ago';
  return 'just now';
}
function renderReactionStats(key){
  const arr = state.reactions[key] || [];
  const today = arr.filter(t=>t>=startOf('day')).length;
  const week = arr.filter(t=>t>=startOf('week')).length;
  const month = arr.filter(t=>t>=startOf('month')).length;
  const year = arr.filter(t=>t>=startOf('year')).length;
  const last = arr.length ? arr[arr.length-1] : null;
  return `
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:8px">
      <div><b>Today</b><div>${today}</div></div>
      <div><b>This week</b><div>${week}</div></div>
      <div><b>This month</b><div>${month}</div></div>
      <div><b>This year</b><div>${year}</div></div>
    </div>
    <div style="margin-top:10px;opacity:.8"><b>Last time:</b> ${timeAgo(last)}</div>
  `;
}
function logReaction(key){
  state.reactions[key] = Array.isArray(state.reactions[key]) ? state.reactions[key] : [];
  state.reactions[key].push(Date.now());
  if(state.reactions[key].length > 500) state.reactions[key] = state.reactions[key].slice(-500);
  state.needs.energy = clamp01(state.needs.energy - 2);
  state.needs.quiet = clamp01(state.needs.quiet - 2);
  xp('mind', 6);
  moodFromNeeds();
  saveState();
  renderReactions();
}
function renderReactions(){
  tabContent.innerHTML = `
    <div class="card">
      <div style="font-weight:950">Reactions</div>
      <div style="font-size:12px;opacity:.75;margin-top:4px">Track awareness, not punishment.</div>
    </div>

    <div class="card">
      <div style="font-weight:950">CAK – Cursed at Kids</div>
      ${renderReactionStats('CAK')}
      <button class="btn" id="logCAK" style="margin-top:10px">Log CAK</button>
    </div>

    <div class="card">
      <div style="font-weight:950">YAK – Yelled at Kids</div>
      ${renderReactionStats('YAK')}
      <button class="btn" id="logYAK" style="margin-top:10px">Log YAK</button>
    </div>
  `;
  document.getElementById('logCAK').onclick = ()=>logReaction('CAK');
  document.getElementById('logYAK').onclick = ()=>logReaction('YAK');
}

function renderSkills(){
  const entries = Object.entries(state.skills);
  tabContent.innerHTML = `
    <div class="card">
      <div style="font-weight:950">Skills</div>
      <div style="font-size:12px;opacity:.75;margin-top:4px">XP routes automatically from actions, timers, entries, and reactions.</div>
    </div>

    <div class="card">
      ${entries.map(([k,v])=>`
        <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0">
          <div style="font-weight:950;text-transform:capitalize">${k}</div>
          <div style="font-weight:950">Lv ${levelFromXp(v)} • ${v} XP</div>
        </div>
        <div class="gauge"><div class="gauge-fill" style="width:${Math.min(100,(v%100))}%"></div></div>
      `).join('')}
    </div>
  `;
}

function renderNotifications(){
  tabContent.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div>
          <div style="font-weight:950">Notifications</div>
          <div style="font-size:12px;opacity:.75;margin-top:2px">Gentle nudges. Requires permission.</div>
        </div>
        <button id="enableNotifsBtn" class="btn">${state.notifications.enabled ? 'Enabled' : 'Enable'}</button>
      </div>
    </div>

    <div class="card">
      <label style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:900">Hydration</span>
        <input id="nHydration" type="checkbox" ${state.notifications.hydration ? 'checked' : ''} />
      </label>
      <label style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
        <span style="font-weight:900">Meals</span>
        <input id="nMeals" type="checkbox" ${state.notifications.meals ? 'checked' : ''} />
      </label>
      <label style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
        <span style="font-weight:900">Cleaning</span>
        <input id="nCleaning" type="checkbox" ${state.notifications.cleaning ? 'checked' : ''} />
      </label>
    </div>
  `;
  document.getElementById('enableNotifsBtn').onclick = ()=>{
    if(!('Notification' in window)) return;
    Notification.requestPermission().then(p=>{
      state.notifications.enabled = (p === 'granted');
      saveState();
      renderNotifications();
    }).catch(()=>{});
  };
  document.getElementById('nHydration').onchange = (e)=>{ state.notifications.hydration = !!e.target.checked; saveState(); };
  document.getElementById('nMeals').onchange = (e)=>{ state.notifications.meals = !!e.target.checked; saveState(); };
  document.getElementById('nCleaning').onchange = (e)=>{ state.notifications.cleaning = !!e.target.checked; saveState(); };
}

// Weather (Open-Meteo + geolocation)
async function updateWeather(){
  weatherChip.textContent = 'Weather: …';
  const fallback = ()=>{ weatherChip.textContent = 'Weather: local'; };
  try{
    if(!navigator.geolocation) return fallback();
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      try{
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
        const res = await fetch(url, { cache:'no-store' });
        if(!res.ok) return fallback();
        const data = await res.json();
        const t = data?.current?.temperature_2m;
        weatherChip.textContent = (typeof t === 'number') ? `Weather: ${t}°` : 'Weather: ok';
      }catch{ fallback(); }
    }, ()=>fallback(), { enableHighAccuracy:false, timeout:5000 });
  }catch{ fallback(); }
}

function bindUI(){
  openPanelBtn.onclick = openPanel;
  headshotBtn.onclick = closePanel;
  overlay.onclick = ()=>{ closePanel(); hygieneMenu.classList.remove('show'); };

  // Tabs
  document.querySelectorAll('.tabs button').forEach(btn=> btn.onclick = ()=>renderTab(btn.dataset.tab));

  // Quick actions
  document.querySelectorAll('.quickbar .qbtn').forEach(btn=>{
    btn.onclick = ()=>{
      const a = btn.dataset.action;
      if(a === 'hygiene'){
        hygieneMenu.classList.toggle('show');
        hygieneMenu.setAttribute('aria-hidden', hygieneMenu.classList.contains('show') ? 'false' : 'true');
        return;
      }
      const n = state.needs;
      if(a==='drink'){ n.quiet = clamp01(n.quiet+2); xp('selfCare',3); xp('nourish',2); playSFX('sounds/ui-drink.mp3'); postToWorld({type:'ACTION', key:'drink'}); }
      if(a==='snack'){ n.hunger = clamp01(n.hunger+6); xp('nourish',4); playSFX('sounds/ui-snack.mp3'); postToWorld({type:'ACTION', key:'snack'}); }
      if(a==='meal'){ n.hunger = clamp01(n.hunger+12); xp('nourish',7); xp('cooking',4); playSFX('sounds/ui-meal.mp3'); postToWorld({type:'ACTION', key:'meal'}); }
      if(a==='homeschool'){ n.quiet = clamp01(n.quiet-1); n.social = clamp01(n.social+1); xp('mind',6); playSFX('sounds/ui-study.mp3'); postToWorld({type:'ACTION', key:'homeschool'}); }
      if(a==='entertain'){ n.fun = clamp01(n.fun+8); xp('story',4); playSFX('sounds/ui-fun.mp3'); postToWorld({type:'ACTION', key:'entertain'}); }
      if(a==='clean'){ n.hygiene = clamp01(n.hygiene+2); xp('cleaning',8); xp('homestead',4); playSFX('sounds/ui-clean.mp3'); postToWorld({type:'ACTION', key:'clean'}); }
      if(a==='exercise'){ n.energy = clamp01(n.energy-4); n.fun = clamp01(n.fun+2); xp('selfCare',6); playSFX('sounds/ui-exercise.mp3'); postToWorld({type:'ACTION', key:'exercise'}); }
      moodFromNeeds(); saveState();
    };
  });

  // Hygiene submenu
  hygieneMenu.querySelectorAll('button').forEach(btn=>{
    btn.onclick = ()=>{
      const h = btn.dataset.hyg;
      const n = state.needs;
      if(h==='toilet'){ n.hygiene = clamp01(n.hygiene+6); xp('selfCare',4); playSFX('sounds/ui-toilet.mp3'); postToWorld({type:'ACTION', key:'toilet'}); }
      if(h==='shower'){ n.hygiene = clamp01(n.hygiene+12); xp('selfCare',8); playSFX('sounds/ui-shower.mp3'); postToWorld({type:'ACTION', key:'shower'}); }
      if(h==='teeth'){ n.hygiene = clamp01(n.hygiene+5); xp('selfCare',3); playSFX('sounds/ui-teeth.mp3'); postToWorld({type:'ACTION', key:'teeth'}); }
      if(h==='hair'){ xp('selfCare',6); playSFX('sounds/ui-hair.mp3'); postToWorld({type:'ACTION', key:'hair'}); }
      if(h==='skin'){ xp('selfCare',6); playSFX('sounds/ui-skin.mp3'); postToWorld({type:'ACTION', key:'skin'}); }
      moodFromNeeds(); saveState();
      hygieneMenu.classList.remove('show');
    };
  });

  document.addEventListener('click', (e)=>{
    if(!hygieneMenu.classList.contains('show')) return;
    const within = hygieneMenu.contains(e.target) || e.target.closest('[data-action="hygiene"]');
    if(!within) hygieneMenu.classList.remove('show');
  });

  // Action menu
  actionMenu.addEventListener('click', (e)=>{
    const b = e.target.closest('button');
    if(!b) return;
    const act = b.dataset.act;
    if(act==='close'){ hideActionMenu(); return; }
    if(selectedType==null || selectedIndex==null) return;

    if(act==='delete'){
      if(selectedType==='recipes') state.recipes.splice(selectedIndex,1);
      if(selectedType==='haircare') state.haircare.splice(selectedIndex,1);
      saveState(); hideActionMenu();
      if(selectedType==='recipes') renderRecipes('');
      if(selectedType==='haircare') renderHaircare();
      return;
    }
    if(act==='edit'){
      if(selectedType==='recipes'){
        const r = state.recipes[selectedIndex];
        const name = prompt('Recipe name', r.name||'') ?? r.name;
        const cat = prompt('Category', r.category||'') ?? r.category;
        const notes = prompt('Notes', r.notes||'') ?? r.notes;
        state.recipes[selectedIndex] = { ...r, name, category:(cat||'').toLowerCase(), notes };
        saveState(); hideActionMenu(); renderRecipes('');
        return;
      }
      if(selectedType==='haircare'){
        const h = state.haircare[selectedIndex];
        const name = prompt('Routine name', h.name||'') ?? h.name;
        const tag = prompt('Tag', h.tag||'') ?? h.tag;
        const notes = prompt('Notes', h.notes||'') ?? h.notes;
        state.haircare[selectedIndex] = { ...h, name, tag:(tag||'').toLowerCase(), notes };
        saveState(); hideActionMenu(); renderHaircare();
      }
    }
  });

  // Audio buttons
  musicToggleBtn.onclick = toggleMusic;
  musicSkipBtn.onclick = skipMusic;

  // World → HUD events
  window.addEventListener('message', (ev)=>{
    const msg = ev.data || {};
    if(msg.type==='INTERACT'){
      openPanel();
      if(msg.action==='BED') renderTab('timers');
      if(msg.action==='SINK') renderTab('needs');
      if(msg.action==='STOVE') renderTab('recipes');
    }
  });

  // Boot
  catchUpFromLastActive();
  moodFromNeeds();
  renderTab('emotions');
  updateWeather();
}

// PWA install prompt
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', ()=>{
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  installBtn.hidden = true;
});
