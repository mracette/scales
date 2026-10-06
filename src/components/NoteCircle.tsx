import { useEffect, useMemo, useRef } from "react";
import { onNotePlayed } from "../audio";
import { useTweenedValues, wrappedDelta } from "../hooks/useTweenedValues";
import { formatDegree, formatNote, mod12, noteNameForPitch } from "../theory/notes";
import type { SpelledScale } from "../theory/scales";

export type LineStyle = "arcs" | "shape" | "wedges";

const NOTE_RADIUS = 40;
const RING_RADIUS = 7;
const INNER_RADIUS = NOTE_RADIUS - RING_RADIUS;
const MORPH_MS = 420;

const STEP_LABELS: Record<number, string> = { 1: "H", 2: "W", 3: "W+H", 4: "2W" };

/** `semitones` above the root, drawn clockwise with the root at the top. */
function point(radius: number, semitones: number) {
  const angle = (semitones * Math.PI) / 6;
  return { x: radius * Math.sin(angle), y: -radius * Math.cos(angle) };
}

const xy = ({ x, y }: { x: number; y: number }) => `${x.toFixed(3)} ${y.toFixed(3)}`;

interface Segment {
  path: string;
  label: { x: number; y: number };
}

/** `delta` is the signed number of semitones from start to end, the short way around. */
function arcSegment(start: number, delta: number): Segment {
  const size = Math.abs(delta);
  const middle = start + delta / 2;
  const control = point(Math.max(-13, INNER_RADIUS - (size * NOTE_RADIUS) / 3.5), middle);
  return {
    path: `M ${xy(point(INNER_RADIUS, start))} Q ${xy(control)} ${xy(point(INNER_RADIUS, start + delta))}`,
    label: point(Math.max(-1, INNER_RADIUS - size * 8.5), middle),
  };
}

function chordSegment(start: number, delta: number): Segment {
  const from = point(INNER_RADIUS, start);
  const to = point(INNER_RADIUS, start + delta);
  return {
    path: `M ${xy(from)} L ${xy(to)}`,
    label: { x: ((from.x + to.x) / 2) * 0.78, y: ((from.y + to.y) / 2) * 0.78 },
  };
}

function wedgeSegment(start: number, delta: number): Segment {
  return {
    path: `M 0 0 L ${xy(point(INNER_RADIUS, start))}`,
    label: point(INNER_RADIUS * 0.41, start + delta / 2),
  };
}

const SEGMENT_BUILDERS: Record<LineStyle, (start: number, delta: number) => Segment> = {
  arcs: arcSegment,
  shape: chordSegment,
  wedges: wedgeSegment,
};

/** Every scale is padded to 12 positions (extras sit on the root) so lines can slide between scales of different sizes. */
const padToTwelve = (offsets: number[]) => Array.from({ length: 12 }, (_, i) => offsets[i] ?? 0);

interface NoteCircleProps {
  spelled: SpelledScale;
  rootPitch: number;
  lineStyle: LineStyle;
  onPlay: (offset: number) => void;
}

interface IntervalLinesProps {
  offsets: number[];
  steps: number[];
  lineStyle: LineStyle;
}

function IntervalLines({ offsets, steps, lineStyle }: IntervalLinesProps) {
  const offsetsKey = offsets.join(",");
  const targets = useMemo(() => padToTwelve(offsetsKey.split(",").map(Number)), [offsetsKey]);
  const slots = useTweenedValues(targets, MORPH_MS, 12);

  const buildSegment = SEGMENT_BUILDERS[lineStyle];
  const segments = slots.map((start, i) => {
    const delta = wrappedDelta(start, slots[i + 1] ?? slots[0]!, 12);
    return {
      ...buildSegment(start, delta),
      opacity: Math.min(1, Math.abs(delta) / 0.5),
      text: steps[i] === undefined ? null : (STEP_LABELS[steps[i]] ?? String(steps[i])),
    };
  });

  return (
    <g>
      <g className="interval-lines">
        {segments.map((segment, i) => (
          <path key={i} d={segment.path} opacity={segment.opacity} />
        ))}
      </g>
      <g className="interval-labels" aria-hidden="true">
        {segments.map((segment, i) =>
          segment.text === null ? null : (
            <text key={i} x={segment.label.x} y={segment.label.y} opacity={segment.opacity} dy="0.35em">
              {segment.text}
            </text>
          ),
        )}
      </g>
    </g>
  );
}

export function NoteCircle({ spelled, rootPitch, lineStyle, onPlay }: NoteCircleProps) {
  const noteElements = useRef(new Map<number, SVGGElement>());

  useEffect(
    () =>
      onNotePlayed((pitch) => {
        const element = noteElements.current.get(mod12(pitch - rootPitch));
        element?.animate([{ transform: "scale(1.22)" }, { transform: "scale(1)" }], {
          duration: 450,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        });
        element
          ?.querySelector(".note-flash")
          ?.animate([{ opacity: 0.6 }, { opacity: 0 }], { duration: 700, easing: "ease-out" });
      }),
    [rootPitch],
  );

  const indexByOffset = new Map(spelled.offsets.map((offset, i) => [offset, i]));

  return (
    <svg className="note-circle" viewBox="-57 -57 114 114" role="group" aria-label="Notes in the scale">
      <IntervalLines offsets={spelled.offsets} steps={spelled.steps} lineStyle={lineStyle} />
      {Array.from({ length: 12 }, (_, offset) => {
        const index = indexByOffset.get(offset);
        const inScale = index !== undefined;
        const note = inScale ? spelled.notes[index]! : noteNameForPitch(rootPitch + offset, spelled.flavor);
        const name = formatNote(note);
        const center = point(NOTE_RADIUS, offset);
        const degreeAt = point(NOTE_RADIUS + RING_RADIUS + 4.5, offset);
        const role = offset === 0 ? "root" : inScale ? "in-scale" : "out-of-scale";
        return (
          <g key={offset}>
            <g transform={`translate(${xy(center)})`}>
              <g
                ref={(element) => {
                  if (element) noteElements.current.set(offset, element);
                  else noteElements.current.delete(offset);
                }}
                className={`note ${role}`}
                role="button"
                tabIndex={0}
                aria-label={`Play ${name}`}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse" && inScale) onPlay(offset);
                }}
                onPointerDown={(event) => {
                  if (event.button === 0) onPlay(offset);
                }}
                // Keep focus where it was so Space still plays the scale after clicking a note.
                onMouseDown={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onPlay(offset);
                  }
                }}
              >
                <circle className="note-ring" r={RING_RADIUS} />
                <circle className="note-flash" r={RING_RADIUS} />
                <text className="note-name" dy="0.35em">
                  {name}
                </text>
              </g>
            </g>
            {inScale && (
              <text className={`note-degree ${role}`} x={degreeAt.x} y={degreeAt.y} dy="0.35em" aria-hidden="true">
                {formatDegree(spelled.degrees[index]!)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
