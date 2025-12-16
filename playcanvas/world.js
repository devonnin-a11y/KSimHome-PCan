(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function resize(){
    canvas.width = Math.floor(innerWidth * DPR);
    canvas.height = Math.floor(innerHeight * DPR);
  }
  addEventListener('resize', resize);
  resize();

  const world = {
    mood: 'good',
    lastXP: null,
    objects: [
      { id:'BED', x:0.25, y:0.70, w:0.22, h:0.10, label:'Bed' },
      { id:'SINK', x:0.72, y:0.68, w:0.16, h:0.10, label:'Sink' },
      { id:'STOVE', x:0.74, y:0.53, w:0.18, h:0.12, label:'Stove' },
    ],
    kelly: { x:0.50, y:0.72 }
  };

  function sky(){
    if(world.mood === 'low') return ['#ffd6e0','#bde0fe'];
    if(world.mood === 'neutral') return ['#fff3b0','#caffbf'];
    return ['#bde0fe','#caffbf'];
  }

  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function draw(){
    const w = canvas.width, h = canvas.height;
    const [a,b] = sky();
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,a); g.addColorStop(1,b);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    // floor
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(0, h*0.55, w, h*0.45);

    // vignette
    const vg = ctx.createRadialGradient(w/2,h*0.6, w*0.1, w/2,h*0.6, w*0.7);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(1,'rgba(0,0,0,0.18)');
    ctx.fillStyle = vg;
    ctx.fillRect(0,0,w,h);

    // objects
    world.objects.forEach(o=>{
      const x=o.x*w, y=o.y*h, ow=o.w*w, oh=o.h*h;
      ctx.fillStyle='rgba(255,255,255,0.88)';
      roundRect(x-ow/2,y-oh/2,ow,oh,16*DPR);
      ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.08)';
      ctx.lineWidth=2*DPR;
      ctx.stroke();

      ctx.fillStyle='rgba(27,67,50,0.82)';
      ctx.font=`${14*DPR}px system-ui`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(o.label, x, y);
    });

    // kelly
    const kx=world.kelly.x*w, ky=world.kelly.y*h;
    ctx.fillStyle='rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(kx, ky+26*DPR, 40*DPR, 12*DPR, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(kx, ky, 28*DPR, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(27,67,50,0.85)';
    ctx.font=`${12*DPR}px system-ui`;
    ctx.fillText('Kelly', kx, ky+50*DPR);

    // XP sparkle
    if(world.lastXP && (performance.now()-world.lastXP.t < 1200)){
      const dt = (performance.now()-world.lastXP.t)/1200;
      ctx.globalAlpha = 1-dt;
      ctx.fillStyle='rgba(255,255,255,0.95)';
      ctx.font=`${16*DPR}px system-ui`;
      ctx.fillText(`+${world.lastXP.amount} ${world.lastXP.skill}`, kx, ky - 60*DPR - dt*30*DPR);
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(draw);
  }

  canvas.addEventListener('pointerdown', (e)=>{
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX-rect.left)/rect.width;
    const py = (e.clientY-rect.top)/rect.height;
    const hit = world.objects.find(o =>
      px > (o.x-o.w/2) && px < (o.x+o.w/2) &&
      py > (o.y-o.h/2) && py < (o.y+o.h/2)
    );
    if(hit) window.parent.postMessage({ type:'INTERACT', action: hit.id }, '*');
  }, {passive:true});

  window.addEventListener('message', (ev)=>{
    const msg = ev.data || {};
    if(msg.type==='EMOTION'){
      const low = ['sad','upset','uncomfortable','scared'];
      const neutral = ['focused','fine','embarrassed'];
      world.mood = low.includes(msg.key) ? 'low' : (neutral.includes(msg.key) ? 'neutral' : 'good');
    }
    if(msg.type==='XP'){
      world.lastXP = { t: performance.now(), skill: msg.skill, amount: msg.amount };
    }
    if(msg.type==='ACTION'){
      world.lastXP = { t: performance.now(), skill: msg.key, amount: 1 };
    }
    if(msg.type==='TIMER_DONE'){
      world.lastXP = { t: performance.now(), skill: msg.key, amount: 10 };
    }
  });

  requestAnimationFrame(draw);
})();