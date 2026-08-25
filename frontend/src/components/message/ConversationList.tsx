import { Avatar } from '@/components/common/Avatar';
import { formatMessageTime } from '@/utils/messages';
import { useAuth } from '@/hooks/useAuth';
import type { Conversation } from '@/types';
import { cn } from '@/utils/cn';

interface ConversationListProps {
  conversations: Conversation[];
  activeUsername?: string;
  currentUserId: number;
  onSelect: (username: string) => void;
}

export function ConversationList({
  conversations,
  activeUsername,
  currentUserId,
  onSelect,
}: ConversationListProps) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <div className="hidden md:flex items-center justify-between px-4 py-3 border-b border-ig-border shrink-0">
        <h1 className="text-base font-bold">{user?.username ?? '메시지'}</h1>
      </div>

      <div className="px-4 py-3 shrink-0">
        <input
          type="text"
          placeholder="검색"
          className="w-full px-4 py-2 bg-ig-secondary border border-ig-border rounded-lg text-[16px] placeholder:text-ig-text-secondary"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-4 py-8 text-sm text-center text-ig-text-secondary">
            아직 대화가 없습니다. 프로필에서 메시지를 보내보세요.
          </p>
        ) : (
          conversations.map((conversation) => {
            const { participant, last_message, unread_count } = conversation;
            const isActive = participant.username === activeUsername;
            const isOwnLast = last_message.sender_id === currentUserId;
            const preview = last_message.content
              ? `${isOwnLast ? '보냄: ' : ''}${last_message.content}`
              : '대화를 시작해보세요';

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(participant.username)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 hover:bg-ig-secondary transition-colors text-left',
                  isActive && 'bg-ig-secondary',
                )}
              >
                <Avatar src={participant.avatar_url} alt={participant.username} size="md" />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', unread_count > 0 ? 'font-bold' : 'font-normal')}>
                    {participant.username}
                  </p>
                  <p
                    className={cn(
                      'text-sm truncate',
                      unread_count > 0 ? 'text-ig-text font-semibold' : 'text-ig-text-secondary',
                    )}
                  >
                    {preview}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-ig-text-secondary">
                    {last_message.content ? formatMessageTime(last_message.created_at) : ''}
                  </span>
                  {unread_count > 0 && <span className="h-2 w-2 rounded-full bg-ig-primary" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
