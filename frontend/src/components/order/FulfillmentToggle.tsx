export type FulfillmentType = 'delivery' | 'pickup';

interface FulfillmentToggleProps {
  value: FulfillmentType;
  onChange: (value: FulfillmentType) => void;
}

export function FulfillmentToggle({ value, onChange }: FulfillmentToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="수령 방법">
      {(
        [
          ['delivery', '배송'],
          ['pickup', '포장'],
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
