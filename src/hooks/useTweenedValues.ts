import { useEffect, useRef, useState } from "react";

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Animates each number in `target` from its current value. `target` must keep a stable identity between renders. */
export function useTweenedValues(target: number[], duration: number) {
  const [values, setValues] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    const length = prefersReducedMotion() ? 0 : duration;
    let start: number | null = null;
    let frame = requestAnimationFrame(function step(now) {
      start ??= now;
      const progress = length === 0 ? 1 : Math.min(1, (now - start) / length);
      const eased = easeInOutCubic(progress);
      const next = target.map((value, i) => {
        const previous = from[i] ?? value;
        return previous + (value - previous) * eased;
      });
      current.current = next;
      setValues(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return values;
}
