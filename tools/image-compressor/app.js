const $ = (s) => document.querySelector(s);
const fileInput = $('#fileInput'), chooseBtn = $('#chooseBtn'), startBtn = $('#startBtn'), clearBtn = $('#clearBtn');
const dropzone = $('#dropzone'), fileTable = $('#fileTable'), previewGrid = $('#previewGrid');
const countValue = $('#countValue'), inputSizeValue = $('#inputSizeValue'), savingValue = $('#savingValue');
const progressBar = $('#progressBar'), progressText = $('#progressText'), progressLabel = $('#progressLabel'), statusText = $('#statusText');
const maxWidthInput = $('#maxWidth'), maxHeightInput = $('#maxHeight'), qualityInput = $('#quality'), formatInput = $('#format'), zipNameInput = $('#zipName');
let files = [], working = false;

chooseBtn.onclick = () => fileInput.click();
dropzone.onclick = () => fileInput.click();
fileInput.onchange = e => setFiles([...e.target.files]);
clearBtn.onclick = clearAll; startBtn.onclick = run;
['dragover','dragenter'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('dragover'); }));
['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); if(evt==='drop') setFiles([...e.dataTransfer.files].filter(f=>f.type.startsWith('image/'))); dropzone.classList.remove('dragover'); }));

function setFiles(next){
  files = next.filter(f => ['image/jpeg','image/png','image/webp'].includes(f.type));
  countValue.textContent = files.length;
  inputSizeValue.textContent = PDS.bytes(files.reduce((a,b)=>a+b.size,0));
  startBtn.disabled = files.length === 0; clearBtn.disabled = files.length === 0;
  savingValue.textContent = '—'; progress(0); progressLabel.textContent = files.length ? 'Файлы готовы к обработке' : 'Ожидание загрузки файлов';
  statusText.textContent = files.length ? `Выбрано файлов: ${files.length}` : 'Файлы не выбраны.';
  renderRows(); renderPreviews();
}
function clearAll(){ if(working) return; files=[]; fileInput.value=''; setFiles([]); }
function progress(v){ progressBar.style.width = `${v}%`; progressText.textContent = `${v}%`; }
function renderRows(results=[]){
  const rows = results.length ? results : files.map(f => ({name:f.name, original:f.size, current:null, status:'Ожидание', error:false}));
  fileTable.innerHTML = `<div class="table-head"><div>Файл</div><div>Исходный</div><div>После</div><div>Статус</div></div>` + (rows.length ? rows.map(r => `<div class="table-row"><div class="name-ellipsis">${PDS.escape(r.name)}</div><div>${PDS.bytes(r.original)}</div><div>${r.current ? PDS.bytes(r.current) : '—'}</div><div class="${r.error ? 'err':'ok'}">${r.status}</div></div>`).join('') : `<div class="table-row"><div>Пока нет файлов</div><div>—</div><div>—</div><div>—</div></div>`);
}
function renderPreviews(){
  previewGrid.innerHTML = files.slice(0,6).map(file => `<div class="preview-card"><img src="${URL.createObjectURL(file)}" alt="" /><div class="title">${PDS.escape(file.name)}</div><div class="meta">${PDS.bytes(file.size)}</div></div>`).join('');
}
async function compress(file, opts){
  const img = await PDS.loadImage(file);
  const size = PDS.fitSize(img.naturalWidth || img.width, img.naturalHeight || img.height, opts.maxWidth, opts.maxHeight, false);
  const canvas = document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height;
  const ctx = canvas.getContext('2d', { alpha:true }); ctx.drawImage(img,0,0,size.width,size.height);
  return await PDS.canvasToBlob(canvas, opts.format, opts.format === 'image/png' ? undefined : opts.quality);
}
async function run(){
  if(working || !files.length) return;
  working = true; startBtn.disabled = true; clearBtn.disabled = true;
  const opts = {
    maxWidth: PDS.clamp(parseInt(maxWidthInput.value,10) || 1200, 100, 5000),
    maxHeight: PDS.clamp(parseInt(maxHeightInput.value,10) || 1200, 100, 5000),
    quality: PDS.clamp(parseInt(qualityInput.value,10) || 75, 1, 100) / 100,
    format: formatInput.value
  };
  const ext = PDS.extByMime(opts.format), zipName = PDS.sanitize(zipNameInput.value.trim() || 'compressed-images');
  const zip = new JSZip(); const results=[]; let totalIn=0, totalOut=0;
  progressLabel.textContent = 'Идёт обработка';
  for(let i=0;i<files.length;i++){
    const file = files[i]; totalIn += file.size; statusText.textContent = `Обработка ${i+1} из ${files.length}: ${file.name}`;
    try{
      const blob = await compress(file, opts); totalOut += blob.size;
      const finalName = `${PDS.sanitize(PDS.baseName(file.name))}.${ext}`;
      zip.file(finalName, blob);
      results.push({name:file.name, original:file.size, current:blob.size, status:'Готово', error:false});
    }catch(e){ results.push({name:file.name, original:file.size, current:null, status:'Ошибка', error:true}); }
    renderRows(results); progress(Math.round(((i+1)/files.length)*100));
  }
  try{
    progressLabel.textContent = 'Формирование ZIP'; statusText.textContent = 'Собираю архив...';
    const zipBlob = await zip.generateAsync({type:'blob'}, meta => progress(Math.round(meta.percent)));
    PDS.downloadBlob(zipBlob, `${zipName}.zip`);
    const saved = totalIn - totalOut; savingValue.textContent = totalIn > 0 ? `${Math.round((saved / totalIn) * 100)}%` : '0%';
    progressLabel.textContent = 'Готово'; statusText.textContent = `Архив ${zipName}.zip скачан.`;
  } finally { working = false; startBtn.disabled = false; clearBtn.disabled = false; }
}
renderRows();
