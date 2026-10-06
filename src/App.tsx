import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { isAudioUnlocked, onAudioUnlocked, playPitch } from "./audio";
import { LayoutPicker, LineStylePicker, RootPicker, SpellingPicker } from "./components/Controls";
import { Keyboard } from "./components/Keyboard";
import { NoteCircle } from "./components/NoteCircle";
import { ScaleList } from "./components/ScaleList";
import { useScalePlayer } from "./hooks/useScalePlayer";
import { type AppState, hashFor, initialState, readHash, storePreferences } from "./state";
import { formatDegree, formatNote, mod12, pitchOf } from "./theory/notes";
import { DEFAULT_SCALE_ID, SCALE_GROUPS, getScale, neighborScale, parentScale, spellScale } from "./theory/scales";

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && target.closest("input, select, textarea") !== null;

const isControl = (target: EventTarget | null) =>
  target instanceof Element && target.closest("button, a, [role='button']") !== null;

function Brand() {
  return (
    <a className="brand" href="#/c/major">
      <svg viewBox="-12 -12 24 24" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * Math.PI) / 6;
          const role = i === 0 ? "root" : [2, 4, 5, 7, 9, 11].includes(i) ? "in-scale" : "out-of-scale";
          return <circle key={i} className={role} cx={9 * Math.sin(angle)} cy={-9 * Math.cos(angle)} r={1.7} />;
        })}
      </svg>
      See Scales
    </a>
  );
}

function Credits() {
  return (
    <p className="credits">
      by <a href="https://markracette.com">Mark Racette</a> · <a href="https://github.com/mracette/scales">source</a>
    </p>
  );
}

export function App() {
  const [state, setState] = useState<AppState>(initialState);
  const update = useCallback((changes: Partial<AppState>) => setState((current) => ({ ...current, ...changes })), []);

  const scale = getScale(state.scaleId) ?? getScale(DEFAULT_SCALE_ID)!;
  const spelled = useMemo(() => spellScale(scale, state.rootPitch, state.spelling), [scale, state.rootPitch, state.spelling]);
  const parent = parentScale(spelled);
  const scalePitches = useMemo(
    () => [...spelled.offsets, 12].map((offset) => state.rootPitch + offset),
    [spelled.offsets, state.rootPitch],
  );
  const player = useScalePlayer(scalePitches);
  const soundUnlocked = useSyncExternalStore(onAudioUnlocked, isAudioUnlocked);
  // A control reached with Tab keeps Space for itself; one that's focused because it was clicked shouldn't.
  const focusedByTab = useRef(false);

  useEffect(() => {
    const hash = hashFor(state);
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
    document.title = `${formatNote(spelled.root)} ${scale.name} · See Scales`;
    storePreferences(state);
  }, [state, spelled.root, scale.name]);

  useEffect(() => {
    const onHashChange = () => setState((current) => ({ ...current, ...readHash(window.location.hash, current.spelling) }));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const stepScale = useCallback(
    (direction: 1 | -1) => setState((current) => ({ ...current, scaleId: neighborScale(current.scaleId, direction).id })),
    [],
  );
  const stepRoot = useCallback(
    (direction: 1 | -1) => setState((current) => ({ ...current, rootPitch: mod12(current.rootPitch + direction) })),
    [],
  );

  useEffect(() => {
    const onPointerDown = () => {
      focusedByTab.current = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") focusedByTab.current = true;
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      const actions: Record<string, () => void> = {
        ArrowLeft: () => stepScale(-1),
        ArrowRight: () => stepScale(1),
        ArrowUp: () => stepRoot(1),
        ArrowDown: () => stepRoot(-1),
      };
      if (event.key === " " && !(focusedByTab.current && isControl(event.target))) actions[" "] = player.toggle;
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [player.toggle, stepRoot, stepScale]);

  const rootName = formatNote(spelled.root);
  const displayOptions = (
    <>
      <SpellingPicker value={state.spelling} onChange={(spelling) => update({ spelling })} />
      <LayoutPicker value={state.layout} onChange={(layout) => update({ layout })} />
      <LineStylePicker value={state.lineStyle} onChange={(lineStyle) => update({ lineStyle })} />
    </>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <Brand />
        <ScaleList scaleId={scale.id} onSelect={(scaleId) => update({ scaleId })} />
        <div className="display-options">{displayOptions}</div>
        <Credits />
      </aside>

      <main className="stage">
        <header className="mobile-header">
          <Brand />
        </header>

        <div className="title-row">
          <button type="button" className="step-button" aria-label="Previous scale" onClick={() => stepScale(-1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="title">
            <h1>
              <span className="title-root">{rootName}</span> <span className="title-name">{scale.name}</span>
              <svg className="title-caret" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </h1>
            <select
              aria-label="Choose a scale"
              value={scale.id}
              onChange={(event) => {
                update({ scaleId: event.target.value });
                event.target.blur();
              }}
            >
              {SCALE_GROUPS.map((group) => (
                <optgroup key={group.name} label={group.name}>
                  {group.scales.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <button type="button" className="step-button" aria-label="Next scale" onClick={() => stepScale(1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <p className="meta">
          {parent && parent.mode !== 1 && (
            <>
              Mode {parent.mode} of{" "}
              <button
                type="button"
                className="link"
                onClick={() => update({ scaleId: parent.scale.id, rootPitch: pitchOf(parent.root) })}
              >
                {parent.label}
              </button>
              {" · "}
            </>
          )}
          {scale.alias && <>also called {scale.alias} · </>}
          {scale.degrees.length} notes
        </p>
        <p className="formula" aria-label="Scale degrees">
          {spelled.degrees.map((degree, i) => (
            <span key={i} className={i === 0 ? "root" : undefined}>
              {formatDegree(degree)}
            </span>
          ))}
        </p>

        <RootPicker
          scale={scale}
          rootPitch={state.rootPitch}
          spelling={state.spelling}
          onChange={(rootPitch) => update({ rootPitch })}
        />

        <div className="circle-area">
          <NoteCircle
            spelled={spelled}
            rootPitch={state.rootPitch}
            lineStyle={state.lineStyle}
            layout={state.layout}
            onPlay={(offset) => playPitch(state.rootPitch + offset)}
          />
          {!soundUnlocked && <p className="sound-hint">Click anywhere for sound</p>}
        </div>

        <Keyboard spelled={spelled} rootPitch={state.rootPitch} onPlay={playPitch} />

        <button type="button" className="play-button" aria-pressed={player.playing} onClick={player.toggle}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {player.playing ? <rect x="6" y="6" width="12" height="12" rx="1.5" /> : <path d="M8 5.5v13l11-6.5z" />}
          </svg>
          {player.playing ? "Stop" : "Play scale"}
        </button>

        <div className="display-options mobile-only">{displayOptions}</div>

        <p className="shortcuts">
          <kbd>←</kbd> <kbd>→</kbd> scale · <kbd>↑</kbd> <kbd>↓</kbd> root · <kbd>space</kbd> play
        </p>

        <footer className="mobile-footer">
          <Credits />
        </footer>
      </main>
    </div>
  );
}
