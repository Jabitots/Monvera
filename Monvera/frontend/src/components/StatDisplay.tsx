import React from 'react';
import { CountUpValue } from './MotionPrimitives';

interface StatDisplayProps {
  label: string;
  value: string | number;
  numericValue?: number;
  formatter?: (n: number) => string;
  detail?: string;
  accent?: 'forest' | 'sage' | 'sand';
}

export const StatDisplay: React.FC<StatDisplayProps> = ({
  label,
  value,
  numericValue,
  formatter,
  detail,
  accent = 'forest',
}) => {
  const accentColor =
    accent === 'sage'
      ? 'text-[var(--color-sage)]'
      : accent === 'sand'
        ? 'text-[#8B7344]'
        : 'text-[var(--color-forest)]';

  return (
    <div className="flex flex-col justify-between py-2">
      <span className="text-xs font-medium tracking-wide text-[var(--color-ink-subtle)]">
        {label}
      </span>
      <span
        className={`mt-2 text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums font-sans ${accentColor}`}
      >
        {numericValue !== undefined ? (
          <CountUpValue value={numericValue} formatter={formatter} />
        ) : (
          value
        )}
      </span>
      {detail ? (
        <span className="mt-1.5 text-xs text-[var(--color-ink-muted)] tabular-nums">
          {detail}
        </span>
      ) : null}
    </div>
  );
};
