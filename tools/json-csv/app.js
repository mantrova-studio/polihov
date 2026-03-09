const $ = s => document.querySelector(s);
const directionInput = $('#direction'), fileNameInput = $('#fileName'), fileInput = $('#fileInput'), uploadBtn = $('#uploadBtn'), convertBtn = $('#convertBtn'), clearBtn = $('#clearBtn'), downloadBtn = $('#downloadBtn'), copyBtn = $('#copyBtn'), inputText = $('#inputText'), outputText = $('#outputText'), statusText = $('#statusText');
let outputBlob = null, outputExt = 'txt';
uploadBtn.onclick = ()=> fileInput.click();
fileInput.onchange = async e => { const file = e.target.files[0]; if(!file) return; inputText.value = await file.text(); statusText.textContent = `Файл ${file.name} загружен.`; };
clearBtn.onclick = ()=> { inputText.value=''; outputText.value=''; outputBlob=null; downloadBtn.disabled=true; copyBtn.disabled=true; statusText.textContent='Очищено.'; fileInput.value=''; };
copyBtn.onclick = async ()=> { if(!outputText.value) return; await navigator.clipboard.writeText(outputText.value); statusText.textContent='Результат скопирован.'; };
downloadBtn.onclick = ()=> { if(outputBlob) PDS.downloadBlob(outputBlob, `${PDS.sanitize(fileNameInput.value.trim() || 'converted-data')}.${outputExt}`); };
convertBtn.onclick = ()=> {
  try{
    const dir = directionInput.value;
    if(!inputText.value.trim()) throw new Error('Нет входных данных для конвертации.');
    if(dir === 'json-to-csv'){
      const parsed = JSON.parse(inputText.value);
      if(!Array.isArray(parsed)) throw new Error('Для JSON → CSV нужен массив объектов.');
      const keys = [...new Set(parsed.flatMap(obj => Object.keys(obj)))];
      const rows = [keys, ...parsed.map(obj => keys.map(k => obj[k] ?? ''))];
      const csv = PDS.csvStringify(rows);
      outputText.value = csv; outputBlob = new Blob([csv], {type:'text/csv;charset=utf-8'}); outputExt = 'csv';
      statusText.textContent = 'Конвертация JSON → CSV выполнена.';
    } else {
      const rows = PDS.csvParse(inputText.value);
      if(rows.length < 1) throw new Error('CSV пустой или повреждён.');
      const headers = rows[0];
      const result = rows.slice(1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])));
      const json = JSON.stringify(result, null, 2);
      outputText.value = json; outputBlob = new Blob([json], {type:'application/json;charset=utf-8'}); outputExt = 'json';
      statusText.textContent = 'Конвертация CSV → JSON выполнена.';
    }
    downloadBtn.disabled = false; copyBtn.disabled = false;
  }catch(e){
    outputText.value=''; outputBlob=null; downloadBtn.disabled=true; copyBtn.disabled=true; statusText.textContent = `Ошибка: ${e.message}`;
  }
};
