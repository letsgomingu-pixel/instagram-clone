import { useNavigate } from 'react-router-dom';
import type { User } from '@/types';

interface TaggedUsersProps {
  users: User[];
  prefix?: string;
  className?: string;
}

function ProfileMention({ username, className = '' }: { username: string; className?: string }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/profile/${username}`);
      }}
      className={`font-semibold hover:underline inline p-0 border-0 bg-transparent cursor-pointer text-inherit ${className}`}
    >
      {username}
    </button>
  );
}

export function TaggedUsers({ users, prefix = 'with', className = '' }: TaggedUsersProps) {
  if (!users.length) return null;

  if (users.length === 1) {
    return (
      <span className={className}>
        {' '}
        {prefix}{' '}
        <ProfileMention username={users[0].username} />
      </span>
    );
  }

  if (users.length === 2) {
    return (
      <span className={className}>
        {' '}
        {prefix}{' '}
        <ProfileMention username={users[0].username} />
        {' '}and{' '}
        <ProfileMention username={users[1].username} />
      </span>
    );
  }

  return (
    <span className={className}>
      {' '}
      {prefix}{' '}
      <ProfileMention username={users[0].username} />
      {' '}and {users.length - 1} others
    </span>
  );
}
