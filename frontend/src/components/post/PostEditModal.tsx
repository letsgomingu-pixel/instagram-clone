import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import type { Post } from '@/types';

interface PostEditModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { caption?: string | null; location?: string | null }) => Promise<void>;
}

export function PostEditModal({ post, isOpen, onClose, onSave }: PostEditModalProps) {
  const [caption, setCaption] = useState(post.caption ?? '');
  const [location, setLocation] = useState(post.location ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        caption: caption.trim() || null,
        location: location.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="px-4 pt-4 pb-2 border-b border-ig-border">
        <h2 className="text-[16px] font-bold text-center">게시물 수정</h2>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="p-4 space-y-4">
        <div>
          <label className="block text-[14px] font-semibold mb-1">캡션</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 2200))}
            rows={4}
            className="w-full px-3 py-2 border border-ig-border rounded-lg text-[14px] resize-none focus:border-ig-text-secondary"
            placeholder="캡션 추가..."
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-1">위치</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value.slice(0, 100))}
            className="w-full px-3 py-2 border border-ig-border rounded-lg text-[14px] focus:border-ig-text-secondary"
            placeholder="위치 추가..."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-[14px] font-semibold rounded-lg bg-ig-secondary hover:bg-ig-hover"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-4 text-[14px] font-semibold rounded-lg bg-ig-primary text-white hover:bg-ig-primary-hover disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
