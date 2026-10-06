import { extractSignature, renderSignature, INK_COLORS, EXTRACTION_STAGES } from "./signature-extract.js";

const MIN_BOX_SIZE = 10;
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const VARIANTS = [
  { key: "black", label: "Black ink", color: INK_COLORS.black },
  { key: "blue", label: "Blue ink", color: INK_COLORS.blue },
];

const MODAL_HTML = `
  <div class="modal fade" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="bi bi-pen"></i> <span data-role="title"></span></h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div data-step="file">
            <p class="text-muted">Choose a photo or scan of the signature on paper.</p>
            <input type="file" class="form-control" accept="image/*" data-role="file">
          </div>
          <div data-step="busy" class="d-none py-3">
            <ol class="list-unstyled mb-0 mx-auto" style="max-width:360px;" data-role="timeline"></ol>
            <div class="text-danger text-center mt-3" data-role="busy-error"></div>
          </div>
          <div data-step="crop" class="d-none">
            <p class="text-muted small mb-2">The main part of the signature is selected. Drag the box or its handles to crop only what you need.</p>
            <div class="text-center bg-light border rounded p-2">
              <div data-role="stage" style="position:relative;display:inline-block;max-width:100%;line-height:0;touch-action:none;"></div>
            </div>
          </div>
          <div data-step="variant" class="d-none">
            <p class="text-muted small mb-2">Choose one or both ink colours.</p>
            <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2">
              <div class="text-center" style="flex:1 1 0;min-width:0;" data-role="original"></div>
              <i class="bi bi-arrow-right fs-4 text-muted d-none d-md-block"></i>
              <i class="bi bi-arrow-down fs-4 text-muted text-center d-md-none"></i>
              <div class="d-flex flex-column flex-sm-row gap-2" style="flex:2 1 0;min-width:0;" data-role="variants"></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary me-auto d-none" data-role="back">Back</button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary d-none" data-role="next"></button>
        </div>
      </div>
    </div>
  </div>
`;

const STAGE_ICONS = {
  pending: '<i class="bi bi-circle text-muted"></i>',
  active: '<span class="spinner-border spinner-border-sm text-primary" role="status"></span>',
  done: '<i class="bi bi-check-circle-fill text-success"></i>',
  failed: '<i class="bi bi-x-circle-fill text-danger"></i>',
};

// Renders the processing timeline and returns controls that move it to a
// stage: earlier stages are marked done, the given one active, later ones pending.
function createTimeline(list) {
  list.replaceChildren(
    ...EXTRACTION_STAGES.map((stage) => {
      const li = document.createElement("li");
      li.className = "d-flex align-items-center gap-2 py-1";
      li.innerHTML = `<span data-icon style="width:20px;text-align:center;"></span><span>${stage.label}</span>`;
      return li;
    })
  );

  const setState = (index, state) => {
    list.children[index].querySelector("[data-icon]").innerHTML = STAGE_ICONS[state];
    list.children[index].classList.toggle("text-muted", state === "pending");
  };
  const reset = () => EXTRACTION_STAGES.forEach((_, i) => setState(i, "pending"));
  reset();

  let current = -1;
  return {
    reset() {
      current = -1;
      reset();
    },
    advance(key) {
      const index = EXTRACTION_STAGES.findIndex((s) => s.key === key);
      if (index < 0) return;
      current = index;
      EXTRACTION_STAGES.forEach((_, i) => setState(i, i < index ? "done" : i === index ? "active" : "pending"));
    },
    fail() {
      if (current >= 0) setState(current, "failed");
    },
  };
}

