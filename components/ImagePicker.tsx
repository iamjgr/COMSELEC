'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Pencil, ImagePlus, Move } from 'lucide-react';

interface ImagePickerProps {
  imagePreview: string | null;
  imagePosition: string; // stored as "X% Y%"
  onImageChange: (file: File, previewUrl: string) => void;
  onPositionChange: (position: string) => void;
}

/**
 * Converts a stored "X% Y%" position string to { x, y } numbers (0–100).
 * Falls back to 50/50 (center) for legacy keyword values.
 */
function parsePosition(pos: string): { x: number; y: number } {
  if (!pos) return { x: 50, y: 50 };
  const parts = pos.trim().split(/\s+/);
  if (parts.length === 2) {
    const x = parseFloat(parts[0]);
    const y = parseFloat(parts[1]);
    if (!isNaN(x) && !isNaN(y)) return { x, y };
  }
  // Legacy keyword fallback
  const keywordMap: Record<string, { x: number; y: number }> = {
    'center':       { x: 50, y: 50 },
    'top':          { x: 50, y:  0 },
    'bottom':       { x: 50, y: 100 },
    'left':         { x:  0, y: 50 },
    'right':        { x: 100, y: 50 },
    'top left':     { x:  0, y:  0 },
    'top right':    { x: 100, y:  0 },
    'bottom left':  { x:  0, y: 100 },
    'bottom right': { x: 100, y: 100 },
  };
  return keywordMap[pos] ?? { x: 50, y: 50 };
}

