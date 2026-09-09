import {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useMemo,

  useRef,

  useState,

  type ReactNode,

} from 'react';

import toast from 'react-hot-toast';

import type { FeedTab, Post, Reel, Story, SuggestedUser, User } from '@/types';

import * as postsApi from '@/api/posts';

import * as reelsApi from '@/api/reels';

import * as storiesApi from '@/api/stories';

import * as usersApi from '@/api/users';

import { useAuth } from '@/hooks/useAuth';



const FEED_PAGE_SIZE = 4;

const EXPLORE_PAGE_SIZE = 18;



interface AppContextValue {

  posts: Post[];

  explorePosts: Post[];

  reels: Reel[];

  stories: Story[];

  suggestedUsers: SuggestedUser[];

  loading: boolean;

  feedTab: FeedTab;

  setFeedTab: (tab: FeedTab) => void;

  feedHasMore: boolean;

  feedLoadingMore: boolean;

  exploreHasMore: boolean;

  exploreLoadingMore: boolean;

  refreshFeed: () => Promise<void>;

  loadMoreFeed: () => Promise<void>;

  refreshExplore: () => Promise<void>;

  loadMoreExplore: () => Promise<void>;

  refreshStories: () => Promise<void>;

  refreshReels: () => Promise<void>;

  refreshSuggestedUsers: (limit?: number) => Promise<void>;

  syncCurrentUserAvatar: (userId: number, avatarUrl?: string) => void;

  toggleLike: (postId: number) => void;

  toggleReelLike: (reelId: number) => void;

  toggleSave: (postId: number) => void;

  setPostSaved: (postId: number, isSaved: boolean) => void;

  toggleFollow: (userId: number, isFollowing?: boolean) => void;

  followUser: (userId: number) => Promise<{ is_following: boolean; is_requested: boolean }>;

  unfollowUser: (userId: number) => Promise<{ is_following: boolean; is_requested: boolean }>;

  addComment: (postId: number, content: string, parentId?: number | null) => void;

  deletePost: (postId: number) => Promise<void>;

  updatePost: (postId: number, data: { caption?: string | null; location?: string | null }) => Promise<void>;

  archivePost: (postId: number) => Promise<void>;

  unarchivePost: (postId: number) => Promise<void>;

  hidePost: (postId: number) => Promise<void>;

  reportPost: (postId: number, reason: string, details?: string) => Promise<void>;

  markStoryViewed: (storyId: number) => void;

  markReelViewed: (reelId: number) => void;

  selectedPost: Post | null;

  setSelectedPost: (post: Post | null) => void;

  isCreatePostOpen: boolean;

  setCreatePostOpen: (open: boolean) => void;

  isCreateStoryOpen: boolean;

  setCreateStoryOpen: (open: boolean) => void;

  activeStoryIndex: number | null;

  setActiveStoryIndex: (index: number | null) => void;

  activeReelIndex: number | null;

  setActiveReelIndex: (index: number | null) => void;

  profileReels: Reel[];

  setProfileReels: (reels: Reel[]) => void;

}



const AppContext = createContext<AppContextValue | null>(null);



function patchUserFollowStatus(
  user: User,
  userId: number,
  status: { is_following?: boolean; is_requested?: boolean },
): User {
  return user.id === userId ? { ...user, ...status } : user;
}



