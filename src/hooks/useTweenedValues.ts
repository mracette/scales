import { useEffect, useRef, useState } from "react";

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Shortest signed distance from `from` to `to` when values wrap every `period`. */
export const wrappedDelta = (from: number, to: number, period: number) => {
  const delta = (((to - from) % period) + period) % period;
  return delta > period / 2 ? delta - period : delta;
};

/**
 * Animates each number in `target` from its current value. `target` must keep a stable identity between renders.
 * With `period`, values are treated as positions on a circle and take the shorter way around.
 */
export function useTweenedValues(target: number[], duration: number, period?: number) {
  const [values, setValues] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    const length = prefersReducedMotion() ? 0 : duration;
    const deltas = target.map((value, i) => {
      const previous = from[i] ?? value;
      return period ? wrappedDelta(previous, value, period) : value - previous;
    });
    let start: number | null = null;
    let frame = requestAnimationFrame(function step(now) {
      start ??= now;
      const progress = length === 0 ? 1 : Math.min(1, (now - start) / length);
      const eased = easeInOutCubic(progress);
      const next = target.map((value, i) => (from[i] ?? value) + deltas[i]! * eased);
      current.current = next;
      setValues(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration, period]);

  return values;
}
