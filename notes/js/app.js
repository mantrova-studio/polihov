// Vault — мульти-хранилища + локальное шифрование + сохранение в GitHub (по кнопке)
// В настройках вводится ТОЛЬКО token. Репозиторий/пути — из "FILE SETTINGS" ниже.

const qs = (s, el = document) => el.querySelector(s);

// ===== FILE SETTINGS (правишь тут один раз под репозиторий) =====
const GH_FILE = {
  owner: "mantrova-studio",
  repo: "polihov",
  branch: "main",
  baseDir: "notes/data/vaults"
};
// ===============================================================

// lock UI
const loginForm = qs("#loginForm");
const passwordInput = qs("#passwordInput");
const toggleLoginPass = qs("#toggleLoginPass");
const rememberCheck = qs("#rememberCheck");
const vaultSelectDDRoot = qs("#vaultSelectDD");
const createVaultBtn = qs("#createVaultBtn");

// app UI
const lockBtn = qs("#lockBtn");
const settingsBtn = qs("#settingsBtn");
const activeVaultTitle = qs("#activeVaultTitle");
const activeVaultSub = qs("#activeVaultSub");

const searchInput = qs("#searchInput");
const newBtn = qs("#newBtn");
const listEl = qs("#list");
const emptyState = qs("#emptyState");

const editForm = qs("#editForm");
const titleInput = qs("#titleInput");
const typeInput = qs("#typeInput");
const bodyInput = qs("#bodyInput"); // contenteditable
const delBtn = qs("#delBtn");
const copyBtn = qs("#copyBtn");
const saveGithubBtn = qs("#saveGithubBtn");
const statusLine = qs("#statusLine");
const typeHints = qs("#typeHints");
const typeFilterDDRoot = qs("#typeFilterDD");

// format menu
const fmtMenu = qs("#fmtMenu");

// toast + modal
const toastEl = qs("#toast");
const modalEl = qs("#modal");
const modalTitleEl = qs("#modalTitle");
const modalBodyEl = qs("#modalBody");
const modalFootEl = qs("#modalFoot");

// ---------- LocalStorage keys ----------
const LS = {
  VAULTS: "vaults_index_v1",
  ACTIVE: "vault_active_v1",
  REMEMBER: "vault_remember_v1",
  GH_TOKEN: "vault_github_token_v1",
};

const blobKey = (id) => `vault_blob_${id}`;

// ---------- State ----------
let state = {
  unlocked: false,
  vaultId: null,
  key: null,
  items: [],
  activeId: null,
  filterType: "all"
};

// ---------- UI helpers ----------
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
  hideFmtMenu();
}

function setStatus(msg){
  statusLine.textContent = msg || "";
}

function nowISO(){ return new Date().toISOString(); }

function fmtDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  }catch{ return ""; }
}