export function ImagePicker({
  imagePreview,
  imagePosition,
  onImageChange,
  onPositionChange,
}: ImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // 'idle' | 'menu' | 'reposition'
  const [mode, setMode] = useState<'idle' | 'menu' | 'reposition'>('idle');

  // Natural image dimensions — needed to compute drag bounds
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // Working position during drag (numbers 0–100)
  const [pos, setPos] = useState<{ x: number; y: number }>(() => parsePosition(imagePosition));

  // Sync pos when imagePosition prop changes (e.g. when editing a different candidate)
  useEffect(() => {
    setPos(parsePosition(imagePosition));
  }, [imagePosition]);

  // Auto-enter reposition mode whenever a new image is loaded
  const prevPreview = useRef<string | null>(null);
  useEffect(() => {
    if (imagePreview && imagePreview !== prevPreview.current) {
      prevPreview.current = imagePreview;
      setMode('reposition');
    }
    if (!imagePreview) {
      prevPreview.current = null;
      setMode('idle');
    }
  }, [imagePreview]);

  // ---------- drag logic ----------
  const dragState = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startPosX: number;
    startPosY: number;
    // how many px of drag maps to 1% of position shift
    pxPerPctX: number;
    pxPerPctY: number;
  } | null>(null);

  /**
   * Compute how much drag (in px) equals 1% of position.
   * The image is rendered at scale: containerW/naturalW (cover logic).
   * The "overflow" in each axis is (renderedDim - containerDim).
   * Moving across that full overflow = moving from 0% to 100%.
   */
  const computePxPerPct = useCallback(() => {
    const container = containerRef.current;
    if (!container || !naturalSize) return { x: 4, y: 4 };

    const cW = container.clientWidth;
    const cH = container.clientHeight;
    const scale = Math.max(cW / naturalSize.w, cH / naturalSize.h);
    const renderedW = naturalSize.w * scale;
    const renderedH = naturalSize.h * scale;
    const overflowX = renderedW - cW;
    const overflowY = renderedH - cH;

    // If overflow is 0 (image perfectly fits), dragging does nothing — use large number
    return {
      x: overflowX > 0 ? overflowX / 100 : 9999,
      y: overflowY > 0 ? overflowY / 100 : 9999,
    };
  }, [naturalSize]);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    if (mode !== 'reposition') return;
    const { x: pxX, y: pxY } = computePxPerPct();
    dragState.current = {
      active: true,
      startClientX: clientX,
      startClientY: clientY,
      startPosX: pos.x,
      startPosY: pos.y,
      pxPerPctX: pxX,
      pxPerPctY: pxY,
    };
  }, [mode, pos, computePxPerPct]);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragState.current?.active) return;
    const ds = dragState.current;
    const dx = clientX - ds.startClientX;
    const dy = clientY - ds.startClientY;

    // Dragging right/down moves the focal point left/up (image slides right/down)
    const newX = Math.min(100, Math.max(0, ds.startPosX - dx / ds.pxPerPctX));
    const newY = Math.min(100, Math.max(0, ds.startPosY - dy / ds.pxPerPctY));
    setPos({ x: newX, y: newY });
  }, []);

  const endDrag = useCallback(() => {
    if (!dragState.current?.active) return;
    dragState.current.active = false;
  }, []);

  // Attach global mouse/touch move & up so drag works outside the element
  useEffect(() => {
    if (mode !== 'reposition') return;

    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const onMouseUp = () => endDrag();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => endDrag();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [mode, moveDrag, endDrag]);

  const handleDone = () => {
    onPositionChange(`${Math.round(pos.x)}% ${Math.round(pos.y)}%`);
    setMode('idle');
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPos({ x: 50, y: 50 }); // reset position for new image
    onImageChange(file, url);
    // mode will flip to 'reposition' via the useEffect above
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const posStyle = `${Math.round(pos.x)}% ${Math.round(pos.y)}%`;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidate Photo</p>

      {/* 4:3 preview container — matches voter card image ratio */}
      <div className="relative w-full" style={{ maxWidth: 260 }}>
        <div
          ref={containerRef}
          className={`w-full overflow-hidden rounded-2xl bg-gray-100 border-2 transition-colors select-none
            ${mode === 'reposition'
              ? 'border-[#9B7248] cursor-grab active:cursor-grabbing'
              : 'border-dashed border-gray-300'}
          `}
          style={{ aspectRatio: '4/3' }}
          onMouseDown={e => startDrag(e.clientX, e.clientY)}
          onTouchStart={e => {
            if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY);
          }}
        >
          {imagePreview ? (
            <img
              ref={imgRef}
              src={imagePreview}
              alt="Preview"
              draggable={false}
              onLoad={e => {
                const img = e.currentTarget;
                setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
              }}
              className="w-full h-full object-cover pointer-events-none transition-none"
              style={{ objectPosition: posStyle }}
            />
          ) : (
            /* Empty state — clicking opens file picker */
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-500 transition-colors"
            >
              <ImagePlus className="w-8 h-8" />
              <span className="text-xs font-medium">Upload photo</span>
            </button>
          )}

          {/* Reposition overlay hint */}
          {mode === 'reposition' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Cross-hair */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Move className="w-8 h-8 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
              </div>
              {/* Top label */}
              <div className="absolute top-2 left-0 right-0 flex justify-center">
                <span className="text-[10px] font-semibold text-white bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  Drag to reposition
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Pencil button — top-right corner of the preview */}
        {imagePreview && mode !== 'reposition' && (
          <div className="absolute top-2 right-2 z-10">
            <button
              type="button"
              onClick={() => setMode(mode === 'menu' ? 'idle' : 'menu')}
              className="w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#9B7248] hover:border-[#9B7248] transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown menu */}
            {mode === 'menu' && (
              <div className="absolute top-10 right-0 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-40 z-20">
                <button
                  type="button"
                  onClick={() => { setMode('idle'); fileInputRef.current?.click(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ImagePlus className="w-4 h-4 text-gray-400" />
                  Change Photo
                </button>
                <div className="border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => setMode('reposition')}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Move className="w-4 h-4 text-gray-400" />
                  Reposition
                </button>
              </div>
            )}
          </div>
        )}

        {/* Done button — shown during reposition */}
        {mode === 'reposition' && (
          <div className="absolute bottom-2 right-2 z-10">
            <button
              type="button"
              onClick={handleDone}
              className="text-xs font-bold text-white bg-[#9B7248] hover:bg-[#7c5a38] px-3 py-1.5 rounded-lg shadow transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="text-[11px] text-gray-400">
        {mode === 'reposition'
          ? 'Drag the photo to frame the area voters will see, then tap Done.'
          : imagePreview
          ? 'Tap the ✏ icon to change photo or reposition.'
          : 'This is how the photo appears in the voting card (4:3).'}
      </p>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelected}
      />
    </div>
  );
}
