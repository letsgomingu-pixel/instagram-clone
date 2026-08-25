import { cn } from '@/utils/cn';
import type { StoryOverlay } from '@/types';

interface StoryOverlayLayerProps {
  overlays: StoryOverlay[];
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (overlays: StoryOverlay[]) => void;
}

export function StoryOverlayLayer({
  overlays,
  editable = false,
  selectedId,
  onSelect,
  onChange,
}: StoryOverlayLayerProps) {
  const updateOverlay = (id: string, patch: Partial<StoryOverlay>) => {
    if (!onChange) return;
    onChange(overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const handleDrag = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || !onChange) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(id);

    const layer = e.currentTarget.parentElement;
    if (!layer) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const overlay = overlays.find((o) => o.id === id);
    if (!overlay) return;
    const originX = overlay.x;
    const originY = overlay.y;

    const onMove = (ev: PointerEvent) => {
      const rect = layer.getBoundingClientRect();
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      updateOverlay(id, {
        x: Math.min(95, Math.max(5, originX + dx)),
        y: Math.min(95, Math.max(5, originY + dy)),
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {overlays.map((overlay) => {
        const isSelected = selectedId === overlay.id;
        const scale = overlay.scale ?? 1;
        const rotation = overlay.rotation ?? 0;

        return (
          <div
            key={overlay.id}
            data-testid={`story-overlay-${overlay.type}`}
            data-overlay-id={overlay.id}
            onPointerDown={(e) => handleDrag(overlay.id, e)}
            onClick={(e) => {
              if (!editable) return;
              e.stopPropagation();
              onSelect?.(overlay.id);
            }}
            className={cn(
              'absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none',
              editable && isSelected && 'ring-2 ring-white/80 rounded-md',
            )}
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
            }}
          >
            {overlay.type === 'text' ? (
              <span
                contentEditable={editable && isSelected}
                suppressContentEditableWarning
                onBlur={(e) =>
                  updateOverlay(overlay.id, { content: e.currentTarget.textContent || '텍스트' })
                }
                className="font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] outline-none whitespace-pre-wrap max-w-[240px] text-center"
                style={{
                  color: overlay.color || '#ffffff',
                  fontSize: overlay.font_size ? `${overlay.font_size}px` : '24px',
                }}
              >
                {overlay.content}
              </span>
            ) : (
              <span className="text-5xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {overlay.content}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
