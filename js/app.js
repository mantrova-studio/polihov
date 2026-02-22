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

// ✅ кнопка “показать/скрыть кнопки на карточках”
const actionsBtn = document.getElementById("actionsBtn");
const actionsIconEdit = document.getElementById("actionsIconEdit");
const actionsIconDone = document.getElementById("actionsIconDone");

const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");

// modal (create/edit)
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

// token modal (у тебя уже есть в index.html)
const tokenWrap = document.getElementById("tokenWrap");
const tokenClose = document.getElementById("tokenClose");
const tokenCancel = document.getElementById("tokenCancel");
const tokenTest = document.getElementById("tokenTest");
const tokenOk = document.getElementById("tokenOk");
const tokenInput = document.getElementById("tokenInput");
const tokenRemember = document.getElementById("tokenRemember");
const tokenError = document.getElementById("tokenError");

// ====== STATE ======
let banks = [];
let filtered = [];
let query = "";

let modalMode = null; // "create" | "deposit" | "withdraw" | "edit"
let editingId = null;

// reorder mode
let reorderMode = false;
let sortable = null;

// actions mode (показывать кнопки на карточках)
let actionsMode = false;

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
  if(!f_bank) return;
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

// если у старых копилок нет order/createdAt — назначаем один раз
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

// ====== Toast (styled message) ======
function ensureToastOnce(){
  if(document.getElementById("tscToast")) return;

  const style = document.createElement("style");
  style.id = "tscToastStyle";
  style.textContent = `
    .tscToast{
      position: fixed;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%) translateY(20px);
      z-index: 99999;
      min-width: min(560px, calc(100% - 24px));
      background: rgba(18,26,42,.92);
      border: 1px solid rgba(43,58,85,.9);
      border-radius: 16px;
      box-shadow: 0 18px 60px rgba(0,0,0,.55);
      padding: 12px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0;
      pointer-events: none;
      transition: opacity .18s ease, transform .18s ease;
      backdrop-filter: blur(8px);
    }
    .tscToast.show{
      opacity: 1;
      transform: translateX(-50%) translateY(0);
      pointer-events: auto;
    }
    .tscToastIcon{
      width: 34px;
      height: 34px;
      border-radius: 12px;
      border: 1px solid rgba(43,58,85,.85);
      background: rgba(30,42,66,.75);
      display: grid;
      place-items: center;
      flex: 0 0 auto;
    }
    .tscToastIcon svg{
      width: 18px;
      height: 18px;
      stroke: white;
      stroke-width: 2;
      fill: none;
      opacity: .95;
    }
    .tscToastText{
      flex: 1 1 auto;
      color: rgba(255,255,255,.92);
      font-size: 13px;
      line-height: 1.35;
    }
    .tscToastClose{
      width: 34px;
      height: 34px;
      border-radius: 12px;
      border: 1px solid rgba(43,58,85,.85);
      background: rgba(30,42,66,.75);
      color: rgba(255,255,255,.85);
      display: grid;
      place-items: center;
      cursor: pointer;
      flex: 0 0 auto;
    }
    .tscToastClose:active{ transform: translateY(1px); }
  `;
  document.head.appendChild(style);

  const toast = document.createElement("div");
  toast.id = "tscToast";
  toast.className = "tscToast";
  toast.innerHTML = `
    <div class="tscToastIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <line x1="4"  y1="13" x2="9"  y2="18"></line>
        <line x1="9"  y1="18" x2="20" y2="7"></line>
      </svg>
    </div>
    <div class="tscToastText" id="tscToastText"></div>
    <button class="tscToastClose" id="tscToastClose" type="button" title="Закрыть">✕</button>
  `;
  document.body.appendChild(toast);

  document.getElementById("tscToastClose")?.addEventListener("click", ()=>{
    toast.classList.remove("show");
  });
}

