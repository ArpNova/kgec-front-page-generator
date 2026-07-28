import { getItem, setItem, KEYS } from "./storage.js";

export async function getDefaultLayout(pathToJson = "../data/default_layout.json") {
  const res = await fetch(pathToJson);
  if (!res.ok) throw new Error(`Failed to load default_layout.json: ${res.status}`);

  const data = await res.json();
  setItem(KEYS.DEFAULT_LAYOUT, data); // always overwrite — never trust stale storage
  return data;
}

export function getStoredDefaultLayout() {
  return getItem(KEYS.DEFAULT_LAYOUT);
}

export function isLockedLayout(layout) {
  return Boolean(layout && layout.locked);
}