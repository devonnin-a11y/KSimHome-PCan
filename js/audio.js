// Single clean audio system (music + sfx). Missing files fail silently.
const TRACKS = ['sounds/bg-1.mp3','sounds/bg-2.mp3','sounds/bg-3.mp3'];

const music = new Audio();
music.preload = 'none';
music.loop = false;

const sfx = new Audio();
sfx.preload = 'auto';

let interacted = false;
let audioCtx = null;

function unlockAudioOnce(){
  if(interacted) return;
  interacted = true;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
    const buffer = audioCtx.createBuffer(1,1,22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(audioCtx.destination);
    src.start(0);
  }catch{}
}

window.addEventListener('pointerdown', unlockAudioOnce, { once:true, passive:true });

function startMusic(){
  if(!state.music.enabled || !interacted) return;
  const src = TRACKS[state.music.index] || '';
  if(!src) return;
  music.src = src;
  music.play().catch(()=>{});
}

function toggleMusic(){
  unlockAudioOnce();
  state.music.enabled = !state.music.enabled;
  saveState();
  if(state.music.enabled) startMusic();
  else music.pause();
}

function skipMusic(){
  unlockAudioOnce();
  state.music.index = (state.music.index + 1) % TRACKS.length;
  saveState();
  if(state.music.enabled) startMusic();
}

music.addEventListener('ended', ()=>{
  state.music.index = (state.music.index + 1) % TRACKS.length;
  saveState();
  startMusic();
});

function playSFX(src){
  unlockAudioOnce();
  if(!src) return;
  try{
    sfx.pause();
    sfx.currentTime = 0;
    sfx.src = src;
    sfx.play().catch(()=>{});
  }catch{}
}
