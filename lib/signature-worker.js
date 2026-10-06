// Classic (non-module) Web Worker: runs the OpenCV signature extraction off the
// main thread so the page never freezes. Driven by lib/signature-extract.js.
//
// in : { id, width, height, pixels: ArrayBuffer (RGBA) }
// out: { id, type: "progress", stage }
//      { id, type: "done", result: null | { width, height, pixels, mainBox } }
//      { id, type: "error", message }

const OPENCV_URL = "https://docs.opencv.org/4.8.0/opencv.js";
const OPENCV_TIMEOUT_MS = 60000;
const OPENCV_POLL_MS = 50;

const INK_PADDING = 4;
const MAX_BACKGROUND_KERNEL = 151;
const MAX_THRESHOLD_BLOCK = 101;

let opencvReady = null;

function loadOpenCV() {
  if (opencvReady) return opencvReady;

  opencvReady = new Promise((resolve, reject) => {
    try {
      importScripts(OPENCV_URL);
    } catch {
      opencvReady = null;
      reject(new Error("Could not download OpenCV."));
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (typeof cv !== "undefined" && typeof cv.Mat === "function") {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - startedAt > OPENCV_TIMEOUT_MS) {
        clearInterval(timer);
        opencvReady = null;
        reject(new Error("OpenCV took too long to load."));
      }
    }, OPENCV_POLL_MS);
  });

  return opencvReady;
}

function oddKernel(minSide, divisor, floor, ceiling) {
  let size = Math.max(floor, Math.floor(minSide / divisor) | 1);
  if ((size & 1) === 0) size++;
  return Math.min(size, ceiling);
}

// Marks connected components that look like ink: not touching the border
// (paper edges, shadows) and neither specks nor huge blobs.
function selectInkLabels(stats, count, width, height) {
  const imgArea = width * height;
  const minArea = Math.max(8, imgArea * 0.00002);
  const maxArea = imgArea * 0.35;
  const valid = new Uint8Array(count);

  for (let label = 1; label < count; label++) {
    const x = stats.intAt(label, cv.CC_STAT_LEFT);
    const y = stats.intAt(label, cv.CC_STAT_TOP);
    const w = stats.intAt(label, cv.CC_STAT_WIDTH);
    const h = stats.intAt(label, cv.CC_STAT_HEIGHT);
    const area = stats.intAt(label, cv.CC_STAT_AREA);

    const touchesBorder = x <= 0 || y <= 0 || x + w >= width || y + h >= height;
    if (!touchesBorder && area >= minArea && area <= maxArea) valid[label] = 1;
  }
  return valid;
}

// The main signature is the biggest group of strokes. Strokes closer than a
// fraction of the image are treated as one group (dilate, then label); the
// group holding the most ink wins, so isolated marks and texture are dropped.
function pickMainCluster(ink, width, height, own) {
  const joinSize = oddKernel(Math.max(width, height), 40, 9, 101);
  const kernel = own(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(joinSize, joinSize)));
  const joined = own(new cv.Mat());
  cv.dilate(ink, joined, kernel);

  const labels = own(new cv.Mat());
  const stats = own(new cv.Mat());
  const centroids = own(new cv.Mat());
  const count = cv.connectedComponentsWithStats(joined, labels, stats, centroids, 8, cv.CV_32S);

  const labelData = labels.data32S;
  const inkData = ink.data;
  const inkPerLabel = new Float64Array(count);
  for (let i = 0; i < inkData.length; i++) {
    if (inkData[i]) inkPerLabel[labelData[i]]++;
  }

  let best = 0;
  for (let label = 1; label < count; label++) {
    if (inkPerLabel[label] > inkPerLabel[best]) best = label;
  }

  const main = new Uint8Array(inkData.length);
  if (best > 0) {
    for (let i = 0; i < inkData.length; i++) {
      if (inkData[i] && labelData[i] === best) main[i] = 1;
    }
  }
  return main;
}

