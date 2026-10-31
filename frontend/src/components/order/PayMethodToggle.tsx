export type PayMethod = 'card' | 'bank';

interface PayMethodToggleProps {
  value: PayMethod;
  onChange: (value: PayMethod) => void;
}

export function PayMethodToggle({ value, onChange }: PayMethodToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="결제 수단">
      {(
        [
          ['card', '카드 결제'],
          ['bank', '계좌이체'],
        ] as const
      ).map(([key, label]) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(key)}
            className={`h-10 rounded-lg text-sm font-semibold border ${
              selected
                ? 'bg-ig-primary text-white border-ig-primary'
                : 'bg-white text-ig-text border-ig-border'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
