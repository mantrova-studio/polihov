const PASSWORD = "1234";

const loginWrap = document.getElementById("loginWrap");
const loginPass = document.getElementById("loginPass");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

const addBtn = document.getElementById("addBtn");
const removeBtn = document.getElementById("removeBtn");
const createBtn = document.getElementById("createBtn");

const formWrap = document.getElementById("formWrap");
const amountInput = document.getElementById("amountInput");
const confirmBtn = document.getElementById("confirmBtn");

let balance = Number(localStorage.getItem("balance")) || 0;
let goal = Number(localStorage.getItem("goal")) || 10000;
let mode = "add";

function updateUI(){
  const percent = goal ? Math.min(100, (balance/goal)*100) : 0;
  progressFill.style.width = percent + "%";
  progressText.textContent = balance + " ₽";
}

updateUI();

loginBtn.onclick = () => {
  if(loginPass.value === PASSWORD){
    loginWrap.style.display = "none";
  } else {
    loginError.style.display = "block";
  }
};

addBtn.onclick = () => {
  mode = "add";
  formWrap.style.display = "block";
};

removeBtn.onclick = () => {
  mode = "remove";
  formWrap.style.display = "block";
};

createBtn.onclick = () => {
  const name = prompt("Название копилки:");
  const sum = prompt("Цель (можно пусто):");
  if(sum) goal = Number(sum);
  localStorage.setItem("goal", goal);
  updateUI();
};

confirmBtn.onclick = () => {
  const val = Number(amountInput.value);
  if(!val) return;

  if(mode === "add") balance += val;
  else balance -= val;

  localStorage.setItem("balance", balance);
  updateUI();

  amountInput.value = "";
  formWrap.style.display = "none";
};
