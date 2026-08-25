import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { StoryEditor } from '@/components/story/StoryEditor';
import * as storiesApi from '@/api/stories';
import { useApp } from '@/contexts/AppContext';
import type { StoryOverlay } from '@/types';
import toast from 'react-hot-toast';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateStoryModal({ isOpen, onClose }: CreateStoryModalProps) {
  const { refreshStories } = useApp();
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [overlays, setOverlays] = useState<StoryOverlay[]>([]);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setMediaFile(null);
    setMediaType('image');
    setOverlays([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    setMediaFile(file);
    setMediaType(isVideo ? 'video' : 'image');
    setPreview(URL.createObjectURL(file));
    setOverlays([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleShare = async () => {
    if (!mediaFile) {
      toast.error('미디어를 선택해주세요.');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('media', mediaFile);
      if (overlays.length > 0) {
        form.append('overlays', JSON.stringify(overlays));
      }
      await storiesApi.createStory(form);
      await refreshStories();
      toast.success('스토리가 공유되었습니다!');
      handleClose();
    } catch {
      toast.error('스토리 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" showClose={false}>
      {!preview ? (
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
            <p className="text-xs text-ig-text-secondary mb-3">JPG, PNG, MP4, WebM</p>
            <Button variant="primary" size="md">컴퓨터에서 선택</Button>
          </div>
        </div>
      ) : (
        <StoryEditor
          mediaUrl={preview}
          mediaType={mediaType}
          overlays={overlays}
          onOverlaysChange={setOverlays}
          onShare={handleShare}
          onBack={reset}
          uploading={uploading}
        />
      )}
    </Modal>
  );
}
