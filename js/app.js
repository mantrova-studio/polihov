// ====== SETTINGS (GitHub) ======
const APP_KEY = "tsc_piggy_v2_cache";

const GITHUB_OWNER = "mantrova-studio";
const GITHUB_REPO  = "polihov";
const GITHUB_PATH  = "data/piggy.json"; // файл с копилками

// ====== Token storage ======
const TOKEN_SESSION_KEY = "tsc_piggy_github_token_session_v1";
const TOKEN_LOCAL_KEY   = "tsc_piggy_github_token_local_v1";

// ====== DOM ======
const grid = document.getElementById("grid");
const empty = document.getElementById("empty");

const createBtn = document.getElementById("createBtn");
const depositBtn = document.getElementById("depositBtn");
const withdrawBtn = document.getElementById("withdrawBtn");

const loadGithubBtn = document.getElementById("loadGithubBtn");
const saveGithubBtn = document.getElementById("saveGithubBtn");

const orderBtn = document.getElementById("orderBtn");
const orderIconEdit = document.getElementById("orderIconEdit");
const orderIconDone = document.getElementById("orderIconDone");

// show/hide card actions
const actionsBtn = document.getElementById("actionsBtn");
const actionsIconEdit = document.getElementById("actionsIconEdit");
const actionsIconDone = document.getElementById("actionsIconDone");

const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");

// modal
const modalWrap = document.getElementById("modalWrap");
const modalTitle = document.getElementById("modalTitle");
const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");

const createForm = document.getElementById("createForm");
const opForm = document.getElementById("opForm");
const opHint = document.getElementById("opHint");

const f_name = document.getElementById("f_name");
const f_goal = document.getElementById("f_goal");
const f_start = document.getElementById("f_start");

const f_bank = document.getElementById("f_bank");
const f_amount = document.getElementById("f_amount");

// token modal DOM (from HTML)
const tokenWrap = document.getElementById("tokenWrap");
const tokenClose = document.getElementById("tokenClose");
const tokenCancel = document.getElementById("tokenCancel");
const tokenTest = document.getElementById("tokenTest");
const tokenOk = document.getElementById("tokenOk");
const tokenInput = document.getElementById("tokenInput");
const tokenRemember = document.getElementById("tokenRemember");
const tokenError = document.getElementById("tokenError");

// toast DOM
const toastWrap = document.getElementById("toastWrap");
const toastIcon = document.getElementById("toastIcon");
const toastTitle = document.getElementById("toastTitle");
const toastMsg = document.getElementById("toastMsg");
const toastClose = document.getElementById("toastClose");

// ====== STATE ======
let banks = [];
let filtered = [];
let query = "";

let modalMode = null; // "create" | "deposit" | "withdraw" | "edit"
let editingId = null;

// reorder mode
let reorderMode = false;
let sortable = null;

// actions mode
let actionsMode = false;

// ====== icons ======
const ICON_SAVE_NORMAL = `
  <svg viewBox="0 0 24 24">
    <path d="M20 17.5a4.5 4.5 0 0 0-3.5-7.4 5.5 5.5 0 0 0-10.6 1.5A4 4 0 0 0 6 19h13a3 3 0 0 0 1-1.5z"/>
  </svg>
`;
const ICON_CLOCK = `
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9"/>
    <line x1="12" y1="7" x2="12" y2="12"/>
    <line x1="12" y1="12" x2="16" y2="14"/>
  </svg>
`;
const ICON_CHECK = `
  <svg viewBox="0 0 24 24">
    <line x1="20" y1="6" x2="9" y2="17"/>
    <line x1="9" y1="17" x2="4" y2="12"/>
  </svg>
`;
const TOAST_ICONS = {
  info: `
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="10" x2="12" y2="16"/>
      <line x1="12" y1="7" x2="12.01" y2="7"/>
    </svg>`,
  ok: ICON_CHECK,
  warn: `
    <svg viewBox="0 0 24 24">
      <path d="M10.3 4.6L2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`,
  err: `
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`
};

