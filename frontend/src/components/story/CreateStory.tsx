import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
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
  const { refreshStories, upsertStory } = useApp();
  const [queue, setQueue] = useState<QueuedStory[]>([]);
  const [overlays, setOverlays] = useState<StoryOverlay[]>([]);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setQueue((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.preview));
      return [];
    });
    setOverlays([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const next: QueuedStory[] = [];
    for (const file of acceptedFiles) {
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
    setOverlays([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: () => {
      toast.error('지원하는 사진 또는 동영상 파일을 선택해 주세요.');
    },
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic', '.heif'],
      'video/*': ['.mp4', '.webm', '.mov', '.m4v'],
    },
    multiple: true,
  });

  const handleShare = async () => {
    if (!queue.length) {
      toast.error('미디어를 선택해주세요.');
      return;
    }
    setUploading(true);
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
        upsertStory(lastCreated);
      }
      try {
        await refreshStories();
      } catch {
        // Keep the story we just saved even if the feed refresh fails.
      }
      if (lastCreated) upsertStory(lastCreated);
      toast.success(queue.length > 1 ? `스토리 ${queue.length}개가 공유되었습니다!` : '스토리가 공유되었습니다!');
      handleClose();
    } catch (err) {
      toast.error(formatApiError(err, '스토리 업로드에 실패했습니다.'));
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
            <button onClick={handleClose} className="absolute left-3 text-sm" aria-label="닫기">
              ✕
            </button>
          </div>
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center h-[360px] cursor-pointer transition-colors ${
              isDragActive ? 'bg-blue-50' : 'hover:bg-ig-secondary'
            }`}
          >
            <input {...getInputProps()} />
            <ImagePlus size={48} strokeWidth={1} className="text-ig-text-secondary mb-4" />
            <p className="text-xl font-light mb-2 text-center px-6">사진 또는 동영상을 선택하세요</p>
            <p className="text-xs text-ig-text-secondary mb-3">JPG, PNG, MP4, MOV · 여러 개 선택 가능</p>
            <Button variant="primary" size="md">컴퓨터에서 선택</Button>
          </div>
        </div>
      ) : (
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
      )}
    </Modal>
  );
}
