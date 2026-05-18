import { useEffect } from "react";
import { POWERS } from "../constants";

export function useDrawEffects(canvasRef, board, gridCols, gridRows, cellSize) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const cell = board[r]?.[c];
        if (!cell) continue;
        const x = c * cellSize;
        const y = r * cellSize;

        // Effects
        for (const eff of cell.effects) {
          const pw = POWERS.find(p => p.id === eff.powerId);
          if (!pw) continue;
          const ratio = pw.duration === 0 ? 1 : eff.remaining / pw.duration;
          const alpha = pw.alpha * Math.max(0.28, ratio);

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle   = pw.color;
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.restore();

          // Glowing border
          ctx.save();
          ctx.globalAlpha = 0.75 * Math.max(0.2, ratio);
          ctx.strokeStyle = pw.color;
          ctx.lineWidth   = 1.5;
          ctx.strokeRect(x + 0.75, y + 0.75, cellSize - 1.5, cellSize - 1.5);
          ctx.restore();
        }

        // Grid line (subtle)
        ctx.strokeStyle = "rgba(0,0,0,0.30)";
        ctx.lineWidth   = 0.5;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }
  }, [canvasRef, board, gridCols, gridRows, cellSize]);
}