function setSaveBtnState(state){
  if(!saveGithubBtn) return;
  if(state === "saving"){
    saveGithubBtn.innerHTML = ICON_CLOCK;
    saveGithubBtn.disabled = true;
    return;
  }
  if(state === "done"){
    saveGithubBtn.innerHTML = ICON_CHECK;
    saveGithubBtn.disabled = false;
    return;
  }
  saveGithubBtn.innerHTML = ICON_SAVE_NORMAL;
  saveGithubBtn.disabled = false;
}

// ====== toast ======
let toastTmr = null;

function showToast({ type="info", title="Сообщение", message="", ms=2600 } = {}){
  if(!toastWrap) { alert(`${title}\n\n${message}`); return; }

  toastIcon.innerHTML = TOAST_ICONS[type] || TOAST_ICONS.info;
  toastTitle.textContent = title;
  toastMsg.textContent = message;

  toastWrap.classList.add("open");
  toastWrap.setAttribute("aria-hidden","false");

  if(toastTmr) clearTimeout(toastTmr);
  toastTmr = setTimeout(hideToast, ms);
}

function hideToast(){
  if(!toastWrap) return;
  toastWrap.classList.remove("open");
  toastWrap.setAttribute("aria-hidden","true");
  if(toastTmr) clearTimeout(toastTmr);
  toastTmr = null;
}

toastClose?.addEventListener("click", hideToast);
toastWrap?.addEventListener("click", (e)=>{ if(e.target === toastWrap) hideToast(); });

