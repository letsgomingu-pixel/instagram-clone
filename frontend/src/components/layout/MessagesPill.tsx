import { Link, useLocation } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { NavMessagesIcon } from '@/components/post/PostActionIcons';
import { useAuth } from '@/hooks/useAuth';

/** Instagram desktop floating messages shortcut (bottom-right). */
export function MessagesPill() {
  const { pathname } = useLocation();
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || pathname.startsWith('/messages')) return null;

  return (
    <Link
      to="/messages"
      className="hidden md:flex fixed bottom-6 right-6 z-30 items-center gap-2 rounded-full border border-ig-border bg-ig-surface px-4 py-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-shadow"
      aria-label="메시지"
    >
      <NavMessagesIcon />
      <span className="text-[14px] font-semibold">메시지</span>
      {user?.avatar_url && (
        <Avatar src={user.avatar_url} alt="" size="xs" className="ml-1" />
      )}
    </Link>
  );
}
