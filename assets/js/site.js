/* =========================================================
   Gothel's Garden — 子頁共用頁首行為
   （購買流程各頁載入；首頁另由 main.js 處理，含開場動畫）
   ========================================================= */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };

  /* ---- 頁首吸頂（兩段式門檻，避免臨界抖動）---- */
  var header = $('#siteHeader');
  var ticking = false, stuck = false;
  var STICK_ON = 120, STICK_OFF = 40;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      if (!stuck && y > STICK_ON) stuck = true;
      else if (stuck && y < STICK_OFF) stuck = false;
      if (header) header.classList.toggle('is-stuck', stuck);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- 行動選單 ---- */
  var navToggle = $('#navToggle'), mainNav = $('#mainNav');
  function setNav(open) {
    if (!navToggle || !mainNav) return;
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
    mainNav.classList.toggle('is-open', open);
  }
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      setNav(navToggle.getAttribute('aria-expanded') !== 'true');
    });
  }
  if (mainNav) {
    mainNav.addEventListener('click', function (e) {
      if (e.target.closest('a') && window.matchMedia('(max-width:1024px)').matches) setNav(false);
    });
  }

  /* ---- 搜尋面板 ---- */
  var searchToggle = $('#searchToggle'), searchPanel = $('#searchPanel');
  if (searchToggle && searchPanel) {
    searchToggle.addEventListener('click', function () {
      var open = searchToggle.getAttribute('aria-expanded') !== 'true';
      searchToggle.setAttribute('aria-expanded', String(open));
      searchPanel.hidden = !open;
      if (open) { var i = $('#searchInput'); if (i) i.focus(); }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    setNav(false);
    if (searchToggle && searchPanel && !searchPanel.hidden) {
      searchToggle.setAttribute('aria-expanded', 'false');
      searchPanel.hidden = true;
    }
  });

  /* ---- 電子報訂閱（頁尾，若存在）---- */
  var newsForm = $('#newsForm');
  if (newsForm) {
    var input = $('#newsEmail'), msg = $('#newsMsg');
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    newsForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = input.value.trim(), ok = EMAIL.test(value);
      input.classList.toggle('is-error', !ok);
      msg.classList.toggle('is-error', !ok);
      msg.textContent = ok ? '訂閱成功，出爐通知將寄到 ' + value : '請輸入正確的電子信箱格式';
      if (ok) { newsForm.reset(); input.classList.remove('is-error'); } else input.focus();
    });
  }

  /* ---- 小提示（供各子頁共用）---- */
  var toastEl = $('#toast'), toastTimer = null;
  window.ggToast = function (message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  };

  /* ---- 滾動揭露（子頁共用；首頁另由 main.js 處理）---- */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function revealAll(nodes) { for (var i = 0; i < nodes.length; i++) nodes[i].classList.add('is-in'); }
  (function setupReveal() {
    var nodes = document.querySelectorAll('.reveal');
    if (!nodes.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) { revealAll(nodes); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8%' });
    for (var i = 0; i < nodes.length; i++) io.observe(nodes[i]);
    /* 保險：若 3 秒後仍有殘留（例如觀察未觸發），全部顯示 */
    setTimeout(function () { revealAll(document.querySelectorAll('.reveal:not(.is-in)')); }, 3000);
  })();

  /* ---- 頁首購物車件數 ---- */
  if (window.GG) window.GG.mountBadge();

  /* ---- 佔位連結不跳頁 ---- */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href="#"]');
    if (link) e.preventDefault();
  });
})();
