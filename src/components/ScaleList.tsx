import { SCALE_GROUPS } from "../theory/scales";

interface ScaleListProps {
  scaleId: string;
  onSelect: (id: string) => void;
}

export function ScaleList({ scaleId, onSelect }: ScaleListProps) {
  return (
    <nav className="scale-list" aria-label="Scales">
      {SCALE_GROUPS.map((group) => (
        <section key={group.name}>
          <h2>{group.name}</h2>
          {group.note && <p className="group-note">{group.note}</p>}
          <ul>
            {group.scales.map((scale) => (
              <li key={scale.id}>
                <button
                  type="button"
                  aria-current={scale.id === scaleId ? "true" : undefined}
                  onClick={() => onSelect(scale.id)}
                >
                  <span>{scale.name}</span>
                  <span className="note-count">{scale.degrees.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