let toastTimer = null;
function showToast(msg, ms = 3200){
  ensureToastOnce();
  const toast = document.getElementById("tscToast");
  const text = document.getElementById("tscToastText");
  if(!toast || !text) return;

  text.textContent = msg;

  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toast.classList.remove("show"), ms);
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

  const json = await res.json(); // has content + sha
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
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if(!res.ok){
    const t = await res.text();
    throw new Error("GitHub save failed: " + t);
  }

  return await res.json();
}

// GitHub Pages read (без токена)
async function pagesGetFile(){
  const url = `${GITHUB_PATH}?v=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) return null;
  return await res.json();
}

// ====== Автозагрузка (Pages -> Cache) ======
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

// ====== Token modal logic (используем HTML-модалку из index) ======
function getSavedToken(){
  return sessionStorage.getItem(TOKEN_SESSION_KEY)
    || localStorage.getItem(TOKEN_LOCAL_KEY)
    || "";
}

function clearSavedToken(){
  sessionStorage.removeItem(TOKEN_SESSION_KEY);
  localStorage.removeItem(TOKEN_LOCAL_KEY);
}

function openTokenModal({ prefill = "" } = {}){
  if(!tokenWrap || !tokenInput || !tokenOk || !tokenCancel) {
    // если вдруг модалки нет — просто спросим через prompt (крайний случай)
    const t = prompt("Вставь GitHub token:");
    return Promise.resolve(t ? { token: t.trim(), remember: false } : null);
  }

  const setErr = (msg, ok=false)=>{
    if(!tokenError) return;
    tokenError.style.display = msg ? "block" : "none";
    tokenError.textContent = msg || "";
    tokenError.style.color = ok ? "rgba(120,220,160,1)" : "rgba(192,75,75,1)";
  };

  tokenWrap.classList.add("open");
  tokenWrap.setAttribute("aria-hidden","false");

  setErr("");
  tokenInput.value = prefill || getSavedToken() || "";
  tokenRemember.checked = !!localStorage.getItem(TOKEN_LOCAL_KEY);

  setTimeout(()=> tokenInput.focus(), 60);

  return new Promise((resolve)=>{
    let done = false;

    const close = (result=null)=>{
      if(done) return;
      done = true;

      tokenWrap.classList.remove("open");
      tokenWrap.setAttribute("aria-hidden","true");

      tokenOk.removeEventListener("click", onOk);
      tokenCancel.removeEventListener("click", onCancel);
      tokenClose?.removeEventListener("click", onCancel);
      tokenTest?.removeEventListener("click", onTest);
      tokenWrap.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);

      resolve(result);
    };

    const onOk = ()=>{
      const token = (tokenInput.value || "").trim();
      if(!token){ setErr("Вставь токен."); return; }

      if(tokenRemember.checked){
        localStorage.setItem(TOKEN_LOCAL_KEY, token);
        sessionStorage.removeItem(TOKEN_SESSION_KEY);
      }else{
        sessionStorage.setItem(TOKEN_SESSION_KEY, token);
        localStorage.removeItem(TOKEN_LOCAL_KEY);
      }
      close({ token, remember: tokenRemember.checked });
    };

    const onCancel = ()=> close(null);

    const onBackdrop = (e)=>{
      if(e.target === tokenWrap) onCancel();
    };

    const onKey = (e)=>{
      if(!tokenWrap.classList.contains("open")) return;
      if(e.key === "Escape") onCancel();
      if(e.key === "Enter") onOk();
    };

    const onTest = async ()=>{
      const token = (tokenInput.value || "").trim();
      if(!token){ setErr("Вставь токен."); return; }

      setErr("Проверяю…", true);
      try{
        await githubGetFile(token);
        setErr("Токен подходит ✅", true);
      }catch(e){
        setErr("Токен не подошёл (или истёк/нет прав).\n" + (e?.message || ""), false);
      }
    };

    tokenOk.addEventListener("click", onOk);
    tokenCancel.addEventListener("click", onCancel);
    tokenClose?.addEventListener("click", onCancel);
    tokenTest?.addEventListener("click", onTest);
    tokenWrap.addEventListener("click", onBackdrop);
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

  while(true){
    const res = await openTokenModal({ prefill: "" });
    if(!res) return null;

    try{
      await githubGetFile(res.token);
      return res.token;
    }catch(e){
      // снова открываем и показываем ошибку
      clearSavedToken();
      await openTokenModal({ prefill: res.token });
      // (пользователь может нажать Проверить/Использовать ещё раз)
      // продолжим цикл, чтобы точно проверить
      const again = getSavedToken();
      if(!again) continue;
      try{
        await githubGetFile(again);
        return again;
      }catch{
        clearSavedToken();
      }
    }
  }
}

// ====== Save button icons (spinner/check) ======
const SAVE_BTN_DEFAULT_HTML = saveGithubBtn ? saveGithubBtn.innerHTML : "";

const ICON_SPINNER = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="8" stroke="white" stroke-width="2" opacity=".25"></circle>
  <path d="M20 12a8 8 0 0 0-8-8" stroke="white" stroke-width="2" stroke-linecap="round"></path>
</svg>
`;

const ICON_CHECK = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <line x1="4"  y1="13" x2="9"  y2="18"></line>
  <line x1="9"  y1="18" x2="20" y2="7"></line>
</svg>
`;

function setSaveBtnState(state){
  if(!saveGithubBtn) return;

  if(state === "default"){
    saveGithubBtn.innerHTML = SAVE_BTN_DEFAULT_HTML;
    saveGithubBtn.disabled = false;
    saveGithubBtn.classList.remove("isSaving");
    return;
  }

  if(state === "loading"){
    saveGithubBtn.innerHTML = ICON_SPINNER;
    saveGithubBtn.disabled = true;
    saveGithubBtn.classList.add("isSaving");
    return;
  }

  if(state === "done"){
    saveGithubBtn.innerHTML = ICON_CHECK;
    saveGithubBtn.disabled = true;
    saveGithubBtn.classList.remove("isSaving");
    return;
  }
}

// ====== UI (create/edit modal) ======
function openModal(title){
  if(modalTitle) modalTitle.textContent = title;
  modalWrap?.classList.add("open");
  modalWrap?.setAttribute("aria-hidden","false");
}
function closeModalFn(){
  modalWrap?.classList.remove("open");
  modalWrap?.setAttribute("aria-hidden","true");
}

closeModal?.addEventListener("click", closeModalFn);
cancelBtn?.addEventListener("click", closeModalFn);
modalWrap?.addEventListener("click", (e)=>{ if(e.target === modalWrap) closeModalFn(); });

// ====== actions mode (show/hide card buttons) ======
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
        if(b){
          b.order = base + (total - idx);
        }
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
  if(!grid) return;

  grid.innerHTML = "";
  if(!filtered.length){
    if(empty) empty.style.display = "block";
    return;
  }
  if(empty) empty.style.display = "none";

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

    card.querySelector('[data-act="deposit"]')?.addEventListener("click", ()=>openOp("deposit", b.id));
    card.querySelector('[data-act="withdraw"]')?.addEventListener("click", ()=>openOp("withdraw", b.id));
    card.querySelector('[data-act="edit"]')?.addEventListener("click", ()=>openEdit(b.id));
    card.querySelector('[data-act="delete"]')?.addEventListener("click", ()=>deleteBank(b.id));

    grid.appendChild(card);
  }

  if(reorderMode) enableReorder();
}

function render(){ applyFilter(); }

// ====== actions (create/edit/ops) ======
function openCreate(){
  modalMode = "create";
  editingId = null;
  if(createForm) createForm.style.display = "block";
  if(opForm) opForm.style.display = "none";
  if(f_name) f_name.value = "";
  if(f_goal) f_goal.value = "";
  if(f_start) f_start.value = "";
  openModal("Создать копилку");
}

function openEdit(id){
  const b = banks.find(x => x.id === id);
  if(!b) return;

  modalMode = "edit";
  editingId = id;

  if(createForm) createForm.style.display = "block";
  if(opForm) opForm.style.display = "none";

  if(f_name) f_name.value = b.name;
  if(f_goal) f_goal.value = (b.goal && b.goal > 0) ? String(Math.round(b.goal)) : "";
  if(f_start) f_start.value = String(Math.round(b.balance));

  openModal("Изменить копилку");
}

function openOp(type, id=null){
  modalMode = type; // deposit | withdraw
  if(createForm) createForm.style.display = "none";
  if(opForm) opForm.style.display = "block";

  setSelectBanks();
  if(id && f_bank) f_bank.value = id;

  if(f_amount) f_amount.value = "";
  if(opHint){
    opHint.textContent = (type === "deposit")
      ? "Сумма будет добавлена к балансу."
      : "Сумма будет вычтена (не уйдёт в минус).";
  }

  openModal(type === "deposit" ? "Пополнить" : "Вывести");
  setTimeout(()=>f_amount?.focus(), 60);
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
    const name = (f_name?.value || "").trim();
    const goalRaw = (f_goal?.value || "").trim();
    const startRaw = (f_start?.value || "").trim();

    if(!name){ alert("Введите название копилки."); return; }

    const goal = goalRaw ? parseNum(goalRaw) : null;
    if(goalRaw && (goal === null || goal <= 0)){
      alert("Цель должна быть числом больше 0, либо оставьте пустым.");
      return;
    }

    const start = startRaw ? parseNum(startRaw) : 0;
    if(start === null || start < 0){
      alert("Стартовая сумма должна быть числом 0 или больше.");
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
    if(!banks.length){ alert("Сначала создай копилку."); return; }

    const id = f_bank?.value;
    const amt = parseNum(f_amount?.value);

    if(!id){ alert("Выберите копилку."); return; }
    if(amt === null || amt <= 0){ alert("Введите сумму больше 0."); return; }

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
      alert("Загружено из GitHub Pages.");
      return;
    }

    const ok = loadCache();
    ensureOrderFields();
    render();
    alert(ok ? "На Pages пока пусто. Показал локальный кеш." : "На Pages пока пусто и кеш пустой.");
  }catch(e){
    console.error(e);
    alert("Ошибка загрузки: " + e.message);
  }finally{
    loadGithubBtn.disabled = false;
    loadGithubBtn.textContent = "Загрузить из GitHub";
  }
});

saveGithubBtn?.addEventListener("click", async ()=>{
  try{
    setSaveBtnState("loading");

    const token = await ensureValidToken();
    if(!token){
      setSaveBtnState("default");
      return;
    }

    const cur = await githubGetFile(token); // sha
    await githubPutFile({ banks }, cur.sha, token);

    setSaveBtnState("done");
    setTimeout(()=> setSaveBtnState("default"), 1200);

    // ✅ вместо alert — стилизованный toast
    showToast("Изменения сохранены. Обновление займёт 10–60 секунд.");
  }catch(e){
    console.error(e);
    alert("Ошибка сохранения в GitHub: " + e.message);
    setSaveBtnState("default");
  }
});

// ====== Order button ======
const orderIconEdit = document.getElementById("orderIconEdit");
const orderIconDone = document.getElementById("orderIconDone");

orderBtn?.addEventListener("click", ()=>{
  reorderMode = !reorderMode;

  if(reorderMode){
    enableReorder();
    if(orderIconEdit) orderIconEdit.style.display = "none";
    if(orderIconDone) orderIconDone.style.display = "block";
  }else{
    disableReorder();
    render();
    if(orderIconEdit) orderIconEdit.style.display = "block";
    if(orderIconDone) orderIconDone.style.display = "none";
  }
});

// ====== init ======
(async function init(){
  await autoLoadState();

  // по умолчанию кнопки скрыты
  setActionsMode(false);

  // на всякий — вернуть исходный вид кнопки save
  setSaveBtnState("default");

  render();
})();
