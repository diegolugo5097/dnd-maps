// Audio engine — loads {type}-spell.mp3 from /sounds/ folder
// Falls back to Web Audio API synthesis if the file fails to load

const cache = {};   // powerId → HTMLAudioElement (or null if failed)
const SOUND_IDS = ["fire", "fire_wall", "ice", "lightning", "poison",
                   "earth", "holy", "darkness", "water", "wind", "acid", "necrotic", "thorns"];

// Map power id → mp3 filename base
// fire_wall reuses fire-spell.mp3, acid reuses poison-spell.mp3, etc.
const SOUND_FILE = {
  fire:      "fire",
  fire_wall: "fire",
  ice:       "ice",
  lightning: "lightning",
  poison:    "poison",
  earth:     "earth",
  holy:      "holy",
  darkness:  "darkness",
  water:     "water",
  wind:      "wind",
  acid:      "acid",
  necrotic:  "necrotic",
  thorns:    "thorns",
};

function loadAudio(powerId) {
  if (powerId in cache) return cache[powerId];
  const base = SOUND_FILE[powerId] ?? powerId;
  const audio = new Audio(`/sounds/${base}-spell.mp3`);
  audio.preload = "auto";
  audio.volume  = 0.7;
  // Mark as null on error so we fall back to synthesis
  audio.onerror = () => { cache[powerId] = null; };
  cache[powerId] = audio;
  return audio;
}

// Preload all sounds on startup
export function preloadSounds() {
  SOUND_IDS.forEach(id => loadAudio(id));
}

// ── Web Audio synthesis fallback ──────────────────────────────────────────────

let actx = null;
function getACtx() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === "suspended") actx.resume();
  return actx;
}

