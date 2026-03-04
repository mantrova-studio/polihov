// ====== SETTINGS (GitHub) ====== 
const APP_KEY = "tsc_piggy_v2_cache";

const GITHUB_OWNER = "mantrova-studio";
const GITHUB_REPO  = "polihov";
const GITHUB_PATH  = "bank/data/piggy.json"; // файл с копилками

// Для чтения без токена через GitHub Pages (другие устройства/инкогнито)
// Берём URL относительно текущей страницы, чтобы не получить /bank/bank/...
const PAGES_PATH   = "data/piggy.json";

// ===== Login gate =====
const APP_PASSWORD = "12344321"; // ← поменяй
const AUTH_KEY = "tsc_piggy_auth_v1";

// DOM login
const loginWrap = document.getElementById("loginWrap");
const loginInput = document.getElementById("loginPass");
const loginBtn = document.getElementById("loginBtn");
const loginErr = document.getElementById("loginErr");

// DOM app
const appWrap = document.getElementById("appWrap");
const toastEl = document.getElementById("toast");

// UI
const elBanksList = document.getElementById("banksList");
const elEmpty = document.getElementById("emptyState");

const elModal = document.getElementById("modal");
const elModalTitle = document.getElementById("modalTitle");
const elModalClose = document.getElementById("modalClose");
const elForm = document.getElementById("bankForm");

const inId = document.getElementById("bankId");
const inTitle = document.getElementById("bankTitle");
const inGoal = document.getElementById("bankGoal");
const inCurrency = document.getElementById("bankCurrency");
const inBalance = document.getElementById("bankBalance");
const inColor = document.getElementById("bankColor");
const inEmoji = document.getElementById("bankEmoji");
const inHidden = document.getElementById("bankHidden");

const btnNew = document.getElementById("btnNew");
const btnSaveGitHub = document.getElementById("btnSaveGitHub");
const btnExport = document.getElementById("btnExport");
const btnImport = document.getElementById("btnImport");

const elTokenModal = document.getElementById("tokenModal");
const elTokenClose = document.getElementById("tokenClose");
const inToken = document.getElementById("ghToken");
const btnTokenSave = document.getElementById("tokenSave");

// ====== State ======
let state = {
  banks: [],
  sha: null
};

let ghToken = "";

// ====== Utils ======
const qs = (s, el = document) => el.querySelector(s);

function toast(msg, ok = true){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.remove("ok","bad","show");
  toastEl.classList.add(ok ? "ok":"bad");
  toastEl.offsetHeight; // reflow
  toastEl.classList.add("show");
  setTimeout(()=> toastEl.classList.remove("show"), 2600);
}

function uid(){
  return "b_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function fmtMoney(n){
  const x = Number(n||0);
  return x.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function clamp01(x){
  x = Number(x||0);
  if(x < 0) return 0;
  if(x > 1) return 1;
  return x;
}

function percent(balance, goal){
  const b = Number(balance||0);
  const g = Number(goal||0);
  if(!g) return 0;
  return clamp01(b / g);
}

// ====== Storage (local) ======
function loadLocal(){
  try{
    const raw = localStorage.getItem(APP_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    return null;
  }
}

function saveLocal(data){
  localStorage.setItem(APP_KEY, JSON.stringify(data));
}

function clearLocal(){
  localStorage.removeItem(APP_KEY);
}

// ====== GitHub API helpers ======
function ghApiUrl(path){
  return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
}

async function githubGetFile(path, token){
  const url = ghApiUrl(path);
  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      ...(token ? { "Authorization": `token ${token}` } : {})
    }
  });
  if(!res.ok) throw new Error("GET failed: " + res.status);
  return await res.json();
}

async function githubPutFile(path, contentObj, sha, token, message){
  const url = ghApiUrl(path);
  const body = {
    message: message || "Update piggy banks",
    content: btoa(unescape(encodeURIComponent(JSON.stringify(contentObj, null, 2)))),
    sha
  };

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `token ${token}`
    },
    body: JSON.stringify(body)
  });

  if(!res.ok){
    const t = await res.text().catch(()=> "");
    throw new Error("PUT failed: " + res.status + " " + t);
  }
  return await res.json();
}

// ====== GitHub Pages read (no token) ======
async function pagesGetFile(){
  // Важно: не используем GITHUB_PATH тут, иначе на /bank/ получится /bank/bank/...
  const u = new URL(PAGES_PATH, window.location.href);
  u.searchParams.set("v", String(Date.now())); // cache-bust
  const res = await fetch(u.toString(), { cache: "no-store" });
  if(!res.ok) return null;
  return await res.json();
}

// ====== Auth ======
function isAuthed(){
  return localStorage.getItem(AUTH_KEY) === "1";
}

function setAuthed(v){
  if(v) localStorage.setItem(AUTH_KEY,"1");
  else localStorage.removeItem(AUTH_KEY);
}

