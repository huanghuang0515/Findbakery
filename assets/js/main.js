/* =========================================================
   Gothel's Garden — 首頁互動
   ========================================================= */
(function () {
  'use strict';

  /* ------------------------------------------------------
     商品資料（改用共用資料層 store.js）
     ------------------------------------------------------ */
  const store = window.GG;
  const CATALOG = store ? store.catalog() : [];
  const SUBSCRIPTIONS = CATALOG.filter(function (p) { return p.cat === '訂閱'; });
  const PRODUCTS      = CATALOG.filter(function (p) { return p.cat !== '訂閱'; });

  const FAV_KEY = 'gg.favourites';

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function readStore(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* 私密瀏覽等情況忽略 */ }
  }

  let favourites = readStore(FAV_KEY, []);

  /* ------------------------------------------------------
     小提示
     ------------------------------------------------------ */
  const toastEl = $('#toast');
  let toastTimer = null;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  }

  /* ------------------------------------------------------
     商品卡
     ------------------------------------------------------ */
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.4S3.8 15.3 3.8 9.6A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 8.2 2c0 5.7-8.2 10.8-8.2 10.8z"/></svg>';

  const esc = (store && store.esc) ? store.esc : function (s) { return String(s == null ? '' : s); };

  function cardMarkup(item) {
    const faved = favourites.indexOf(item.id) !== -1;
    const name = esc(item.name), alt = esc(item.alt), img = esc(item.img);
    return [
      '<li class="card reveal" data-id="' + esc(item.id) + '">',
        '<a class="card__media" href="product.html?id=' + encodeURIComponent(item.id) + '" aria-label="查看 ' + name + '">',
          '<img src="assets/img/' + img + '.jpg" alt="' + alt + '" width="900" height="900" loading="lazy" decoding="async">',
          '<span class="card__add" data-add>加入購物車</span>',
        '</a>',
        '<div class="card__row">',
          '<div>',
            '<h3 class="card__name">' + name + '</h3>',
            '<p class="card__price"><span>$</span>' + item.price + '</p>',
          '</div>',
          '<button class="card__fav" type="button" data-fav',
            ' aria-pressed="' + faved + '"',
            ' aria-label="收藏 ' + name + '">' + HEART + '</button>',
        '</div>',
        '<span class="card__sold">已售出 ' + item.sold + '</span>',
      '</li>'
    ].join('');
  }

  function renderGrid(el, items) {
    if (el) el.innerHTML = items.map(cardMarkup).join('');
  }

  renderGrid($('#subscriptionGrid'), SUBSCRIPTIONS);
  renderGrid($('#shopGrid'), PRODUCTS);

  /* 收藏 / 加入購物車（事件委派） */
  document.addEventListener('click', function (e) {
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      const card = favBtn.closest('.card');
      const id = card && card.dataset.id;
      if (!id) return;
      const idx = favourites.indexOf(id);
      const next = idx === -1;
      if (next) favourites.push(id); else favourites.splice(idx, 1);
      writeStore(FAV_KEY, favourites);
      favBtn.setAttribute('aria-pressed', String(next));
      /* 成功切換後短暫放大 pop（重置 class 以便反覆觸發） */
      if (!reduceMotion) {
        favBtn.classList.remove('is-pop');
        void favBtn.offsetWidth;
        favBtn.classList.add('is-pop');
      }
      toast(next ? '已加入收藏' : '已從收藏移除');
      return;
    }

    const addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      e.preventDefault();          /* 「加入購物車」在商品連結內，阻止跳頁 */
      const card = addBtn.closest('.card');
      const id = card && card.dataset.id;
      const name = $('.card__name', card);
      if (id && store) store.addItem(id, 1);   /* 真的加入購物車（gg:cartchange 會更新頁首件數） */
      toast('已加入購物車：' + (name ? name.textContent : '商品'));
      return;
    }

    /* 佔位連結不跳頁 */
    const link = e.target.closest('a[href="#"]');
    if (link) e.preventDefault();
  });

  if (store) store.mountBadge();   /* 頁首購物車件數（含跨分頁同步） */

  /* ------------------------------------------------------
     頁首：捲動狀態 / 行動選單 / 搜尋
     ------------------------------------------------------ */
  const header = $('#siteHeader');
  let ticking = false;
  let stuck = false;

  /* 兩段式門檻（遲滯）：向下超過 STICK_ON 才縮起，向上低於 STICK_OFF 才展開。
     單一門檻會在臨界點被細微捲動反覆切換，導致頁首不斷抽動。 */
  const STICK_ON = 120;
  const STICK_OFF = 40;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      const y = window.scrollY;
      if (!stuck && y > STICK_ON) stuck = true;
      else if (stuck && y < STICK_OFF) stuck = false;
      if (header) header.classList.toggle('is-stuck', stuck);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navToggle = $('#navToggle');
  const mainNav = $('#mainNav');

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

  const searchToggle = $('#searchToggle');
  const searchPanel = $('#searchPanel');

  if (searchToggle && searchPanel) {
    searchToggle.addEventListener('click', function () {
      const open = searchToggle.getAttribute('aria-expanded') !== 'true';
      searchToggle.setAttribute('aria-expanded', String(open));
      searchPanel.hidden = !open;
      if (open) { const i = $('#searchInput'); if (i) i.focus(); }
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

  /* ------------------------------------------------------
     電子報訂閱
     ------------------------------------------------------ */
  const newsForm = $('#newsForm');
  if (newsForm) {
    const input = $('#newsEmail');
    const msg = $('#newsMsg');
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    newsForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const value = input.value.trim();
      const ok = EMAIL.test(value);

      input.classList.toggle('is-error', !ok);
      msg.classList.toggle('is-error', !ok);
      msg.textContent = ok
        ? '訂閱成功，出爐通知將寄到 ' + value
        : '請輸入正確的電子信箱格式';

      if (ok) { newsForm.reset(); input.classList.remove('is-error'); }
      else input.focus();
    });
  }

  /* ======================================================
     動畫系統
     ====================================================== */
  const docEl = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  /* 清理登錄：卸載時解除 observer / timer / rAF / listener */
  const cleanups = [];
  function teardown() {
    while (cleanups.length) {
      try { cleanups.pop()(); } catch (err) { /* 忽略單一清理錯誤 */ }
    }
  }
  window.addEventListener('pagehide', teardown, { once: true });

  /* ------------------------------------------------------
     滾動揭露：一般揭露只播一次；卡片依「同排欄位」stagger
     ------------------------------------------------------ */
  function gridCols(grid) {
    const t = getComputedStyle(grid).gridTemplateColumns;
    return Math.max(1, t.split(' ').filter(Boolean).length);
  }

  function revealNow(el) {
    let delay = 0;
    if (el.classList.contains('card') && el.parentElement) {
      const cols = gridCols(el.parentElement);
      const idx = Array.prototype.indexOf.call(el.parentElement.children, el);
      delay = (idx % cols) * 80;                  /* 同排逐欄，不累加整頁索引 */
    } else if (el.dataset.revealDelay) {
      delay = parseInt(el.dataset.revealDelay, 10) || 0;
    }
    el.style.setProperty('--reveal-delay', delay + 'ms');
    el.classList.add('is-in');
  }

  function setupReveal() {
    const els = $$('.reveal');
    if (!els.length) return;

    /* 減少動態或不支援 IO：直接全部顯示 */
    if (reduceMotion || !hasIO) {
      els.forEach(el => el.classList.add('is-in'));
      return;
    }

    /* rootMargin 負下緣讓元素約進入 15% 才觸發；threshold 用 0 而非比例值，
       因為分隔線這類極扁元素的 intersectionRatio 不可靠。 */
    const io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealNow(entry.target);
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });

    els.forEach(el => io.observe(el));
    cleanups.push(() => io.disconnect());

    /* 安全網：若 IO 因故未回呼（例如瀏覽器還原捲動位置、直接進入錨點，
       或環境不觸發），仍確保「當前可見」的內容顯示出來，不會永久隱形。 */
    const sweep = function () {
      const vh = window.innerHeight || 0;
      els.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) revealNow(el);
      });
    };
    const t1 = setTimeout(sweep, 600);
    cleanups.push(() => clearTimeout(t1));

    /* 捲動後援：IO 正常時元素已被 unobserve，這裡不會重複處理；
       IO 若失效，則改由捲動逐一揭露，仍維持「進入視窗才顯示」的行為，
       不會一次把整頁內容全部彈出。 */
    let sweepTick = false;
    const onSweep = function () {
      if (sweepTick) return;
      sweepTick = true;
      requestAnimationFrame(function () { sweep(); sweepTick = false; });
    };
    window.addEventListener('scroll', onSweep, { passive: true });
    window.addEventListener('resize', onSweep, { passive: true });
    cleanups.push(function () {
      window.removeEventListener('scroll', onSweep);
      window.removeEventListener('resize', onSweep);
    });
  }

  /* ------------------------------------------------------
     首屏視差 + 滑鼠微移（僅桌面；遮罩分離，外框固定）
     ------------------------------------------------------ */
  function setupParallax() {
    const stage = $('.hero__stage');
    const layers = $$('.hero__media').map(function (el) {
      const host = el.closest('[data-parallax]');
      return { el: el, depth: host ? parseFloat(host.dataset.parallax) || 0 : 0 };
    });
    const desktop = window.matchMedia('(min-width:1025px)').matches;
    const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    if (reduceMotion || !desktop || !stage || !layers.length) return;

    const aboutStars = $('.about__stars');   /* 側欄星花：隨捲動輕微轉動 */
    const about = $('.about');

    let mx = 0, my = 0, cx = 0, cy = 0, sy = window.scrollY, raf = 0, running = false, alive = true;

    function onMouse(e) {
      const r = stage.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;   /* -0.5 .. 0.5 */
      my = (e.clientY - r.top) / r.height - 0.5;
      wake();
    }
    function onScroll() { sy = window.scrollY; wake(); }

    /* 隨需喚醒：值收斂後停止 rAF，避免持續空轉的迴圈 */
    function wake() {
      if (running || !alive) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }
    function frame() {
      cx += (mx - cx) * 0.08;
      cy += (my - cy) * 0.08;
      const h = stage.offsetHeight || 1;
      const prog = Math.min(1, Math.max(0, sy / h));   /* 0 頂端 → 1 捲離 */
      layers.forEach(function (m) {
        const par = prog * m.depth;                    /* 捲動視差 */
        const dx = cx * m.depth * 0.5;                 /* 滑鼠微移 */
        const dy = cy * m.depth * 0.5;
        m.el.style.setProperty('--tx', dx.toFixed(2) + 'px');
        m.el.style.setProperty('--ty', (par + dy).toFixed(2) + 'px');
      });
      /* 側欄星花：以品牌故事區在視窗中的進度映射到 ±10°（非持續自轉） */
      if (aboutStars && about) {
        const ar = about.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const p = Math.min(1, Math.max(0, (vh - ar.top) / (vh + ar.height)));
        aboutStars.style.setProperty('--star-rot', ((p - 0.5) * 20).toFixed(2) + 'deg');
      }
      /* 滑鼠 lerp 收斂即停（捲動視差已隨當前 sy 套用完成） */
      if (Math.abs(mx - cx) < 0.0015 && Math.abs(my - cy) < 0.0015) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    if (fine) window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    wake();  /* 依當前捲動位置套用一次初始視差 */

    cleanups.push(function () {
      alive = false; running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('scroll', onScroll);
      layers.forEach(function (m) {
        m.el.style.removeProperty('--tx');
        m.el.style.removeProperty('--ty');
      });
      if (aboutStars) aboutStars.style.removeProperty('--star-rot');
    });
  }

  /* ------------------------------------------------------
     品牌開場：描線 + 倒數 → 淡出 → 首屏進場
     ------------------------------------------------------ */
  const intro = $('#intro');
  const introCount = $('#introCount');
  let introTimers = [];
  let inertTargets = [];

  function clearIntroTimers() {
    introTimers.forEach(clearTimeout);
    introTimers = [];
  }

  function tick(txt) {
    if (!introCount) return;
    introCount.textContent = txt;
    introCount.classList.remove('tick');
    void introCount.offsetWidth;
    introCount.classList.add('tick');
  }

  function setBackgroundInert(on) {
    if (on) {
      inertTargets = [$('#siteHeader'), $('#main'), $('.site-footer')].filter(Boolean);
      inertTargets.forEach(function (el) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); });
    } else {
      inertTargets.forEach(function (el) { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); });
      inertTargets = [];
    }
  }

  function startHero() { docEl.classList.add('hero-in'); }

  function endIntro() {
    clearIntroTimers();
    if (window.__ggIntroSafety) { clearTimeout(window.__ggIntroSafety); window.__ggIntroSafety = null; }
    if (!intro) { startHero(); return; }

    intro.classList.add('is-out');
    /* 淡出與首屏進場略重疊，銜接更順 */
    introTimers.push(setTimeout(startHero, 260));
    introTimers.push(setTimeout(function () {
      intro.setAttribute('hidden', '');
      /* 移除強制旗標：之後若使用者設定了減少動態，仍照常關閉動態 */
      docEl.classList.remove('is-drawing', 'force-intro');
      setBackgroundInert(false);
      /* 恢復焦點到主內容 */
      const main = $('#main');
      if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
    }, 620));
  }

  function runIntro(forced) {
    if (!intro) { docEl.classList.remove('is-intro'); startHero(); return; }
    clearIntroTimers();
    /* 完整重置：清除進場與描線狀態，強制 reflow 讓 CSS 動畫重播 */
    docEl.classList.remove('hero-in', 'anim-in', 'is-drawing');
    docEl.classList.add('is-intro');
    /* 手動重播＝明確要求，需覆寫減少動態才看得到 */
    if (forced) docEl.classList.add('force-intro');
    intro.classList.remove('is-out');
    intro.removeAttribute('hidden');
    if (introCount) { introCount.textContent = '03'; introCount.classList.remove('tick'); }
    void intro.offsetWidth;
    docEl.classList.add('is-drawing');

    setBackgroundInert(true);
    const skip = $('#introSkip');
    if (skip) skip.focus({ preventScroll: true });

    /* 倒數 03 → 02 → 01（每秒一次） */
    introTimers.push(setTimeout(function () { tick('02'); }, 1000));
    introTimers.push(setTimeout(function () { tick('01'); }, 2000));
    /* 3s 描繪完成 + 約 150ms 停留 → 淡出銜接首屏 */
    introTimers.push(setTimeout(endIntro, 3150));

    /* 重播時重設安全逾時 */
    if (window.__ggIntroSafety) clearTimeout(window.__ggIntroSafety);
    window.__ggIntroSafety = setTimeout(endIntro, 4500);
  }

  function setupIntro() {
    const skip = $('#introSkip');
    if (skip) {
      skip.addEventListener('click', function () { clearIntroTimers(); endIntro(); });
    }
    cleanups.push(clearIntroTimers);

    const forcedByUrl = docEl.classList.contains('force-intro');
    if (docEl.classList.contains('is-intro') && intro && (!reduceMotion || forcedByUrl)) {
      runIntro(forcedByUrl);
    } else {
      /* 減少動態／?nointro：確保遮罩收起、內容直接顯示 */
      if (intro) intro.setAttribute('hidden', '');
      docEl.classList.remove('is-intro');
      docEl.classList.add('anim-in');
    }
  }

  /* ------------------------------------------------------
     啟動
     ------------------------------------------------------ */
  setupReveal();
  setupParallax();
  setupIntro();
})();
