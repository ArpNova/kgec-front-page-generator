import { getItem,KEYS } from "./lib/storage.js";
import { renderNavbar } from "./lib/navbar.js";
renderNavbar("");

function init() {
  const profile = getItem(KEYS.PROFILE);
  console.log("Landing page loaded. Profile exists:", Boolean(profile));
}

async function initHomeMeta() {
  const container = document.getElementById("home-meta");
  if (!container) return;

  try {
    const res = await fetch("assets/config/version.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const info = await res.json();

    container.innerHTML = `
      <a class="topbar-chip" href="${escapeHtml(info.repoUrl || "#")}" target="_blank" rel="noopener" title="View source on GitHub">
        <i class="bi bi-github"></i><span>Repo</span>
      </a>
      <span class="topbar-chip topbar-chip-primary" title="Version">
        <span>${escapeHtml(info.version || "v0.0.0")}</span>
      </span>
      <span class="topbar-chip" title="Last deployed commit">
        <i class="bi bi-git"></i><span>${escapeHtml(info.commitHash || "------")}</span>
      </span>
      <span class="topbar-chip" title="Last updated">
        <i class="bi bi-clock-history"></i><span>${escapeHtml(info.updatedDate || "N/A")}</span>
      </span>
    `;
  } catch (err) {
    console.error("Failed to load version metadata:", err);
    container.innerHTML = "";
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

init();
initHomeMeta();