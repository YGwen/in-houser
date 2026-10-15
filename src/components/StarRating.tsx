import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { Rank } from '../types';

interface Props {
  value: Rank;
  onChange: (rank: Rank) => void;
}

const STARS = [1, 2, 3, 4, 5];
const MIN = 1;
const MAX = 5;

const clamp = (r: number) => Math.min(MAX, Math.max(MIN, r));

/**
 * Five clickable stars with half-star precision: the left half of a star picks x.5, the right half x.
 * Half stars are drawn by clipping a gold star over a grey one, so they render the same on every device.
 */
export default function StarRating({ value, onChange }: Props) {
  const [hover, setHover] = useState<Rank | null>(null);
  const shown = hover ?? value;

  const rankAt = (e: MouseEvent<HTMLSpanElement>, star: number) => {
    const box = e.currentTarget.getBoundingClientRect();
    return clamp(e.clientX - box.left < box.width / 2 ? star - 0.5 : star);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    const next = {
      ArrowRight: value + 0.5,
      ArrowUp: value + 0.5,
      ArrowLeft: value - 0.5,
      ArrowDown: value - 0.5,
      Home: MIN,
      End: MAX,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(clamp(next));
  };

  return (
    <span
      className="star-rating"
      role="slider"
      tabIndex={0}
      aria-label="Skill"
      aria-valuemin={MIN}
      aria-valuemax={MAX}
      aria-valuenow={value}
      aria-valuetext={`${value} star${value === 1 ? '' : 's'}`}
      title={`${value} / 5 — click the left half of a star for a half star`}
      onKeyDown={onKeyDown}
      onMouseLeave={() => setHover(null)}
    >
      {STARS.map((star) => {
        const fill = shown >= star ? 100 : shown >= star - 0.5 ? 50 : 0;
        return (
          <span
            key={star}
            className="star"
            onMouseMove={(e) => setHover(rankAt(e, star))}
            onClick={(e) => onChange(rankAt(e, star))}
          >
            <span className="star-empty" aria-hidden>
              ★
            </span>
            <span className="star-fill" style={{ width: `${fill}%` }} aria-hidden>
              ★
            </span>
          </span>
        );
      })}
    </span>
  );
}
