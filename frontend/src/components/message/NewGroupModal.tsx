import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import * as usersApi from '@/api/users';
import * as conversationsApi from '@/api/conversations';
import type { Conversation, User } from '@/types';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conversation: Conversation) => void;
}

export function NewGroupModal({ isOpen, onClose, onCreated }: NewGroupModalProps) {
  const { user: currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<Map<number, User>>(new Map());
  const [creating, setCreating] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setQuery('');
      setResults([]);
      setSelected(new Map());
      setCreating(false);
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
        if (!cancelled) setResults(data);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const toggleUser = (target: User) => {
    if (currentUser && target.id === currentUser.id) return;
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(target.id)) next.delete(target.id);
      else next.set(target.id, target);
      return next;
    });
  };

  const handleCreate = async () => {
    if (selected.size < 2 || creating) return;
    setCreating(true);
    try {
      const usernames = Array.from(selected.values()).map((u) => u.username);
      const conv = await conversationsApi.createGroupConversation(usernames, title.trim() || undefined);
      onCreated(conv);
      onClose();
    } catch {
      toast.error('그룹을 만들지 못했습니다.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" className="w-full max-h-[80vh] flex flex-col">
      <div className="px-4 py-3 border-b border-ig-border text-center shrink-0">
        <h2 className="text-sm font-semibold">새 그룹</h2>
      </div>

      <div className="px-4 py-3 border-b border-ig-border shrink-0 space-y-2">
        <input
          type="text"
          placeholder="그룹 이름 (선택 사항)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-lg text-sm placeholder:text-ig-text-secondary"
        />

        {selected.size > 0 && (
          <div className="flex flex-wrap gap-2">
            {Array.from(selected.values()).map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 bg-ig-secondary rounded-full pl-1 pr-2 py-1 text-xs"
              >
                <Avatar src={u.avatar_url} alt={u.username} size="xs" />
                {u.username}
                <button type="button" onClick={() => toggleUser(u)} aria-label={`${u.username} 선택 해제`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          type="text"
          placeholder="받는 사람 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 bg-ig-secondary border border-ig-border rounded-lg text-sm placeholder:text-ig-text-secondary"
        />
      </div>

      <div className="overflow-y-auto flex-1 min-h-[200px]">
        {debouncedQuery.length >= 1 && results.length === 0 ? (
          <p className="text-sm text-ig-text-secondary text-center py-10">검색 결과가 없습니다.</p>
        ) : (
          results
            .filter((u) => u.id !== currentUser?.id)
            .map((u) => {
              const isSelected = selected.has(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUser(u)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-ig-secondary transition-colors text-left"
                >
                  <Avatar src={u.avatar_url} alt={u.username} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.username}</p>
                    <p className="text-xs text-ig-text-secondary truncate">{u.full_name}</p>
                  </div>
                  <span
                    className={`h-5 w-5 rounded-full border-2 shrink-0 ${
                      isSelected ? 'bg-ig-primary border-ig-primary' : 'border-ig-border'
                    }`}
                  />
                </button>
              );
            })
        )}
      </div>

      <div className="px-4 py-3 border-t border-ig-border shrink-0">
        <button
          type="button"
          onClick={handleCreate}
          disabled={selected.size < 2 || creating}
          className={`w-full h-9 rounded-lg text-sm font-semibold text-white transition-colors ${
            selected.size < 2 || creating ? 'bg-ig-primary/40' : 'bg-ig-primary hover:bg-ig-primary-hover'
          }`}
        >
          {creating ? '만드는 중...' : `그룹 만들기${selected.size > 0 ? ` (${selected.size})` : ''}`}
        </button>
        {selected.size > 0 && selected.size < 2 && (
          <p className="text-xs text-ig-text-secondary text-center mt-2">그룹은 최소 2명 이상 필요합니다.</p>
        )}
      </div>
    </Modal>
  );
}
