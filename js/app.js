// ================= SETTINGS =================
const APP_KEY = "tsc_piggy_v2_cache";

const GITHUB_OWNER = "mantrova-studio";
const GITHUB_REPO  = "polihov";
const GITHUB_PATH  = "data/piggy.json";

// ================= DOM =================
const grid = document.getElementById("grid");
const empty = document.getElementById("empty");

const saveGithubBtn = document.getElementById("saveGithubBtn");

const actionsBtn = document.getElementById("actionsBtn");
const actionsIconEdit = document.getElementById("actionsIconEdit");
const actionsIconDone = document.getElementById("actionsIconDone");

// ================= STATE =================
let banks = [];
let actionsMode = false;

// ================= HELPERS =================
function money(n){
  return new Intl.NumberFormat("ru-RU").format(Math.round(Number(n||0)));
}

function saveCache(){
  localStorage.setItem(APP_KEY, JSON.stringify({ banks }));
}

function loadCache(){
  try{
    const raw = localStorage.getItem(APP_KEY);
    if(!raw) return false;
    const data = JSON.parse(raw);
    if(Array.isArray(data?.banks)){
      banks = data.banks;
      return true;
    }
  }catch{}
  return false;
}

// ================= GITHUB =================
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
    throw new Error("Ошибка проверки токена");
  }

  const json = await res.json();
  const content = atob((json.content || "").replace(/\n/g,""));
  return { data: JSON.parse(content), sha: json.sha };
}

async function githubPutFile(newData, sha, token){
  const api = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;

  const body = {
    message: "Update piggy.json via web",
    content: btoa(unescape(encodeURIComponent(JSON.stringify(newData, null, 2)))),
    sha
  };

  const res = await fetch(api,{
    method:"PUT",
    headers:{
      ...ghHeaders(token),
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  });

  if(!res.ok){
    throw new Error("Ошибка сохранения");
  }

  return await res.json();
}

// ================= TOKEN MODAL =================
function injectTokenModal(){
  if(document.getElementById("tokenWrap")) return;

  const style = document.createElement("style");
  style.textContent = `
    .tokenWrap{
      position:fixed; inset:0;
      background:rgba(0,0,0,.75);
      display:none; align-items:center; justify-content:center;
      z-index:9999;
    }
    .tokenWrap.open{display:flex;}
    .tokenBox{
      width:100%; max-width:420px;
      background:#121a2a;
      border:1px solid #2b3a55;
      border-radius:14px;
      padding:20px;
      box-shadow:0 20px 60px rgba(0,0,0,.6);
    }
    .tokenTitle{font-size:18px;font-weight:700;margin-bottom:14px;}
    .tokenInput{
      width:100%;
      padding:10px 12px;
      border-radius:10px;
      border:1px solid #2b3a55;
      background:#0f1624;
      color:#fff;
      margin-bottom:10px;
    }
    .tokenError{
      color:#c04b4b;
      font-size:13px;
      margin-bottom:10px;
      display:none;
    }
    .tokenBtns{
      display:flex; gap:10px; justify-content:flex-end;
    }
    .tokenBtn{
      padding:8px 14px;
      border-radius:10px;
      border:1px solid #2b3a55;
      background:#1e2a42;
      color:#fff;
      cursor:pointer;
    }
    .tokenBtn.primary{
      background:#3f5b87;
      border-color:#3f5b87;
    }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement("div");
  wrap.className="tokenWrap";
  wrap.id="tokenWrap";
  wrap.innerHTML=`
    <div class="tokenBox">
      <div class="tokenTitle">Введите GitHub токен</div>
      <input id="tokenInput" class="tokenInput" type="password" placeholder="github_pat_..." />
      <div id="tokenError" class="tokenError"></div>
      <div class="tokenBtns">
        <button id="tokenCancel" class="tokenBtn" type="button">Закрыть</button>
        <button id="tokenCheck" class="tokenBtn primary" type="button">Проверить</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
}

function openTokenModal(){
  injectTokenModal();
  document.getElementById("tokenWrap").classList.add("open");
}

function closeTokenModal(){
  document.getElementById("tokenWrap").classList.remove("open");
}

function showTokenError(msg){
  const e = document.getElementById("tokenError");
  e.textContent = msg;
  e.style.display="block";
}

async function askTokenAndValidate(){
  return new Promise((resolve)=>{
    openTokenModal();

    const input = document.getElementById("tokenInput");
    const okBtn = document.getElementById("tokenCheck");
    const cancelBtn = document.getElementById("tokenCancel");
    const error = document.getElementById("tokenError");

    error.style.display="none";
    input.value="";
    input.focus();

    okBtn.onclick = async ()=>{
      const token = input.value.trim();
      if(!token){
        showTokenError("Введите токен");
        return;
      }

      okBtn.disabled=true;
      okBtn.textContent="Проверяю...";

      try{
        await githubGetFile(token);
        closeTokenModal();
        resolve(token);
      }catch{
        showTokenError("Токен неверный или истёк");
      }finally{
        okBtn.disabled=false;
        okBtn.textContent="Проверить";
      }
    };

    cancelBtn.onclick = ()=>{
      closeTokenModal();
      resolve(null);
    };
  });
}

// ================= ACTION MODE =================
function setActionsMode(on){
  actionsMode=on;
  document.body.classList.toggle("actionsOn",on);
  if(actionsIconEdit && actionsIconDone){
    actionsIconEdit.style.display=on?"none":"block";
    actionsIconDone.style.display=on?"block":"none";
  }
}

actionsBtn?.addEventListener("click",()=>{
  setActionsMode(!actionsMode);
});

// ================= RENDER =================
function render(){
  grid.innerHTML="";
  if(!banks.length){
    empty.style.display="block";
    return;
  }
  empty.style.display="none";

  banks.forEach(b=>{
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`
      <div style="font-weight:700">${b.name}</div>
      <div>${money(b.balance)} ₽</div>
    `;
    grid.appendChild(card);
  });
}

// ================= SAVE BUTTON =================
saveGithubBtn?.addEventListener("click", async ()=>{
  const token = await askTokenAndValidate();
  if(!token) return;

  try{
    saveGithubBtn.disabled=true;
    saveGithubBtn.textContent="Сохраняю...";

    const cur = await githubGetFile(token);
    await githubPutFile({ banks }, cur.sha, token);

    alert("Сохранено");
  }catch(e){
    alert("Ошибка сохранения");
  }finally{
    saveGithubBtn.disabled=false;
    saveGithubBtn.textContent="Сохранить в GitHub";
  }
});

// ================= INIT =================
loadCache();
render();
