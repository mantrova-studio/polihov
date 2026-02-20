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

// ✅ NEW: кнопка “показать/скрыть кнопки на карточках”
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

// ====== STATE ======
let banks = [];
let filtered = [];
let query = "";

let modalMode = null; // "create" | "deposit" | "withdraw" | "edit"
let editingId = null;

// reorder mode
let reorderMode = false;
let sortable = null;

// ✅ NEW: actions mode (показывать кнопки на карточках)
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

// 1) Чтение через GitHub API (нужен токен)
async function githubGetFile(token){
  const api = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;

  const res = await fetch(api, {
    headers: ghHeaders(token)
  });

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

// 2) Чтение через GitHub Pages (без токена) — это то, что работает в инкогнито
async function pagesGetFile(){
  const url = `${GITHUB_PATH}?v=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) return null;
  return await res.json();
}

// ====== Автозагрузка (Pages -> Cache) ======
async function autoLoadState(){
  // Сначала пробуем GitHub Pages
  try{
    const pages = await pagesGetFile();
    if(pages && typeof pages === "object" && Array.isArray(pages.banks)){
      banks = normalizeBanks(pages.banks);
      ensureOrderFields();
      saveCache();
      return { from: "pages" };
    }
  }catch{}

  // Иначе берём локальный кеш
  const ok = loadCache();
  ensureOrderFields();
  return { from: ok ? "cache" : "empty" };
}

// ====== Token modal (TSC style) ======
function getSavedToken(){
  return sessionStorage.getItem(TOKEN_SESSION_KEY)
    || localStorage.getItem(TOKEN_LOCAL_KEY)
    || "";
}

function clearSavedToken(){
  sessionStorage.removeItem(TOKEN_SESSION_KEY);
  localStorage.removeItem(TOKEN_LOCAL_KEY);
}

function injectTokenModalOnce(){
  if(document.getElementById("tokenWrap")) return;

  const style = document.createElement("style");
  style.textContent = `
    .tokenWrap{
      position:fixed; inset:0;
      display:none; align-items:center; justify-content:center;
      padding:16px; z-index:99999;
      background: rgba(0,0,0,.72);
    }
    .tokenWrap.open{ display:flex; }
    .tokenModal{
      width:min(560px, 100%);
      background: rgba(18,26,42,.92);
      border: 1px solid rgba(43,58,85,.9);
      border-radius: 16px;
      box-shadow: 0 18px 60px rgba(0,0,0,.55);
      overflow:hidden;
    }
    .tokenHead{ padding:14px 14px 0; }
    .tokenTitle{ font-size:18px; font-weight:900; }
    .tokenSub{ margin-top:6px; color: rgba(255,255,255,.55); font-size:13px; line-height:1.35; }
    .tokenBody{ padding:14px; }
    .tokenLabel{ display:block; font-size:12px; color: rgba(255,255,255,.55); margin:0 0 6px; }
    .tokenInput{
      width:100%;
      padding: 11px 12px;
      border-radius: 12px;
      border:1px solid rgba(43,58,85,.85);
      background: rgba(0,0,0,.25);
      color:#fff;
      outline:none;
    }
    .tokenRow{
      display:flex; align-items:center; justify-content:space-between;
      gap:10px; margin-top:10px; flex-wrap:wrap;
    }
    .tokenCheck{
      display:flex; align-items:center; gap:8px;
      color: rgba(255,255,255,.7);
      font-size:13px;
      user-select:none;
    }
    .tokenErr{
      margin-top:10px;
      color: rgba(192,75,75,1);
      font-size:13px;
      display:none;
      white-space: pre-wrap;
    }
    .tokenActions{
      display:flex; gap:10px; justify-content:flex-end; margin-top:12px;
    }
    .tokenBtn{
      border:1px solid rgba(43,58,85,.85);
      background: rgba(30,42,66,.75);
      color:#fff;
      padding: 10px 14px;
      border-radius: 12px;
      cursor:pointer;
    }
    .tokenBtn:hover{ background: rgba(36,54,84,.85); border-color: rgba(63,91,135,.9); }
    .tokenBtn.primary{
      background: rgba(63,91,135,.9);
      border-color: rgba(63,91,135,.95);
    }
    .tokenBtn.primary:hover{ background: rgba(77,110,160,.95); }
    .tokenTiny{ margin-top:10px; font-size:12px; color: rgba(255,255,255,.55); line-height:1.35; }
    .tokenLink{
      color: rgba(255,255,255,.75);
      text-decoration: underline;
      cursor:pointer;
    }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement("div");
  wrap.className = "tokenWrap";
  wrap.id = "tokenWrap";
  wrap.setAttribute("aria-hidden","true");
  wrap.innerHTML = `
    <div class="tokenModal" role="dialog" aria-modal="true">
      <div class="tokenHead">
        <div class="tokenTitle">GitHub токен</div>
        <div class="tokenSub">
          Введи Personal Access Token (classic или fine-grained) с правами записи в репозиторий.
          Токен нужен только для <b>сохранения</b>.
        </div>
      </div>

      <div class="tokenBody">
        <label class="tokenLabel" for="tokenInput">Токен</label>
        <input id="tokenInput" class="tokenInput" type="password" placeholder="github_pat_..." autocomplete="off"/>

        <div class="tokenRow">
          <label class="tokenCheck">
            <input id="tokenRemember" type="checkbox" />
            Запомнить на этом устройстве
          </label>
          <span class="tokenLink" id="tokenClear">Сбросить сохранённый</span>
        </div>

        <div class="tokenErr" id="tokenError"></div>

        <div class="tokenActions">
          <button class="tokenBtn" id="tokenCancel" type="button">Отмена</button>
          <button class="tokenBtn primary" id="tokenOk" type="button">Продолжить</button>
        </div>

        <div class="tokenTiny">
          Если токен неверный/истёк — появится ошибка. Можно вставлять заново сколько угодно.
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  // clear token
  wrap.querySelector("#tokenClear").addEventListener("click", ()=>{
    clearSavedToken();
    wrap.querySelector("#tokenInput").value = "";
    const err = wrap.querySelector("#tokenError");
    err.style.display = "none";
    err.textContent = "";
  });
}

function askToken({ title = "GitHub токен", prefill = "" } = {}){
  injectTokenModalOnce();

  const wrap = document.getElementById("tokenWrap");
  const input = document.getElementById("tokenInput");
  const remember = document.getElementById("tokenRemember");
  const okBtn = document.getElementById("tokenOk");
  const cancel = document.getElementById("tokenCancel");
  const err = document.getElementById("tokenError");
  const titleEl = wrap.querySelector(".tokenTitle");

  titleEl.textContent = title;

  function open(){
    wrap.classList.add("open");
    wrap.setAttribute("aria-hidden","false");
    err.style.display = "none";
    err.textContent = "";
    input.value = prefill || getSavedToken() || "";
    remember.checked = !!localStorage.getItem(TOKEN_LOCAL_KEY);
    setTimeout(()=>input.focus(), 60);
  }
  function close(){
    wrap.classList.remove("open");
    wrap.setAttribute("aria-hidden","true");
  }
  function showError(msg){
    err.textContent = msg || "Ошибка";
    err.style.display = "block";
  }

  return new Promise((resolve)=>{
    open();

    const cleanup = ()=>{
      okBtn.removeEventListener("click", onOk);
      cancel.removeEventListener("click", onCancel);
      wrap.removeEventListener("click", onBackdrop);
      input.removeEventListener("keydown", onKey);
    };

    const onOk = ()=>{
      const token = (input.value || "").trim();
      if(!token){
        showError("Вставь токен.");
        return;
      }
      // save token
      if(remember.checked){
        localStorage.setItem(TOKEN_LOCAL_KEY, token);
        sessionStorage.removeItem(TOKEN_SESSION_KEY);
      }else{
        sessionStorage.setItem(TOKEN_SESSION_KEY, token);
        localStorage.removeItem(TOKEN_LOCAL_KEY);
      }
      close();
      cleanup();
      resolve({ token, remember: remember.checked, showError }); // showError на всякий
    };

    const onCancel = ()=>{
      close();
      cleanup();
      resolve(null);
    };

    const onBackdrop = (e)=>{
      if(e.target === wrap) onCancel();
    };

    const onKey = (e)=>{
      if(e.key === "Enter") onOk();
      if(e.key === "Escape") onCancel();
    };

    okBtn.addEventListener("click", onOk);
    cancel.addEventListener("click", onCancel);
    wrap.addEventListener("click", onBackdrop);
    input.addEventListener("keydown", onKey);
  });
}

// Показываем ошибку в модалке и просим токен снова
async function ensureValidToken(){
  // 1) берём сохранённый
  const saved = getSavedToken();
  if(saved){
    // пробуем проверить токен чтением файла (быстро)
    try{
      await githubGetFile(saved);
      return saved;
    }catch{
      // если невалиден — сбросим, чтобы не зацикливаться
      clearSavedToken();
    }
  }

  // 2) спрашиваем токен у пользователя, проверяем
  while(true){
    const res = await askToken({ title: "Токен для сохранения" });
    if(!res) return null;

    try{
      await githubGetFile(res.token);
      return res.token;
    }catch(e){
      // повторно откроем окно с ошибкой
      injectTokenModalOnce();
      const wrap = document.getElementById("tokenWrap");
      const err = document.getElementById("tokenError");
      wrap.classList.add("open");
      wrap.setAttribute("aria-hidden","false");
      err.style.display = "block";
      err.textContent = "Токен не подошёл (или истёк/нет прав).\n\n" + (e?.message || "");
      // подставим токен обратно в поле, чтобы можно было быстро поправить
      document.getElementById("tokenInput").value = res.token || "";
      // ждём, пока пользователь нажмёт Продолжить/Отмена
      const again = await new Promise((resolve)=>{
        const okBtn = document.getElementById("tokenOk");
        const cancelBtn = document.getElementById("tokenCancel");
        const input = document.getElementById("tokenInput");
        const remember = document.getElementById("tokenRemember");

        const cleanup = ()=>{
          okBtn.removeEventListener("click", onOk);
          cancelBtn.removeEventListener("click", onCancel);
        };

        const onOk = ()=>{
          const token = (input.value || "").trim();
          if(!token) return;
          if(remember.checked){
            localStorage.setItem(TOKEN_LOCAL_KEY, token);
            sessionStorage.removeItem(TOKEN_SESSION_KEY);
          }else{
            sessionStorage.setItem(TOKEN_SESSION_KEY, token);
            localStorage.removeItem(TOKEN_LOCAL_KEY);
          }
          wrap.classList.remove("open");
          wrap.setAttribute("aria-hidden","true");
          cleanup();
          resolve(token);
        };

        const onCancel = ()=>{
          wrap.classList.remove("open");
          wrap.setAttribute("aria-hidden","true");
          cleanup();
          resolve(null);
        };

        okBtn.addEventListener("click", onOk);
        cancelBtn.addEventListener("click", onCancel);
      });

      if(!again) return null;
      // проверим на следующем круге
      clearSavedToken();
      sessionStorage.setItem(TOKEN_SESSION_KEY, again);
    }
  }
}

// ====== UI ======
function openModal(title){
  modalTitle.textContent = title;
  modalWrap.classList.add("open");
  modalWrap.setAttribute("aria-hidden","false");
}
function closeModalFn(){
  modalWrap.classList.remove("open");
  modalWrap.setAttribute("aria-hidden","true");
}

closeModal.addEventListener("click", closeModalFn);
cancelBtn.addEventListener("click", closeModalFn);
modalWrap.addEventListener("click", (e)=>{ if(e.target === modalWrap) closeModalFn(); });

// ✅ NEW: показать/скрыть кнопки действий на карточках
function setActionsMode(on){
  actionsMode = !!on;
  document.body.classList.toggle("actionsOn", actionsMode);

  if(actionsIconEdit && actionsIconDone){
    actionsIconEdit.style.display = actionsMode ? "none" : "block";
    actionsIconDone.style.display = actionsMode ? "block" : "none";
  }
}
actionsBtn?.addEventListener("click", ()=>{
  setActionsMode(!actionsMode);
});

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

function render(){
  applyFilter();
}

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
  modalMode = type; // deposit | withdraw
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

    if(!name){
      alert("Введите название копилки.");
      return;
    }

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
    if(!banks.length){
      alert("Сначала создай копилку.");
      return;
    }

    const id = f_bank.value;
    const amt = parseNum(f_amount.value);

    if(!id){
      alert("Выберите копилку.");
      return;
    }
    if(amt === null || amt <= 0){
      alert("Введите сумму больше 0.");
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

saveBtn.addEventListener("click", saveFromModal);

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
clearSearch.style.display = "none";
function syncClear(){ clearSearch.style.display = searchInput.value ? "block" : "none"; }

searchInput.addEventListener("input", ()=>{
  query = searchInput.value;
  syncClear();
  render();
});
clearSearch.addEventListener("click", ()=>{
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

    // если Pages пусто — грузим из кеша (как резерв)
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
    saveGithubBtn.disabled = true;
    saveGithubBtn.textContent = "Готовлю...";

    const token = await ensureValidToken();
    if(!token){
      saveGithubBtn.textContent = "Сохранить в GitHub";
      return;
    }

    saveGithubBtn.textContent = "Сохраняю...";

    const cur = await githubGetFile(token); // sha
    await githubPutFile({ banks }, cur.sha, token);

    saveGithubBtn.textContent = "Сохранено ✓";
    setTimeout(()=> saveGithubBtn.textContent = "Сохранить в GitHub", 1200);
    alert("Сохранено в GitHub. GitHub Pages может обновляться 10–60 секунд.");
  }catch(e){
    console.error(e);
    alert("Ошибка сохранения в GitHub: " + e.message);
    saveGithubBtn.textContent = "Сохранить в GitHub";
  }finally{
    saveGithubBtn.disabled = false;
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

  // ✅ NEW: по умолчанию кнопки скрыты
  setActionsMode(false);

  render();
})();