const SYNTH = {
  fire() {
    const ac = getACtx(), out = ac.createGain(); out.gain.value = 0.35; out.connect(ac.destination);
    const buf = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length,0.5);
    const src = ac.createBufferSource(); src.buffer = buf;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.5;
    const osc = ac.createOscillator(); osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 1.2);
    const og = ac.createGain(); og.gain.setValueAtTime(0.25, ac.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.2);
    src.connect(bp); bp.connect(out); osc.connect(og); og.connect(out);
    src.start(); src.stop(ac.currentTime+1.2); osc.start(); osc.stop(ac.currentTime+1.2);
  },
  ice() {
    const ac = getACtx(), out = ac.createGain(); out.gain.value = 0.3; out.connect(ac.destination);
    [880,1320,1760,2200].forEach((f,i)=>{
      const o=ac.createOscillator(),g=ac.createGain(); o.type="sine"; o.frequency.value=f+Math.random()*30;
      g.gain.setValueAtTime(0,ac.currentTime); g.gain.linearRampToValueAtTime(0.12,ac.currentTime+0.05+i*0.04);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.8+i*0.1);
      o.connect(g);g.connect(out); o.start(ac.currentTime+i*0.04); o.stop(ac.currentTime+1.2);
    });
  },
  lightning() {
    const ac = getACtx(), out = ac.createGain(); out.gain.value = 0.55; out.connect(ac.destination);
    const buf=ac.createBuffer(1,ac.sampleRate*0.25,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
    const n=ac.createBufferSource(); n.buffer=buf; n.connect(out); n.start();
    const o=ac.createOscillator(),g=ac.createGain(); o.type="sawtooth";
    o.frequency.setValueAtTime(60,ac.currentTime+0.1);
    o.frequency.exponentialRampToValueAtTime(20,ac.currentTime+1.2);
    g.gain.setValueAtTime(0.45,ac.currentTime+0.1); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+1.2);
    o.connect(g);g.connect(out); o.start(ac.currentTime+0.1); o.stop(ac.currentTime+1.2);
  },
  poison() {
    const ac = getACtx(), out = ac.createGain(); out.gain.value = 0.28; out.connect(ac.destination);
    const buf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*0.5*Math.sin(i*0.003);
    const n=ac.createBufferSource(); n.buffer=buf;
    const bp=ac.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=600; bp.Q.value=2;
    const g=ac.createGain(); g.gain.setValueAtTime(0.6,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+1);
    n.connect(bp);bp.connect(g);g.connect(out); n.start();
  },
  earth() {
    const ac = getACtx(), out = ac.createGain(); out.gain.value = 0.5; out.connect(ac.destination);
    const o=ac.createOscillator(),g=ac.createGain(); o.type="sawtooth";
    o.frequency.setValueAtTime(55,ac.currentTime); o.frequency.exponentialRampToValueAtTime(25,ac.currentTime+0.8);
    g.gain.setValueAtTime(0.6,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.8);
    o.connect(g);g.connect(out); o.start(); o.stop(ac.currentTime+0.8);
  },
  holy() {
    const ac = getACtx(), out = ac.createGain(); out.gain.value = 0.3; out.connect(ac.destination);
    [523,659,784,1047].forEach((f,i)=>{
      const o=ac.createOscillator(),g=ac.createGain(); o.type="sine"; o.frequency.value=f;
      g.gain.setValueAtTime(0,ac.currentTime); g.gain.linearRampToValueAtTime(0.1,ac.currentTime+0.1);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+1.5);
      o.connect(g);g.connect(out); o.start(ac.currentTime+i*0.03); o.stop(ac.currentTime+1.5);
    });
  },
  darkness() {
    const ac = getACtx(), out = ac.createGain(); out.gain.value = 0.38; out.connect(ac.destination);
    [40,60].forEach(f=>{
      const o=ac.createOscillator(),g=ac.createGain(); o.type="sawtooth"; o.frequency.value=f;
      g.gain.setValueAtTime(0,ac.currentTime); g.gain.linearRampToValueAtTime(0.15,ac.currentTime+0.2);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+1.2);
      o.connect(g);g.connect(out); o.start(); o.stop(ac.currentTime+1.2);
    });
  },
  water() {
    const ac = getACtx(), out = ac.createGain(); out.gain.value = 0.3; out.connect(ac.destination);
    const buf=ac.createBuffer(1,ac.sampleRate*1.2,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(0.5+0.5*Math.sin(i*0.001));
    const n=ac.createBufferSource(); n.buffer=buf;
    [400,800,1600].forEach(f=>{
      const bp=ac.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=f; bp.Q.value=1.5;
      const g=ac.createGain(); g.gain.value=0.22; n.connect(bp);bp.connect(g);g.connect(out);
    });
    n.start();
  },
  wind() {
    const ac = getACtx(), out = ac.createGain(); out.gain.value = 0.28; out.connect(ac.destination);
    const buf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const n=ac.createBufferSource(); n.buffer=buf;
    const lp=ac.createBiquadFilter(); lp.type="lowpass";
    lp.frequency.setValueAtTime(200,ac.currentTime);
    lp.frequency.linearRampToValueAtTime(1800,ac.currentTime+0.3);
    lp.frequency.linearRampToValueAtTime(300,ac.currentTime+1.0);
    const g=ac.createGain(); g.gain.setValueAtTime(0,ac.currentTime);
    g.gain.linearRampToValueAtTime(0.5,ac.currentTime+0.2);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+1.0);
    n.connect(lp);lp.connect(g);g.connect(out); n.start();
  },
};
SYNTH.fire_wall = SYNTH.fire;
SYNTH.acid      = SYNTH.poison;
SYNTH.necrotic  = SYNTH.darkness;
SYNTH.thorns = function() {
  const ac = getACtx(), out = ac.createGain(); out.gain.value = 0.38; out.connect(ac.destination);
  // Rustling noise
  const buf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.sin(i*0.008);
  const n  = ac.createBufferSource(); n.buffer = buf;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 1.5;
  const g  = ac.createGain(); g.gain.setValueAtTime(0.5, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+0.6);
  n.connect(bp); bp.connect(g); g.connect(out); n.start();
  // Sharp impact
  [180, 260].forEach((freq, i) => {
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq;
    og.gain.setValueAtTime(0.3, ac.currentTime + i*0.04);
    og.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25 + i*0.04);
    o.connect(og); og.connect(out);
    o.start(ac.currentTime + i*0.04); o.stop(ac.currentTime + 0.3 + i*0.04);
  });
};

// ── Public API ────────────────────────────────────────────────────────────────

export function playSound(powerId) {
  const audio = loadAudio(powerId);

  if (audio) {
    // Clone so overlapping calls work
    try {
      const clone = audio.cloneNode();
      clone.volume = 0.7;
      clone.play().catch(() => {
        // File not found or blocked — use synth
        playSynth(powerId);
      });
    } catch {
      playSynth(powerId);
    }
  } else {
    playSynth(powerId);
  }
}

function playSynth(powerId) {
  try {
    const fn = SYNTH[powerId] ?? SYNTH[SOUND_FILE[powerId]];
    if (fn) fn();
  } catch (e) {
    console.warn("Audio synth error:", e);
  }
}
