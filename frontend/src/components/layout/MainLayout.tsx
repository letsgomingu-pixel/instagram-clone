import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MobileHeader } from './Header';
import { SuggestionsPanel } from './SuggestionsPanel';
import { SiteFooter } from './SiteFooter';
import { MessagesPill } from './MessagesPill';
import { PostModal } from '@/components/post/PostModal';
import { CreatePostModal } from '@/components/post/CreatePost';
import { CreateStoryModal } from '@/components/story/CreateStory';
import { StoryViewer } from '@/components/story/StoryViewer';
import { ReelsViewer } from '@/components/reels/ReelsViewer';
import { LeftSlidePanel } from '@/components/layout/LeftSlidePanel';
import { NotificationsContent } from '@/components/notifications/NotificationsContent';
import { useApp } from '@/contexts/AppContext';
import { useMobileChrome } from '@/hooks/useMobileChrome';
import { cn } from '@/utils/cn';

interface MainLayoutProps {
  showSuggestions?: boolean;
}

export function MainLayout({ showSuggestions = true }: MainLayoutProps) {
  const location = useLocation();
  const chrome = useMobileChrome(location.pathname);

  const isHome = location.pathname === '/';
  const isSuggested = location.pathname === '/suggested';
  const isExplore =
    location.pathname === '/explore' ||
    location.pathname === '/search' ||
    location.pathname.startsWith('/explore/');
  const isReels = location.pathname === '/reels' || location.pathname.startsWith('/reels/');
  const isMessages = location.pathname.startsWith('/messages');
  const isNotifications = location.pathname.startsWith('/notifications');
  const isSettings = location.pathname.startsWith('/settings');
  const isProfile = location.pathname.startsWith('/profile/');
  const showSidebar =
    showSuggestions &&
    !isExplore &&
    !isReels &&
    !isMessages &&
    !isNotifications &&
    !isSettings &&
    !isSuggested &&
    !isProfile;

  const {
    selectedPost,
    postModalFocusComments,
    setSelectedPost,
    isNotificationsPanelOpen,
    setNotificationsPanelOpen,
    isCreatePostOpen,
    setCreatePostOpen,
    isCreateStoryOpen,
    setCreateStoryOpen,
    activeStoryIndex,
    setActiveStoryIndex,
    activeReelIndex,
    setActiveReelIndex,
    profileReels,
  } = useApp();

  const slidePanelOpen = isNotificationsPanelOpen;

  return (
    <div className="min-h-full bg-ig-bg flex flex-col">
      <Sidebar />
      {chrome.showHeader && <MobileHeader config={chrome} />}

      <div
        className={cn(
          'flex-1 flex flex-col transition-[margin] duration-200',
          slidePanelOpen
            ? 'md:ml-[calc(var(--sidebar-width)+var(--slide-panel-width))]'
            : 'md:ml-[var(--sidebar-width)]',
          chrome.showBottomNav && 'mobile-content-with-bottom-nav',
        )}
      >
        <div
          className={cn(
            'mx-auto flex flex-1 w-full justify-center gap-8 px-0 md:px-4',
            isExplore || isReels || isMessages || isSettings ? 'max-w-full' : 'max-w-[935px]',
          )}
        >
          <main
            className={cn(
              'w-full',
              isHome ? 'pt-0 md:pt-[30px]' : 'md:pt-8',
              isExplore || isReels || isMessages || isSettings || isProfile
                ? 'max-w-[935px]'
                : isNotifications
                  ? 'max-w-[600px]'
                  : 'max-w-[470px]',
            )}
          >
            <Outlet />
          </main>
          {showSidebar && <SuggestionsPanel />}
        </div>

        {showSidebar && (
          <div className="hidden xl:flex justify-center py-8 px-4">
            <SiteFooter className="max-w-[935px]" />
          </div>
        )}
      </div>

      {chrome.showBottomNav && <BottomNav />}
      <MessagesPill />

      {selectedPost && (
        <PostModal
          post={selectedPost}
          focusComments={postModalFocusComments}
          onClose={() => setSelectedPost(null)}
        />
      )}
      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setCreatePostOpen(false)} />
      <CreateStoryModal isOpen={isCreateStoryOpen} onClose={() => setCreateStoryOpen(false)} />
      {activeStoryIndex !== null && (
        <StoryViewer initialIndex={activeStoryIndex} onClose={() => setActiveStoryIndex(null)} />
      )}
      {activeReelIndex !== null && profileReels.length > 0 && (
        <ReelsViewer
          reels={profileReels}
          initialIndex={activeReelIndex}
          onClose={() => setActiveReelIndex(null)}
        />
      )}

      <LeftSlidePanel
        isOpen={isNotificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
        title="알림"
      >
        <NotificationsContent
          variant="panel"
          onClose={() => setNotificationsPanelOpen(false)}
        />
      </LeftSlidePanel>

    </div>
  );
}
