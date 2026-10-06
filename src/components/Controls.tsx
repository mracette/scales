import type { ReactNode } from "react";
import { formatNote, type SpellingPreference } from "../theory/notes";
import { type Scale, spellScale } from "../theory/scales";
import type { CircleLayout, LineStyle } from "./NoteCircle";

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
  className?: string;
}

function Segmented<T extends string>({ label, value, options, onChange, className }: SegmentedProps<T>) {
  return (
    <fieldset className={`control ${className ?? ""}`}>
      <legend>{label}</legend>
      <div className="segmented">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

interface RootPickerProps {
  scale: Scale;
  rootPitch: number;
  spelling: SpellingPreference;
  onChange: (pitch: number) => void;
}

export function RootPicker({ scale, rootPitch, spelling, onChange }: RootPickerProps) {
  return (
    <Segmented
      className="root-picker"
      label="Root"
      value={String(rootPitch)}
      onChange={(value) => onChange(Number(value))}
      options={Array.from({ length: 12 }, (_, pitch) => ({
        value: String(pitch),
        label: formatNote(spellScale(scale, pitch, spelling).root),
      }))}
    />
  );
}

export function SpellingPicker({ value, onChange }: { value: SpellingPreference; onChange: (value: SpellingPreference) => void }) {
  return (
    <Segmented
      className="spelling-picker"
      label="Spelling"
      value={value}
      onChange={onChange}
      options={[
        { value: "auto", label: "Auto", title: "Name each key the way it's usually written" },
        { value: "flat", label: "♭", title: "Prefer flats" },
        { value: "sharp", label: "♯", title: "Prefer sharps" },
      ]}
    />
  );
}

export function LineStylePicker({ value, onChange }: { value: LineStyle; onChange: (value: LineStyle) => void }) {
  return (
    <Segmented
      className="line-style-picker"
      label="Lines"
      value={value}
      onChange={onChange}
      options={[
        { value: "arcs", label: "Arcs" },
        { value: "shape", label: "Shape" },
        { value: "wedges", label: "Wedges" },
      ]}
    />
  );
}

export function LayoutPicker({ value, onChange }: { value: CircleLayout; onChange: (value: CircleLayout) => void }) {
  return (
    <Segmented
      className="layout-picker"
      label="Circle"
      value={value}
      onChange={onChange}
      options={[
        { value: "chromatic", label: "Chromatic", title: "Notes in semitone order" },
        { value: "fifths", label: "Fifths", title: "Notes in circle-of-fifths order" },
      ]}
    />
  );
}
