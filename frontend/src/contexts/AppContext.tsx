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

import type { Comment, Post, Reel, Story, SuggestedUser, User } from '@/types';

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

  toggleFollow: (userId: number, isFollowing?: boolean) => void;

  followUser: (userId: number) => Promise<void>;

  unfollowUser: (userId: number) => Promise<void>;

  addComment: (postId: number, content: string) => void;

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



function patchUserFollowing(user: User, userId: number, isFollowing: boolean): User {

  return user.id === userId ? { ...user, is_following: isFollowing } : user;

}



export function AppProvider({ children }: { children: ReactNode }) {

  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);

  const [explorePosts, setExplorePosts] = useState<Post[]>([]);

  const [reels, setReels] = useState<Reel[]>([]);

  const [stories, setStories] = useState<Story[]>([]);

  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);

  const [loading, setLoading] = useState(true);

  const [feedPage, setFeedPage] = useState(1);

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



  const refreshSuggestedUsers = useCallback(async (limit = 10) => {
    try {
      const data = await usersApi.getSuggestedUsers(limit);
      setSuggestedUsers(data);
    } catch {
      setSuggestedUsers([]);
    }
  }, []);



  const syncFollowState = useCallback((userId: number, isFollowing: boolean) => {

    setSuggestedUsers((prev) => {
      if (isFollowing) {
        return prev.filter((u) => u.id !== userId);
      }
      return prev.map((u) => (u.id === userId ? { ...u, is_following: isFollowing } : u));
    });

    setPosts((prev) =>

      prev.map((p) =>

        p.user.id === userId ? { ...p, user: patchUserFollowing(p.user, userId, isFollowing) } : p,

      ),

    );

    setExplorePosts((prev) =>

      prev.map((p) =>

        p.user.id === userId ? { ...p, user: patchUserFollowing(p.user, userId, isFollowing) } : p,

      ),

    );

    setReels((prev) =>

      prev.map((r) =>

        r.user.id === userId ? { ...r, user: patchUserFollowing(r.user, userId, isFollowing) } : r,

      ),

    );

    setProfileReels((prev) =>

      prev.map((r) =>

        r.user.id === userId ? { ...r, user: patchUserFollowing(r.user, userId, isFollowing) } : r,

      ),

    );

    setSelectedPost((prev) =>

      prev?.user.id === userId

        ? { ...prev, user: patchUserFollowing(prev.user, userId, isFollowing) }

        : prev,

    );

  }, []);



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

      const data = await postsApi.getExplore(1, FEED_PAGE_SIZE);

      setPosts(data.items);

      setFeedPage(1);

      setFeedHasMore(data.next_page !== null);

      return;

    }

    const data = await postsApi.getFeed(1, FEED_PAGE_SIZE);

    setPosts(data.items);

    setFeedPage(1);

    setFeedHasMore(data.next_page !== null);

  }, [isAuthenticated]);



  const loadMoreFeed = useCallback(async () => {

    if (feedLoadingMore || !feedHasMore) return;

    setFeedLoadingMore(true);

    try {

      const nextPage = feedPage + 1;

      const data = isAuthenticated

        ? await postsApi.getFeed(nextPage, FEED_PAGE_SIZE)

        : await postsApi.getExplore(nextPage, FEED_PAGE_SIZE);

      setPosts((prev) => [...prev, ...data.items]);

      setFeedPage(nextPage);

      setFeedHasMore(data.next_page !== null);

    } finally {

      setFeedLoadingMore(false);

    }

  }, [isAuthenticated, feedLoadingMore, feedHasMore, feedPage]);



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

          ? postsApi.getFeed(1, FEED_PAGE_SIZE)

          : postsApi.getExplore(1, FEED_PAGE_SIZE);

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
        setFeedHasMore(feedRes.next_page !== null);
        setFeedPage(1);
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

      postsApi.toggleSave(postId).then(({ is_saved }) => {

        updatePostInState(postId, (p) => ({ ...p, is_saved }));

      });

    },

    [isAuthenticated, updatePostInState],

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



  const toggleFollow = useCallback(

    (userId: number, nextFollowing?: boolean) => {

      if (!isAuthenticated) return;

      if (nextFollowing !== undefined) {

        syncFollowState(userId, nextFollowing);

        return;

      }

      const currentlyFollowing = resolveFollowing(userId);

      const action = currentlyFollowing ? usersApi.unfollowUser : usersApi.followUser;

      void action(userId)
        .then(() => {
          syncFollowState(userId, !currentlyFollowing);
          void refreshSuggestedUsers(10);
        })
        .catch(() => {
          toast.error('팔로우 상태를 변경하지 못했습니다. 다시 시도해 주세요.');
        });

    },

    [isAuthenticated, resolveFollowing, syncFollowState, refreshSuggestedUsers],

  );



  const followUser = useCallback(

    async (userId: number) => {

      if (!isAuthenticated) return;

      await usersApi.followUser(userId);

      syncFollowState(userId, true);

    },

    [isAuthenticated, syncFollowState],

  );



  const unfollowUser = useCallback(

    async (userId: number) => {

      if (!isAuthenticated) return;

      await usersApi.unfollowUser(userId);

      syncFollowState(userId, false);

    },

    [isAuthenticated, syncFollowState],

  );



  const addComment = useCallback(

    (postId: number, content: string) => {

      if (!isAuthenticated || !user) return;

      postsApi.addComment(postId, content).then((newComment: Comment) => {

        updatePostInState(postId, (p) => ({

          ...p,

          comment_count: p.comment_count + 1,

          comments: [...(p.comments || []), newComment],

        }));

      });

    },

    [isAuthenticated, user, updatePostInState],

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

      toggleFollow,

      followUser,

      unfollowUser,

      addComment,

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

      toggleFollow,

      followUser,

      unfollowUser,

      addComment,

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


