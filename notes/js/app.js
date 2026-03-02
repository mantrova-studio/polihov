// Vault — local encrypted notes + optional GitHub sync (still encrypted)
// Формат GitHub файла: тот же blob, что в localStorage: {v,salt,iv,data}

const qs = (s, el = document) => el.querySelector(s);

const loginForm = qs("#loginForm");
const passwordInput = qs("#passwordInput");
const rememberCheck = qs("#rememberCheck");
const initBtn = qs("#initBtn");

const lockBtn = qs("#lockBtn");
const syncBtn = qs("#syncBtn");

const searchInput = qs("#searchInput");
const newBtn = qs("#newBtn");

const listEl = qs("#list");
const emptyState = qs("#emptyState");

const editForm = qs("#editForm");
const titleInput = qs("#titleInput");
const typeInput = qs("#typeInput");
const bodyInput = qs("#bodyInput");
const delBtn = qs("#delBtn");
const copyBtn = qs("#copyBtn");
const exportBtn = qs("#exportBtn");
const importFile = qs("#importFile");
const statusLine = qs("#statusLine");

const typeHints = qs("#typeHints");
const typeFilterDDRoot = qs("#typeFilterDD");

const toastEl = qs("#toast");
const modalEl = qs("#modal");
const modalTitleEl = qs("#modalTitle");
const modalBodyEl = qs("#modalBody");
const modalFootEl = qs("#modalFoot");

const LS = {
  VAULT: "vault_blob_v1",
  SESSION: "vault_session_v1",
  GH: "vault_github_v1" // {token, owner, repo, branch, path}
};

let state = {
  unlocked: false,
  key: null,
  items: [],
  activeId: null,
  filterType: "all"
};

// ---------------- UI helpers ----------------
function toast(msg){
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (toastEl.hidden = true), 2200);
}

function setLocked(locked){
  document.body.classList.toggle("is-locked", locked);
  qs("#topbar").setAttribute("aria-hidden", locked ? "true" : "false");
  qs("#appRoot").setAttribute("aria-hidden", locked ? "true" : "false");
}

function fmtDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  }catch{ return ""; }
}

function nowISO(){ return new Date().toISOString(); }

function uid(){
  return "n_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ---------------- Styled modal ----------------
function openModal({title, bodyHTML, footHTML, onMount}){
  modalTitleEl.textContent = title || "Окно";
  modalBodyEl.innerHTML = bodyHTML || "";
  modalFootEl.innerHTML = footHTML || "";
  modalEl.hidden = false;
  modalEl.setAttribute("aria-hidden", "false");

  const closer = (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute("data-close") === "1") closeModal();
  };
  modalEl.addEventListener("click", closer);
  modalEl._closer = closer;

  if (typeof onMount === "function") onMount(modalEl);
}

function closeModal(){
  modalEl.hidden = true;
  modalEl.setAttribute("aria-hidden", "true");
  if (modalEl._closer) modalEl.removeEventListener("click", modalEl._closer);
  modalEl._closer = null;
}

// ---------------- Styled dropdown ----------------
function mountDropdown(rootEl, { getLabel, getItems, getValue, setValue }){
  rootEl.innerHTML = `
    <button class="dd__btn" type="button">
      <span class="dd__label"></span>
      <span class="dd__chev">▾</span>
    </button>
    <div class="dd__menu" hidden></div>
  `;

  const btn = rootEl.querySelector(".dd__btn");
  const label = rootEl.querySelector(".dd__label");
  const menu = rootEl.querySelector(".dd__menu");

  function render(){
    label.textContent = getLabel(getValue());
    const items = getItems();

    menu.innerHTML = items.map(it => `
      <div class="dd__item ${it.value === getValue() ? "is-active" : ""}" data-value="${escapeHtml(it.value)}">
        ${escapeHtml(it.label)}
      </div>
    `).join("");
  }

  function open(){
    render();
    menu.hidden = false;

    const onDoc = (e) => {
      if (!rootEl.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    rootEl._onDoc = onDoc;
    rootEl._onKey = onKey;
  }

  function close(){
    menu.hidden = true;
    if (rootEl._onDoc) document.removeEventListener("mousedown", rootEl._onDoc);
    if (rootEl._onKey) document.removeEventListener("keydown", rootEl._onKey);
    rootEl._onDoc = null;
    rootEl._onKey = null;
  }

  btn.addEventListener("click", () => {
    if (menu.hidden) open();
    else close();
  });

  menu.addEventListener("click", (e) => {
    const it = e.target.closest(".dd__item");
    if (!it) return;
    setValue(it.dataset.value);
    close();
    renderList();
  });

  // initial
  render();
}

// ---------------- Crypto helpers ----------------
function b64FromBytes(bytes){
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i=0;i<arr.length;i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}
function bytesFromB64(b64){
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function deriveKeyFromPassword(password, saltBytes){
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: 250000, hash: "SHA-256" },
    passKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt","decrypt"]
  );
}

async function encryptJson(key, obj){
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = enc.encode(JSON.stringify(obj));
  const cipher = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, data);
  return { iv, cipher: new Uint8Array(cipher) };
}

