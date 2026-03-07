const fileInput = document.getElementById("fileInput");
const chooseBtn = document.getElementById("chooseBtn");
const compressBtn = document.getElementById("compressBtn");
const clearBtn = document.getElementById("clearBtn");
const dropzone = document.getElementById("dropzone");
const fileList = document.getElementById("fileList");

const countValue = document.getElementById("countValue");
const totalInputValue = document.getElementById("totalInputValue");
const savingValue = document.getElementById("savingValue");

const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const progressLabel = document.getElementById("progressLabel");
const statusText = document.getElementById("statusText");

const maxWidthInput = document.getElementById("maxWidth");
const maxHeightInput = document.getElementById("maxHeight");
const qualityInput = document.getElementById("quality");
const formatInput = document.getElementById("format");
const zipNameInput = document.getElementById("zipName");

let selectedFiles = [];
let isProcessing = false;

chooseBtn.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  setFiles([...e.target.files]);
});

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const files = [...e.dataTransfer.files].filter(file => file.type.startsWith("image/"));
  setFiles(files);
});

clearBtn.addEventListener("click", clearAll);
compressBtn.addEventListener("click", compressAndDownload);

function setFiles(files) {
  selectedFiles = files.filter(file =>
    ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type)
  );

  updateStats();
  renderFileList();
  resetProgress();

  compressBtn.disabled = selectedFiles.length === 0;
  clearBtn.disabled = selectedFiles.length === 0;

  if (selectedFiles.length > 0) {
    statusText.textContent = `Выбрано файлов: ${selectedFiles.length}. Можно запускать сжатие.`;
    progressLabel.textContent = "Файлы готовы к обработке";
  } else {
    statusText.textContent = "Не выбрано ни одного подходящего изображения.";
    progressLabel.textContent = "Ожидание загрузки файлов";
  }
}

function clearAll() {
  if (isProcessing) return;

  selectedFiles = [];
  fileInput.value = "";
  updateStats();
  renderFileList();
  resetProgress();

  compressBtn.disabled = true;
  clearBtn.disabled = true;
  statusText.textContent = "Список очищен.";
  progressLabel.textContent = "Ожидание загрузки файлов";
  savingValue.textContent = "—";
}

function updateStats() {
  countValue.textContent = selectedFiles.length;
  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  totalInputValue.textContent = formatBytes(totalBytes);
}

function renderFileList(results = null) {
  const header = `
    <div class="list-head">
      <div>Файл</div>
      <div>Исходный</div>
      <div>После</div>
      <div>Статус</div>
    </div>
  `;

  if (selectedFiles.length === 0) {
    fileList.innerHTML = header + `
      <div class="file-row">
        <div class="file-name">Пока нет загруженных файлов</div>
        <div>—</div>
        <div>—</div>
        <div>—</div>
      </div>
    `;
    return;
  }

  if (!results) {
    fileList.innerHTML = header + selectedFiles.map(file => `
      <div class="file-row">
        <div class="file-name">${escapeHtml(file.name)}</div>
        <div>${formatBytes(file.size)}</div>
        <div>—</div>
        <div>Ожидание</div>
      </div>
    `).join("");
    return;
  }

  fileList.innerHTML = header + results.map(item => `
    <div class="file-row">
      <div class="file-name">${escapeHtml(item.originalName)}</div>
      <div>${formatBytes(item.originalSize)}</div>
      <div>${item.newSize ? formatBytes(item.newSize) : "—"}</div>
      <div class="${item.error ? "err" : "ok"}">${item.error ? "Ошибка" : "Готово"}</div>
    </div>
  `).join("");
}

function resetProgress() {
  progressBar.style.width = "0%";
  progressText.textContent = "0%";
}

