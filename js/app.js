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

// actions toggle (show/hide card actions)
const actionsBtn = document.getElementById("actionsBtn");
const actionsIconEdit = document.getElementById("actionsIconEdit");
const actionsIconDone = document.getElementById("actionsIconDone");

const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");

// modal (create/edit/ops)
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

// token modal (from index.html)
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

// actions mode (show buttons on cards)
let actionsMode = false;

// ====== SVG icons for buttons ======
const ICONS = {
  plus: `
    <svg viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  `,
  minus: `
    <svg viewBox="0 0 24 24">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  `,
  pencil: `
    <svg viewBox="0 0 24 24">
      <line x1="4" y1="20" x2="8" y2="19"/>
      <line x1="8" y1="19" x2="19" y2="8"/>
      <line x1="19" y1="8" x2="16" y2="5"/>
      <line x1="16" y1="5" x2="5" y2="16"/>
    </svg>
  `,
trash: `
  <svg viewBox="0 0 24 24">
    <line x1="4" y1="7" x2="20" y2="7"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
    <path d="M6 7l1 14h10l1-14"/>
    <path d="M9 7V5h6v2"/>
  </svg>
`,
  spinner: `
  <svg class="spin" viewBox="0 0 24 24">
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="white"
      stroke-width="2"
      fill="none"
      stroke-linecap="round"
      stroke-dasharray="50"
      stroke-dashoffset="35"
    />
  </svg>
`,
  check: `
    <svg viewBox="0 0 24 24">
      <line x1="4"  y1="13" x2="9"  y2="18"/>
      <line x1="9"  y1="18" x2="20" y2="7"/>
    </svg>
  `,
  clock: `
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" fill="none"/>
      <line x1="12" y1="7" x2="12" y2="12"/>
      <line x1="12" y1="12" x2="15" y2="14"/>
    </svg>
  `
};

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

// 2) Чтение через GitHub Pages (без токена)
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

