const toolDefs = [
  [1,'Изображения','Image Compressor','Сжатие изображений в JPG / PNG / WEBP'],
  [2,'Изображения','Image Converter','Конвертация изображений между форматами'],
  [3,'Изображения','Image Resizer','Изменение размеров изображений'],
  [4,'Изображения','Batch Image Converter','Пакетная конвертация изображений в ZIP'],
  [5,'Изображения','Image Cropper','Центральная обрезка изображения'],
  [6,'Изображения','Image Watermark','Наложение текстового водяного знака'],
  [7,'Изображения','Image Rename','Массовое переименование файлов'],
  [8,'Изображения','Image Metadata Viewer','Просмотр базовых метаданных файла и картинки'],
  [9,'Изображения','Image Metadata Remover','Удаление метаданных путём пересохранения'],
  [10,'Данные','JSON Formatter','Форматирование JSON'],
  [11,'Данные','JSON Validator','Проверка валидности JSON'],
  [12,'Данные','JSON → CSV','Конвертация JSON массива объектов в CSV'],
  [13,'Данные','CSV → JSON','Конвертация CSV в JSON'],
  [14,'Данные','JSON → Table','Визуальная таблица из JSON'],
  [15,'Данные','Base64 Encoder / Decoder','Кодирование и декодирование Base64'],
  [16,'Данные','URL Encoder / Decoder','Кодирование и декодирование URL'],
  [17,'Данные','HTML Escape / Unescape','Экранирование HTML'],
  [18,'Код','HTML Minifier','Минификация HTML'],
  [19,'Код','CSS Minifier','Минификация CSS'],
  [20,'Код','JS Minifier','Минификация JavaScript'],
  [21,'Код','CSS Beautifier','Форматирование CSS'],
  [22,'Код','JS Beautifier','Форматирование JavaScript'],
  [23,'Код','SVG Optimizer','Очистка и минификация SVG'],
  [24,'Код','Regex Tester','Проверка регулярных выражений'],
  [25,'Дизайн','Color Converter','HEX ↔ RGB ↔ HSL'],
  [26,'Дизайн','Color Palette Generator','Палитра на основе цвета'],
  [27,'Дизайн','Gradient Generator','CSS gradient генератор'],
  [28,'Дизайн','Shadow Generator','Генератор box-shadow'],
  [29,'Дизайн','Border Radius Generator','Генератор border-radius'],
  [30,'Дизайн','Glassmorphism Generator','Генератор glassmorphism CSS'],
  [31,'Дизайн','CSS Grid Generator','Генератор grid layout CSS'],
  [32,'Файлы','ZIP Creator','Создание ZIP-архива из файлов'],
  [33,'Файлы','File Size Calculator','Подсчёт суммарного размера файлов'],
  [34,'Файлы','File Type Detector','Определение расширения и MIME'],
  [35,'Файлы','Folder Structure Generator','Генерация дерева папок из списка путей'],
  [36,'Текст','Text Case Converter','UPPER / lower / Title / Sentence'],
  [37,'Текст','Remove Duplicate Lines','Удаление повторяющихся строк'],
  [38,'Текст','Word Counter','Подсчёт слов, символов, абзацев'],
  [39,'Текст','Random Text Generator','Генератор случайного текста'],
  [40,'Текст','UUID Generator','Генератор UUID'],
  [41,'SEO','Meta Tag Generator','Генерация базовых meta tags'],
  [42,'SEO','Open Graph Generator','Генерация Open Graph meta tags'],
  [43,'SEO','Favicon Generator','Генерация favicon PNG из изображения'],
  [44,'SEO','Sitemap Generator','Генерация sitemap.xml'],
  [45,'SEO','Robots.txt Generator','Генерация robots.txt'],
  [46,'Безопасность','Password Generator','Генератор паролей'],
  [47,'Безопасность','Hash Generator','MD5 / SHA-256 / SHA-512'],
  [48,'Безопасность','JWT Decoder','Декодирование JWT payload'],
  [49,'Безопасность','Checksum Generator','CRC32 для текста и файлов']
];

const categories = [...new Set(toolDefs.map(t => t[1]))];
const nav = document.getElementById('toolNav');
const toolsContainer = document.getElementById('toolsContainer');
const toolSearch = document.getElementById('toolSearch');

function renderNav(){
  nav.innerHTML = categories.map(cat => {
    const items = toolDefs.filter(t => t[1] === cat).map(([id,,name]) => `<button class="nav-btn" data-target="tool-${id}">${id}. ${name}</button>`).join('');
    return `<div class="nav-group"><h3>${cat}</h3>${items}</div>`;
  }).join('');
  nav.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.target)?.scrollIntoView({behavior:'smooth', block:'start'});
      nav.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function card(id,name,desc,body){
  return `<section class="tool-card" id="tool-${id}" data-search="${(name+' '+desc).toLowerCase()}">
    <div class="tool-head"><div><h3>${id}. ${name}</h3><p>${desc}</p></div><div class="tool-id">TOOL ${id}</div></div>
    <div class="tool-body">${body}</div></section>`;
}

