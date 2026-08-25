import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ChevronLeft, ChevronRight, ImagePlus, MapPin } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import * as postsApi from '@/api/posts';
import { useApp } from '@/contexts/AppContext';
import toast from 'react-hot-toast';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const { refreshFeed, refreshExplore } = useApp();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setFiles((prev) => [...prev, ...acceptedFiles].slice(0, 10));
    setPreviews((prev) => [
      ...prev,
      ...acceptedFiles.map((file) => URL.createObjectURL(file)),
    ].slice(0, 10));
    setPreviewIndex(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov'],
    },
    maxFiles: 10,
    multiple: true,
  });

  const handleShare = async () => {
    if (!files.length) {
      toast.error('미디어를 선택해주세요.');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      if (caption) form.append('caption', caption);
      if (location) form.append('location', location);
      await postsApi.createPost(form);
      await Promise.all([refreshFeed(), refreshExplore()]);
      toast.success('게시물이 공유되었습니다!');
      handleClose();
    } catch {
      toast.error('게시물 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    setPreviewIndex(0);
    setCaption('');
    setLocation('');
    onClose();
  };

  const currentPreview = previews[previewIndex];
  const currentFile = files[previewIndex];
  const isVideo = currentFile?.type.startsWith('video/');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" showClose={false}>
      <div className="w-[400px] max-w-[95vw]">
        <div className="flex items-center justify-center border-b border-ig-border h-[42px] relative">
          <h2 className="text-base font-semibold">새 게시물 만들기</h2>
          {previews.length > 0 && (
            <button
              onClick={handleShare}
              disabled={uploading}
              aria-label="게시물 공유"
              className="absolute right-3 text-ig-primary font-semibold text-sm disabled:opacity-50"
            >
              {uploading ? '공유 중...' : '공유'}
            </button>
          )}
          <button onClick={handleClose} className="absolute left-3 text-sm" aria-label="닫기">
            ✕
          </button>
        </div>

        {!previews.length ? (
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center h-[300px] cursor-pointer transition-colors ${
              isDragActive ? 'bg-blue-50' : 'hover:bg-ig-secondary'
            }`}
          >
            <input {...getInputProps()} />
            <ImagePlus size={48} strokeWidth={1} className="text-ig-text-secondary mb-4" />
            <p className="text-xl font-light mb-2">사진과 동영상을 여기에 끌어다 놓으세요</p>
            <p className="text-xs text-ig-text-secondary mb-3">최대 10개까지 선택 가능</p>
            <Button variant="primary" size="md">컴퓨터에서 선택</Button>
          </div>
        ) : (
          <div>
            <div className="relative aspect-square bg-ig-secondary">
              {isVideo ? (
                <video src={currentPreview} className="w-full h-full object-cover" controls muted />
              ) : (
                <img src={currentPreview} alt="미리보기" className="w-full h-full object-cover" />
              )}
              {previews.length > 1 && (
                <>
                  {previewIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((i) => i - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1 shadow"
                      aria-label="이전"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  )}
                  {previewIndex < previews.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setPreviewIndex((i) => i + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1 shadow"
                      aria-label="다음"
                    >
                      <ChevronRight size={18} />
                    </button>
                  )}
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    {previewIndex + 1}/{previews.length}
                  </div>
                </>
              )}
            </div>
            <div className="p-3 border-t border-ig-border">
              <textarea
                placeholder="문구 입력..."
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 2200))}
                className="w-full resize-none text-sm min-h-[80px] placeholder:text-ig-text-secondary whitespace-pre-wrap"
                maxLength={2200}
              />
              <div className="flex items-center gap-2 mt-2">
                <MapPin size={16} className="text-ig-text-secondary shrink-0" />
                <input
                  type="text"
                  placeholder="위치 추가"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="flex-1 text-sm placeholder:text-ig-text-secondary"
                />
              </div>
              <p className="text-xs text-ig-text-secondary text-right mt-1">{caption.length}/2,200</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