function showLogin(){
  loginWrap?.classList.remove("hidden");
  appWrap?.classList.add("hidden");
}

function showApp(){
  loginWrap?.classList.add("hidden");
  appWrap?.classList.remove("hidden");
}

// ====== Modal ======
function openModal(title){
  elModalTitle.textContent = title;
  elModal.classList.add("show");
}

function closeModal(){
  elModal.classList.remove("show");
}

// Token modal
function openTokenModal(){
  elTokenModal.classList.add("show");
  inToken.value = ghToken || "";
  inToken.focus();
}

function closeTokenModal(){
  elTokenModal.classList.remove("show");
}

// ====== Render ======
function render(){
  const banks = (state.banks || []).slice();

  // Если есть hidden=true — скрываем из списка
  const visible = banks.filter(b => !b.hidden);

  elBanksList.innerHTML = "";
  if(!visible.length){
    elEmpty.classList.remove("hidden");
  }else{
    elEmpty.classList.add("hidden");
  }

  visible.forEach(b=>{
    const bal = Number(b.balance||0);
    const goal = Number(b.goal||0);

    const p = percent(bal, goal);
    const pText = Math.round(p * 100) + "%";

    const card = document.createElement("div");
    card.className = "bank";

    const top = document.createElement("div");
    top.className = "bank-top";

    const left = document.createElement("div");
    left.className = "bank-left";

    const emoji = document.createElement("div");
    emoji.className = "bank-emoji";
    emoji.textContent = b.emoji || "💰";
    emoji.style.background = b.color || "#222";

    const title = document.createElement("div");
    title.className = "bank-title";
    title.textContent = b.title || "Без названия";

    left.appendChild(emoji);
    left.appendChild(title);

    const right = document.createElement("div");
    right.className = "bank-actions";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn small";
    btnEdit.textContent = "✎";
    btnEdit.title = "Редактировать";
    btnEdit.onclick = ()=> editBank(b.id);

    const btnDel = document.createElement("button");
    btnDel.className = "btn small danger";
    btnDel.textContent = "🗑";
    btnDel.title = "Удалить";
    btnDel.onclick = ()=> removeBank(b.id);

    right.appendChild(btnEdit);
    right.appendChild(btnDel);

    top.appendChild(left);
    top.appendChild(right);

    const mid = document.createElement("div");
    mid.className = "bank-mid";

    const line1 = document.createElement("div");
    line1.className = "bank-line";
    line1.innerHTML = `
      <div class="muted">Накоплено</div>
      <div class="val">${fmtMoney(bal)} ${b.currency || "₽"}</div>
    `;

    const line2 = document.createElement("div");
    line2.className = "bank-line";
    line2.innerHTML = `
      <div class="muted">Цель</div>
      <div class="val">${fmtMoney(goal)} ${b.currency || "₽"}</div>
    `;

    mid.appendChild(line1);
    mid.appendChild(line2);

    const barWrap = document.createElement("div");
    barWrap.className = "bar";

    const bar = document.createElement("div");
    bar.className = "bar-fill";
    bar.style.width = (p*100).toFixed(2) + "%";
    bar.style.background = b.color || "#6ee7ff";
    barWrap.appendChild(bar);

    const bot = document.createElement("div");
    bot.className = "bank-bot";
    bot.innerHTML = `
      <div class="muted">${pText}</div>
      <div class="muted">${b.id}</div>
    `;

    card.appendChild(top);
    card.appendChild(mid);
    card.appendChild(barWrap);
    card.appendChild(bot);

    elBanksList.appendChild(card);
  });

  // persist
  saveLocal({ banks: state.banks, sha: state.sha });
}

// ====== CRUD ======
function resetForm(){
  inId.value = "";
  inTitle.value = "";
  inGoal.value = "";
  inCurrency.value = "₽";
  inBalance.value = "";
  inColor.value = "#6ee7ff";
  inEmoji.value = "💰";
  inHidden.checked = false;
}

function newBank(){
  resetForm();
  openModal("Новая копилка");
}

function editBank(id){
  const b = (state.banks||[]).find(x=> x.id === id);
  if(!b) return;
  inId.value = b.id;
  inTitle.value = b.title || "";
  inGoal.value = b.goal ?? "";
  inCurrency.value = b.currency || "₽";
  inBalance.value = b.balance ?? "";
  inColor.value = b.color || "#6ee7ff";
  inEmoji.value = b.emoji || "💰";
  inHidden.checked = !!b.hidden;
  openModal("Редактировать");
}

function removeBank(id){
  if(!confirm("Удалить копилку?")) return;
  state.banks = (state.banks||[]).filter(x=> x.id !== id);
  render();
  toast("Удалено", true);
}

