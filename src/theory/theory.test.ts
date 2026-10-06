import { describe, expect, it } from "vitest";
import { formatNote, parseNoteSlug, pitchOf } from "./notes";
import { SCALES, getScale, parentScale, spellScale } from "./scales";

const scale = (id: string) => {
  const found = getScale(id);
  if (!found) throw new Error(`Missing scale ${id}`);
  return found;
};

const names = (id: string, root: number, preference: "auto" | "flat" | "sharp" = "auto") =>
  spellScale(scale(id), root, preference).notes.map(formatNote).join(" ");

describe("scale data", () => {
  it.each(SCALES)("$name has ascending, unique pitches", ({ id }) => {
    const { offsets, steps } = spellScale(scale(id), 0, "auto");
    expect(offsets[0]).toBe(0);
    expect(new Set(offsets).size).toBe(offsets.length);
    expect(steps.every((step) => step > 0)).toBe(true);
    expect(steps.reduce((a, b) => a + b, 0)).toBe(12);
  });

  it("has unique ids", () => {
    expect(new Set(SCALES.map((s) => s.id)).size).toBe(SCALES.length);
  });

  it.each(SCALES.filter((s) => s.modeOf))("$name matches its parent scale rotated", (mode) => {
    const parent = spellScale(scale(mode.modeOf!.scaleId), 0, "auto");
    const start = parent.offsets[mode.modeOf!.mode - 1]!;
    const rotated = parent.offsets.map((offset) => (offset - start + 12) % 12).sort((a, b) => a - b);
    expect(spellScale(mode, 0, "auto").offsets).toEqual(rotated);
  });

  it("orders major modes so each neighbor differs by one note", () => {
    const modes = SCALES.filter((s) => s.group === "Modes of Major").map((s) => new Set(spellScale(s, 0, "auto").offsets));
    for (let i = 1; i < modes.length; i++) {
      const changed = [...modes[i]!].filter((offset) => !modes[i - 1]!.has(offset));
      expect(changed).toHaveLength(1);
    }
  });
});

describe("spelling", () => {
  it("uses each letter once in seven-note scales", () => {
    expect(names("major", 2)).toBe("D E F♯ G A B C♯");
    expect(names("major", 5)).toBe("F G A B♭ C D E");
    expect(names("harmonic-minor", 3)).toBe("E♭ F G♭ A♭ B♭ C♭ D");
  });

  it("picks the black-key root name with fewer accidentals", () => {
    expect(names("major", 1)).toBe("D♭ E♭ F G♭ A♭ B♭ C");
    expect(names("natural-minor", 1)).toBe("C♯ D♯ E F♯ G♯ A B");
    expect(names("locrian", 1)).toBe("C♯ D E F♯ G A B");
  });

  it("respects an explicit flat or sharp preference for the root", () => {
    expect(names("major", 6, "sharp")).toBe("F♯ G♯ A♯ B C♯ D♯ E♯");
    expect(names("major", 6, "flat")).toBe("G♭ A♭ B♭ C♭ D♭ E♭ F");
  });

  it("spells non-heptatonic scales by degree", () => {
    expect(names("minor-blues", 0)).toBe("C E♭ F G♭ G B♭");
    expect(names("major-blues", 0)).toBe("C D E♭ E G A");
    expect(names("whole-tone", 0)).toBe("C D E F♯ G♯ B♭");
    expect(names("altered", 0)).toBe("C D♭ D♯ E F♯ A♭ B♭");
    expect(names("ultralocrian", 11)).toBe("B C D E♭ F G A♭");
  });

  it("uses the preference for chromatic", () => {
    expect(names("chromatic", 0, "sharp")).toBe("C C♯ D D♯ E F F♯ G G♯ A A♯ B");
    expect(names("chromatic", 0, "flat")).toBe("C D♭ D E♭ E F G♭ G A♭ A B♭ B");
  });
});

describe("parentScale", () => {
  it("names the parent of a mode", () => {
    expect(parentScale(spellScale(scale("dorian"), 2, "auto"))?.label).toBe("C Major");
    expect(parentScale(spellScale(scale("locrian"), 11, "auto"))?.label).toBe("C Major");
    expect(parentScale(spellScale(scale("altered"), 7, "auto"))?.label).toBe("A♭ Melodic Minor");
    expect(parentScale(spellScale(scale("phrygian-dominant"), 4, "auto"))?.label).toBe("A Harmonic Minor");
  });

  it("returns nothing for scales that aren't modes", () => {
    expect(parentScale(spellScale(scale("whole-tone"), 0, "auto"))).toBeNull();
  });
});

describe("note slugs", () => {
  it("parses root names from the URL", () => {
    expect(pitchOf(parseNoteSlug("c-sharp")!)).toBe(1);
    expect(pitchOf(parseNoteSlug("B-flat")!)).toBe(10);
    expect(parseNoteSlug("h")).toBeNull();
  });
});
