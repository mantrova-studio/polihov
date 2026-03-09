window.PDS = {
  bytes(bytes){
    if (!bytes || bytes <= 0) return '0 KB';
    const units = ['B','KB','MB','GB'];
    let i = 0, v = bytes;
    while (v >= 1024 && i < units.length - 1){ v /= 1024; i++; }
    return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
  },
  clamp(num,min,max){ return Math.min(Math.max(num,min),max); },
  baseName(name){ const p = name.split('.'); if (p.length === 1) return name; p.pop(); return p.join('.'); },
  extByMime(m){ if (m === 'image/jpeg') return 'jpg'; if (m === 'image/png') return 'png'; if (m === 'image/webp') return 'webp'; return 'bin'; },
  sanitize(name){
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^\.+/,'').replace(/^[-]+|[-]+$/g,'') || 'file';
  },
  escape(str){
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  },
  downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  },
  fitSize(width,height,maxWidth,maxHeight,allowUpscale=false){
    let w = width, h = height;
    if (!allowUpscale && w <= maxWidth && h <= maxHeight) return { width:w, height:h };
    const wr = maxWidth / w;
    const hr = maxHeight / h;
    const ratio = Math.min(wr, hr);
    return { width: Math.max(1, Math.round(w * ratio)), height: Math.max(1, Math.round(h * ratio)) };
  },
  async loadImage(file){
    const img = new Image();
    const url = URL.createObjectURL(file);
    return new Promise((resolve,reject)=>{
      img.onload = ()=>{ URL.revokeObjectURL(url); resolve(img); };
      img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error('Не удалось загрузить изображение')); };
      img.src = url;
    });
  },
  async fileToText(file){ return await file.text(); },
  async canvasToBlob(canvas, mime, quality){
    return new Promise((resolve,reject)=>{
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось создать blob')), mime, quality);
    });
  },
  csvParse(text){
    const rows=[]; let row=[]; let value=''; let i=0; let inQuotes=false;
    while(i<text.length){
      const ch=text[i], next=text[i+1];
      if(inQuotes){
        if(ch==='"' && next==='"'){ value+='"'; i+=2; continue; }
        if(ch==='"'){ inQuotes=false; i++; continue; }
        value+=ch; i++; continue;
      }
      if(ch==='"'){ inQuotes=true; i++; continue; }
      if(ch===','){ row.push(value); value=''; i++; continue; }
      if(ch==='\n'){
        row.push(value); rows.push(row); row=[]; value=''; i++; continue;
      }
      if(ch==='\r'){ i++; continue; }
      value+=ch; i++;
    }
    row.push(value); rows.push(row);
    return rows.filter(r => !(r.length === 1 && r[0] === ''));
  },
  csvStringify(rows){
    return rows.map(row => row.map(val => {
      const s = String(val ?? '');
      if(/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
      return s;
    }).join(',')).join('\n');
  }
};
