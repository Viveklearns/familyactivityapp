import React, { useCallback, useEffect, useRef, useState } from 'react';

// The canvas always has the same internal size. CSS scales it to fit each
// screen, and points are stored as 0–1 fractions, so every device draws the
// same picture whatever its size.
const W = 800;
const H = 600;

const COLORS = [
  '#1f1f1f', '#ffffff', '#9ca3af', '#ef4444', '#f97316', '#facc15',
  '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#92400e',
];
const SIZES = [4, 10, 22];

function drawStroke(ctx, s, fromIndex = 0) {
  const pts = s.pts;
  if (!pts.length) return;
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0] * W, pts[0][1] * H, s.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const start = Math.max(0, fromIndex - 1);
  ctx.beginPath();
  ctx.moveTo(pts[start][0] * W, pts[start][1] * H);
  for (let i = start + 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * W, pts[i][1] * H);
  ctx.stroke();
}

export default function Board({ socket, canDraw }) {
  const canvasRef = useRef(null);
  const strokes = useRef([]); // every stroke in the current picture
  const current = useRef(null); // the stroke being drawn by this player
  const pending = useRef([]); // points not yet sent to the server
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [eraser, setEraser] = useState(false);

  const redraw = useCallback(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    strokes.current.forEach((s) => drawStroke(ctx, s));
  }, []);

  // Listen for strokes drawn by other players.
  useEffect(() => {
    redraw();
    const ctx = canvasRef.current.getContext('2d');
    const onStart = (s) => {
      const stroke = { ...s, pts: [...s.pts] };
      strokes.current.push(stroke);
      drawStroke(ctx, stroke);
    };
    const onMove = ({ id, pts }) => {
      const s = strokes.current.find((st) => st.id === id);
      if (!s) return;
      const from = s.pts.length;
      s.pts.push(...pts);
      drawStroke(ctx, s, from);
    };
    const onSync = (all) => {
      strokes.current = all.map((s) => ({ ...s, pts: [...s.pts] }));
      redraw();
    };
    socket.on('stroke:start', onStart);
    socket.on('stroke:move', onMove);
    socket.on('canvas:sync', onSync);
    socket.emit('canvas:request'); // catch up if we joined mid-drawing
    return () => {
      socket.off('stroke:start', onStart);
      socket.off('stroke:move', onMove);
      socket.off('canvas:sync', onSync);
    };
  }, [socket, redraw]);

  // Send new points in small batches (about 25 a second) instead of one
  // message per mouse movement, which keeps the network traffic low.
  useEffect(() => {
    const t = setInterval(() => {
      if (current.current && pending.current.length) {
        socket.emit('stroke:move', { id: current.current.id, pts: pending.current });
        pending.current = [];
      }
    }, 40);
    return () => clearInterval(t);
  }, [socket]);

  const toPoint = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000];
  };

  const onDown = (e) => {
    if (!canDraw) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const stroke = {
      id: Math.random().toString(36).slice(2),
      color: eraser ? '#ffffff' : color,
      size: eraser ? size * 2 : size,
      pts: [toPoint(e)],
    };
    current.current = stroke;
    pending.current = [];
    strokes.current.push(stroke);
    drawStroke(canvasRef.current.getContext('2d'), stroke);
    socket.emit('stroke:start', stroke);
  };

  const onMove = (e) => {
    const s = current.current;
    if (!s) return;
    const p = toPoint(e);
    s.pts.push(p);
    pending.current.push(p);
    drawStroke(canvasRef.current.getContext('2d'), s, s.pts.length - 1);
  };

  const onUp = () => {
    if (current.current && pending.current.length) {
      socket.emit('stroke:move', { id: current.current.id, pts: pending.current });
    }
    pending.current = [];
    current.current = null;
  };

  return (
    <div className="dd-board">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className={canDraw ? 'can-draw' : ''}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      {canDraw && (
        <div className="dd-tools">
          <div className="dd-colors">
            {COLORS.map((c) => (
              <button
                key={c}
                aria-label={`color ${c}`}
                className={`dd-swatch ${!eraser && c === color ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => {
                  setColor(c);
                  setEraser(false);
                }}
              />
            ))}
          </div>
          <div className="dd-tool-group">
            {SIZES.map((s) => (
              <button
                key={s}
                aria-label={`brush size ${s}`}
                className={`dd-tool ${size === s ? 'active' : ''}`}
                onClick={() => setSize(s)}
              >
                <span className="dd-dot" style={{ width: s / 1.4 + 4, height: s / 1.4 + 4 }} />
              </button>
            ))}
            <button className={`dd-tool ${eraser ? 'active' : ''}`} onClick={() => setEraser(!eraser)} title="Eraser">
              🧽
            </button>
            <button className="dd-tool" onClick={() => socket.emit('canvas:undo')} title="Undo">
              ↩️
            </button>
            <button className="dd-tool" onClick={() => socket.emit('canvas:clear')} title="Clear">
              🗑️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