function createCropper(stage, canvas, initialBox) {
  const display = document.createElement("canvas");
  display.width = canvas.width;
  display.height = canvas.height;
  display.style.cssText = "max-width:100%;max-height:55vh;background:#fff;";
  const ctx = display.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, display.width, display.height);
  ctx.drawImage(canvas, 0, 0);
  stage.replaceChildren(display);

  // The dimming lives in an overlay clipped to the image, so it can't spill
  // over the rest of the page.
  const dimmer = document.createElement("div");
  dimmer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;";
  const hole = document.createElement("div");
  hole.style.cssText = "position:absolute;box-shadow:0 0 0 9999px rgba(0,0,0,.35);";
  dimmer.appendChild(hole);
  stage.appendChild(dimmer);

  const boxEl = document.createElement("div");
  boxEl.style.cssText = "position:absolute;border:2px dashed #0d6efd;cursor:move;";
  stage.appendChild(boxEl);

  const box = { ...initialBox };

  const handleStyle = {
    nw: "left:-6px;top:-6px;cursor:nwse-resize",
    n: "left:calc(50% - 6px);top:-6px;cursor:ns-resize",
    ne: "right:-6px;top:-6px;cursor:nesw-resize",
    e: "right:-6px;top:calc(50% - 6px);cursor:ew-resize",
    se: "right:-6px;bottom:-6px;cursor:nwse-resize",
    s: "left:calc(50% - 6px);bottom:-6px;cursor:ns-resize",
    sw: "left:-6px;bottom:-6px;cursor:nesw-resize",
    w: "left:-6px;top:calc(50% - 6px);cursor:ew-resize",
  };
  for (const name of HANDLES) {
    const handle = document.createElement("div");
    handle.dataset.handle = name;
    handle.style.cssText = `position:absolute;width:12px;height:12px;background:#0d6efd;border:1px solid #fff;border-radius:2px;${handleStyle[name]}`;
    boxEl.appendChild(handle);
  }

  const scale = () => display.getBoundingClientRect().width / display.width;

  function paint() {
    const s = scale();
    for (const el of [boxEl, hole]) {
      el.style.left = `${box.x * s}px`;
      el.style.top = `${box.y * s}px`;
      el.style.width = `${box.width * s}px`;
      el.style.height = `${box.height * s}px`;
    }
  }

  function clampBox(next, mode) {
    const maxW = display.width;
    const maxH = display.height;
    let { x, y, width, height } = next;
    if (mode === "move") {
      x = Math.min(Math.max(0, x), maxW - width);
      y = Math.min(Math.max(0, y), maxH - height);
    } else {
      x = Math.max(0, x);
      y = Math.max(0, y);
      width = Math.min(Math.max(MIN_BOX_SIZE, width), maxW - x);
      height = Math.min(Math.max(MIN_BOX_SIZE, height), maxH - y);
    }
    Object.assign(box, { x, y, width, height });
  }

  boxEl.addEventListener("pointerdown", (e) => {
    const mode = e.target.dataset.handle ?? "move";
    const start = { px: e.clientX, py: e.clientY, ...box };
    boxEl.setPointerCapture(e.pointerId);
    e.preventDefault();

    const onMove = (ev) => {
      const s = scale();
      const dx = (ev.clientX - start.px) / s;
      const dy = (ev.clientY - start.py) / s;
      let { x, y, width, height } = start;

      if (mode === "move") {
        x += dx;
        y += dy;
      } else {
        if (mode.includes("w")) {
          const right = start.x + start.width;
          x = Math.min(start.x + dx, right - MIN_BOX_SIZE);
          width = right - x;
        }
        if (mode.includes("e")) width = start.width + dx;
        if (mode.includes("n")) {
          const bottom = start.y + start.height;
          y = Math.min(start.y + dy, bottom - MIN_BOX_SIZE);
          height = bottom - y;
        }
        if (mode.includes("s")) height = start.height + dy;
      }
      clampBox({ x, y, width, height }, mode);
      paint();
    };
    const onUp = () => {
      boxEl.removeEventListener("pointermove", onMove);
      boxEl.removeEventListener("pointerup", onUp);
      boxEl.removeEventListener("pointercancel", onUp);
    };
    boxEl.addEventListener("pointermove", onMove);
    boxEl.addEventListener("pointerup", onUp);
    boxEl.addEventListener("pointercancel", onUp);
  });

  requestAnimationFrame(paint);
  window.addEventListener("resize", paint);

  return {
    getBox: () => ({ ...box }),
    destroy: () => window.removeEventListener("resize", paint),
  };
}

