/* 一次性產生器：重建 astroid（四尖星）格紋 SVG 中心線路徑，
   將 8 個內容頁的 page-head 改為左文右圖兩欄並嵌入 SVG，掛上 deco.js。
   產出後即刪除本檔；輸出皆為純靜態 HTML。 */
import { readFileSync, writeFileSync } from 'node:fs';

/* ---- 幾何參數 ----
   以「交錯圓」重現 deco-lattice：圓心落在對角棋盤格（僅取 i+j 為偶數者），
   相鄰圓交疊即形成彼此銜接的四尖星（正交尖點）與四花瓣，與附圖一致。
   每個圓一條獨立路徑，只在交點相交、無共用線段。 */
const R = 26;              // 圓半徑
const g = 26;              // 棋盤格距（相鄰圓心對角距 = g√2）

/* ---- 動畫延遲（集中設定）----
   由左至右每欄 +85ms（相鄰圓 i 差 2，即每組約 170ms），每列再錯開 100ms。 */
const BASE = 250;          // 頁面就緒後等待
const PER_I = 85;
const ROW_STAGGER = 100;

const f = (n) => Number(n.toFixed(2));

function circle(cx, cy) {
  // 以兩段半圓弧描一個整圓，起點在最左，順向描線
  return `M ${f(cx - R)} ${f(cy)} a ${R} ${R} 0 1 0 ${2 * R} 0 a ${R} ${R} 0 1 0 ${-2 * R} 0 Z`;
}

/* 依 viewBox 尺寸產生交錯圓 SVG（僅 <svg>，可放入不同容器） */
function buildSvg(W, H) {
  const iMax = Math.round(W / g), jMax = Math.round(H / g);
  let paths = '';
  for (let j = 0; j <= jMax; j++) {
    for (let i = 0; i <= iMax; i++) {
      if (((i + j) & 1) !== 0) continue;           // 對角棋盤格
      const cx = i * g, cy = j * g;
      const d = BASE + i * PER_I + j * ROW_STAGGER;
      paths += `\n        <path class="deco-star" pathLength="1" vector-effect="non-scaling-stroke" style="--d:${d}ms" d="${circle(cx, cy)}"/>`;
    }
  }
  return `<svg class="deco-lattice__svg" viewBox="0 0 ${W} ${H}" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
        <g class="deco-lattice__grid">${paths}
        </g>
      </svg>`;
}

/* 內容頁：3:1 兩帶（同 deco-lattice-sm 比例） */
const svgWide = buildSvg(312, 104);
/* 首屏右上花紋：較高（≈ deco-lattice-lg 的 2.16:1） */
const svgTall = buildSvg(312, 143);

const svg =
`<div class="deco-lattice" data-deco aria-hidden="true">
      ${svgWide}
    </div>`;

const FILES = ['about.html', 'news.html', 'shop.html', 'subscription.html', 'course.html', 'article.html', 'qa.html', 'contacts.html'];

const sectionRe = /<section class="page-head">[\s\S]*?<\/section>/;
const textNewRe = /<div class="page-head__text">([\s\S]*?)<\/div>\s*<div class="deco-lattice"/;
const textOldRe = /<div class="shell">([\s\S]*?)<\/div>\s*<\/section>/;

for (const file of FILES) {
  let s = readFileSync(new URL('./' + file, import.meta.url), 'utf8');

  const section = s.match(sectionRe);
  if (!section) { console.log('!! page-head 未匹配：', file); continue; }

  const block = section[0];
  const m = block.match(textNewRe) || block.match(textOldRe);
  if (!m) { console.log('!! page-head 內文未匹配：', file); continue; }
  const inner = m[1].replace(/\s+$/, '');

  s = s.replace(sectionRe,
`<section class="page-head">
    <div class="shell page-head__inner">
      <div class="page-head__text">${inner}</div>
      ${svg}
    </div>
  </section>`);

  /* 掛上 deco.js（若尚未加入）：插在 site.js 之後 */
  if (!s.includes('assets/js/deco.js')) {
    s = s.replace('<script src="assets/js/site.js"></script>',
      '<script src="assets/js/site.js"></script>\n<script src="assets/js/deco.js"></script>');
  }

  writeFileSync(new URL('./' + file, import.meta.url), s);
  console.log('updated', file);
}

/* ---- 首屏 banner 花紋：把兩張 .lattice PNG 換成會描線的 SVG ---- */
{
  const file = 'index.html';
  let s = readFileSync(new URL('./' + file, import.meta.url), 'utf8');

  const lgRe = /<img class="lattice lattice--lg"[\s\S]*?>/;
  const smRe = /<img class="lattice lattice--sm"[\s\S]*?>/;

  if (lgRe.test(s) && smRe.test(s)) {
    s = s.replace(lgRe,
`<div class="lattice lattice--lg" data-deco aria-hidden="true">
        ${svgTall}
      </div>`);
    s = s.replace(smRe,
`<div class="lattice lattice--sm" data-deco aria-hidden="true">
        ${svgWide}
      </div>`);
  } else {
    console.log('!! index.html lattice 已非 <img>，略過取代');
  }

  if (!s.includes('assets/js/deco.js')) {
    s = s.replace('<script src="assets/js/main.js"></script>',
      '<script src="assets/js/main.js"></script>\n<script src="assets/js/deco.js"></script>');
  }

  writeFileSync(new URL('./' + file, import.meta.url), s);
  console.log('updated', file, '(banner 花紋)');
}
