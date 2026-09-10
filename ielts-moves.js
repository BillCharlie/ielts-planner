(function (root) {
  "use strict";

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function isoOrEmpty(value) {
    const text = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  function normalizeMove(move, index) {
    if (!move || typeof move !== "object") return null;
    const from = isoOrEmpty(move.from);
    const itemId = String(move.itemId || "").trim();
    const code = String(move.code || "").trim();
    if (!from || (!itemId && !code)) return null;
    return {
      id: String(move.id || `mv-${from}-${itemId || code}-${index}`),
      itemId: itemId || code,
      code,
      kind: String(move.kind || ""),
      label: String(move.label || ""),
      title: String(move.title || ""),
      full: String(move.full || ""),
      module: String(move.module || ""),
      duration: String(move.duration || ""),
      from,
      to: isoOrEmpty(move.to),
    };
  }

  // Drops malformed records, de-duplicates ids, and removes any move that
  // ended up back on its own origin date (that is simply "not moved").
  function normalize(list) {
    const seen = new Set();
    return toArray(list)
      .map(normalizeMove)
      .filter(Boolean)
      .filter((move) => move.to !== move.from)
      .filter((move) => {
        if (seen.has(move.id)) return false;
        seen.add(move.id);
        return true;
      });
  }

  function movedAway(moves, date) {
    const day = isoOrEmpty(date);
    return day ? normalize(moves).filter((move) => move.from === day) : [];
  }

  function movedInto(moves, date) {
    const day = isoOrEmpty(date);
    return day ? normalize(moves).filter((move) => move.to === day) : [];
  }

  function pending(moves) {
    return normalize(moves).filter((move) => !move.to);
  }

  // Splits a day's generated training items into the ones still owned by that
  // day and the ones rescheduled onto it from elsewhere.
  function itemsForDate(moves, date, baseItems) {
    const away = new Set(movedAway(moves, date).map((move) => move.itemId));
    return {
      kept: toArray(baseItems).filter((item) => !away.has(item.id)),
      incoming: movedInto(moves, date),
    };
  }

  // Pulls items off their current day into the holding pool. An item that was
  // already rescheduled keeps its original origin so it can be sent home later.
  function cancel(moves, entries, seed) {
    const next = normalize(moves);
    toArray(entries).forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return;
      const date = isoOrEmpty(entry.date);
      const itemId = String(entry.itemId || "").trim();
      if (!date || !itemId) return;
      const rescheduledHere = next.find((move) => move.itemId === itemId && move.to === date);
      if (rescheduledHere) {
        rescheduledHere.to = "";
        return;
      }
      if (next.some((move) => move.itemId === itemId && move.from === date)) return;
      const record = normalizeMove(
        { ...entry, id: `mv-${date}-${itemId}-${seed || 0}-${index}`, from: date, itemId, to: "" },
        index,
      );
      if (record) next.push(record);
    });
    return next;
  }

  function place(moves, ids, date) {
    const target = isoOrEmpty(date);
    if (!target) return normalize(moves);
    const wanted = new Set(toArray(ids).map(String));
    return normalize(moves.map((move) => (wanted.has(String(move?.id)) ? { ...move, to: target } : move)));
  }

  // Sends items home: dropping the record restores the generated schedule.
  function restore(moves, ids) {
    const wanted = new Set(toArray(ids).map(String));
    return normalize(moves).filter((move) => !wanted.has(move.id));
  }

  root.IeltsMoves = { normalize, movedAway, movedInto, pending, itemsForDate, cancel, place, restore };
})(globalThis);
