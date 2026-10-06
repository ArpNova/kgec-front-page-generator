import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import "./setup.js";
import { listSavedSignatures, saveSignature, removeSavedSignature } from "../lib/saved-signatures.js";

beforeEach(() => {
  globalThis.localStorage.clear();
});

test("listSavedSignatures is empty by default", () => {
  assert.deepEqual(listSavedSignatures(), []);
});

test("saveSignature stores an entry with an id", () => {
  const entry = saveSignature({ label: "Black ink", dataUrl: "data:image/png;base64,AAA" });
  assert.ok(entry.id);
  assert.deepEqual(listSavedSignatures(), [entry]);
});

test("saveSignature does not duplicate the same image", () => {
  const a = saveSignature({ label: "Black ink", dataUrl: "data:image/png;base64,AAA" });
  const b = saveSignature({ label: "Black ink", dataUrl: "data:image/png;base64,AAA" });
  assert.equal(a.id, b.id);
  assert.equal(listSavedSignatures().length, 1);
});

test("removeSavedSignature deletes by id", () => {
  const a = saveSignature({ label: "Black ink", dataUrl: "data:image/png;base64,AAA" });
  saveSignature({ label: "Blue ink", dataUrl: "data:image/png;base64,BBB" });
  removeSavedSignature(a.id);
  assert.deepEqual(listSavedSignatures().map((s) => s.label), ["Blue ink"]);
});
