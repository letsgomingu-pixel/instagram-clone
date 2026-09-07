import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import * as usersApi from '@/api/users';
import * as conversationsApi from '@/api/conversations';
import type { User } from '@/types';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStarted: (username: string) => void;
}

export function NewMessageModal({ isOpen, onClose, onStarted }: NewMessageModalProps) {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debouncedQuery.length < 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    usersApi
      .searchUsersApi(debouncedQuery)
      .then((data) => {
        if (!cancelled) setResults(data.filter((u) => u.id !== currentUser?.id));
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, currentUser?.id]);

  const startChat = async (target: User) => {
    try {
      await conversationsApi.getMessages(target.username);
      onStarted(target.username);
      onClose();
    } catch {
      toast.error('대화를 시작할 수 없습니다.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">새 메시지</h2>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>
        <input
          type="text"
          placeholder="검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 border border-ig-border rounded-lg text-sm mb-3"
          autoFocus
        />
        <div className="max-h-[300px] overflow-y-auto">
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => void startChat(user)}
              className="flex items-center gap-3 w-full px-2 py-2 hover:bg-ig-secondary rounded-lg"
            >
              <Avatar src={user.avatar_url} alt={user.username} size="md" />
              <div className="text-left">
                <p className="text-sm font-semibold">{user.username}</p>
                <p className="text-xs text-ig-text-secondary">{user.full_name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
