import { useState, useRef, useCallback } from "react";
import { POWERS }               from "./constants";
import { makeBoard, tickBoard }  from "./boardUtils";
import { playSound }             from "./audio/sounds";
import { MapView }               from "./components/MapView";
import { ContextMenu }           from "./components/ContextMenu";
import { HUD }                   from "./components/HUD";

const DEFAULT_COLS     = 20;
const DEFAULT_ROWS     = 30;
const DEFAULT_CELLSIZE = 48;

function makeFogSet(cols, rows) {
  const s = new Set();
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      s.add(`${r},${c}`);
  return s;
}

export default function App() {
  const [mapImage, setMapImage]             = useState(null);
  const [board, setBoard]                   = useState(() => makeBoard(DEFAULT_COLS, DEFAULT_ROWS));
  const [gridCols, setGridCols]             = useState(DEFAULT_COLS);
  const [gridRows, setGridRows]             = useState(DEFAULT_ROWS);
  const [cellSize, setCellSize]             = useState(DEFAULT_CELLSIZE);
  const [rotation, setRotation]             = useState(0);
  const [gridColor, setGridColor]           = useState("rgba(0,0,0,0.55)");
  const [mode, setMode]                     = useState("power");
  const [currentPower, setCurrentPower]     = useState(POWERS[0]);
  const [customDuration, setCustomDuration] = useState(POWERS[0].duration);
  const [turn, setTurn]                     = useState(1);
  const [status, setStatus]                 = useState("Clic derecho → menú · Carga tu imagen de mapa");
  const [menuPos, setMenuPos]               = useState(null);

  // fog: null = sin neblina
  // fogSet: el Set mutable, fogVersion: número que fuerza re-render
  const fogSetRef                           = useRef(null);
  const [fogVersion, setFogVersion]         = useState(0);

  const fileInputRef = useRef(null);

  // Derived: is fog active?
  const fogActive = fogSetRef.current !== null;

  // Active effects summary
  const activeEffects = (() => {
    const map = {};
    for (const row of board)
      for (const cell of row)
        for (const e of cell.effects) {
          if (!map[e.powerId]) map[e.powerId] = 0;
          map[e.powerId] = Math.max(map[e.powerId], e.remaining);
        }
    return Object.entries(map)
      .map(([id, maxRem]) => ({ pw: POWERS.find(p => p.id === id), maxRem }))
      .filter(x => x.pw);
  })();

  const handleLoadMap = useCallback(() => fileInputRef.current?.click(), []);
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMapImage(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
    setStatus(`Mapa cargado: ${file.name}`);
    e.target.value = "";
  }, []);

  const handleGridColsChange = useCallback((n) => {
    const cols = Math.max(4, Math.min(60, n));
    setGridCols(cols); setBoard(makeBoard(cols, gridRows));
    if (fogSetRef.current) {
      fogSetRef.current = makeFogSet(cols, gridRows);
      setFogVersion(v => v + 1);
    }
  }, [gridRows]);

  const handleGridRowsChange = useCallback((n) => {
    const rows = Math.max(4, Math.min(60, n));
    setGridRows(rows); setBoard(makeBoard(gridCols, rows));
    if (fogSetRef.current) {
      fogSetRef.current = makeFogSet(gridCols, rows);
      setFogVersion(v => v + 1);
    }
  }, [gridCols]);

  const handleCellSizeChange = useCallback((n) => setCellSize(Math.max(20, Math.min(100, n))), []);

  const handleNextTurn = useCallback(() => {
    const { next, expired } = tickBoard(board, POWERS);
    setBoard(next);
    setTurn(t => {
      const nt = t + 1;
      setStatus(`⏭ Turno ${nt}${expired.length ? ` · Expiró: ${expired.join(", ")}` : ""}.`);
      return nt;
    });
  }, [board]);

  const handleClear = useCallback(() => {
    setBoard(makeBoard(gridCols, gridRows)); setTurn(1); setStatus("Efectos limpiados.");
  }, [gridCols, gridRows]);

  const handleSetMode = useCallback((m) => {
    setMode(m);
    if (m === "power") setStatus(`Poder: ${currentPower.name} · ${customDuration} turno(s) · dibuja a mano libre.`);
    if (m === "erase") setStatus(fogSetRef.current ? "Borrar: arrastra para revelar neblina o limpiar efectos." : "Borrar: arrastra para limpiar efectos.");
  }, [currentPower, customDuration]);

  const handleSelectPower = useCallback((pw) => {
    setCurrentPower(pw); setCustomDuration(pw.duration);
    setStatus(`${pw.name} · duración: ${pw.duration} turno(s)`);
  }, []);

  const handleDurationChange = useCallback((val) => {
    setCustomDuration(val);
    setStatus(`${currentPower.name} · duración personalizada: ${val} turno(s)`);
  }, [currentPower]);

  // Reveal fog on a single cell — mutate ref then bump version counter
  const handleRevealFog = useCallback((r, c) => {
    if (!fogSetRef.current) return;
    fogSetRef.current.delete(`${r},${c}`);
    if (fogSetRef.current.size === 0) fogSetRef.current = null;
    setFogVersion(v => v + 1); // triggers re-render
  }, []);

  const handleFogToggle = useCallback(() => {
    if (fogSetRef.current) {
      fogSetRef.current = null;
    } else {
      fogSetRef.current = makeFogSet(gridCols, gridRows);
    }
    setFogVersion(v => v + 1);
  }, [gridCols, gridRows]);

  const handleSound = useCallback((soundId) => {
    if (soundId) playSound(soundId);
  }, []);

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*,.webp"
        style={{ display: "none" }} onChange={handleFileChange} />

      <MapView
        mapImage={mapImage}
        board={board}             setBoard={setBoard}
        gridCols={gridCols}       gridRows={gridRows}
        cellSize={cellSize}       rotation={rotation}
        gridColor={gridColor}
        fogSet={fogSetRef.current}
        onRevealFog={handleRevealFog}
        mode={mode}               currentPower={currentPower}
        customDuration={customDuration}
        setStatus={setStatus}
        onContextMenu={pos => setMenuPos(pos)}
        onSoundTrigger={handleSound}
      />

      <HUD
        mode={mode}             currentPower={currentPower}
        customDuration={customDuration}
        turn={turn}             status={status}
        activeEffects={activeEffects}
      />

      {menuPos && (
        <ContextMenu
          pos={menuPos}
          mode={mode}               currentPower={currentPower}
          customDuration={customDuration}
          onSelectPower={handleSelectPower}
          onSetMode={handleSetMode}
          onClose={() => setMenuPos(null)}
          onLoadMap={handleLoadMap}
          onDurationChange={handleDurationChange}
          gridCols={gridCols}       gridRows={gridRows}       cellSize={cellSize}
          onGridColsChange={handleGridColsChange}
          onGridRowsChange={handleGridRowsChange}
          onCellSizeChange={handleCellSizeChange}
          onNextTurn={handleNextTurn}
          onClear={handleClear}
          turn={turn}
          rotation={rotation}       onRotationChange={setRotation}
          gridColor={gridColor}     onGridColorChange={setGridColor}
          fogActive={fogActive}     onFogToggle={handleFogToggle}
        />
      )}
    </>
  );
}