function uid(){
  return "v_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function nid(){
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

function stripHtml(html){
  return String(html || "").replace(/<[^>]+>/g, " ");
}

// ---------- Modal ----------
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

function confirmModal({title, text, okText="Ок", cancelText="Отмена", danger=false}){
  return new Promise((resolve) => {
    openModal({
      title,
      bodyHTML: `<div class="muted" style="line-height:1.5">${escapeHtml(text)}</div>`,
      footHTML: `
        <button class="btn btn--ghost" data-close="1" id="mCancel">${escapeHtml(cancelText)}</button>
        <button class="btn ${danger ? "btn--danger" : "btn--primary"}" id="mOk">${escapeHtml(okText)}</button>
      `,
      onMount: () => {
        qs("#mCancel").addEventListener("click", () => resolve(false));
        qs("#mOk").addEventListener("click", () => { closeModal(); resolve(true); });
      }
    });
  });
}

// ---------- Styled dropdown ----------
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

    const onDoc = (e) => { if (!rootEl.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };

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

  btn.addEventListener("click", () => (menu.hidden ? open() : close()));
  menu.addEventListener("click", (e) => {
    const it = e.target.closest(".dd__item");
    if (!it) return;
    setValue(it.dataset.value);
    close();
    render();
  });

  render();
}

// ---------- Crypto ----------
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

// ---------- Vault registry ----------
function loadVaults(){
  const raw = localStorage.getItem(LS.VAULTS);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveVaults(arr){
  localStorage.setItem(LS.VAULTS, JSON.stringify(arr));
}
function getActiveVaultId(){
  return localStorage.getItem(LS.ACTIVE) || null;
}
function setActiveVaultId(id){
  if (id) localStorage.setItem(LS.ACTIVE, id);
  else localStorage.removeItem(LS.ACTIVE);
}
function rememberSelected(on){
  if (on) localStorage.setItem(LS.REMEMBER, "1");
  else localStorage.removeItem(LS.REMEMBER);
}
function isRememberSelected(){
  return localStorage.getItem(LS.REMEMBER) === "1";
}

// ---------- Vault blob storage ----------
function loadBlob(vaultId){
  const raw = localStorage.getItem(blobKey(vaultId));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function saveBlob(vaultId, blob){
  localStorage.setItem(blobKey(vaultId), JSON.stringify(blob));
}
function hasBlob(vaultId){
  return !!localStorage.getItem(blobKey(vaultId));
}

async function initVaultBlob(vaultId, password){
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKeyFromPassword(password, salt);
  const { iv, cipher } = await encryptJson(key, { items: [] });
  const blob = { v: 1, salt: b64FromBytes(salt), iv: b64FromBytes(iv), data: b64FromBytes(cipher) };
  saveBlob(vaultId, blob);
  return { key, blob };
}

async function unlockVaultBlob(vaultId, password){
  const blob = loadBlob(vaultId);
  if (!blob) throw new Error("blob not found");

  const salt = bytesFromB64(blob.salt);
  const iv = bytesFromB64(blob.iv);
  const data = bytesFromB64(blob.data);

  const key = await deriveKeyFromPassword(password, salt);
  const payload = await decryptJson(key, iv, data);

  return { key, payload };
}

async function saveVaultDataLocal(){
  const vaultId = state.vaultId;
  if (!vaultId) throw new Error("no vault selected");
  const blob = loadBlob(vaultId);
  if (!blob?.salt) throw new Error("vault not initialized");

  const salt = bytesFromB64(blob.salt);

  const safeItems = state.items.map(x => ({
    ...x,
    bodyHtml: sanitizeHtml(x.bodyHtml || "")
  }));

  const { iv, cipher } = await encryptJson(state.key, { items: safeItems });

  const next = { v: 1, salt: b64FromBytes(salt), iv: b64FromBytes(iv), data: b64FromBytes(cipher) };
  saveBlob(vaultId, next);

  const vaults = loadVaults();
  const v = vaults.find(x => x.id === vaultId);
  if (v) { v.updatedAt = nowISO(); saveVaults(vaults); }

  return next;
}

// ---------- Types ----------
function allTypes(){
  const set = new Set(["all"]);
  for (const it of state.items){
    const t = (it.type || "").trim();
    if (t) set.add(t);
  }
  ["Заметки","Пароли","Работа","Клиенты","Сервера","Идеи"].forEach(x => set.add(x));
  return [...set];
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
    setValue: (v) => { state.filterType = v; renderList(); }
  });
}

// ---------- Render list/editor ----------
function badgeLabel(type){
  const t = (type || "").trim();
  return t || "Без типа";
}

function renderList(){
  const q = (searchInput.value || "").trim().toLowerCase();
  const ft = state.filterType;

  let items = [...state.items].sort((a,b) => (b.updatedAt||"").localeCompare(a.updatedAt||""));
  if (ft !== "all") items = items.filter(x => (x.type || "").trim() === ft);
  if (q) items = items.filter(x => {
    const bodyText = stripHtml(x.bodyHtml || "");
    return (x.title || "").toLowerCase().includes(q) ||
      bodyText.toLowerCase().includes(q) ||
      ((x.type || "").toLowerCase().includes(q));
  });

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
    bodyInput.innerHTML = "";
    delBtn.disabled = true;
    copyBtn.disabled = true;
    return;
  }
  titleInput.value = it.title || "";
  typeInput.value = it.type || "";
  bodyInput.innerHTML = it.bodyHtml || "";
  delBtn.disabled = false;
  copyBtn.disabled = false;
}

