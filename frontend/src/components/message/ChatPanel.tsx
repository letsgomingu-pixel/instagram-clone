import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ImagePlus, Info, Phone, Users, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCall } from '@/contexts/CallContext';
import { Avatar } from '@/components/common/Avatar';
import { MediaImage } from '@/components/common/MediaImage';
import { NavIcon } from '@/components/post/PostActionIcons';
import { formatChatTime, getConversationDisplay } from '@/utils/messages';
import { resolveMediaUrl } from '@/utils/media';
import { useAuth } from '@/hooks/useAuth';
import type { Conversation, Message, User } from '@/types';
import { cn } from '@/utils/cn';

interface ChatPanelProps {
  conversation: Conversation | null;
  loading?: boolean;
  loadingOlder?: boolean;
  onSend: (content: string) => Promise<void>;
  onSendImage?: (file: File) => Promise<void>;
  onDeleteMessage?: (messageId: number) => Promise<void>;
  onLoadOlder?: () => Promise<void>;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function ChatPanel({
  conversation,
  loading = false,
  loadingOlder = false,
  onSend,
  onSendImage,
  onDeleteMessage,
  onLoadOlder,
  onBack,
  showBackButton,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef(0);
  const { user } = useAuth();
  const { startCall, status: callStatus } = useCall();

  useEffect(() => {
    const count = conversation?.messages.length ?? 0;
    if (count > prevMessageCountRef.current && !loadingOlder) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = count;
  }, [conversation?.messages.length, loadingOlder]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onLoadOlder || !conversation?.has_more_messages) return;

    const handleScroll = () => {
      if (el.scrollTop < 80 && !loadingOlder) {
        void onLoadOlder();
      }
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [conversation?.has_more_messages, loadingOlder, onLoadOlder]);

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

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onSendImage || sending) return;
    setSending(true);
    try {
      await onSendImage(file);
    } catch {
      // Parent surfaces toast
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
                <p className="text-xs text-ig-text-secondary truncate">
                  {participant?.is_active_now ? '활동 중' : participant?.full_name}
                </p>
              </div>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4 text-ig-text">
          {!isGroup && participant ? (
            <>
              <button
                type="button"
                aria-label="음성 통화"
                disabled={callStatus !== 'idle'}
                onClick={() => {
                  if (callStatus !== 'idle') return;
                  void startCall(
                    {
                      id: participant.id,
                      username: participant.username,
                      full_name: participant.full_name,
                      avatar_url: participant.avatar_url,
                    },
                    'audio',
                  ).catch(() => toast.error('통화를 시작할 수 없습니다.'));
                }}
              >
                <NavIcon icon={Phone} />
              </button>
              <button
                type="button"
                aria-label="영상 통화"
                disabled={callStatus !== 'idle'}
                onClick={() => {
                  if (callStatus !== 'idle') return;
                  void startCall(
                    {
                      id: participant.id,
                      username: participant.username,
                      full_name: participant.full_name,
                      avatar_url: participant.avatar_url,
                    },
                    'video',
                  ).catch(() => toast.error('통화를 시작할 수 없습니다.'));
                }}
              >
                <NavIcon icon={Video} />
              </button>
            </>
          ) : null}
          {!isGroup && (
            <button type="button" aria-label="대화 정보" onClick={() => setInfoOpen((v) => !v)}>
              <NavIcon icon={Info} />
            </button>
          )}
        </div>
      </div>

      {infoOpen && !isGroup && participant && (
        <div className="px-4 py-3 border-b border-ig-border bg-ig-secondary shrink-0">
          <Link to={`/profile/${participant.username}`} className="text-sm font-semibold text-ig-link hover:underline">
            @{participant.username} 프로필 보기
          </Link>
          {participant.full_name && (
            <p className="text-xs text-ig-text-secondary mt-1">{participant.full_name}</p>
          )}
          {participant.is_active_now && (
            <p className="text-xs text-green-600 mt-1">현재 활동 중</p>
          )}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
          </div>
        )}
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
                  onDelete={onDeleteMessage}
                />
              );
            });
          })()
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-ig-border shrink-0">
        <div className="flex items-center gap-2">
          {onSendImage && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => void handleImagePick(e)}
              />
              <button
                type="button"
                aria-label="사진 또는 동영상 보내기"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="p-1 text-ig-text-secondary hover:text-ig-text disabled:opacity-40"
              >
                <ImagePlus size={22} />
              </button>
            </>
          )}
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
  onDelete,
}: {
  message: Message;
  showRead?: boolean;
  senderName?: string;
  onDelete?: (messageId: number) => Promise<void>;
}) {
  const { user } = useAuth();
  const isOwn = user != null && message.sender_id === user.id;
  const isDeleted = message.is_deleted || (!message.content && !message.media_url);

  const handleDelete = () => {
    if (!onDelete || !window.confirm('메시지를 삭제할까요?')) return;
    void onDelete(message.id);
  };

  return (
    <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
      {senderName && <p className="text-[11px] text-ig-text-secondary ml-1 mb-0.5">{senderName}</p>}
      <div
        className={cn(
          'max-w-[65%] px-4 py-2 rounded-3xl text-sm',
          isOwn ? 'bg-ig-primary text-white' : 'bg-ig-secondary text-ig-text',
        )}
      >
        {isDeleted ? (
          <p className="italic opacity-70">메시지가 삭제되었습니다.</p>
        ) : (
          <>
            {message.media_url && (
              message.media_type === 'video' ? (
                <video
                  src={resolveMediaUrl(message.media_url)}
                  controls
                  playsInline
                  className="max-w-full rounded-lg mb-1"
                />
              ) : (
                <MediaImage
                  src={message.media_url}
                  alt="첨부 미디어"
                  className="max-w-full rounded-lg mb-1"
                />
              )
            )}
            {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
          </>
        )}
        <p className={cn('text-[10px] mt-1', isOwn ? 'text-white/70' : 'text-ig-text-secondary')}>
          {formatChatTime(message.created_at)}
        </p>
      </div>
      {isOwn && onDelete && !isDeleted && (
        <button
          type="button"
          onClick={handleDelete}
          className="text-[11px] text-ig-text-secondary mt-1 mr-1 hover:text-ig-red"
        >
          삭제
        </button>
      )}
      {showRead && <p className="text-[11px] text-ig-text-secondary mt-1 mr-1">읽음</p>}
    </div>
  );
}
