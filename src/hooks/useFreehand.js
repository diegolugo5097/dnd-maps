import { useRef, useCallback } from "react";

export function useFreehand({
  cellSize, gridCols, gridRows,
  mode, currentPower, customDuration,
  setBoard, setStatus,
  onSoundAndVFX,
  onRevealFog,   // (r, c) => void  — called when erasing over a fogged cell
  screenToCell,
}) {
  const isDrawing    = useRef(false);
  const paintedSet   = useRef(new Set());
  const strokeCells  = useRef([]);
  const soundPlayed  = useRef(false);

  const modeRef         = useRef(mode);
  const powerRef        = useRef(currentPower);
  const durationRef     = useRef(customDuration);
  const setBoardRef     = useRef(setBoard);
  const setStatusRef    = useRef(setStatus);
  const vfxRef          = useRef(onSoundAndVFX);
  const revealRef       = useRef(onRevealFog);
  const screenToCellRef = useRef(screenToCell);

  modeRef.current         = mode;
  powerRef.current        = currentPower;
  durationRef.current     = customDuration ?? currentPower?.duration ?? 1;
  setBoardRef.current     = setBoard;
  setStatusRef.current    = setStatus;
  vfxRef.current          = onSoundAndVFX;
  revealRef.current       = onRevealFog;
  screenToCellRef.current = screenToCell;

  const getCell = useCallback((e) => {
    return screenToCellRef.current?.(e.clientX, e.clientY) ?? null;
  }, []);

  const stampCell = useCallback((r, c) => {
    const m  = modeRef.current;
    const pw = powerRef.current;
    const dur = durationRef.current;

    if (m === "erase") {
      // Reveal fog on this cell
      revealRef.current?.(r, c);
      // Also clear board effects
      setBoardRef.current(prev => {
        const next = prev.map(row => row.map(cell => ({ ...cell, effects: [...cell.effects] })));
        next[r][c] = { effects: [] };
        return next;
      });
      return;
    }

    if (m === "power" && pw) {
      setBoardRef.current(prev => {
        const next = prev.map(row => row.map(cell => ({ ...cell, effects: [...cell.effects] })));
        next[r][c].effects = next[r][c].effects.filter(e => e.powerId !== pw.id);
        next[r][c].effects.push({ powerId: pw.id, remaining: dur });
        return next;
      });
    }
  }, []);

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget?.setPointerCapture(e.pointerId);
    isDrawing.current   = true;
    paintedSet.current  = new Set();
    strokeCells.current = [];
    soundPlayed.current = false;

    const pos = getCell(e);
    if (!pos) return;
    const [r, c] = pos;
    paintedSet.current.add(`${r},${c}`);
    strokeCells.current.push(pos);
    stampCell(r, c);

    const pw = powerRef.current;
    if (modeRef.current === "power" && pw && !soundPlayed.current) {
      soundPlayed.current = true;
      vfxRef.current?.(pw.id, [[r, c]]);
    }
  }, [getCell, stampCell]);

  const onPointerMove = useCallback((e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const pos = getCell(e);
    if (!pos) return;
    const [r, c] = pos;
    const key = `${r},${c}`;
    if (!paintedSet.current.has(key)) {
      paintedSet.current.add(key);
      strokeCells.current.push(pos);
      stampCell(r, c);
      const pw = powerRef.current;
      if (modeRef.current === "power" && pw) {
        vfxRef.current?.(null, [[r, c]]);
      }
    }
  }, [getCell, stampCell]);

  const onPointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const count = strokeCells.current.length;
    if (count === 0) return;
    const m   = modeRef.current;
    const pw  = powerRef.current;
    const dur = durationRef.current;
    if (m === "power" && pw) {
      setStatusRef.current(`✅ ${pw.name} · ${count} celda(s) · ${dur} turno(s)`);
    } else if (m === "erase") {
      setStatusRef.current(`${count} celda(s) reveladas/borradas.`);
    }
    strokeCells.current = [];
    paintedSet.current  = new Set();
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}
