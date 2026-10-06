import { useEffect, useRef } from "react";
import { onNotePlayed } from "../audio";
import { formatNote, mod12, noteNameForPitch } from "../theory/notes";
import type { SpelledScale } from "../theory/scales";

const KEY_COUNT = 24;
const WHITE_WIDTH = 10;
const WHITE_HEIGHT = 40;
const BLACK_WIDTH = 6;
const BLACK_HEIGHT = 25;
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

const keys = Array.from({ length: KEY_COUNT }, (_, pitch) => {
  const whitesBefore = Array.from({ length: pitch }, (_, p) => p).filter((p) => !BLACK_PITCH_CLASSES.has(p % 12)).length;
  const black = BLACK_PITCH_CLASSES.has(pitch % 12);
  return {
    pitch,
    black,
    x: black ? whitesBefore * WHITE_WIDTH - BLACK_WIDTH / 2 : whitesBefore * WHITE_WIDTH,
  };
});
const whiteKeys = keys.filter((key) => !key.black);
const blackKeys = keys.filter((key) => key.black);
const width = whiteKeys.length * WHITE_WIDTH;

interface KeyboardProps {
  spelled: SpelledScale;
  rootPitch: number;
  onPlay: (pitch: number) => void;
}

export function Keyboard({ spelled, rootPitch, onPlay }: KeyboardProps) {
  const keyElements = useRef(new Map<number, SVGRectElement>());

  useEffect(
    () =>
      onNotePlayed((pitch) => {
        const element = keyElements.current.get(pitch);
        if (!element) return;
        const restingFill = getComputedStyle(element).fill;
        element.animate([{ fill: "#ffffff" }, { fill: restingFill }], {
          duration: 1400,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        });
      }),
    [],
  );

  const offsets = new Set(spelled.offsets);
  const roleOf = (pitch: number) => {
    const offset = pitch - rootPitch;
    if (offset < 0 || offset > 12 || !offsets.has(mod12(offset))) return "out-of-scale";
    return mod12(offset) === 0 ? "root" : "in-scale";
  };
  const nameOf = (pitch: number) => {
    const index = spelled.offsets.indexOf(mod12(pitch - rootPitch));
    return formatNote(index === -1 ? noteNameForPitch(pitch, spelled.flavor) : spelled.notes[index]!);
  };

  const renderKey = (key: (typeof keys)[number]) => (
    <rect
      key={key.pitch}
      ref={(element) => {
        if (element) keyElements.current.set(key.pitch, element);
        else keyElements.current.delete(key.pitch);
      }}
      className={`key ${key.black ? "black" : "white"} ${roleOf(key.pitch)}`}
      x={key.x}
      y={0}
      width={key.black ? BLACK_WIDTH : WHITE_WIDTH}
      height={key.black ? BLACK_HEIGHT : WHITE_HEIGHT}
      rx={key.black ? 0.8 : 1.2}
      role="button"
      aria-label={`Play ${nameOf(key.pitch)}`}
      onPointerDown={(event) => {
        if (event.button === 0) onPlay(key.pitch);
      }}
    />
  );

  return (
    <svg className="keyboard" viewBox={`-0.5 -0.5 ${width + 1} ${WHITE_HEIGHT + 1}`} role="group" aria-label="Piano keyboard">
      {whiteKeys.map(renderKey)}
      {blackKeys.map(renderKey)}
    </svg>
  );
}
