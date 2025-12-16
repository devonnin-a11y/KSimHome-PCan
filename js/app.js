document.addEventListener('DOMContentLoaded', ()=>{
  bindUI();

  const safeNotify = (title, body)=>{
    try{
      if(!state.notifications.enabled) return;
      if(!('Notification' in window)) return;
      if(Notification.permission !== 'granted') return;
      new Notification(title, { body, silent:true });
    }catch{}
  };

  // Needs decay while open (per minute)
  setInterval(()=>{
    for(const k in state.needs){
      state.needs[k] = Math.max(0, state.needs[k] - 1);
    }
    moodFromNeeds();
    saveState();
  }, 60000);

  // Gentle nudges while open (best-effort; not background push)
  setInterval(()=>{ if(state.notifications.hydration) safeNotify('Hydration Check','Time for a sip 💧'); }, 60*60*1000);
  setInterval(()=>{ if(state.notifications.meals) safeNotify('Food Check','A small snack or meal helps 🍽'); }, 3*60*60*1000);
  setInterval(()=>{ if(state.notifications.cleaning) safeNotify('Tiny Tidy','One small clean counts 🧹'); }, 24*60*60*1000);
});