function upsertFromForm(){
  const id = inId.value || uid();

  const b = {
    id,
    title: (inTitle.value || "").trim(),
    goal: Number(inGoal.value || 0),
    currency: (inCurrency.value || "₽").trim(),
    balance: Number(inBalance.value || 0),
    color: inColor.value || "#6ee7ff",
    emoji: (inEmoji.value || "💰").trim(),
    hidden: !!inHidden.checked
  };

  const list = state.banks || [];
  const idx = list.findIndex(x=> x.id === id);
  if(idx >= 0) list[idx] = b;
  else list.unshift(b);

  state.banks = list;
  render();
  closeModal();
  toast("Сохранено локально", true);
}

// ====== Import / Export ======
function exportJson(){
  const data = JSON.stringify({ banks: state.banks }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "piggy-export.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJsonFile(file){
  const fr = new FileReader();
  fr.onload = ()=>{
    try{
      const obj = JSON.parse(fr.result);
      if(obj && Array.isArray(obj.banks)){
        state.banks = obj.banks;
        render();
        toast("Импортировано", true);
      }else{
        toast("Неверный формат файла", false);
      }
    }catch(e){
      toast("Ошибка чтения JSON", false);
    }
  };
  fr.readAsText(file);
}

// ====== Auto load (Pages -> local fallback) ======
async function autoLoadState(){
  // 1) Пробуем загрузить с Pages (общие данные для всех устройств)
  const pages = await pagesGetFile();
  if(pages && Array.isArray(pages.banks)){
    state.banks = pages.banks;
    // sha тут неизвестна без GitHub API
    state.sha = null;
    render();
    toast("Загружено с GitHub Pages", true);
    return;
  }

  // 2) Фоллбек: localStorage
  const local = loadLocal();
  if(local && Array.isArray(local.banks)){
    state.banks = local.banks;
    state.sha = local.sha || null;
    render();
    toast("Загружено локально", true);
    return;
  }

  // 3) Пусто
  state.banks = [];
  state.sha = null;
  render();
}

// ====== Save to GitHub ======
async function saveToGitHub(){
  if(!ghToken){
    openTokenModal();
    return;
  }

  try{
    // Сначала получим текущий sha (если файла ещё нет — обработаем отдельно)
    let sha = null;

    try{
      const meta = await githubGetFile(GITHUB_PATH, ghToken);
      sha = meta.sha;
    }catch(e){
      // если 404 — файла нет, можно создавать
      sha = null;
    }

    const payload = { banks: state.banks };
    const result = await githubPutFile(GITHUB_PATH, payload, sha, ghToken, "Update piggy.json");
    state.sha = result.content?.sha || sha || null;

    // Сохраним токен локально (не в JSON)
    localStorage.setItem("tsc_piggy_gh_token", ghToken);

    render();
    toast("Сохранено в GitHub ✅", true);
  }catch(e){
    console.error(e);
    toast("Ошибка сохранения в GitHub", false);
  }
}

// ====== Init ======
function bindEvents(){
  // auth
  loginBtn?.addEventListener("click", ()=>{
    const v = (loginInput.value || "").trim();
    if(v === APP_PASSWORD){
      setAuthed(true);
      loginErr.textContent = "";
      showApp();
      autoLoadState();
    }else{
      loginErr.textContent = "Неверный пароль";
    }
  });

  loginInput?.addEventListener("keydown", (e)=>{
    if(e.key === "Enter") loginBtn.click();
  });

  // modal
  elModalClose?.addEventListener("click", closeModal);
  elModal?.addEventListener("click", (e)=>{
    if(e.target === elModal) closeModal();
  });

  elForm?.addEventListener("submit", (e)=>{
    e.preventDefault();
    upsertFromForm();
  });

  btnNew?.addEventListener("click", newBank);

  // token
  btnSaveGitHub?.addEventListener("click", saveToGitHub);

  elTokenClose?.addEventListener("click", closeTokenModal);
  elTokenModal?.addEventListener("click", (e)=>{
    if(e.target === elTokenModal) closeTokenModal();
  });

  btnTokenSave?.addEventListener("click", ()=>{
    ghToken = (inToken.value || "").trim();
    if(!ghToken){
      toast("Вставь token", false);
      return;
    }
    localStorage.setItem("tsc_piggy_gh_token", ghToken);
    closeTokenModal();
    toast("Token сохранён локально", true);
    // сразу пробуем сохранить
    saveToGitHub();
  });

  // export/import
  btnExport?.addEventListener("click", exportJson);

  btnImport?.addEventListener("click", ()=>{
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json";
    inp.onchange = ()=>{
      const f = inp.files?.[0];
      if(f) importJsonFile(f);
    };
    inp.click();
  });
}

(function init(){
  bindEvents();

  // token restore
  ghToken = localStorage.getItem("tsc_piggy_gh_token") || "";

  if(isAuthed()){
    showApp();
    autoLoadState();
  }else{
    showLogin();
  }
})();
