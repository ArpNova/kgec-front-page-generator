import { loadSubjects } from "./subjects.js";
import { showToast } from "./ui.js";

export function renderNavbar(basePath = "") {
  const root = document.getElementById("navbar-root");
  if (!root) return;

  root.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom pt-2 pb-2">
      <div class="container-fluid">
        <a class="navbar-brand fw-bold" href="${basePath}index.html">
          <i class="bi bi-journal-text"></i> KGEC Pages
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-links">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbar-links">
          <ul class="navbar-nav ms-auto gap-2 align-items-lg-center">
            <li class="nav-item"><a class="nav-link" href="${basePath}front-page-generator/index.html">Generator</a></li>
            <li class="nav-item"><a class="nav-link" href="${basePath}multimerge/index.html">MultiMerge</a></li>
            <li class="nav-item"><a class="nav-link" href="${basePath}settings/index.html">Settings</a></li>
            <li class="nav-item"><a class="nav-link" href="${basePath}readymade/index.html">Readymade</a></li>

            <li class="nav-item dropdown">
              <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="subjects-nav-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="outside">
                <i class="bi bi-journal-text"></i> Subjects
              </button>
              <div class="dropdown-menu dropdown-menu-end p-2" style="width: 320px;">
                <input type="text" id="nav-subjects-search" class="form-control form-control-sm mb-2" placeholder="Search subjects...">
                <div id="nav-subjects-list" class="d-flex flex-column gap-1" style="max-height: 280px; overflow-y: auto;"></div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `;

  initSubjectsDropdown(basePath);
}

async function initSubjectsDropdown(basePath) {
  const fallbackUrl = `${basePath}data/subjects.json`;
  const subjects = await loadSubjects(fallbackUrl);
  renderNavSubjectsList(subjects);

  document.getElementById("nav-subjects-search").addEventListener("input", (e) => {
    renderNavSubjectsList(subjects, e.target.value);
  });
}

function renderNavSubjectsList(subjects, filterText = "") {
  const container = document.getElementById("nav-subjects-list");
  container.innerHTML = "";

  const filtered = Object.entries(subjects).filter(([code, name]) =>
    (code + " " + name).toLowerCase().includes(filterText.toLowerCase())
  );

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-muted small mb-0">No subjects found.</p>`;
    return;
  }

  filtered.forEach(([code, name]) => {
    const row = document.createElement("div");
    row.className = "d-flex gap-1";
    row.innerHTML = `
      <button type="button" class="btn btn-sm btn-outline-secondary copy-code" style="flex: 0 0 40%; font-family: monospace;">${code}</button>
      <button type="button" class="btn btn-sm btn-outline-secondary copy-name text-start" style="flex: 1;">${name}</button>
    `;

    row.querySelector(".copy-code").addEventListener("click", () => {
      navigator.clipboard.writeText(code);
      showToast(`Copied code: ${code}`, "success");
    });
    row.querySelector(".copy-name").addEventListener("click", () => {
      navigator.clipboard.writeText(name);
      showToast(`Copied name: ${name}`, "success");
    });

    container.appendChild(row);
  });
}