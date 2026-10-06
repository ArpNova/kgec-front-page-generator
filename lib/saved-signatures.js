import { getItem, setItem, KEYS } from "./storage.js";

// Signatures the user chose to keep on this device: [{ id, label, dataUrl }].
export function listSavedSignatures() {
  const items = getItem(KEYS.SIGNATURES);
  return Array.isArray(items) ? items : [];
}

// Returns the saved entry, or null if the browser refused to store it.
export function saveSignature({ label, dataUrl }) {
  const items = listSavedSignatures();
  const existing = items.find((s) => s.dataUrl === dataUrl);
  if (existing) return existing;

  const entry = { id: crypto.randomUUID(), label, dataUrl };
  return setItem(KEYS.SIGNATURES, [...items, entry]) ? entry : null;
}

export function removeSavedSignature(id) {
  return setItem(
    KEYS.SIGNATURES,
    listSavedSignatures().filter((s) => s.id !== id)
  );
}
