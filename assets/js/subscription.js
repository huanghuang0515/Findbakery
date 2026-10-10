/* =========================================================
   訂閱方案頁 subscription.html
   由 GG.catalog() 取出訂閱型商品（cat==='訂閱'）渲染為方案卡。
   ========================================================= */
(function () {
  'use strict';
  var GG = window.GG;
  if (!GG) return;
  var $ = function (s) { return document.querySelector(s); };
  var esc = GG.esc || function (s) { return String(s == null ? '' : s); };

  var grid = $('#planGrid');
  if (!grid) return;

  var PLANS = GG.catalog().filter(function (p) { return p.cat === '訂閱'; });

  /* 各方案的賣點（依 id 對應；找不到時給通用清單） */
  var FEATURES = {
    'sub-01': ['每週 4–5 款當季麵包', '適合 2–3 人小家庭', '固定週三配送'],
    'sub-02': ['法國發酵奶油可頌', '三天低溫發酵折疊', '每週剛出爐直送'],
    'sub-03': ['麵包＋奶油甜點＋果醬', '週末早午餐一次備齊', '週六上午配送']
  };
  var GENERIC = ['當季嚴選、新鮮現做', '彈性週期、隨時可調整', '不綁約、零手續費'];

  function planMarkup(p, featured) {
    var feats = FEATURES[p.id] || GENERIC;
    var lis = feats.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    return [
      '<div class="plan' + (featured ? ' plan--featured' : '') + '">',
        (featured ? '<span class="plan__badge">最受歡迎</span>' : ''),
        '<h2 class="plan__name">' + esc(p.name) + '</h2>',
        '<p class="plan__price"><b>' + GG.money(p.price) + '</b> / ' + esc(p.unit) + '</p>',
        '<ul class="plan__list">' + lis + '</ul>',
        '<button class="btn btn--primary btn--full" type="button" data-add="' + esc(p.id) + '">加入訂閱</button>',
      '</div>'
    ].join('');
  }

  var mid = PLANS.length > 1 ? 1 : 0;
  grid.innerHTML = PLANS.map(function (p, i) { return planMarkup(p, i === mid); }).join('');

  grid.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-add]');
    if (!btn) return;
    var id = btn.getAttribute('data-add');
    var res = GG.addItem(id, 1);
    var p = GG.find(id);
    if (!res || res.added <= 0) {
      if (window.ggToast) window.ggToast('目前無法加入此方案');
    } else if (window.ggToast) {
      window.ggToast('已加入訂閱：' + (p ? p.name : '方案'));
    }
  });
})();
