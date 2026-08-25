import { Link } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { MultilineText } from '@/components/common/MultilineText';
import { formatRelativeTime } from '@/utils/formatDate';
import type { Comment } from '@/types';

interface CommentListProps {
  comments: Comment[];
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <p className="text-sm text-ig-text-secondary text-center py-8">
        아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Link to={`/profile/${comment.user.username}`}>
            <Avatar src={comment.user.avatar_url} alt={comment.user.username} size="sm" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <Link to={`/profile/${comment.user.username}`} className="font-semibold mr-1 hover:underline">
                {comment.user.username}
              </Link>
              <MultilineText as="span">{comment.content}</MultilineText>
            </p>
            <div className="flex items-center gap-3 mt-1">
              <time className="text-[10px] text-ig-text-secondary">
                {formatRelativeTime(comment.created_at)}
              </time>
              <button className="text-[10px] text-ig-text-secondary font-semibold hover:text-ig-text">
                답글 달기
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
