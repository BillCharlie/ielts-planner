import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const context = {};
vm.runInNewContext(await readFile(new URL("../ielts-moves.js", import.meta.url), "utf8"), context);
const moves = context.IeltsMoves;

const paper = (date, itemId, code) => ({ date, itemId, code, kind: "full", label: "完整模考" });

test("cancelling holds papers in the pool and clears them off their original day", () => {
  const ledger = moves.cancel([], [paper("2026-09-11", "full-C16T3", "C16T3"), paper("2026-09-12", "full-C16T4", "C16T4")], 1);
  assert.equal(ledger.length, 2);
  assert.equal(moves.pending(ledger).length, 2);
  assert.deepEqual(moves.movedAway(ledger, "2026-09-11").map((move) => move.code), ["C16T3"]);
  assert.equal(moves.movedInto(ledger, "2026-09-11").length, 0);

  const split = moves.itemsForDate(ledger, "2026-09-11", [{ id: "full-C16T3" }, { id: "mixed-C12T1" }]);
  assert.deepEqual(split.kept.map((item) => item.id), ["mixed-C12T1"]);
  assert.equal(split.incoming.length, 0);

  // Cancelling the same paper twice must not create a duplicate record.
  assert.equal(moves.cancel(ledger, [paper("2026-09-11", "full-C16T3", "C16T3")], 2).length, 2);
});

test("placing a pending paper moves it onto the chosen day and off the pool", () => {
  const ledger = moves.cancel([], [paper("2026-09-11", "full-C16T3", "C16T3")], 1);
  const placed = moves.place(ledger, [ledger[0].id], "2026-09-20");
  assert.equal(moves.pending(placed).length, 0);
  assert.deepEqual(moves.movedInto(placed, "2026-09-20").map((move) => move.code), ["C16T3"]);
  assert.deepEqual(moves.movedAway(placed, "2026-09-11").map((move) => move.code), ["C16T3"]);
  assert.equal(moves.itemsForDate(placed, "2026-09-20", []).incoming[0].from, "2026-09-11");
});

test("a paper sent back to its own day stops being a move at all", () => {
  const ledger = moves.place(moves.cancel([], [paper("2026-09-11", "full-C16T3", "C16T3")], 1), undefined, "2026-09-20");
  const home = moves.place(moves.cancel([], [paper("2026-09-11", "full-C16T3", "C16T3")], 1), [ledger[0]?.id], "2026-09-11");
  assert.equal(home.length, 0);
  assert.equal(moves.restore(moves.cancel([], [paper("2026-09-11", "full-C16T3", "C16T3")], 1), []).length, 1);
});

test("re-cancelling a rescheduled paper returns it to the pool but keeps its origin", () => {
  const ledger = moves.cancel([], [paper("2026-09-11", "full-C16T3", "C16T3")], 1);
  const placed = moves.place(ledger, [ledger[0].id], "2026-09-20");
  const again = moves.cancel(placed, [paper("2026-09-20", "full-C16T3", "C16T3")], 3);
  assert.equal(again.length, 1);
  assert.equal(again[0].from, "2026-09-11", "origin day must survive a second delay");
  assert.equal(again[0].to, "");
  assert.equal(moves.movedInto(again, "2026-09-20").length, 0);

  // Restoring drops the record so the generated schedule takes over again.
  assert.equal(moves.restore(again, [again[0].id]).length, 0);
});

test("malformed, duplicate and no-op records are dropped on normalize", () => {
  const ledger = moves.normalize([
    null,
    { from: "2026-09-11" },
    { from: "not-a-date", itemId: "full-C16T3" },
    { id: "dup", from: "2026-09-11", itemId: "a", to: "2026-09-20" },
    { id: "dup", from: "2026-09-12", itemId: "b", to: "2026-09-21" },
    { id: "noop", from: "2026-09-13", itemId: "c", to: "2026-09-13" },
  ]);
  assert.deepEqual(ledger.map((move) => move.itemId), ["a"]);
  assert.equal(moves.place(ledger, ["a"], "bad-date").length, 1);
});
