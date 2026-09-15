import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { resolveMediaUrl } from '@/utils/media';

interface ReelVideoProps {
  src: string;
  poster?: string | null;
  isActive?: boolean;
}

function isAbortError(video: HTMLVideoElement) {
  return video.error?.code === MediaError.MEDIA_ERR_ABORTED;
}

export function ReelVideo({ src, poster, isActive = true }: ReelVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaUrl(src);
  const resolvedPoster = resolveMediaUrl(poster);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolved) return;

    video.muted = true;
    video.playsInline = true;
    video.defaultMuted = true;

    let frameTimer: number | undefined;

    const markUnplayable = () => {
      if (videoRef.current !== video) return;
      if (isAbortError(video)) return;
      if (video.videoWidth > 0) return;
      setFailed(true);
    };

    const tryPlay = () => {
      if (!isActive || videoRef.current !== video) return;
      void video
        .play()
        .then(() => {
          setPaused(false);
          if (video.videoWidth > 0) {
            setFailed(false);
            return;
          }
          window.clearTimeout(frameTimer);
          frameTimer = window.setTimeout(markUnplayable, 900);
        })
        .catch(() => {
          setPaused(true);
        });
    };

    const handleError = () => {
      if (isAbortError(video)) return;
      setFailed(true);
    };
    const handlePlay = () => setPaused(false);
    const handlePause = () => {
      if (videoRef.current !== video) return;
      setPaused(true);
    };

    video.addEventListener('loadeddata', tryPlay);
    video.addEventListener('canplay', tryPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    if (isActive) {
      if (video.readyState >= 2) tryPlay();
    } else {
      video.pause();
      setPaused(true);
    }

    return () => {
      window.clearTimeout(frameTimer);
      video.removeEventListener('loadeddata', tryPlay);
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [isActive, resolved]);

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video || failed) return;
    if (video.paused) {
      video.muted = true;
      void video.play().catch(() => {
        if (video.error && !isAbortError(video)) setFailed(true);
      });
    } else {
      video.pause();
    }
  };

  return (
    <div className="absolute inset-0 bg-black">
      <video
        ref={videoRef}
        src={resolved}
        poster={failed ? undefined : resolvedPoster || undefined}
        className="absolute inset-0 block h-full w-full object-cover object-center"
        muted
        playsInline
        loop
        autoPlay={isActive}
        preload={isActive ? 'auto' : 'metadata'}
        aria-label="릴스 동영상"
      />
      {failed && (
        <p className="absolute inset-0 z-[1] flex items-center justify-center px-6 text-center text-sm text-white">
          동영상을 재생할 수 없습니다.
        </p>
      )}
      {isActive && paused && !failed && (
        <button
          type="button"
          onClick={handleTogglePlay}
          className="absolute inset-0 z-[1] flex items-center justify-center"
          aria-label="재생"
        >
          <span className="rounded-full bg-black/50 p-4 text-white">
            <Play size={36} fill="white" />
          </span>
        </button>
      )}
    </div>
  );
}
