/* =========================================================
   星花格紋描線裝飾 deco.js
   - 每次進入頁面播放一次；不監聽 scroll/resize，故不重播。
   - 若有品牌開場 Loading（html.is-intro），待其結束後再啟動。
   - prefers-reduced-motion：直接顯示完整靜態紋樣（不描線）。
   - 初始化失敗或未執行時：CSS 預設為完整實線圓，圖案完整可見。
   - 描線以每個 <path> 的 getTotalLength() 設定 dash，沿實際路徑生長；
     搭配 vector-effect:non-scaling-stroke 維持線寬。
   - 卸載時清除計時器。
   ========================================================= */
(function () {
  'use strict';

  var decos = Array.prototype.slice.call(document.querySelectorAll('[data-deco]'));
  if (!decos.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers = [];

  function num(v, fallback) { var n = parseFloat(v); return isNaN(n) ? fallback : n; }

  function config(el) {
    var cs = getComputedStyle(el);
    return {
      draw: num(cs.getPropertyValue('--deco-draw'), 1050),
      ease: (cs.getPropertyValue('--deco-ease') || '').trim() || 'cubic-bezier(.25,.8,.35,1)'
    };
  }

  function stars(el) { return Array.prototype.slice.call(el.querySelectorAll('.deco-star')); }

  function delayOf(path) { return num(getComputedStyle(path).getPropertyValue('--d'), 0); }

  /* 運筆用緩動：偏 in-out、起筆稍慢、收筆放緩，交錯幾組讓節奏不一致 */
  var BRUSH_EASES = [
    'cubic-bezier(.45,.05,.30,1)',
    'cubic-bezier(.50,.12,.28,1)',
    'cubic-bezier(.38,.08,.28,1)'
  ];

  function play(el) {
    el.classList.remove('is-done');

    if (reduce) { el.classList.add('is-done'); return; }   /* 靜態完整呈現 */

    var cfg = config(el);
    var width = num(getComputedStyle(el).getPropertyValue('--deco-width'), 1);
    var list = stars(el);
    var maxEnd = 0;

    /* 為每筆規劃：延遲加入 ±70ms 抖動打散格狀節奏、速度 0.82–1.32× 不一 */
    var plan = list.map(function (p, i) {
      var len;
      try { len = p.getTotalLength(); } catch (e) { len = 0; }
      var delay = Math.max(0, delayOf(p) + (Math.random() * 2 - 1) * 70);
      var dur = cfg.draw * (0.82 + Math.random() * 0.5);
      maxEnd = Math.max(maxEnd, delay + dur);
      return { p: p, len: len, delay: delay, dur: dur, ease: BRUSH_EASES[i % BRUSH_EASES.length] };
    });

    /* 未描狀態：藏起、線頭偏細、透明 */
    plan.forEach(function (o) {
      var p = o.p;
      if (!o.len) { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; p.style.opacity = '1'; return; }
      p.style.transition = 'none';
      p.style.strokeDasharray = o.len;
      p.style.strokeDashoffset = o.len;
      p.style.opacity = '0';
      p.style.strokeWidth = (width * 0.5) + 'px';
    });

    void el.offsetWidth;  /* 強制回流 */

    /* 運筆：沿線描出 ＋ 墨色淡入 ＋ 線寬由細漸壓，像畫筆落下 */
    plan.forEach(function (o) {
      var p = o.p;
      if (!o.len) return;
      p.style.transition =
        'stroke-dashoffset ' + o.dur + 'ms ' + o.ease + ' ' + o.delay + 'ms,' +
        'opacity ' + (o.dur * 0.55) + 'ms ease-out ' + o.delay + 'ms,' +
        'stroke-width ' + o.dur + 'ms ' + o.ease + ' ' + o.delay + 'ms';
      p.style.strokeDashoffset = '0';
      p.style.opacity = '1';
      p.style.strokeWidth = width + 'px';
    });

    var t = setTimeout(function () { el.classList.add('is-done'); }, maxEnd + 120);
    timers.push(t);
  }

  function revealAll(el) {
    stars(el).forEach(function (p) { p.style.opacity = '1'; });
  }

  var began = false;
  function begin() {
    if (began) return;              /* 只描一次，避免 observer 與保險 timeout 重複觸發 */
    began = true;
    decos.forEach(function (el) {
      try { play(el); }
      catch (e) { revealAll(el); }   /* 萬一描線失敗，至少顯示完整圖案 */
    });
  }

  function start() {
    var root = document.documentElement;
    /* 若品牌開場遮罩仍在，待首屏進場（hero-in）啟動或 is-intro 移除後再描線。
       （首頁開場結束是加上 hero-in、而非移除 is-intro，故兩者皆視為可開始）*/
    var ready = function () { return root.classList.contains('hero-in') || !root.classList.contains('is-intro'); };
    if (!ready() && 'MutationObserver' in window) {
      var safety;
      var obs = new MutationObserver(function () {
        if (ready()) { obs.disconnect(); clearTimeout(safety); begin(); }
      });
      obs.observe(root, { attributes: true, attributeFilter: ['class'] });
      safety = setTimeout(function () { obs.disconnect(); begin(); }, 6000);  /* 保險 */
      timers.push(safety);
    } else {
      begin();
    }
  }

  /* 卸載時清除計時器，避免殘留 */
  function cleanup() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers.length = 0; }
  window.addEventListener('pagehide', cleanup);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
