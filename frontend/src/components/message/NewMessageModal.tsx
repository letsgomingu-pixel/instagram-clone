import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import * as usersApi from '@/api/users';
import * as conversationsApi from '@/api/conversations';
import type { User } from '@/types';
import { cn } from '@/utils/cn';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStarted: (username: string) => void;
}

export function NewMessageModal({ isOpen, onClose, onStarted }: NewMessageModalProps) {
  const { user: currentUser } = useAuth();
  const { suggestedUsers, refreshSuggestedUsers } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [starting, setStarting] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedUser(null);
      return;
    }
    void refreshSuggestedUsers();
  }, [isOpen, refreshSuggestedUsers]);

  useEffect(() => {
    if (debouncedQuery.length < 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    usersApi
      .searchUsersApi(debouncedQuery)
      .then((data) => {
        if (!cancelled) {
          setResults(data.filter((u) => u.id !== currentUser?.id));
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, currentUser?.id]);

  const listUsers = useMemo(() => {
    if (debouncedQuery.length >= 1) return results;
    return suggestedUsers.filter((u) => u.id !== currentUser?.id);
  }, [debouncedQuery, results, suggestedUsers, currentUser?.id]);

  const startChat = async (target: User) => {
    setStarting(true);
    try {
      await conversationsApi.getMessages(target.username);
      onStarted(target.username);
      onClose();
    } catch {
      toast.error('대화를 시작할 수 없습니다.');
    } finally {
      setStarting(false);
    }
  };

  const handleChat = () => {
    if (!selectedUser || starting) return;
    void startChat(selectedUser);
  };

  const handleSelect = (user: User) => {
    setSelectedUser(user);
    setQuery('');
    setResults([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showClose={false} className="w-[400px] max-w-[95vw]">
      <div className="flex flex-col max-h-[min(520px,85vh)]">
        <div className="relative flex items-center justify-center h-[42px] border-b border-ig-border shrink-0">
          <h2 className="text-[16px] font-semibold text-ig-text">새로운 메시지</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 p-1 text-ig-text hover:opacity-60"
            aria-label="닫기"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-b border-ig-border min-h-[44px] shrink-0 flex-wrap">
          <span className="text-[16px] text-ig-text shrink-0">받는 사람:</span>
          {selectedUser && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-ig-primary/15 px-2 py-1 text-[14px] font-semibold text-ig-primary">
              {selectedUser.username}
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="hover:opacity-70"
                aria-label="받는 사람 제거"
              >
                <X size={14} />
              </button>
            </span>
          )}
          {!selectedUser && (
            <input
              type="text"
              placeholder="검색..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 min-w-[120px] text-[16px] placeholder:text-ig-text-secondary bg-transparent"
              autoFocus
            />
          )}
        </div>

        <div className="flex-1 min-h-[220px] max-h-[320px] overflow-y-auto">
          {listUsers.length === 0 ? (
            <p className="px-4 py-8 text-sm text-center text-ig-text-secondary">
              {debouncedQuery ? '검색 결과가 없습니다.' : '추천 계정을 불러오는 중…'}
            </p>
          ) : (
            listUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-2 hover:bg-ig-secondary transition-colors text-left',
                  selectedUser?.id === user.id && 'bg-ig-secondary',
                )}
              >
                <Avatar src={user.avatar_url} alt={user.username} size="md" />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold truncate">{user.username}</p>
                  <p className="text-[14px] text-ig-text-secondary truncate">{user.full_name}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-ig-border shrink-0">
          <button
            type="button"
            onClick={handleChat}
            disabled={!selectedUser || starting}
            className={cn(
              'w-full h-10 rounded-lg text-[14px] font-semibold text-white transition-opacity',
              selectedUser
                ? 'bg-ig-primary hover:bg-ig-primary-hover'
                : 'bg-ig-primary/40 cursor-not-allowed',
            )}
          >
            {starting ? '연결 중…' : '채팅'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
