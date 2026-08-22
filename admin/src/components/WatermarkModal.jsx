import React from 'react';
import { PALETTE } from '../utils/watermark.js';

export function SliderRow({ label, value, min, max, step, unit, onChange }) {
  const id = `slider-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label htmlFor={id} className="label-mono">{label}</label>
        <span className="text-[0.72rem] font-semibold tabular-nums text-ink">{value}{unit}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{ height: 4, accentColor: 'var(--color-vermillion)' }}
      />
    </div>
  );
}

export function WatermarkPositionModal({ files, onConfirm, onCancel }) {
  const [pos, setPos] = React.useState({ x: 50, y: 50 });
  const [dragging, setDragging] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState('');
  const [opacity, setOpacity] = React.useState(20);
  const [angle, setAngle] = React.useState(0);
  const [fontSize, setFontSize] = React.useState(36);
  const [color, setColor] = React.useState('#ffffff');
  const [hexInput, setHexInput] = React.useState('#ffffff');
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!files?.[0]) return undefined;
    const url = URL.createObjectURL(files[0]);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [files]);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const calcPos = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  const pickColor = (c) => { setColor(c); setHexInput(c); };
  const handleHex = (v) => { setHexInput(v); if (/^#[0-9a-fA-F]{6}$/.test(v)) setColor(v); };

  return (
    <div
      className="fixed inset-0 flex flex-col lg:flex-row overflow-hidden"
      style={{ zIndex: 9999, background: 'rgba(23,20,15,0.9)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Position watermark"
    >
      {/* Canvas */}
      <div className="relative overflow-hidden flex items-center justify-center flex-1 lg:w-[70%]" style={{ background: '#14120f' }}>
        <div
          ref={containerRef}
          className="relative select-none cursor-crosshair w-full h-full"
          onMouseMove={(e) => { if (dragging) setPos(calcPos(e)); }}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
          onTouchMove={(e) => { e.preventDefault(); if (dragging) setPos(calcPos(e)); }}
          onTouchEnd={() => setDragging(false)}
          onClick={(e) => setPos(calcPos(e))}
        >
          {previewUrl && (
            <img src={previewUrl} alt="Watermark preview"
              className="w-full h-full object-contain block pointer-events-none"
              draggable={false} />
          )}
          <div
            className="absolute font-bold pointer-events-auto select-none"
            style={{
              left: `${pos.x}%`, top: `${pos.y}%`,
              transform: `translate(-50%, -50%) rotate(${angle}deg)`,
              fontSize: `${fontSize}px`,
              color, opacity: opacity / 100,
              textShadow: '1px 1px 8px rgba(0,0,0,0.95)',
              cursor: dragging ? 'grabbing' : 'grab',
              whiteSpace: 'nowrap', userSelect: 'none',
              letterSpacing: '0.02em',
            }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
            onTouchStart={(e) => { e.stopPropagation(); setDragging(true); }}
          >
            © pnpartstudio
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center text-white/35 text-[0.68rem] uppercase tracking-[0.16em] pointer-events-none select-none">
            Click or drag to position
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col overflow-y-auto w-full lg:w-[340px] shrink-0 bg-paper border-l border-rule max-h-[45vh] lg:max-h-none">
        <div className="px-5 pt-5 pb-4 border-b border-rule shrink-0">
          <h2 className="page-title !text-[1.15rem]">Watermark</h2>
          <p className="text-[0.76rem] text-slate mt-1">Drag on the image to reposition.</p>
        </div>

        <div className="flex-1 flex flex-col px-5 py-5 gap-4">
          <div className="panel panel-pad flex flex-col gap-4">
            <SliderRow label="Opacity" value={opacity} min={10} max={100} step={1} unit="%" onChange={setOpacity} />
            <div className="h-px bg-rule" />
            <SliderRow label="Angle" value={angle} min={-180} max={180} step={1} unit="°" onChange={setAngle} />
            <div className="h-px bg-rule" />
            <SliderRow label="Font size" value={fontSize} min={10} max={120} step={1} unit="px" onChange={setFontSize} />
          </div>

          <div className="panel panel-pad flex flex-col gap-3">
            <span className="label-mono">Colour</span>
            <div className="grid grid-cols-8 gap-1.5">
              {PALETTE.map(c => (
                <button
                  key={c} type="button" onClick={() => pickColor(c)}
                  aria-label={`Use colour ${c}`}
                  aria-pressed={color === c}
                  className="aspect-square transition-transform hover:scale-110 active:scale-95"
                  style={{
                    background: c,
                    outline: color === c ? '2px solid var(--color-vermillion)' : '1px solid var(--color-rule)',
                    outlineOffset: color === c ? '2px' : '0',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="panel panel-pad flex flex-col gap-2.5">
            <span className="label-mono">Custom colour</span>
            <div className="flex items-center gap-2 bg-paper-dim p-2 border border-rule">
              <label className="cursor-pointer shrink-0" title="Open colour picker">
                <span className="block w-8 h-8 border border-rule" style={{ background: color }} />
                <input type="color" value={color} onChange={(e) => pickColor(e.target.value)} className="sr-only" />
                <span className="sr-only">Choose custom colour</span>
              </label>
              <label htmlFor="hex-input" className="sr-only">Hex colour value</label>
              <input
                id="hex-input"
                type="text" value={hexInput} onChange={(e) => handleHex(e.target.value)}
                placeholder="#ffffff" maxLength={7}
                className="flex-1 bg-transparent text-[0.8rem] font-mono text-ink outline-none border-none w-0 min-w-0"
              />
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-2 shrink-0">
          <button
            className="btn btn-primary w-full !py-2.5"
            onClick={() => onConfirm({ pos, opacity, angle, fontSize, color })}
          >
            Apply &amp; upload
          </button>
          <button className="btn btn-ghost w-full !py-2.5" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