// ---------- Vault dropdown on lock screen ----------
let selectedVaultId = null;

function renderVaultSelectDropdown(){
  const vaults = loadVaults();
  if (!selectedVaultId) {
    const rememberedOk = isRememberSelected();
    const last = rememberedOk ? getActiveVaultId() : null;
    selectedVaultId = last || vaults[0]?.id || null;
  }

  const items = vaults.length
    ? vaults.map(v => ({ value: v.id, label: v.name }))
    : [{ value: "__none__", label: "Нет хранилищ (создай новое)" }];

  mountDropdown(vaultSelectDDRoot, {
    getLabel: (id) => {
      if (!id || id === "__none__") return "—";
      const v = vaults.find(x => x.id === id);
      return v ? v.name : "—";
    },
    getItems: () => items,
    getValue: () => (vaults.length ? selectedVaultId : "__none__"),
    setValue: (v) => {
      if (v === "__none__") return;
      selectedVaultId = v;
      if (isRememberSelected()) setActiveVaultId(v);
    }
  });
}

// ---------- Create vault ----------
function openCreateVaultModal(){
  openModal({
    title: "Создать хранилище",
    bodyHTML: `
      <div class="form">
        <label class="field">
          <span class="field__label">Название</span>
          <input class="input" id="cvName" type="text" placeholder="Например: Работа" />
        </label>

        <label class="field">
          <span class="field__label">Пароль</span>
          <div class="pass">
            <input class="input" id="cvPass" type="password" placeholder="Пароль" />
            <button class="iconBtn iconBtn--in" id="cvToggle1" type="button" title="Показать пароль">👁</button>
          </div>
        </label>

        <label class="field">
          <span class="field__label">Повтор пароля</span>
          <div class="pass">
            <input class="input" id="cvPass2" type="password" placeholder="Повтор пароля" />
            <button class="iconBtn iconBtn--in" id="cvToggle2" type="button" title="Показать пароль">👁</button>
          </div>
        </label>
      </div>
    `,
    footHTML: `
      <button class="btn btn--ghost" data-close="1">Отмена</button>
      <button class="btn btn--primary" id="cvOk">Создать</button>
    `,
    onMount: () => {
      const wireEye = (btn, inp) => btn.addEventListener("click", () => {
        inp.type = (inp.type === "password") ? "text" : "password";
      });
      wireEye(qs("#cvToggle1"), qs("#cvPass"));
      wireEye(qs("#cvToggle2"), qs("#cvPass2"));

      qs("#cvOk").addEventListener("click", async () => {
        const name = (qs("#cvName").value || "").trim();
        const pass = (qs("#cvPass").value || "").trim();
        const pass2 = (qs("#cvPass2").value || "").trim();

        if (!name) { toast("Укажи название"); return; }
        if (pass.length < 4) { toast("Пароль слишком короткий"); return; }
        if (pass !== pass2) { toast("Пароли не совпадают"); return; }

        const id = uid();
        const vaults = loadVaults();
        vaults.push({ id, name, createdAt: nowISO(), updatedAt: nowISO() });
        saveVaults(vaults);

        await initVaultBlob(id, pass);

        selectedVaultId = id;
        if (isRememberSelected()) setActiveVaultId(id);

        closeModal();
        renderVaultSelectDropdown();
        toast("Хранилище создано");
      });
    }
  });
}

// ---------- Settings ----------
function getGhToken(){
  return (localStorage.getItem(LS.GH_TOKEN) || "").trim();
}
function setGhToken(token){
  if (token) localStorage.setItem(LS.GH_TOKEN, token);
  else localStorage.removeItem(LS.GH_TOKEN);
}