// Opens the signature popup and resolves with the selected variants, each a
// transparent PNG: [{ key, label, dataUrl }] (one or both of black and blue),
// or null if the user cancels.
//   file -> extract -> crop to the main signature -> pick black and/or blue ink
export function openSignaturePicker({ title = "Add signature" } = {}) {
  return new Promise((resolve) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = MODAL_HTML;
    const modalEl = wrapper.firstElementChild;
    document.body.appendChild(modalEl);

    const $ = (sel) => modalEl.querySelector(sel);
    const steps = {
      file: $('[data-step="file"]'),
      busy: $('[data-step="busy"]'),
      crop: $('[data-step="crop"]'),
      variant: $('[data-step="variant"]'),
    };
    const nextBtn = $('[data-role="next"]');
    const backBtn = $('[data-role="back"]');

    $('[data-role="title"]').textContent = title;

    const timeline = createTimeline($('[data-role="timeline"]'));
    let extracted = null;
    let originalUrl = null;
    let cropper = null;
    const chosen = new Map();
    let result = null;

    const show = (name) => {
      for (const [key, el] of Object.entries(steps)) el.classList.toggle("d-none", key !== name);
      backBtn.classList.toggle("d-none", name !== "variant");
      nextBtn.classList.toggle("d-none", name !== "crop" && name !== "variant");
      nextBtn.textContent = name === "variant" ? "Use signature" : "Next";
      nextBtn.disabled = name === "variant" && chosen.size === 0;
    };

    const modal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener("hidden.bs.modal", () => {
      cropper?.destroy();
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      modalEl.remove();
      resolve(result);
    });

    $('[data-role="file"]').addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (originalUrl) URL.revokeObjectURL(originalUrl);
      originalUrl = URL.createObjectURL(file);

      show("busy");
      timeline.reset();
      $('[data-role="busy-error"]').textContent = "";
      try {
        extracted = await extractSignature(file, { onProgress: timeline.advance });
      } catch (err) {
        console.error(err);
        timeline.fail();
        $('[data-role="busy-error"]').textContent = err.message;
        return;
      }
      if (!extracted) {
        timeline.fail();
        $('[data-role="busy-error"]').textContent = "No signature found in this image. Close and try another photo.";
        return;
      }

      show("crop");
      cropper = createCropper($('[data-role="stage"]'), extracted.canvas, extracted.mainBox);
    });

    nextBtn.addEventListener("click", () => {
      if (!steps.variant.classList.contains("d-none")) {
        result = VARIANTS.filter((v) => chosen.has(v.key)).map((v) => ({
          key: v.key,
          label: v.label,
          dataUrl: chosen.get(v.key),
        }));
        modal.hide();
        return;
      }

      const box = cropper.getBox();
      const variants = $('[data-role="variants"]');
      variants.replaceChildren();
      chosen.clear();

      const original = $('[data-role="original"]');
      original.innerHTML = `
        <div class="border rounded p-2">
          <div class="bg-white border rounded d-flex align-items-center justify-content-center mb-2" style="height:140px;">
            <img alt="Original" style="max-width:100%;max-height:130px;">
          </div>
          <span class="small text-muted">Original</span>
        </div>
      `;
      original.querySelector("img").src = originalUrl;

      for (const variant of VARIANTS) {
        const dataUrl = renderSignature(extracted.canvas, box, variant.color);
        const col = document.createElement("div");
        col.className = "flex-fill";
        col.style.cssText = "flex:1 1 0;min-width:0;";
        col.innerHTML = `
          <button type="button" class="btn btn-outline-primary w-100 p-2 text-center">
            <div class="bg-white border rounded d-flex align-items-center justify-content-center mb-2" style="height:140px;">
              <img alt="${variant.label}" style="max-width:100%;max-height:130px;">
            </div>
            <span>${variant.label}</span>
          </button>
        `;
        col.querySelector("img").src = dataUrl;
        col.querySelector("button").addEventListener("click", (ev) => {
          const selected = ev.currentTarget.classList.toggle("active");
          if (selected) chosen.set(variant.key, dataUrl);
          else chosen.delete(variant.key);
          nextBtn.disabled = chosen.size === 0;
        });
        variants.appendChild(col);
      }
      show("variant");
    });

    backBtn.addEventListener("click", () => show("crop"));

    show("file");
    modal.show();
  });
}
