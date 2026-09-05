import { useMemo, useState } from 'react';
import { Type, Sticker, Trash2 } from 'lucide-react';
import { StoryOverlayLayer } from '@/components/story/StoryOverlayLayer';
import type { StoryOverlay } from '@/types';
import { cn } from '@/utils/cn';

const STICKERS = ['❤️', '🔥', '✨', '😂', '🎉', '👏', '😍', '🙌', '💯', '🌟'];
const TEXT_COLORS = ['#ffffff', '#000000', '#ffd600', '#ff5e99', '#00d4ff'];

interface StoryEditorProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  overlays: StoryOverlay[];
  onOverlaysChange: (overlays: StoryOverlay[]) => void;
  onShare: () => void;
  onBack: () => void;
  uploading: boolean;
}

function newOverlayId() {
  return `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function StoryEditor({
  mediaUrl,
  mediaType,
  overlays,
  onOverlaysChange,
  onShare,
  onBack,
  uploading,
}: StoryEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);

  const selectedOverlay = useMemo(
    () => overlays.find((o) => o.id === selectedId) ?? null,
    [overlays, selectedId],
  );

  const addText = () => {
    const overlay: StoryOverlay = {
      id: newOverlayId(),
      type: 'text',
      content: '텍스트',
      x: 50,
      y: 50,
      color: textColor,
      font_size: 28,
      scale: 1,
      rotation: 0,
    };
    onOverlaysChange([...overlays, overlay]);
    setSelectedId(overlay.id);
    setShowStickers(false);
  };

  const addSticker = (emoji: string) => {
    const overlay: StoryOverlay = {
      id: newOverlayId(),
      type: 'sticker',
      content: emoji,
      x: 50,
      y: 40,
      scale: 1,
      rotation: 0,
    };
    onOverlaysChange([...overlays, overlay]);
    setSelectedId(overlay.id);
    setShowStickers(false);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    onOverlaysChange(overlays.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  };

  return (
    <div className="w-[400px] max-w-[95vw]">
      <div className="flex items-center justify-center border-b border-ig-border h-[42px] relative">
        <button onClick={onBack} className="absolute left-3 text-sm" aria-label="뒤로">
          ←
        </button>
        <h2 className="text-base font-semibold">입고 소식 편집</h2>
        <button
          onClick={onShare}
          disabled={uploading}
          aria-label="입고 소식 공유"
          className="absolute right-3 text-ig-primary font-semibold text-sm disabled:opacity-50"
        >
          {uploading ? '공유 중...' : '공유'}
        </button>
      </div>

      <div
        className="relative aspect-[9/16] max-h-[60vh] bg-black overflow-hidden"
        onClick={() => setSelectedId(null)}
      >
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
            autoPlay
            loop
          />
        ) : (
          <img src={mediaUrl} alt="입고 소식 미리보기" className="w-full h-full object-cover" />
        )}

        <StoryOverlayLayer
          overlays={overlays}
          editable
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChange={onOverlaysChange}
        />
      </div>

      <div className="border-t border-ig-border p-3 space-y-3">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={addText}
            aria-label="텍스트 추가"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ig-secondary hover:bg-[#dbdbdb] text-sm font-semibold"
          >
            <Type size={18} />
            텍스트
          </button>
          <button
            type="button"
            onClick={() => setShowStickers((v) => !v)}
            aria-label="스티커 추가"
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold',
              showStickers ? 'bg-ig-primary text-white' : 'bg-ig-secondary hover:bg-[#dbdbdb]',
            )}
          >
            <Sticker size={18} />
            스티커
          </button>
          {selectedId && (
            <button
              type="button"
              onClick={removeSelected}
              aria-label="선택 항목 삭제"
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-ig-red text-sm font-semibold"
            >
              <Trash2 size={16} />
              삭제
            </button>
          )}
        </div>

        {selectedOverlay?.type === 'text' && (
          <div className="flex items-center justify-center gap-2">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`텍스트 색상 ${color}`}
                onClick={() => {
                  setTextColor(color);
                  onOverlaysChange(
                    overlays.map((o) => (o.id === selectedId ? { ...o, color } : o)),
                  );
                }}
                className={cn(
                  'h-7 w-7 rounded-full border-2',
                  textColor === color ? 'border-ig-primary' : 'border-ig-border',
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}

        {showStickers && (
          <div className="grid grid-cols-5 gap-2" data-testid="sticker-picker">
            {STICKERS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`스티커 ${emoji}`}
                onClick={() => addSticker(emoji)}
                className="text-3xl p-2 rounded-lg hover:bg-ig-secondary"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