function renderTools(){
  const html = [];
  html.push(card(1,'Image Compressor','Сжимает выбранные изображения и скачивает ZIP.',`
    <div class="panel"><h4>Входные файлы</h4><input id="imgCompressFiles" type="file" accept="image/*" multiple><div class="grid-3"><input id="imgCompressW" type="number" value="1200" placeholder="Макс. ширина"><input id="imgCompressH" type="number" value="1200" placeholder="Макс. высота"><input id="imgCompressQ" type="number" value="75" min="1" max="100" placeholder="Качество"></div><div class="grid-2"><select id="imgCompressFormat"><option value="image/webp">WEBP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select><input id="imgCompressZipName" value="compressed-images" placeholder="Имя архива"></div><div class="row"><button class="btn btn-primary" id="imgCompressRun">Сжать и скачать ZIP</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="imgCompressOut" class="output">Готов к обработке.</div><div id="imgCompressPreview" class="preview-grid"></div></div>`));
  html.push(card(2,'Image Converter','Конвертирует изображения в выбранный формат.',`
    <div class="panel"><h4>Конвертация</h4><input id="imgConvertFiles" type="file" accept="image/*" multiple><div class="grid-2"><select id="imgConvertFormat"><option value="image/webp">WEBP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select><input id="imgConvertQuality" type="number" value="90" min="1" max="100"></div><div class="row"><button class="btn btn-primary" id="imgConvertRun">Конвертировать и скачать ZIP</button></div></div>
    <div class="panel"><h4>Статус</h4><div id="imgConvertOut" class="output">Ожидание файлов.</div></div>`));
  html.push(card(3,'Image Resizer','Меняет размеры изображений без смены формата по умолчанию.',`
    <div class="panel"><h4>Размеры</h4><input id="imgResizeFiles" type="file" accept="image/*" multiple><div class="grid-2"><input id="imgResizeW" type="number" value="800" placeholder="Ширина"><input id="imgResizeH" type="number" value="800" placeholder="Высота"></div><label class="inline"><input type="checkbox" id="imgResizeKeep" checked> Сохранять пропорции</label><div class="row"><button class="btn btn-primary" id="imgResizeRun">Изменить размер</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="imgResizeOut" class="output">Выбери изображения.</div></div>`));
  html.push(card(4,'Batch Image Converter','Пакетная конвертация большого набора изображений.',`
    <div class="panel"><h4>Пакетная обработка</h4><input id="batchConvertFiles" type="file" accept="image/*" multiple><div class="grid-3"><select id="batchConvertFormat"><option value="image/webp">WEBP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select><input id="batchConvertQuality" type="number" value="80" min="1" max="100"><input id="batchConvertPrefix" value="batch-" placeholder="Префикс"></div><div class="row"><button class="btn btn-primary" id="batchConvertRun">Создать ZIP</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="batchConvertOut" class="output">Пакетная конвертация ещё не запускалась.</div></div>`));
  html.push(card(5,'Image Cropper','Центральная обрезка до заданного размера.',`
    <div class="panel"><h4>Обрезка</h4><input id="cropFile" type="file" accept="image/*"><div class="grid-2"><input id="cropW" type="number" value="600"><input id="cropH" type="number" value="600"></div><div class="row"><button class="btn btn-primary" id="cropRun">Обрезать</button><button class="btn btn-secondary" id="cropDownload">Скачать PNG</button></div></div>
    <div class="panel"><h4>Превью</h4><div class="canvas-wrap"><canvas id="cropCanvas"></canvas></div><div id="cropOut" class="output small">Нет изображения.</div></div>`));
  html.push(card(6,'Image Watermark','Добавляет текстовый водяной знак на изображение.',`
    <div class="panel"><h4>Параметры</h4><input id="wmFile" type="file" accept="image/*"><div class="grid-2"><input id="wmText" value="POLIHOV DEV STUDIO"><input id="wmSize" type="number" value="42"></div><div class="grid-2"><select id="wmPosition"><option value="br">Право-низ</option><option value="bl">Лево-низ</option><option value="tr">Право-верх</option><option value="tl">Лево-верх</option><option value="center">Центр</option></select><input id="wmOpacity" type="number" value="0.35" step="0.05"></div><div class="row"><button class="btn btn-primary" id="wmRun">Применить</button><button class="btn btn-secondary" id="wmDownload">Скачать PNG</button></div></div>
    <div class="panel"><h4>Превью</h4><div class="canvas-wrap"><canvas id="wmCanvas"></canvas></div><div id="wmOut" class="output small">Нет изображения.</div></div>`));
  html.push(card(7,'Image Rename','Массовое переименование файлов по шаблону.',`
    <div class="panel"><h4>Файлы</h4><input id="renameFiles" type="file" multiple><div class="grid-3"><input id="renamePrefix" value="image-"><input id="renameStart" type="number" value="1"><input id="renameDigits" type="number" value="3"></div><div class="row"><button class="btn btn-primary" id="renameRun">Переименовать и скачать ZIP</button></div></div>
    <div class="panel"><h4>Предпросмотр</h4><div id="renameOut" class="output">Список новых имён появится здесь.</div></div>`));
  html.push(card(8,'Image Metadata Viewer','Показывает имя, размер, тип, размеры изображения и дату.',`
    <div class="panel"><h4>Выбор файла</h4><input id="metaFile" type="file" accept="image/*"></div>
    <div class="panel"><h4>Метаданные</h4><div id="metaOut" class="output">Нет файла.</div></div>`));
  html.push(card(9,'Image Metadata Remover','Пересохраняет картинку через canvas без исходных метаданных.',`
    <div class="panel"><h4>Удаление метаданных</h4><input id="metaRemoveFile" type="file" accept="image/*"><div class="grid-2"><select id="metaRemoveFormat"><option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WEBP</option></select><input id="metaRemoveQuality" type="number" min="1" max="100" value="90"></div><div class="row"><button class="btn btn-primary" id="metaRemoveRun">Очистить и скачать</button></div></div>
    <div class="panel"><h4>Статус</h4><div id="metaRemoveOut" class="output">Ожидание файла.</div></div>`));

  html.push(card(10,'JSON Formatter','Форматирует JSON.',`
    <div class="panel"><h4>Вход</h4><textarea id="jsonFormatIn" placeholder='{"name":"test"}'></textarea><div class="row"><button class="btn btn-primary" id="jsonFormatRun">Форматировать</button></div></div>
    <div class="panel"><h4>Выход</h4><div id="jsonFormatOut" class="output"></div></div>`));
  html.push(card(11,'JSON Validator','Проверка JSON.',`
    <div class="panel"><h4>JSON</h4><textarea id="jsonValidateIn"></textarea><div class="row"><button class="btn btn-primary" id="jsonValidateRun">Проверить</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="jsonValidateOut" class="output"></div></div>`));
  html.push(card(12,'JSON → CSV','JSON массива объектов в CSV.',`
    <div class="panel"><h4>JSON</h4><textarea id="jsonCsvIn" placeholder='[{"name":"A","price":10}]'></textarea><div class="row"><button class="btn btn-primary" id="jsonCsvRun">Конвертировать</button><button class="btn btn-secondary" id="jsonCsvDownload">Скачать CSV</button></div></div>
    <div class="panel"><h4>CSV</h4><div id="jsonCsvOut" class="output"></div></div>`));
  html.push(card(13,'CSV → JSON','CSV в JSON массив.',`
    <div class="panel"><h4>CSV</h4><textarea id="csvJsonIn" placeholder='name,price\nA,10'></textarea><div class="row"><button class="btn btn-primary" id="csvJsonRun">Конвертировать</button></div></div>
    <div class="panel"><h4>JSON</h4><div id="csvJsonOut" class="output"></div></div>`));
  html.push(card(14,'JSON → Table','Визуальная таблица из JSON массива.',`
    <div class="panel"><h4>JSON</h4><textarea id="jsonTableIn"></textarea><div class="row"><button class="btn btn-primary" id="jsonTableRun">Показать таблицу</button></div></div>
    <div class="panel"><h4>Таблица</h4><div id="jsonTableOut" class="table-wrap"></div></div>`));
  html.push(card(15,'Base64 Encoder / Decoder','Кодирует и декодирует текст Base64.',`
    <div class="panel"><h4>Текст</h4><textarea id="base64In"></textarea><div class="row"><button class="btn btn-primary" id="base64Encode">Encode</button><button class="btn btn-secondary" id="base64Decode">Decode</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="base64Out" class="output"></div></div>`));
  html.push(card(16,'URL Encoder / Decoder','Работа с URL encoding.',`
    <div class="panel"><h4>Текст</h4><textarea id="urlIn"></textarea><div class="row"><button class="btn btn-primary" id="urlEncode">Encode</button><button class="btn btn-secondary" id="urlDecode">Decode</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="urlOut" class="output"></div></div>`));
  html.push(card(17,'HTML Escape / Unescape','Экранирует HTML-символы и возвращает обратно.',`
    <div class="panel"><h4>Текст</h4><textarea id="htmlEscIn"></textarea><div class="row"><button class="btn btn-primary" id="htmlEscape">Escape</button><button class="btn btn-secondary" id="htmlUnescape">Unescape</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="htmlEscOut" class="output"></div></div>`));

  html.push(card(18,'HTML Minifier','Минификация HTML без тяжёлого парсера.',`
    <div class="panel"><h4>HTML</h4><textarea id="htmlMinIn"></textarea><div class="row"><button class="btn btn-primary" id="htmlMinRun">Минифицировать</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="htmlMinOut" class="output"></div></div>`));
  html.push(card(19,'CSS Minifier','Минификация CSS.',`
    <div class="panel"><h4>CSS</h4><textarea id="cssMinIn"></textarea><div class="row"><button class="btn btn-primary" id="cssMinRun">Минифицировать</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="cssMinOut" class="output"></div></div>`));
  html.push(card(20,'JS Minifier','Минификация JavaScript.',`
    <div class="panel"><h4>JS</h4><textarea id="jsMinIn"></textarea><div class="row"><button class="btn btn-primary" id="jsMinRun">Минифицировать</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="jsMinOut" class="output"></div></div>`));
  html.push(card(21,'CSS Beautifier','Форматирование CSS.',`
    <div class="panel"><h4>CSS</h4><textarea id="cssPrettyIn"></textarea><div class="row"><button class="btn btn-primary" id="cssPrettyRun">Форматировать</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="cssPrettyOut" class="output"></div></div>`));
  html.push(card(22,'JS Beautifier','Форматирование JavaScript.',`
    <div class="panel"><h4>JS</h4><textarea id="jsPrettyIn"></textarea><div class="row"><button class="btn btn-primary" id="jsPrettyRun">Форматировать</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="jsPrettyOut" class="output"></div></div>`));
  html.push(card(23,'SVG Optimizer','Удаляет комментарии и лишние пробелы.',`
    <div class="panel"><h4>SVG</h4><textarea id="svgOptIn"></textarea><div class="row"><button class="btn btn-primary" id="svgOptRun">Оптимизировать</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="svgOptOut" class="output"></div></div>`));
  html.push(card(24,'Regex Tester','Тестирует регулярные выражения.',`
    <div class="panel"><h4>Параметры</h4><input id="regexPattern" placeholder="pattern"><input id="regexFlags" placeholder="flags, например gi"><textarea id="regexText" placeholder="Текст для поиска"></textarea><div class="row"><button class="btn btn-primary" id="regexRun">Найти</button></div></div>
    <div class="panel"><h4>Совпадения</h4><div id="regexOut" class="output"></div></div>`));

  html.push(card(25,'Color Converter','Преобразует цвет между HEX, RGB и HSL.',`
    <div class="panel"><h4>Цвет</h4><input id="colorInput" value="#ff6b6b"><div class="row"><button class="btn btn-primary" id="colorConvertRun">Преобразовать</button></div></div>
    <div class="panel"><h4>Результат</h4><div class="swatches"><div class="swatch"><div id="colorPreview" class="swatch-color"></div><div id="colorConvertOut" class="swatch-meta"></div></div></div></div>`));
  html.push(card(26,'Color Palette Generator','Создаёт палитру оттенков из базового цвета.',`
    <div class="panel"><h4>Базовый цвет</h4><input id="paletteColor" value="#4f7cff"><div class="row"><button class="btn btn-primary" id="paletteRun">Создать палитру</button></div></div>
    <div class="panel"><h4>Палитра</h4><div id="paletteOut" class="swatches"></div></div>`));
  html.push(card(27,'Gradient Generator','Создаёт CSS linear-gradient.',`
    <div class="panel"><h4>Настройки</h4><div class="grid-3"><input id="gradColor1" value="#111111"><input id="gradColor2" value="#ffffff"><input id="gradAngle" type="number" value="135"></div><div class="row"><button class="btn btn-primary" id="gradRun">Сгенерировать</button></div></div>
    <div class="panel"><h4>Превью</h4><div id="gradPreview" class="swatch-color" style="border-radius:18px"></div><div id="gradOut" class="output small"></div></div>`));
  html.push(card(28,'Shadow Generator','Создаёт box-shadow CSS.',`
    <div class="panel"><h4>Параметры</h4><div class="grid-4"><input id="shadowX" type="number" value="0"><input id="shadowY" type="number" value="18"><input id="shadowBlur" type="number" value="40"><input id="shadowSpread" type="number" value="0"></div><div class="grid-2"><input id="shadowColor" value="rgba(0,0,0,0.35)"><input id="shadowRadius" type="number" value="22"></div><div class="row"><button class="btn btn-primary" id="shadowRun">Сгенерировать</button></div></div>
    <div class="panel"><h4>Превью</h4><div id="shadowPreview" class="canvas-wrap"><div style="width:220px;height:120px;background:#fff;border-radius:22px"></div></div><div id="shadowOut" class="output small"></div></div>`));
  html.push(card(29,'Border Radius Generator','Создаёт CSS для border-radius.',`
    <div class="panel"><h4>Радиусы</h4><div class="grid-4"><input id="br1" type="number" value="24"><input id="br2" type="number" value="24"><input id="br3" type="number" value="24"><input id="br4" type="number" value="24"></div><div class="row"><button class="btn btn-primary" id="brRun">Сгенерировать</button></div></div>
    <div class="panel"><h4>Превью</h4><div id="brPreview" class="canvas-wrap"><div style="width:220px;height:120px;background:linear-gradient(135deg,#333,#777)"></div></div><div id="brOut" class="output small"></div></div>`));
  html.push(card(30,'Glassmorphism Generator','Генерирует CSS glassmorphism блока.',`
    <div class="panel"><h4>Настройки</h4><div class="grid-3"><input id="glassBg" value="rgba(255,255,255,0.08)"><input id="glassBlur" type="number" value="18"><input id="glassBorder" value="rgba(255,255,255,0.18)"></div><div class="row"><button class="btn btn-primary" id="glassRun">Сгенерировать</button></div></div>
    <div class="panel"><h4>Превью</h4><div id="glassPreview" class="canvas-wrap" style="background:linear-gradient(135deg,#101b3a,#431d52)"><div style="width:240px;height:140px"></div></div><div id="glassOut" class="output small"></div></div>`));
  html.push(card(31,'CSS Grid Generator','Создаёт CSS grid шаблон.',`
    <div class="panel"><h4>Grid</h4><div class="grid-3"><input id="gridCols" value="repeat(3, 1fr)"><input id="gridRows" value="auto"><input id="gridGap" value="16px"></div><div class="row"><button class="btn btn-primary" id="gridRun">Сгенерировать</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="gridOut" class="output"></div></div>`));

  html.push(card(32,'ZIP Creator','Создаёт ZIP из выбранных файлов.',`
    <div class="panel"><h4>Файлы</h4><input id="zipFiles" type="file" multiple><input id="zipName" value="archive"><div class="row"><button class="btn btn-primary" id="zipRun">Скачать ZIP</button></div></div>
    <div class="panel"><h4>Статус</h4><div id="zipOut" class="output">Ожидание файлов.</div></div>`));
  html.push(card(33,'File Size Calculator','Считает общий размер и средний размер файлов.',`
    <div class="panel"><h4>Файлы</h4><input id="sizeFiles" type="file" multiple></div>
    <div class="panel"><h4>Результат</h4><div id="sizeOut" class="output"></div></div>`));
  html.push(card(34,'File Type Detector','Показывает тип файла, расширение и MIME.',`
    <div class="panel"><h4>Файлы</h4><input id="typeFiles" type="file" multiple></div>
    <div class="panel"><h4>Результат</h4><div id="typeOut" class="table-wrap"></div></div>`));
  html.push(card(35,'Folder Structure Generator','Строит дерево папок из списка путей.',`
    <div class="panel"><h4>Пути</h4><textarea id="folderIn" placeholder="tools/index.html\ntools/assets/css/style.css"></textarea><div class="row"><button class="btn btn-primary" id="folderRun">Построить дерево</button></div></div>
    <div class="panel"><h4>Дерево</h4><div id="folderOut" class="output"></div></div>`));

  html.push(card(36,'Text Case Converter','Меняет регистр текста.',`
    <div class="panel"><h4>Текст</h4><textarea id="caseIn"></textarea><div class="row"><button class="btn btn-primary" data-case="upper">UPPER</button><button class="btn btn-secondary" data-case="lower">lower</button><button class="btn btn-secondary" data-case="title">Title</button><button class="btn btn-secondary" data-case="sentence">Sentence</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="caseOut" class="output"></div></div>`));
  html.push(card(37,'Remove Duplicate Lines','Удаляет повторяющиеся строки.',`
    <div class="panel"><h4>Строки</h4><textarea id="dedupeIn"></textarea><div class="row"><button class="btn btn-primary" id="dedupeRun">Удалить дубли</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="dedupeOut" class="output"></div></div>`));
  html.push(card(38,'Word Counter','Считает символы, слова, строки, абзацы.',`
    <div class="panel"><h4>Текст</h4><textarea id="countIn"></textarea><div class="row"><button class="btn btn-primary" id="countRun">Посчитать</button></div></div>
    <div class="panel"><h4>Статистика</h4><div id="countOut" class="output"></div></div>`));
  html.push(card(39,'Random Text Generator','Генерирует lorem ipsum / slug / случайные строки.',`
    <div class="panel"><h4>Параметры</h4><div class="grid-2"><select id="randMode"><option value="lorem">Lorem</option><option value="slug">Slug</option><option value="chars">Случайные символы</option></select><input id="randCount" type="number" value="3"></div><div class="row"><button class="btn btn-primary" id="randRun">Сгенерировать</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="randOut" class="output"></div></div>`));
  html.push(card(40,'UUID Generator','Генератор UUID v4.',`
    <div class="panel"><h4>Параметры</h4><input id="uuidCount" type="number" value="5"><div class="row"><button class="btn btn-primary" id="uuidRun">Сгенерировать</button></div></div>
    <div class="panel"><h4>UUID</h4><div id="uuidOut" class="output"></div></div>`));

  html.push(card(41,'Meta Tag Generator','Генерирует базовые meta tags страницы.',`
    <div class="panel"><h4>Поля</h4><input id="metaTitle" placeholder="Title"><input id="metaDesc" placeholder="Description"><input id="metaKeywords" placeholder="keywords, through comma"><div class="row"><button class="btn btn-primary" id="metaGenRun">Сгенерировать</button></div></div>
    <div class="panel"><h4>Теги</h4><div id="metaGenOut" class="output"></div></div>`));
  html.push(card(42,'Open Graph Generator','Генерация og:meta tags.',`
    <div class="panel"><h4>Поля</h4><input id="ogTitle" placeholder="OG title"><input id="ogDesc" placeholder="OG description"><input id="ogImage" placeholder="https://site/image.jpg"><input id="ogUrl" placeholder="https://site/page"><div class="row"><button class="btn btn-primary" id="ogRun">Сгенерировать</button></div></div>
    <div class="panel"><h4>Теги</h4><div id="ogOut" class="output"></div></div>`));
  html.push(card(43,'Favicon Generator','Создаёт favicon PNG 32/64/180 из изображения.',`
    <div class="panel"><h4>Изображение</h4><input id="favFile" type="file" accept="image/*"><div class="row"><button class="btn btn-primary" id="favRun">Сгенерировать ZIP</button></div></div>
    <div class="panel"><h4>Статус</h4><div id="favOut" class="output">Ожидание изображения.</div></div>`));
  html.push(card(44,'Sitemap Generator','Генерирует sitemap.xml по списку URL.',`
    <div class="panel"><h4>Данные</h4><input id="siteBase" placeholder="https://site.com"><textarea id="siteUrls" placeholder="/\n/tools/\n/contact/"></textarea><div class="row"><button class="btn btn-primary" id="siteMapRun">Сгенерировать</button></div></div>
    <div class="panel"><h4>sitemap.xml</h4><div id="siteMapOut" class="output"></div></div>`));
  html.push(card(45,'Robots.txt Generator','Генерирует robots.txt.',`
    <div class="panel"><h4>Поля</h4><input id="robotsAllow" value="/"><input id="robotsDisallow" value=""><input id="robotsSitemap" placeholder="https://site.com/sitemap.xml"><div class="row"><button class="btn btn-primary" id="robotsRun">Сгенерировать</button></div></div>
    <div class="panel"><h4>robots.txt</h4><div id="robotsOut" class="output"></div></div>`));

  html.push(card(46,'Password Generator','Генерирует случайные пароли.',`
    <div class="panel"><h4>Параметры</h4><div class="grid-4"><input id="passLen" type="number" value="16"><label class="inline"><input id="passUpper" type="checkbox" checked> A-Z</label><label class="inline"><input id="passDigits" type="checkbox" checked> 0-9</label><label class="inline"><input id="passSymbols" type="checkbox" checked> !@#</label></div><div class="row"><button class="btn btn-primary" id="passRun">Сгенерировать</button></div></div>
    <div class="panel"><h4>Пароль</h4><div id="passOut" class="output"></div></div>`));
  html.push(card(47,'Hash Generator','Генератор MD5 / SHA-256 / SHA-512.',`
    <div class="panel"><h4>Текст</h4><textarea id="hashIn"></textarea><div class="row"><button class="btn btn-primary" id="hashMd5">MD5</button><button class="btn btn-secondary" id="hash256">SHA-256</button><button class="btn btn-secondary" id="hash512">SHA-512</button></div></div>
    <div class="panel"><h4>Хэш</h4><div id="hashOut" class="output"></div></div>`));
  html.push(card(48,'JWT Decoder','Декодирует header и payload JWT без проверки подписи.',`
    <div class="panel"><h4>JWT</h4><textarea id="jwtIn"></textarea><div class="row"><button class="btn btn-primary" id="jwtRun">Декодировать</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="jwtOut" class="output"></div></div>`));
  html.push(card(49,'Checksum Generator','CRC32 для текста и файлов.',`
    <div class="panel"><h4>Входные данные</h4><textarea id="crcText" placeholder="Текст для CRC32"></textarea><input id="crcFile" type="file"><div class="row"><button class="btn btn-primary" id="crcTextRun">CRC32 текста</button><button class="btn btn-secondary" id="crcFileRun">CRC32 файла</button></div></div>
    <div class="panel"><h4>Результат</h4><div id="crcOut" class="output"></div></div>`));

  toolsContainer.innerHTML = html.join('');
}

