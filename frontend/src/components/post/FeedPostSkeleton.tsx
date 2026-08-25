export function FeedPostSkeleton() {
  return (
    <div className="feed-card animate-pulse">
      <div className="flex items-center gap-3 px-4 py-[14px]">
        <div className="h-8 w-8 rounded-full bg-ig-secondary" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-ig-secondary" />
        </div>
      </div>
      <div className="aspect-square bg-ig-secondary" />
      <div className="px-4 py-3 space-y-3">
        <div className="flex gap-4">
          <div className="h-6 w-6 rounded bg-ig-secondary" />
          <div className="h-6 w-6 rounded bg-ig-secondary" />
          <div className="h-6 w-6 rounded bg-ig-secondary" />
        </div>
        <div className="h-3 w-20 rounded bg-ig-secondary" />
        <div className="h-3 w-full rounded bg-ig-secondary" />
        <div className="h-3 w-2/3 rounded bg-ig-secondary" />
      </div>
    </div>
  );
}
