import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ChevronLeft, ChevronRight, ImagePlus, MapPin, UserPlus, X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import * as postsApi from '@/api/posts';
import * as usersApi from '@/api/users';
import { useApp } from '@/contexts/AppContext';
import { useDebounce } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';
import type { User } from '@/types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const { publishFeedPost, refreshExplore } = useApp();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const [tagResults, setTagResults] = useState<User[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<User[]>([]);
  const [uploading, setUploading] = useState(false);
  const debouncedTagQuery = useDebounce(tagQuery, 300);

  useEffect(() => {
    if (debouncedTagQuery.length < 1) {
      setTagResults([]);
      return;
    }
    usersApi.searchUsersApi(debouncedTagQuery).then(setTagResults).catch(() => setTagResults([]));
  }, [debouncedTagQuery]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setFiles((prev) => [...prev, ...acceptedFiles]);
    setPreviews((prev) => {
      const next = [
        ...prev,
        ...acceptedFiles.map((file) => URL.createObjectURL(file)),
      ];
      if (prev.length === 0 && next.length > 0) {
        setPreviewIndex(0);
      }
      return next;
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      const next = prev.filter((_, i) => i !== index);
      setPreviewIndex((current) => {
        if (next.length === 0) return 0;
        if (current > index) return current - 1;
        if (current >= next.length) return next.length - 1;
        return current;
      });
      return next;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov'],
    },
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
      if (taggedUsers.length) {
        form.append('tagged_usernames', JSON.stringify(taggedUsers.map((u) => u.username)));
      }
      const post = await postsApi.createPost(form);
      publishFeedPost(post);
      await refreshExplore();
      toast.success('소식이 공유되었습니다!');
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
    setTagQuery('');
    setTagResults([]);
    setTaggedUsers([]);
    onClose();
  };

  const addTag = (user: User) => {
    if (taggedUsers.some((u) => u.id === user.id)) return;
    setTaggedUsers((prev) => [...prev, user]);
    setTagQuery('');
    setTagResults([]);
  };

  const currentPreview = previews[previewIndex];
  const currentFile = files[previewIndex];
  const isVideo = currentFile?.type.startsWith('video/');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" showClose={false} overlayClose>
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
              isDragActive ? 'bg-ig-secondary' : 'hover:bg-ig-secondary'
            }`}
          >
            <input {...getInputProps()} />
            <ImagePlus size={48} strokeWidth={1} className="text-ig-text-secondary mb-4" />
            <p className="text-xl font-light mb-2">사진과 동영상을 여기에 끌어다 놓으세요</p>
            <p className="text-xs text-ig-text-secondary mb-3">여러 장 선택 가능</p>
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
              <button
                type="button"
                onClick={() => removeFile(previewIndex)}
                className="absolute top-3 left-3 bg-black/60 text-white rounded-full p-1"
                aria-label="현재 사진 삭제"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-3 pt-3 flex flex-wrap gap-2 items-center border-t border-ig-border">
              {previews.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setPreviewIndex(index)}
                  className={`relative h-14 w-14 rounded-lg overflow-hidden border-2 shrink-0 ${
                    index === previewIndex ? 'border-ig-primary' : 'border-ig-border'
                  }`}
                  aria-label={`미리보기 ${index + 1}`}
                >
                  {files[index]?.type.startsWith('video/') ? (
                    <video src={url} className="h-full w-full object-cover" muted />
                  ) : (
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
              <div
                {...getRootProps()}
                className={`h-14 w-14 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer shrink-0 ${
                  isDragActive ? 'border-ig-primary bg-ig-secondary' : 'border-ig-border'
                }`}
              >
                <input {...getInputProps()} />
                <ImagePlus size={20} className="text-ig-text-secondary" />
              </div>
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
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <UserPlus size={16} className="text-ig-text-secondary shrink-0" />
                  <input
                    type="text"
                    placeholder="사람 태그하기"
                    value={tagQuery}
                    onChange={(e) => setTagQuery(e.target.value)}
                    className="flex-1 text-sm placeholder:text-ig-text-secondary"
                  />
                </div>
                {tagResults.length > 0 && (
                  <div className="mt-1 border border-ig-border rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                    {tagResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => addTag(user)}
                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-ig-secondary text-left"
                      >
                        <Avatar src={user.avatar_url} alt={user.username} size="sm" />
                        <span className="text-sm">{user.username}</span>
                      </button>
                    ))}
                  </div>
                )}
                {taggedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {taggedUsers.map((user) => (
                      <span
                        key={user.id}
                        className="inline-flex items-center gap-1 text-xs bg-ig-secondary px-2 py-1 rounded-full"
                      >
                        @{user.username}
                        <button
                          type="button"
                          onClick={() => setTaggedUsers((prev) => prev.filter((u) => u.id !== user.id))}
                          aria-label="태그 제거"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-ig-text-secondary text-right mt-1">{caption.length}/2,200</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