function q(id){ return document.getElementById(id); }
function setText(id, value){ q(id).textContent = value ?? ''; }
function setHTML(id, value){ q(id).innerHTML = value ?? ''; }
function formatBytes(bytes){ if(!bytes && bytes!==0) return '—'; const units=['B','KB','MB','GB']; let i=0, n=bytes; while(n>=1024 && i<units.length-1){n/=1024;i++;} return `${n.toFixed(n>=100||i===0?0:1)} ${units[i]}`; }
function downloadBlob(blob, name){ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
function extByMime(m){ return m==='image/jpeg'?'jpg':m==='image/png'?'png':m==='image/webp'?'webp':'bin'; }
function sanitizeName(name){ return (name||'file').replace(/[<>:"/\\|?*\x00-\x1F]/g,'').replace(/\s+/g,'-'); }
function baseName(name){ const parts = name.split('.'); if(parts.length===1) return name; parts.pop(); return parts.join('.'); }
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function parseCSV(text){ const rows=[]; let row=[], cell='', quote=false; for(let i=0;i<text.length;i++){const ch=text[i], next=text[i+1]; if(ch==='"'){ if(quote && next==='"'){cell+='"'; i++;} else quote=!quote; } else if(ch===',' && !quote){row.push(cell); cell='';} else if((ch==='\n' || ch==='\r') && !quote){ if(ch==='\r' && next==='\n') i++; row.push(cell); rows.push(row); row=[]; cell=''; } else cell+=ch; } row.push(cell); rows.push(row); return rows.filter(r=>!(r.length===1 && r[0]==='')); }
function toCSV(arr){ if(!Array.isArray(arr)||!arr.length) return ''; const keys=[...new Set(arr.flatMap(o=>Object.keys(o)))]; const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`; return [keys.join(','), ...arr.map(o=>keys.map(k=>esc(o[k])).join(','))].join('\n'); }
function fitSize(w,h,maxW,maxH){ let nw=w, nh=h; if(maxW && nw>maxW){ const r=maxW/nw; nw=maxW; nh=Math.round(nh*r);} if(maxH && nh>maxH){ const r=maxH/nh; nh=maxH; nw=Math.round(nw*r);} return {width:nw,height:nh}; }
async function fileToImage(file){ const url=URL.createObjectURL(file); const img=new Image(); const p=new Promise((res,rej)=>{img.onload=()=>res(img); img.onerror=()=>rej(new Error('Не удалось загрузить изображение'));}); img.src=url; const result=await p; URL.revokeObjectURL(url); return result; }
async function transformImage(file, {width,height,format='image/png',quality=0.9,cropCenter=false, watermark=null, keepAspect=true}){
  const img = await fileToImage(file);
  let tw = width || img.naturalWidth;
  let th = height || img.naturalHeight;
  let sx=0, sy=0, sw=img.naturalWidth, sh=img.naturalHeight;
  if(cropCenter){
    const targetRatio = tw / th;
    const srcRatio = img.naturalWidth / img.naturalHeight;
    if(srcRatio > targetRatio){ sh = img.naturalHeight; sw = Math.round(sh * targetRatio); sx = Math.round((img.naturalWidth - sw)/2); }
    else { sw = img.naturalWidth; sh = Math.round(sw / targetRatio); sy = Math.round((img.naturalHeight - sh)/2); }
  } else if(keepAspect){ ({width:tw, height:th} = fitSize(img.naturalWidth,img.naturalHeight,tw,th)); }
  const canvas=document.createElement('canvas'); canvas.width=tw; canvas.height=th; const ctx=canvas.getContext('2d'); ctx.drawImage(img,sx,sy,sw,sh,0,0,tw,th);
  if(watermark){ ctx.save(); ctx.globalAlpha=watermark.opacity; ctx.fillStyle=watermark.color || '#ffffff'; ctx.font=`${watermark.size}px Inter, Arial, sans-serif`; const metrics=ctx.measureText(watermark.text); const pad=20; let x=pad,y=pad+watermark.size; if(watermark.position==='br'){x=tw-metrics.width-pad; y=th-pad;} if(watermark.position==='bl'){x=pad; y=th-pad;} if(watermark.position==='tr'){x=tw-metrics.width-pad; y=pad+watermark.size;} if(watermark.position==='center'){x=(tw-metrics.width)/2; y=th/2;} ctx.fillText(watermark.text,x,y); ctx.restore(); }
  const blob = await new Promise(res=>canvas.toBlob(res, format, format==='image/png'?undefined:quality));
  return {blob, canvas, width:tw, height:th, originalWidth:img.naturalWidth, originalHeight:img.naturalHeight};
}
function textToBlob(text, type='text/plain;charset=utf-8'){ return new Blob([text], {type}); }
function minifyTextSimple(t){ return t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'').replace(/\s+/g,' ').trim(); }
function prettyBraces(text){ let out='', indent=0, quote=null; for(let i=0;i<text.length;i++){ const ch=text[i], prev=text[i-1]; if((ch==='"'||ch==="'") && prev !== '\\'){ quote = quote===ch?null:quote||ch; out+=ch; continue; } if(quote){ out+=ch; continue; } if(ch==='{'||ch==='['){ out += ch + '\n' + '  '.repeat(++indent); } else if(ch==='}'||ch===']'){ out += '\n' + '  '.repeat(Math.max(indent-1,0)) + ch; indent = Math.max(indent-1,0); } else if(ch===';'){ out += ';\n' + '  '.repeat(indent); } else if(ch===','){ out += ',\n' + '  '.repeat(indent); } else out += ch; } return out.replace(/\n\s*\n+/g,'\n').trim(); }
function md5cycle(x,k){let[a,b,c,d]=x;function ff(a,b,c,d,x,s,t){a=a+((b&c)|(~b&d))+x+t;return((a<<s)|(a>>>32-s))+b}function gg(a,b,c,d,x,s,t){a=a+((b&d)|(c&~d))+x+t;return((a<<s)|(a>>>32-s))+b}function hh(a,b,c,d,x,s,t){a=a+(b^c^d)+x+t;return((a<<s)|(a>>>32-s))+b}function ii(a,b,c,d,x,s,t){a=a+(c^(b|~d))+x+t;return((a<<s)|(a>>>32-s))+b}a=ff(a,b,c,d,k[0],7,-680876936);d=ff(d,a,b,c,k[1],12,-389564586);c=ff(c,d,a,b,k[2],17,606105819);b=ff(b,c,d,a,k[3],22,-1044525330);a=ff(a,b,c,d,k[4],7,-176418897);d=ff(d,a,b,c,k[5],12,1200080426);c=ff(c,d,a,b,k[6],17,-1473231341);b=ff(b,c,d,a,k[7],22,-45705983);a=ff(a,b,c,d,k[8],7,1770035416);d=ff(d,a,b,c,k[9],12,-1958414417);c=ff(c,d,a,b,k[10],17,-42063);b=ff(b,c,d,a,k[11],22,-1990404162);a=ff(a,b,c,d,k[12],7,1804603682);d=ff(d,a,b,c,k[13],12,-40341101);c=ff(c,d,a,b,k[14],17,-1502002290);b=ff(b,c,d,a,k[15],22,1236535329);a=gg(a,b,c,d,k[1],5,-165796510);d=gg(d,a,b,c,k[6],9,-1069501632);c=gg(c,d,a,b,k[11],14,643717713);b=gg(b,c,d,a,k[0],20,-373897302);a=gg(a,b,c,d,k[5],5,-701558691);d=gg(d,a,b,c,k[10],9,38016083);c=gg(c,d,a,b,k[15],14,-660478335);b=gg(b,c,d,a,k[4],20,-405537848);a=gg(a,b,c,d,k[9],5,568446438);d=gg(d,a,b,c,k[14],9,-1019803690);c=gg(c,d,a,b,k[3],14,-187363961);b=gg(b,c,d,a,k[8],20,1163531501);a=gg(a,b,c,d,k[13],5,-1444681467);d=gg(d,a,b,c,k[2],9,-51403784);c=gg(c,d,a,b,k[7],14,1735328473);b=gg(b,c,d,a,k[12],20,-1926607734);a=hh(a,b,c,d,k[5],4,-378558);d=hh(d,a,b,c,k[8],11,-2022574463);c=hh(c,d,a,b,k[11],16,1839030562);b=hh(b,c,d,a,k[14],23,-35309556);a=hh(a,b,c,d,k[1],4,-1530992060);d=hh(d,a,b,c,k[4],11,1272893353);c=hh(c,d,a,b,k[7],16,-155497632);b=hh(b,c,d,a,k[10],23,-1094730640);a=hh(a,b,c,d,k[13],4,681279174);d=hh(d,a,b,c,k[0],11,-358537222);c=hh(c,d,a,b,k[3],16,-722521979);b=hh(b,c,d,a,k[6],23,76029189);a=hh(a,b,c,d,k[9],4,-640364487);d=hh(d,a,b,c,k[12],11,-421815835);c=hh(c,d,a,b,k[15],16,530742520);b=hh(b,c,d,a,k[2],23,-995338651);a=ii(a,b,c,d,k[0],6,-198630844);d=ii(d,a,b,c,k[7],10,1126891415);c=ii(c,d,a,b,k[14],15,-1416354905);b=ii(b,c,d,a,k[5],21,-57434055);a=ii(a,b,c,d,k[12],6,1700485571);d=ii(d,a,b,c,k[3],10,-1894986606);c=ii(c,d,a,b,k[10],15,-1051523);b=ii(b,c,d,a,k[1],21,-2054922799);a=ii(a,b,c,d,k[8],6,1873313359);d=ii(d,a,b,c,k[15],10,-30611744);c=ii(c,d,a,b,k[6],15,-1560198380);b=ii(b,c,d,a,k[13],21,1309151649);a=ii(a,b,c,d,k[4],6,-145523070);d=ii(d,a,b,c,k[11],10,-1120210379);c=ii(c,d,a,b,k[2],15,718787259);b=ii(b,c,d,a,k[9],21,-343485551);x[0]=(x[0]+a)|0;x[1]=(x[1]+b)|0;x[2]=(x[2]+c)|0;x[3]=(x[3]+d)|0}
function md5blk(s){const md5blks=[];for(let i=0;i<64;i+=4)md5blks[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24);return md5blks}
function md51(s){let n=s.length,state=[1732584193,-271733879,-1732584194,271733878],i;for(i=64;i<=s.length;i+=64)md5cycle(state,md5blk(s.substring(i-64,i)));s=s.substring(i-64);const tail=Array(16).fill(0);for(i=0;i<s.length;i++)tail[i>>2]|=s.charCodeAt(i)<<((i%4)<<3);tail[i>>2]|=0x80<<((i%4)<<3);if(i>55){md5cycle(state,tail);for(i=0;i<16;i++)tail[i]=0}tail[14]=n*8;md5cycle(state,tail);return state}
function rhex(n){let s='',j=0;for(;j<4;j++)s+=('0'+((n>>(j*8))&255).toString(16)).slice(-2);return s}
function md5(s){return md51(unescape(encodeURIComponent(s))).map(rhex).join('')}
async function sha(text, algorithm){const hash=await crypto.subtle.digest(algorithm,new TextEncoder().encode(text)); return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function hexToRgb(hex){ hex=hex.replace('#',''); if(hex.length===3) hex=hex.split('').map(c=>c+c).join(''); const int=parseInt(hex,16); return {r:(int>>16)&255,g:(int>>8)&255,b:int&255}; }
function rgbToHex(r,g,b){ return '#' + [r,g,b].map(v=>Number(v).toString(16).padStart(2,'0')).join(''); }
function rgbToHsl(r,g,b){ r/=255; g/=255; b/=255; const max=Math.max(r,g,b), min=Math.min(r,g,b); let h,s,l=(max+min)/2; if(max===min){h=s=0;} else { const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min); switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;} h/=6;} return {h:Math.round(h*360), s:Math.round(s*100), l:Math.round(l*100)}; }
function hslToRgb(h,s,l){ h/=360;s/=100;l/=100; let r,g,b; if(s===0){r=g=b=l;} else { const hue2rgb=(p,q,t)=>{ if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p; }; const q=l<.5?l*(1+s):l+s-l*s, p=2*l-q; r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3); } return {r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255)}; }
function crc32buf(buf){ const table = (()=>{let c,table=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=((c&1)?(0xEDB88320^(c>>>1)):(c>>>1));table[n]=c>>>0;}return table;})(); let crc=0^(-1); for(let i=0;i<buf.length;i++) crc=(crc>>>8)^table[(crc^buf[i])&0xFF]; return ((crc^(-1))>>>0).toString(16).padStart(8,'0'); }

function initSearch(){
  toolSearch.addEventListener('input', ()=>{
    const val = toolSearch.value.trim().toLowerCase();
    document.querySelectorAll('.tool-card').forEach(card => card.classList.toggle('hidden', val && !card.dataset.search.includes(val) && !card.querySelector('h3').textContent.toLowerCase().includes(val)));
  });
}

function initTools(){
  q('imgCompressRun').onclick = async()=>{
    const files=[...q('imgCompressFiles').files]; if(!files.length) return setText('imgCompressOut','Выбери файлы.');
    const zip=new JSZip(); let info=[]; q('imgCompressPreview').innerHTML='';
    const mw=+q('imgCompressW').value||1200, mh=+q('imgCompressH').value||1200, qu=(+q('imgCompressQ').value||75)/100, fmt=q('imgCompressFormat').value;
    for(const file of files){ const res=await transformImage(file,{width:mw,height:mh,format:fmt,quality:qu,keepAspect:true}); const name=`${sanitizeName(baseName(file.name))}.${extByMime(fmt)}`; zip.file(name,res.blob); info.push(`${file.name}: ${formatBytes(file.size)} → ${formatBytes(res.blob.size)}`); const url=URL.createObjectURL(res.blob); q('imgCompressPreview').insertAdjacentHTML('beforeend',`<div class="preview-card"><img src="${url}"><div class="name">${escapeHtml(name)}</div></div>`);} 
    const blob=await zip.generateAsync({type:'blob'}); downloadBlob(blob, `${sanitizeName(q('imgCompressZipName').value||'compressed-images')}.zip`); setText('imgCompressOut', info.join('\n'));
  };
  q('imgConvertRun').onclick = async()=>{
    const files=[...q('imgConvertFiles').files]; if(!files.length) return setText('imgConvertOut','Выбери файлы.'); const fmt=q('imgConvertFormat').value, ql=(+q('imgConvertQuality').value||90)/100; const zip=new JSZip(); let lines=[]; for(const file of files){ const res=await transformImage(file,{format:fmt,quality:ql}); const name=`${sanitizeName(baseName(file.name))}.${extByMime(fmt)}`; zip.file(name,res.blob); lines.push(`${file.name} → ${name}`); } downloadBlob(await zip.generateAsync({type:'blob'}),'converted-images.zip'); setText('imgConvertOut', lines.join('\n')); };
  q('imgResizeRun').onclick = async()=>{ const files=[...q('imgResizeFiles').files]; if(!files.length) return setText('imgResizeOut','Выбери файлы.'); const keep=q('imgResizeKeep').checked, w=+q('imgResizeW').value, h=+q('imgResizeH').value; const zip=new JSZip(); let lines=[]; for(const file of files){ const fmt=file.type.startsWith('image/')?file.type:'image/png'; const res=await transformImage(file,{width:w,height:h,format:fmt,keepAspect:keep}); const name=`${sanitizeName(baseName(file.name))}.${extByMime(fmt)}`; zip.file(name,res.blob); lines.push(`${file.name}: ${res.originalWidth}×${res.originalHeight} → ${res.width}×${res.height}`);} downloadBlob(await zip.generateAsync({type:'blob'}),'resized-images.zip'); setText('imgResizeOut',lines.join('\n')); };
  q('batchConvertRun').onclick = async()=>{ const files=[...q('batchConvertFiles').files]; if(!files.length) return setText('batchConvertOut','Выбери файлы.'); const fmt=q('batchConvertFormat').value, ql=(+q('batchConvertQuality').value||80)/100, prefix=q('batchConvertPrefix').value||''; const zip=new JSZip(); let i=1, lines=[]; for(const file of files){ const res=await transformImage(file,{format:fmt,quality:ql}); const name=`${sanitizeName(prefix+String(i).padStart(3,'0')+'-'+baseName(file.name))}.${extByMime(fmt)}`; zip.file(name,res.blob); lines.push(name); i++; } downloadBlob(await zip.generateAsync({type:'blob'}),'batch-images.zip'); setText('batchConvertOut', lines.join('\n')); };

  let cropBlob=null; q('cropRun').onclick=async()=>{ const file=q('cropFile').files[0]; if(!file) return setText('cropOut','Выбери файл.'); const res=await transformImage(file,{width:+q('cropW').value||600,height:+q('cropH').value||600,cropCenter:true,format:'image/png'}); const canvas=q('cropCanvas'); canvas.width=res.canvas.width; canvas.height=res.canvas.height; canvas.getContext('2d').drawImage(res.canvas,0,0); cropBlob=res.blob; setText('cropOut',`${res.width}×${res.height}`);}; q('cropDownload').onclick=()=> cropBlob && downloadBlob(cropBlob,'cropped.png');
  let wmBlob=null; q('wmRun').onclick=async()=>{ const file=q('wmFile').files[0]; if(!file) return setText('wmOut','Выбери файл.'); const res=await transformImage(file,{format:'image/png',watermark:{text:q('wmText').value,size:+q('wmSize').value||42,position:q('wmPosition').value,opacity:+q('wmOpacity').value||0.35}}); const c=q('wmCanvas'); c.width=res.canvas.width; c.height=res.canvas.height; c.getContext('2d').drawImage(res.canvas,0,0); wmBlob=res.blob; setText('wmOut','Водяной знак добавлен.');}; q('wmDownload').onclick=()=> wmBlob && downloadBlob(wmBlob,'watermarked.png');
  q('renameRun').onclick=async()=>{ const files=[...q('renameFiles').files]; if(!files.length) return setText('renameOut','Выбери файлы.'); const prefix=q('renamePrefix').value||'image-'; const start=+q('renameStart').value||1; const digits=+q('renameDigits').value||3; const zip=new JSZip(); const lines=[]; files.forEach((file,idx)=>{ const num=String(start+idx).padStart(digits,'0'); const ext=file.name.split('.').pop(); const name=`${sanitizeName(prefix)}${num}.${ext}`; zip.file(name,file); lines.push(`${file.name} → ${name}`); }); downloadBlob(await zip.generateAsync({type:'blob'}),'renamed-files.zip'); setText('renameOut',lines.join('\n')); };
  q('metaFile').onchange=async()=>{ const file=q('metaFile').files[0]; if(!file) return setText('metaOut','Нет файла.'); const img=await fileToImage(file); setText('metaOut',`Имя: ${file.name}\nТип: ${file.type || '—'}\nРазмер файла: ${formatBytes(file.size)}\nРазмер изображения: ${img.naturalWidth}×${img.naturalHeight}\nПоследнее изменение: ${new Date(file.lastModified).toLocaleString()}`); };
  q('metaRemoveRun').onclick=async()=>{ const file=q('metaRemoveFile').files[0]; if(!file) return setText('metaRemoveOut','Выбери файл.'); const fmt=q('metaRemoveFormat').value; const res=await transformImage(file,{format:fmt,quality:(+q('metaRemoveQuality').value||90)/100}); downloadBlob(res.blob,`${sanitizeName(baseName(file.name))}-clean.${extByMime(fmt)}`); setText('metaRemoveOut',`Готово: ${formatBytes(file.size)} → ${formatBytes(res.blob.size)}`); };

  q('jsonFormatRun').onclick=()=>{ try{ setText('jsonFormatOut', JSON.stringify(JSON.parse(q('jsonFormatIn').value), null, 2)); }catch(e){ setText('jsonFormatOut', 'Ошибка: '+e.message);} };
  q('jsonValidateRun').onclick=()=>{ try{ JSON.parse(q('jsonValidateIn').value); setHTML('jsonValidateOut','<span class="success">JSON валиден.</span>'); }catch(e){ setHTML('jsonValidateOut',`<span class="error">${escapeHtml(e.message)}</span>`); } };
  let lastCsv=''; q('jsonCsvRun').onclick=()=>{ try{ lastCsv=toCSV(JSON.parse(q('jsonCsvIn').value)); setText('jsonCsvOut', lastCsv || 'Пустой результат.'); }catch(e){ setText('jsonCsvOut','Ошибка: '+e.message); } }; q('jsonCsvDownload').onclick=()=> lastCsv && downloadBlob(textToBlob(lastCsv,'text/csv;charset=utf-8'),'data.csv');
  q('csvJsonRun').onclick=()=>{ try{ const rows=parseCSV(q('csvJsonIn').value); const [headers,...body]=rows; const json=body.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??'']))); setText('csvJsonOut', JSON.stringify(json,null,2)); }catch(e){ setText('csvJsonOut','Ошибка: '+e.message);} };
  q('jsonTableRun').onclick=()=>{ try{ const arr=JSON.parse(q('jsonTableIn').value); if(!Array.isArray(arr)||!arr.length) throw new Error('Нужен непустой JSON массив объектов'); const keys=[...new Set(arr.flatMap(o=>Object.keys(o)))]; const head=`<thead><tr>${keys.map(k=>`<th>${escapeHtml(k)}</th>`).join('')}</tr></thead>`; const body=`<tbody>${arr.map(o=>`<tr>${keys.map(k=>`<td>${escapeHtml(o[k]??'')}</td>`).join('')}</tr>`).join('')}</tbody>`; setHTML('jsonTableOut', `<table>${head}${body}</table>`); }catch(e){ setHTML('jsonTableOut', `<div class="output">Ошибка: ${escapeHtml(e.message)}</div>`);} };
  q('base64Encode').onclick=()=> setText('base64Out', btoa(unescape(encodeURIComponent(q('base64In').value))));
  q('base64Decode').onclick=()=> { try{ setText('base64Out', decodeURIComponent(escape(atob(q('base64In').value.trim())))); }catch(e){ setText('base64Out','Ошибка: '+e.message);} };
  q('urlEncode').onclick=()=> setText('urlOut', encodeURIComponent(q('urlIn').value));
  q('urlDecode').onclick=()=> { try{ setText('urlOut', decodeURIComponent(q('urlIn').value)); }catch(e){ setText('urlOut','Ошибка: '+e.message);} };
  q('htmlEscape').onclick=()=> setText('htmlEscOut', q('htmlEscIn').value.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])));
  q('htmlUnescape').onclick=()=> { const t=document.createElement('textarea'); t.innerHTML=q('htmlEscIn').value; setText('htmlEscOut', t.value); };

  q('htmlMinRun').onclick=()=> setText('htmlMinOut', q('htmlMinIn').value.replace(/>\s+</g,'><').replace(/\s+/g,' ').replace(/<!--([\s\S]*?)-->/g,'').trim());
  q('cssMinRun').onclick=()=> setText('cssMinOut', q('cssMinIn').value.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').replace(/\s*([{}:;,])\s*/g,'$1').trim());
  q('jsMinRun').onclick=()=> setText('jsMinOut', minifyTextSimple(q('jsMinIn').value));
  q('cssPrettyRun').onclick=()=> setText('cssPrettyOut', prettyBraces(q('cssPrettyIn').value.replace(/}/g,'}\n').replace(/{/g,'{\n')));
  q('jsPrettyRun').onclick=()=> setText('jsPrettyOut', prettyBraces(q('jsPrettyIn').value));
  q('svgOptRun').onclick=()=> setText('svgOptOut', q('svgOptIn').value.replace(/<!--([\s\S]*?)-->/g,'').replace(/>\s+</g,'><').replace(/\s{2,}/g,' ').trim());
  q('regexRun').onclick=()=>{ try{ const re=new RegExp(q('regexPattern').value,q('regexFlags').value); const matches=[...q('regexText').value.matchAll(re)].map((m,i)=>`#${i+1}: "${m[0]}" @ ${m.index}`).join('\n'); setText('regexOut', matches || 'Совпадений нет.'); }catch(e){ setText('regexOut','Ошибка: '+e.message);} };

  q('colorConvertRun').onclick=()=>{ try{ let c=q('colorInput').value.trim(); let rgb; if(c.startsWith('#')) rgb=hexToRgb(c); else if(/^rgb/i.test(c)){ const nums=c.match(/\d+/g).map(Number); rgb={r:nums[0],g:nums[1],b:nums[2]}; } else if(/^hsl/i.test(c)){ const nums=c.match(/\d+/g).map(Number); rgb=hslToRgb(nums[0],nums[1],nums[2]); } else throw new Error('Используй HEX, rgb(...) или hsl(...)'); const hex=rgbToHex(rgb.r,rgb.g,rgb.b); const hsl=rgbToHsl(rgb.r,rgb.g,rgb.b); q('colorPreview').style.background=hex; setHTML('colorConvertOut',`HEX: ${hex}<br>RGB: rgb(${rgb.r}, ${rgb.g}, ${rgb.b})<br>HSL: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`); }catch(e){ setText('colorConvertOut','Ошибка: '+e.message);} };
  q('paletteRun').onclick=()=>{ const base=hexToRgb(q('paletteColor').value); const hsl=rgbToHsl(base.r,base.g,base.b); const steps=[90,75,60,45,30]; setHTML('paletteOut', steps.map(l=>{const rgb=hslToRgb(hsl.h,hsl.s,l);const hex=rgbToHex(rgb.r,rgb.g,rgb.b); return `<div class="swatch"><div class="swatch-color" style="background:${hex}"></div><div class="swatch-meta">${hex}<br>HSL ${hsl.h} ${hsl.s}% ${l}%</div></div>`}).join('')); };
  q('gradRun').onclick=()=>{ const css=`background: linear-gradient(${+q('gradAngle').value||135}deg, ${q('gradColor1').value}, ${q('gradColor2').value});`; q('gradPreview').style.background=`linear-gradient(${+q('gradAngle').value||135}deg, ${q('gradColor1').value}, ${q('gradColor2').value})`; setText('gradOut', css); };
  q('shadowRun').onclick=()=>{ const css=`box-shadow: ${+q('shadowX').value||0}px ${+q('shadowY').value||0}px ${+q('shadowBlur').value||0}px ${+q('shadowSpread').value||0}px ${q('shadowColor').value}; border-radius: ${+q('shadowRadius').value||22}px;`; const card=q('shadowPreview').firstElementChild; card.style.boxShadow=`${+q('shadowX').value||0}px ${+q('shadowY').value||0}px ${+q('shadowBlur').value||0}px ${+q('shadowSpread').value||0}px ${q('shadowColor').value}`; card.style.borderRadius=`${+q('shadowRadius').value||22}px`; setText('shadowOut',css); };
  q('brRun').onclick=()=>{ const vals=[q('br1').value,q('br2').value,q('br3').value,q('br4').value].map(v=>`${+v||0}px`); const css=`border-radius: ${vals.join(' ')};`; q('brPreview').firstElementChild.style.borderRadius=vals.join(' '); setText('brOut', css); };
  q('glassRun').onclick=()=>{ const css=`background: ${q('glassBg').value}; border: 1px solid ${q('glassBorder').value}; backdrop-filter: blur(${+q('glassBlur').value||18}px); -webkit-backdrop-filter: blur(${+q('glassBlur').value||18}px);`; const el=q('glassPreview').firstElementChild; el.style.background=q('glassBg').value; el.style.border=`1px solid ${q('glassBorder').value}`; el.style.backdropFilter=`blur(${+q('glassBlur').value||18}px)`; el.style.webkitBackdropFilter=`blur(${+q('glassBlur').value||18}px)`; el.style.borderRadius='24px'; setText('glassOut', css); };
  q('gridRun').onclick=()=> setText('gridOut', `display: grid;\ngrid-template-columns: ${q('gridCols').value};\ngrid-template-rows: ${q('gridRows').value};\ngap: ${q('gridGap').value};`);

  q('zipRun').onclick=async()=>{ const files=[...q('zipFiles').files]; if(!files.length) return setText('zipOut','Выбери файлы.'); const zip=new JSZip(); files.forEach(f=>zip.file(f.name,f)); downloadBlob(await zip.generateAsync({type:'blob'}), `${sanitizeName(q('zipName').value||'archive')}.zip`); setText('zipOut', `Добавлено файлов: ${files.length}`); };
  q('sizeFiles').onchange=()=>{ const files=[...q('sizeFiles').files]; const total=files.reduce((s,f)=>s+f.size,0); const avg=files.length?total/files.length:0; setText('sizeOut', `Файлов: ${files.length}\nОбщий размер: ${formatBytes(total)}\nСредний размер: ${formatBytes(avg)}`); };
  q('typeFiles').onchange=()=>{ const files=[...q('typeFiles').files]; setHTML('typeOut', `<table><thead><tr><th>Файл</th><th>Расширение</th><th>MIME</th><th>Размер</th></tr></thead><tbody>${files.map(f=>`<tr><td>${escapeHtml(f.name)}</td><td>${escapeHtml(f.name.split('.').pop()||'')}</td><td>${escapeHtml(f.type||'—')}</td><td>${formatBytes(f.size)}</td></tr>`).join('')}</tbody></table>`); };
  q('folderRun').onclick=()=>{ const paths=q('folderIn').value.split(/\n+/).map(s=>s.trim()).filter(Boolean); const tree={}; for(const path of paths){ let node=tree; path.split('/').forEach(part=>{ node[part]=node[part]||{}; node=node[part]; }); } const walk=(node,prefix='')=>Object.entries(node).map(([k,v],i,arr)=>{ const last=i===arr.length-1; return `${prefix}${last?'└── ':'├── '}${k}\n${walk(v,prefix+(last?'    ':'│   '))}`; }).join(''); setText('folderOut', walk(tree).trim() || 'Нет данных'); };

  document.querySelectorAll('[data-case]').forEach(btn=>btn.onclick=()=>{ const t=q('caseIn').value; const mode=btn.dataset.case; let out=t; if(mode==='upper') out=t.toUpperCase(); if(mode==='lower') out=t.toLowerCase(); if(mode==='title') out=t.toLowerCase().replace(/\b\p{L}/gu,m=>m.toUpperCase()); if(mode==='sentence') out=t.toLowerCase().replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu,m=>m.toUpperCase()); setText('caseOut', out); });
  q('dedupeRun').onclick=()=>{ const lines=q('dedupeIn').value.split('\n'); const out=[...new Set(lines)]; setText('dedupeOut', out.join('\n')); };
  q('countRun').onclick=()=>{ const t=q('countIn').value; const words=(t.trim().match(/\S+/g)||[]).length; const chars=t.length; const charsNoSpaces=t.replace(/\s/g,'').length; const lines=t? t.split(/\n/).length : 0; const paragraphs=t.trim()? t.trim().split(/\n\s*\n/).length : 0; setText('countOut', `Слов: ${words}\nСимволов: ${chars}\nБез пробелов: ${charsNoSpaces}\nСтрок: ${lines}\nАбзацев: ${paragraphs}`); };
  q('randRun').onclick=()=>{ const mode=q('randMode').value, count=+q('randCount').value||3; const lorem='lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'; let out=''; if(mode==='lorem') out=Array.from({length:count},()=>lorem.split(' ').sort(()=>Math.random()-.5).slice(0,12).join(' ') + '.').join('\n\n'); if(mode==='slug') out=Array.from({length:count},()=>lorem.split(' ').sort(()=>Math.random()-.5).slice(0,4).join('-')).join('\n'); if(mode==='chars'){ const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; out=Array.from({length:count},()=>Array.from({length:24},()=>chars[Math.floor(Math.random()*chars.length)]).join('')).join('\n'); } setText('randOut', out); };
  q('uuidRun').onclick=()=> setText('uuidOut', Array.from({length:+q('uuidCount').value||5},()=>crypto.randomUUID()).join('\n'));

  q('metaGenRun').onclick=()=>{ const title=q('metaTitle').value, desc=q('metaDesc').value, keys=q('metaKeywords').value; setText('metaGenOut', `<title>${title}</title>\n<meta name="description" content="${desc}">\n<meta name="keywords" content="${keys}">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">`); };
  q('ogRun').onclick=()=>{ setText('ogOut', `<meta property="og:title" content="${q('ogTitle').value}">\n<meta property="og:description" content="${q('ogDesc').value}">\n<meta property="og:image" content="${q('ogImage').value}">\n<meta property="og:url" content="${q('ogUrl').value}">\n<meta property="og:type" content="website">`); };
  q('favRun').onclick=async()=>{ const file=q('favFile').files[0]; if(!file) return setText('favOut','Выбери изображение.'); const sizes=[32,64,180]; const zip=new JSZip(); for(const s of sizes){ const res=await transformImage(file,{width:s,height:s,cropCenter:true,format:'image/png',keepAspect:false}); zip.file(`favicon-${s}x${s}.png`, res.blob); } downloadBlob(await zip.generateAsync({type:'blob'}),'favicons.zip'); setText('favOut','ZIP с favicon PNG скачан.'); };
  q('siteMapRun').onclick=()=>{ const base=q('siteBase').value.replace(/\/$/,''); const urls=q('siteUrls').value.split(/\n+/).map(u=>u.trim()).filter(Boolean).map(u=>u.startsWith('http')?u:`${base}${u.startsWith('/')?'':'/'}${u}`); const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>`; setText('siteMapOut', xml); };
  q('robotsRun').onclick=()=>{ const lines=['User-agent: *']; if(q('robotsAllow').value) lines.push(`Allow: ${q('robotsAllow').value}`); if(q('robotsDisallow').value) lines.push(`Disallow: ${q('robotsDisallow').value}`); if(q('robotsSitemap').value) lines.push(`Sitemap: ${q('robotsSitemap').value}`); setText('robotsOut', lines.join('\n')); };

  q('passRun').onclick=()=>{ const len=+q('passLen').value||16; let chars='abcdefghijklmnopqrstuvwxyz'; if(q('passUpper').checked) chars+='ABCDEFGHIJKLMNOPQRSTUVWXYZ'; if(q('passDigits').checked) chars+='0123456789'; if(q('passSymbols').checked) chars+='!@#$%^&*()-_=+[]{};:,.?/'; let out=''; const bytes=new Uint32Array(len); crypto.getRandomValues(bytes); for(let i=0;i<len;i++) out+=chars[bytes[i]%chars.length]; setText('passOut', out); };
  q('hashMd5').onclick=()=> setText('hashOut', md5(q('hashIn').value));
  q('hash256').onclick=async()=> setText('hashOut', await sha(q('hashIn').value,'SHA-256'));
  q('hash512').onclick=async()=> setText('hashOut', await sha(q('hashIn').value,'SHA-512'));
  q('jwtRun').onclick=()=>{ try{ const [h,p,s]=q('jwtIn').value.trim().split('.'); const decode=part=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)))); setText('jwtOut', `Header:\n${JSON.stringify(decode(h),null,2)}\n\nPayload:\n${JSON.stringify(decode(p),null,2)}\n\nSignature:\n${s||''}`); }catch(e){ setText('jwtOut','Ошибка: '+e.message);} };
  q('crcTextRun').onclick=()=> setText('crcOut', `CRC32: ${crc32buf(new TextEncoder().encode(q('crcText').value))}`);
  q('crcFileRun').onclick=async()=>{ const file=q('crcFile').files[0]; if(!file) return setText('crcOut','Выбери файл.'); const buf=new Uint8Array(await file.arrayBuffer()); setText('crcOut', `Файл: ${file.name}\nCRC32: ${crc32buf(buf)}`); };
}

renderNav();
renderTools();
initSearch();
initTools();
