import { useEffect, useMemo, useRef } from "react";
import { onNotePlayed } from "../audio";
import { useTweenedValues } from "../hooks/useTweenedValues";
import { formatDegree, formatNote, mod12, noteNameForPitch } from "../theory/notes";
import type { SpelledScale } from "../theory/scales";

export type LineStyle = "arcs" | "gear" | "wedges";

const NOTE_RADIUS = 40;
const RING_RADIUS = 7;
const INNER_RADIUS = NOTE_RADIUS - RING_RADIUS;
const GEAR_RADIUS = INNER_RADIUS * 0.8;
const MORPH_MS = 420;

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

function arcSegment(start: number, end: number): Segment {
  const size = end - start;
  const middle = (start + end) / 2;
  const control = point(INNER_RADIUS - (size * NOTE_RADIUS) / 3.5, middle);
  return {
    path: `M ${xy(point(INNER_RADIUS, start))} Q ${xy(control)} ${xy(point(INNER_RADIUS, end))}`,
    label: point(INNER_RADIUS - size * 8.5, middle),
  };
}

function gearSegment(start: number, end: number): Segment {
  const inset = Math.min(0.26, (end - start) / 4);
  const arcStart = point(GEAR_RADIUS, start + inset);
  const arcEnd = point(GEAR_RADIUS, end - inset);
  const largeArc = end - start - 2 * inset > 6 ? 1 : 0;
  return {
    path: [
      `M ${xy(point(INNER_RADIUS, start + inset / 3))}`,
      `L ${xy(arcStart)}`,
      `A ${GEAR_RADIUS} ${GEAR_RADIUS} 0 ${largeArc} 1 ${xy(arcEnd)}`,
      `L ${xy(point(INNER_RADIUS, end - inset / 3))}`,
    ].join(" "),
    label: point(GEAR_RADIUS * 0.85, (start + end) / 2),
  };
}

function wedgeSegment(start: number, end: number): Segment {
  return {
    path: `M 0 0 L ${xy(point(INNER_RADIUS, start))}`,
    label: point(INNER_RADIUS * 0.41, (start + end) / 2),
  };
}

const SEGMENT_BUILDERS: Record<LineStyle, (start: number, end: number) => Segment> = {
  arcs: arcSegment,
  gear: gearSegment,
  wedges: wedgeSegment,
};

/** Every scale is padded to 12 positions so lines can slide between scales of different sizes. */
const padToTwelve = (offsets: number[]) => Array.from({ length: 12 }, (_, i) => offsets[i] ?? 12);

interface NoteCircleProps {
  spelled: SpelledScale;
  rootPitch: number;
  lineStyle: LineStyle;
  onPlay: (offset: number) => void;
}

export function NoteCircle({ spelled, rootPitch, lineStyle, onPlay }: NoteCircleProps) {
  const offsetsKey = spelled.offsets.join(",");
  const target = useMemo(() => padToTwelve(offsetsKey.split(",").map(Number)), [offsetsKey]);
  const positions = useTweenedValues(target, MORPH_MS);
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

  const buildSegment = SEGMENT_BUILDERS[lineStyle];
  const segments = positions.map((start, i) => {
    const end = positions[i + 1] ?? 12;
    const size = end - start;
    return {
      ...buildSegment(start, end),
      opacity: Math.min(1, Math.max(0, size / 0.5)),
      step: spelled.steps[i],
    };
  });

  const indexByOffset = new Map(spelled.offsets.map((offset, i) => [offset, i]));

  return (
    <svg className="note-circle" viewBox="-57 -57 114 114" role="group" aria-label="Notes in the scale">
      <g className={`interval-lines style-${lineStyle}`}>
        {segments.map((segment, i) => (
          <path key={i} d={segment.path} opacity={segment.opacity} />
        ))}
      </g>
      <g className="interval-labels" aria-hidden="true">
        {segments.map((segment, i) =>
          segment.step === undefined ? null : (
            <text key={i} x={segment.label.x} y={segment.label.y} opacity={segment.opacity} dy="0.35em">
              {segment.step}
            </text>
          ),
        )}
      </g>
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
                onPointerDown={(event) => {
                  if (event.button === 0) onPlay(offset);
                }}
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
