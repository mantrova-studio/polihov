// ====== SETTINGS ======
const APP_KEY = "tsc_piggy_v1";
const SESSION_KEY = "tsc_piggy_ok_v1";
const PASSWORD = "601/18"; // поменяй на свой

// ====== DOM ======
const loginWrap = document.getElementById("loginWrap");
const loginPass = document.getElementById("loginPass");
const loginOk = document.getElementById("loginOk");
const loginCancel = document.getElementById("loginCancel");
const loginError = document.getElementById("loginError");

const lockBtn = document.getElementById("lockBtn");

const grid = document.getElementById("grid");
const empty = document.getElementById("empty");

const createBtn = document.getElementById("createBtn");
const depositBtn = document.getElementById("depositBtn");
const withdrawBtn = document.getElementById("withdrawBtn");

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

function loadState(){
  try{
    const raw = localStorage.getItem(APP_KEY);
    const data = raw ? JSON.parse(raw) : null;
    const list = Array.isArray(data?.banks) ? data.banks : [];
    banks = list.map(x => ({
      id: String(x.id || ""),
      name: String(x.name || "").trim(),
      goal: x.goal === null || x.goal === "" || x.goal === undefined ? null : Number(x.goal),
      balance: Number(x.balance || 0)
    })).filter(x => x.id && x.name);
  }catch{
    banks = [];
  }
}

function saveState(){
  localStorage.setItem(APP_KEY, JSON.stringify({ banks }, null, 2));
}

function isAuthed(){
  return sessionStorage.getItem(SESSION_KEY) === "1";
}
function setAuthed(ok){
  if(ok) sessionStorage.setItem(SESSION_KEY, "1");
  else sessionStorage.removeItem(SESSION_KEY);
}

// ====== LOGIN MODAL ======
function openLogin(){
  loginWrap.classList.add("open");
  loginWrap.setAttribute("aria-hidden","false");
  loginError.style.display = "none";
  loginPass.value = "";
  setTimeout(()=>loginPass.focus(), 60);
}
function closeLogin(){
  loginWrap.classList.remove("open");
  loginWrap.setAttribute("aria-hidden","true");
}

function requireAuth(){
  if(isAuthed()) return true;
  openLogin();
  return false;
}

loginOk.addEventListener("click", ()=>{
  if(loginPass.value === PASSWORD){
    setAuthed(true);
    closeLogin();
    render();
  }else{
    loginError.style.display = "block";
    loginPass.select();
  }
});

loginCancel.addEventListener("click", ()=>{
  // просто закрываем — без входа сайт будет пустой
  closeLogin();
});

loginWrap.addEventListener("click", (e)=>{
  if(e.target === loginWrap) closeLogin();
});

loginPass.addEventListener("keydown", (e)=>{
  if(e.key === "Enter") loginOk.click();
  if(e.key === "Escape") loginCancel.click();
});

lockBtn.addEventListener("click", ()=>{
  setAuthed(false);
  openLogin();
});

// ====== UI HELPERS ======
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

function setSelectBanks(){
  f_bank.innerHTML = "";
  for(const b of banks){
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = b.name;
    f_bank.appendChild(opt);
  }
}

// ====== RENDER ======
function applyFilter(){
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
}

function escapeHtml(str){
  return (str ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function render(){
  if(!isAuthed()){
    grid.innerHTML = "";
    empty.style.display = "block";
    empty.textContent = "Сайт закрыт. Введите пароль.";
    return;
  }
  empty.textContent = "Пока нет копилок. Создай первую 🙂";
  applyFilter();
}

// ====== ACTIONS ======
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
  saveState();
  render();
}

function parseNum(val){
  const s = (val ?? "").toString().replace(/\s/g,"").replace(",",".");
  const n = Number(s);
  if(!Number.isFinite(n)) return null;
  return n;
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
      banks.unshift({ id, name, goal: goal ?? null, balance: start });
    }else{
      const b = banks.find(x => x.id === editingId);
      if(!b) return;
      b.name = name;
      b.goal = goal ?? null;
      b.balance = start;
    }

    saveState();
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

    if(modalMode === "deposit"){
      b.balance += amt;
    }else{
      b.balance = Math.max(0, b.balance - amt);
    }

    saveState();
    closeModalFn();
    render();
    return;
  }
}

saveBtn.addEventListener("click", saveFromModal);

createBtn.addEventListener("click", ()=>{
  if(!requireAuth()) return;
  openCreate();
});

depositBtn.addEventListener("click", ()=>{
  if(!requireAuth()) return;
  if(!banks.length){ openCreate(); return; }
  openOp("deposit");
});

withdrawBtn.addEventListener("click", ()=>{
  if(!requireAuth()) return;
  if(!banks.length){ openCreate(); return; }
  openOp("withdraw");
});

// search
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

// init
loadState();
if(isAuthed()){
  render();
}else{
  openLogin();
                            }