// ====== Toast (TSC style) ======
function ensureToastOnce(){
  if(document.getElementById("toastWrap")) return;

  const style = document.createElement("style");
  style.textContent = `
    .toastWrap{
      position: fixed;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%);
      z-index: 999999;
      display:flex;
      flex-direction:column;
      gap:10px;
      pointer-events:none;
      padding: 0 12px;
      width:min(520px, calc(100% - 24px));
    }
    .toast{
      pointer-events:auto;
      background: rgba(18,26,42,.92);
      border: 1px solid rgba(43,58,85,.9);
      border-radius: 14px;
      box-shadow: 0 18px 60px rgba(0,0,0,.55);
      padding: 12px 12px;
      display:flex;
      gap:10px;
      align-items:flex-start;
      animation: toastIn .18s ease-out;
    }
    @keyframes toastIn{
      from{ opacity:0; transform: translateY(10px); }
      to{ opacity:1; transform: translateY(0); }
    }
    .toastIcon{
      width:34px; height:34px;
      border-radius: 12px;
      display:grid;
      place-items:center;
      border:1px solid rgba(43,58,85,.85);
      background: rgba(30,42,66,.75);
      flex:0 0 auto;
    }
    .toastIcon svg{
      width:18px; height:18px;
      stroke:white; stroke-width:2; fill:none; opacity:.9;
    }
    .toastBody{ flex:1 1 auto; }
    .toastTitle{
      font-weight:800;
      font-size:14px;
      line-height:1.2;
    }
    .toastMsg{
      margin-top:4px;
      color: rgba(255,255,255,.65);
      font-size:13px;
      line-height:1.35;
      white-space:pre-wrap;
    }
    .toastClose{
      width:34px; height:34px;
      border-radius: 12px;
      display:grid; place-items:center;
      border:1px solid rgba(43,58,85,.85);
      background: rgba(30,42,66,.75);
      color:#fff;
      cursor:pointer;
      flex:0 0 auto;
    }
    .toastClose:hover{ background: rgba(36,54,84,.85); border-color: rgba(63,91,135,.9); }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement("div");
  wrap.id = "toastWrap";
  wrap.className = "toastWrap";
  document.body.appendChild(wrap);
}

function toast({ title="Готово", message="", icon="check", timeout=2600 } = {}){
  ensureToastOnce();
  const wrap = document.getElementById("toastWrap");
  if(!wrap) return;

  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `
    <div class="toastIcon">${ICONS[icon] || ICONS.check}</div>
    <div class="toastBody">
      <div class="toastTitle">${escapeHtml(title)}</div>
      <div class="toastMsg">${escapeHtml(message)}</div>
    </div>
    <button class="toastClose" type="button" aria-label="Закрыть">✕</button>
  `;

  const close = ()=>{
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";
    el.style.transition = "all .16s ease";
    setTimeout(()=> el.remove(), 180);
  };

  el.querySelector(".toastClose").addEventListener("click", close);

  wrap.appendChild(el);

  if(timeout && timeout > 0){
    setTimeout(close, timeout);
  }
}

// ====== Save button states (spinner/check) ======
let SAVE_BTN_DEFAULT_HTML = null;

function initSaveBtnDefault(){
  if(!saveGithubBtn) return;
  if(SAVE_BTN_DEFAULT_HTML == null){
    SAVE_BTN_DEFAULT_HTML = saveGithubBtn.innerHTML; // original cloud icon in header
  }
}

function setSaveBtnState(state){
  if(!saveGithubBtn) return;
  initSaveBtnDefault();

  if(state === "loading"){
    saveGithubBtn.innerHTML = ICONS.spinner;
    saveGithubBtn.disabled = true;
  }else if(state === "done"){
    saveGithubBtn.innerHTML = ICONS.check;
    saveGithubBtn.disabled = true;
  }else{
    saveGithubBtn.innerHTML = SAVE_BTN_DEFAULT_HTML;
    saveGithubBtn.disabled = false;
  }
}

// ====== Token modal logic (use existing HTML) ======
function getSavedToken(){
  return sessionStorage.getItem(TOKEN_SESSION_KEY)
    || localStorage.getItem(TOKEN_LOCAL_KEY)
    || "";
}
function clearSavedToken(){
  sessionStorage.removeItem(TOKEN_SESSION_KEY);
  localStorage.removeItem(TOKEN_LOCAL_KEY);
}

function showTokenModal(){
  if(!tokenWrap) return;
  tokenWrap.classList.add("open");
  tokenWrap.setAttribute("aria-hidden","false");

  if(tokenError){
    tokenError.style.display = "none";
    tokenError.textContent = "";
  }

  if(tokenInput){
    tokenInput.value = getSavedToken() || "";
    setTimeout(()=>tokenInput.focus(), 60);
  }
  if(tokenRemember){
    tokenRemember.checked = !!localStorage.getItem(TOKEN_LOCAL_KEY);
  }
}

function hideTokenModal(){
  if(!tokenWrap) return;
  tokenWrap.classList.remove("open");
  tokenWrap.setAttribute("aria-hidden","true");
}

function tokenModalError(msg){
  if(!tokenError) return;
  tokenError.textContent = msg || "Ошибка";
  tokenError.style.display = "block";
}

function saveToken(token){
  if(!token) return;
  if(tokenRemember?.checked){
    localStorage.setItem(TOKEN_LOCAL_KEY, token);
    sessionStorage.removeItem(TOKEN_SESSION_KEY);
  }else{
    sessionStorage.setItem(TOKEN_SESSION_KEY, token);
    localStorage.removeItem(TOKEN_LOCAL_KEY);
  }
}

async function testToken(token){
  await githubGetFile(token); // quick read test (needs repo read permission)
  return true;
}

function bindTokenModalOnce(){
  if(!tokenWrap) return;
  if(tokenWrap.dataset.bound === "1") return;
  tokenWrap.dataset.bound = "1";

  tokenClose?.addEventListener("click", hideTokenModal);
  tokenCancel?.addEventListener("click", hideTokenModal);

  // click outside modal closes
  tokenWrap.addEventListener("click", (e)=>{
    if(e.target === tokenWrap) hideTokenModal();
  });

  // Esc closes, Enter uses
  tokenInput?.addEventListener("keydown", (e)=>{
    if(e.key === "Escape") hideTokenModal();
    if(e.key === "Enter") tokenOk?.click();
  });

  tokenTest?.addEventListener("click", async ()=>{
    const token = (tokenInput?.value || "").trim();
    if(!token){
      tokenModalError("Вставь токен.");
      return;
    }

    tokenTest.disabled = true;
    tokenTest.textContent = "Проверяю…";
    try{
      await testToken(token);
      saveToken(token);
      if(tokenError){
        tokenError.style.display = "none";
        tokenError.textContent = "";
      }
      toast({
        title: "Токен OK",
        message: "Токен подходит. Можно сохранять.",
        icon: "check",
        timeout: 2200
      });
    }catch(e){
      clearSavedToken();
      tokenModalError("Токен не подошёл (или истёк/нет прав).\n\n" + (e?.message || ""));
    }finally{
      tokenTest.disabled = false;
      tokenTest.textContent = "Проверить";
    }
  });

  tokenOk?.addEventListener("click", async ()=>{
    const token = (tokenInput?.value || "").trim();
    if(!token){
      tokenModalError("Вставь токен.");
      return;
    }

    tokenOk.disabled = true;
    tokenOk.textContent = "Проверяю…";
    try{
      await testToken(token);
      saveToken(token);
      hideTokenModal();
    }catch(e){
      clearSavedToken();
      tokenModalError("Токен не подошёл (или истёк/нет прав).\n\n" + (e?.message || ""));
    }finally{
      tokenOk.disabled = false;
      tokenOk.textContent = "Использовать";
    }
  });
}

async function ensureValidToken(){
  bindTokenModalOnce();

  const saved = getSavedToken();
  if(saved){
    try{
      await githubGetFile(saved);
      return saved;
    }catch{
      clearSavedToken();
    }
  }

  // open modal and wait for user
  showTokenModal();

  return await new Promise((resolve)=>{
    const onDone = async ()=>{
      // when modal closes, try to use saved token
      const t = getSavedToken();
      if(!tokenWrap?.classList.contains("open")){
        // modal closed
        cleanup();
        resolve(t || null);
      }
    };

    const cleanup = ()=>{
      clearInterval(timer);
    };

    const timer = setInterval(onDone, 250);
  });
}

// ====== UI (create/edit/ops modal) ======
function openModal(title){
  if(!modalTitle || !modalWrap) return;
  modalTitle.textContent = title;
  modalWrap.classList.add("open");
  modalWrap.setAttribute("aria-hidden","false");
}
function closeModalFn(){
  if(!modalWrap) return;
  modalWrap.classList.remove("open");
  modalWrap.setAttribute("aria-hidden","true");
}

closeModal?.addEventListener("click", closeModalFn);
cancelBtn?.addEventListener("click", closeModalFn);
modalWrap?.addEventListener("click", (e)=>{ if(e.target === modalWrap) closeModalFn(); });

// actions mode
function setActionsMode(on){
  actionsMode = !!on;
  document.body.classList.toggle("actionsOn", actionsMode);

  if(actionsIconEdit && actionsIconDone){
    actionsIconEdit.style.display = actionsMode ? "none" : "block";
    actionsIconDone.style.display = actionsMode ? "block" : "none";
  }
}
actionsBtn?.addEventListener("click", ()=> setActionsMode(!actionsMode));

// reorder mode
function enableReorder(){
  if(sortable || !window.Sortable || !grid) return;

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
        <button class="iconBtn primary" data-act="deposit" title="Пополнить">${ICONS.plus}</button>
        <button class="iconBtn danger" data-act="withdraw" title="Вывести">${ICONS.minus}</button>
        <button class="iconBtn" data-act="edit" title="Изменить">${ICONS.pencil}</button>
        <button class="iconBtn danger" data-act="delete" title="Удалить">${ICONS.trash}</button>
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

function render(){
  applyFilter();
}

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
  modalMode = type;
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

    if(!name){
      toast({ title:"Ошибка", message:"Введите название копилки.", icon:"minus", timeout:2600 });
      return;
    }

    const goal = goalRaw ? parseNum(goalRaw) : null;
    if(goalRaw && (goal === null || goal <= 0)){
      toast({ title:"Ошибка", message:"Цель должна быть числом больше 0, либо оставьте пустым.", icon:"minus", timeout:3200 });
      return;
    }

    const start = startRaw ? parseNum(startRaw) : 0;
    if(start === null || start < 0){
      toast({ title:"Ошибка", message:"Стартовая сумма должна быть числом 0 или больше.", icon:"minus", timeout:3200 });
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
      toast({ title:"Ошибка", message:"Сначала создай копилку.", icon:"minus", timeout:2600 });
      return;
    }

    const id = f_bank?.value;
    const amt = parseNum(f_amount?.value);

    if(!id){
      toast({ title:"Ошибка", message:"Выберите копилку.", icon:"minus", timeout:2600 });
      return;
    }
    if(amt === null || amt <= 0){
      toast({ title:"Ошибка", message:"Введите сумму больше 0.", icon:"minus", timeout:2600 });
      return;
    }

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
function syncClear(){
  if(!clearSearch || !searchInput) return;
  clearSearch.style.display = searchInput.value ? "block" : "none";
}

searchInput?.addEventListener("input", ()=>{
  query = searchInput.value;
  syncClear();
  render();
});
clearSearch?.addEventListener("click", ()=>{
  if(!searchInput) return;
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
      toast({ title:"Загружено", message:"Загружено из GitHub Pages.", icon:"check", timeout:2400 });
      return;
    }

    // если Pages пусто — грузим из кеша
    const ok = loadCache();
    ensureOrderFields();
    render();
    toast({
      title:"Готово",
      message: ok ? "На Pages пока пусто. Показал локальный кеш." : "На Pages пока пусто и кеш пустой.",
      icon:"clock",
      timeout:3200
    });
  }catch(e){
    console.error(e);
    toast({ title:"Ошибка", message:"Ошибка загрузки: " + (e?.message || ""), icon:"minus", timeout:4200 });
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
    toast({
      title: "Сохранено",
      message: "Изменения сохранены. Обновление займёт 10–60 секунд.",
      icon: "check",
      timeout: 3600
    });
    setTimeout(()=> setSaveBtnState("default"), 1200);
  }catch(e){
    console.error(e);
    setSaveBtnState("default");
    toast({ title:"Ошибка", message:"Ошибка сохранения: " + (e?.message || ""), icon:"minus", timeout:5200 });
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
  initSaveBtnDefault();
  bindTokenModalOnce();
  await autoLoadState();

  // по умолчанию кнопки скрыты
  setActionsMode(false);

  render();
})();
