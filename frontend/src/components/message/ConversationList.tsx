import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search, SquarePen, Users } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { formatMessageTime, getConversationDisplay, conversationRouteKey } from '@/utils/messages';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import type { Conversation } from '@/types';
import { cn } from '@/utils/cn';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationKey?: string;
  currentUserId: number;
  onSelect: (conversation: Conversation) => void;
  onNewMessage?: () => void;
}

function messagePreview(conversation: Conversation, currentUserId: number): string {
  const { last_message } = conversation;
  if (last_message.media_url && !last_message.content?.trim()) {
    return '첨부 파일을 보냈습니다';
  }
  if (last_message.content) {
    const isOwn = last_message.sender_id === currentUserId;
    return isOwn ? `보냄: ${last_message.content}` : last_message.content;
  }
  return '대화를 시작해보세요';
}

export function ConversationList({
  conversations,
  activeConversationKey,
  currentUserId,
  onSelect,
  onNewMessage,
}: ConversationListProps) {
  const { user } = useAuth();
  const { setCreateStoryOpen } = useApp();
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
    <div className="flex flex-col h-full bg-ig-surface">
      <div className="flex items-center justify-between px-4 py-[18px] shrink-0">
        <button
          type="button"
          className="flex items-center gap-1 text-[16px] font-bold text-ig-text hover:opacity-70"
          aria-label="계정"
        >
          {user?.username ?? '메시지'}
          <ChevronDown size={16} strokeWidth={2.5} />
        </button>
        {onNewMessage && (
          <button
            type="button"
            onClick={onNewMessage}
            className="p-1 hover:opacity-60"
            aria-label="새 메시지"
          >
            <SquarePen size={24} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="px-4 pb-3 shrink-0">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ig-text-secondary pointer-events-none"
          />
          <input
            type="text"
            placeholder="검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-ig-secondary rounded-lg text-[16px] placeholder:text-ig-text-secondary"
          />
        </div>
      </div>

      {user && (
        <div className="px-4 pb-4 shrink-0 overflow-x-auto hide-scrollbar">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCreateStoryOpen(true)}
              className="flex flex-col items-center gap-1 shrink-0 w-[56px]"
              aria-label="노트 작성"
            >
              <div className="relative">
                <Avatar src={user.avatar_url} alt={user.username} size="md" className="h-[56px] w-[56px]" />
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-2xl bg-ig-surface border border-ig-border px-2.5 py-1 text-[11px] text-ig-text shadow-sm after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:-bottom-1 after:border-8 after:border-transparent after:border-t-ig-border">
                  생각을 나누어 보세요...
                </span>
              </div>
              <span className="text-[12px] text-ig-text truncate w-full text-center">내 메모</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <span className="text-[16px] font-bold text-ig-text">메시지</span>
        <Link
          to="/settings/follow-requests"
          className="text-[14px] font-semibold text-ig-text hover:opacity-70"
        >
          요청
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredConversations.length === 0 ? (
          <p className="px-4 py-8 text-sm text-center text-ig-text-secondary">
            {query.trim() ? '검색 결과가 없습니다.' : '아직 대화가 없습니다.'}
          </p>
        ) : (
          filteredConversations.map((conversation) => {
            const { name, avatarUrl } = getConversationDisplay(conversation, currentUserId);
            const { last_message, unread_count } = conversation;
            const isActive = conversationRouteKey(conversation) === activeConversationKey;
            const preview = messagePreview(conversation, currentUserId);

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(conversation)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 hover:bg-ig-secondary transition-colors text-left',
                  isActive && 'bg-ig-secondary',
                )}
              >
                {conversation.is_group && !avatarUrl ? (
                  <div className="h-[56px] w-[56px] rounded-full bg-ig-secondary border border-ig-border flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-ig-text-secondary" />
                  </div>
                ) : (
                  <Avatar src={avatarUrl} alt={name} size="lg" className="h-[56px] w-[56px]" />
                )}
                <div className="flex-1 min-w-0 py-1">
                  <p className={cn('text-[14px] truncate', unread_count > 0 ? 'font-bold' : 'font-normal')}>
                    {name}
                  </p>
                  <p
                    className={cn(
                      'text-[14px] truncate',
                      unread_count > 0 ? 'text-ig-text font-semibold' : 'text-ig-text-secondary',
                    )}
                  >
                    {preview}
                    {last_message.content || last_message.media_url ? (
                      <span className="text-ig-text-secondary font-normal">
                        {' · '}
                        {formatMessageTime(last_message.created_at)}
                      </span>
                    ) : null}
                  </p>
                </div>
                {unread_count > 0 && (
                  <span className="h-2 w-2 rounded-full bg-ig-primary shrink-0" aria-hidden />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
