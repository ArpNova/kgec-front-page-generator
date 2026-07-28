import { getItem, setItem, removeItem, KEYS } from "../lib/storage.js";
import { renderNavbar } from "../lib/navbar.js";
import { showToast, confirmAction } from "../lib/ui.js";
import { getDefaultLayout, getStoredDefaultLayout } from "../lib/default-layout.js";
import { refreshSubjects } from "../lib/subjects.js";
renderNavbar("../");

// ---------- USERS ----------

function loadUsers() {
  const data = getItem(KEYS.USERS);
  return Array.isArray(data) ? data : [];
}

function saveUsers(users) {
  if (!Array.isArray(users)) {
    console.error("saveUsers: expected an array, got:", users);
    return;
  }
  setItem(KEYS.USERS, users);
}

function generateId() {
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function createUser() {
  return { id: generateId(), name: "", roll: "", reg: "", dept: "", course: "", year: "", sem: "" };
}

const USER_FIELDS = [
  { key: "name", label: "Name" },
  { key: "roll", label: "Roll" },
  { key: "reg", label: "Reg" },
  { key: "dept", label: "Dept" },
  { key: "course", label: "Course" },
  { key: "year", label: "Year" },
  { key: "sem", label: "Sem" },
];

function renderUsers() {
  const users = loadUsers();
  const container = document.getElementById("user-list");
  const emptyState = document.getElementById("empty-state");

  container.innerHTML = "";
  emptyState.classList.toggle("d-none", users.length !== 0);

  users.forEach((user) => {
    const col = document.createElement("div");
    col.className = "col-md-4";

    const fieldsHtml = USER_FIELDS.map(
      (f) => `
        <div class="mb-2">
          <label class="form-label small text-muted mb-0">${f.label}</label>
          <input class="form-control field-${f.key}" placeholder="${f.label}" value="${user[f.key] || ""}">
        </div>
      `
    ).join("");

    col.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <input class="form-check-input user-checkbox" type="checkbox" data-id="${user.id}">
            <button class="btn btn-sm btn-outline-danger btn-delete-single" data-id="${user.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
          ${fieldsHtml}
        </div>
      </div>
    `;

    USER_FIELDS.forEach((f) => {
      col.querySelector(`.field-${f.key}`).addEventListener("input", (e) => {
        updateUserField(user.id, f.key, e.target.value);
      });
    });

    col.querySelector(".btn-delete-single").addEventListener("click", () => {
      deleteUsersByIds([user.id]);
    });

    container.appendChild(col);
  });
}

function updateUserField(id, key, value) {
  const users = loadUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return;
  user[key] = value;
  saveUsers(users);
}

async function addUserFromModal() {
  const newUser = {
    id: generateId(),
    name: document.getElementById("new-user-name").value.trim(),
    roll: document.getElementById("new-user-roll").value.trim(),
    reg: document.getElementById("new-user-reg").value.trim(),
    dept: document.getElementById("new-user-dept").value.trim(),
    course: document.getElementById("new-user-course").value.trim(),
    year: document.getElementById("new-user-year").value.trim(),
    sem: document.getElementById("new-user-sem").value.trim(),
  };

  if (!newUser.name) {
    showToast("Name is required.", "warning");
    return;
  }

  const users = loadUsers();
  users.push(newUser);
  saveUsers(users);
  renderUsers();

  document.getElementById("add-user-form").reset();

  const modalEl = document.getElementById("addUserModal");
  bootstrap.Modal.getInstance(modalEl).hide();
  showToast("User added.", "success");
}

async function deleteUsersByIds(ids) {
  if (ids.length === 0) return;
  const confirmed = await confirmAction(`Delete ${ids.length} user(s)? This cannot be undone.`);
  if (!confirmed) return;

  const users = loadUsers();
  const remaining = users.filter((u) => !ids.includes(u.id));
  saveUsers(remaining);
  renderUsers();
  showToast(`Deleted ${ids.length} user(s).`, "success");
}

function deleteSelectedUsers() {
  const checkedIds = [...document.querySelectorAll(".user-checkbox:checked")].map((cb) => cb.dataset.id);
  deleteUsersByIds(checkedIds);
}

function toggleSelectAll(checked) {
  document.querySelectorAll(".user-checkbox").forEach((cb) => (cb.checked = checked));
}

function exportUsers() {
  const users = loadUsers();
  const blob = new Blob([JSON.stringify(users, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "kgec_pages_users_export.json";
  a.click();

  URL.revokeObjectURL(url);
  showToast("Exported users.", "success");
}

function importUsers(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error("Invalid file format");
      saveUsers(imported);
      renderUsers();
      showToast("Users imported.", "success");
    } catch (err) {
      console.error("Import failed:", err);
      showToast("Invalid users file.", "danger");
    }
  };
  reader.readAsText(file);
}

async function clearUsers() {
  const confirmed = await confirmAction("Clear all locally saved users? This cannot be undone.");
  if (!confirmed) return;
  removeItem(KEYS.USERS);
  renderUsers();
  showToast("Users storage cleared.", "success");
}

// ---------- DEFAULT LAYOUT ----------

function renderDefaultLayoutInfo() {
  const layout = getStoredDefaultLayout();
  const el = document.getElementById("default-layout-info");
  el.textContent = layout ? `Loaded: ${layout.label || "Default"} (locked, read-only)` : "Not loaded yet.";
}

async function refreshDefaultLayout() {
  await getDefaultLayout();
  renderDefaultLayoutInfo();
  showToast("Default layout refreshed from server.", "success");
}

// ---------- SAVED LAYOUTS ----------

// settings/index.js — Layouts section replacement

function renderLayouts() {
  const layouts = getItem(KEYS.LAYOUTS) || {};
  const container = document.getElementById("layout-list");
  container.innerHTML = "";

  const entries = Object.entries(layouts);
  if (entries.length === 0) {
    container.innerHTML = `<p class="text-muted">No saved layouts.</p>`;
    return;
  }

  entries.forEach(([key, layout]) => {
    const col = document.createElement("div");
    col.className = "col-md-4";
    col.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <input class="form-check-input layout-checkbox" type="checkbox" data-key="${key}">
            <button class="btn btn-sm btn-outline-danger btn-delete-single-layout" data-key="${key}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
          <h6 class="mt-2 mb-1">${layout.label || key}</h6>
          <p class="text-muted small mb-0">Key: ${key}</p>
        </div>
      </div>
    `;

    col.querySelector(".btn-delete-single-layout").addEventListener("click", () => {
      deleteLayoutsByKeys([key]);
    });

    container.appendChild(col);
  });
}

async function deleteLayoutsByKeys(keys) {
  if (keys.length === 0) return;
  const confirmed = await confirmAction(`Delete ${keys.length} layout(s)? This cannot be undone.`);
  if (!confirmed) return;

  const layouts = getItem(KEYS.LAYOUTS) || {};
  keys.forEach((k) => delete layouts[k]);
  setItem(KEYS.LAYOUTS, layouts);
  renderLayouts();
  showToast(`Deleted ${keys.length} layout(s).`, "success");
}

function deleteSelectedLayouts() {
  const checkedKeys = [...document.querySelectorAll(".layout-checkbox:checked")].map((cb) => cb.dataset.key);
  deleteLayoutsByKeys(checkedKeys);
}

async function deleteAllLayouts() {
  const layouts = getItem(KEYS.LAYOUTS) || {};
  deleteLayoutsByKeys(Object.keys(layouts));
}

function toggleSelectAllLayouts(checked) {
  document.querySelectorAll(".layout-checkbox").forEach((cb) => (cb.checked = checked));
}

// ---------- LAST USED LAYOUT ----------

function renderLastUsedInfo() {
  const lastUsed = getItem(KEYS.LAST_USED_LAYOUT);
  const el = document.getElementById("last-used-layout-info");
  el.textContent = lastUsed ? "A last-used layout state is saved." : "No last-used layout saved yet.";
}

async function deleteLastUsedLayout() {
  const confirmed = await confirmAction("Delete the last-used layout state? This cannot be undone.");
  if (!confirmed) return;
  removeItem(KEYS.LAST_USED_LAYOUT);
  renderLastUsedInfo();
  showToast("Last-used layout deleted.", "success");
}

// ---------- SUBJECTS ----------

function renderSubjects() {
  const subjects = getItem(KEYS.SUBJECTS) || {};
  const tbody = document.getElementById("subjects-table-body");
  const countEl = document.getElementById("subjects-count");
  tbody.innerHTML = "";

  const entries = Object.entries(subjects);
  countEl.textContent = `${entries.length} subject(s) loaded.`;

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-muted">No subjects loaded.</td></tr>`;
    return;
  }

  entries.forEach(([code, name]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="font-monospace">${code}</td><td>${name}</td>`;
    tbody.appendChild(tr);
  });
}

async function refreshSubjectsList() {
  await refreshSubjects("../data/subjects.json");
  renderSubjects();
  showToast("Subjects refreshed from server.", "success");
}

// ---------- INIT ----------

function init() {
  renderUsers();
  renderDefaultLayoutInfo();
  renderLayouts();
  renderLastUsedInfo();
  renderSubjects();

  document.getElementById("btn-save-new-user").addEventListener("click", addUserFromModal);
  document.getElementById("btn-delete-user").addEventListener("click", deleteSelectedUsers);
  document.getElementById("btn-export").addEventListener("click", exportUsers);

  document.getElementById("btn-import").addEventListener("click", () => {
    document.getElementById("input-import-file").click();
  });

  document.getElementById("input-import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) importUsers(file);
    e.target.value = "";
  });

  document.getElementById("select-all-checkbox").addEventListener("change", (e) => {
    toggleSelectAll(e.target.checked);
  });

  document.getElementById("btn-clear-users").addEventListener("click", clearUsers);
  document.getElementById("btn-delete-layout").addEventListener("click", deleteSelectedLayouts);
  document.getElementById("btn-delete-all-layouts").addEventListener("click", deleteAllLayouts);
  document.getElementById("select-all-layouts-checkbox").addEventListener("change", (e) => {
    toggleSelectAllLayouts(e.target.checked);
  });
  document.getElementById("btn-delete-last-used").addEventListener("click", deleteLastUsedLayout);
  document.getElementById("btn-refresh-subjects").addEventListener("click", refreshSubjectsList);
}

if (document.getElementById("user-list")) {
  init();
}

export { loadUsers, saveUsers, createUser };