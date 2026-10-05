const FILLED = '#FF6B00';
const EMPTY = '#E6E6E6';

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}

export function RatingStars({ value, onChange, size = 16 }: RatingStarsProps) {
  const stars = [1, 2, 3, 4, 5].map((star) => {
    const filled = star <= value;
    const color = filled ? FILLED : EMPTY;
    return (
      <svg key={star} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 2.7 14.8 8.4l6.3.9-4.6 4.4 1.1 6.3L12 17.1 6.4 20l1.1-6.3-4.6-4.4 6.3-.9L12 2.7z"
          fill={color}
          stroke={color}
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  });

  if (!onChange) {
    return (
      <div className="inline-flex items-center gap-0.5" role="img" aria-label={`${value}점`}>
        {stars}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="별점">
      {stars.map((star, index) => {
        const score = index + 1;
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={score === value}
            aria-label={`${score}점`}
            onClick={() => onChange(score)}
            className="p-0.5"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