async function compressAndDownload() {
  if (isProcessing || selectedFiles.length === 0) return;

  isProcessing = true;
  compressBtn.disabled = true;
  clearBtn.disabled = true;

  const maxWidth = clamp(parseInt(maxWidthInput.value, 10) || 1200, 100, 5000);
  const maxHeight = clamp(parseInt(maxHeightInput.value, 10) || 1200, 100, 5000);
  const quality = clamp(parseInt(qualityInput.value, 10) || 75, 1, 100);
  const format = getOutputFormat(formatInput.value);
  const extension = getExtensionByFormat(format);
  const zipName = sanitizeFileName(zipNameInput.value.trim() || "compressed-images");

  const zip = new JSZip();
  const results = [];

  let totalOriginal = 0;
  let totalCompressed = 0;

  progressLabel.textContent = "Идёт обработка изображений";
  statusText.textContent = "Подготовка к сжатию...";
  renderFileList();

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    totalOriginal += file.size;

    try {
      statusText.textContent = `Обработка ${i + 1} из ${selectedFiles.length}: ${file.name}`;

      const blob = await compressImage(file, {
        maxWidth,
        maxHeight,
        quality: quality / 100,
        format
      });

      totalCompressed += blob.size;

      const baseName = getBaseName(file.name);
      const finalName = `${sanitizeFileName(baseName)}.${extension}`;

      zip.file(finalName, blob);

      results.push({
        originalName: file.name,
        originalSize: file.size,
        newSize: blob.size,
        error: false
      });
    } catch (error) {
      console.error("Ошибка обработки файла:", file.name, error);

      results.push({
        originalName: file.name,
        originalSize: file.size,
        newSize: 0,
        error: true
      });
    }

    renderFileList(results);

    const percent = Math.round(((i + 1) / selectedFiles.length) * 100);
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
  }

  try {
    statusText.textContent = "Сборка ZIP-архива...";
    progressLabel.textContent = "Формирование архива";

    const zipBlob = await zip.generateAsync(
      { type: "blob" },
      (metadata) => {
        const current = Math.round(metadata.percent);
        progressBar.style.width = `${current}%`;
        progressText.textContent = `${current}%`;
      }
    );

    downloadBlob(zipBlob, `${zipName}.zip`);

    const saved = totalOriginal - totalCompressed;
    const savingPercent = totalOriginal > 0
      ? Math.round((saved / totalOriginal) * 100)
      : 0;

    savingValue.textContent = `${savingPercent}%`;
    progressLabel.textContent = "Готово";
    statusText.textContent = `Обработка завершена. Архив ${zipName}.zip скачан.`;
  } catch (error) {
    console.error(error);
    progressLabel.textContent = "Ошибка";
    statusText.textContent = "Не удалось собрать ZIP-архив.";
  } finally {
    isProcessing = false;
    compressBtn.disabled = false;
    clearBtn.disabled = false;
  }
}

async function compressImage(file, options) {
  const sourceImage = await loadImageFromFile(file);
  const fixedCanvas = applyExifOrientation(sourceImage);
  const fitted = fitSize(fixedCanvas.width, fixedCanvas.height, options.maxWidth, options.maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width = fitted.width;
  canvas.height = fitted.height;

  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.drawImage(fixedCanvas, 0, 0, fitted.width, fitted.height);

  return new Promise((resolve, reject) => {
    if (options.format === "image/png") {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Не удалось создать PNG blob"));
          return;
        }
        resolve(blob);
      }, "image/png");
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Не удалось создать blob"));
        return;
      }
      resolve(blob);
    }, options.format, options.quality);
  });
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Не удалось загрузить изображение"));
    };

    img.src = objectUrl;
  });
}

function applyExifOrientation(img) {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  return canvas;
}

function fitSize(width, height, maxWidth, maxHeight) {
  let newWidth = width;
  let newHeight = height;

  if (newWidth > maxWidth) {
    const ratio = maxWidth / newWidth;
    newWidth = maxWidth;
    newHeight = Math.round(newHeight * ratio);
  }

  if (newHeight > maxHeight) {
    const ratio = maxHeight / newHeight;
    newHeight = maxHeight;
    newWidth = Math.round(newWidth * ratio);
  }

  return {
    width: newWidth,
    height: newHeight
  };
}

function getOutputFormat(value) {
  if (value === "image/jpeg") return "image/jpeg";
  if (value === "image/png") return "image/png";
  return "image/webp";
}

function getExtensionByFormat(format) {
  if (format === "image/jpeg") return "jpg";
  if (format === "image/png") return "png";
  return "webp";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function getBaseName(name) {
  const parts = name.split(".");
  if (parts.length === 1) return name;
  parts.pop();
  return parts.join(".");
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let value = bytes;

  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }

  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function sanitizeFileName(str) {
  return str
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/^[-]+|[-]+$/g, "") || "file";
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}