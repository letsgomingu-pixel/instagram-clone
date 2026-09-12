import { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import type { StoryOverlay } from '@/types';

interface StoryOverlayLayerProps {
  overlays: StoryOverlay[];
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (overlays: StoryOverlay[]) => void;
}

interface EditableStoryTextProps {
  overlay: StoryOverlay;
  editable: boolean;
  isSelected: boolean;
  onContentChange: (content: string) => void;
}

function EditableStoryText({
  overlay,
  editable,
  isSelected,
  onContentChange,
}: EditableStoryTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el || document.activeElement === el) return;
    if (el.textContent !== overlay.content) {
      el.textContent = overlay.content;
    }
  }, [overlay.content, overlay.id]);

  useEffect(() => {
    if (!editable || !isSelected) return;
    const el = textRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.focus();
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }, [editable, isSelected, overlay.id]);

  return (
    <span
      ref={textRef}
      contentEditable={editable && isSelected}
      suppressContentEditableWarning
      onPointerDown={(e) => {
        if (editable && isSelected) {
          e.stopPropagation();
        }
      }}
      onInput={(e) => onContentChange(e.currentTarget.textContent || '')}
      onBlur={(e) => onContentChange(e.currentTarget.textContent?.trim() || '텍스트')}
      className="font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] outline-none whitespace-pre-wrap max-w-[240px] text-center min-w-[1ch]"
      style={{
        color: overlay.color || '#ffffff',
        fontSize: overlay.font_size ? `${overlay.font_size}px` : '24px',
      }}
    />
  );
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

    const overlay = overlays.find((o) => o.id === id);
    if (!overlay) return;

    const target = e.target as HTMLElement;
    if (overlay.type === 'text' && selectedId === id) {
      if (target.isContentEditable || target.closest('[contenteditable="true"]')) {
        return;
      }
    }

    e.preventDefault();
    e.stopPropagation();
    onSelect?.(id);

    const layer = e.currentTarget.parentElement;
    if (!layer) return;

    const startX = e.clientX;
    const startY = e.clientY;
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
        const isEditableText = editable && overlay.type === 'text' && isSelected;

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
              'absolute pointer-events-auto',
              !isEditableText && 'select-none',
              isEditableText ? 'cursor-text' : 'cursor-grab active:cursor-grabbing',
              editable && isSelected && 'ring-2 ring-white/80 rounded-md',
            )}
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
            }}
          >
            {overlay.type === 'text' ? (
              <EditableStoryText
                overlay={overlay}
                editable={editable}
                isSelected={isSelected}
                onContentChange={(content) => updateOverlay(overlay.id, { content })}
              />
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
