import { loadSubjects } from "./subjects.js";
import { showToast } from "./ui.js";

const MAX_SUBJECT_RESULTS = 60;
const SEARCH_DEBOUNCE_MS = 150;

export function renderNavbar(basePath = "", current = "") {
  const root = document.getElementById("navbar-root");
  if (!root) return;

  root.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom pt-2 pb-2 sticky-top">
      <div class="container-fluid">
        <a class="navbar-brand fw-bold" href="${basePath}index.html">
          <span class="brand-badge"><i class="bi bi-journal-richtext"></i></span> KGEC Pages
        </a>

        <div class="d-flex align-items-center gap-2 order-lg-2">
          <div class="dropdown">
            <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="subjects-nav-dropdown"
              data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-label="Search subjects">
              <i class="bi bi-journal-text"></i><span class="d-none d-sm-inline"> Subjects</span>
            </button>
            <div class="dropdown-menu dropdown-menu-end p-2 subjects-menu">
              <input type="text" id="nav-subjects-search" class="form-control form-control-sm mb-2"
                placeholder="Search by code or name...">
              <div id="nav-subjects-list" class="d-flex flex-column gap-1 custom-scroll subjects-list"></div>
              <div id="nav-subjects-meta" class="text-muted small mt-2 mb-0"></div>
            </div>
          </div>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-links"
            aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>

        <div class="collapse navbar-collapse order-lg-1" id="navbar-links">
          <ul class="navbar-nav ms-auto gap-2 align-items-lg-center">
            <li class="nav-item"><a class="nav-link" data-page="generator" href="${basePath}front-page-generator/index.html">Generator</a></li>
            <li class="nav-item"><a class="nav-link" data-page="multimerge" href="${basePath}multimerge/index.html">MultiMerge</a></li>
            <li class="nav-item"><a class="nav-link" data-page="settings" href="${basePath}settings/index.html">Settings</a></li>
            <li class="nav-item"><a class="nav-link" data-page="readymade" href="${basePath}readymade/index.html">Readymade</a></li>
          </ul>
        </div>
      </div>
    </nav>
  `;

  if (current) {
    const activeLink = root.querySelector(`.nav-link[data-page="${current}"]`);
    if (activeLink) {
      activeLink.classList.add("active");
      activeLink.setAttribute("aria-current", "page");
    }
  }

  initSubjectsDropdown(basePath);
}

async function initSubjectsDropdown(basePath) {
  const searchInput = document.getElementById("nav-subjects-search");
  const listContainer = document.getElementById("nav-subjects-list");

  listContainer.innerHTML = `<p class="text-muted small mb-0">Loading subjects…</p>`;

  let subjects;
  try {
    subjects = await loadSubjects(`${basePath}data/subjects.json`);
  } catch (err) {
    console.error("Failed to load subjects:", err);
    listContainer.innerHTML = `<p class="text-danger small mb-0">Couldn't load subjects. Try refreshing the page.</p>`;
    return;
  }

  renderNavSubjectsList(subjects);

  // Rows are rebuilt on every keystroke, so clicks are delegated to one
  // listener instead of rebinding per-row handlers on a list this size.
  listContainer.addEventListener("click", (e) => {
    const codeBtn = e.target.closest(".copy-code");
    if (codeBtn) {
      navigator.clipboard.writeText(codeBtn.dataset.code);
      showToast(`Copied code: ${codeBtn.dataset.code}`, "success");
      return;
    }
    const nameBtn = e.target.closest(".copy-name");
    if (nameBtn) {
      navigator.clipboard.writeText(nameBtn.dataset.name);
      showToast(`Copied name: ${nameBtn.dataset.name}`, "success");
    }
  });

  let debounceTimer = null;
  searchInput.addEventListener("input", (e) => {
    const value = e.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => renderNavSubjectsList(subjects, value), SEARCH_DEBOUNCE_MS);
  });
}

function renderNavSubjectsList(subjects, filterText = "") {
  const container = document.getElementById("nav-subjects-list");
  const meta = document.getElementById("nav-subjects-meta");
  const query = filterText.trim().toLowerCase();

  const filtered = Object.entries(subjects).filter(([code, name]) =>
    (code + " " + name).toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-muted small mb-0">No subjects found.</p>`;
    meta.textContent = "";
    return;
  }

  const shown = filtered.slice(0, MAX_SUBJECT_RESULTS);

  container.innerHTML = shown
    .map(
      ([code, name]) => `
        <div class="d-flex gap-1 subject-row">
          <button type="button" class="btn btn-sm copy-code btn-subject-code" data-code="${escapeHtml(code)}" style="flex: 0 0 40%;">${escapeHtml(code)}</button>
          <button type="button" class="btn btn-sm copy-name btn-subject-name text-start" data-name="${escapeHtml(name)}" style="flex: 1;">${escapeHtml(name)}</button>
        </div>
      `
    )
    .join("");

  meta.textContent =
    filtered.length > shown.length
      ? `Showing ${shown.length} of ${filtered.length} matches — keep typing to narrow down.`
      : `${filtered.length} subject${filtered.length === 1 ? "" : "s"}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
