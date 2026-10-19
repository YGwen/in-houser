// Music tracks for the reveal, all in the same 16-bit fighting-game style and played by music.ts with
// the same instruments (FM slap bass, detuned-saw lead, string pads, drum kit, SNES-style echo).
// A track is just data: 16th-note steps, 16 per bar; every melody bar must add up to 16 steps.

export interface Track {
  id: string;
  name: string;
  description: string;
  bpm: number;
  /** One chord per bar, repeated if shorter than the melody. root = low bass note (MIDI), pad = chord tones. */
  chords: { root: number; pad: number[] }[];
  /** Lead melody per bar: [MIDI note, length in 16th steps]. */
  melody: [number, number][][];
  /** Bass hits in each bar: [step, semitones above the chord root]. */
  bass: [number, number][];
  kick: number[];
  snare: number[];
  /** Closed hi-hat every N steps (1 = 16ths, 2 = 8ths), and an optional open hat step. */
  hatEvery: 1 | 2;
  openHat?: number;
}

export const TRACKS: Track[] = [
  {
    id: 'arena',
    name: 'Arena',
    description: 'A minor, 150 BPM — the classic fighting-game theme (current)',
    bpm: 150,
    chords: [
      { root: 33, pad: [57, 60, 64] }, // Am
      { root: 29, pad: [53, 57, 60] }, // F
      { root: 31, pad: [55, 59, 62] }, // G
      { root: 28, pad: [52, 56, 59] }, // E (major: tension back to Am)
    ],
    melody: [
      [[69, 4], [72, 2], [76, 2], [74, 2], [72, 2], [71, 2], [72, 2]],
      [[69, 6], [65, 2], [69, 2], [72, 4], [69, 2]],
      [[71, 4], [74, 4], [79, 4], [77, 2], [74, 2]],
      [[76, 6], [68, 2], [71, 2], [74, 2], [76, 4]],
      [[81, 4], [79, 2], [76, 2], [81, 4], [83, 2], [84, 2]],
      [[84, 4], [81, 2], [77, 2], [81, 4], [79, 2], [77, 2]],
      [[79, 4], [74, 2], [71, 2], [74, 2], [79, 2], [77, 2], [74, 2]],
      [[76, 8], [80, 4], [83, 4]],
    ],
    bass: [[0, 0], [2, 0], [3, 12], [4, 0], [6, 0], [8, 0], [10, 12], [11, 0], [12, 0], [14, 7]],
    kick: [0, 6, 8, 11],
    snare: [4, 12],
    hatEvery: 2,
    openHat: 14,
  },
  {
    id: 'rival',
    name: 'Rival',
    description: 'D minor, 165 BPM — faster and driving, "here comes a new challenger"',
    bpm: 165,
    chords: [
      { root: 26, pad: [62, 65, 69] }, // Dm
      { root: 22, pad: [58, 62, 65] }, // Bb
      { root: 24, pad: [60, 64, 67] }, // C
      { root: 21, pad: [57, 61, 64] }, // A (major)
    ],
    melody: [
      [[74, 2], [72, 2], [74, 4], [69, 2], [70, 2], [72, 4]],
      [[74, 2], [77, 2], [74, 4], [72, 2], [70, 2], [69, 4]],
      [[72, 4], [76, 4], [79, 4], [77, 2], [76, 2]],
      [[76, 6], [73, 2], [76, 2], [79, 2], [81, 4]],
      [[81, 4], [77, 2], [74, 2], [81, 4], [79, 2], [77, 2]],
      [[77, 4], [74, 2], [70, 2], [74, 4], [77, 2], [79, 2]],
      [[79, 4], [76, 2], [72, 2], [76, 2], [79, 2], [84, 4]],
      [[81, 8], [76, 4], [73, 4]],
    ],
    bass: [[0, 0], [2, 0], [4, 12], [6, 0], [8, 0], [10, 12], [12, 0], [14, 7]],
    kick: [0, 4, 8, 10, 12],
    snare: [4, 12],
    hatEvery: 1,
    openHat: 14,
  },
  {
    id: 'dojo',
    name: 'Dojo',
    description: 'A minor pentatonic, 140 BPM — eastern melody, half-time groove, a martial arts stage',
    bpm: 140,
    chords: [
      { root: 33, pad: [57, 60, 64] }, // Am
      { root: 31, pad: [55, 59, 62] }, // G
      { root: 29, pad: [53, 57, 60] }, // F
      { root: 28, pad: [52, 56, 59] }, // E
    ],
    melody: [
      [[69, 4], [72, 2], [74, 2], [76, 6], [74, 2]],
      [[72, 4], [74, 2], [72, 2], [67, 8]],
      [[69, 2], [72, 2], [74, 4], [76, 2], [79, 2], [76, 4]],
      [[74, 8], [71, 4], [68, 4]],
      [[81, 4], [79, 2], [76, 2], [79, 4], [76, 2], [74, 2]],
      [[76, 4], [74, 2], [72, 2], [74, 8]],
      [[72, 2], [74, 2], [76, 4], [79, 2], [76, 2], [74, 4]],
      [[76, 12], [71, 4]],
    ],
    bass: [[0, 0], [3, 12], [6, 0], [8, 7], [11, 12], [14, 0]],
    kick: [0, 6, 8],
    snare: [12],
    hatEvery: 2,
    openHat: 10,
  },
  {
    id: 'boss',
    name: 'Final Boss',
    description: 'C minor, 128 BPM — darker and heavier, chugging bass and long dramatic notes',
    bpm: 128,
    chords: [
      { root: 24, pad: [60, 63, 67] }, // Cm
      { root: 20, pad: [56, 60, 63] }, // Ab
      { root: 29, pad: [53, 56, 60] }, // Fm
      { root: 31, pad: [55, 59, 62] }, // G (major)
    ],
    melody: [
      [[72, 6], [75, 2], [74, 4], [72, 4]],
      [[68, 8], [72, 4], [75, 4]],
      [[77, 6], [75, 2], [72, 4], [68, 4]],
      [[71, 8], [74, 4], [79, 4]],
      [[84, 6], [82, 2], [79, 4], [75, 4]],
      [[80, 8], [79, 4], [75, 4]],
      [[77, 4], [80, 4], [84, 4], [82, 2], [80, 2]],
      [[79, 12], [74, 2], [71, 2]],
    ],
    bass: [[0, 0], [1, 0], [2, 0], [4, 0], [7, 12], [8, 0], [9, 0], [10, 0], [12, 0], [14, -2]],
    kick: [0, 2, 8, 10],
    snare: [4, 12],
    hatEvery: 2,
  },
];

export const DEFAULT_TRACK = 'arena';

export const trackById = (id: string) => TRACKS.find((t) => t.id === id) ?? TRACKS[0];