function openSettingsModal(){
  if (!state.unlocked || !state.vaultId){
    toast("Сначала войди в хранилище");
    return;
  }

  const vaults = loadVaults();
  const v = vaults.find(x => x.id === state.vaultId);

  openModal({
    title: "Настройки",
    bodyHTML: `
      <div class="form">
        <div class="hint">
          <span class="dot"></span>
          GitHub repo: <span style="font-family:ui-monospace,monospace">${escapeHtml(GH_FILE.owner)}/${escapeHtml(GH_FILE.repo)}</span>
          · branch: <span style="font-family:ui-monospace,monospace">${escapeHtml(GH_FILE.branch)}</span>
        </div>

        <label class="field">
          <span class="field__label">GitHub Token (PAT)</span>
          <input class="input" id="stToken" type="password" placeholder="ghp_..." value="${escapeHtml(getGhToken())}" />
          <div class="hint" style="margin-top:8px">
            <span class="dot"></span>
            Нужны права на запись (Contents: Read and write).
          </div>
        </label>

        <div class="card" style="margin:8px 0 0; box-shadow:none;">
          <div class="card__head" style="margin-bottom:10px">
            <div class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.06em">Хранилище</div>
          </div>

          <label class="field">
            <span class="field__label">Название</span>
            <input class="input" id="stVaultName" type="text" value="${escapeHtml(v?.name || "Vault")}" />
          </label>

          <div class="row">
            <button class="btn btn--primary" id="stRename" type="button">Переименовать</button>
            <button class="btn btn--danger" id="stDelete" type="button">Удалить хранилище</button>
          </div>

          <div class="hint" style="margin-top:10px">
            <span class="dot"></span>
            Удаление необратимо (локально). На GitHub файлы останутся.
          </div>
        </div>
      </div>
    `,
    footHTML: `
      <button class="btn btn--ghost" data-close="1">Закрыть</button>
      <button class="btn btn--primary" id="stSaveToken">Сохранить токен</button>
    `,
    onMount: () => {
      qs("#stSaveToken").addEventListener("click", () => {
        const t = (qs("#stToken").value || "").trim();
        setGhToken(t);
        toast(t ? "Токен сохранён" : "Токен очищен");
        closeModal();
        setStatus(t ? "GitHub: токен есть" : "GitHub: токена нет");
      });

      qs("#stRename").addEventListener("click", () => {
        const newName = (qs("#stVaultName").value || "").trim();
        if (!newName){ toast("Укажи название"); return; }

        const vaults2 = loadVaults();
        const cur = vaults2.find(x => x.id === state.vaultId);
        if (!cur){ toast("Хранилище не найдено"); return; }

        cur.name = newName;
        cur.updatedAt = nowISO();
        saveVaults(vaults2);

        activeVaultTitle.textContent = newName;
        activeVaultSub.textContent = `ID: ${state.vaultId}`;
        renderVaultSelectDropdown();

        toast("Переименовано");
      });

      qs("#stDelete").addEventListener("click", async () => {
        const vaults2 = loadVaults();
        const cur = vaults2.find(x => x.id === state.vaultId);
        if (!cur){ toast("Хранилище не найдено"); return; }

        const ok = await confirmModal({
          title: "Удалить хранилище?",
          text: `Будет удалено: "${cur.name}". Данные исчезнут с устройства.`,
          okText: "Удалить",
          danger: true
        });
        if (!ok) return;

        localStorage.removeItem(blobKey(cur.id));
        const next = vaults2.filter(x => x.id !== cur.id);
        saveVaults(next);

        selectedVaultId = next[0]?.id || null;
        if (getActiveVaultId() === cur.id) setActiveVaultId(selectedVaultId || "");

        closeModal();
        lockHard("Хранилище удалено");
        renderVaultSelectDropdown();
      });
    }
  });
}