async function decryptJson(key, ivBytes, cipherBytes){
  const dec = new TextDecoder();
  const plain = await crypto.subtle.decrypt({ name:"AES-GCM", iv: ivBytes }, key, cipherBytes);
  return JSON.parse(dec.decode(new Uint8Array(plain)));
}

// ---------------- Vault storage ----------------
function loadBlob(){
  const raw = localStorage.getItem(LS.VAULT);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function saveBlob(blob){
  localStorage.setItem(LS.VAULT, JSON.stringify(blob));
}
function hasVault(){
  return !!localStorage.getItem(LS.VAULT);
}

async function saveVault(){
  const blob = loadBlob();
  if (!blob?.salt) throw new Error("Vault not initialized");

  const salt = bytesFromB64(blob.salt);
  const { iv, cipher } = await encryptJson(state.key, { items: state.items });

  const next = { v: 1, salt: b64FromBytes(salt), iv: b64FromBytes(iv), data: b64FromBytes(cipher) };
  saveBlob(next);
  return next;
}

async function unlockVault(password){
  const blob = loadBlob();
  if (!blob) throw new Error("Vault not found");

  const salt = bytesFromB64(blob.salt);
  const iv = bytesFromB64(blob.iv);
  const data = bytesFromB64(blob.data);

  const key = await deriveKeyFromPassword(password, salt);
  const payload = await decryptJson(key, iv, data);

  state.key = key;
  state.items = Array.isArray(payload.items) ? payload.items : [];
  state.unlocked = true;
  state.activeId = state.items[0]?.id ?? null;
}

async function initNewVault(password){
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKeyFromPassword(password, salt);

  state.key = key;
  state.items = [];
  state.unlocked = true;
  state.activeId = null;

  const { iv, cipher } = await encryptJson(key, { items: [] });
  const blob = { v: 1, salt: b64FromBytes(salt), iv: b64FromBytes(iv), data: b64FromBytes(cipher) };
  saveBlob(blob);
  return blob;
}

// ---------------- “Remember login” (упрощённо) ----------------
// Важно: пароль/ключ НЕ сохраняем. Сохраняем только флажок.
// Это означает: при перезагрузке страницы пароль снова нужен.
// (иначе пришлось бы хранить ключ/пароль — это уже совсем небезопасно)
function rememberSession(on){
  if (on) localStorage.setItem(LS.SESSION, "1");
  else localStorage.removeItem(LS.SESSION);
}
function isRemembered(){
  return localStorage.getItem(LS.SESSION) === "1";
}

// ---------------- Types (user-defined) ----------------
function allTypes(){
  const set = new Set(["all"]);
  for (const it of state.items){
    const t = (it.type || "").trim();
    if (t) set.add(t);
  }
  // подсказки-стартовые
  ["Заметки","Пароли","Работа","Клиенты","Сервера","Идеи"].forEach(x => set.add(x));
  return [...set];
}

function badgeLabel(type){
  const t = (type || "").trim();
  return t || "Без типа";
}

function rebuildTypeHints(){
  const types = allTypes().filter(x => x !== "all");
  typeHints.innerHTML = types.map(t => `<option value="${escapeHtml(t)}"></option>`).join("");
  renderTypeFilterDropdown();
}

function renderTypeFilterDropdown(){
  const types = allTypes();
  const items = [{ value: "all", label: "Все типы" }].concat(
    types.filter(x => x !== "all").map(t => ({ value: t, label: t }))
  );

  mountDropdown(typeFilterDDRoot, {
    getLabel: (v) => v === "all" ? "Все типы" : v,
    getItems: () => items,
    getValue: () => state.filterType,
    setValue: (v) => { state.filterType = v; }
  });
}

// ---------------- Render ----------------
function renderList(){
  const q = (searchInput.value || "").trim().toLowerCase();
  const ft = state.filterType;

  let items = [...state.items].sort((a,b) => (b.updatedAt||"").localeCompare(a.updatedAt||""));
  if (ft !== "all") items = items.filter(x => (x.type || "").trim() === ft);
  if (q) items = items.filter(x =>
    (x.title || "").toLowerCase().includes(q) ||
    (x.body || "").toLowerCase().includes(q) ||
    ((x.type || "").toLowerCase().includes(q))
  );

  listEl.innerHTML = "";
  emptyState.hidden = items.length > 0;

  for (const it of items){
    const el = document.createElement("div");
    el.className = "item" + (it.id === state.activeId ? " is-active" : "");
    el.innerHTML = `
      <div>
        <div class="item__title">${escapeHtml(it.title || "Без названия")}</div>
        <div class="item__meta">${fmtDate(it.updatedAt || it.createdAt || nowISO())}</div>
      </div>
      <div class="badge">${escapeHtml(badgeLabel(it.type))}</div>
    `;
    el.addEventListener("click", () => {
      state.activeId = it.id;
      renderList();
      renderEditor();
    });
    listEl.appendChild(el);
  }
}

function renderEditor(){
  const it = state.items.find(x => x.id === state.activeId) || null;
  if (!it){
    titleInput.value = "";
    typeInput.value = "";
    bodyInput.value = "";
    delBtn.disabled = true;
    copyBtn.disabled = true;
    return;
  }
  titleInput.value = it.title || "";
  typeInput.value = it.type || "";
  bodyInput.value = it.body || "";
  delBtn.disabled = false;
  copyBtn.disabled = false;
}

function setStatus(msg){
  statusLine.textContent = msg || "";
}

// ---------------- GitHub sync ----------------
function ghLoadCfg(){
  const raw = localStorage.getItem(LS.GH);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function ghSaveCfg(cfg){
  localStorage.setItem(LS.GH, JSON.stringify(cfg));
}
function ghHasCfg(){
  const c = ghLoadCfg();
  return !!(c?.token && c?.owner && c?.repo && c?.branch && c?.path);
}

function ghApiHeaders(token){
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`
  };
}

async function ghGetFile(cfg){
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, { headers: ghApiHeaders(cfg.token) });
  if (res.status === 404) return { exists:false, json:null, sha:null };
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  const data = await res.json();
  const contentB64 = data.content || "";
  const text = atob(contentB64.replace(/\n/g,""));
  const json = JSON.parse(text);
  return { exists:true, json, sha:data.sha };
}

async function ghPutFile(cfg, json, sha){
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
  const body = {
    message: "vault: sync",
    content: btoa(unescape(encodeURIComponent(JSON.stringify(json, null, 2)))),
    branch: cfg.branch
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...ghApiHeaders(cfg.token), "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status}`);
  return await res.json();
}

async function githubPush(){
  const cfg = ghLoadCfg();
  if (!cfg) throw new Error("GitHub не настроен");

  setStatus("GitHub: отправка…");
  const blob = await saveVault(); // сохраняем локально и берём актуальный blob

  const remote = await ghGetFile(cfg);
  await ghPutFile(cfg, blob, remote.sha || undefined);

  setStatus("GitHub: отправлено ✅");
  toast("GitHub: отправлено");
}

async function githubPull(){
  const cfg = ghLoadCfg();
  if (!cfg) throw new Error("GitHub не настроен");

  setStatus("GitHub: загрузка…");
  const remote = await ghGetFile(cfg);
  if (!remote.exists){
    setStatus("GitHub: файл не найден");
    toast("На GitHub ещё нет файла. Сначала отправь.");
    return;
  }

  // Подменяем локальный blob и просим заново ввести пароль (ключ нужен для расшифровки)
  saveBlob(remote.json);
  lockHard("Загружено с GitHub. Введите пароль.");
}

// ---------------- Actions ----------------
function lockHard(msg){
  state = { unlocked:false, key:null, items:[], activeId:null, filterType:"all" };
  setLocked(true);
  passwordInput.value = "";
  if (msg) toast(msg);
}

function requireConfirm({title, text, okText="Ок", cancelText="Отмена"}){
  return new Promise((resolve) => {
    openModal({
      title,
      bodyHTML: `<div class="muted" style="line-height:1.5">${escapeHtml(text)}</div>`,
      footHTML: `
        <button class="btn btn--ghost" data-close="1" id="mCancel">${escapeHtml(cancelText)}</button>
        <button class="btn btn--danger" id="mOk">${escapeHtml(okText)}</button>
      `,
      onMount: () => {
        qs("#mCancel").addEventListener("click", () => resolve(false));
        qs("#mOk").addEventListener("click", () => { closeModal(); resolve(true); });
      }
    });
  });
}

function openGithubModal(){
  const cur = ghLoadCfg() || { token:"", owner:"mantrova-studio", repo:"vault", branch:"main", path:"data/vault.json" };

  openModal({
    title: "GitHub синхронизация",
    bodyHTML: `
      <div class="hint" style="margin-bottom:12px">
        <span class="dot"></span>
        Хранится зашифрованный файл. Токен нужен с доступом к репозиторию (обычно “Contents: Read and write”).
      </div>

      <div class="form">
        <label class="field">
          <span class="field__label">Token (PAT)</span>
          <input class="input" id="ghToken" type="password" placeholder="ghp_..." value="${escapeHtml(cur.token)}" />
        </label>

        <div class="row row--2">
          <label class="field">
            <span class="field__label">Owner</span>
            <input class="input" id="ghOwner" type="text" value="${escapeHtml(cur.owner)}" />
          </label>
          <label class="field">
            <span class="field__label">Repo</span>
            <input class="input" id="ghRepo" type="text" value="${escapeHtml(cur.repo)}" />
          </label>
        </div>

        <div class="row row--2">
          <label class="field">
            <span class="field__label">Branch</span>
            <input class="input" id="ghBranch" type="text" value="${escapeHtml(cur.branch)}" />
          </label>
          <label class="field">
            <span class="field__label">Path (в репо)</span>
            <input class="input" id="ghPath" type="text" value="${escapeHtml(cur.path)}" />
          </label>
        </div>
      </div>
    `,
    footHTML: `
      <button class="btn btn--ghost" data-close="1">Закрыть</button>
      <button class="btn btn--ghost" id="ghPull">Загрузить (Pull)</button>
      <button class="btn btn--primary" id="ghPush">Отправить (Push)</button>
      <button class="btn btn--danger" id="ghForget">Забыть настройки</button>
    `,
    onMount: () => {
      const getCfgFromForm = () => ({
        token: (qs("#ghToken").value || "").trim(),
        owner: (qs("#ghOwner").value || "").trim(),
        repo: (qs("#ghRepo").value || "").trim(),
        branch: (qs("#ghBranch").value || "main").trim(),
        path: (qs("#ghPath").value || "data/vault.json").trim()
      });

      qs("#ghPush").addEventListener("click", async () => {
        try{
          const cfg = getCfgFromForm();
          ghSaveCfg(cfg);
          await githubPush();
          closeModal();
        }catch(e){
          toast("Ошибка GitHub Push");
          setStatus(String(e?.message || e));
        }
      });

      qs("#ghPull").addEventListener("click", async () => {
        try{
          const cfg = getCfgFromForm();
          ghSaveCfg(cfg);
          await githubPull();
          closeModal();
        }catch(e){
          toast("Ошибка GitHub Pull");
          setStatus(String(e?.message || e));
        }
      });

      qs("#ghForget").addEventListener("click", async () => {
        const ok = await requireConfirm({
          title: "Удалить настройки GitHub?",
          text: "Токен и параметры репозитория будут удалены с этого устройства.",
          okText: "Удалить"
        });
        if (!ok) return;
        localStorage.removeItem(LS.GH);
        toast("GitHub настройки удалены");
        closeModal();
      });
    }
  });
}

// ---------------- Events ----------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pass = passwordInput.value;

  try{
    await unlockVault(pass);
    rememberSession(rememberCheck.checked);

    setLocked(false);
    rebuildTypeHints();
    renderList();
    renderEditor();

    toast("Открыто");
    setStatus(ghHasCfg() ? "GitHub настроен" : "GitHub не настроен");
  }catch{
    toast("Неверный пароль или хранилище повреждено");
  }
});

