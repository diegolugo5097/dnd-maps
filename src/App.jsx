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

export default function App() {
  const [mapImage, setMapImage]           = useState(null);
  const [board, setBoard]                 = useState(() => makeBoard(DEFAULT_COLS, DEFAULT_ROWS));
  const [gridCols, setGridCols]           = useState(DEFAULT_COLS);
  const [gridRows, setGridRows]           = useState(DEFAULT_ROWS);
  const [cellSize, setCellSize]           = useState(DEFAULT_CELLSIZE);
  const [rotation, setRotation]           = useState(0);
  const [mode, setMode]                   = useState("power");
  const [currentPower, setCurrentPower]   = useState(POWERS[0]);
  const [customDuration, setCustomDuration] = useState(POWERS[0].duration);
  const [turn, setTurn]                   = useState(1);
  const [status, setStatus]               = useState("Clic derecho → menú · Carga tu imagen de mapa");
  const [menuPos, setMenuPos]             = useState(null);
  const fileInputRef                      = useRef(null);

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

  // File load
  const handleLoadMap = useCallback(() => fileInputRef.current?.click(), []);
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMapImage(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
    setStatus(`Mapa cargado: ${file.name}`);
    e.target.value = "";
  }, []);

  // Grid
  const handleGridColsChange = useCallback((n) => {
    const cols = Math.max(4, Math.min(60, n));
    setGridCols(cols); setBoard(makeBoard(cols, gridRows));
  }, [gridRows]);
  const handleGridRowsChange = useCallback((n) => {
    const rows = Math.max(4, Math.min(60, n));
    setGridRows(rows); setBoard(makeBoard(gridCols, rows));
  }, [gridCols]);
  const handleCellSizeChange = useCallback((n) => setCellSize(Math.max(20, Math.min(100, n))), []);

  // Turn
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

  // Mode & power
  const handleSetMode = useCallback((m) => {
    setMode(m);
    if (m === "power") setStatus(`Poder: ${currentPower.name} · ${customDuration === 0 ? "instantáneo" : `${customDuration} turno(s)`} · dibuja a mano libre.`);
    if (m === "erase") setStatus("Modo borrar · arrastra para limpiar.");
  }, [currentPower, customDuration]);

  const handleSelectPower = useCallback((pw) => {
    setCurrentPower(pw);
    setCustomDuration(pw.duration); // reset duration to power default
    setStatus(`${pw.name} · duración: ${pw.duration === 0 ? "instantáneo" : `${pw.duration} turno(s)`}`);
  }, []);

  const handleDurationChange = useCallback((val) => {
    setCustomDuration(val);
    setStatus(`${currentPower.name} · duración personalizada: ${val} turno(s)`);
  }, [currentPower]);

  // Sound
  const handleSound = useCallback((soundId) => {
    if (soundId) playSound(soundId);
  }, []);

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*,.webp"
        style={{ display: "none" }} onChange={handleFileChange} />

      <MapView
        mapImage={mapImage}
        board={board}         setBoard={setBoard}
        gridCols={gridCols}   gridRows={gridRows}
        cellSize={cellSize}   rotation={rotation}
        mode={mode}           currentPower={currentPower}
        customDuration={customDuration}
        setStatus={setStatus}
        onContextMenu={pos => setMenuPos(pos)}
        onSoundTrigger={handleSound}
      />

      <HUD
        mode={mode} currentPower={currentPower}
        customDuration={customDuration}
        turn={turn} status={status} activeEffects={activeEffects}
      />

      {menuPos && (
        <ContextMenu
          pos={menuPos}
          mode={mode}           currentPower={currentPower}
          customDuration={customDuration}
          onSelectPower={handleSelectPower}
          onSetMode={handleSetMode}
          onClose={() => setMenuPos(null)}
          onLoadMap={handleLoadMap}
          onDurationChange={handleDurationChange}
          gridCols={gridCols}   gridRows={gridRows}   cellSize={cellSize}
          onGridColsChange={handleGridColsChange}
          onGridRowsChange={handleGridRowsChange}
          onCellSizeChange={handleCellSizeChange}
          onNextTurn={handleNextTurn} onClear={handleClear}
          turn={turn}
          rotation={rotation}   onRotationChange={setRotation}
        />
      )}
    </>
  );
}
