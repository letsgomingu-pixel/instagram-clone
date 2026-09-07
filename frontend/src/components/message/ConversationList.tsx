import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { formatMessageTime, getConversationDisplay, conversationRouteKey } from '@/utils/messages';
import { useAuth } from '@/hooks/useAuth';
import type { Conversation } from '@/types';
import { cn } from '@/utils/cn';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationKey?: string;
  currentUserId: number;
  onSelect: (conversation: Conversation) => void;
  onNewGroup?: () => void;
}

export function ConversationList({
  conversations,
  activeConversationKey,
  currentUserId,
  onSelect,
  onNewGroup,
}: ConversationListProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      if (c.is_group) {
        if (c.title?.toLowerCase().includes(q)) return true;
        return c.participants.some(
          (p) => p.username.toLowerCase().includes(q) || p.full_name.toLowerCase().includes(q),
        );
      }
      const participant = c.participant;
      if (!participant) return false;
      return (
        participant.username.toLowerCase().includes(q) ||
        participant.full_name.toLowerCase().includes(q)
      );
    });
  }, [conversations, query]);

  return (
    <div className="flex flex-col h-full">
      <div className="hidden md:flex items-center justify-between px-4 py-3 border-b border-ig-border shrink-0">
        <h1 className="text-base font-bold">{user?.username ?? '메시지'}</h1>
        {onNewGroup && (
          <button
            type="button"
            onClick={onNewGroup}
            className="text-xs font-semibold text-ig-primary hover:underline"
          >
            새 그룹
          </button>
        )}
      </div>

      <div className="px-4 py-3 shrink-0">
        <input
          type="text"
          placeholder="검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 bg-ig-secondary border border-ig-border rounded-lg text-[16px] placeholder:text-ig-text-secondary"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <p className="px-4 py-8 text-sm text-center text-ig-text-secondary">
            {query.trim() ? '검색 결과가 없습니다.' : '아직 대화가 없습니다. 프로필에서 메시지를 보내보세요.'}
          </p>
        ) : (
          filteredConversations.map((conversation) => {
            const { name, avatarUrl } = getConversationDisplay(conversation, currentUserId);
            const { last_message, unread_count } = conversation;
            const isActive = conversationRouteKey(conversation) === activeConversationKey;
            const isOwnLast = last_message.sender_id === currentUserId;
            const preview = last_message.content
              ? `${isOwnLast ? '보냄: ' : ''}${last_message.content}`
              : '대화를 시작해보세요';

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(conversation)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 hover:bg-ig-secondary transition-colors text-left',
                  isActive && 'bg-ig-secondary',
                )}
              >
                {conversation.is_group && !avatarUrl ? (
                  <div className="h-11 w-11 rounded-full bg-ig-secondary border border-ig-border flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-ig-text-secondary" />
                  </div>
                ) : (
                  <Avatar src={avatarUrl} alt={name} size="md" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', unread_count > 0 ? 'font-bold' : 'font-normal')}>
                    {name}
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
