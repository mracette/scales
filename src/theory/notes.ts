export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const NATURAL_PITCHES = [0, 2, 4, 5, 7, 9, 11];

const ACCIDENTAL_SYMBOLS: Record<number, string> = {
  [-2]: "𝄫",
  [-1]: "♭",
  0: "",
  1: "♯",
  2: "𝄪",
};

const ACCIDENTAL_ASCII: Record<string, number> = { bb: -2, b: -1, "": 0, "#": 1, "##": 2, x: 2 };

export type SpellingPreference = "auto" | "flat" | "sharp";

export interface NoteName {
  /** Index into LETTERS. */
  letter: number;
  accidental: number;
}

export interface Degree {
  /** Scale degree number, 1–7. */
  number: number;
  accidental: number;
}

export const mod12 = (n: number) => ((n % 12) + 12) % 12;

const naturalPitch = (letter: number) => NATURAL_PITCHES[letter] ?? 0;

export const pitchOf = (note: NoteName) => mod12(naturalPitch(note.letter) + note.accidental);

export const formatNote = (note: NoteName) =>
  `${LETTERS[note.letter]}${ACCIDENTAL_SYMBOLS[note.accidental] ?? ""}`;

export function parseDegree(text: string): Degree {
  const match = /^(bb|b|##|#)?([1-7])$/.exec(text);
  if (!match) throw new Error(`Invalid scale degree "${text}"`);
  return { number: Number(match[2]), accidental: ACCIDENTAL_ASCII[match[1] ?? ""] ?? 0 };
}

export const formatDegree = (degree: Degree) =>
  `${ACCIDENTAL_SYMBOLS[degree.accidental] ?? ""}${degree.number}`;

export const degreeSemitones = (degree: Degree) =>
  naturalPitch(degree.number - 1) + degree.accidental;

export function spellDegree(root: NoteName, degree: Degree): NoteName {
  const letter = (root.letter + degree.number - 1) % 7;
  const target = mod12(pitchOf(root) + degreeSemitones(degree));
  const offset = mod12(target - naturalPitch(letter));
  return { letter, accidental: offset > 6 ? offset - 12 : offset };
}

/** Sharp spelling first, then flat. White keys only get their natural name. */
export function rootCandidates(pitch: number): NoteName[] {
  const natural = NATURAL_PITCHES.indexOf(mod12(pitch));
  if (natural !== -1) return [{ letter: natural, accidental: 0 }];
  return [
    { letter: NATURAL_PITCHES.indexOf(mod12(pitch - 1)), accidental: 1 },
    { letter: NATURAL_PITCHES.indexOf(mod12(pitch + 1)), accidental: -1 },
  ];
}

const SHARP_NAMES = Array.from({ length: 12 }, (_, pitch) => rootCandidates(pitch)[0]!);
const FLAT_NAMES = Array.from({ length: 12 }, (_, pitch) => rootCandidates(pitch).at(-1)!);

export const noteNameForPitch = (pitch: number, flavor: "flat" | "sharp") =>
  (flavor === "sharp" ? SHARP_NAMES : FLAT_NAMES)[mod12(pitch)]!;

const ROOT_SLUG_ACCIDENTALS: Record<number, string> = { [-1]: "-flat", 0: "", 1: "-sharp" };

export const noteSlug = (note: NoteName) =>
  `${LETTERS[note.letter]!.toLowerCase()}${ROOT_SLUG_ACCIDENTALS[note.accidental] ?? ""}`;

export function parseNoteSlug(slug: string): NoteName | null {
  const match = /^([a-g])(-sharp|-flat)?$/.exec(slug.toLowerCase());
  if (!match) return null;
  return {
    letter: LETTERS.indexOf(match[1]!.toUpperCase() as (typeof LETTERS)[number]),
    accidental: match[2] === "-sharp" ? 1 : match[2] === "-flat" ? -1 : 0,
  };
}
