Да, давай крутилку. Вот полный код моего js, вставь туда и пришли готовый.

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

// если Pages пусто — грузим из кеша  
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

// по умолчанию кнопки скрыты
setActionsMode(false);

render();
})();
