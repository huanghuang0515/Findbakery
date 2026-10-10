/* =========================================================
   會員中心 member.html
   依登入端別（C 一般會員 / B 企業會員）顯示不同功能。
   C 端：會員資訊、累積消費、消費商品排行、喜好商品清單、過去購物清單、訂單管理
   B 端：會員資訊、累積消費、過去購物清單、訂單管理
   ========================================================= */
(function () {
  'use strict';
  var A = window.GGAuth, GG = window.GG;
  if (!A) return;
  var $ = function (s) { return document.querySelector(s); };

  /* 未登入 → 導向登入頁 */
  var m = A.current();
  if (!m) { location.replace('login.html'); return; }

  function money(n) { return GG ? GG.money(n) : '$' + n; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---- 側欄會員卡 ---- */
  var typeLabel = m.type === 'B' ? 'B 端 · 企業會員' : 'C 端 · 一般會員';
  $('#memberCard').innerHTML =
    '<span class="member__type member__type--' + m.type + '">' + typeLabel + '</span>' +
    '<p class="member__name">' + esc(m.name) + '</p>' +
    '<p class="member__title">' + esc(m.title) + '</p>' +
    '<p class="member__email">' + esc(m.email) + '</p>';

  /* ---- 功能項（依端別）---- */
  var NAV = {
    C: [
      { key: 'info',       label: '會員資訊' },
      { key: 'spend',      label: '累積消費' },
      { key: 'ranking',    label: '消費商品排行' },
      { key: 'favourites', label: '喜好商品清單' },
      { key: 'history',    label: '過去購物清單' },
      { key: 'orders',     label: '訂單管理' }
    ],
    B: [
      { key: 'info',    label: '會員資訊' },
      { key: 'spend',   label: '累積消費' },
      { key: 'history', label: '過去購物清單' },
      { key: 'orders',  label: '訂單管理' }
    ]
  };
  var nav = NAV[m.type] || NAV.C;

  $('#memberNav').innerHTML = nav.map(function (item) {
    return '<button class="member__nav-item" type="button" data-panel="' + item.key + '">' + item.label + '</button>';
  }).join('');

  /* ---- 各功能面板 ---- */
  function row(label, value) {
    return '<div class="info-row"><dt>' + esc(label) + '</dt><dd>' + value + '</dd></div>';
  }

  var panels = {};

  panels.info = function () {
    var rows = [
      row('會員姓名', esc(m.name)),
      row('會員等級', esc(m.title))
    ];
    if (m.type === 'B') {
      rows.push(row('聯絡窗口', esc(m.contact)));
      rows.push(row('統一編號', esc(m.taxId)));
    }
    rows.push(row('電子信箱', esc(m.email)));
    rows.push(row('聯絡電話', esc(m.phone)));
    rows.push(row('聯絡地址', esc(m.address)));
    rows.push(row('加入日期', esc(m.joined)));
    return '<h2 class="panel__title">會員資訊</h2><dl class="info-list">' + rows.join('') + '</dl>';
  };

  panels.spend = function () {
    var stats =
      '<div class="stat-grid">' +
        '<div class="stat"><span class="stat__num">' + money(m.spendTotal) + '</span><span class="stat__lbl">累積消費金額</span></div>' +
        '<div class="stat"><span class="stat__num">' + m.orderCount + '</span><span class="stat__lbl">累積訂單數</span></div>' +
      '</div>';
    var extra;
    if (m.type === 'B') {
      extra = '<p class="panel__note">結帳條件：' + esc(m.terms) + '。企業客戶享批發價與定期對帳服務。</p>';
    } else {
      var need = m.nextTierGap;
      var pct = Math.min(100, Math.round(m.spendTotal / (m.spendTotal + need) * 100));
      extra =
        '<div class="tier">' +
          '<div class="tier__head"><span>距離「' + esc(m.nextTier) + '」</span><span>再消費 ' + money(need) + '</span></div>' +
          '<div class="tier__bar"><span style="width:' + pct + '%"></span></div>' +
        '</div>';
    }
    return '<h2 class="panel__title">累積消費</h2>' + stats + extra;
  };

  panels.ranking = function () {
    var max = m.ranking.reduce(function (a, b) { return Math.max(a, b.qty); }, 1);
    var items = m.ranking.map(function (r, i) {
      var pct = Math.round(r.qty / max * 100);
      return '<li class="rank-row">' +
        '<span class="rank-row__no">' + (i + 1) + '</span>' +
        '<img class="rank-row__img" src="assets/img/' + r.img + '.jpg" alt="' + esc(r.name) + '" width="48" height="48" loading="lazy">' +
        '<span class="rank-row__name">' + esc(r.name) + '</span>' +
        '<span class="rank-row__bar"><span style="width:' + pct + '%"></span></span>' +
        '<span class="rank-row__qty">' + r.qty + ' 次</span>' +
      '</li>';
    }).join('');
    return '<h2 class="panel__title">消費商品排行</h2>' +
      '<ul class="rank-list">' + items + '</ul>' +
      '<p class="panel__note panel__note--tag">此排行同步至後台數據中心，可用於 email 廣告行銷與再行銷推薦。</p>';
  };

  panels.favourites = function () {
    var favIds = (GG && GG.getFavs && GG.getFavs()) || [];
    var favs = favIds.map(function (id) { return GG.find(id); }).filter(Boolean);
    /* 若尚未收藏，給幾個示範，避免空白 */
    if (!favs.length && GG) favs = [GG.find('sub-02'), GG.find('p-07'), GG.find('p-08')].filter(Boolean);
    if (!favs.length) return '<h2 class="panel__title">喜好商品清單</h2><p class="panel__empty">尚未加入喜好商品。</p>';
    var cards = favs.map(function (p) {
      return '<li class="fav-card">' +
        '<a href="product.html?id=' + p.id + '"><img src="assets/img/' + p.img + '.jpg" alt="' + esc(p.name) + '" width="200" height="200" loading="lazy"></a>' +
        '<div class="fav-card__row"><span class="fav-card__name">' + esc(p.name) + '</span><span class="fav-card__price">' + money(p.price) + '</span></div>' +
      '</li>';
    }).join('');
    return '<h2 class="panel__title">喜好商品清單</h2><ul class="fav-grid">' + cards + '</ul>';
  };

  panels.history = function () {
    var items = m.history.map(function (h) {
      return '<li class="hist-row">' +
        '<img class="hist-row__img" src="assets/img/' + h.img + '.jpg" alt="' + esc(h.name) + '" width="56" height="56" loading="lazy">' +
        '<span class="hist-row__name">' + esc(h.name) + '</span>' +
        '<span class="hist-row__date">最近購買 ' + esc(h.last) + '</span>' +
        '<a class="hist-row__buy" href="product.html?id=' + guessId(h) + '">再次購買</a>' +
      '</li>';
    }).join('');
    return '<h2 class="panel__title">過去購物清單</h2><ul class="hist-list">' + items + '</ul>';
  };

  function guessId(h) {
    if (!GG) return '';
    var hit = GG.catalog().filter(function (p) { return p.name === h.name; })[0];
    return hit ? hit.id : '';
  }

  panels.orders = function () {
    var list = m.orders.slice();
    /* 若剛在本站下過單，插入最近一筆真實訂單 */
    var last = GG && GG.getOrder && GG.getOrder();
    if (last && last.no && !list.some(function (o) { return o.no === last.no; })) {
      list.unshift({
        no: last.no,
        date: (last.date || '').slice(0, 10).replace(/-/g, '.'),
        items: last.lines.map(function (l) { return l.name + ' ×' + l.qty; }).join('、'),
        total: last.total, status: '處理中'
      });
    }
    var rows = list.map(function (o) {
      return '<tr>' +
        '<td class="ord__no">' + esc(o.no) + '</td>' +
        '<td>' + esc(o.date) + '</td>' +
        '<td class="ord__items">' + esc(o.items) + '</td>' +
        '<td class="ord__total">' + money(o.total) + '</td>' +
        '<td><span class="ord__status">' + esc(o.status) + '</span></td>' +
      '</tr>';
    }).join('');
    return '<h2 class="panel__title">訂單管理</h2>' +
      '<div class="ord-wrap"><table class="ord-table">' +
        '<thead><tr><th>訂單編號</th><th>日期</th><th>內容</th><th>金額</th><th>狀態</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>';
  };

  /* ---- 切換 ---- */
  var content = $('#memberContent');
  var navBtns = Array.prototype.slice.call(document.querySelectorAll('.member__nav-item'));

  function show(key) {
    if (!panels[key]) key = nav[0].key;
    content.innerHTML = '<div class="panel">' + panels[key]() + '</div>';
    navBtns.forEach(function (b) { b.classList.toggle('is-active', b.dataset.panel === key); });
    if (location.hash.slice(1) !== key) history.replaceState(null, '', '#' + key);
  }

  $('#memberNav').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-panel]');
    if (btn) show(btn.dataset.panel);
  });

  /* 起始面板：依 hash，否則第一項 */
  var start = location.hash.slice(1);
  show(nav.some(function (n) { return n.key === start; }) ? start : nav[0].key);

  /* ---- 登出 ---- */
  $('#logoutBtn').addEventListener('click', function () {
    A.logout();
    location.href = 'login.html';
  });
})();
