import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { Spinner } from '@/components/common/Spinner';
import * as postsApi from '@/api/posts';
import type { User } from '@/types';

interface LikeListModalProps {
  postId: number;
  likeCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export function LikeListModal({ postId, likeCount, isOpen, onClose }: LikeListModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    postsApi
      .getPostLikes(postId)
      .then((data) => setUsers(data.items))
      .finally(() => setLoading(false));
  }, [isOpen, postId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="w-[400px] max-w-[95vw]">
        <div className="flex items-center justify-center border-b border-ig-border h-[42px] relative">
          <h2 className="text-base font-semibold">좋아요</h2>
          <button onClick={onClose} className="absolute right-3 text-sm" aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-ig-text-secondary text-center py-12">
              좋아요 {likeCount.toLocaleString()}개
            </p>
          ) : (
            users.map((user) => (
              <Link
                key={user.id}
                to={`/profile/${user.username}`}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 hover:bg-ig-secondary"
              >
                <Avatar src={user.avatar_url} alt={user.username} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{user.username}</p>
                  {user.full_name && (
                    <p className="text-xs text-ig-text-secondary truncate">{user.full_name}</p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
