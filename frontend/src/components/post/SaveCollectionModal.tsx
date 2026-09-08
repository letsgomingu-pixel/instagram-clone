import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal';
import * as collectionsApi from '@/api/collections';
import type { CollectionOut } from '@/types/search';

interface SaveCollectionModalProps {
  postId: number;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function SaveCollectionModal({ postId, isOpen, onClose, onSaved }: SaveCollectionModalProps) {
  const [collections, setCollections] = useState<CollectionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    collectionsApi
      .getCollections()
      .then(setCollections)
      .catch(() => toast.error('컬렉션을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleSaveToCollection = async (collectionId: number) => {
    setSavingId(collectionId);
    try {
      await collectionsApi.addPostToCollection(collectionId, postId);
      toast.success('컬렉션에 저장되었습니다.');
      onSaved();
      onClose();
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const col = await collectionsApi.createCollection(name);
      setCollections((prev) => [col, ...prev]);
      setNewName('');
      await handleSaveToCollection(col.id);
    } catch {
      toast.error('컬렉션 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="px-4 pt-4 pb-2 border-b border-ig-border">
        <h2 className="text-[16px] font-bold text-center">저장</h2>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
          </div>
        ) : (
          <>
            <form onSubmit={(e) => void handleCreate(e)} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value.slice(0, 50))}
                placeholder="새 컬렉션 이름"
                className="flex-1 px-3 py-2 border border-ig-border rounded-lg text-[14px]"
              />
              <button
                type="submit"
                disabled={!newName.trim() || creating}
                className="h-10 px-4 text-[14px] font-semibold rounded-lg bg-ig-primary text-white hover:bg-ig-primary-hover disabled:opacity-50 shrink-0"
              >
                만들기
              </button>
            </form>
            <div className="max-h-[280px] overflow-y-auto space-y-1">
              {collections.length === 0 ? (
                <p className="text-[14px] text-ig-text-secondary text-center py-6">
                  저장된 컬렉션이 없습니다. 새 컬렉션을 만들어 보세요.
                </p>
              ) : (
                collections.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    disabled={savingId === col.id}
                    onClick={() => void handleSaveToCollection(col.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-ig-secondary text-left disabled:opacity-50"
                  >
                    <div className="h-10 w-10 rounded bg-ig-secondary border border-ig-border shrink-0 overflow-hidden">
                      {col.cover_url && (
                        <img src={col.cover_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold truncate">{col.name}</p>
                      <p className="text-[12px] text-ig-text-secondary">{col.post_count}개</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
