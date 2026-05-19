import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useFreehand } from "../hooks/useFreehand";
import { POWERS }      from "../constants";
import s from "./MapView.module.css";

// ── Coordinate helpers ────────────────────────────────────────────────────────

function getImageRect(imgNW, imgNH, rotation, cw, ch) {
  const rad  = (rotation * Math.PI) / 180;
  const cosA = Math.abs(Math.cos(rad));
  const sinA = Math.abs(Math.sin(rad));
  const rotW = imgNW * cosA + imgNH * sinA;
  const rotH = imgNW * sinA + imgNH * cosA;
  const scale = Math.min(cw / rotW, ch / rotH);
  const w = rotW * scale;
  const h = rotH * scale;
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h, scale };
}


// Draw grid on its own canvas so it always appears above GIFs
function drawGrid(canvas, img, gridCols, gridRows, rotation, gridColor) {
  const ctx = canvas.getContext("2d");
  const cw  = canvas.width;
  const ch  = canvas.height;
  ctx.clearRect(0, 0, cw, ch);
  const nw = img?.naturalWidth  || cw;
  const nh = img?.naturalHeight || ch;
  const ir = getImageRect(nw, nh, rotation, cw, ch);
  const cellW = ir.w / gridCols;
  const cellH = ir.h / gridRows;
  ctx.strokeStyle = gridColor || "rgba(0,0,0,0.55)";
  ctx.lineWidth   = 1;
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      ctx.strokeRect(ir.x + c * cellW, ir.y + r * cellH, cellW, cellH);
    }
  }
}
function screenToGridCell(clientX, clientY, canvas, img, gridCols, gridRows, rotation) {
  if (!canvas) return null;
  const rect   = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const px = (clientX - rect.left) * scaleX;
  const py = (clientY - rect.top)  * scaleY;
  const nw = img?.naturalWidth  || canvas.width;
  const nh = img?.naturalHeight || canvas.height;
  const ir = getImageRect(nw, nh, rotation, canvas.width, canvas.height);
  const cellW = ir.w / gridCols;
  const cellH = ir.h / gridRows;
  const col   = Math.floor((px - ir.x) / cellW);
  const row   = Math.floor((py - ir.y) / cellH);
  if (col < 0 || col >= gridCols || row < 0 || row >= gridRows) return null;
  return [row, col];
}

// ── Canvas drawing (image + grid only, no effect colors) ─────────────────────

function drawScene(canvas, img, board, gridCols, gridRows, rotation) {
  const ctx = canvas.getContext("2d");
  const cw  = canvas.width;
  const ch  = canvas.height;

  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = "#0a0907";
  ctx.fillRect(0, 0, cw, ch);

  const nw = img?.naturalWidth  || cw;
  const nh = img?.naturalHeight || ch;
  const ir = getImageRect(nw, nh, rotation, cw, ch);

  if (img) {
    ctx.save();
    ctx.translate(ir.x + ir.w / 2, ir.y + ir.h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -nw * ir.scale / 2, -nh * ir.scale / 2, nw * ir.scale, nh * ir.scale);
    ctx.restore();
  }

  // Grid lines drawn on a separate canvas on top of GIFs
}

// ── GIF overlay layer ─────────────────────────────────────────────────────────
// Groups adjacent cells of the same power into a single <img> element
// so one GIF covers the whole painted area cleanly.

function groupEffects(board, gridRows, gridCols) {
  // One group per unique powerId — collect all cells with that effect
  const byPower = {};
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const cell = board[r]?.[c];
      if (!cell?.effects?.length) continue;
      for (const eff of cell.effects) {
        if (!byPower[eff.powerId]) byPower[eff.powerId] = [];
        byPower[eff.powerId].push([r, c]);
      }
    }
  }
  return Object.entries(byPower).map(([powerId, cells]) => ({ powerId, cells }));
}

