import type { CircleLayout, LineStyle } from "./components/NoteCircle";
import { type SpellingPreference, noteSlug, parseNoteSlug, pitchOf } from "./theory/notes";
import { DEFAULT_SCALE_ID, getScale, spellScale } from "./theory/scales";

export interface AppState {
  scaleId: string;
  rootPitch: number;
  spelling: SpellingPreference;
  lineStyle: LineStyle;
  layout: CircleLayout;
}

const SPELLINGS: SpellingPreference[] = ["auto", "flat", "sharp"];
const LINE_STYLES: LineStyle[] = ["arcs", "shape", "wedges"];
const LAYOUTS: CircleLayout[] = ["chromatic", "fifths"];
const SPELLING_KEY = "see-scales:spelling";
const LINE_STYLE_KEY = "see-scales:line-style";
const LAYOUT_KEY = "see-scales:layout";

function readStored<T extends string>(key: string, allowed: T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value as T) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

export function storePreferences(state: AppState) {
  try {
    localStorage.setItem(SPELLING_KEY, state.spelling);
    localStorage.setItem(LINE_STYLE_KEY, state.lineStyle);
    localStorage.setItem(LAYOUT_KEY, state.layout);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); preferences just won't persist.
  }
}

/** Reads `#/c-sharp/dorian`. Returns only the parts that are valid. */
export function readHash(hash: string, spelling: SpellingPreference): Partial<AppState> {
  const [rootSlug, scaleId] = hash.replace(/^#\/?/, "").split("/");
  const result: Partial<AppState> = {};
  const scale = scaleId ? getScale(scaleId) : undefined;
  if (scale) result.scaleId = scale.id;

  const root = rootSlug ? parseNoteSlug(rootSlug) : null;
  if (root) {
    result.rootPitch = pitchOf(root);
    const shown = spellScale(scale ?? getScale(DEFAULT_SCALE_ID)!, result.rootPitch, spelling).root;
    if (root.accidental !== 0 && shown.accidental !== root.accidental) {
      result.spelling = root.accidental > 0 ? "sharp" : "flat";
    }
  }
  return result;
}

export function hashFor(state: AppState) {
  const scale = getScale(state.scaleId) ?? getScale(DEFAULT_SCALE_ID)!;
  const root = spellScale(scale, state.rootPitch, state.spelling).root;
  return `#/${noteSlug(root)}/${scale.id}`;
}

export function initialState(): AppState {
  const defaults: AppState = {
    scaleId: DEFAULT_SCALE_ID,
    rootPitch: 0,
    spelling: readStored(SPELLING_KEY, SPELLINGS, "auto"),
    lineStyle: readStored(LINE_STYLE_KEY, LINE_STYLES, "arcs"),
    layout: readStored(LAYOUT_KEY, LAYOUTS, "chromatic"),
  };
  return { ...defaults, ...readHash(window.location.hash, defaults.spelling) };
}
