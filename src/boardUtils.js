export function makeBoard(cols, rows) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ effects: [] }))
  );
}

export function tickBoard(board, powers) {
  const expired = [];
  const next = board.map(row =>
    row.map(cell => ({
      ...cell,
      effects: cell.effects.filter(e => {
        if (e.remaining <= 0) return false;
        e.remaining -= 1;
        if (e.remaining <= 0) {
          const pw = powers.find(p => p.id === e.powerId);
          if (pw) expired.push(pw.name);
          return false;
        }
        return true;
      }),
    }))
  );
  return { next, expired: [...new Set(expired)] };
}
