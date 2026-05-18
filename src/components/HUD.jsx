import { POWERS } from "../constants";
import s from "./HUD.module.css";

export function HUD({ mode, currentPower, customDuration, turn, status, activeEffects }) {
  const pw = mode === "power" ? currentPower : null;

  return (
    <div className={s.hud}>
      {/* Current tool */}
      <div className={s.tool}>
        {pw ? (
          <>
            <span className={s.dot} style={{ background: pw.color, boxShadow: `0 0 6px ${pw.color}` }} />
            <span className={s.toolName} style={{ color: pw.color }}>{pw.name}</span>
            <span className={s.toolSub}>{`${customDuration}t`}</span>
          </>
        ) : mode === "erase" ? (
          <span className={s.toolName} style={{ color: "var(--danger)" }}>✕ Borrar</span>
        ) : (
          <span className={s.toolName} style={{ color: "var(--text3)" }}>Sin herramienta</span>
        )}
      </div>

      {/* Separator */}
      <div className={s.sep} />

      {/* Status */}
      <span className={s.status}>{status}</span>

      {/* Separator */}
      <div className={s.sep} />

      {/* Active effects */}
      {activeEffects.length > 0 && (
        <div className={s.effects}>
          {activeEffects.map(({ pw: epw, maxRem }) => (
            <div key={epw.id} className={s.pill} style={{ "--pw": epw.color }} title={`${epw.name} · ${maxRem}t`}>
              <span className={s.pillDot} style={{ background: epw.color }} />
              <span className={s.pillName}>{epw.name}</span>
              {<span className={s.pillRem}>{maxRem}t</span>}
            </div>
          ))}
        </div>
      )}

      {/* Turn */}
      <div className={s.turn}>
        <span className={s.turnLabel}>Turno</span>
        <span className={s.turnNum}>{turn}</span>
      </div>

      {/* Hint */}
      <div className={s.hint}>clic derecho → menú</div>
    </div>
  );
}