function boxOf(flags, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (!flags[row + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX: maxX + 1, maxY: maxY + 1 };
}

function extract({ width, height, pixels }, progress) {
  const mats = [];
  const own = (mat) => {
    mats.push(mat);
    return mat;
  };

  try {
    const src = own(new cv.Mat(height, width, cv.CV_8UC4));
    src.data.set(new Uint8Array(pixels));
    const minSide = Math.min(width, height);

    progress("lighting");
    // Flatten uneven lighting by dividing out the blurred paper background.
    const gray = own(new cv.Mat());
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

    const blurSize = oddKernel(minSide, 8, 31, MAX_BACKGROUND_KERNEL);
    const background = own(new cv.Mat());
    cv.GaussianBlur(gray, background, new cv.Size(blurSize, blurSize), 0, 0, cv.BORDER_REPLICATE);
    const bgData = background.data;
    for (let i = 0; i < bgData.length; i++) {
      if (bgData[i] < 1) bgData[i] = 1;
    }

    const normalized = own(new cv.Mat());
    cv.divide(gray, background, normalized, 255);

    progress("ink");
    // Conservative ink mask. Opening only: closing would merge strokes with noise.
    const blockSize = oddKernel(minSide, 18, 15, MAX_THRESHOLD_BLOCK);
    const mask = own(new cv.Mat());
    cv.adaptiveThreshold(
      normalized,
      mask,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      blockSize,
      7
    );
    const openKernel = own(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3)));
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, openKernel);

    progress("noise");
    // Keep only components that look like ink.
    const labels = own(new cv.Mat());
    const stats = own(new cv.Mat());
    const centroids = own(new cv.Mat());
    const count = cv.connectedComponentsWithStats(mask, labels, stats, centroids, 8, cv.CV_32S);
    const valid = selectInkLabels(stats, count, width, height);

    const ink = own(cv.Mat.zeros(height, width, cv.CV_8UC1));
    const labelData = labels.data32S;
    const inkData = ink.data;
    let hasInk = false;
    for (let i = 0; i < labelData.length; i++) {
      if (labelData[i] > 0 && valid[labelData[i]]) {
        inkData[i] = 255;
        hasInk = true;
      }
    }
    // If the filter removed everything, fall back to the raw mask.
    if (!hasInk) mask.copyTo(ink);

    const inkFlags = new Uint8Array(inkData.length);
    for (let i = 0; i < inkData.length; i++) inkFlags[i] = inkData[i] ? 1 : 0;

    const allBox = boxOf(inkFlags, width, height);
    if (!allBox) return null;

    progress("main");
    const main = pickMainCluster(ink, width, height, own);
    const mainBox = boxOf(main, width, height) ?? allBox;

    progress("finish");
    // Crop to all ink and build the RGBA image: original colour, ink as alpha.
    const x0 = Math.max(0, allBox.minX - INK_PADDING);
    const y0 = Math.max(0, allBox.minY - INK_PADDING);
    const x1 = Math.min(width, allBox.maxX + INK_PADDING);
    const y1 = Math.min(height, allBox.maxY + INK_PADDING);

    const outW = x1 - x0;
    const outH = y1 - y0;
    const out = new Uint8ClampedArray(outW * outH * 4);
    const srcData = src.data;
    const normData = normalized.data;

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * width + x;
        if (!inkData[i]) continue;
        const o = ((y - y0) * outW + (x - x0)) * 4;
        out[o] = srcData[i * 4];
        out[o + 1] = srcData[i * 4 + 1];
        out[o + 2] = srcData[i * 4 + 2];
        // Darker than the paper = more opaque, so stroke edges stay soft.
        out[o + 3] = Math.min(255, Math.max(160, (255 - normData[i]) * 4));
      }
    }

    return {
      width: outW,
      height: outH,
      pixels: out.buffer,
      mainBox: {
        x: mainBox.minX - x0,
        y: mainBox.minY - y0,
        width: mainBox.maxX - mainBox.minX,
        height: mainBox.maxY - mainBox.minY,
      },
    };
  } finally {
    for (const mat of mats) {
      try {
        mat.delete();
      } catch {
        // Already freed.
      }
    }
  }
}

self.onmessage = async ({ data }) => {
  const { id } = data;
  const post = (message, transfer) => self.postMessage({ id, ...message }, transfer);

  try {
    if (data.warmup) {
      await loadOpenCV();
      post({ type: "done", result: null });
      return;
    }

    post({ type: "progress", stage: "engine" });
    await loadOpenCV();

    const result = extract(data, (stage) => post({ type: "progress", stage }));
    post({ type: "done", result }, result ? [result.pixels] : []);
  } catch (err) {
    post({ type: "error", message: err.message || String(err) });
  }
};
