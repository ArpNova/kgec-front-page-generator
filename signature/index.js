import { renderNavbar } from "../lib/navbar.js";
import { preloadSignatureEngine } from "../lib/signature-extract.js";
import { openSignaturePicker } from "../lib/signature-picker.js";

renderNavbar("../");

const resultsEl = document.getElementById("results");

function renderResult({ key, label, dataUrl }) {
  const col = document.createElement("div");
  col.className = "col-sm-6 col-md-4";
  col.innerHTML = `
    <div class="small text-muted mb-1">${label} (transparent PNG)</div>
    <div class="border rounded p-3 mb-2 bg-white d-flex align-items-center justify-content-center" style="height:160px;">
      <img alt="${label}" style="max-width:100%;max-height:140px;">
    </div>
    <a class="btn btn-success btn-sm" download="signature-${key}.png"><i class="bi bi-download"></i> Download</a>
  `;
  col.querySelector("img").src = dataUrl;
  col.querySelector("a").href = dataUrl;
  return col;
}

document.getElementById("btn-choose").addEventListener("click", async () => {
  const selected = await openSignaturePicker({ title: "Extract signature" });
  if (!selected) return;
  resultsEl.replaceChildren(...selected.map(renderResult));
});

// Download OpenCV (~8 MB) in the background so the popup is ready sooner.
preloadSignatureEngine().catch((err) => console.error(err));