export function AppProvider({ children }: { children: ReactNode }) {

  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);

  const [explorePosts, setExplorePosts] = useState<Post[]>([]);

  const [reels, setReels] = useState<Reel[]>([]);

  const [stories, setStories] = useState<Story[]>([]);

  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);

  const [loading, setLoading] = useState(true);

  const [feedTab, setFeedTab] = useState<FeedTab>('products');

  const [feedPage, setFeedPage] = useState(1);

  const [feedCursor, setFeedCursor] = useState<string | null>(null);

  const [feedHasMore, setFeedHasMore] = useState(false);

  const [feedLoadingMore, setFeedLoadingMore] = useState(false);

  const [explorePage, setExplorePage] = useState(1);

  const [exploreHasMore, setExploreHasMore] = useState(false);

  const [exploreLoadingMore, setExploreLoadingMore] = useState(false);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const [isCreatePostOpen, setCreatePostOpen] = useState(false);

  const [isCreateStoryOpen, setCreateStoryOpen] = useState(false);

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);

  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);

  const [profileReels, setProfileReels] = useState<Reel[]>([]);

  const viewedReelsRef = useRef(new Set<number>());
  const feedTabInitializedRef = useRef(false);



  const refreshSuggestedUsers = useCallback(async (limit = 10) => {
    try {
      const data = await usersApi.getSuggestedUsers(limit);
      setSuggestedUsers(data);
    } catch {
      setSuggestedUsers([]);
    }
  }, []);



  const syncFollowStatus = useCallback(
    (userId: number, status: { is_following: boolean; is_requested: boolean }) => {
      setSuggestedUsers((prev) => {
        if (status.is_following) {
          return prev.filter((u) => u.id !== userId);
        }
        return prev.map((u) =>
          u.id === userId ? { ...u, is_following: status.is_following, is_requested: status.is_requested } : u,
        );
      });

      const patch = (user: User) => patchUserFollowStatus(user, userId, status);

      setPosts((prev) => prev.map((p) => (p.user.id === userId ? { ...p, user: patch(p.user) } : p)));
      setExplorePosts((prev) => prev.map((p) => (p.user.id === userId ? { ...p, user: patch(p.user) } : p)));
      setReels((prev) => prev.map((r) => (r.user.id === userId ? { ...r, user: patch(r.user) } : r)));
      setProfileReels((prev) => prev.map((r) => (r.user.id === userId ? { ...r, user: patch(r.user) } : r)));
      setSelectedPost((prev) => (prev?.user.id === userId ? { ...prev, user: patch(prev.user) } : prev));
    },
    [],
  );



  const syncCurrentUserAvatar = useCallback((userId: number, avatarUrl?: string) => {
    const patchUser = (user: User) =>
      user.id === userId ? { ...user, avatar_url: avatarUrl } : user;

    setPosts((prev) => prev.map((p) => ({ ...p, user: patchUser(p.user) })));
    setExplorePosts((prev) => prev.map((p) => ({ ...p, user: patchUser(p.user) })));
    setStories((prev) => prev.map((s) => ({ ...s, user: patchUser(s.user) })));
    setReels((prev) => prev.map((r) => ({ ...r, user: patchUser(r.user) })));
    setProfileReels((prev) => prev.map((r) => ({ ...r, user: patchUser(r.user) })));
    setSuggestedUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, avatar_url: avatarUrl } : u)),
    );
    setSelectedPost((prev) =>
      prev?.user.id === userId ? { ...prev, user: patchUser(prev.user) } : prev,
    );
  }, []);



  const refreshFeed = useCallback(async () => {

    if (!isAuthenticated) {

      const data = await postsApi.getExplore(1, FEED_PAGE_SIZE, feedTab);

      setPosts(data.items);

      setFeedPage(1);

      setFeedHasMore(data.next_page !== null);

      return;

    }

    const data = await postsApi.getFeed(1, FEED_PAGE_SIZE, null, feedTab);

    setPosts(data.items);

    setFeedPage(1);

    setFeedCursor(data.next_cursor ?? null);

    setFeedHasMore(data.next_cursor != null || data.next_page !== null);

  }, [isAuthenticated, feedTab]);



  const loadMoreFeed = useCallback(async () => {

    if (feedLoadingMore || !feedHasMore) return;

    setFeedLoadingMore(true);

    try {

      const data = isAuthenticated

        ? await postsApi.getFeed(feedPage + 1, FEED_PAGE_SIZE, feedCursor, feedTab)

        : await postsApi.getExplore(feedPage + 1, FEED_PAGE_SIZE, feedTab);

      setPosts((prev) => [...prev, ...data.items]);

      if (isAuthenticated) {
        setFeedCursor(data.next_cursor ?? null);
        setFeedHasMore(data.next_cursor != null || data.next_page !== null);
        setFeedPage((p) => p + 1);
      } else {
        setFeedPage((p) => p + 1);
        setFeedHasMore(data.next_page !== null);
      }

    } finally {

      setFeedLoadingMore(false);

    }

  }, [isAuthenticated, feedLoadingMore, feedHasMore, feedPage, feedCursor, feedTab]);



  useEffect(() => {
    if (authLoading) return;
    if (!feedTabInitializedRef.current) {
      feedTabInitializedRef.current = true;
      return;
    }
    void refreshFeed();
  }, [feedTab, authLoading, refreshFeed]);



  const refreshExplore = useCallback(async () => {

    const data = await postsApi.getExplore(1, EXPLORE_PAGE_SIZE);

    setExplorePosts(data.items);

    setExplorePage(1);

    setExploreHasMore(data.next_page !== null);

  }, []);



  const loadMoreExplore = useCallback(async () => {

    if (exploreLoadingMore || !exploreHasMore) return;

    setExploreLoadingMore(true);

    try {

      const nextPage = explorePage + 1;

      const data = await postsApi.getExplore(nextPage, EXPLORE_PAGE_SIZE);

      setExplorePosts((prev) => [...prev, ...data.items]);

      setExplorePage(nextPage);

      setExploreHasMore(data.next_page !== null);

    } finally {

      setExploreLoadingMore(false);

    }

  }, [exploreLoadingMore, exploreHasMore, explorePage]);



  const refreshStories = useCallback(async () => {

    if (!isAuthenticated) {

      setStories([]);

      return;

    }

    const data = await storiesApi.getStoriesFeed();

    setStories(data);

  }, [isAuthenticated]);



  const refreshReels = useCallback(async () => {

    const data = await reelsApi.getReelsFeed(1, 30);

    setReels(data.items);

  }, []);



  useEffect(() => {

    if (authLoading) return;

    let cancelled = false;

    (async () => {

      setLoading(true);

      viewedReelsRef.current.clear();

      try {

        const explore = postsApi.getExplore(1, EXPLORE_PAGE_SIZE);

        const reelsData = reelsApi.getReelsFeed(1, 30);

        const feed = isAuthenticated

          ? postsApi.getFeed(1, FEED_PAGE_SIZE, null, feedTab)

          : postsApi.getExplore(1, FEED_PAGE_SIZE, feedTab);

        const storiesData = isAuthenticated ? storiesApi.getStoriesFeed() : Promise.resolve([]);
        const suggestedData = usersApi.getSuggestedUsers(10);

        const [exploreRes, reelsRes, feedRes, storiesRes, suggestedRes] = await Promise.all([
          explore,
          reelsData,
          feed,
          storiesData,
          suggestedData,
        ]);

        if (cancelled) return;

        setExplorePosts(exploreRes.items);
        setExploreHasMore(exploreRes.next_page !== null);
        setExplorePage(1);
        setReels(reelsRes.items);
        setPosts(feedRes.items);
        setFeedHasMore(
          isAuthenticated
            ? feedRes.next_cursor != null || feedRes.next_page !== null
            : feedRes.next_page !== null,
        );
        setFeedPage(1);
        if (isAuthenticated) {
          setFeedCursor(feedRes.next_cursor ?? null);
        }
        setStories(storiesRes);
        setSuggestedUsers(suggestedRes);

      } catch {

        if (!cancelled) {

          setPosts([]);

          setExplorePosts([]);

          setReels([]);

          setStories([]);

          setSuggestedUsers([]);

          setFeedHasMore(false);

          setExploreHasMore(false);

        }

      } finally {

        if (!cancelled) setLoading(false);

      }

    })();

    return () => {

      cancelled = true;

    };

  }, [isAuthenticated, user?.id, authLoading]);



  const removePostFromState = useCallback((postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setExplorePosts((prev) => prev.filter((p) => p.id !== postId));
    setSelectedPost((prev) => (prev?.id === postId ? null : prev));
  }, []);

  const updatePostInState = useCallback((postId: number, updater: (p: Post) => Post) => {

    setPosts((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));

    setExplorePosts((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));

    setSelectedPost((prev) => (prev?.id === postId ? updater(prev) : prev));

  }, []);



  const toggleLike = useCallback(

    (postId: number) => {

      if (!isAuthenticated) return;

      let previous: Pick<Post, 'is_liked' | 'like_count'> | null = null;

      updatePostInState(postId, (p) => {

        previous = { is_liked: p.is_liked, like_count: p.like_count };

        return {

          ...p,

          is_liked: !p.is_liked,

          like_count: p.is_liked ? Math.max(0, p.like_count - 1) : p.like_count + 1,

        };

      });

      postsApi

        .toggleLike(postId)

        .then(({ is_liked, like_count }) => {

          updatePostInState(postId, (p) => ({ ...p, is_liked, like_count }));

        })

        .catch(() => {

          if (previous) {

            updatePostInState(postId, (p) => ({ ...p, ...previous! }));

          }

          toast.error('좋아요 처리에 실패했습니다.');

        });

    },

    [isAuthenticated, updatePostInState],

  );



  const toggleReelLike = useCallback(

    (reelId: number) => {

      if (!isAuthenticated) return;

      reelsApi.toggleReelLike(reelId).then(({ is_liked, like_count }) => {

        const update = (r: Reel) => (r.id === reelId ? { ...r, is_liked, like_count } : r);

        setReels((prev) => prev.map(update));

        setProfileReels((prev) => prev.map(update));

      });

    },

    [isAuthenticated],

  );



  const toggleSave = useCallback(
    (postId: number) => {
      if (!isAuthenticated) return;
      let previous: boolean | null = null;
      // Optimistic like toggleLike above: flip immediately, roll back + toast on failure,
      // instead of waiting for the round-trip and failing silently.
      updatePostInState(postId, (p) => {
        previous = p.is_saved;
        return { ...p, is_saved: !p.is_saved };
      });
      postsApi
        .toggleSave(postId)
        .then(({ is_saved }) => {
          updatePostInState(postId, (p) => ({ ...p, is_saved }));
        })
        .catch(() => {
          if (previous !== null) {
            updatePostInState(postId, (p) => ({ ...p, is_saved: previous! }));
          }
          toast.error('저장 처리에 실패했습니다.');
        });
    },
    [isAuthenticated, updatePostInState],
  );

  const setPostSaved = useCallback(
    (postId: number, isSaved: boolean) => {
      updatePostInState(postId, (p) => ({ ...p, is_saved: isSaved }));
    },
    [updatePostInState],
  );

  const resolveFollowing = useCallback(

    (userId: number): boolean => {

      const fromSuggested = suggestedUsers.find((u) => u.id === userId);

      if (fromSuggested) return !!fromSuggested.is_following;

      const fromPost = posts.find((p) => p.user.id === userId)?.user.is_following;

      if (fromPost !== undefined) return fromPost;

      const fromReel = reels.find((r) => r.user.id === userId)?.user.is_following;

      return fromReel ?? false;

    },

    [suggestedUsers, posts, reels],

  );



  const resolveRequested = useCallback(
    (userId: number): boolean => {
      const fromSuggested = suggestedUsers.find((u) => u.id === userId);
      if (fromSuggested) return !!fromSuggested.is_requested;
      const fromPost = posts.find((p) => p.user.id === userId)?.user.is_requested;
      if (fromPost !== undefined) return fromPost;
      const fromReel = reels.find((r) => r.user.id === userId)?.user.is_requested;
      return fromReel ?? false;
    },
    [suggestedUsers, posts, reels],
  );

  const toggleFollow = useCallback(

    (userId: number, nextFollowing?: boolean) => {

      if (!isAuthenticated) return;

      if (nextFollowing !== undefined) {

        syncFollowStatus(userId, { is_following: nextFollowing, is_requested: false });

        return;

      }

      const currentlyFollowing = resolveFollowing(userId);
      const currentlyRequested = resolveRequested(userId);

      if (currentlyFollowing || currentlyRequested) {
        syncFollowStatus(userId, { is_following: false, is_requested: false });
        void usersApi.unfollowUser(userId)
          .then(() => refreshSuggestedUsers(10))
          .catch(() => {
            syncFollowStatus(userId, {
              is_following: currentlyFollowing,
              is_requested: currentlyRequested,
            });
            toast.error('팔로우 상태를 변경하지 못했습니다. 다시 시도해 주세요.');
          });
        return;
      }

      syncFollowStatus(userId, { is_following: false, is_requested: true });

      void usersApi.followUser(userId)
        .then(({ is_following, is_requested }) => {
          syncFollowStatus(userId, { is_following, is_requested });
          void refreshSuggestedUsers(10);
        })
        .catch(() => {
          syncFollowStatus(userId, { is_following: false, is_requested: false });
          toast.error('팔로우 상태를 변경하지 못했습니다. 다시 시도해 주세요.');
        });

    },

    [isAuthenticated, resolveFollowing, resolveRequested, syncFollowStatus, refreshSuggestedUsers],

  );



  const followUser = useCallback(
    async (userId: number) => {
      if (!isAuthenticated) return { is_following: false, is_requested: false };
      const result = await usersApi.followUser(userId);
      syncFollowStatus(userId, result);
      return result;
    },
    [isAuthenticated, syncFollowStatus],
  );

  const unfollowUser = useCallback(
    async (userId: number) => {
      if (!isAuthenticated) return { is_following: false, is_requested: false };
      const result = await usersApi.unfollowUser(userId);
      syncFollowStatus(userId, result);
      return result;
    },
    [isAuthenticated, syncFollowStatus],
  );



  const addComment = useCallback(

    (postId: number, content: string, parentId?: number | null) => {

      if (!isAuthenticated || !user) return;

      postsApi.addComment(postId, content, parentId).then(() => {

        postsApi.getPostComments(postId).then((res) => {

          updatePostInState(postId, (p) => ({

            ...p,

            comments: res.items,

          }));

        });

      });

    },

    [isAuthenticated, user, updatePostInState],

  );



  const deletePost = useCallback(
    async (postId: number) => {
      if (!isAuthenticated) return;
      await postsApi.deletePost(postId);
      removePostFromState(postId);
    },
    [isAuthenticated, removePostFromState],
  );

  const updatePost = useCallback(
    async (postId: number, data: { caption?: string | null; location?: string | null }) => {
      if (!isAuthenticated) return;
      const updated = await postsApi.updatePost(postId, data);
      updatePostInState(postId, () => updated);
    },
    [isAuthenticated, updatePostInState],
  );

  const archivePost = useCallback(
    async (postId: number) => {
      if (!isAuthenticated) return;
      await postsApi.archivePost(postId);
      removePostFromState(postId);
    },
    [isAuthenticated, removePostFromState],
  );

  const unarchivePost = useCallback(
    async (postId: number) => {
      if (!isAuthenticated) return;
      await postsApi.unarchivePost(postId);
    },
    [isAuthenticated],
  );

  const hidePost = useCallback(
    async (postId: number) => {
      if (!isAuthenticated) return;
      await postsApi.hidePost(postId);
      removePostFromState(postId);
    },
    [isAuthenticated, removePostFromState],
  );

  const reportPost = useCallback(
    async (postId: number, reason: string, details?: string) => {
      if (!isAuthenticated) return;
      await postsApi.reportPost(postId, reason, details);
    },
    [isAuthenticated],
  );



  const markStoryViewed = useCallback(

    (storyId: number) => {

      if (!isAuthenticated) return;

      storiesApi.markStoryViewed(storyId).catch(() => undefined);

      setStories((prev) => prev.map((s) => (s.id === storyId ? { ...s, viewed: true } : s)));

    },

    [isAuthenticated],

  );



  const markReelViewed = useCallback(

    (reelId: number) => {

      if (!isAuthenticated || viewedReelsRef.current.has(reelId)) return;

      viewedReelsRef.current.add(reelId);

      reelsApi.viewReel(reelId).catch(() => {

        viewedReelsRef.current.delete(reelId);

      });

    },

    [isAuthenticated],

  );



  const value = useMemo(

    () => ({

      posts,

      explorePosts,

      reels,

      stories,

      suggestedUsers,

      loading,

      feedTab,

      setFeedTab,

      feedHasMore,

      feedLoadingMore,

      exploreHasMore,

      exploreLoadingMore,

      refreshFeed,

      loadMoreFeed,

      refreshExplore,

      loadMoreExplore,

      refreshStories,

      refreshReels,

      refreshSuggestedUsers,

      syncCurrentUserAvatar,

      toggleLike,

      toggleReelLike,

      toggleSave,

      setPostSaved,

      toggleFollow,

      followUser,

      unfollowUser,

      addComment,

      deletePost,

      updatePost,

      archivePost,

      unarchivePost,

      hidePost,

      reportPost,

      markStoryViewed,

      markReelViewed,

      selectedPost,

      setSelectedPost,

      isCreatePostOpen,

      setCreatePostOpen,

      isCreateStoryOpen,

      setCreateStoryOpen,

      activeStoryIndex,

      setActiveStoryIndex,

      activeReelIndex,

      setActiveReelIndex,

      profileReels,

      setProfileReels,

    }),

    [

      posts,

      explorePosts,

      reels,

      stories,

      suggestedUsers,

      loading,

      feedTab,

      feedHasMore,

      feedLoadingMore,

      exploreHasMore,

      exploreLoadingMore,

      refreshFeed,

      loadMoreFeed,

      refreshExplore,

      loadMoreExplore,

      refreshStories,

      refreshReels,

      refreshSuggestedUsers,

      syncCurrentUserAvatar,

      toggleLike,

      toggleReelLike,

      toggleSave,

      setPostSaved,

      toggleFollow,

      followUser,

      unfollowUser,

      addComment,

      deletePost,

      updatePost,

      archivePost,

      unarchivePost,

      hidePost,

      reportPost,

      markStoryViewed,

      markReelViewed,

      selectedPost,

      isCreatePostOpen,

      isCreateStoryOpen,

      activeStoryIndex,

      activeReelIndex,

      profileReels,

    ],

  );



  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;

}



export function useApp() {

  const ctx = useContext(AppContext);

  if (!ctx) throw new Error('useApp must be used within AppProvider');

  return ctx;

}


