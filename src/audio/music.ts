// Música de organillo generada en tiempo real, con capas que reaccionan a la
// partida: en calma solo suenan melodía y bajo; en combate entran el contracanto
// y la percusión. Con poca vida, un filtro ahoga el sonido. Entre temas hay un
// pequeño fundido.
import { audio, musicOut } from './sfx';

interface Song {
  bpm: number;
  /** Tiempos por compás: 3 = vals (UM-pa-pa), 2 = marcha (UM-pa), 4 = cuatro por cuatro. */
  meter: 2 | 3 | 4;
  melody: (string | null)[];
  bass: string[];
  wave: OscillatorType;
  /** Contracanto opcional (si no, la melodía una octava arriba en combate). */
  counter?: (string | null)[];
  /** Redoble en la percusión (marchas de circo). */
  roll?: boolean;
}

const NOTE: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const NAMES = Object.keys(NOTE);
function midi(n: string): number {
  const m = n.match(/^([A-G]#?)(\d)$/)!;
  return 12 * (+m[2] + 1) + NOTE[m[1]];
}
function midiName(m: number): string {
  return `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}
function freq(n: string): number {
  return 440 * Math.pow(2, (midi(n) - 69) / 12);
}

/** Invierte una melodía alrededor de un eje (el espejo también suena). */
function mirror(mel: (string | null)[], axis: number): (string | null)[] {
  return mel.map((n) => (n ? midiName(2 * axis - midi(n)) : null));
}

const ESPEJOS_A: (string | null)[] = [
  'E5', 'G5', 'B5', 'A5', null, 'G5', 'F#5', 'E5', null, 'B4', null, null,
  'C5', 'E5', 'A5', 'G5', null, 'F#5', 'E5', 'D#5', null, 'B4', null, null,
];
const ESPEJOS_B = mirror(ESPEJOS_A, midi('E5'));

const SONGS = {
  jaulas: {
    bpm: 116, meter: 3, wave: 'square',
    melody: [
      'D5', null, 'F5', 'E5', 'D5', 'C#5', 'D5', null, 'A4', null, null, null,
      'D5', null, 'F5', 'G5', 'A5', 'G5', 'F5', 'E5', 'D5', 'E5', null, null,
      'A#4', 'D5', 'F5', 'A5', 'G5', 'F5', 'E5', 'G5', 'C#5', 'D5', null, null,
      'F5', 'E5', 'D5', 'C#5', 'A4', 'C#5', 'D5', null, 'D4', null, null, null,
    ],
    bass: ['D2', 'A2', 'D2', 'A2', 'A#2', 'F2', 'A2', 'D2', 'G2', 'D2', 'A2', 'D2', 'D2', 'A2', 'A2', 'D2'],
  },
  carpa: {
    bpm: 132, meter: 3, wave: 'triangle',
    melody: [
      'E5', null, 'A5', 'C6', 'B5', 'A5', 'G#5', null, 'E5', 'A5', null, null,
      'E5', null, 'A5', 'C6', 'B5', 'A5', 'B5', 'C6', 'D6', 'E6', null, null,
      'F6', 'E6', 'D6', 'E6', 'D6', 'C6', 'D6', 'C6', 'B5', 'C6', 'A5', null,
      'G#5', 'A5', 'B5', 'E5', 'F5', 'G#5', 'A5', null, 'E5', 'A4', null, null,
    ],
    bass: ['A2', 'E2', 'D2', 'E2', 'A2', 'E2', 'G2', 'C2', 'F2', 'C2', 'E2', 'A2', 'D2', 'E2', 'E2', 'A2'],
  },
  jefe: {
    bpm: 168, meter: 3, wave: 'sawtooth',
    melody: [
      'A4', 'C5', 'E5', 'D#5', 'E5', null, 'A4', 'C5', 'E5', 'F5', 'E5', null,
      'D5', 'F5', 'A5', 'G#5', 'A5', null, 'G#5', 'F5', 'E5', 'D5', 'C5', 'B4',
      'A4', 'C5', 'E5', 'D#5', 'E5', null, 'A5', 'G5', 'F5', 'E5', 'D5', 'C5',
      'B4', 'D5', 'G#5', 'B4', 'C5', 'E5', 'A4', null, 'A4', 'A4', null, null,
    ],
    bass: ['A2', 'A2', 'D2', 'E2', 'A2', 'F2', 'E2', 'A2', 'A2', 'A2', 'D2', 'E2', 'A2', 'F2', 'E2', 'E2'],
  },
  menu: {
    bpm: 96, meter: 3, wave: 'sine',
    melody: [
      'A4', null, 'E5', null, 'D5', 'C5', 'B4', null, 'G#4', null, null, null,
      'A4', null, 'C5', null, 'E5', 'F5', 'E5', null, null, null, null, null,
    ],
    bass: ['A2', 'E2', 'A2', 'E2', 'A2', 'E2', 'A2', 'E2'],
  },
  // Acto III: caja de música; la segunda mitad es la primera reflejada.
  espejos: {
    bpm: 108, meter: 3, wave: 'sine',
    melody: [...ESPEJOS_A, ...ESPEJOS_B],
    counter: [...ESPEJOS_B, ...ESPEJOS_A].map((n, i) => (i % 3 === 0 && n ? midiName(midi(n) + 12) : null)),
    bass: ['E2', 'B2', 'A2', 'B2', 'E2', 'B2', 'A2', 'B2', 'E2', 'D#2', 'E2', 'B2', 'C2', 'B2', 'A2', 'B2'],
  },
  jefeEspejos: {
    bpm: 156, meter: 3, wave: 'square',
    melody: [
      'E5', 'B4', 'E5', 'G5', 'F#5', 'E5', 'D#5', 'B4', 'D#5', 'F#5', 'E5', 'D#5',
      'E5', 'B4', 'E5', 'G5', 'A5', 'B5', 'C6', 'B5', 'A5', 'G5', 'F#5', 'D#5',
      'E5', 'G5', 'B5', 'A#5', 'B5', null, 'E5', 'G5', 'B5', 'C6', 'B5', null,
      'A5', 'F#5', 'D#5', 'B4', 'D#5', 'F#5', 'E5', null, 'E4', 'E4', null, null,
    ],
    bass: ['E2', 'B2', 'E2', 'B2', 'C2', 'G2', 'B1', 'B2', 'E2', 'B2', 'A2', 'E2', 'C2', 'A2', 'B2', 'B2'],
  },
  // Acto IV: marcha de circo en 2/4 con redoble.
  pista: {
    bpm: 132, meter: 2, wave: 'square', roll: true,
    melody: [
      'C5', 'E5', 'G5', 'C6', 'B5', 'G5', 'A5', 'F5', 'G5', 'E5', 'C5', null,
      'D5', 'F5', 'A5', 'D6', 'C6', 'A5', 'B5', 'G5', 'C6', null, 'G5', null,
      'C5', 'E5', 'G5', 'C6', 'D6', 'C6', 'B5', 'A5', 'G5', 'F5', 'E5', 'D5',
      'C5', 'G4', 'C5', 'E5', 'D5', 'B4', 'C5', null, 'C4', null, null, null,
    ],
    bass: ['C2', 'G2', 'C2', 'G2', 'F2', 'C2', 'G2', 'G2', 'C2', 'G2', 'D2', 'G2', 'C2', 'G2', 'C2', 'C2', 'F2', 'C2', 'G2', 'G2', 'C2', 'G2', 'C2', 'C2'],
  },
  // El Maestro: vals torcido que gana capas en cada fase (la intensidad la sube el jefe).
  maestro: {
    bpm: 144, meter: 3, wave: 'sawtooth', roll: true,
    melody: [
      'D5', null, 'A4', 'D5', 'F5', 'E5', 'D5', 'C#5', 'D5', 'A4', null, null,
      'D5', null, 'A4', 'D5', 'F5', 'G5', 'A5', 'G5', 'F5', 'E5', null, null,
      'A#5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C#5', 'E5', 'A4', 'C#5', 'E5', 'G5',
      'F5', 'E5', 'D5', 'C#5', 'D5', 'E5', 'D5', null, 'D4', 'D4', null, null,
    ],
    counter: [
      'A5', null, null, 'F5', null, null, 'A5', null, null, 'E5', null, null,
      'A5', null, null, 'D6', null, null, 'C#6', null, null, 'A5', null, null,
      'D6', null, null, 'A#5', null, null, 'A5', null, null, 'G5', null, null,
      'A5', null, null, 'G5', null, null, 'F5', null, null, 'D5', null, null,
    ],
    bass: ['D2', 'A2', 'D2', 'A2', 'A#2', 'F2', 'A2', 'A2', 'D2', 'A2', 'G2', 'D2', 'A#2', 'A2', 'D2', 'D2'],
  },
} satisfies Record<string, Song>;

export type SongName = keyof typeof SONGS;

let current: SongName | null = null;
let timer: number | null = null;
let beat = 0;
let nextTime = 0;
/** 0 = calma, 1 = combate. */
let intensity = 0.5;
let lowHp = false;
let ducked = false;
let songGain: GainNode | null = null;
let filter: BiquadFilterNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function bus(): { out: AudioNode; c: AudioContext } | null {
  const c = audio();
  const out = musicOut();
  if (!c || !out) return null;
  if (!filter) {
    filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 18000;
    filter.connect(out);
  }
  return { out: filter, c };
}

function voice(f: number, t: number, dur: number, type: OscillatorType, vol: number, out: AudioNode): void {
  const c = audio()!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = f;
  // Ligero vibrato de organillo viejo.
  const lfo = c.createOscillator();
  const lg = c.createGain();
  lfo.frequency.value = 5.5;
  lg.gain.value = f * 0.006;
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  lfo.start(t);
  o.stop(t + dur + 0.05);
  lfo.stop(t + dur + 0.05);
}

function hit(t: number, vol: number, freqHz: number, dur: number, out: AudioNode): void {
  const c = audio()!;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate / 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freqHz;
  const g = c.createGain();
  g.gain.setValueAtTime(Math.max(0.0002, vol), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function schedule(): void {
  const b = bus();
  if (!b || !current || !songGain || b.c.state !== 'running') return;
  const { c } = b;
  const out = songGain;
  const song: Song = SONGS[current];
  const spb = 60 / song.bpm;
  const combat = intensity > 0.6;
  while (nextTime < c.currentTime + 0.25) {
    const i = beat % song.melody.length;
    const m = song.melody[i];
    if (m) {
      voice(freq(m), nextTime, spb * 0.9, song.wave, 0.12, out);
      voice(freq(m) * 2, nextTime, spb * 0.5, 'square', 0.02, out);
    }
    // Contracanto: solo en combate.
    if (combat) {
      const cn = song.counter ? song.counter[i % song.counter.length] : beat % 2 === 0 ? m : null;
      if (cn) voice(freq(cn) * (song.counter ? 1 : 2), nextTime, spb * 0.6, 'triangle', 0.04, out);
    }
    const bar = Math.floor(beat / song.meter);
    const root = song.bass[bar % song.bass.length];
    const pos = beat % song.meter;
    if (pos === 0) voice(freq(root), nextTime, spb * 0.8, 'triangle', 0.16, out);
    else voice(freq(root) * (pos === 1 ? 3 : 2.5), nextTime, spb * 0.3, 'square', 0.025, out);
    // Percusión: bombo en el primer tiempo y platillo en los demás (más fuerte en combate).
    if (intensity > 0.3) {
      if (pos === 0) hit(nextTime, 0.12 * intensity, 120, 0.12, out);
      else hit(nextTime, 0.05 * intensity, 6000, 0.05, out);
      if (song.roll && combat && bar % 4 === 3 && pos === song.meter - 1) {
        for (let k = 0; k < 4; k++) hit(nextTime + (k * spb) / 4, 0.06, 1800, 0.05, out);
      }
    }
    beat++;
    nextTime += spb;
  }
}

function applyFilter(): void {
  const b = bus();
  if (!b || !filter) return;
  const target = ducked ? 900 : lowHp ? 1400 : 18000;
  filter.frequency.setTargetAtTime(target, b.c.currentTime, 0.15);
}

export function playMusic(name: SongName | null): void {
  if (current === name) return;
  const b = bus();
  // Fundido: el tema anterior se apaga en unas décimas.
  if (b && songGain) {
    const old = songGain;
    old.gain.setTargetAtTime(0.0001, b.c.currentTime, 0.12);
    window.setTimeout(() => old.disconnect(), 1200);
  }
  songGain = null;
  current = name;
  beat = 0;
  if (b && name) {
    songGain = b.c.createGain();
    songGain.gain.value = 0.0001;
    songGain.gain.setTargetAtTime(1, b.c.currentTime + 0.05, 0.1);
    songGain.connect(b.out);
  }
  nextTime = b ? b.c.currentTime + 0.1 : 0;
  if (timer === null) timer = window.setInterval(schedule, 80);
}

/** 0 = calma (sala limpia), 1 = combate. */
export function setMusicIntensity(v: number): void {
  intensity = Math.max(0, Math.min(1, v));
}

/** Con poca vida, la música se ahoga. */
export function setMusicLowHp(v: boolean): void {
  if (lowHp === v) return;
  lowHp = v;
  applyFilter();
}

/** En pausa, la música baja y se apaga. */
export function setMusicDucked(v: boolean): void {
  if (ducked === v) return;
  ducked = v;
  applyFilter();
}

export function currentSong(): SongName | null {
  return current;
}

/** Utilidades de notas (para tests). */
export const _notes = { midi, midiName, mirror };

// --- Murmullo del público (Acto IV): ruido filtrado cuyo volumen sigue al aplausómetro ---
let crowdSrc: AudioBufferSourceNode | null = null;
let crowdGain: GainNode | null = null;
let crowdFilter: BiquadFilterNode | null = null;

/** 0 = sin público; 1 = la grada entera murmurando. Negativo = abucheo (más grave). */
export function setCrowd(level: number): void {
  const b = bus();
  if (!b) return;
  const { c } = b;
  if (!crowdSrc && level !== 0) {
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      // Ruido "marrón": suena a gente hablando a lo lejos.
      last = (last + (Math.random() * 2 - 1) * 0.08) * 0.98;
      d[i] = last * 3;
    }
    crowdSrc = c.createBufferSource();
    crowdSrc.buffer = buf;
    crowdSrc.loop = true;
    crowdFilter = c.createBiquadFilter();
    crowdFilter.type = 'bandpass';
    crowdFilter.Q.value = 0.7;
    crowdGain = c.createGain();
    crowdGain.gain.value = 0;
    crowdSrc.connect(crowdFilter).connect(crowdGain).connect(b.out);
    crowdSrc.start();
  }
  if (!crowdGain || !crowdFilter) return;
  const v = Math.min(1, Math.abs(level));
  crowdGain.gain.setTargetAtTime(v * 0.18, c.currentTime, 0.4);
  crowdFilter.frequency.setTargetAtTime(level < 0 ? 300 : 500 + v * 500, c.currentTime, 0.4);
}
