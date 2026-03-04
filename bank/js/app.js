// ====== SETTINGS (GitHub) ====== 
const APP_KEY = "tsc_piggy_v2_cache";

const GITHUB_OWNER = "mantrova-studio";
const GITHUB_REPO  = "polihov";
const GITHUB_PATH  = "bank/data/piggy.json"; // файл с копилками

// Для чтения без токена через GitHub Pages (другие устройства/инкогнито)
// Если страница открыта как /bank/ , то правильный путь: /bank/data/piggy.json
// Поэтому используем относительный путь ОТ ТЕКУЩЕЙ ПАПКИ страницы:
const PAGES_PATH   = "data/piggy.json";

// ===== Login gate =====
const APP_PASSWORD = "12344321"; // ← поменяй
const AUTH_KEY = "tsc_piggy_auth_v1";

// DOM login
const loginWrap = document.getElementById("loginWrap");
const loginPass = document.getElementById("loginPass");
const loginRemember = document.getElementById("loginRemember");
const loginError = document.getElementById("loginError");

const loginOk = document.getElementById("loginOk");
const loginCancel = document.getElementById("loginCancel");
const loginClose = document.getElementById("loginClose");

function isAuthed(){
  return localStorage.getItem(AUTH_KEY) === "1";
}
function setAuthed(ok){
  if(ok) localStorage.setItem(AUTH_KEY, "1");
  else localStorage.removeItem(AUTH_KEY);
}

function openLogin(){
  document.body.classList.add("locked");
  loginWrap.classList.add("open");
  loginWrap.setAttribute("aria-hidden","false");
  loginError.style.display = "none";
  loginError.textContent = "";
  loginPass.value = "";
  setTimeout(()=>loginPass.focus(), 60);
}

function closeLogin(){
  loginWrap.classList.remove("open");
  loginWrap.setAttribute("aria-hidden","true");
  document.body.classList.remove("locked");
}

function showLoginError(msg){
  loginError.textContent = msg || "Неверный пароль";
  loginError.style.display = "block";
}

function requireAuthOrLock(){
  if(isAuthed()){
    document.body.classList.remove("locked");
    return true;
  }
  openLogin();
  return false;
}

// обработчики
loginOk?.addEventListener("click", ()=>{
  const p = (loginPass.value || "").trim();
  if(p !== APP_PASSWORD){
    showLoginError("Неверный пароль.");
    loginPass.select();
    return;
  }

  // запомнить вход
  if(loginRemember?.checked){
    setAuthed(true);
  }else{
    // если НЕ запоминать — можно хранить только в sessionStorage:
    // sessionStorage.setItem(AUTH_KEY, "1");
    // и в isAuthed() проверять sessionStorage тоже
    setAuthed(true); // проще: всё равно запомнит
  }

  closeLogin();
  // после входа — перерендер
  render?.();
});

loginCancel?.addEventListener("click", ()=>{
  // остаёмся “закрытым”
  openLogin();
});

loginClose?.addEventListener("click", ()=>{
  openLogin();
});

loginWrap?.addEventListener("click", (e)=>{
  if(e.target === loginWrap) openLogin();
});

loginPass?.addEventListener("keydown", (e)=>{
  if(e.key === "Enter") loginOk?.click();
});

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

