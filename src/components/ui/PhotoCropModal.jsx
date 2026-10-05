import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Check, RotateCcw, Image } from 'lucide-react';

// Drag-to-position / slider-to-zoom photo crop, same interaction as the Candidate Portal's
// profile photo crop. The round guide shows how the photo appears in round avatars; the saved
// image is the full square (so JPEG corners are never black).
const VIEW_SIZE = 240; // on-screen crop area, px
const OUTPUT_SIZE = 600; // saved image, px (square)

/**
 * @param {File|null} file      image to crop (the modal is open while a file is set)
 * @param {Function}  onConfirm receives the cropped image as a File (image/jpeg)
 * @param {Function}  onClose   cancel
 */
export default function PhotoCropModal({ file, onConfirm, onClose, title = 'Crop Photo' }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const dragRef = useRef({ sx: 0, sy: 0, px: 0, py: 0 });
  const imgRef = useRef(null);

  // Load the chosen file each time the modal opens.
  useEffect(() => {
    if (!file) return undefined;
    setPos({ x: 0, y: 0 });
    setScale(1);
    setNaturalSize({ w: 0, h: 0 });
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const fitScale = naturalSize.w ? Math.max(VIEW_SIZE / naturalSize.w, VIEW_SIZE / naturalSize.h) : 1;

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setScale(Math.max(VIEW_SIZE / img.naturalWidth, VIEW_SIZE / img.naturalHeight));
  };

  // ── Drag (mouse and touch share the same math) ──
  const startDrag = (x, y) => {
    dragRef.current = { sx: x, sy: y, px: pos.x, py: pos.y };
    setDragging(true);
  };
  const moveDrag = useCallback((x, y) => {
    setPos({ x: dragRef.current.px + (x - dragRef.current.sx), y: dragRef.current.py + (y - dragRef.current.sy) });
  }, []);

  useEffect(() => {
    if (!dragging) return undefined;
    const onMove = (e) => moveDrag(e.clientX, e.clientY);
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, moveDrag]);

  // Same coordinates for the preview and the saved image.
  const displayW = naturalSize.w * scale;
  const displayH = naturalSize.h * scale;
  const imgLeft = VIEW_SIZE / 2 + pos.x - displayW / 2;
  const imgTop = VIEW_SIZE / 2 + pos.y - displayH / 2;

  const handleApply = () => {
    const img = imgRef.current;
    if (!img || !naturalSize.w) return;
    const ratio = OUTPUT_SIZE / VIEW_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(img, imgLeft * ratio, imgTop * ratio, displayW * ratio, displayH * ratio);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const name = (file?.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
      onConfirm(new File([blob], name, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-[1400] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-crop-title"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Image size={18} className="text-emerald-800" />
            <h3 id="photo-crop-title" className="text-base font-semibold text-slate-800">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          <p className="text-xs text-slate-500 text-center">
            <span className="font-medium text-slate-700">Drag</span> to reposition ·{' '}
            <span className="font-medium text-slate-700">Slider</span> to zoom
          </p>

          <div
            className="relative flex-shrink-0 select-none overflow-hidden rounded-lg bg-slate-200"
            style={{ width: VIEW_SIZE, height: VIEW_SIZE, cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
            onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
            onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={() => setDragging(false)}
          >
            {imgSrc && (
              <img
                ref={imgRef}
                src={imgSrc}
                alt="Crop preview"
                draggable={false}
                onLoad={handleImgLoad}
                style={{
                  position: 'absolute', left: imgLeft, top: imgTop,
                  width: displayW || 'auto', height: displayH || 'auto',
                  maxWidth: 'none', pointerEvents: 'none',
                }}
              />
            )}
            {/* Round guide: how the photo looks in round avatars */}
            <div
              className="absolute inset-0 pointer-events-none rounded-full"
              style={{ boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.35)', border: '2px solid rgba(255,255,255,0.9)' }}
            />
          </div>

          <div className="w-full flex items-center gap-3">
            <span className="text-base text-slate-400 font-bold leading-none">−</span>
            <input
              id="photo-crop-zoom"
              type="range"
              min={fitScale * 0.5}
              max={fitScale * 4}
              step={fitScale / 50}
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-emerald-700 h-1.5 cursor-pointer"
              aria-label="Zoom"
            />
            <span className="text-base text-slate-400 font-bold leading-none">+</span>
          </div>

          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => { setPos({ x: 0, y: 0 }); setScale(fitScale); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <RotateCcw size={12} /> Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!naturalSize.w}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-60"
            >
              <Check size={13} /> Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
