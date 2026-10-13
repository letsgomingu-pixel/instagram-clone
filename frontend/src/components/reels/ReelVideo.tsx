import { useEffect, useRef, useState } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { resolveMediaUrl } from '@/utils/media';

interface ReelVideoProps {
  src: string;
  poster?: string | null;
  isActive?: boolean;
}

const SOUND_KEY = 'reel-sound';

function wantsSound() {
  try {
    return sessionStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

function rememberSound(on: boolean) {
  try {
    sessionStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // Private browsing can block storage. Playback still follows the button.
  }
}

function isAbortError(video: HTMLVideoElement) {
  return video.error?.code === MediaError.MEDIA_ERR_ABORTED;
}

export function ReelVideo({ src, poster, isActive = true }: ReelVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const userChoseSound = useRef(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(() => !wantsSound());
  const resolved = resolveMediaUrl(src);
  const resolvedPoster = resolveMediaUrl(poster);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    if (!muted) video.volume = 1;
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolved) return;

    const soundOn = wantsSound();
    video.muted = !soundOn;
    video.defaultMuted = !soundOn;
    setMuted(!soundOn);
    video.playsInline = true;

    let frameTimer: number | undefined;

    const markUnplayable = () => {
      if (videoRef.current !== video) return;
      if (isAbortError(video)) return;
      if (video.videoWidth > 0) return;
      setFailed(true);
    };

    const playMuted = () => {
      if (userChoseSound.current) return;
      video.muted = true;
      setMuted(true);
      void video.play().then(() => setPaused(false)).catch(() => setPaused(true));
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
          if (!video.muted) {
            playMuted();
            return;
          }
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
      void video.play().catch(() => {
        if (!video.muted) {
          video.muted = true;
          setMuted(true);
          void video.play().catch(() => {
            if (video.error && !isAbortError(video)) setFailed(true);
          });
          return;
        }
        if (video.error && !isAbortError(video)) setFailed(true);
      });
    } else {
      video.pause();
    }
  };

  const handleToggleSound = () => {
    const video = videoRef.current;
    if (!video || failed) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    if (!nextMuted) video.volume = 1;
    userChoseSound.current = !nextMuted;
    setMuted(nextMuted);
    rememberSound(!nextMuted);
    if (!nextMuted && video.paused) {
      void video.play().catch(() => setPaused(true));
    }
  };

  return (
    <div
      className="absolute inset-0 bg-black"
      onClick={() => {
        if (videoRef.current?.muted) handleToggleSound();
      }}
    >
      <video
        ref={videoRef}
        src={resolved}
        poster={failed ? undefined : resolvedPoster || undefined}
        className="absolute inset-0 block h-full w-full object-cover object-center"
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
      {isActive && !failed && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleToggleSound();
          }}
          className="absolute left-3 top-3 z-[3] flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[13px] font-semibold text-white"
          aria-label={muted ? '소리 켜기' : '소리 끄기'}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {muted ? '소리 켜기' : null}
        </button>
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