initBtn.addEventListener("click", async () => {
  const pass = passwordInput.value;
  if (!pass || pass.length < 4){
    toast("Пароль слишком короткий");
    return;
  }

  if (hasVault()){
    const ok = await requireConfirm({
      title: "Создать новое хранилище?",
      text: "Текущее хранилище на этом устройстве будет перезаписано.",
      okText: "Создать",
      cancelText: "Отмена"
    });
    if (!ok) return;
  }

  await initNewVault(pass);
  rememberSession(rememberCheck.checked);

  setLocked(false);
  rebuildTypeHints();
  renderList();
  renderEditor();

  toast("Создано новое хранилище");
  setStatus(ghHasCfg() ? "GitHub настроен" : "GitHub не настроен");
});

lockBtn.addEventListener("click", () => {
  lockHard("Заблокировано");
});

syncBtn.addEventListener("click", () => {
  openGithubModal();
});

searchInput.addEventListener("input", renderList);

newBtn.addEventListener("click", () => {
  const it = {
    id: uid(),
    title: "Новая запись",
    type: "Заметки",
    body: "",
    createdAt: nowISO(),
    updatedAt: nowISO()
  };
  state.items.push(it);
  state.activeId = it.id;

  rebuildTypeHints();
  renderList();
  renderEditor();
  toast("Создано");
});

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const it = state.items.find(x => x.id === state.activeId);
  if (!it){
    toast("Сначала создай запись");
    return;
  }
  it.title = (titleInput.value || "").trim() || "Без названия";
  it.type = (typeInput.value || "").trim() || "Без типа";
  it.body = bodyInput.value || "";
  it.updatedAt = nowISO();

  try{
    await saveVault();
    rebuildTypeHints();
    renderList();
    toast("Сохранено");
  }catch{
    toast("Ошибка сохранения");
  }
});