// ---------- GitHub save ----------
function ghApiHeaders(token){
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`
  };
}
function ghPathForVault(vaultId){
  const safeId = String(vaultId).replace(/[^\w\-]/g, "_");
  const base = String(GH_FILE.baseDir || "notes/data/vaults").replace(/\/+$/,"");
  return `${base}/${safeId}.json`;
}
async function ghGetFile(token, path){
  const url = `https://api.github.com/repos/${GH_FILE.owner}/${GH_FILE.repo}/contents/${path}?ref=${encodeURIComponent(GH_FILE.branch)}`;
  const res = await fetch(url, { headers: ghApiHeaders(token) });
  if (res.status === 404) return { exists:false, sha:null };
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  const data = await res.json();
  return { exists:true, sha:data.sha };
}
async function ghPutFile(token, path, json, sha){
  const url = `https://api.github.com/repos/${GH_FILE.owner}/${GH_FILE.repo}/contents/${path}`;
  const body = {
    message: "vault: save",
    content: btoa(unescape(encodeURIComponent(JSON.stringify(json, null, 2)))),
    branch: GH_FILE.branch
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...ghApiHeaders(token), "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status}`);
  return await res.json();
}

async function githubSaveCurrentVault(){
  const token = getGhToken();
  if (!token){
    toast("В настройках добавь GitHub токен");
    openSettingsModal();
    return;
  }
  if (!state.unlocked || !state.vaultId){
    toast("Нет активного хранилища");
    return;
  }

  setStatus("GitHub: сохранение…");

  const blob = await saveVaultDataLocal();

  const path = ghPathForVault(state.vaultId);
  const remote = await ghGetFile(token, path);
  await ghPutFile(token, path, blob, remote.sha || undefined);

  setStatus(`GitHub: сохранено ✅`);
  toast("Сохранено в GitHub");
}

// ---------- Lock/Unlock ----------
function lockHard(msg){
  state = { unlocked:false, vaultId:null, key:null, items:[], activeId:null, filterType:"all" };
  setLocked(true);
  passwordInput.value = "";
  setStatus("");
  if (msg) toast(msg);
}

async function unlockSelectedVault(password){
  if (!selectedVaultId) throw new Error("no vault selected");
  if (!hasBlob(selectedVaultId)) throw new Error("vault blob missing");

  const { key, payload } = await unlockVaultBlob(selectedVaultId, password);

  state.unlocked = true;
  state.vaultId = selectedVaultId;
  state.key = key;

  state.items = Array.isArray(payload.items) ? payload.items.map(x => ({
    ...x,
    bodyHtml: sanitizeHtml(x.bodyHtml || "")
  })) : [];

  state.activeId = state.items[0]?.id ?? null;
  state.filterType = "all";

  const vaults = loadVaults();
  const v = vaults.find(x => x.id === selectedVaultId);
  activeVaultTitle.textContent = v ? v.name : "Vault";
  activeVaultSub.textContent = `ID: ${selectedVaultId}`;

  setLocked(false);
  rebuildTypeHints();
  renderList();
  renderEditor();

  setStatus(getGhToken() ? "GitHub: токен есть" : "GitHub: токена нет");
}

// ---------- Events ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pass = (passwordInput.value || "").trim();

  try{
    rememberSelected(rememberCheck.checked);
    if (rememberCheck.checked && selectedVaultId) setActiveVaultId(selectedVaultId);
    await unlockSelectedVault(pass);
    toast("Открыто");
  }catch{
    toast("Неверный пароль или хранилище не найдено");
  }
});

createVaultBtn.addEventListener("click", openCreateVaultModal);

toggleLoginPass.addEventListener("click", () => {
  const isPass = passwordInput.type === "password";
  passwordInput.type = isPass ? "text" : "password";
  toggleLoginPass.title = isPass ? "Скрыть пароль" : "Показать пароль";
});

lockBtn.addEventListener("click", () => lockHard("Заблокировано"));
settingsBtn.addEventListener("click", openSettingsModal);

searchInput.addEventListener("input", renderList);

