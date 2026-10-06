import { useCallback, useEffect, useRef, useState } from "react";
import { playPitch } from "../audio";

const STEP_MS = 280;

/** Plays `pitches` one after another. Stops if the pitches change mid-run. */
export function useScalePlayer(pitches: number[]) {
  const key = pitches.join(",");
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [key, clearTimers]);

  const playing = playingKey === key;

  const toggle = useCallback(() => {
    clearTimers();
    if (playing) {
      setPlayingKey(null);
      return;
    }
    setPlayingKey(key);
    const sequence = key.split(",").map(Number);
    sequence.forEach((pitch, i) => {
      timers.current.push(window.setTimeout(() => playPitch(pitch), i * STEP_MS));
    });
    timers.current.push(window.setTimeout(() => setPlayingKey(null), sequence.length * STEP_MS + 300));
  }, [clearTimers, key, playing]);

  return { playing, toggle };
}
