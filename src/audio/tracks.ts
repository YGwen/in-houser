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
  /** Melody instrument: smooth detuned-saw lead (default) or punchy brass. */
  leadVoice?: 'lead' | 'brass';
  /** Steps where the bar's chord is played as a short brass stab. */
  stabs?: number[];
}

/** A recorded track: an audio file (in public/) played on a loop instead of the synthesizer. */
export interface FileTrack {
  id: string;
  name: string;
  description: string;
  /** Path under public/, e.g. "music/my-track.mp3". */
  file: string;
  /** Volume relative to the synthesized tracks (1 = unchanged). */
  gain?: number;
  /** false = play once (a jingle). Default: loop. */
  loop?: boolean;
  /** Track to continue with after a one-shot file ends. */
  then?: string;
  /** Synthesized track to play instead if the file isn't there (e.g. not committed, so not on the live site). */
  fallback: string;
}

export const isFileTrack = (t: Track | FileTrack): t is FileTrack => 'file' in t;

export const TRACKS: (Track | FileTrack)[] = [
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
  {
    id: 'street',
    name: 'Street',
    description: 'E minor, 150 BPM — syncopated funky bass and 16th hi-hats, a street-fight stage',
    bpm: 150,
    chords: [
      { root: 28, pad: [64, 67, 71] }, // Em
      { root: 24, pad: [60, 64, 67] }, // C
      { root: 26, pad: [62, 66, 69] }, // D
      { root: 23, pad: [59, 63, 66] }, // B (major)
    ],
    melody: [
      [[76, 2], [74, 2], [76, 2], [79, 2], [78, 4], [76, 4]],
      [[72, 4], [76, 2], [79, 2], [84, 6], [79, 2]],
      [[78, 4], [74, 2], [78, 2], [81, 4], [78, 2], [74, 2]],
      [[75, 6], [71, 2], [75, 2], [78, 2], [83, 4]],
      [[83, 4], [81, 2], [79, 2], [78, 2], [76, 2], [74, 4]],
      [[76, 4], [79, 2], [84, 2], [83, 4], [79, 4]],
      [[81, 2], [78, 2], [74, 4], [78, 2], [81, 2], [86, 4]],
      [[83, 8], [78, 4], [75, 4]],
    ],
    bass: [[0, 0], [3, 0], [6, 12], [8, 0], [10, 0], [11, 12], [14, 7]],
    kick: [0, 3, 8, 11],
    snare: [4, 12],
    hatEvery: 1,
    openHat: 14,
  },
  {
    id: 'heroes',
    name: 'Heroes',
    description: 'G major, 150 BPM — bright and triumphant hero theme',
    bpm: 150,
    chords: [
      { root: 31, pad: [67, 71, 74] }, // G
      { root: 26, pad: [62, 66, 69] }, // D
      { root: 28, pad: [64, 67, 71] }, // Em
      { root: 24, pad: [60, 64, 67] }, // C
    ],
    melody: [
      [[74, 4], [79, 2], [78, 2], [76, 2], [74, 2], [71, 4]],
      [[69, 6], [74, 2], [78, 4], [76, 4]],
      [[76, 2], [79, 2], [83, 4], [81, 2], [79, 2], [76, 4]],
      [[72, 4], [76, 4], [79, 6], [81, 2]],
      [[83, 4], [81, 2], [79, 2], [83, 2], [86, 2], [83, 4]],
      [[81, 6], [78, 2], [74, 4], [78, 4]],
      [[79, 2], [81, 2], [83, 4], [84, 2], [83, 2], [79, 4]],
      [[76, 4], [79, 4], [81, 8]],
    ],
    bass: [[0, 0], [2, 0], [4, 12], [6, 0], [8, 0], [10, 12], [12, 7], [14, 12]],
    kick: [0, 6, 8, 11],
    snare: [4, 12],
    hatEvery: 2,
    openHat: 14,
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'F# minor, 150 BPM — synth arpeggios and pumping octave bass, night-city vibe',
    bpm: 150,
    chords: [
      { root: 30, pad: [66, 69, 73] }, // F#m
      { root: 26, pad: [62, 66, 69] }, // D
      { root: 33, pad: [64, 69, 73] }, // A
      { root: 28, pad: [64, 68, 71] }, // E
    ],
    melody: [
      [[73, 2], [69, 2], [66, 2], [69, 2], [73, 2], [78, 2], [76, 4]],
      [[74, 2], [69, 2], [66, 2], [69, 2], [74, 4], [73, 4]],
      [[73, 2], [76, 2], [81, 4], [80, 2], [76, 2], [73, 4]],
      [[71, 6], [68, 2], [71, 2], [76, 2], [80, 4]],
      [[81, 4], [78, 2], [73, 2], [78, 2], [81, 2], [85, 4]],
      [[86, 4], [81, 2], [78, 2], [81, 4], [78, 4]],
      [[76, 2], [78, 2], [81, 4], [83, 2], [81, 2], [76, 4]],
      [[80, 8], [76, 4], [71, 4]],
    ],
    bass: [[0, 0], [2, 12], [4, 0], [6, 12], [8, 0], [10, 12], [12, 0], [14, 12]],
    kick: [0, 4, 8, 12],
    snare: [4, 12],
    hatEvery: 1,
    openHat: 6,
  },
  {
    id: 'shadow',
    name: 'Shadow',
    description: 'B minor, 150 BPM — tense and ominous, a ninja or villain stage',
    bpm: 150,
    chords: [
      { root: 23, pad: [59, 62, 66] }, // Bm
      { root: 31, pad: [59, 62, 67] }, // G
      { root: 33, pad: [61, 64, 69] }, // A
      { root: 30, pad: [58, 61, 66] }, // F# (major)
    ],
    melody: [
      [[71, 2], [74, 2], [78, 4], [76, 2], [74, 2], [71, 4]],
      [[74, 6], [71, 2], [67, 4], [71, 4]],
      [[73, 2], [76, 2], [81, 4], [79, 2], [76, 2], [73, 4]],
      [[70, 8], [73, 4], [78, 4]],
      [[83, 4], [81, 2], [78, 2], [83, 4], [86, 2], [83, 2]],
      [[79, 4], [83, 2], [86, 2], [84, 4], [83, 2], [79, 2]],
      [[81, 2], [79, 2], [76, 4], [73, 2], [76, 2], [81, 4]],
      [[78, 8], [82, 4], [85, 4]],
    ],
    bass: [[0, 0], [2, 0], [3, 12], [6, 0], [8, 0], [10, 0], [11, 12], [14, 7]],
    kick: [0, 8, 10],
    snare: [4, 12],
    hatEvery: 2,
  },
  {
    id: 'select',
    name: 'Select',
    description: "C major rock, 150 BPM — bouncy and brassy, in the spirit of SF2 Turbo's character select (original melody)",
    bpm: 150,
    chords: [
      { root: 24, pad: [64, 67, 72] }, // C
      { root: 22, pad: [62, 65, 70] }, // Bb (the "rock" flat seventh)
      { root: 29, pad: [65, 69, 72] }, // F
      { root: 31, pad: [67, 71, 74] }, // G
    ],
    melody: [
      [[72, 2], [76, 2], [79, 2], [76, 2], [84, 4], [79, 4]],
      [[82, 2], [79, 2], [77, 2], [74, 2], [77, 4], [70, 4]],
      [[77, 2], [81, 2], [84, 2], [81, 2], [77, 4], [72, 2], [74, 2]],
      [[79, 6], [77, 2], [74, 2], [71, 2], [74, 4]],
      [[84, 2], [83, 2], [84, 2], [79, 2], [76, 4], [79, 4]],
      [[82, 4], [79, 2], [82, 2], [86, 4], [84, 4]],
      [[81, 2], [79, 2], [77, 2], [81, 2], [84, 4], [86, 4]],
      [[88, 4], [86, 4], [83, 4], [79, 4]],
    ],
    bass: [[0, 0], [2, 12], [4, 7], [6, 12], [8, 0], [10, 12], [12, 7], [14, 10]],
    kick: [0, 8],
    snare: [4, 12],
    hatEvery: 2,
    openHat: 14,
    leadVoice: 'brass',
    stabs: [6, 14],
  },
  {
    id: 'sf2-select',
    name: 'Player Select (SF2 Turbo)',
    description: 'Recorded track, loops on the setup screen and under the reveal. File public/music/03. Player Select.mp3 (falls back to Arena)',
    file: 'music/03. Player Select.mp3',
    gain: 1.2,
    fallback: 'arena',
  },
  {
    id: 'sf2-vs',
    name: 'VS (SF2 Turbo) → Player Select',
    description: 'Recorded 4.5 s VS jingle on the FIGHT! screen, then Player Select again. File public/music/04. VS..mp3',
    file: 'music/04. VS..mp3',
    gain: 1.4,
    loop: false,
    then: 'sf2-select',
    fallback: 'sf2-select', // jingle missing: keep the theme going
  },
];

export const DEFAULT_TRACK = 'arena';

/** Music on the setup screen and through the reveal, and the jingle on the FIGHT! screen. */
export const MENU_TRACK = 'sf2-select';
export const REVEAL_TRACK = 'sf2-vs';

export const trackById = (id: string) => TRACKS.find((t) => t.id === id) ?? TRACKS[0];
