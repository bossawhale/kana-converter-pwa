// app.js
// --- 片假名 → 平假名 ---
function kataToHira(s){
  return s.replace(/[\u30A1-\u30F6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function normalize(text, opts){
  let t = text;
  if (opts.normalizeKata) t = kataToHira(t);
  // 其他可加：全形→半形等
  return t;
}

// --- 建 Trie 以支援最長匹配 ---
function buildTrie(pairs){
  const root = {};
  for (const {k, v} of pairs){
    let node = root;
    for (const ch of [...k]){
      node = (node[ch] ||= {});
    }
    node.$ = v;
  }
  return root;
}

function chooseVal(val, chooseMode){
  if (Array.isArray(val)){
    return chooseMode === 'all' ? val.join('/') : val[0];
  }
  return val;
}

function convert(text, trie, {chooseMode='first', keepUnknown=true, stripBracket=false} = {}){
  const s = text;
  const out = [];
  let i = 0;
  const unknownSet = new Set();
  let hit = 0, miss = 0;

  while (i < s.length){
    let node = trie, j = i, lastVal = null, lastPos = i;
    while (j < s.length && node[s[j]]){
      node = node[s[j]];
      j++;
      if (node.$) { lastVal = node.$; lastPos = j; }
    }
    if (lastVal){
      let val = chooseVal(lastVal, chooseMode);
      if (stripBracket && typeof val === 'string' && val.startsWith('[')){
        val = val.slice(1);
      }
      out.push(val);
      i = lastPos;
      hit++;
    }else{
      const ch = s[i];
      if (keepUnknown){
        out.push(ch);
      }
      unknownSet.add(ch);
      i++; miss++;
    }
  }
  return {text: out.join(''), hit, miss, unknown: Array.from(unknownSet).filter(c => !/\s/.test(c))};
}

// --- 檔案工具 ---
function downloadBlob(name, data, type='text/plain'){
  const blob = new Blob([data], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function parseCSV(csvText){
  // 非嚴格 CSV：每行 k,v；允許 v 內含 |
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const pairs = [];
  for (const line of lines){
    if (line.startsWith('#')) continue;
    const idx = line.indexOf(',');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const vRaw = line.slice(idx + 1).trim();
    const v = vRaw.includes('|') ? vRaw.split('|').map(s => s.trim()).filter(Boolean) : vRaw;
    pairs.push({k, v});
  }
  return pairs;
}

// --- 狀態 ---
const state = {
  mapPairs: [],
  trie: {},
};

async function loadDefaultMap(){
  const res = await fetch('kana_map.json');
  const json = await res.json();
  state.mapPairs = json;
  state.trie = buildTrie(json);
  document.getElementById('countMap').textContent = json.length;
}

function reloadMap(pairs){
  state.mapPairs = pairs;
  state.trie = buildTrie(pairs);
  document.getElementById('countMap').textContent = pairs.length;
}

// --- UI ---
const els = {
  input: document.getElementById('input'),
  output: document.getElementById('output'),
  btnConvert: document.getElementById('btnConvert'),
  btnClear: document.getElementById('btnClear'),
  btnCopy: document.getElementById('btnCopy'),
  btnDownloadTxt: document.getElementById('btnDownloadTxt'),
  stats: document.getElementById('stats'),
  chooseMode: document.getElementById('chooseMode'),
  stripBracket: document.getElementById('stripBracket'),
  keepUnknown: document.getElementById('keepUnknown'),
  normalizeKata: document.getElementById('normalizeKata'),
  btnExport: document.getElementById('btnExport'),
  fileMap: document.getElementById('fileMap'),
  dropzone: document.getElementById('dropzone'),
};

function runConvert(){
  const optsNorm = { normalizeKata: els.normalizeKata.checked };
  const s = normalize(els.input.value, optsNorm);
  const {text, hit, miss, unknown} = convert(s, state.trie, {
    chooseMode: els.chooseMode.value,
    keepUnknown: els.keepUnknown.checked,
    stripBracket: els.stripBracket.checked,
  });
  els.output.value = text;
  // stats
  const statEl = els.stats;
  statEl.innerHTML = '';
  const pills = [
    ['匹配', hit, 'ok'],
    ['未匹配', miss, miss ? 'warn' : 'ok'],
    ['唯一未匹配字元', unknown.length, miss ? 'warn' : 'ok'],
  ];
  for (const [k, v, cls] of pills){
    const span = document.createElement('span');
    span.className = 'pill ' + cls;
    span.textContent = `${k}: ${v}`;
    statEl.appendChild(span);
  }
  if (unknown.length){
    const div = document.createElement('div');
    div.className = 'meta mono';
    div.style.marginTop = '6px';
    div.textContent = '未匹配：' + unknown.join(' ');
    statEl.appendChild(div);
  }
}

els.btnConvert.addEventListener('click', runConvert);
els.input.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runConvert();
});
for (const id of ['chooseMode','stripBracket','keepUnknown','normalizeKata']){
  document.getElementById(id).addEventListener('change', runConvert);
}
els.btnClear.addEventListener('click', () => { els.input.value=''; els.output.value=''; els.stats.innerHTML=''; });
els.btnCopy.addEventListener('click', async () => {
  await navigator.clipboard.writeText(els.output.value || '');
});
els.btnDownloadTxt.addEventListener('click', () => {
  downloadBlob('converted.txt', els.output.value || '');
});
els.btnExport.addEventListener('click', () => {
  downloadBlob('kana_map.json', JSON.stringify(state.mapPairs, null, 2), 'application/json');
});
els.fileMap.addEventListener('change', async (e) => {
  const f = e.target.files[0]; if(!f) return;
  const txt = await f.text();
  let pairs;
  if (f.name.endsWith('.csv')) pairs = parseCSV(txt);
  else pairs = JSON.parse(txt);
  reloadMap(pairs);
  runConvert();
});

// 拖放
['dragenter','dragover'].forEach(t => els.dropzone.addEventListener(t, e => { e.preventDefault(); e.stopPropagation(); els.dropzone.style.borderColor='#60a5fa'; }));
['dragleave','drop'].forEach(t => els.dropzone.addEventListener(t, e => { e.preventDefault(); e.stopPropagation(); els.dropzone.style.borderColor='#334155'; }));
els.dropzone.addEventListener('drop', async (e) => {
  const f = e.dataTransfer.files[0]; if(!f) return;
  const txt = await f.text();
  let pairs;
  if (f.name.endsWith('.csv')) pairs = parseCSV(txt);
  else pairs = JSON.parse(txt);
  reloadMap(pairs);
  runConvert();
});

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('btnInstall');
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    btn.hidden = true;
    if (deferredPrompt){ deferredPrompt.prompt(); deferredPrompt = null; }
  });
});

// Service worker
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}

loadDefaultMap();
