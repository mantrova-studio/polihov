// Vault — local encrypted notes for GitHub Pages
// Данные: localStorage. Шифрование: AES-GCM. Ключ: PBKDF2 из пароля.

const qs = (s, el = document) => el.querySelector(s);

const loginView = qs("#loginView");
const appView = qs("#appView");

const loginForm = qs("#loginForm");
const passwordInput = qs("#passwordInput");
const rememberCheck = qs("#rememberCheck");
const initBtn = qs("#initBtn");
const lockBtn = qs("#lockBtn");

const searchInput = qs("#searchInput");
const typeFilter = qs("#typeFilter");
const newBtn = qs("#newBtn");

const listEl = qs("#list");
const emptyState = qs("#emptyState");

const editForm = qs("#editForm");
const titleInput = qs("#titleInput");
const typeInput = qs("#typeInput");
const bodyInput = qs("#bodyInput");
const saveBtn = qs("#saveBtn");
const delBtn = qs("#delBtn");
const copyBtn = qs("#copyBtn");
const exportBtn = qs("#exportBtn");
const importFile = qs("#importFile");

const toastEl = qs("#toast");

const LS = {
  VAULT: "vault_blob_v1",         // {salt, iv, data} base64
  SESSION: "vault_session_v1",    // "1" if remember login (device)
  META: "vault_meta_v1"           // optional meta (version etc)
};

let state = {
  unlocked: false,
  key: null,           // CryptoKey
  items: [],           // [{id, type, title, body, updatedAt}]
  activeId: null
};

// ---------- Helpers ----------
function toast(msg){
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (toastEl.hidden = true), 2200);
}

function nowISO(){
  return new Date().toISOString();
}

function uid(){
  return "n_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function fmtDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  }catch{ return ""; }
}

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

// ---------- Crypto ----------
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
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 250000,
      hash: "SHA-256"
    },
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

// ---------- Storage format ----------
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
  // key already derived and stored in state.key
  const { iv, cipher } = await encryptJson(state.key, { items: state.items });

  saveBlob({
    v: 1,
    salt: b64FromBytes(salt),
    iv: b64FromBytes(iv),
    data: b64FromBytes(cipher)
  });
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

  saveBlob({
    v: 1,
    salt: b64FromBytes(salt),
    iv: b64FromBytes(iv),
    data: b64FromBytes(cipher)
  });
}

// ---------- UI ----------
function setLockedUI(locked){
  loginView.hidden = !locked;
  appView.hidden = locked;
  lockBtn.disabled = locked;
}

function badgeLabel(type){
  if (type === "password") return "Пароли";
  if (type === "work") return "Работа";
  if (type === "note") return "Заметки";
  return "Другое";
}

function renderList(){
  const q = (searchInput.value || "").trim().toLowerCase();
  const t = typeFilter.value;

  let items = [...state.items].sort((a,b) => (b.updatedAt||"").localeCompare(a.updatedAt||""));
  if (t !== "all") items = items.filter(x => (x.type || "note") === t);
  if (q) items = items.filter(x =>
    (x.title || "").toLowerCase().includes(q) ||
    (x.body || "").toLowerCase().includes(q)
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
      <div class="badge">${badgeLabel(it.type || "note")}</div>
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
    typeInput.value = "note";
    bodyInput.value = "";
    delBtn.disabled = true;
    copyBtn.disabled = true;
    return;
  }

  titleInput.value = it.title || "";
  typeInput.value = it.type || "note";
  bodyInput.value = it.body || "";
  delBtn.disabled = false;
  copyBtn.disabled = false;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ---------- Actions ----------
function lock(){
  state = { unlocked:false, key:null, items:[], activeId:null };
  localStorage.removeItem(LS.SESSION);
  setLockedUI(true);
  passwordInput.value = "";
  toast("Заблокировано");
}

function rememberSession(on){
  if (on) localStorage.setItem(LS.SESSION, "1");
  else localStorage.removeItem(LS.SESSION);
}

function isRemembered(){
  return localStorage.getItem(LS.SESSION) === "1";
}

// NOTE: чтобы “вход сохранялся”, мы НЕ храним пароль.
// Мы просто храним флаг, и держим vault “разблокированным” пока пользователь не нажмёт “Выйти”
// После перезагрузки страницы потребуется пароль (это безопаснее).
// Если хочешь именно “после F5 не просить пароль”, можно хранить ключ в sessionStorage,
// но тогда при закрытии вкладки слетит, а при F5 — останется.
function keepKeyInSession(){
  // minimal: persist a marker; actual key not stored (CryptoKey isn't serializable reliably)
  // We intentionally do NOT store derived key.
}

// ---------- Wire events ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pass = passwordInput.value;

  try{
    await unlockVault(pass);
    rememberSession(rememberCheck.checked);
    setLockedUI(false);
    renderList();
    renderEditor();
    toast("Открыто");
  }catch(err){
    toast("Неверный пароль или хранилище повреждено");
  }
});

initBtn.addEventListener("click", async () => {
  const pass = passwordInput.value;
  if (!pass || pass.length < 4){
    toast("Пароль слишком короткий");
    return;
  }
  // Создаём/перезаписываем vault
  await initNewVault(pass);
  rememberSession(rememberCheck.checked);
  setLockedUI(false);
  renderList();
  renderEditor();
  toast("Создано новое хранилище");
});

lockBtn.addEventListener("click", lock);

searchInput.addEventListener("input", renderList);
typeFilter.addEventListener("change", renderList);

newBtn.addEventListener("click", () => {
  const it = {
    id: uid(),
    type: "note",
    title: "Новая запись",
    body: "",
    createdAt: nowISO(),
    updatedAt: nowISO()
  };
  state.items.push(it);
  state.activeId = it.id;
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
  it.title = titleInput.value.trim() || "Без названия";
  it.type = typeInput.value;
  it.body = bodyInput.value || "";
  it.updatedAt = nowISO();

  try{
    await saveVault();
    renderList();
    toast("Сохранено");
  }catch{
    toast("Ошибка сохранения");
  }
});

delBtn.addEventListener("click", async () => {
  const it = state.items.find(x => x.id === state.activeId);
  if (!it) return;

  const ok = confirm("Удалить запись без возможности восстановления?");
  if (!ok) return;

  state.items = state.items.filter(x => x.id !== state.activeId);
  state.activeId = state.items[0]?.id ?? null;

  try{
    await saveVault();
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

  const text = `${it.title}\n\n${it.body || ""}`;
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

    // простая валидация формата
    if (!obj || typeof obj !== "object" || !obj.salt || !obj.iv || !obj.data){
      toast("Неверный файл");
      return;
    }

    saveBlob(obj);
    lock();
    toast("Импортировано. Введите пароль.");
  }catch{
    toast("Ошибка импорта");
  }finally{
    importFile.value = "";
  }
});

// ---------- Boot ----------
(function boot(){
  // Если vault нет — показываем вход и предлагаем создать
  setLockedUI(true);

  // “Запомнить” ставим по прошлому выбору
  rememberCheck.checked = isRemembered();

  // UX: если vault уже есть — кнопка “Новое хранилище” перезапишет его (это нормально, просто знай)
  if (!hasVault()){
    toast("Хранилища ещё нет — введи пароль и нажми «Новое хранилище»");
  }
})();