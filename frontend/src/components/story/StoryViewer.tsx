import { useEffect, useState, useCallback, useRef } from 'react';

import toast from 'react-hot-toast';
import { X, ChevronLeft, ChevronRight, Eye, Heart, Trash2 } from 'lucide-react';

import { Avatar } from '@/components/common/Avatar';
import { MediaImage } from '@/components/common/MediaImage';
import { StoryOverlayLayer } from '@/components/story/StoryOverlayLayer';
import { formatRelativeTime } from '@/utils/formatDate';
import { isStoryVideoItem, resolveMediaUrl } from '@/utils/media';
import * as storiesApi from '@/api/stories';
import type { StoryViewerEntry } from '@/types';

import { useApp } from '@/contexts/AppContext';

import { useAuth } from '@/hooks/useAuth';

import { useRequireAuth } from '@/hooks/useRequireAuth';

interface StoryViewerProps {
  initialIndex: number;
  onClose: () => void;
}

const IMAGE_STORY_DURATION = 5000;
const mediaClassName = 'absolute inset-0 h-full w-full object-cover object-center';

export function StoryViewer({ initialIndex, onClose }: StoryViewerProps) {
  const { stories, markStoryViewed, refreshStories } = useApp();
  const { requireAuth, isAuthenticated } = useRequireAuth();
  const { user } = useAuth();
  const [storyIndex, setStoryIndex] = useState(initialIndex);
  const [itemIndex, setItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const goNextRef = useRef<() => void>(() => undefined);

  // "누가 봤는지" — only the story's own author can see this, and while the
  // list is open the story must stop auto-advancing (otherwise it moves on
  // while you're still reading who viewed it).
  const [viewers, setViewers] = useState<StoryViewerEntry[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [storyLiked, setStoryLiked] = useState(false);
  const paused = showViewers;

  const story = stories[storyIndex];
  const item = story?.items[itemIndex];
  const isVideo = isStoryVideoItem(item) && !videoFailed;
  const isOwn = !!user && !!story && story.user.id === user.id;

  useEffect(() => {
    setStoryLiked(item?.is_liked ?? false);
  }, [item?.id, item?.is_liked]);

  const sendStoryReply = useCallback(async () => {
    if (!replyText.trim() || !item) return;
    try {
      await storiesApi.replyToStory(item.id, replyText.trim());
      setReplyText('');
      toast.success('답장을 보냈습니다.');
    } catch {
      toast.error('스토리 답장이 허용되지 않습니다.');
    }
  }, [item, replyText]);

  useEffect(() => {
    setShowViewers(false);
    if (!story?.id || !isOwn) {
      setViewers([]);
      return;
    }
    const storyId = story.id;
    let cancelled = false;
    storiesApi
      .getStoryViewers(storyId)
      .then((data) => {
        if (!cancelled) setViewers(data);
      })
      .catch(() => {
        if (!cancelled) setViewers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [story?.id, isOwn]);

  const goNext = useCallback(() => {
    if (!story) return;

    if (itemIndex < story.items.length - 1) {
      setItemIndex((i) => i + 1);
      setProgress(0);
    } else if (storyIndex < stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setItemIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [story, itemIndex, storyIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (itemIndex > 0) {
      setItemIndex((i) => i - 1);
      setProgress(0);
    } else if (storyIndex > 0) {
      const prevStory = stories[storyIndex - 1];
      setStoryIndex((i) => i - 1);
      setItemIndex(prevStory.items.length - 1);
      setProgress(0);
    }
  }, [itemIndex, storyIndex, stories]);

  goNextRef.current = goNext;

  useEffect(() => {
    if (!story) return;
    markStoryViewed(story.id);
  }, [story?.id, markStoryViewed]);

  useEffect(() => {
    setProgress(0);
    setVideoFailed(false);
  }, [storyIndex, itemIndex, item?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!item || !isVideo || !video) return;

    const play = () => {
      void video.play().catch(() => setVideoFailed(true));
    };

    const handleError = () => setVideoFailed(true);

    video.addEventListener('loadedmetadata', play);
    video.addEventListener('error', handleError);
    if (video.readyState >= 1) play();

    return () => {
      video.removeEventListener('loadedmetadata', play);
      video.removeEventListener('error', handleError);
    };
  }, [item?.id, isVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!isVideo || !video) return;
    if (paused) {
      video.pause();
    } else {
      void video.play().catch(() => setVideoFailed(true));
    }
  }, [paused, isVideo]);

  // Always auto-advance. Do not wait for video events — iOS often never
  // fires them if autoplay is blocked, which left users stuck on a black slide.
  useEffect(() => {
    if (!item || paused) return;

    const startedAt = Date.now();
    let durationMs = IMAGE_STORY_DURATION;
    let advanced = false;
    let timeoutId = 0;

    const advance = () => {
      if (advanced) return;
      advanced = true;
      goNextRef.current();
    };

    const armTimeout = (ms: number) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(advance, Math.max(0, ms));
    };

    const syncProgress = () => {
      setProgress(Math.min(100, ((Date.now() - startedAt) / durationMs) * 100));
    };

    const useVideoDuration = () => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration < 0.4) return;
      durationMs = video.duration * 1000;
      armTimeout(durationMs - (Date.now() - startedAt));
      syncProgress();
    };

    armTimeout(durationMs);
    const intervalId = window.setInterval(syncProgress, 50);
    const video = videoRef.current;
    video?.addEventListener('loadedmetadata', useVideoDuration);
    video?.addEventListener('ended', advance);
    if (video && video.readyState >= 1) useVideoDuration();

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      video?.removeEventListener('loadedmetadata', useVideoDuration);
      video?.removeEventListener('ended', advance);
    };
  }, [item?.id, paused, storyIndex, itemIndex]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showViewers) setShowViewers(false);
        else onClose();
        return;
      }
      if (showViewers) return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose, goNext, goPrev, showViewers]);

  if (!story || !item) return null;

  const altText = `${story.user.username}의 스토리`;
  const mediaUrl = resolveMediaUrl(item.image_url);
  const handleDeleteStory = async () => {
    if (!window.confirm('스토리를 삭제할까요?')) return;
    try {
      await storiesApi.deleteStory(story.id);
      await refreshStories();
      toast.success('스토리가 삭제되었습니다.');
      onClose();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white hover:opacity-70"
        aria-label="닫기"
      >
        <X size={28} />
      </button>
      {isOwn && (
        <button
          type="button"
          onClick={() => void handleDeleteStory()}
          className="absolute top-4 left-4 z-10 text-white hover:opacity-70"
          aria-label="스토리 삭제"
        >
          <Trash2 size={24} />
        </button>
      )}

      {storyIndex > 0 || itemIndex > 0 ? (
        <button
          onClick={goPrev}
          className="absolute left-2 z-10 text-white/80 hover:text-white p-2 hidden md:block"
          aria-label="이전"
        >
          <ChevronLeft size={32} />
        </button>
      ) : null}

      {storyIndex < stories.length - 1 || itemIndex < story.items.length - 1 ? (
        <button
          onClick={goNext}
          className="absolute right-2 z-10 text-white/80 hover:text-white p-2 hidden md:block"
          aria-label="다음"
        >
          <ChevronRight size={32} />
        </button>
      ) : null}

      <div className="relative w-full max-w-[400px] h-full max-h-[100dvh] md:max-h-[90vh] md:rounded-xl overflow-hidden bg-black">
        <div
          className="absolute top-2 left-2 right-2 z-10 flex gap-1"
          data-testid="story-progress"
          data-story-auto-advance="5s"
        >
          {story.items.map((_, i) => (
            <div
              key={i}
              data-testid="story-progress-bar"
              className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-75"
                style={{
                  width: i < itemIndex ? '100%' : i === itemIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-5 left-3 right-3 z-10 flex items-center gap-3">
          <Avatar src={story.user.avatar_url} alt={story.user.username} size="sm" />
          <div className="flex-1">
            <span className="text-white text-sm font-semibold">{story.user.username}</span>
            <span className="text-white/70 text-xs ml-2">{formatRelativeTime(item.created_at)}</span>
          </div>
        </div>

        <div
          className="absolute inset-0 z-0 bg-black bg-center bg-cover"
          style={
            mediaUrl
              ? { backgroundImage: `url("${mediaUrl.replace(/"/g, '')}")` }
              : undefined
          }
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className={mediaClassName}
              muted
              playsInline
              autoPlay
              preload="auto"
              aria-label={altText}
              onError={() => setVideoFailed(true)}
            />
          ) : (
            <MediaImage
              src={item.image_url}
              alt={altText}
              className={mediaClassName}
              draggable={false}
            />
          )}
        </div>

        <StoryOverlayLayer overlays={item.overlays ?? []} />

        <div className="absolute inset-0 z-[1] flex">
          <button type="button" className="flex-1 bg-transparent" onClick={goPrev} aria-label="이전 스토리" />
          <button type="button" className="flex-1 bg-transparent" onClick={goNext} aria-label="다음 스토리" />
        </div>

        {isOwn ? (
          <button
            type="button"
            onClick={() => setShowViewers(true)}
            className="absolute bottom-4 left-3 right-3 z-10 flex items-center gap-2 text-white/90 hover:text-white"
          >
            <Eye size={18} />
            <span className="text-sm font-semibold">조회 {viewers.length}회</span>
          </button>
        ) : (
          <div className="absolute bottom-4 left-3 right-3 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                requireAuth(async () => {
                  if (!item) return;
                  const res = await storiesApi.likeStoryItem(item.id);
                  setStoryLiked(res.is_liked);
                })
              }
              aria-label="스토리 좋아요"
              className="p-2"
            >
              <Heart size={22} className={storyLiked ? 'fill-red-500 text-red-500' : 'text-white'} />
            </button>
            <input
              type="text"
              placeholder={isAuthenticated ? `${story.user.username}에게 답장...` : '로그인하여 답장...'}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => !isAuthenticated && requireAuth()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && replyText.trim() && item) {
                  requireAuth(() => void sendStoryReply());
                }
              }}
              readOnly={!isAuthenticated}
              className="flex-1 bg-transparent border border-white/50 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/70"
            />
            <button
              type="button"
              disabled={!replyText.trim() || !isAuthenticated}
              onClick={() => requireAuth(() => void sendStoryReply())}
              className="text-sm font-semibold text-white disabled:opacity-40 px-2"
            >
              보내기
            </button>
          </div>
        )}

        {isOwn && showViewers && (
          <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/40" onClick={() => setShowViewers(false)}>
            <div
              className="bg-white rounded-t-2xl max-h-[70%] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-ig-border shrink-0">
                <span className="text-sm font-semibold">조회 {viewers.length}회</span>
                <button type="button" onClick={() => setShowViewers(false)} aria-label="닫기">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto">
                {viewers.length === 0 ? (
                  <p className="text-sm text-ig-text-secondary text-center py-8">
                    아직 이 스토리를 본 사람이 없습니다.
                  </p>
                ) : (
                  viewers.map((v) => (
                    <div key={v.user.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Avatar src={v.user.avatar_url} alt={v.user.username} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{v.user.username}</p>
                        <p className="text-xs text-ig-text-secondary truncate">{v.user.full_name}</p>
                      </div>
                      <span className="text-xs text-ig-text-secondary shrink-0">
                        {formatRelativeTime(v.viewed_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
