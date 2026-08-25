import { useCallback, useEffect, useState } from 'react';
import { SuggestedUsersList } from '@/components/layout/SuggestedUsersList';
import { useApp } from '@/contexts/AppContext';

export function SuggestedUsersPage() {
  const { refreshSuggestedUsers } = useApp();
  const [loading, setLoading] = useState(true);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      await refreshSuggestedUsers(20);
    } finally {
      setLoading(false);
    }
  }, [refreshSuggestedUsers]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  return (
    <div>
      <div className="hidden md:flex items-center gap-3 mb-6 px-1">
        <h1 className="text-base font-semibold">회원님을 위한 추천</h1>
      </div>

      {loading ? (
        <div className="feed-card p-4 space-y-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-ig-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 rounded bg-ig-secondary" />
                <div className="h-2.5 w-20 rounded bg-ig-secondary" />
              </div>
              <div className="h-7 w-14 rounded bg-ig-secondary" />
            </div>
          ))}
        </div>
      ) : (
        <div className="feed-card p-4">
          <SuggestedUsersList refreshLimit={20} />
        </div>
      )}
    </div>
  );
}
