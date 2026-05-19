import { useEffect, useRef, useState } from "react";
import { POWERS, CATEGORIES } from "../constants";
import s from "./ContextMenu.module.css";

// Collapsible submenu section
function SubMenu({ id, icon, label, badge, active, children }) {
  const [open, setOpen] = useState(active ?? false);
  return (
    <div className={s.sub}>
      <button className={`${s.subHeader} ${open ? s.subHeaderOpen : ""}`}
        onClick={() => setOpen(o => !o)}>
        <span className={s.subIcon}>{icon}</span>
        <span className={s.subLabel}>{label}</span>
        {badge && <span className={s.subBadge}>{badge}</span>}
        <span className={`${s.subArrow} ${open ? s.subArrowOpen : ""}`}>›</span>
      </button>
      {open && <div className={s.subBody}>{children}</div>}
    </div>
  );
}

export function ContextMenu({
  pos, mode, currentPower, customDuration,
  onSelectPower, onSetMode, onClose,
  onLoadMap, onDurationChange,
  gridCols, gridRows, cellSize,
  onGridColsChange, onGridRowsChange, onCellSizeChange,
  onNextTurn, onClear, turn,
  rotation, onRotationChange,
  gridColor, onGridColorChange,
  fogActive, onFogToggle,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const down = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const key  = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  if (!pos) return null;

  const menuW = 280;
  const x = Math.min(pos.x, window.innerWidth  - menuW - 10);
  const y = Math.min(pos.y + 8, window.innerHeight - 20);

  const byCategory = Object.entries(CATEGORIES).map(([catId, cat]) => ({
    catId, cat,
    powers: POWERS.filter(p => p.category === catId),
  })).filter(g => g.powers.length > 0);

  const activePowerLabel = mode === "power" && currentPower
    ? `${currentPower.name} · ${customDuration}t`
    : null;

  return (
    <div ref={ref} className={s.menu} style={{ left: x, top: y }}
      onContextMenu={e => e.preventDefault()}>

      {/* ── Header ── */}
      <div className={s.header}>
        <span className={s.title}>⚔ D&D Map</span>
        <div className={s.headerRight}>
          <span className={s.turnBadge}>T{turn}</span>
          <button className={s.close} onClick={onClose}>✕</button>
        </div>
      </div>

      {/* ── Quick actions bar ── */}
      <div className={s.quickBar}>
        <button className={s.quickBtn} title="Cargar mapa" onClick={() => { onLoadMap(); onClose(); }}>🗺</button>
        <button className={s.quickBtn} title="Siguiente turno" onClick={() => { onNextTurn(); onClose(); }}>⏭</button>
        <button className={`${s.quickBtn} ${s.quickBtnDanger}`} title="Limpiar efectos" onClick={() => { onClear(); onClose(); }}>🗑</button>
        <div className={s.quickSep} />
        <button className={`${s.quickBtn} ${mode === "power" ? s.quickBtnActive : ""}`}
          title="Modo poder" onClick={() => onSetMode("power")}>⚡</button>
        <button className={`${s.quickBtn} ${mode === "erase" ? s.quickBtnErase : ""}`}
          title="Modo borrar" onClick={() => onSetMode("erase")}>✕</button>
        <div className={s.quickSep} />
        <button className={s.quickBtn} title="Girar mapa 90°"
          onClick={() => onRotationChange((rotation + 90) % 360)}>↻</button>
        <div className={s.quickSep} />
        <button className={`${s.quickBtn} ${fogActive ? s.quickBtnActive : ""}`}
          title={fogActive ? "Quitar neblina" : "Activar neblina"}
          onClick={onFogToggle}>🌫</button>
      </div>

      <div className={s.body}>

        {/* ── Poder activo ── */}
        {currentPower && mode === "power" && (
          <div className={s.activePowerBox}
            style={{ "--pw": currentPower.color, "--pw-bg": currentPower.bg }}>
            <div className={s.activePowerHeader}>
              <span className={s.activePowerDot} style={{ background: currentPower.color }} />
              <span className={s.activePowerName}>{currentPower.name}</span>
            </div>
            <div className={s.durationRow}>
              <span className={s.durationLabel}>Turnos</span>
              <div className={s.durationControls}>
                <button className={s.durationBtn}
                  onClick={() => onDurationChange(Math.max(1, customDuration - 1))}>−</button>
                <input type="number" min="1" max="20" value={customDuration}
                  className={s.durationInput}
                  onChange={e => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v) && v >= 1 && v <= 20) onDurationChange(v);
                  }} />
                <button className={s.durationBtn}
                  onClick={() => onDurationChange(Math.min(20, customDuration + 1))}>+</button>
                <span className={s.durationDefault}
                  onClick={() => onDurationChange(currentPower.duration)}>
                  def:{currentPower.duration}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Poderes ── */}
        <SubMenu id="powers" icon="⚡" label="Poderes" active={true}
          badge={activePowerLabel}>
          {byCategory.map(({ catId, cat, powers }) => (
            <div key={catId} className={s.catGroup}>
              <span className={s.catLabel} style={{ color: cat.color }}>{cat.label}</span>
              <div className={s.powerRow}>
                {powers.map(pw => {
                  const active = currentPower?.id === pw.id && mode === "power";
                  return (
                    <button key={pw.id}
                      className={`${s.powerBtn} ${active ? s.powerBtnActive : ""}`}
                      style={{ "--pw": pw.color, "--pw-bg": pw.bg }}
                      onClick={() => { onSelectPower(pw); onSetMode("power"); }}
                      title={pw.detail}>
                      <span className={s.powerDot} style={{ background: pw.color }} />
                      <span className={s.powerName}>{pw.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </SubMenu>

        {/* ── Cuadrícula ── */}
        <SubMenu id="grid" icon="⊞" label="Cuadrícula">
          <div className={s.gridRow}>
            <label className={s.gridLabel}>Cols
              <input type="number" min="4" max="60" value={gridCols} className={s.gridInput}
                onChange={e => onGridColsChange(parseInt(e.target.value) || gridCols)} />
            </label>
            <label className={s.gridLabel}>Filas
              <input type="number" min="4" max="60" value={gridRows} className={s.gridInput}
                onChange={e => onGridRowsChange(parseInt(e.target.value) || gridRows)} />
            </label>
          </div>
          <div className={s.colorRow}>
            <span className={s.colorLabel}>Color líneas</span>
            <div className={s.colorSwatches}>
              {["rgba(0,0,0,0.55)","rgba(255,255,255,0.6)","rgba(255,220,100,0.7)","rgba(100,200,255,0.7)","rgba(255,100,100,0.7)","rgba(100,255,150,0.7)"].map(col => (
                <button key={col} className={`${s.colorSwatch} ${gridColor === col ? s.colorSwatchActive : ""}`}
                  style={{ background: col === "rgba(0,0,0,0.55)" ? "#333" : col === "rgba(255,255,255,0.6)" ? "#eee" : col }}
                  onClick={() => onGridColorChange(col)}
                  title={col} />
              ))}
              <input type="color" className={s.colorPicker}
                title="Color personalizado"
                onChange={e => {
                  const hex = e.target.value;
                  const r = parseInt(hex.slice(1,3),16);
                  const g = parseInt(hex.slice(3,5),16);
                  const b = parseInt(hex.slice(5,7),16);
                  onGridColorChange(`rgba(${r},${g},${b},0.7)`);
                }} />
            </div>
          </div>
        </SubMenu>

        {/* ── Rotación ── */}
        <SubMenu id="rotation" icon="↻" label="Rotación">
          <div className={s.rotRow}>
            {[0, 90, 180, 270].map(deg => (
              <button key={deg}
                className={`${s.rotBtn} ${rotation === deg ? s.rotBtnActive : ""}`}
                onClick={() => onRotationChange(deg)}>
                {deg}°
              </button>
            ))}
          </div>
        </SubMenu>

      </div>
    </div>
  );
}
