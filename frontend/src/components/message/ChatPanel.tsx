import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Info, Phone, Users, Video } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { NavIcon } from '@/components/post/PostActionIcons';
import { formatChatTime, getConversationDisplay } from '@/utils/messages';
import { useAuth } from '@/hooks/useAuth';
import type { Conversation, Message, User } from '@/types';
import { cn } from '@/utils/cn';

interface ChatPanelProps {
  conversation: Conversation | null;
  loading?: boolean;
  onSend: (content: string) => Promise<void>;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function ChatPanel({ conversation, loading = false, onSend, onBack, showBackButton }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setDraft('');
    } catch {
      // Keep what the user typed instead of clearing it — onSend already
      // surfaces the failure toast, but silently discarding the message text
      // on top of that meant re-typing it from scratch.
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
      </div>
    );
  }

  if (!conversation) {
    if (showBackButton) {
      return (
        <div className="flex flex-col items-center justify-center h-full px-6 text-center">
          <p className="text-sm text-ig-text-secondary mb-4">대화를 불러올 수 없습니다.</p>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-ig-primary hover:underline"
          >
            목록으로 돌아가기
          </button>
        </div>
      );
    }

    return (
      <div className="hidden md:flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-24 h-24 rounded-full border-2 border-ig-text flex items-center justify-center mb-4">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </div>
        <h2 className="text-xl font-light mb-2">내 메시지</h2>
        <p className="text-sm text-ig-text-secondary max-w-[250px]">
          친구에게 사진과 동영상, 메시지를 보내보세요
        </p>
        <Link
          to="/search"
          className="mt-4 inline-flex items-center justify-center h-8 px-4 text-sm font-semibold rounded-lg bg-ig-primary text-white hover:bg-ig-primary-hover"
        >
          메시지 보내기
        </Link>
      </div>
    );
  }

  const { participant, participants, messages, is_group: isGroup } = conversation;
  const display = getConversationDisplay(conversation, user?.id ?? 0);
  const senderById = new Map<number, User>(participants.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton && (
            <button onClick={onBack} className="md:hidden p-1 -ml-1" aria-label="뒤로">
              <NavIcon icon={ChevronLeft} />
            </button>
          )}
          {isGroup ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-ig-secondary border border-ig-border flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-ig-text-secondary" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-base font-semibold truncate">{display.name}</p>
                <p className="text-xs text-ig-text-secondary truncate">{display.subtitle}</p>
              </div>
            </div>
          ) : (
            <Link to={`/profile/${participant?.username}`} className="flex items-center gap-3 min-w-0">
              <Avatar src={participant?.avatar_url} alt={participant?.username ?? ''} size="sm" />
              <div className="min-w-0 text-left">
                <p className="text-base font-semibold truncate">{participant?.username}</p>
                <p className="text-xs text-ig-text-secondary truncate">{participant?.full_name}</p>
              </div>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4 text-ig-text">
          {!isGroup && (
            <>
              <button aria-label="음성 통화"><NavIcon icon={Phone} /></button>
              <button aria-label="영상 통화"><NavIcon icon={Video} /></button>
            </>
          )}
          <button aria-label="대화 정보"><NavIcon icon={Info} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 ? (
          isGroup ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-20 w-20 rounded-full bg-ig-secondary border border-ig-border flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-ig-text-secondary" />
              </div>
              <p className="font-semibold">{display.name}</p>
              <p className="text-sm text-ig-text-secondary mt-1">{display.subtitle}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Avatar src={participant?.avatar_url} alt={participant?.username ?? ''} size="xl" className="mb-4" />
              <p className="font-semibold">{participant?.username}</p>
              <p className="text-sm text-ig-text-secondary mt-1">i am not a fishmonger · {participant?.full_name}</p>
              <Link
                to={`/profile/${participant?.username}`}
                className="mt-4 text-sm text-ig-primary font-semibold hover:underline"
              >
                프로필 보기
              </Link>
              <p className="text-xs text-ig-text-secondary mt-6">
                {participant?.username}님과 대화를 시작해보세요.
              </p>
            </div>
          )
        ) : (
          (() => {
            // Real Instagram shows "읽음" once under the last message the
            // viewer sent, if the other person has seen it — `is_read` is a
            // real, server-tracked value (see backend), but until now nothing
            // in the chat window ever rendered it. For groups this boolean
            // only means "at least one other member has read it" (there's no
            // per-participant read table), so we don't show a "읽음" label
            // there — it would misleadingly imply everyone has seen it.
            let lastOwnReadId: number | null = null;
            if (!isGroup) {
              for (let i = messages.length - 1; i >= 0; i -= 1) {
                const m = messages[i];
                if (user != null && m.sender_id === user.id) {
                  if (m.is_read) lastOwnReadId = m.id;
                  break;
                }
              }
            }
            return messages.map((message, index) => {
              const prev = index > 0 ? messages[index - 1] : null;
              const showSenderName =
                isGroup && message.sender_id !== user?.id && (!prev || prev.sender_id !== message.sender_id);
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showRead={message.id === lastOwnReadId}
                  senderName={showSenderName ? senderById.get(message.sender_id)?.username : undefined}
                />
              );
            });
          })()
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-ig-border shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="메시지 입력..."
            className="flex-1 px-4 py-2.5 bg-ig-secondary border border-ig-border rounded-full text-sm placeholder:text-ig-text-secondary"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className={cn(
              'text-sm font-semibold px-2',
              draft.trim() && !sending ? 'text-ig-primary' : 'text-ig-primary/40',
            )}
          >
            보내기
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  showRead,
  senderName,
}: {
  message: Message;
  showRead?: boolean;
  senderName?: string;
}) {
  const { user } = useAuth();
  const isOwn = user != null && message.sender_id === user.id;

  return (
    <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
      {senderName && <p className="text-[11px] text-ig-text-secondary ml-1 mb-0.5">{senderName}</p>}
      <div
        className={cn(
          'max-w-[65%] px-4 py-2 rounded-3xl text-sm',
          isOwn ? 'bg-ig-primary text-white' : 'bg-ig-secondary text-ig-text',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className={cn('text-[10px] mt-1', isOwn ? 'text-white/70' : 'text-ig-text-secondary')}>
          {formatChatTime(message.created_at)}
        </p>
      </div>
      {showRead && <p className="text-[11px] text-ig-text-secondary mt-1 mr-1">읽음</p>}
    </div>
  );
}