delBtn.addEventListener("click", async () => {
  const it = state.items.find(x => x.id === state.activeId);
  if (!it) return;

  const ok = await requireConfirm({
    title: "Удалить запись?",
    text: "Удаление необратимо (локально и в шифрованном виде).",
    okText: "Удалить"
  });
  if (!ok) return;

  state.items = state.items.filter(x => x.id !== state.activeId);
  state.activeId = state.items[0]?.id ?? null;

  try{
    await saveVault();
    rebuildTypeHints();
    renderList();
    renderEditor();
    toast("Удалено");
  }catch{
    toast("Ошибка удаления");
  }
});

copyBtn.addEventListener("click", async () => {
  const it = state.items.find(x => x.id === state.activeId);
  if (!it) return;

  const text = `${it.title}\nТип: ${it.type}\n\n${it.body || ""}`;
  try{
    await navigator.clipboard.writeText(text);
    toast("Скопировано");
  }catch{
    toast("Не удалось скопировать");
  }
});

exportBtn.addEventListener("click", () => {
  const blob = loadBlob();
  if (!blob){
    toast("Нечего экспортировать");
    return;
  }
  const data = JSON.stringify(blob, null, 2);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type:"application/json" }));
  a.download = "vault-export.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

importFile.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try{
    const text = await file.text();
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== "object" || !obj.salt || !obj.iv || !obj.data){
      toast("Неверный файл");
      return;
    }
    saveBlob(obj);
    lockHard("Импортировано. Введите пароль.");
  }catch{
    toast("Ошибка импорта");
  }finally{
    importFile.value = "";
  }
});

// ---------------- Boot ----------------
(function boot(){
  setLocked(true);
  rememberCheck.checked = isRemembered();

  // Стартовая стилизованная фильтрация (пока locked, но ок)
  renderTypeFilterDropdown();

  // Если вообще нет vault — подсказка
  if (!hasVault()){
    setTimeout(() => toast("Хранилища ещё нет — введи пароль и нажми «Новое хранилище»"), 250);
  }
})();