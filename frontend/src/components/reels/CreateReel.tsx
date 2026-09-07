import { useCallback, useState } from 'react';

import { useDropzone } from 'react-dropzone';

import { Film } from 'lucide-react';

import { Modal } from '@/components/common/Modal';

import { Button } from '@/components/common/Button';

import * as reelsApi from '@/api/reels';

import { useApp } from '@/contexts/AppContext';

import toast from 'react-hot-toast';



interface CreateReelModalProps {

  isOpen: boolean;

  onClose: () => void;

}



export function CreateReelModal({ isOpen, onClose }: CreateReelModalProps) {

  const { refreshReels } = useApp();

  const [preview, setPreview] = useState<string | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [caption, setCaption] = useState('');

  const [audioName, setAudioName] = useState('');

  const [uploading, setUploading] = useState(false);



  const reset = () => {

    if (preview) URL.revokeObjectURL(preview);

    setPreview(null);

    setVideoFile(null);

    setThumbnailFile(null);

    setCaption('');

    setAudioName('');

  };



  const handleClose = () => {

    reset();

    onClose();

  };



  const onDrop = useCallback((acceptedFiles: File[]) => {

    const file = acceptedFiles[0];

    if (!file) return;

    setVideoFile(file);

    setPreview(URL.createObjectURL(file));

  }, []);



  const { getRootProps, getInputProps, isDragActive } = useDropzone({

    onDrop,

    accept: { 'video/*': ['.mp4', '.webm', '.mov'] },

    maxFiles: 1,

    multiple: false,

  });



  const handleShare = async () => {

    if (!videoFile) {

      toast.error('동영상을 선택해주세요.');

      return;

    }

    setUploading(true);

    try {

      const form = new FormData();

      form.append('video', videoFile);

      if (thumbnailFile) form.append('thumbnail', thumbnailFile);

      if (caption) form.append('caption', caption);

      if (audioName) form.append('audio_name', audioName);

      await reelsApi.createReel(form);

      await refreshReels();

      toast.success('릴스가 공유되었습니다!');

      handleClose();

    } catch {

      toast.error('릴스 업로드에 실패했습니다.');

    } finally {

      setUploading(false);

    }

  };



  return (

    <Modal isOpen={isOpen} onClose={handleClose} size="md" showClose={false}>

      <div className="w-[400px] max-w-[95vw]">

        <div className="flex items-center justify-center border-b border-ig-border h-[42px] relative">

          <h2 className="text-base font-semibold">릴스 만들기</h2>

          {preview && (

            <button

              onClick={handleShare}

              disabled={uploading}

              aria-label="릴스 공유"

              className="absolute right-3 text-ig-primary font-semibold text-sm disabled:opacity-50"

            >

              {uploading ? '공유 중...' : '공유'}

            </button>

          )}

          <button onClick={handleClose} className="absolute left-3 text-sm" aria-label="닫기">

            ✕

          </button>

        </div>



        {!preview ? (

          <div

            {...getRootProps()}

            className={`flex flex-col items-center justify-center h-[360px] cursor-pointer transition-colors ${

              isDragActive ? 'bg-blue-50' : 'hover:bg-ig-secondary'

            }`}

          >

            <input {...getInputProps()} />

            <Film size={48} strokeWidth={1} className="text-ig-text-secondary mb-4" />

            <p className="text-xl font-light mb-2 text-center px-6">동영상을 선택하세요</p>

            <p className="text-xs text-ig-text-secondary mb-3">MP4, WebM, MOV</p>

            <Button variant="primary" size="md">컴퓨터에서 선택</Button>

          </div>

        ) : (

          <div>

            <div className="aspect-[9/16] max-h-[50vh] bg-black">

              <video src={preview} className="w-full h-full object-cover" muted playsInline controls />

            </div>

            <div className="p-3 border-t border-ig-border space-y-3">

              <textarea

                placeholder="캡션 입력..."

                value={caption}

                onChange={(e) => setCaption(e.target.value.slice(0, 2200))}

                className="w-full resize-none text-sm min-h-[72px] placeholder:text-ig-text-secondary"

              />

              <input

                type="text"

                placeholder="오디오 이름 (선택)"

                value={audioName}

                onChange={(e) => setAudioName(e.target.value)}

                className="w-full text-sm border border-ig-border rounded-lg px-3 py-2 placeholder:text-ig-text-secondary"

              />

              <label className="block text-sm text-ig-text-secondary">

                커버 이미지 (선택)

                <input

                  type="file"

                  accept="image/jpeg,image/png,image/webp"

                  className="mt-1 block w-full text-sm"

                  onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}

                />

              </label>

            </div>

          </div>

        )}

      </div>

    </Modal>

  );

}


