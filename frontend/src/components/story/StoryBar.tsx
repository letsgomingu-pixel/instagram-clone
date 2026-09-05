import { Plus } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export function StoryBar() {
  const { stories, setActiveStoryIndex, setCreateStoryOpen } = useApp();
  const { user, isAuthenticated } = useAuth();
  const { requireAuth } = useRequireAuth();

  const ownStoryIndex = user
    ? stories.findIndex((story) => story.user.username === user.username)
    : -1;

  const handleViewOwnStory = () => {
    requireAuth(() => {
      if (ownStoryIndex >= 0) {
        setActiveStoryIndex(ownStoryIndex);
      }
    });
  };

  const handleCreateStory = () => {
    requireAuth(() => setCreateStoryOpen(true));
  };

  const otherStories = stories.filter((story) => story.user.username !== user?.username);

  return (
    <div className="feed-card">
      <div className="flex gap-3 md:gap-4 px-4 py-[14px] overflow-x-auto hide-scrollbar">
        {isAuthenticated && user && (
          <div className="flex flex-col items-center gap-1 shrink-0 w-[66px]">
            <div className="relative">
              <button
                type="button"
                onClick={handleViewOwnStory}
                disabled={ownStoryIndex < 0}
                className="disabled:cursor-default"
                aria-label="오늘 입고 보기"
              >
                <Avatar
                  src={user.avatar_url}
                  alt={user.username}
                  size="lg"
                  hasStory={ownStoryIndex >= 0}
                  viewed={ownStoryIndex >= 0 ? stories[ownStoryIndex]?.viewed : false}
                  className="h-[56px] w-[56px]"
                />
              </button>
              <button
                type="button"
                onClick={handleCreateStory}
                aria-label="입고 소식 추가"
                className="absolute bottom-0 right-0 flex h-[20px] w-[20px] items-center justify-center rounded-full border-2 border-white bg-ig-primary text-white"
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            </div>
            <span className="text-[12px] text-ig-text truncate w-full text-center leading-[14px]">
              오늘 입고
            </span>
          </div>
        )}

        {otherStories.map((story) => {
          const index = stories.findIndex((s) => s.id === story.id);
          return (
            <button
              key={story.id}
              type="button"
              onClick={() => setActiveStoryIndex(index)}
              className="flex flex-col items-center gap-1 shrink-0 w-[66px]"
              aria-label={`${story.user.username}의 입고 소식 보기`}
            >
              <Avatar
                src={story.user.avatar_url}
                alt={story.user.username}
                size="lg"
                hasStory
                viewed={story.viewed}
                className="h-[56px] w-[56px]"
              />
              <span className="text-[12px] text-ig-text truncate w-full text-center leading-[14px]">
                {story.user.username.length > 10
                  ? `${story.user.username.slice(0, 9)}…`
                  : story.user.username}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
