import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ProfileHeader, type ProfileTab } from '@/components/profile/ProfileHeader';
import { ProfileGrid } from '@/components/profile/ProfileGrid';
import { ProfileReelsGrid } from '@/components/profile/ProfileReelsGrid';
import { ProfileTaggedGrid } from '@/components/profile/ProfileTaggedGrid';
import * as usersApi from '@/api/users';
import * as postsApi from '@/api/posts';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { Post, Reel, User } from '@/types';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const { followUser, unfollowUser, setActiveReelIndex, setProfileReels } = useApp();
  const { requireAuth } = useRequireAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReels, setUserReels] = useState<Reel[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState<boolean | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [loading, setLoading] = useState(true);

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
        setUserPosts(postsRes.items);
        setUserReels(reelsRes.items);
        setTaggedPosts(taggedRes.items);
        if (currentUser && username === currentUser.username) {
          const saved = await postsApi.getSavedPosts();
          if (!cancelled) setSavedPosts(saved.items);
        } else {
          setSavedPosts([]);
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
  }, [username, currentUser?.username, currentUser?.avatar_url]);

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
  const displayUser = {
    ...profileUser,
    avatar_url: isOwn ? (currentUser.avatar_url ?? profileUser.avatar_url) : profileUser.avatar_url,
    is_own_profile: isOwn,
    is_following: following ?? profileUser.is_following ?? false,
  };

  const handleFollow = () => {
    requireAuth(async () => {
      const next = !(following ?? profileUser.is_following);
      if (next) await followUser(profileUser.id);
      else await unfollowUser(profileUser.id);
      setFollowing(next);
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
      />

      {activeTab === 'posts' && <ProfileGrid posts={userPosts} />}
      {activeTab === 'reels' && (
        <ProfileReelsGrid reels={userReels} onReelClick={handleReelClick} />
      )}
      {activeTab === 'saved' && <ProfileGrid posts={savedPosts} savedOnly />}
      {activeTab === 'tagged' && <ProfileTaggedGrid posts={taggedPosts} />}
    </div>
  );
}
