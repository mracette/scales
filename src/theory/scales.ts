import {
  type Degree,
  type NoteName,
  type SpellingPreference,
  degreeSemitones,
  formatNote,
  mod12,
  parseDegree,
  rootCandidates,
  spellDegree,
} from "./notes";

export interface Scale {
  id: string;
  name: string;
  alias?: string;
  group: string;
  /** Degrees relative to the major scale, e.g. "b3". */
  degrees: string[];
  /** Alternate degrees used when the reader prefers sharps (only needed for chromatic). */
  sharpDegrees?: string[];
  modeOf?: { scaleId: string; mode: number };
}

export interface ScaleGroup {
  name: string;
  scales: Scale[];
}

const MAJOR = "Modes of Major";
const MELODIC = "Modes of Melodic Minor";
const HARMONIC = "Modes of Harmonic Minor";
const PENTATONIC = "Pentatonic & Blues";
const SYMMETRIC = "Symmetric";

export const SCALES: Scale[] = [
  { id: "lydian", name: "Lydian", group: MAJOR, degrees: ["1", "2", "3", "#4", "5", "6", "7"], modeOf: { scaleId: "major", mode: 4 } },
  { id: "major", name: "Major", alias: "Ionian", group: MAJOR, degrees: ["1", "2", "3", "4", "5", "6", "7"], modeOf: { scaleId: "major", mode: 1 } },
  { id: "mixolydian", name: "Mixolydian", group: MAJOR, degrees: ["1", "2", "3", "4", "5", "6", "b7"], modeOf: { scaleId: "major", mode: 5 } },
  { id: "dorian", name: "Dorian", group: MAJOR, degrees: ["1", "2", "b3", "4", "5", "6", "b7"], modeOf: { scaleId: "major", mode: 2 } },
  { id: "natural-minor", name: "Natural Minor", alias: "Aeolian", group: MAJOR, degrees: ["1", "2", "b3", "4", "5", "b6", "b7"], modeOf: { scaleId: "major", mode: 6 } },
  { id: "phrygian", name: "Phrygian", group: MAJOR, degrees: ["1", "b2", "b3", "4", "5", "b6", "b7"], modeOf: { scaleId: "major", mode: 3 } },
  { id: "locrian", name: "Locrian", group: MAJOR, degrees: ["1", "b2", "b3", "4", "b5", "b6", "b7"], modeOf: { scaleId: "major", mode: 7 } },

  { id: "melodic-minor", name: "Melodic Minor", group: MELODIC, degrees: ["1", "2", "b3", "4", "5", "6", "7"], modeOf: { scaleId: "melodic-minor", mode: 1 } },
  { id: "dorian-flat-2", name: "Dorian ♭2", group: MELODIC, degrees: ["1", "b2", "b3", "4", "5", "6", "b7"], modeOf: { scaleId: "melodic-minor", mode: 2 } },
  { id: "lydian-augmented", name: "Lydian Augmented", group: MELODIC, degrees: ["1", "2", "3", "#4", "#5", "6", "7"], modeOf: { scaleId: "melodic-minor", mode: 3 } },
  { id: "lydian-dominant", name: "Lydian Dominant", group: MELODIC, degrees: ["1", "2", "3", "#4", "5", "6", "b7"], modeOf: { scaleId: "melodic-minor", mode: 4 } },
  { id: "mixolydian-flat-6", name: "Mixolydian ♭6", group: MELODIC, degrees: ["1", "2", "3", "4", "5", "b6", "b7"], modeOf: { scaleId: "melodic-minor", mode: 5 } },
  { id: "locrian-natural-2", name: "Locrian ♮2", group: MELODIC, degrees: ["1", "2", "b3", "4", "b5", "b6", "b7"], modeOf: { scaleId: "melodic-minor", mode: 6 } },
  { id: "altered", name: "Altered", alias: "Super Locrian", group: MELODIC, degrees: ["1", "b2", "#2", "3", "#4", "b6", "b7"], modeOf: { scaleId: "melodic-minor", mode: 7 } },

  { id: "harmonic-minor", name: "Harmonic Minor", group: HARMONIC, degrees: ["1", "2", "b3", "4", "5", "b6", "7"], modeOf: { scaleId: "harmonic-minor", mode: 1 } },
  { id: "locrian-natural-6", name: "Locrian ♮6", group: HARMONIC, degrees: ["1", "b2", "b3", "4", "b5", "6", "b7"], modeOf: { scaleId: "harmonic-minor", mode: 2 } },
  { id: "ionian-sharp-5", name: "Ionian ♯5", group: HARMONIC, degrees: ["1", "2", "3", "4", "#5", "6", "7"], modeOf: { scaleId: "harmonic-minor", mode: 3 } },
  { id: "dorian-sharp-4", name: "Dorian ♯4", group: HARMONIC, degrees: ["1", "2", "b3", "#4", "5", "6", "b7"], modeOf: { scaleId: "harmonic-minor", mode: 4 } },
  { id: "phrygian-dominant", name: "Phrygian Dominant", group: HARMONIC, degrees: ["1", "b2", "3", "4", "5", "b6", "b7"], modeOf: { scaleId: "harmonic-minor", mode: 5 } },
  { id: "lydian-sharp-2", name: "Lydian ♯2", group: HARMONIC, degrees: ["1", "#2", "3", "#4", "5", "6", "7"], modeOf: { scaleId: "harmonic-minor", mode: 6 } },
  { id: "ultralocrian", name: "Ultralocrian", alias: "Altered Diminished", group: HARMONIC, degrees: ["1", "b2", "b3", "b4", "b5", "b6", "bb7"], modeOf: { scaleId: "harmonic-minor", mode: 7 } },

  { id: "major-pentatonic", name: "Major Pentatonic", group: PENTATONIC, degrees: ["1", "2", "3", "5", "6"] },
  { id: "minor-pentatonic", name: "Minor Pentatonic", group: PENTATONIC, degrees: ["1", "b3", "4", "5", "b7"] },
  { id: "major-blues", name: "Major Blues", group: PENTATONIC, degrees: ["1", "2", "b3", "3", "5", "6"] },
  { id: "minor-blues", name: "Minor Blues", group: PENTATONIC, degrees: ["1", "b3", "4", "b5", "5", "b7"] },
  { id: "kansas-city-blues", name: "Kansas City Blues", group: PENTATONIC, degrees: ["1", "2", "4", "5", "b6"] },

  { id: "whole-tone", name: "Whole Tone", group: SYMMETRIC, degrees: ["1", "2", "3", "#4", "#5", "b7"] },
  { id: "diminished-half-whole", name: "Diminished (Half-Whole)", alias: "Dominant Diminished", group: SYMMETRIC, degrees: ["1", "b2", "#2", "3", "#4", "5", "6", "b7"] },
  { id: "diminished-whole-half", name: "Diminished (Whole-Half)", alias: "Octatonic", group: SYMMETRIC, degrees: ["1", "2", "b3", "4", "b5", "b6", "6", "7"] },
  { id: "augmented", name: "Augmented", group: SYMMETRIC, degrees: ["1", "#2", "3", "5", "#5", "7"] },
  {
    id: "chromatic",
    name: "Chromatic",
    group: SYMMETRIC,
    degrees: ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"],
    sharpDegrees: ["1", "#1", "2", "#2", "3", "4", "#4", "5", "#5", "6", "#6", "7"],
  },
];

