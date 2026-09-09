import type { FeedTab } from '@/types';
import { cn } from '@/utils/cn';

const tabs: { id: FeedTab; label: string }[] = [
  { id: 'products', label: '상품' },
  { id: 'reviews', label: '리뷰' },
];

interface FeedTabsProps {
  activeTab: FeedTab;
  onChange: (tab: FeedTab) => void;
}

export function FeedTabs({ activeTab, onChange }: FeedTabsProps) {
  return (
    <div className="feed-card mb-3">
      <div className="flex border-b border-ig-border">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'flex-1 py-3 text-sm font-semibold transition-colors',
              activeTab === id
                ? 'text-ig-text border-b border-ig-text -mb-px'
                : 'text-ig-text-secondary hover:text-ig-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
