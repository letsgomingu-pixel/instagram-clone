import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import * as usersApi from '@/api/users';
import * as conversationsApi from '@/api/conversations';
import { cn } from '@/utils/cn';
import type { User } from '@/types';

interface SendReelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SendReelModal({ isOpen, onClose }: SendReelModalProps) {
  const { user: currentUser } = useAuth();
  const { suggestedUsers, refreshSuggestedUsers } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sentIds, setSentIds] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSendingId(null);
      setSentIds([]);
      setNote('');
      return;
    }
    void refreshSuggestedUsers();
  }, [isOpen, refreshSuggestedUsers]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || debouncedQuery.length < 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    usersApi
      .searchUsersApi(debouncedQuery)
      .then((data) => {
        if (!cancelled) setResults(data.filter((user) => user.id !== currentUser?.id));
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, debouncedQuery, currentUser?.id]);

  const listUsers = useMemo(() => {
    const source = debouncedQuery.length >= 1 ? results : suggestedUsers;
    return source.filter((user) => user.id !== currentUser?.id);
  }, [debouncedQuery, results, suggestedUsers, currentUser?.id]);

  const noteText = note.trim();
  const canSend = Boolean(noteText);

  const handleSend = async (target: User) => {
    if (!canSend || sendingId !== null || sentIds.includes(target.id)) return;
    setSendingId(target.id);
    try {
      await conversationsApi.sendMessage(target.username, noteText);
      setSentIds((prev) => [...prev, target.id]);
      toast.success(`${target.username}님에게 보냈습니다.`);
    } catch {
      toast.error('메시지를 보내지 못했습니다.');
    } finally {
      setSendingId(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="보내기 닫기"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="보내기"
        className="relative flex w-[400px] max-w-[95vw] max-h-[min(520px,85vh)] flex-col overflow-hidden rounded-xl bg-white"
      >
        <header className="relative flex h-[44px] shrink-0 items-center justify-center border-b border-ig-border">
          <h2 className="text-[16px] font-semibold">보내기</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 p-1 text-ig-text hover:opacity-60"
            aria-label="닫기"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </header>
        <div className="shrink-0 border-b border-ig-border px-4 py-3">
          <input
            type="text"
            placeholder="검색..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-lg bg-ig-secondary px-3 py-2 text-[14px] outline-none"
            autoFocus
          />
        </div>
        <div className="min-h-[220px] flex-1 overflow-y-auto">
          {listUsers.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ig-text-secondary">
              {debouncedQuery ? '검색 결과가 없습니다.' : '보낼 계정이 없습니다.'}
            </p>
          ) : (
            listUsers.map((user) => {
              const sent = sentIds.includes(user.id);
              const sending = sendingId === user.id;
              return (
                <div key={user.id} className="flex items-center gap-3 px-4 py-2">
                  <Avatar src={user.avatar_url} alt={user.username} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{user.username}</p>
                    {user.full_name && (
                      <p className="truncate text-[14px] text-ig-text-secondary">{user.full_name}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={sent || sendingId !== null || !canSend}
                    onClick={() => void handleSend(user)}
                    className={cn(
                      'h-8 shrink-0 rounded-lg px-3 text-[14px] font-semibold text-white',
                      sent ? 'bg-ig-border text-ig-text' : 'bg-ig-primary disabled:opacity-40',
                    )}
                  >
                    {sent ? '보냄' : sending ? '보내는 중' : '보내기'}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <footer className="shrink-0 border-t border-ig-border px-4 py-3">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="메시지 입력..."
            rows={2}
            maxLength={1800}
            className="w-full resize-none rounded-2xl bg-ig-secondary px-4 py-2.5 text-[14px] outline-none placeholder:text-ig-text-secondary"
          />
        </footer>
      </div>
    </div>,
    document.body,
  );
}