const ICONS = {
  plus: `
    <svg viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5"  y1="12" x2="19" y2="12"/>
    </svg>
  `,
  minus: `
    <svg viewBox="0 0 24 24">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  `,
  upload: `
    <svg viewBox="0 0 24 24">
      <path d="M12 3v12"/>
      <path d="M7 8l5-5 5 5"/>
      <path d="M5 21h14"/>
    </svg>
  `,
  download: `
    <svg viewBox="0 0 24 24">
      <path d="M12 21V9"/>
      <path d="M7 16l5 5 5-5"/>
      <path d="M5 3h14"/>
    </svg>
  `,
  edit: `
    <svg viewBox="0 0 24 24">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
    </svg>
  `,
  trash: `
    <svg viewBox="0 0 24 24">
      <path d="M3 6h18"/>
      <path d="M8 6V4h8v2"/>
      <path d="M6 6l1 14h10l1-14"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
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
  // Важно: не используем GITHUB_PATH тут, иначе на /bank/ получится /bank/bank/...
  const u = new URL(PAGES_PATH, window.location.href);
  u.searchParams.set("v", String(Date.now())); // cache-bust
  const res = await fetch(u.toString(), { cache: "no-store" });
  if(!res.ok) return null;
  return await res.json();
}

// ====== Token modal ======
function openToken(){
  tokenWrap?.classList.add("open");
  tokenWrap?.setAttribute("aria-hidden","false");
  tokenError.style.display = "none";
  tokenError.textContent = "";
  tokenInput.value = "";
  setTimeout(()=>tokenInput.focus(), 60);
}
function closeToken(){
  tokenWrap?.classList.remove("open");
  tokenWrap?.setAttribute("aria-hidden","true");
}
function showTokenError(msg){
  tokenError.textContent = msg || "Ошибка";
  tokenError.style.display = "block";
}

function getTokenFromStorage(){
  // сначала session, потом local
  return sessionStorage.getItem(TOKEN_SESSION_KEY) || localStorage.getItem(TOKEN_LOCAL_KEY) || "";
}

function setTokenToStorage(token, remember){
  // remember=true => localStorage, иначе sessionStorage
  sessionStorage.removeItem(TOKEN_SESSION_KEY);
  localStorage.removeItem(TOKEN_LOCAL_KEY);

  if(!token) return;

  if(remember){
    localStorage.setItem(TOKEN_LOCAL_KEY, token);
  }else{
    sessionStorage.setItem(TOKEN_SESSION_KEY, token);
  }
}

async function testToken(token){
  // быстрый тест: read file meta
  const api = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
  const res = await fetch(api, { headers: ghHeaders(token) });
  return res.ok;
}

async function ensureValidToken(){
  let token = getTokenFromStorage();
  if(token) return token;

  // попросим
  openToken();

  // вернём промис, который резолвится когда пользователь нажмёт ОК/Cancel
  return await new Promise((resolve)=>{
    const cleanup = ()=>{
      tokenOk?.removeEventListener("click", onOk);
      tokenCancel?.removeEventListener("click", onCancel);
      tokenClose?.removeEventListener("click", onCancel);
      tokenWrap?.removeEventListener("click", onWrap);
      tokenTest?.removeEventListener("click", onTest);
    };

    const onCancel = ()=>{
      cleanup();
      closeToken();
      resolve("");
    };

    const onWrap = (e)=>{
      if(e.target === tokenWrap) onCancel();
    };

    const onTest = async ()=>{
      const t = (tokenInput.value || "").trim();
      if(!t){
        showTokenError("Вставьте ключ.");
        return;
      }
      tokenTest.disabled = true;
      tokenTest.textContent = "Проверяю...";
      try{
        const ok = await testToken(t);
        if(ok){
          showTokenError("Ключ подходит ✅");
          tokenError.style.color = "rgba(120,255,170,1)";
        }else{
          showTokenError("Ключ не подходит ❌");
          tokenError.style.color = "rgba(192,75,75,1)";
        }
      }catch(e){
        showTokenError("Ошибка проверки: " + (e?.message || ""));
        tokenError.style.color = "rgba(192,75,75,1)";
      }finally{
        tokenTest.disabled = false;
        tokenTest.textContent = "Проверить ключ";
        setTimeout(()=>{ tokenError.style.color = "rgba(192,75,75,1)"; }, 1200);
      }
    };

    const onOk = async ()=>{
      const t = (tokenInput.value || "").trim();
      if(!t){
        showTokenError("Вставьте ключ.");
        return;
      }

      tokenOk.disabled = true;
      tokenOk.innerHTML = `${ICONS.spinner} Сохраняю...`;
      try{
        // можно проверить, но это лишний запрос; оставлю минимально
        setTokenToStorage(t, !!tokenRemember?.checked);
        cleanup();
        closeToken();
        resolve(t);
      }finally{
        tokenOk.disabled = false;
        tokenOk.textContent = "Сохранить";
      }
    };

    tokenOk?.addEventListener("click", onOk);
    tokenCancel?.addEventListener("click", onCancel);
    tokenClose?.addEventListener("click", onCancel);
    tokenWrap?.addEventListener("click", onWrap);
    tokenTest?.addEventListener("click", onTest);
  });
}

// ====== toast ======
let toastTimer = null;
function toast({ title="", message="", icon="check", timeout=2400 }){
  const box = document.createElement("div");
  box.className = "toast";
  box.innerHTML = `
    <div class="toastIcon">${ICONS[icon] || ICONS.check}</div>
    <div class="toastText">
      <div class="toastTitle">${escapeHtml(title)}</div>
      <div class="toastMsg">${escapeHtml(message)}</div>
    </div>
  `;
  document.body.appendChild(box);
  setTimeout(()=> box.classList.add("show"), 10);

  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{
    box.classList.remove("show");
    setTimeout(()=> box.remove(), 350);
  }, timeout);
}

// ====== render ======
function filterBanks(){
  const q = norm(query);
  if(!q) return [...banks];
  return banks.filter(b => norm(b.name).includes(q));
}

function render(){
  if(!requireAuthOrLock()) return;

  filtered = filterBanks();

  if(!grid) return;
  grid.innerHTML = "";

  if(!filtered.length){
    if(empty) empty.style.display = "block";
    return;
  }else{
    if(empty) empty.style.display = "none";
  }

  for(const b of filtered){
    const goal = b.goal ? Number(b.goal) : null;
    const pct = goal ? Math.min(100, Math.round((b.balance / goal) * 100)) : null;

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = b.id;

    card.innerHTML = `
      <div class="cardTop">
        <div class="cardTitle">${escapeHtml(b.name)}</div>
        <div class="cardActions">
          <button class="iconBtn primary" data-act="deposit" title="Пополнить">${ICONS.plus}</button>
          <button class="iconBtn danger" data-act="withdraw" title="Вывести">${ICONS.minus}</button>
          <button class="iconBtn" data-act="edit" title="Редактировать">${ICONS.edit}</button>
          <button class="iconBtn danger" data-act="delete" title="Удалить">${ICONS.trash}</button>
        </div>
      </div>

      <div class="cardBody">
        <div class="row">
          <div class="muted">Накоплено</div>
          <div class="val">${money(b.balance)} ₽</div>
        </div>

        <div class="row">
          <div class="muted">Цель</div>
          <div class="val">${goal ? money(goal) + " ₽" : "—"}</div>
        </div>

        ${goal ? `
          <div class="bar">
            <div class="barFill" style="width:${pct}%;"></div>
          </div>
          <div class="tiny muted">${pct}%</div>
        ` : `
          <div class="tiny muted">Без цели</div>
        `}
      </div>
    `;

    // actions
    card.querySelectorAll("[data-act]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const act = btn.dataset.act;
        if(act === "deposit"){ openOp("deposit", b.id); }
        if(act === "withdraw"){ openOp("withdraw", b.id); }
        if(act === "edit"){ openEdit(b.id); }
        if(act === "delete"){ deleteBank(b.id); }
      });
    });

    grid.appendChild(card);
  }

  setSelectBanks();
}

// ====== modal ======
function openModalFn(title){
  modalTitle.textContent = title || "Окно";
  modalWrap.classList.add("open");
  modalWrap.setAttribute("aria-hidden","false");
}
function closeModalFn(){
  modalWrap.classList.remove("open");
  modalWrap.setAttribute("aria-hidden","true");
  createForm.style.display = "none";
  opForm.style.display = "none";
  modalMode = null;
  editingId = null;
}

closeModal?.addEventListener("click", closeModalFn);
cancelBtn?.addEventListener("click", closeModalFn);
modalWrap?.addEventListener("click", (e)=>{
  if(e.target === modalWrap) closeModalFn();
});

function openCreate(){
  modalMode = "create";
  openModalFn("Создать копилку");
  createForm.style.display = "block";
  opForm.style.display = "none";
  f_name.value = "";
  f_goal.value = "";
  f_start.value = "";
  setTimeout(()=>f_name.focus(), 70);
}

function openEdit(id){
  const b = banks.find(x => x.id === id);
  if(!b) return;
  modalMode = "edit";
  editingId = id;
  openModalFn("Редактировать");
  createForm.style.display = "block";
  opForm.style.display = "none";
  f_name.value = b.name;
  f_goal.value = (b.goal == null) ? "" : String(b.goal);
  f_start.value = String(b.balance || 0);
  setTimeout(()=>f_name.focus(), 70);
}

function openOp(mode, idPrefill){
  modalMode = mode;
  openModalFn(mode === "deposit" ? "Пополнить" : "Вывести");
  createForm.style.display = "none";
  opForm.style.display = "block";
  if(opHint) opHint.textContent = "";
  f_amount.value = "";
  setSelectBanks();
  if(idPrefill && f_bank){
    f_bank.value = idPrefill;
  }
  setTimeout(()=>f_amount.focus(), 70);
}

function deleteBank(id){
  if(!confirm("Удалить копилку?")) return;
  banks = banks.filter(x => x.id !== id);
  saveCache();
  render();
}

// ====== save from modal ======
function saveFromModal(){
  if(modalMode === "create" || modalMode === "edit"){
    const name = (f_name?.value || "").trim();
    const goal = parseNum(f_goal?.value);
    const start = parseNum(f_start?.value) ?? 0;

    if(!name){
      toast({ title:"Ошибка", message:"Введите название.", icon:"minus", timeout:2600 });
      return;
    }

    if(modalMode === "create"){
      const id = uniqueId(slug(name) || "bank");
      banks.unshift({
        id,
        name,
        goal: (goal === null) ? null : goal,
        balance: start,
        createdAt: Date.now(),
        order: Date.now()
      });
    }else{
      const b = banks.find(x => x.id === editingId);
      if(!b) return;
      b.name = name;
      b.goal = (goal === null) ? null : goal;
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

function setSaveBtnState(state){
  if(!saveGithubBtn) return;
  if(state === "loading"){
    saveGithubBtn.disabled = true;
    saveGithubBtn.innerHTML = `${ICONS.spinner} Сохраняю...`;
  }else{
    saveGithubBtn.disabled = false;
    saveGithubBtn.textContent = "Сохранить в GitHub";
  }
}

saveGithubBtn?.addEventListener("click", async ()=>{
  try{
    setSaveBtnState("loading");

    const token = await ensureValidToken();
    if(!token){
      setSaveBtnState("default");
      return;
    }

    // читаем sha
    const { sha } = await githubGetFile(token).catch(()=>({ sha:null }));

    await githubPutFile({ banks }, sha, token);

    toast({ title:"Сохранено", message:"Изменения сохранены в GitHub.", icon:"check", timeout:2600 });
  }catch(e){
    console.error(e);
    toast({ title:"Ошибка", message:"Ошибка сохранения: " + (e?.message || ""), icon:"minus", timeout:4200 });
  }finally{
    setSaveBtnState("default");
  }
});

// ====== reorder ======
orderBtn?.addEventListener("click", ()=>{
  reorderMode = !reorderMode;
  document.body.classList.toggle("orderOn", reorderMode);

  const iconEdit = document.getElementById("orderIconEdit");
  const iconDone = document.getElementById("orderIconDone");
  if(iconEdit && iconDone){
    iconEdit.style.display = reorderMode ? "none" : "block";
    iconDone.style.display = reorderMode ? "block" : "none";
  }

  if(reorderMode){
    if(sortable) sortable.destroy();

    sortable = new Sortable(grid, {
      animation: 150,
      handle: ".card",
      onEnd: ()=>{
        const ids = [...grid.querySelectorAll(".card")].map(el=> el.dataset.id);
        const map = new Map(banks.map(b => [b.id, b]));
        banks = ids.map(id => map.get(id)).filter(Boolean);

        // обновим order
        const now = Date.now();
        banks.forEach((b, i)=>{
          b.order = now + i;
        });

        saveCache();
      }
    });
  }else{
    if(sortable) sortable.destroy();
    sortable = null;
  }
});

// ====== actions toggle ======
actionsBtn?.addEventListener("click", ()=>{
  actionsMode = !actionsMode;
  document.body.classList.toggle("actionsOn", actionsMode);
  if(actionsIconEdit && actionsIconDone){
    actionsIconEdit.style.display = actionsMode ? "none" : "block";
    actionsIconDone.style.display = actionsMode ? "block" : "none";
  }
});

// ====== init ======
(function init(){
  // если нет авторизации — откроем логин и спрячем контент
  if(!isAuthed()){
    openLogin();
  }else{
    document.body.classList.remove("locked");
  }

  // грузим кеш сразу
  loadCache();
  ensureOrderFields();
  render();
})();