newBtn.addEventListener("click", () => {
  const it = {
    id: nid(),
    title: "Новая запись",
    type: "Заметки",
    bodyHtml: "",
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
  if (!it) { toast("Сначала создай запись"); return; }

  it.title = (titleInput.value || "").trim() || "Без названия";
  it.type  = (typeInput.value || "").trim() || "Без типа";
  it.bodyHtml = sanitizeHtml(bodyInput.innerHTML || "");
  it.updatedAt = nowISO();

  try{
    await saveVaultDataLocal();
    rebuildTypeHints();
    renderList();
    toast("Применено");
  }catch{
    toast("Ошибка сохранения");
  }
});

saveGithubBtn.addEventListener("click", async () => {
  try{
    const it = state.items.find(x => x.id === state.activeId);
    if (it){
      it.title = (titleInput.value || "").trim() || "Без названия";
      it.type  = (typeInput.value || "").trim() || "Без типа";
      it.bodyHtml = sanitizeHtml(bodyInput.innerHTML || "");
      it.updatedAt = nowISO();
    }
    await githubSaveCurrentVault();
    rebuildTypeHints();
    renderList();
  }catch(e){
    toast("Ошибка GitHub");
    setStatus(String(e?.message || e));
  }
});

delBtn.addEventListener("click", async () => {
  const it = state.items.find(x => x.id === state.activeId);
  if (!it) return;

  const ok = await confirmModal({
    title: "Удалить запись?",
    text: "Удаление необратимо.",
    okText: "Удалить",
    danger: true
  });
  if (!ok) return;

  state.items = state.items.filter(x => x.id !== state.activeId);
  state.activeId = state.items[0]?.id ?? null;

  try{
    await saveVaultDataLocal();
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

  const text = `${it.title}\nТип: ${it.type}\n\n${stripHtml(it.bodyHtml || "")}`;
  try{
    await navigator.clipboard.writeText(text);
    toast("Скопировано");
  }catch{
    toast("Не удалось скопировать");
  }
});

// ---------- Rich text: sanitizer ----------
function sanitizeHtml(html){
  const allowed = new Set(["B","STRONG","I","EM","U","S","STRIKE","BR","DIV","P","SPAN"]);
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;

  const walk = (node) => {
    const children = [...node.childNodes];
    for (const ch of children){
      if (ch.nodeType === Node.ELEMENT_NODE){
        const tag = ch.tagName.toUpperCase();

        const keepSpoiler = (tag === "SPAN") && (ch.getAttribute("class") || "").includes("spoiler");
        [...ch.attributes].forEach(a => ch.removeAttribute(a.name));
        if (keepSpoiler) ch.setAttribute("class", "spoiler");

        if (!allowed.has(tag)){
          const frag = doc.createDocumentFragment();
          while (ch.firstChild) frag.appendChild(ch.firstChild);
          ch.replaceWith(frag);
          continue;
        }

        if (tag === "SPAN" && !keepSpoiler){
          const frag = doc.createDocumentFragment();
          while (ch.firstChild) frag.appendChild(ch.firstChild);
          ch.replaceWith(frag);
          continue;
        }

        walk(ch);
      } else if (ch.nodeType === Node.COMMENT_NODE){
        ch.remove();
      }
    }
  };

  walk(root);
  return root.innerHTML;
}

// ---------- Rich text: context menu ----------
function selectionInEditor(){
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  const common = range.commonAncestorContainer;
  return bodyInput.contains(common.nodeType === 1 ? common : common.parentElement);
}

function hasSelection(){
  const sel = window.getSelection();
  return !!(sel && sel.rangeCount && !sel.getRangeAt(0).collapsed);
}

function getSelectionRect(){
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0).getBoundingClientRect();
  if (!r || (r.width === 0 && r.height === 0)) return null;
  return r;
}

function hideFmtMenu(){
  fmtMenu.hidden = true;
}

function setFmtExtraVisible(visible){
  fmtMenu.querySelectorAll('[data-role="fmt-extra"]').forEach(el => {
    el.style.display = visible ? "" : "none";
  });
}

function showFmtMenuAt(x, y, showFormatting){
  setFmtExtraVisible(showFormatting);
  fmtMenu.hidden = false;

  // чуть выше
  const menuH = 44;
  const yy = Math.max(10, y - menuH - 12);
  const xx = Math.min(window.innerWidth - 10, Math.max(10, x));

  fmtMenu.style.left = `${xx}px`;
  fmtMenu.style.top = `${yy}px`;
  fmtMenu.style.transform = "translateX(-50%)";
}

function showFmtMenuNearSelection(){
  const rect = getSelectionRect();
  if (!rect) return;
  showFmtMenuAt(rect.left + rect.width/2, rect.top, true);
}

async function cmdCopy(){
  const sel = window.getSelection();
  const selected = sel ? sel.toString() : "";
  try{
    if (selected){
      await navigator.clipboard.writeText(selected);
      toast("Скопировано");
      return;
    }

    // если выделения нет — копируем всю заметку (plain text)
    const it = state.items.find(x => x.id === state.activeId);
    const all = it ? stripHtml(it.bodyHtml || "") : stripHtml(bodyInput.innerHTML || "");
    await navigator.clipboard.writeText(all);
    toast("Скопировано (вся заметка)");
  }catch{
    toast("Не удалось скопировать");
  }
}

async function cmdPaste(){
  try{
    const text = await navigator.clipboard.readText();
    if (!text) return;
    bodyInput.focus();
    document.execCommand("insertText", false, text);
    toast("Вставлено");
  }catch{
    toast("Вставка недоступна");
  }
}

function unwrapSpoilersInRange(range){
  const spoilers = [...bodyInput.querySelectorAll("span.spoiler")];
  for (const sp of spoilers){
    try{
      if (range.intersectsNode(sp)){
        const frag = document.createDocumentFragment();
        while (sp.firstChild) frag.appendChild(sp.firstChild);
        sp.replaceWith(frag);
      }
    }catch{}
  }
}

function wrapSelectionWithSpoiler(){
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  // убрать слои спойлера внутри выделения
  unwrapSpoilersInRange(range.cloneRange());

  // range может стать неактуальным — возьмём заново
  const sel2 = window.getSelection();
  if (!sel2 || sel2.rangeCount === 0) return;
  const range2 = sel2.getRangeAt(0);
  if (range2.collapsed) return;

  const span = document.createElement("span");
  span.className = "spoiler";

  try{
    range2.surroundContents(span);
  }catch{
    const frag = range2.extractContents();
    span.appendChild(frag);
    range2.insertNode(span);
  }

  sel2.removeAllRanges();
  const nr = document.createRange();
  nr.selectNodeContents(span);
  sel2.addRange(nr);
}

function resetFormatting(){
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0).cloneRange();

  document.execCommand("removeFormat");
  unwrapSpoilersInRange(range);
}

