import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ProfileHeader, type ProfileTab } from '@/components/profile/ProfileHeader';
import { ProfileGrid } from '@/components/profile/ProfileGrid';
import { ProfileSavedTab } from '@/components/profile/ProfileSavedTab';
import { ProfileReelsGrid } from '@/components/profile/ProfileReelsGrid';
import { ProfileTaggedGrid } from '@/components/profile/ProfileTaggedGrid';
import { FollowListModal } from '@/components/profile/FollowListModal';
import * as usersApi from '@/api/users';
import * as postsApi from '@/api/posts';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { useProfileMenu } from '@/contexts/ProfileMenuContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { Post, Reel, User } from '@/types';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { followUser, unfollowUser, setActiveReelIndex, setProfileReels } = useApp();
  const { requireAuth } = useRequireAuth();
  const { setProfileMenu } = useProfileMenu();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReels, setUserReels] = useState<Reel[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState<boolean | undefined>(undefined);
  const [requested, setRequested] = useState<boolean | undefined>(undefined);
  const [followBusy, setFollowBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [loading, setLoading] = useState(true);
  const [followListMode, setFollowListMode] = useState<'followers' | 'following' | null>(null);
  const [postsPage, setPostsPage] = useState(1);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [reelsPage, setReelsPage] = useState(1);
  const [reelsHasMore, setReelsHasMore] = useState(false);
  const [taggedPage, setTaggedPage] = useState(1);
  const [taggedHasMore, setTaggedHasMore] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'saved' || tab === 'reels' || tab === 'tagged' || tab === 'posts') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const user = await usersApi.getUserProfile(username);
        const [postsRes, reelsRes, taggedRes] = await Promise.all([
          usersApi.getUserPosts(username),
          usersApi.getUserReels(username),
          usersApi.getUserTaggedPosts(username),
        ]);
        if (cancelled) return;
        setProfileUser(user);
        setFollowing(user.is_following);
        setRequested(user.is_requested);
        setUserPosts(postsRes.items);
        setUserReels(reelsRes.items);
        setTaggedPosts(taggedRes.items);
        setPostsPage(1);
        setPostsHasMore(postsRes.next_page !== null);
        setReelsPage(1);
        setReelsHasMore(reelsRes.next_page !== null);
        setTaggedPage(1);
        setTaggedHasMore(taggedRes.next_page !== null);
        if (currentUser && username === currentUser.username) {
          const saved = await postsApi.getSavedPosts();
          if (!cancelled) setSavedPosts(saved.items);
        } else {
          setSavedPosts([]);
        }
        if (currentUser && user.id !== currentUser.id && isAuthenticated) {
          const status = await usersApi.getBlockStatus(user.id);
          if (!cancelled) setBlockedByMe(status.blocked_by_me);
        } else if (!cancelled) {
          setBlockedByMe(false);
        }
      } catch {
        if (!cancelled) setProfileUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, currentUser?.username, currentUser?.avatar_url, currentUser?.id, isAuthenticated]);

  useEffect(() => {
    const isOwnProfile =
      !!currentUser && !!profileUser && profileUser.username === currentUser.username;
    if (!profileUser || isOwnProfile) {
      setProfileMenu(null, null);
      return;
    }
    setProfileMenu(profileUser, {
      blockedByMe,
      onBlock: () =>
        requireAuth(async () => {
          await usersApi.blockUser(profileUser.id);
          setBlockedByMe(true);
          toast.success(`${profileUser.username}님을 차단했습니다.`);
        }),
      onUnblock: () =>
        requireAuth(async () => {
          await usersApi.unblockUser(profileUser.id);
          setBlockedByMe(false);
          toast.success(`${profileUser.username}님 차단을 해제했습니다.`);
        }),
      onReport: async (reason, details) => {
        await new Promise<void>((resolve, reject) => {
          requireAuth(async () => {
            try {
              await usersApi.reportUser(profileUser.id, reason, details);
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
      },
    });
    return () => setProfileMenu(null, null);
  }, [profileUser, currentUser, blockedByMe, requireAuth, setProfileMenu]);

  // Re-fetch the "저장됨" tab every time it's opened (not just on the initial
  // profile load) so a post saved/unsaved elsewhere in the app while this
  // profile page stayed mounted shows up immediately instead of only after a
  // full remount.
  useEffect(() => {
    if (activeTab !== 'saved') return;
    if (!currentUser || username !== currentUser.username) return;
    let cancelled = false;
    postsApi.getSavedPosts().then((saved) => {
      if (!cancelled) setSavedPosts(saved.items);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, username, currentUser?.username]);

  const loadMore = useCallback(async () => {
    if (!username) return;
    if (activeTab === 'posts' && postsHasMore) {
      const next = postsPage + 1;
      const res = await usersApi.getUserPosts(username, next);
      setUserPosts((prev) => [...prev, ...res.items]);
      setPostsPage(next);
      setPostsHasMore(res.next_page !== null);
    } else if (activeTab === 'reels' && reelsHasMore) {
      const next = reelsPage + 1;
      const res = await usersApi.getUserReels(username, next);
      setUserReels((prev) => [...prev, ...res.items]);
      setReelsPage(next);
      setReelsHasMore(res.next_page !== null);
    } else if (activeTab === 'tagged' && taggedHasMore) {
      const next = taggedPage + 1;
      const res = await usersApi.getUserTaggedPosts(username, next);
      setTaggedPosts((prev) => [...prev, ...res.items]);
      setTaggedPage(next);
      setTaggedHasMore(res.next_page !== null);
    }
  }, [activeTab, username, postsHasMore, postsPage, reelsHasMore, reelsPage, taggedHasMore, taggedPage]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="text-center py-16">
        <h2 className="text-[24px] font-light mb-2">죄송합니다. 페이지를 찾을 수 없습니다.</h2>
        <p className="text-ig-text-secondary text-[14px]">
          링크가 잘못되었거나 페이지가 삭제되었을 수 있습니다.
        </p>
      </div>
    );
  }

  const isOwn = !!currentUser && profileUser.username === currentUser.username;
  const isPrivateLocked = !!profileUser.is_private && !isOwn && !profileUser.is_following;
  const displayUser = {
    ...profileUser,
    avatar_url: isOwn ? (currentUser.avatar_url ?? profileUser.avatar_url) : profileUser.avatar_url,
    is_own_profile: isOwn,
    is_following: following ?? profileUser.is_following ?? false,
    is_requested: requested ?? profileUser.is_requested ?? false,
  };

  const handleFollow = () => {
    requireAuth(async () => {
      if (followBusy) return;
      const wasFollowing = following ?? profileUser.is_following ?? false;
      const wasRequested = requested ?? profileUser.is_requested ?? false;

      setFollowBusy(true);
      try {
        if (wasFollowing || wasRequested) {
          await unfollowUser(profileUser.id);
          setFollowing(false);
          setRequested(false);
          if (wasFollowing) {
            setProfileUser((prev) =>
              prev ? { ...prev, follower_count: Math.max(0, prev.follower_count - 1) } : prev,
            );
          }
        } else {
          const result = await followUser(profileUser.id);
          setFollowing(result.is_following);
          setRequested(result.is_requested);
          if (result.is_following) {
            setProfileUser((prev) =>
              prev ? { ...prev, follower_count: prev.follower_count + 1 } : prev,
            );
          }
        }
      } catch {
        toast.error('팔로우 상태를 변경하지 못했습니다.');
      } finally {
        setFollowBusy(false);
      }
    });
  };

  const handleReelClick = (index: number) => {
    setProfileReels(userReels);
    setActiveReelIndex(index);
  };

  return (
    <div>
      <ProfileHeader
        user={displayUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onFollow={handleFollow}
        onShowFollowers={() => {
          if (isPrivateLocked) {
            toast.error('비공개 계정입니다.');
            return;
          }
          setFollowListMode('followers');
        }}
        onShowFollowing={() => {
          if (isPrivateLocked) {
            toast.error('비공개 계정입니다.');
            return;
          }
          setFollowListMode('following');
        }}
        onBlock={
          !isOwn && !blockedByMe
            ? () =>
                requireAuth(async () => {
                  await usersApi.blockUser(profileUser.id);
                  setBlockedByMe(true);
                  toast.success(`${profileUser.username}님을 차단했습니다.`);
                })
            : undefined
        }
        onUnblock={
          !isOwn && blockedByMe
            ? () =>
                requireAuth(async () => {
                  await usersApi.unblockUser(profileUser.id);
                  setBlockedByMe(false);
                  toast.success(`${profileUser.username}님 차단을 해제했습니다.`);
                })
            : undefined
        }
        blockedByMe={blockedByMe}
        onReport={
          !isOwn
            ? async (reason, details) => {
                await usersApi.reportUser(profileUser.id, reason, details);
                toast.success('신고가 접수되었습니다.');
              }
            : undefined
        }
      />

      {activeTab === 'posts' && <ProfileGrid posts={userPosts} isOwn={isOwn} isPrivate={isPrivateLocked} />}
      {activeTab === 'reels' && (
        <ProfileReelsGrid reels={userReels} onReelClick={handleReelClick} isPrivate={isPrivateLocked} />
      )}
      {activeTab === 'saved' && isOwn && <ProfileSavedTab savedPosts={savedPosts} />}
      {activeTab === 'tagged' && <ProfileTaggedGrid posts={taggedPosts} isOwn={isOwn} />}

      <div ref={loadMoreRef} className="h-8" />

      {followListMode && (
        <FollowListModal
          isOpen
          onClose={() => setFollowListMode(null)}
          username={profileUser.username}
          mode={followListMode}
        />
      )}
    </div>
  );
}
