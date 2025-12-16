const STORAGE_KEY = 'KSimHome_v3';
const SCHEMA_VERSION = 3;

const defaultState = {
  v: SCHEMA_VERSION,
  lastActive: Date.now(),
  needs: { hunger: 80, energy: 80, social: 80, fun: 80, hygiene: 80, quiet: 80 },
  mood: { tier: 'good', main: 'good', sub: 'balanced' },
  music: { enabled: false, index: 0 },
  notifications: { enabled: false, hydration: true, meals: true, cleaning: true },

  skills: {
    overall: 0,
    nourish: 0,
    selfCare: 0,
    homestead: 0,
    mind: 0,
    story: 0,
    cooking: 0,
    baking: 0,
    cleaning: 0
  },

  recipes: [],
  haircare: [],

  timers: { hydration: null, meal: null, snack: null, bathroom: null, shower: null, skincare: null },

  reactions: { CAK: [], YAK: [] },

  calendar: {
    dayKey: '',
    tasks: [],
    pool: [
      'Dishes','Laundry','Bathroom sink','Toilet wipe','Shower rinse','Kitchen counters',
      'Sweep floor','Vacuum','Living room tidy','Bedroom reset','Trash out','Fridge check'
    ]
  }
};

function deepMerge(base, patch){
  if(typeof base !== 'object' || base === null) return patch;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for(const k in patch){
    const pv = patch[k];
    const bv = out[k];
    if(typeof pv === 'object' && pv && !Array.isArray(pv)){
      out[k] = deepMerge((typeof bv === 'object' && bv && !Array.isArray(bv)) ? bv : {}, pv);
    } else {
      out[k] = pv;
    }
  }
  return out;
}

function migrateState(raw){
  let s = deepMerge(defaultState, raw || {});
  s.v = SCHEMA_VERSION;
  s.needs = deepMerge(defaultState.needs, s.needs || {});
  s.mood = deepMerge(defaultState.mood, s.mood || {});
  s.music = deepMerge(defaultState.music, s.music || {});
  s.notifications = deepMerge(defaultState.notifications, s.notifications || {});
  s.skills = deepMerge(defaultState.skills, s.skills || {});
  s.recipes = Array.isArray(s.recipes) ? s.recipes : [];
  s.haircare = Array.isArray(s.haircare) ? s.haircare : [];
  s.reactions = deepMerge(defaultState.reactions, s.reactions || {});
  s.calendar = deepMerge(defaultState.calendar, s.calendar || {});
  for(const key of ['CAK','YAK']){
    if(!Array.isArray(s.reactions[key])) s.reactions[key] = [];
    if(s.reactions[key].length > 500) s.reactions[key] = s.reactions[key].slice(-500);
  }
  return s;
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return migrateState(parsed);
  }catch{
    return migrateState(null);
  }
}

function saveState(){
  try{
    state.lastActive = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch{}
}

let state = loadState();
