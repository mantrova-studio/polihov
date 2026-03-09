const $ = s => document.querySelector(s);
const fileInput = $('#fileInput'), uploadBtn = $('#uploadBtn'), cleanBtn = $('#cleanBtn'), clearBtn = $('#clearBtn'), downloadBtn = $('#downloadBtn'), copyBtn = $('#copyBtn'), inputText = $('#inputText'), outputText = $('#outputText'), statusText = $('#statusText');
let outputBlob = null;
uploadBtn.onclick = ()=> fileInput.click();
fileInput.onchange = async e => { const file = e.target.files[0]; if(!file) return; inputText.value = await file.text(); statusText.textContent = `Файл ${file.name} загружен.`; };
clearBtn.onclick = ()=> { inputText.value=''; outputText.value=''; outputBlob=null; downloadBtn.disabled=true; copyBtn.disabled=true; statusText.textContent='Поле очищено.'; };
copyBtn.onclick = async ()=> { if(!outputText.value) return; await navigator.clipboard.writeText(outputText.value); statusText.textContent='SVG скопирован.'; };
downloadBtn.onclick = ()=> { if(outputBlob) PDS.downloadBlob(outputBlob, 'cleaned.svg'); };
cleanBtn.onclick = ()=> {
  try{
    let svg = inputText.value.trim();
    if(!svg) throw new Error('Нет SVG для обработки.');
    svg = svg.replace(/<!--[\s\S]*?-->/g, '');
    svg = svg.replace(/>\s+</g, '><');
    svg = svg.replace(/\s{2,}/g, ' ');
    svg = svg.replace(/\s*(=)\s*/g, '$1');
    svg = svg.replace(/\?xml[\s\S]*?\?>/gi, '');
    svg = svg.trim();
    if(!svg.startsWith('<svg')) throw new Error('Похоже, это не SVG-код.');
    outputText.value = svg;
    outputBlob = new Blob([svg], {type:'image/svg+xml;charset=utf-8'});
    downloadBtn.disabled = false; copyBtn.disabled = false;
    statusText.textContent = 'SVG очищен.';
  }catch(e){
    outputText.value=''; outputBlob=null; downloadBtn.disabled=true; copyBtn.disabled=true; statusText.textContent = `Ошибка: ${e.message}`;
  }
};