function GifOverlay({ board, gridRows, gridCols, ir }) {
  const cellW = ir.w / gridCols;
  const cellH = ir.h / gridRows;

  const groups = useMemo(
    () => groupEffects(board, gridRows, gridCols),
    [board, gridRows, gridCols]
  );

  return (
    <>
      {groups.map((g, i) => {
        const pw = POWERS.find(p => p.id === g.powerId);
        if (!pw) return null;

        // Bounding box of the group
        const minR = Math.min(...g.cells.map(([r]) => r));
        const minC = Math.min(...g.cells.map(([, c]) => c));
        const maxR = Math.max(...g.cells.map(([r]) => r));
        const maxC = Math.max(...g.cells.map(([, c]) => c));

        const x = ir.x + minC * cellW;
        const y = ir.y + minR * cellH;
        const w = (maxC - minC + 1) * cellW;
        const h = (maxR - minR + 1) * cellH;

        // Build an SVG clipPath mask for non-rectangular selections
        const clipId = `clip-${i}`;
        const rects  = g.cells.map(([r, c]) => ({
          x: (c - minC) * cellW,
          y: (r - minR) * cellH,
          w: cellW,
          h: cellH,
        }));

        return (
          <div key={`${g.powerId}-${i}`} style={{
            position: "absolute",
            left: x, top: y,
            width: w, height: h,
            pointerEvents: "none",
            overflow: "hidden",
          }}>
            {/* SVG clip mask for irregular shapes */}
            <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
              <defs>
                <clipPath id={clipId}>
                  {rects.map((rect, ri) => (
                    <rect key={ri} x={rect.x} y={rect.y} width={rect.w} height={rect.h} />
                  ))}
                </clipPath>
              </defs>
              {/* No color fill — GIF only */}
            </svg>

            {/* GIF image clipped to the group shape */}
            <img
              src={`/effects/${g.powerId}.gif`}
              alt=""
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "cover",
                clipPath: `url(#${clipId})`,
                opacity: 0.85,
                mixBlendMode: "screen",
              }}
              onError={e => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        );
      })}
    </>
  );
}


