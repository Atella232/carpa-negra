// Efectos de sonido sintetizados con WebAudio: no hay archivos de audio.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

const settings = { sfx: 0.6, music: 0.35, muted: false };

export function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.connect(master);
    applyVolumes();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Desbloquea el audio tras la primera interacción del usuario. */
export function unlockAudio(): void {
  const c = audio();
  if (c && c.state === 'suspended') void c.resume();
}

export function musicOut(): GainNode | null {
  audio();
  return musicGain;
}

export function setVolumes(v: Partial<typeof settings>): void {
  Object.assign(settings, v);
  applyVolumes();
}

export function getVolumes(): typeof settings {
  return { ...settings };
}

function applyVolumes(): void {
  if (!master || !sfxGain || !musicGain) return;
  master.gain.value = settings.muted ? 0 : 1;
  sfxGain.gain.value = settings.sfx;
  musicGain.gain.value = settings.music;
}

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  to?: number; // frecuencia final
  delay?: number;
  attack?: number;
}

function tone(freq: number, dur: number, o: ToneOpts = {}): void {
  const c = audio();
  if (!c || !sfxGain || c.state !== 'running') return;
  const t = c.currentTime + (o.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'square';
  osc.frequency.setValueAtTime(freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
  const v = o.vol ?? 0.2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (o.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(sfxGain);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, o: { vol?: number; freq?: number; to?: number; delay?: number; q?: number } = {}): void {
  const c = audio();
  if (!c || !sfxGain || !noiseBuf || c.state !== 'running') return;
  const t = c.currentTime + (o.delay ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.freq ?? 3000, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(o.vol ?? 0.3, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(sfxGain);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const last = new Map<string, number>();

export type SfxName =
  | 'disparo' | 'golpe' | 'muerte' | 'boleto' | 'globo' | 'llave' | 'petardo' | 'explosion'
  | 'puerta' | 'objeto' | 'herido' | 'pisoton' | 'cuchillo' | 'abucheo' | 'aplauso' | 'compra'
  | 'error' | 'cofre' | 'golosina' | 'jefe' | 'latigo' | 'bocina' | 'tarta' | 'canon' | 'rebote'
  | 'ruleta' | 'premio' | 'romper' | 'fuego' | 'abrirCaja' | 'salto' | 'muerteJugador' | 'secreto'
  | 'palomas' | 'contrato'
  // Pulido
  | 'limpia' | 'plata' | 'latido' | 'portazo' | 'aviso' | 'telon' | 'cartel'
  // Acto III
  | 'cristal' | 'espejo' | 'humo' | 'carta' | 'cajaMusica' | 'carcajada' | 'cinta' | 'sable' | 'guadana'
  // Acto IV
  | 'tomate' | 'ovacion' | 'redoble' | 'mecha' | 'canonPista' | 'trapecio' | 'batuta' | 'chistera';

/** Reproduce un efecto (con un pequeño límite para que no se amontonen). */
export function sfx(name: SfxName): void {
  const c = audio();
  if (!c || c.state !== 'running') return;
  const now = c.currentTime;
  const minGap = name === 'disparo' || name === 'golpe' ? 0.04 : 0.02;
  if ((last.get(name) ?? -1) > now - minGap) return;
  last.set(name, now);
  const r = (a: number, b: number) => a + Math.random() * (b - a);
  switch (name) {
    case 'disparo':
      tone(r(520, 600), 0.07, { type: 'triangle', to: 300, vol: 0.12 });
      break;
    case 'golpe':
      tone(r(180, 220), 0.06, { type: 'square', to: 90, vol: 0.12 });
      noise(0.05, { vol: 0.12, freq: 2000 });
      break;
    case 'muerte':
      noise(0.25, { vol: 0.3, freq: r(1000, 1400), to: 200 });
      tone(r(140, 180), 0.2, { type: 'sawtooth', to: 50, vol: 0.12 });
      tone(r(900, 1300), 0.08, { type: 'square', vol: 0.05, delay: 0.05 }); // confeti
      break;
    case 'boleto':
      tone(990, 0.06, { type: 'square', vol: 0.1 });
      tone(1480, 0.12, { type: 'square', vol: 0.1, delay: 0.06 });
      break;
    case 'globo':
      tone(400, 0.18, { type: 'sine', to: 900, vol: 0.2 });
      break;
    case 'llave':
      tone(1200, 0.05, { type: 'triangle', vol: 0.12 });
      tone(1600, 0.08, { type: 'triangle', vol: 0.12, delay: 0.05 });
      break;
    case 'petardo':
      noise(0.12, { vol: 0.15, freq: 6000, to: 3000, q: 4 });
      break;
    case 'explosion':
      noise(0.6, { vol: 0.55, freq: 1800, to: 80 });
      tone(90, 0.4, { type: 'sine', to: 30, vol: 0.4 });
      break;
    case 'puerta':
      noise(0.15, { vol: 0.15, freq: 600, to: 200 });
      tone(140, 0.12, { type: 'triangle', to: 100, vol: 0.12 });
      break;
    case 'objeto':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, { type: 'square', vol: 0.1, delay: i * 0.08 }));
      tone(1047, 0.4, { type: 'triangle', vol: 0.12, delay: 0.32 });
      break;
    case 'herido':
      // ¡Nariz de payaso apretada!
      tone(520, 0.08, { type: 'square', to: 700, vol: 0.18 });
      tone(700, 0.12, { type: 'square', to: 420, vol: 0.18, delay: 0.08 });
      break;
    case 'pisoton':
      noise(0.4, { vol: 0.5, freq: 600, to: 60 });
      tone(70, 0.35, { type: 'sine', to: 35, vol: 0.45 });
      break;
    case 'cuchillo':
      noise(0.08, { vol: 0.15, freq: 8000, to: 2500, q: 6 });
      break;
    case 'abucheo':
      tone(220, 0.5, { type: 'sawtooth', to: 140, vol: 0.06 });
      tone(233, 0.5, { type: 'sawtooth', to: 130, vol: 0.06 });
      break;
    case 'aplauso':
      for (let i = 0; i < 14; i++) noise(0.04, { vol: 0.12, freq: 4000, delay: i * 0.045 + Math.random() * 0.02 });
      break;
    case 'compra':
      tone(660, 0.08, { type: 'square', vol: 0.1 });
      tone(880, 0.08, { type: 'square', vol: 0.1, delay: 0.08 });
      tone(1320, 0.14, { type: 'square', vol: 0.1, delay: 0.16 });
      break;
    case 'error':
      tone(150, 0.15, { type: 'square', vol: 0.12 });
      break;
    case 'cofre':
      noise(0.1, { vol: 0.15, freq: 900 });
      tone(330, 0.1, { type: 'triangle', vol: 0.12, delay: 0.05 });
      tone(660, 0.18, { type: 'triangle', vol: 0.12, delay: 0.12 });
      break;
    case 'golosina':
      tone(300, 0.1, { type: 'sine', to: 600, vol: 0.18 });
      tone(600, 0.15, { type: 'sine', to: 250, vol: 0.12, delay: 0.1 });
      break;
    case 'jefe':
      tone(110, 0.8, { type: 'sawtooth', to: 70, vol: 0.18 });
      tone(116, 0.8, { type: 'sawtooth', to: 66, vol: 0.18 });
      noise(0.6, { vol: 0.2, freq: 400 });
      break;
    case 'latigo':
      noise(0.09, { vol: 0.4, freq: 9000, to: 1500, q: 2 });
      break;
    case 'bocina':
      tone(233, 0.25, { type: 'sawtooth', vol: 0.22 });
      tone(311, 0.25, { type: 'sawtooth', vol: 0.18 });
      tone(233, 0.3, { type: 'sawtooth', vol: 0.22, delay: 0.3 });
      tone(311, 0.3, { type: 'sawtooth', vol: 0.18, delay: 0.3 });
      break;
    case 'tarta':
      noise(0.25, { vol: 0.3, freq: 900, to: 300 });
      break;
    case 'canon':
      noise(0.35, { vol: 0.45, freq: 2500, to: 150 });
      tone(200, 0.3, { type: 'square', to: 60, vol: 0.2 });
      break;
    case 'rebote':
      tone(r(300, 360), 0.05, { type: 'sine', to: 500, vol: 0.08 });
      break;
    case 'ruleta':
      for (let i = 0; i < 10; i++) tone(1400, 0.02, { type: 'square', vol: 0.06, delay: i * (0.05 + i * 0.01) });
      break;
    case 'premio':
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, { type: 'square', vol: 0.1, delay: i * 0.07 }));
      break;
    case 'romper':
      noise(0.15, { vol: 0.25, freq: 2500, to: 400 });
      break;
    case 'fuego':
      noise(0.3, { vol: 0.15, freq: 1500, to: 500 });
      break;
    case 'abrirCaja':
      tone(300, 0.05, { type: 'square', vol: 0.12 });
      tone(900, 0.25, { type: 'triangle', to: 1400, vol: 0.12, delay: 0.04 });
      break;
    case 'salto':
      tone(200, 0.12, { type: 'triangle', to: 500, vol: 0.1 });
      break;
    case 'muerteJugador':
      [392, 370, 349, 330].forEach((f, i) => tone(f, 0.35, { type: 'sawtooth', vol: 0.12, delay: i * 0.3 }));
      tone(160, 0.9, { type: 'sawtooth', to: 80, vol: 0.12, delay: 1.2 });
      break;
    case 'secreto':
      [523, 784, 659, 1047].forEach((f, i) => tone(f, 0.2, { type: 'triangle', vol: 0.12, delay: i * 0.1 }));
      break;
    case 'palomas':
      for (let i = 0; i < 6; i++) noise(0.05, { vol: 0.1, freq: 3000, delay: i * 0.06 });
      break;
    case 'contrato':
      tone(110, 1.2, { type: 'sine', vol: 0.3 });
      tone(165, 1.2, { type: 'sine', vol: 0.15 });
      tone(233, 1.2, { type: 'sine', vol: 0.12 });
      break;
    case 'limpia':
      // Pequeña fanfarria de organillo: sala superada.
      [659, 784, 988].forEach((f, i) => tone(f, 0.1, { type: 'triangle', vol: 0.12, delay: i * 0.06 }));
      tone(1319, 0.3, { type: 'triangle', vol: 0.1, delay: 0.18 });
      noise(0.2, { vol: 0.08, freq: 500, to: 200, delay: 0.05 });
      break;
    case 'plata':
      tone(1500, 0.08, { type: 'sine', to: 900, vol: 0.15 });
      noise(0.1, { vol: 0.1, freq: 7000, to: 3000 });
      break;
    case 'latido':
      tone(60, 0.12, { type: 'sine', to: 40, vol: 0.35 });
      tone(55, 0.1, { type: 'sine', to: 38, vol: 0.25, delay: 0.16 });
      break;
    case 'portazo':
      noise(0.18, { vol: 0.35, freq: 900, to: 120 });
      tone(90, 0.15, { type: 'square', to: 50, vol: 0.15 });
      break;
    case 'aviso':
      tone(r(880, 940), 0.05, { type: 'square', vol: 0.05 });
      break;
    case 'telon':
      noise(0.9, { vol: 0.18, freq: 700, to: 300 });
      break;
    case 'cartel':
      [392, 523, 659, 784].forEach((f, i) => tone(f, 0.12, { type: 'square', vol: 0.09, delay: i * 0.07 }));
      tone(1047, 0.5, { type: 'triangle', vol: 0.12, delay: 0.28 });
      break;
    case 'cristal':
      [2600, 3100, 2200, 3500].forEach((f, i) => tone(f * r(0.95, 1.05), 0.12, { type: 'triangle', vol: 0.06, delay: i * 0.025 }));
      noise(0.2, { vol: 0.2, freq: 9000, to: 4000, q: 3 });
      break;
    case 'espejo':
      tone(r(1800, 2100), 0.06, { type: 'sine', to: 2600, vol: 0.06 });
      break;
    case 'humo':
      noise(0.3, { vol: 0.18, freq: 2500, to: 600 });
      break;
    case 'carta':
      noise(0.06, { vol: 0.12, freq: 6000, to: 4000, q: 5 });
      tone(700, 0.05, { type: 'triangle', vol: 0.06, delay: 0.04 });
      break;
    case 'cajaMusica':
      [1319, 1568, 1976, 1568].forEach((f, i) => tone(f, 0.2, { type: 'sine', vol: 0.06, delay: i * 0.12 }));
      break;
    case 'carcajada':
      for (let i = 0; i < 4; i++) tone(r(300, 340) - i * 20, 0.09, { type: 'sawtooth', vol: 0.07, delay: i * 0.11 });
      break;
    case 'cinta':
      noise(0.08, { vol: 0.05, freq: 800 });
      break;
    case 'sable':
      noise(0.12, { vol: 0.25, freq: 9000, to: 2000, q: 4 });
      tone(1800, 0.1, { type: 'triangle', to: 900, vol: 0.05 });
      break;
    case 'guadana':
      noise(0.5, { vol: 0.35, freq: 6000, to: 400, q: 2 });
      tone(200, 0.4, { type: 'sawtooth', to: 60, vol: 0.12 });
      break;
    case 'tomate':
      noise(0.14, { vol: 0.3, freq: 1200, to: 300 });
      tone(160, 0.08, { type: 'sine', to: 80, vol: 0.2 });
      break;
    case 'ovacion':
      for (let i = 0; i < 26; i++) noise(0.05, { vol: 0.1, freq: 3500 + Math.random() * 1500, delay: i * 0.035 + Math.random() * 0.03 });
      tone(440, 0.6, { type: 'sawtooth', to: 520, vol: 0.03 });
      break;
    case 'redoble':
      for (let i = 0; i < 16; i++) noise(0.04, { vol: 0.08 + i * 0.01, freq: 1800, delay: i * 0.045 });
      noise(0.25, { vol: 0.35, freq: 3000, to: 800, delay: 0.75 });
      break;
    case 'mecha':
      noise(0.5, { vol: 0.12, freq: 7000, to: 5000, q: 6 });
      break;
    case 'canonPista':
      noise(0.5, { vol: 0.5, freq: 2200, to: 100 });
      tone(120, 0.4, { type: 'square', to: 45, vol: 0.25 });
      break;
    case 'trapecio':
      tone(300, 0.25, { type: 'sine', to: 220, vol: 0.06 });
      break;
    case 'batuta':
      tone(1760, 0.04, { type: 'square', vol: 0.08 });
      tone(1760, 0.04, { type: 'square', vol: 0.08, delay: 0.09 });
      break;
    case 'chistera':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, { type: 'sine', vol: 0.1, delay: i * 0.1 }));
      break;
  }
}
