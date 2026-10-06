import { renderNavbar } from "../lib/navbar.js";
import { preloadSignatureEngine } from "../lib/signature-extract.js";
import { mountSignatureFlow } from "../lib/signature-picker.js";
import { saveSignature } from "../lib/saved-signatures.js";
import { showToast } from "../lib/ui.js";

renderNavbar("../", "signature");

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
    <button type="button" class="btn btn-outline-primary btn-sm" data-save><i class="bi bi-phone"></i> Save on this device</button>
    <div class="small text-muted mt-1">Recommended: saved signatures can be reused in the topsheet student flow.</div>
  `;
  col.querySelector("img").src = dataUrl;
  col.querySelector("a").href = dataUrl;
  const saveBtn = col.querySelector("[data-save]");
  saveBtn.addEventListener("click", () => {
    if (saveSignature({ label, dataUrl })) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> Saved';
    } else {
      showToast("Could not save on this device (storage full or blocked).", "warning");
    }
  });
  return col;
}

const flow = mountSignatureFlow(document.getElementById("flow"), {
  doneLabel: "Get signature",
  onDone: (selected) => {
    resultsEl.replaceChildren(...selected.map(renderResult));
    document.getElementById("results-section").classList.remove("d-none");
    flow.reset();
  },
});

// Download OpenCV (~8 MB) in the background so the popup is ready sooner.
preloadSignatureEngine().catch((err) => console.error(err));
