// 簡版 app.js，維持可運作（建議使用前一則訊息的完整版 ZIP）
function kataToHira(s){ return s.replace(/[\u30A1-\u30F6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60)); }
function buildTrie(pairs){ const root={}; for(const {k,v} of pairs){ let n=root; for(const ch of [...k]) n=n[ch]||(n[ch]={}); n.$=v;} return root; }
async function load(){ const res = await fetch('./kana_map.json'); const map = await res.json(); const trie = buildTrie(map);
  const s = prompt('輸入假名：','きゃぎゃしゃ'); const hira = kataToHira(s||''); alert('（示範）轉換尚未實作完整 UI；請使用完整 ZIP 版本。\n輸入：'+hira);
}
if('serviceWorker' in navigator){ window.addEventListener('load', ()=>navigator.serviceWorker.register('./sw.js')); }
load();
