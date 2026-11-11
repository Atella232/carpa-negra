// Música de organillo (vals en menor) generada en tiempo real.
import { audio, musicOut } from './sfx';

type Song = { bpm: number; melody: (string | null)[]; bass: string[]; wave: OscillatorType };

// Cada elemento es un tiempo (negra) del compás de 3/4.
const SONGS: Record<'carpa' | 'jefe' | 'menu' | 'jaulas', Song> = {
  jaulas: {
    bpm: 116,
    wave: 'square',
    melody: [
      'D5', null, 'F5', 'E5', 'D5', 'C#5', 'D5', null, 'A4', null, null, null,
      'D5', null, 'F5', 'G5', 'A5', 'G5', 'F5', 'E5', 'D5', 'E5', null, null,
      'A#4', 'D5', 'F5', 'A5', 'G5', 'F5', 'E5', 'G5', 'C#5', 'D5', null, null,
      'F5', 'E5', 'D5', 'C#5', 'A4', 'C#5', 'D5', null, 'D4', null, null, null,
    ],
    bass: ['D2', 'A2', 'D2', 'A2', 'A#2', 'F2', 'A2', 'D2', 'G2', 'D2', 'A2', 'D2', 'D2', 'A2', 'A2', 'D2'],
  },
  carpa: {
    bpm: 132,
    wave: 'triangle',
    melody: [
      'E5', null, 'A5', 'C6', 'B5', 'A5', 'G#5', null, 'E5', 'A5', null, null,
      'E5', null, 'A5', 'C6', 'B5', 'A5', 'B5', 'C6', 'D6', 'E6', null, null,
      'F6', 'E6', 'D6', 'E6', 'D6', 'C6', 'D6', 'C6', 'B5', 'C6', 'A5', null,
      'G#5', 'A5', 'B5', 'E5', 'F5', 'G#5', 'A5', null, 'E5', 'A4', null, null,
    ],
    bass: ['A2', 'E2', 'D2', 'E2', 'A2', 'E2', 'G2', 'C2', 'F2', 'C2', 'E2', 'A2', 'D2', 'E2', 'E2', 'A2'],
  },
  jefe: {
    bpm: 168,
    wave: 'sawtooth',
    melody: [
      'A4', 'C5', 'E5', 'D#5', 'E5', null, 'A4', 'C5', 'E5', 'F5', 'E5', null,
      'D5', 'F5', 'A5', 'G#5', 'A5', null, 'G#5', 'F5', 'E5', 'D5', 'C5', 'B4',
      'A4', 'C5', 'E5', 'D#5', 'E5', null, 'A5', 'G5', 'F5', 'E5', 'D5', 'C5',
      'B4', 'D5', 'G#5', 'B4', 'C5', 'E5', 'A4', null, 'A4', 'A4', null, null,
    ],
    bass: ['A2', 'A2', 'D2', 'E2', 'A2', 'F2', 'E2', 'A2', 'A2', 'A2', 'D2', 'E2', 'A2', 'F2', 'E2', 'E2'],
  },
  menu: {
    bpm: 96,
    wave: 'sine',
    melody: [
      'A4', null, 'E5', null, 'D5', 'C5', 'B4', null, 'G#4', null, null, null,
      'A4', null, 'C5', null, 'E5', 'F5', 'E5', null, null, null, null, null,
    ],
    bass: ['A2', 'E2', 'A2', 'E2', 'A2', 'E2', 'A2', 'E2'],
  },
};

const NOTE: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function freq(n: string): number {
  const m = n.match(/^([A-G]#?)(\d)$/)!;
  const midi = 12 * (+m[2] + 1) + NOTE[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

let current: keyof typeof SONGS | null = null;
let timer: number | null = null;
let beat = 0;
let nextTime = 0;

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

function schedule(): void {
  const c = audio();
  const out = musicOut();
  if (!c || !out || !current || c.state !== 'running') return;
  const song = SONGS[current];
  const spb = 60 / song.bpm;
  while (nextTime < c.currentTime + 0.25) {
    const m = song.melody[beat % song.melody.length];
    if (m) {
      voice(freq(m), nextTime, spb * 0.9, song.wave, 0.12, out);
      voice(freq(m) * 2, nextTime, spb * 0.5, 'square', 0.02, out);
    }
    // Bajo de vals: UM-pa-pa
    const bar = Math.floor(beat / 3);
    const root = song.bass[bar % song.bass.length];
    const pos = beat % 3;
    if (pos === 0) voice(freq(root), nextTime, spb * 0.8, 'triangle', 0.16, out);
    else {
      const f = freq(root) * (pos === 1 ? 3 : 2.5) ;
      voice(f, nextTime, spb * 0.3, 'square', 0.025, out);
    }
    beat++;
    nextTime += spb;
  }
}

export function playMusic(name: keyof typeof SONGS | null): void {
  if (current === name) return;
  current = name;
  beat = 0;
  const c = audio();
  nextTime = c ? c.currentTime + 0.1 : 0;
  if (timer === null) timer = window.setInterval(schedule, 80);
}
