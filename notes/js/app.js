// Vault — мульти-хранилища (каждое отдельно) + шифрование + GitHub sync (отдельный файл на vault)

const qs = (s, el = document) => el.querySelector(s);

// lock UI
const loginForm = qs("#loginForm");
const passwordInput = qs("#passwordInput");
const toggleLoginPass = qs("#toggleLoginPass");
const rememberCheck = qs("#rememberCheck");
const vaultSelectDDRoot = qs("#vaultSelectDD");
const createVaultBtn = qs("#createVaultBtn");
const renameVaultBtn = qs("#renameVaultBtn");
const deleteVaultBtn = qs("#deleteVaultBtn");

// app UI
const lockBtn = qs("#lockBtn");
const syncBtn = qs("#syncBtn");
const activeVaultTitle = qs("#activeVaultTitle");
const activeVaultSub = qs("#activeVaultSub");

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

// toast + modal
const toastEl = qs("#toast");
const modalEl = qs("#modal");
const modalTitleEl = qs("#modalTitle");
const modalBodyEl = qs("#modalBody");
const modalFootEl = qs("#modalFoot");

// ---------- LocalStorage keys ----------
const LS = {
  VAULTS: "vaults_index_v1",         // [{id,name,createdAt,updatedAt}]
  ACTIVE: "vault_active_v1",         // active vault id (for convenience)
  REMEMBER: "vault_remember_v1",     // "1" remember selected vault
  GH: "vault_github_cfg_v1",         // {token, owner, repo, branch, baseDir}
  // each vault blob: vault_blob_<id>
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

async function saveVaultData(){
  const vaultId = state.vaultId;
  if (!vaultId) throw new Error("no vault selected");
  const blob = loadBlob(vaultId);
  if (!blob?.salt) throw new Error("vault not initialized");

  const salt = bytesFromB64(blob.salt);
  const { iv, cipher } = await encryptJson(state.key, { items: state.items });

  const next = { v: 1, salt: b64FromBytes(salt), iv: b64FromBytes(iv), data: b64FromBytes(cipher) };
  saveBlob(vaultId, next);

  // обновим updatedAt в реестре
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

  deleteVaultBtn.disabled = vaults.length === 0;
  renameVaultBtn.disabled = vaults.length === 0;
}

// ---------- Create/Rename/Delete vault ----------
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
            <button class="iconBtn iconBtn--in" id="cvToggle1" type="button" aria-label="Показать пароль" title="Показать пароль">👁</button>
          </div>
        </label>

        <label class="field">
          <span class="field__label">Повтор пароля</span>
          <div class="pass">
            <input class="input" id="cvPass2" type="password" placeholder="Повтор пароля" />
            <button class="iconBtn iconBtn--in" id="cvToggle2" type="button" aria-label="Показать пароль" title="Показать пароль">👁</button>
          </div>
        </label>

        <div class="hint">
          <span class="dot"></span>
          Это создаст отдельный зашифрованный blob в localStorage.
        </div>
      </div>
    `,
    footHTML: `
      <button class="btn btn--ghost" data-close="1">Отмена</button>
      <button class="btn btn--primary" id="cvOk">Создать</button>
    `,
    onMount: () => {
      const t1 = qs("#cvToggle1");
      const t2 = qs("#cvToggle2");
      const p1 = qs("#cvPass");
      const p2 = qs("#cvPass2");
      const wireEye = (btn, inp) => {
        btn.addEventListener("click", () => {
          const isPass = inp.type === "password";
          inp.type = isPass ? "text" : "password";
          btn.setAttribute("aria-label", isPass ? "Скрыть пароль" : "Показать пароль");
          btn.title = isPass ? "Скрыть пароль" : "Показать пароль";
        });
      };
      wireEye(t1, p1);
      wireEye(t2, p2);

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

function openRenameVaultModal(){
  const vaults = loadVaults();
  const v = vaults.find(x => x.id === selectedVaultId);
  if (!v){
    toast("Нет выбранного хранилища");
    return;
  }

  openModal({
    title: "Переименовать хранилище",
    bodyHTML: `
      <div class="form">
        <label class="field">
          <span class="field__label">Новое название</span>
          <input class="input" id="rvName" type="text" value="${escapeHtml(v.name)}" />
        </label>
        <div class="hint"><span class="dot"></span>Название меняется только в реестре. Данные не трогаются.</div>
      </div>
    `,
    footHTML: `
      <button class="btn btn--ghost" data-close="1">Отмена</button>
      <button class="btn btn--primary" id="rvOk">Сохранить</button>
    `,
    onMount: () => {
      qs("#rvOk").addEventListener("click", () => {
        const name = (qs("#rvName").value || "").trim();
        if (!name){
          toast("Укажи название");
          return;
        }
        v.name = name;
        v.updatedAt = nowISO();
        saveVaults(vaults);

        renderVaultSelectDropdown();

        if (state.unlocked && state.vaultId === v.id){
          activeVaultTitle.textContent = v.name;
          activeVaultSub.textContent = `ID: ${v.id}`;
        }

        closeModal();
        toast("Переименовано");
      });
    }
  });
}

async function deleteSelectedVault(){
  const vaults = loadVaults();
  const v = vaults.find(x => x.id === selectedVaultId);
  if (!v) return;

  const ok = await confirmModal({
    title: "Удалить хранилище?",
    text: `Будет удалено: "${v.name}". Данные (зашифрованный blob) исчезнут с этого устройства.`,
    okText: "Удалить",
    danger: true
  });
  if (!ok) return;

  localStorage.removeItem(blobKey(v.id));
  const nextVaults = vaults.filter(x => x.id !== v.id);
  saveVaults(nextVaults);

  if (getActiveVaultId() === v.id) setActiveVaultId(nextVaults[0]?.id || "");
  selectedVaultId = nextVaults[0]?.id || null;

  renderVaultSelectDropdown();
  toast("Удалено");
}

// ---------- GitHub sync (один cfg + файл на vault) ----------
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
  return !!(c?.token && c?.owner && c?.repo && c?.branch && c?.baseDir);
}
function ghApiHeaders(token){
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`
  };
}
function ghPathForVault(cfg, vaultId){
  const safeId = String(vaultId).replace(/[^\w\-]/g, "_");
  const base = String(cfg.baseDir || "data/vaults").replace(/\/+$/,"");
  return `${base}/${safeId}.json`;
}
async function ghGetFile(cfg, path){
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, { headers: ghApiHeaders(cfg.token) });
  if (res.status === 404) return { exists:false, json:null, sha:null };
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  const data = await res.json();
  const text = atob((data.content || "").replace(/\n/g,""));
  const json = JSON.parse(text);
  return { exists:true, json, sha:data.sha };
}
async function ghPutFile(cfg, path, json, sha){
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
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

async function githubPushCurrent(){
  if (!state.vaultId) throw new Error("Нет активного хранилища");
  const cfg = ghLoadCfg();
  if (!cfg) throw new Error("GitHub не настроен");

  setStatus("GitHub: отправка…");
  const blob = await saveVaultData();

  const path = ghPathForVault(cfg, state.vaultId);
  const remote = await ghGetFile(cfg, path);
  await ghPutFile(cfg, path, blob, remote.sha || undefined);

  setStatus(`GitHub: отправлено ✅ (${path})`);
  toast("GitHub: отправлено");
}

async function githubPullToCurrent(){
  if (!state.vaultId) throw new Error("Нет активного хранилища");
  const cfg = ghLoadCfg();
  if (!cfg) throw new Error("GitHub не настроен");

  setStatus("GitHub: загрузка…");
  const path = ghPathForVault(cfg, state.vaultId);
  const remote = await ghGetFile(cfg, path);

  if (!remote.exists){
    setStatus("GitHub: файла нет");
    toast("На GitHub нет файла для этого хранилища. Сначала Push.");
    return;
  }

  saveBlob(state.vaultId, remote.json);
  lockHard(`Загружено с GitHub (${path}). Введите пароль.`);
}

function openGithubModal(){
  const cur = ghLoadCfg() || {
    token: "",
    owner: "mantrova-studio",
    repo: "vault",
    branch: "main",
    baseDir: "data/vaults"
  };

  openModal({
    title: "GitHub синхронизация",
    bodyHTML: `
      <div class="hint" style="margin-bottom:12px">
        <span class="dot"></span>
        На GitHub сохраняется только зашифрованный blob. Для каждого хранилища — свой файл.
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
            <span class="field__label">Base dir (в репо)</span>
            <input class="input" id="ghBaseDir" type="text" value="${escapeHtml(cur.baseDir)}" />
          </label>
        </div>

        <div class="hint">
          <span class="dot"></span>
          Файл текущего хранилища будет: <span style="font-family:ui-monospace,monospace">${escapeHtml(cur.baseDir)}/&lt;vaultId&gt;.json</span>
        </div>
      </div>
    `,
    footHTML: `
      <button class="btn btn--ghost" data-close="1">Закрыть</button>
      <button class="btn btn--ghost" id="ghPull">Pull</button>
      <button class="btn btn--primary" id="ghPush">Push</button>
      <button class="btn btn--danger" id="ghForget">Забыть</button>
    `,
    onMount: () => {
      const getCfg = () => ({
        token: (qs("#ghToken").value || "").trim(),
        owner: (qs("#ghOwner").value || "").trim(),
        repo: (qs("#ghRepo").value || "").trim(),
        branch: (qs("#ghBranch").value || "main").trim(),
        baseDir: (qs("#ghBaseDir").value || "data/vaults").trim()
      });

      qs("#ghPush").addEventListener("click", async () => {
        try{
          ghSaveCfg(getCfg());
          await githubPushCurrent();
          closeModal();
        }catch(e){
          toast("Ошибка GitHub Push");
          setStatus(String(e?.message || e));
        }
      });

      qs("#ghPull").addEventListener("click", async () => {
        try{
          ghSaveCfg(getCfg());
          await githubPullToCurrent();
          closeModal();
        }catch(e){
          toast("Ошибка GitHub Pull");
          setStatus(String(e?.message || e));
        }
      });

      qs("#ghForget").addEventListener("click", async () => {
        const ok = await confirmModal({
          title: "Удалить настройки GitHub?",
          text: "Токен и параметры репозитория будут удалены с этого устройства.",
          okText: "Удалить",
          danger: true
        });
        if (!ok) return;
        localStorage.removeItem(LS.GH);
        toast("GitHub настройки удалены");
        closeModal();
      });
    }
  });
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
  state.items = Array.isArray(payload.items) ? payload.items : [];
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

  setStatus(ghHasCfg() ? "GitHub настроен" : "GitHub не настроен");
}

// ---------- Export/Import per active vault ----------
function exportCurrentVault(){
  if (!state.vaultId) return;
  const blob = loadBlob(state.vaultId);
  if (!blob) { toast("Нечего экспортировать"); return; }

  const data = JSON.stringify(blob, null, 2);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type:"application/json" }));
  a.download = `vault-${state.vaultId}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importToCurrentVault(file){
  if (!state.vaultId) return;

  const text = await file.text();
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== "object" || !obj.salt || !obj.iv || !obj.data){
    toast("Неверный файл");
    return;
  }
  saveBlob(state.vaultId, obj);
  lockHard("Импортировано. Введите пароль этого хранилища.");
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
renameVaultBtn.addEventListener("click", openRenameVaultModal);
deleteVaultBtn.addEventListener("click", deleteSelectedVault);

toggleLoginPass.addEventListener("click", () => {
  const isPass = passwordInput.type === "password";
  passwordInput.type = isPass ? "text" : "password";
  toggleLoginPass.setAttribute("aria-label", isPass ? "Скрыть пароль" : "Показать пароль");
  toggleLoginPass.title = isPass ? "Скрыть пароль" : "Показать пароль";
});

lockBtn.addEventListener("click", () => lockHard("Заблокировано"));
syncBtn.addEventListener("click", () => openGithubModal());

searchInput.addEventListener("input", renderList);

newBtn.addEventListener("click", () => {
  const it = {
    id: nid(),
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
  if (!it) { toast("Сначала создай запись"); return; }

  it.title = (titleInput.value || "").trim() || "Без названия";
  it.type  = (typeInput.value || "").trim() || "Без типа";
  it.body  = bodyInput.value || "";
  it.updatedAt = nowISO();

  try{
    await saveVaultData();
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
    await saveVaultData();
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

exportBtn.addEventListener("click", exportCurrentVault);

importFile.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try{
    await importToCurrentVault(file);
  }catch{
    toast("Ошибка импорта");
  }finally{
    importFile.value = "";
  }
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