// ── Fog of War layer ──────────────────────────────────────────────────────────
// Renders one GIF (or dark fallback) per fogged cell
function FogLayer({ fogSet, gridRows, gridCols, ir }) {
  const canvasRef = useRef(null);
  const clipId = useRef(`fog-clip-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fogSet || ir.w <= 0) return;
    canvas.width  = ir.w;
    canvas.height = ir.h;
    const ctx   = canvas.getContext("2d");
    const cellW = ir.w / gridCols;
    const cellH = ir.h / gridRows;

    ctx.clearRect(0, 0, ir.w, ir.h);
    ctx.fillStyle = "rgba(15,12,30,0.82)";
    ctx.fillRect(0, 0, ir.w, ir.h);

    ctx.globalCompositeOperation = "destination-out";
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if (!fogSet.has(`${r},${c}`)) {
          ctx.fillStyle = "rgba(0,0,0,1)";
          ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        }
      }
    }
    ctx.globalCompositeOperation = "source-over";
  });

  if (!fogSet || fogSet.size === 0 || ir.w <= 0) return null;

  const cellW = ir.w / gridCols;
  const cellH = ir.h / gridRows;

  // Build clipPath rects — only fogged cells show the GIF
  const foggedRects = [];
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (fogSet.has(`${r},${c}`)) {
        foggedRects.push({ x: c * cellW, y: r * cellH, w: cellW, h: cellH });
      }
    }
  }

  return (
    <div style={{
      position: "absolute",
      left: ir.x, top: ir.y,
      width: ir.w, height: ir.h,
      pointerEvents: "none",
    }}>
      {/* SVG clipPath — GIF only shows on fogged cells */}
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <clipPath id={clipId}>
            {foggedRects.map((rect, i) => (
              <rect key={i} x={rect.x} y={rect.y} width={rect.w} height={rect.h} />
            ))}
          </clipPath>
        </defs>
      </svg>

      {/* Canvas: dark fog with revealed holes */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, display: "block" }}
      />

      {/* GIF clipped to only fogged cells */}
      <img
        src="/effects/fog.gif"
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          opacity: 0.5,
          mixBlendMode: "screen",
          clipPath: `url(#${clipId})`,
        }}
        onError={e => { e.currentTarget.style.display = "none"; }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MapView({
  mapImage, board, setBoard,
  gridCols, gridRows, cellSize,
  rotation,
  mode, currentPower, customDuration,
  gridColor,
  fogSet, onRevealFog,
  setStatus, onContextMenu, onSoundTrigger,
}) {
  const sceneRef  = useRef(null);
  const gridRef   = useRef(null);
  const imgRef    = useRef(null);
  const boardRef  = useRef(board);
  const paramsRef = useRef({ gridCols, gridRows, rotation });

  boardRef.current  = board;
  paramsRef.current = { gridCols, gridRows, rotation, gridColor };

  // Track image rect in state so GifOverlay re-renders when it changes
  const [ir, setIr] = useState({ x: 0, y: 0, w: 0, h: 0, scale: 1 });

  const updateIR = useCallback(() => {
    const canvas = sceneRef.current;
    if (!canvas) return;
    const img = imgRef.current;
    const cw  = canvas.width;
    const ch  = canvas.height;
    const nw  = img?.naturalWidth  || cw;
    const nh  = img?.naturalHeight || ch;
    const { gridCols: gc, gridRows: gr, rotation: rot } = paramsRef.current;
    setIr(getImageRect(nw, nh, rot, cw, ch));
  }, []);

  // ── Resize ────────────────────────────────────────────────────────────────
  const doResize = useCallback(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    [sceneRef, gridRef].forEach(ref => {
      const c = ref.current;
      if (!c) return;
      c.width        = W;
      c.height       = H;
      c.style.width  = W + "px";
      c.style.height = H + "px";
    });
    doRedraw();
    updateIR();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateIR]);

  useEffect(() => {
    doResize();
    window.addEventListener("resize", doResize);
    return () => window.removeEventListener("resize", doResize);
  }, [doResize]);

  // ── Load image ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapImage) { imgRef.current = null; doRedraw(); updateIR(); return; }
    const img  = new window.Image();
    img.onload = () => { imgRef.current = img; doRedraw(); updateIR(); };
    img.src    = mapImage;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapImage, updateIR]);

  // ── Redraw canvas ─────────────────────────────────────────────────────────
  const rafRef   = useRef(null);
  const doRedraw = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const canvas = sceneRef.current;
      if (!canvas || !canvas.width) return;
      const { gridCols: gc, gridRows: gr, rotation: rot } = paramsRef.current;
      drawScene(canvas, imgRef.current, boardRef.current, gc, gr, rot);
      const gridCanvas = gridRef.current;
      if (gridCanvas) drawGrid(gridCanvas, imgRef.current, gc, gr, rot, paramsRef.current.gridColor);
    });
  }, []);

  useEffect(() => { doRedraw(); updateIR(); }, [board, rotation, gridCols, gridRows, gridColor, doRedraw, updateIR]);

  // ── screenToCell ──────────────────────────────────────────────────────────
  const screenToCell = useCallback((clientX, clientY) => {
    const { gridCols: gc, gridRows: gr, rotation: rot } = paramsRef.current;
    return screenToGridCell(clientX, clientY, sceneRef.current, imgRef.current, gc, gr, rot);
  }, []);

  // ── Sound ─────────────────────────────────────────────────────────────────
  const handleSoundAndVFX = useCallback((powerId) => {
    if (powerId) onSoundTrigger?.(powerId);
  }, [onSoundTrigger]);

  const { onPointerDown, onPointerMove, onPointerUp } = useFreehand({
    cellSize, gridCols, gridRows, mode, currentPower, customDuration,
    setBoard, setStatus, onSoundAndVFX: handleSoundAndVFX,
    onRevealFog, screenToCell,
  });

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    onContextMenu({ x: e.clientX, y: e.clientY });
  }, [onContextMenu]);

  return (
    <div className={s.wrap} onContextMenu={handleContextMenu}>
      {!mapImage && (
        <div className={s.placeholder}>
          <div className={s.placeholderInner}>
            <div className={s.placeholderIcon}>🗺</div>
            <p className={s.placeholderTitle}>Sin mapa cargado</p>
            <p className={s.placeholderSub}>Clic derecho → Cargar imagen de mapa</p>
          </div>
        </div>
      )}

      {/* Base canvas: image + grid */}
      <canvas
        ref={sceneRef}
        className={s.scene}
        style={{ cursor: mode === "erase" ? "cell" : "crosshair" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onContextMenu={handleContextMenu}
      />

        {/* Grid canvas — always on top of GIFs */}
      {/* Fog of war — per-cell reveal */}
      {mapImage && fogSet && fogSet.size > 0 && ir.w > 0 && (
        <div className={s.gifLayer} style={{ pointerEvents: "none" }}>
          <FogLayer fogSet={fogSet} gridRows={gridRows} gridCols={gridCols} ir={ir} />
        </div>
      )}

      {/* GIF overlay — below grid */}
      {mapImage && ir.w > 0 && (
        <div className={s.gifLayer} style={{ pointerEvents: "none" }}>
          <GifOverlay
            board={board}
            gridRows={gridRows}
            gridCols={gridCols}
            ir={ir}
          />
        </div>
      )}

      {/* Grid canvas — on top of GIFs */}
      <canvas ref={gridRef} className={s.gridOverlay} style={{ pointerEvents: "none" }} />
    </div>
  );
}
