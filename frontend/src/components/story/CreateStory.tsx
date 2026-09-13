import { useCallback, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { StoryEditor } from '@/components/story/StoryEditor';
import * as storiesApi from '@/api/stories';
import { useApp } from '@/contexts/AppContext';
import type { StoryOverlay } from '@/types';
import { formatApiError } from '@/utils/formatApiError';
import { isVideoUpload, normalizeStoryFile } from '@/utils/media';
import toast from 'react-hot-toast';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QueuedStory {
  file: File;
  preview: string;
  mediaType: 'image' | 'video';
}

export function CreateStoryModal({ isOpen, onClose }: CreateStoryModalProps) {
  const { upsertStory } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedStory[]>([]);
  const [overlays, setOverlays] = useState<StoryOverlay[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setQueue((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.preview));
      return [];
    });
    setOverlays([]);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const queueFiles = useCallback(async (files: File[]) => {
    if (!files.length) {
      setError('사진 또는 동영상을 선택해 주세요.');
      return;
    }
    setError(null);
    const immediate: QueuedStory[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      mediaType: isVideoUpload(file) ? 'video' : 'image',
    }));
    setQueue((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.preview));
      return immediate;
    });
    setOverlays([]);

    const next: QueuedStory[] = [];
    for (const file of files) {
      const normalized = await normalizeStoryFile(file);
      next.push({
        file: normalized,
        preview: URL.createObjectURL(normalized),
        mediaType: isVideoUpload(normalized) ? 'video' : 'image',
      });
    }
    setQueue((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.preview));
      return next;
    });
  }, []);

  const handleShare = async () => {
    if (!queue.length) {
      setError('미디어를 선택해주세요.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      let lastCreated = null;
      for (const [index, item] of queue.entries()) {
        const form = new FormData();
        form.append(
          'media',
          item.file,
          item.file.name || (item.mediaType === 'video' ? 'story.mp4' : 'story.jpg'),
        );
        if (index === 0 && overlays.length > 0) {
          form.append('overlays', JSON.stringify(overlays));
        }
        lastCreated = await storiesApi.createStory(form);
        if (lastCreated) upsertStory(lastCreated);
      }
      if (lastCreated) upsertStory(lastCreated);
      toast.success(queue.length > 1 ? `스토리 ${queue.length}개가 공유되었습니다!` : '스토리가 공유되었습니다!');
      handleClose();
    } catch (err) {
      const message = formatApiError(err, '스토리 업로드에 실패했습니다.');
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const current = queue[0];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" showClose={false}>
      {!current ? (
        <div className="w-[400px] max-w-[95vw]">
          <div className="flex items-center justify-center border-b border-ig-border h-[42px] relative">
            <h2 className="text-base font-semibold">스토리 만들기</h2>
            <button type="button" onClick={handleClose} className="absolute left-3 text-sm" aria-label="닫기">
              ✕
            </button>
          </div>
          <div className="flex h-[360px] flex-col items-center justify-center">
            <ImagePlus size={48} strokeWidth={1} className="text-ig-text-secondary mb-4" />
            <p className="text-xl font-light mb-2 text-center px-6">사진 또는 동영상을 선택하세요</p>
            <p className="text-xs text-ig-text-secondary mb-3">휴대폰 앨범에서 여러 장 선택 가능</p>
            <label className="relative inline-flex h-8 cursor-pointer items-center overflow-hidden rounded-xl bg-ig-primary px-4 text-sm font-semibold text-white transition duration-150 hover:bg-ig-primary-hover active:scale-95 active:brightness-90">
              사진/동영상 선택
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*,.heic,.heif,.mov,.mp4,.webm,.m4v"
                multiple
                aria-label="사진 또는 동영상 선택"
                className="absolute inset-0 z-10 cursor-pointer opacity-0"
                onChange={(event) => {
                  void queueFiles(Array.from(event.target.files ?? []));
                }}
              />
            </label>
          </div>
          {error && <p className="px-4 pb-4 text-sm text-ig-red text-center">{error}</p>}
        </div>
      ) : (
        <div>
          {error && <p className="px-4 py-2 text-sm text-ig-red text-center border-b border-ig-border">{error}</p>}
          <StoryEditor
            mediaUrl={current.preview}
            mediaType={current.mediaType}
            overlays={overlays}
            onOverlaysChange={setOverlays}
            onShare={handleShare}
            onBack={reset}
            uploading={uploading}
            itemCount={queue.length}
          />
        </div>
      )}
    </Modal>
  );
}