// ====== helpers ======
function escapeHtml(str){
  return (str ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function money(n){
  const v = Number(n || 0);
  return new Intl.NumberFormat("ru-RU").format(Math.round(v));
}

function norm(s){ return (s ?? "").toString().trim().toLowerCase(); }

function slug(s){
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replaceAll("ё","е")
    .replace(/[^a-z0-9а-я]/g,"-")
    .replace(/-+/g,"-")
    .replace(/^-|-$/g,"");
}

function uniqueId(base){
  const ids = new Set(banks.map(b => b.id));
  let id = base || "bank";
  let n = 2;
  while(ids.has(id)) id = `${base}-${n++}`;
  return id;
}

function parseNum(val){
  const s = (val ?? "").toString().replace(/\s/g,"").replace(",",".");
  const n = Number(s);
  if(!Number.isFinite(n)) return null;
  return n;
}

function setSelectBanks(){
  f_bank.innerHTML = "";
  for(const b of banks){
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.name;
    f_bank.appendChild(opt);
  }
}

function loadCache(){
  try{
    const raw = localStorage.getItem(APP_KEY);
    if(!raw) return false;
    const data = JSON.parse(raw);
    if(!Array.isArray(data?.banks)) return false;
    banks = normalizeBanks(data.banks);
    return true;
  }catch{
    return false;
  }
}

function saveCache(){
  localStorage.setItem(APP_KEY, JSON.stringify({ banks }, null, 2));
}

function normalizeBanks(list){
  const arr = Array.isArray(list) ? list : [];
  const map = new Map();
  for(const x of arr){
    if(!x) continue;
    const id = String(x.id || "").trim();
    const name = String(x.name || "").trim();
    if(!id || !name) continue;
    map.set(id, {
      id,
      name,
      goal: (x.goal === null || x.goal === "" || x.goal === undefined) ? null : Number(x.goal),
      balance: Number(x.balance || 0),
      createdAt: Number(x.createdAt || 0) || null,
      order: Number(x.order || 0) || null
    });
  }
  return Array.from(map.values());
}

function ensureOrderFields(){
  const now = Date.now();
  let changed = false;
  banks = banks.map((b, i) => {
    const createdAt = b.createdAt ?? (now - i);
    const order = b.order ?? createdAt;
    if(b.createdAt == null || b.order == null) changed = true;
    return { ...b, createdAt, order };
  });
  if(changed) saveCache();
}

// ====== GitHub API ======
function toBase64Utf8(str){
  return btoa(unescape(encodeURIComponent(str)));
}

function ghHeaders(token){
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function githubGetFile(token){
  const api = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;

  const res = await fetch(api, { headers: ghHeaders(token) });

  if(!res.ok){
    const t = await res.text();
    throw new Error("GitHub read failed: " + t);
  }

  const json = await res.json();
  const content = decodeURIComponent(escape(atob((json.content || "").replace(/\n/g,""))));
  return { data: JSON.parse(content), sha: json.sha };
}

async function githubPutFile(newData, sha, token){
  const api = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
  const jsonText = JSON.stringify(newData, null, 2);

  const body = {
    message: "Update piggy.json via web",
    content: toBase64Utf8(jsonText),
    sha
  };

  const res = await fetch(api, {
    method: "PUT",
    headers: {
      ...ghHeaders(token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if(!res.ok){
    const t = await res.text();
    throw new Error("GitHub save failed: " + t);
  }

  return await res.json();
}

async function pagesGetFile(){
  const url = `${GITHUB_PATH}?v=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) return null;
  return await res.json();
}

// ====== autoload (Pages -> Cache) ======
async function autoLoadState(){
  try{
    const pages = await pagesGetFile();
    if(pages && typeof pages === "object" && Array.isArray(pages.banks)){
      banks = normalizeBanks(pages.banks);
      ensureOrderFields();
      saveCache();
      return { from: "pages" };
    }
  }catch{}

  const ok = loadCache();
  ensureOrderFields();
  return { from: ok ? "cache" : "empty" };
}

// ====== token modal logic (uses your HTML modal) ======
function getSavedToken(){
  return sessionStorage.getItem(TOKEN_SESSION_KEY)
    || localStorage.getItem(TOKEN_LOCAL_KEY)
    || "";
}

function saveToken(token, remember){
  if(remember){
    localStorage.setItem(TOKEN_LOCAL_KEY, token);
    sessionStorage.removeItem(TOKEN_SESSION_KEY);
  }else{
    sessionStorage.setItem(TOKEN_SESSION_KEY, token);
    localStorage.removeItem(TOKEN_LOCAL_KEY);
  }
}

function clearSavedToken(){
  sessionStorage.removeItem(TOKEN_SESSION_KEY);
  localStorage.removeItem(TOKEN_LOCAL_KEY);
}

function tokenSetMessage(msg, ok=false){
  if(!tokenError) return;
  tokenError.textContent = msg || "";
  tokenError.style.display = msg ? "block" : "none";
  tokenError.classList.toggle("ok", !!ok);
}

function openTokenModal({ prefill="" } = {}){
  if(!tokenWrap) return;

  tokenWrap.classList.add("open");
  tokenWrap.setAttribute("aria-hidden","false");

  tokenSetMessage("", false);

  const saved = getSavedToken();
  tokenInput.value = prefill || saved || "";
  tokenRemember.checked = !!localStorage.getItem(TOKEN_LOCAL_KEY);

  setTimeout(()=> tokenInput.focus(), 60);
}

function closeTokenModal(){
  if(!tokenWrap) return;
  tokenWrap.classList.remove("open");
  tokenWrap.setAttribute("aria-hidden","true");
}

tokenClose?.addEventListener("click", closeTokenModal);
tokenCancel?.addEventListener("click", closeTokenModal);
tokenWrap?.addEventListener("click", (e)=>{ if(e.target === tokenWrap) closeTokenModal(); });

document.addEventListener("keydown", (e)=>{
  if(e.key === "Escape" && tokenWrap?.classList.contains("open")) closeTokenModal();
});

tokenTest?.addEventListener("click", async ()=>{
  try{
    const token = (tokenInput.value || "").trim();
    if(!token){
      tokenSetMessage("Вставь токен для проверки.", false);
      return;
    }
    tokenSetMessage("Проверяю...", true);
    await githubGetFile(token);
    tokenSetMessage("Токен ОК ✅ Есть доступ к файлу.", true);
  }catch(e){
    tokenSetMessage("Токен не подошёл ❌\n\n" + (e?.message || ""), false);
  }
});

function askTokenOnce(){
  return new Promise((resolve)=>{
    openTokenModal();

    const onOk = ()=>{
      const token = (tokenInput.value || "").trim();
      if(!token){
        tokenSetMessage("Вставь токен.", false);
        return;
      }
      saveToken(token, !!tokenRemember.checked);
      closeTokenModal();
      cleanup();
      resolve(token);
    };

    const onCancel = ()=>{
      closeTokenModal();
      cleanup();
      resolve(null);
    };

    const onKey = (e)=>{
      if(!tokenWrap.classList.contains("open")) return;
      if(e.key === "Enter") onOk();
    };

    const cleanup = ()=>{
      tokenOk?.removeEventListener("click", onOk);
      tokenCancel?.removeEventListener("click", onCancel);
      tokenClose?.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onKey);
    };

    tokenOk?.addEventListener("click", onOk);
    tokenCancel?.addEventListener("click", onCancel);
    tokenClose?.addEventListener("click", onCancel);
    document.addEventListener("keydown", onKey);
  });
}

async function ensureValidToken(){
  const saved = getSavedToken();
  if(saved){
    try{
      await githubGetFile(saved);
      return saved;
    }catch{
      clearSavedToken();
    }
  }

  // ask until ok or cancel
  while(true){
    const token = await askTokenOnce();
    if(!token) return null;

    try{
      await githubGetFile(token);
      return token;
    }catch(e){
      tokenSetMessage("Токен не подошёл ❌\n\n" + (e?.message || ""), false);
      openTokenModal({ prefill: token });
      // ждём снова
    }
  }
}

// ====== UI (main modal) ======
function openModal(title){
  modalTitle.textContent = title;
  modalWrap.classList.add("open");
  modalWrap.setAttribute("aria-hidden","false");
}
function closeModalFn(){
  modalWrap.classList.remove("open");
  modalWrap.setAttribute("aria-hidden","true");
}

closeModal?.addEventListener("click", closeModalFn);
cancelBtn?.addEventListener("click", closeModalFn);
modalWrap?.addEventListener("click", (e)=>{ if(e.target === modalWrap) closeModalFn(); });

// ====== show/hide actions ======
function setActionsMode(on){
  actionsMode = !!on;
  document.body.classList.toggle("actionsOn", actionsMode);

  if(actionsIconEdit && actionsIconDone){
    actionsIconEdit.style.display = actionsMode ? "none" : "block";
    actionsIconDone.style.display = actionsMode ? "block" : "none";
  }
}
actionsBtn?.addEventListener("click", ()=> setActionsMode(!actionsMode));

// ====== reorder mode ======
function enableReorder(){
  if(sortable || !window.Sortable) return;

  document.body.classList.add("reorderOn");

  sortable = new Sortable(grid, {
    animation: 180,
    ghostClass: "dragGhost",
    onEnd: () => {
      const cards = [...grid.children];
      const base = Date.now();
      const total = cards.length;

      cards.forEach((card, idx) => {
        const id = card.dataset.id;
        const b = banks.find(x => x.id === id);
        if(b) b.order = base + (total - idx);
      });

      saveCache();
    }
  });
}

function disableReorder(){
  if(!sortable) {
    document.body.classList.remove("reorderOn");
    return;
  }
  sortable.destroy();
  sortable = null;
  document.body.classList.remove("reorderOn");
}

// ====== render ======
function applyFilter(){
  banks.sort((a,b) => (b.order ?? 0) - (a.order ?? 0));
  const q = norm(query);
  filtered = banks.filter(b => !q || norm(b.name).includes(q));
  renderList();
}

function renderList(){
  grid.innerHTML = "";
  if(!filtered.length){
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  for(const b of filtered){
    const goal = (b.goal && b.goal > 0) ? b.goal : null;
    const pct = goal ? Math.max(0, Math.min(100, (b.balance / goal) * 100)) : 0;

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = b.id;

    card.innerHTML = `
      <div class="cardTop">
        <div>
          <div class="cardTitle">${escapeHtml(b.name)}</div>
          <div class="cardMeta">${goal ? `Цель: ${money(goal)} ₽` : `Без цели`}</div>
        </div>
        <div class="goal">${goal ? `${Math.round(pct)}%` : ""}</div>
      </div>

      <div class="progressWrap" style="${goal ? "" : "opacity:.35"}">
        <div class="progressBar" style="width:${goal ? pct.toFixed(1) : 0}%"></div>
      </div>

      <div class="cardBottom">
        <div class="amount">${money(b.balance)} ₽</div>
        <div class="goal">${goal ? `Осталось: ${money(Math.max(0, goal - b.balance))} ₽` : ""}</div>
      </div>

      <div class="cardActions">
        <button class="btn small primary" data-act="deposit">Пополнить</button>
        <button class="btn small danger" data-act="withdraw">Вывести</button>
        <button class="btn small" data-act="edit">Изменить</button>
        <button class="btn small" data-act="delete">Удалить</button>
      </div>
    `;

    card.querySelector('[data-act="deposit"]').addEventListener("click", ()=>openOp("deposit", b.id));
    card.querySelector('[data-act="withdraw"]').addEventListener("click", ()=>openOp("withdraw", b.id));
    card.querySelector('[data-act="edit"]').addEventListener("click", ()=>openEdit(b.id));
    card.querySelector('[data-act="delete"]').addEventListener("click", ()=>deleteBank(b.id));

    grid.appendChild(card);
  }

  if(reorderMode) enableReorder();
}

function render(){ applyFilter(); }

// ====== actions ======
function openCreate(){
  modalMode = "create";
  editingId = null;
  createForm.style.display = "block";
  opForm.style.display = "none";
  f_name.value = "";
  f_goal.value = "";
  f_start.value = "";
  openModal("Создать копилку");
}

function openEdit(id){
  const b = banks.find(x => x.id === id);
  if(!b) return;

  modalMode = "edit";
  editingId = id;

  createForm.style.display = "block";
  opForm.style.display = "none";

  f_name.value = b.name;
  f_goal.value = (b.goal && b.goal > 0) ? String(Math.round(b.goal)) : "";
  f_start.value = String(Math.round(b.balance));

  openModal("Изменить копилку");
}

function openOp(type, id=null){
  modalMode = type;
  createForm.style.display = "none";
  opForm.style.display = "block";

  setSelectBanks();
  if(id) f_bank.value = id;

  f_amount.value = "";
  opHint.textContent = (type === "deposit")
    ? "Сумма будет добавлена к балансу."
    : "Сумма будет вычтена (не уйдёт в минус).";

  openModal(type === "deposit" ? "Пополнить" : "Вывести");
  setTimeout(()=>f_amount.focus(), 60);
}

function deleteBank(id){
  const b = banks.find(x => x.id === id);
  if(!b) return;
  if(!confirm(`Удалить копилку "${b.name}"?`)) return;
  banks = banks.filter(x => x.id !== id);
  saveCache();
  render();
}

function saveFromModal(){
  if(modalMode === "create" || modalMode === "edit"){
    const name = (f_name.value || "").trim();
    const goalRaw = (f_goal.value || "").trim();
    const startRaw = (f_start.value || "").trim();

    if(!name){ showToast({ type:"warn", title:"Проверь", message:"Введите название копилки." }); return; }

    const goal = goalRaw ? parseNum(goalRaw) : null;
    if(goalRaw && (goal === null || goal <= 0)){
      showToast({ type:"warn", title:"Проверь", message:"Цель должна быть числом больше 0, либо оставьте пустым." });
      return;
    }

    const start = startRaw ? parseNum(startRaw) : 0;
    if(start === null || start < 0){
      showToast({ type:"warn", title:"Проверь", message:"Стартовая сумма должна быть числом 0 или больше." });
      return;
    }

    if(modalMode === "create"){
      const id = uniqueId(slug(name) || "bank");
      const now = Date.now();
      banks.unshift({ id, name, goal: goal ?? null, balance: start, createdAt: now, order: now });
    }else{
      const b = banks.find(x => x.id === editingId);
      if(!b) return;
      b.name = name;
      b.goal = goal ?? null;
      b.balance = start;
    }

    saveCache();
    closeModalFn();
    render();
    return;
  }

  if(modalMode === "deposit" || modalMode === "withdraw"){
    if(!banks.length){
      showToast({ type:"warn", title:"Нет копилок", message:"Сначала создай копилку." });
      return;
    }

    const id = f_bank.value;
    const amt = parseNum(f_amount.value);

    if(!id){ showToast({ type:"warn", title:"Проверь", message:"Выберите копилку." }); return; }
    if(amt === null || amt <= 0){ showToast({ type:"warn", title:"Проверь", message:"Введите сумму больше 0." }); return; }

    const b = banks.find(x => x.id === id);
    if(!b) return;

    if(modalMode === "deposit") b.balance += amt;
    else b.balance = Math.max(0, b.balance - amt);

    saveCache();
    closeModalFn();
    render();
    return;
  }
}

saveBtn?.addEventListener("click", saveFromModal);

createBtn?.addEventListener("click", openCreate);
depositBtn?.addEventListener("click", ()=>{
  if(!banks.length){ openCreate(); return; }
  openOp("deposit");
});
withdrawBtn?.addEventListener("click", ()=>{
  if(!banks.length){ openCreate(); return; }
  openOp("withdraw");
});

// ====== search ======
if(clearSearch) clearSearch.style.display = "none";
function syncClear(){ if(clearSearch) clearSearch.style.display = searchInput?.value ? "block" : "none"; }

searchInput?.addEventListener("input", ()=>{
  query = searchInput.value;
  syncClear();
  render();
});
clearSearch?.addEventListener("click", ()=>{
  searchInput.value = "";
  query = "";
  syncClear();
  render();
  searchInput.focus();
});
syncClear();

// ====== GitHub buttons ======
loadGithubBtn?.addEventListener("click", async ()=>{
  try{
    loadGithubBtn.disabled = true;
    loadGithubBtn.textContent = "Загружаю...";

    const pages = await pagesGetFile();
    if(pages && Array.isArray(pages.banks)){
      banks = normalizeBanks(pages.banks);
      ensureOrderFields();
      saveCache();
      render();
      showToast({ type:"ok", title:"Загружено", message:"Данные взяты из GitHub Pages." });
      return;
    }

    const ok = loadCache();
    ensureOrderFields();
    render();
    showToast({
      type: ok ? "info" : "warn",
      title:"Pages пусто",
      message: ok ? "Показал локальный кеш." : "На Pages пусто и кеш пустой."
    });
  }catch(e){
    console.error(e);
    showToast({ type:"err", title:"Ошибка загрузки", message: e?.message || "Не удалось загрузить." });
  }finally{
    loadGithubBtn.disabled = false;
    loadGithubBtn.textContent = "Загрузить из GitHub";
  }
});

saveGithubBtn?.addEventListener("click", async ()=>{
  try{
    setSaveBtnState("saving");

    const token = await ensureValidToken();
    if(!token){
      setSaveBtnState("normal");
      showToast({ type:"info", title:"Отменено", message:"Сохранение отменено." });
      return;
    }

    const cur = await githubGetFile(token);
    await githubPutFile({ banks }, cur.sha, token);

    setSaveBtnState("done");
    showToast({
      type:"ok",
      title:"Сохранено",
      message:"Данные сохранены в GitHub.\nPages может обновляться 10–60 секунд.",
      ms: 3200
    });

    setTimeout(()=> setSaveBtnState("normal"), 1200);
  }catch(e){
    console.error(e);
    setSaveBtnState("normal");
    showToast({ type:"err", title:"Ошибка сохранения", message: e?.message || "Не удалось сохранить." , ms: 4500});
  }
});

// ====== Order button ======
orderBtn?.addEventListener("click", ()=>{
  reorderMode = !reorderMode;

  if(reorderMode){
    enableReorder();
    if(orderIconEdit) orderIconEdit.style.display = "none";
    if(orderIconDone) orderIconDone.style.display = "block";
    showToast({ type:"info", title:"Порядок", message:"Перетаскивай карточки, чтобы поменять порядок." });
  }else{
    disableReorder();
    render();
    if(orderIconEdit) orderIconEdit.style.display = "block";
    if(orderIconDone) orderIconDone.style.display = "none";
    showToast({ type:"ok", title:"Готово", message:"Порядок сохранён локально." });
  }
});

// ====== init ======
(async function init(){
  // init save icon state (in case HTML differs)
  setSaveBtnState("normal");

  await autoLoadState();

  // default: actions hidden
  setActionsMode(false);

  render();
})();