export const SCALE_GROUPS: ScaleGroup[] = [
  { name: MAJOR, scales: [] },
  { name: MELODIC, scales: [] },
  { name: HARMONIC, scales: [] },
  { name: PENTATONIC, scales: [] },
  { name: SYMMETRIC, scales: [] },
];
for (const scale of SCALES) SCALE_GROUPS.find((group) => group.name === scale.group)?.scales.push(scale);

export const DEFAULT_SCALE_ID = "major";

export const getScale = (id: string) => SCALES.find((scale) => scale.id === id);

export interface SpelledScale {
  scale: Scale;
  root: NoteName;
  notes: NoteName[];
  degrees: Degree[];
  /** Semitones above the root for each note, ascending, 0–11. */
  offsets: number[];
  /** Semitone steps between consecutive notes, including the step back up to the octave. */
  steps: number[];
  /** Which way to spell pitches that aren't in the scale. */
  flavor: "flat" | "sharp";
}

const spellingCost = (notes: NoteName[]) =>
  notes.reduce((cost, note) => cost + Math.abs(note.accidental) + (Math.abs(note.accidental) > 1 ? 2 : 0), 0);

function spellFromRoot(scale: Scale, root: NoteName, preference: SpellingPreference): SpelledScale {
  const degreeText = preference === "sharp" && scale.sharpDegrees ? scale.sharpDegrees : scale.degrees;
  const degrees = degreeText.map(parseDegree);
  const notes = degrees.map((degree) => spellDegree(root, degree));
  const offsets = degrees.map((degree) => mod12(degreeSemitones(degree)));
  const steps = offsets.map((offset, i) => (offsets[i + 1] ?? 12) - offset);
  const accidentalSum = notes.reduce((sum, note) => sum + note.accidental, 0);
  const flavor =
    preference !== "auto" ? preference : accidentalSum > 0 ? "sharp" : "flat";
  return { scale, root, notes, degrees, offsets, steps, flavor };
}

/**
 * Spells a scale on a root pitch (0 = C). Black-key roots can be named either way; "auto" picks
 * whichever spelling needs fewer accidentals, so you get D♭ Major but C♯ Minor.
 */
export function spellScale(scale: Scale, rootPitch: number, preference: SpellingPreference): SpelledScale {
  const candidates = rootCandidates(rootPitch);
  const sharpRoot = candidates[0]!;
  const flatRoot = candidates.at(-1)!;
  if (candidates.length === 1) return spellFromRoot(scale, sharpRoot, preference);
  if (preference === "sharp") return spellFromRoot(scale, sharpRoot, preference);
  if (preference === "flat") return spellFromRoot(scale, flatRoot, preference);
  const asSharp = spellFromRoot(scale, sharpRoot, preference);
  const asFlat = spellFromRoot(scale, flatRoot, preference);
  return spellingCost(asSharp.notes) < spellingCost(asFlat.notes) ? asSharp : asFlat;
}

export interface ParentScale {
  scale: Scale;
  mode: number;
  root: NoteName;
  label: string;
}

/** For a mode, the scale it comes from: D Dorian is the 2nd mode of C Major. */
export function parentScale(spelled: SpelledScale): ParentScale | null {
  const modeOf = spelled.scale.modeOf;
  if (!modeOf) return null;
  const parent = getScale(modeOf.scaleId);
  if (!parent) return null;
  const root = spelled.notes[(8 - modeOf.mode) % 7];
  if (!root) return null;
  return { scale: parent, mode: modeOf.mode, root, label: `${formatNote(root)} ${parent.name}` };
}

export function neighborScale(id: string, direction: 1 | -1): Scale {
  const index = SCALES.findIndex((scale) => scale.id === id);
  return SCALES[(index + direction + SCALES.length) % SCALES.length]!;
}