// кнопки меню
fmtMenu.addEventListener("click", async (e) => {
  const btn = e.target.closest(".fmt__btn");
  if (!btn) return;

  const cmd = btn.dataset.cmd;

  if (cmd === "copy"){
    await cmdCopy();
    hideFmtMenu();
    bodyInput.focus();
    return;
  }
  if (cmd === "paste"){
    await cmdPaste();
    hideFmtMenu();
    bodyInput.focus();
    return;
  }

  // форматирование только при выделении внутри редактора
  if (!selectionInEditor() || !hasSelection()) return;

  if (cmd === "spoiler"){
    wrapSelectionWithSpoiler();
    hideFmtMenu();
    bodyInput.focus();
    return;
  }
  if (cmd === "reset"){
    resetFormatting();
    hideFmtMenu();
    bodyInput.focus();
    return;
  }

  document.execCommand(cmd);
  hideFmtMenu();
  bodyInput.focus();
});

// правый клик: если выделение есть -> формат; если нет -> только copy/paste
bodyInput.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const hasSel = selectionInEditor() && hasSelection();

  if (hasSel){
    showFmtMenuNearSelection();
  }else{
    // меню в точке клика, без форматирования
    showFmtMenuAt(e.clientX, e.clientY, false);
  }
});

// selectionchange: показываем только при выделении, иначе скрываем
document.addEventListener("selectionchange", () => {
  if (selectionInEditor() && hasSelection()){
    showFmtMenuNearSelection();
  } else {
    hideFmtMenu();
  }
});

// клик/тап вне — закрыть меню
document.addEventListener("pointerdown", (e) => {
  if (fmtMenu.hidden) return;
  if (fmtMenu.contains(e.target)) return;
  hideFmtMenu();
});

// раскрытие спойлера
bodyInput.addEventListener("click", (e) => {
  const sp = e.target.closest(".spoiler");
  if (!sp) return;
  sp.classList.toggle("is-revealed");
});

// ---------- Boot ----------
(function boot(){
  setLocked(true);
  rememberCheck.checked = isRememberSelected();
  renderVaultSelectDropdown();

  const vaults = loadVaults();
  if (vaults.length === 0){
    setTimeout(() => toast("Создай хранилище: кнопка «Создать»"), 250);
  }
})();