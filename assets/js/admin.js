/* =========================================================
   後台主程式 admin.html
   五模組：儀表板 / 商品管理 / 訂單管理 / 會員管理 / 數據行銷
   ========================================================= */
(function () {
  'use strict';
  var A = window.GGAdmin;
  if (!A) return;
  var $ = function (s) { return document.querySelector(s); };

  /* 未登入 → 導向後台登入 */
  if (!A.isLoggedIn()) { location.replace('admin-login.html'); return; }
  var admin = A.current();

  /* ---- 小工具 ---- */
  var toastEl = $('#toast'), tTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(tTimer); tTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2000);
  }
  function money(n) { return A.money(n); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  var img = function (name) { return 'assets/img/' + name + '.jpg'; };

  /* ---- 側欄 ---- */
  $('#adminUser').innerHTML =
    '<span class="admin-user__name">' + esc(admin.name) + '</span>' +
    '<span class="admin-user__role">' + esc(admin.role) + '</span>';

  var NAV = [
    { key: 'dashboard', label: '儀表板' },
    { key: 'products',  label: '商品管理' },
    { key: 'orders',    label: '訂單管理' },
    { key: 'members',   label: '會員管理' },
    { key: 'marketing', label: '數據行銷' }
  ];
  $('#adminNav').innerHTML = NAV.map(function (n) {
    return '<button class="admin-nav__item" type="button" data-nav="' + n.key + '">' + n.label + '</button>';
  }).join('');

  var content = $('#adminContent');
  var statusOpts = A.STATUSES;

  /* ====================================================
     模組：儀表板
     ==================================================== */
  function viewDashboard() {
    var ms = A.memberStats();
    var actives = A.products().filter(function (p) { return p.active !== false; }).length;
    var cards =
      statCard(money(A.revenue()), '營業額（未取消訂單）') +
      statCard(A.orderCount(), '訂單總數') +
      statCard(ms.total + ' 位', '會員數（C ' + ms.C + '／B ' + ms.B + '）') +
      statCard(actives + ' 項', '上架商品');

    var top = A.topProducts(5);
    var max = top.reduce(function (a, b) { return Math.max(a, b.qty); }, 1);
    var topHtml = top.map(function (t, i) {
      return '<li class="rank-row">' +
        '<span class="rank-row__no">' + (i + 1) + '</span>' +
        '<img class="rank-row__img" src="' + img(t.img) + '" alt="" width="48" height="48" loading="lazy">' +
        '<span class="rank-row__name">' + esc(t.name) + '</span>' +
        '<span class="rank-row__bar"><span style="width:' + Math.round(t.qty / max * 100) + '%"></span></span>' +
        '<span class="rank-row__qty">' + t.qty + ' 件</span>' +
      '</li>';
    }).join('');

    var recent = A.orders().slice(0, 5).map(orderRowStatic).join('');

    return '<div class="stat-grid stat-grid--4">' + cards + '</div>' +
      '<div class="admin-cols">' +
        '<section class="admin-panel"><h2 class="admin-panel__h">熱銷商品</h2><ul class="rank-list">' + topHtml + '</ul></section>' +
        '<section class="admin-panel"><h2 class="admin-panel__h">近期訂單</h2>' +
          '<div class="ord-wrap"><table class="ord-table"><thead><tr><th>編號</th><th>顧客</th><th>金額</th><th>狀態</th></tr></thead><tbody>' + recent + '</tbody></table></div>' +
        '</section>' +
      '</div>';
  }
  function statCard(num, label) {
    return '<div class="stat"><span class="stat__num">' + num + '</span><span class="stat__lbl">' + label + '</span></div>';
  }
  function orderRowStatic(o) {
    return '<tr><td class="ord__no">' + esc(o.no) + '</td><td>' + esc(o.customer) + '</td>' +
           '<td class="ord__total">' + money(o.total) + '</td><td>' + statusTag(o.status) + '</td></tr>';
  }
  function statusTag(s) {
    var mod = s === '已取消' ? ' is-cancel' : (s === '已完成' ? ' is-done' : '');
    return '<span class="ord__status' + mod + '">' + esc(s) + '</span>';
  }

  /* ====================================================
     模組：商品管理
     ==================================================== */
  function viewProducts() {
    var rows = A.products().map(function (p) {
      return '<tr data-id="' + p.id + '">' +
        '<td><img class="admin-thumb" src="' + img(p.img) + '" alt="" width="46" height="46" loading="lazy"></td>' +
        '<td class="admin-td-name">' + esc(p.name) + '<span class="admin-td-sub">' + esc(p.id) + '</span></td>' +
        '<td>' + esc(p.cat) + '</td>' +
        '<td><span class="admin-inline">$<input class="admin-input admin-input--price" type="number" min="0" value="' + p.price + '" data-price></span></td>' +
        '<td><input class="admin-input admin-input--stock" type="number" min="0" value="' + (p.stock != null ? p.stock : 0) + '" data-stock></td>' +
        '<td><button class="admin-toggle' + (p.active === false ? ' is-off' : '') + '" type="button" data-toggle>' + (p.active === false ? '已下架' : '上架中') + '</button></td>' +
        '<td><button class="admin-del" type="button" data-del aria-label="刪除">刪除</button></td>' +
      '</tr>';
    }).join('');
    return '<div class="admin-toolbar"><p class="admin-hint">共 ' + A.products().length + ' 項商品，改價／庫存即時儲存並連動前台。</p>' +
        '<button class="btn btn--primary" type="button" id="addProductBtn">＋ 新增商品</button></div>' +
      '<div class="ord-wrap"><table class="ord-table admin-table"><thead><tr><th>圖</th><th>名稱</th><th>分類</th><th>價格</th><th>庫存</th><th>狀態</th><th>操作</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  function bindProducts() {
    var add = $('#addProductBtn');
    if (add) add.addEventListener('click', function () { openModal(); });
    content.querySelectorAll('.admin-table tbody tr').forEach(function (tr) {
      var id = tr.dataset.id;
      tr.querySelector('[data-price]').addEventListener('change', function (e) {
        var v = Math.max(0, parseInt(e.target.value, 10) || 0);
        e.target.value = v; A.updateProduct(id, { price: v }); toast('已更新價格');
      });
      tr.querySelector('[data-stock]').addEventListener('change', function (e) {
        var v = Math.max(0, parseInt(e.target.value, 10) || 0);
        e.target.value = v; A.updateProduct(id, { stock: v }); toast('已更新庫存');
      });
      tr.querySelector('[data-toggle]').addEventListener('click', function () {
        A.toggleActive(id); render('products');
        var p = A.findProduct(id); toast(p && p.active === false ? '已下架' : '已上架');
      });
      tr.querySelector('[data-del]').addEventListener('click', function () {
        var p = A.findProduct(id);
        if (window.confirm('確定刪除「' + (p ? p.name : '') + '」？')) { A.removeProduct(id); render('products'); toast('已刪除商品'); }
      });
    });
  }

  /* Modal（新增商品） */
  var modal = $('#modal');
  function openModal() {
    $('#productForm').reset();
    modal.hidden = false;
    $('#pName').focus();
  }
  function closeModal() { modal.hidden = true; }
  modal.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
  $('#productForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#pName').value.trim();
    if (!name) { $('#pName').focus(); return; }
    A.addProduct({
      name: name, price: $('#pPrice').value, stock: $('#pStock').value,
      cat: $('#pCat').value, unit: $('#pUnit').value.trim() || '每入',
      img: $('#pImg').value, desc: $('#pDesc').value.trim()
    });
    closeModal(); render('products'); toast('已新增商品：' + name);
  });

  /* ====================================================
     模組：訂單管理
     ==================================================== */
  function viewOrders() {
    var rows = A.orders().map(function (o) {
      var opts = statusOpts.map(function (s) {
        return '<option' + (s === o.status ? ' selected' : '') + '>' + s + '</option>';
      }).join('');
      var items = (o.lines || []).map(function (l) { return l.name + ' ×' + l.qty; }).join('、');
      return '<tr data-no="' + esc(o.no) + '">' +
        '<td class="ord__no">' + esc(o.no) + '</td>' +
        '<td>' + esc(o.date) + '</td>' +
        '<td><span class="admin-badge admin-badge--' + o.type + '">' + o.type + ' 端</span></td>' +
        '<td>' + esc(o.customer) + '</td>' +
        '<td class="ord__items">' + esc(items) + '</td>' +
        '<td class="ord__total">' + money(o.total) + '</td>' +
        '<td><select class="admin-select" data-status>' + opts + '</select></td>' +
      '</tr>';
    }).join('');
    return '<div class="admin-toolbar"><p class="admin-hint">共 ' + A.orders().length + ' 筆訂單，可直接切換狀態。</p></div>' +
      '<div class="ord-wrap"><table class="ord-table"><thead><tr><th>訂單編號</th><th>日期</th><th>端別</th><th>顧客</th><th>內容</th><th>金額</th><th>狀態</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }
  function bindOrders() {
    content.querySelectorAll('[data-status]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var no = sel.closest('tr').dataset.no;
        A.setOrderStatus(no, sel.value); toast('訂單 ' + no + ' → ' + sel.value);
      });
    });
  }

  /* ====================================================
     模組：會員管理
     ==================================================== */
  function viewMembers(filter) {
    filter = filter || 'all';
    var list = A.members().filter(function (m) { return filter === 'all' || m.type === filter; });
    var rows = list.map(function (m) {
      return '<tr>' +
        '<td class="admin-td-name">' + esc(m.name) + '</td>' +
        '<td><span class="admin-badge admin-badge--' + m.type + '">' + m.type + ' 端</span></td>' +
        '<td>' + esc(m.title) + '</td>' +
        '<td>' + esc(m.email) + '</td>' +
        '<td>' + esc(m.phone) + '</td>' +
        '<td class="ord__total">' + money(m.spendTotal) + '</td>' +
        '<td>' + m.orderCount + '</td>' +
        '<td>' + esc(m.joined) + '</td>' +
      '</tr>';
    }).join('');
    var tabs = ['all', 'C', 'B'].map(function (t) {
      return '<button class="admin-tab' + (t === filter ? ' is-active' : '') + '" type="button" data-filter="' + t + '">' +
        (t === 'all' ? '全部' : t + ' 端') + '</button>';
    }).join('');
    return '<div class="admin-toolbar"><div class="admin-tabs">' + tabs + '</div>' +
        '<p class="admin-hint">' + list.length + ' 位會員</p></div>' +
      '<div class="ord-wrap"><table class="ord-table"><thead><tr><th>姓名</th><th>端別</th><th>等級</th><th>Email</th><th>電話</th><th>累積消費</th><th>訂單</th><th>加入</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }
  function bindMembers() {
    content.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () { content.innerHTML = viewMembers(b.dataset.filter); bindMembers(); });
    });
  }

  /* ====================================================
     模組：數據行銷
     ==================================================== */
  var mkFilter = { type: '', minSpend: 0 };
  function viewMarketing() {
    var top = A.topProducts(8);
    var max = top.reduce(function (a, b) { return Math.max(a, b.qty); }, 1);
    var topHtml = top.map(function (t, i) {
      return '<li class="rank-row">' +
        '<span class="rank-row__no">' + (i + 1) + '</span>' +
        '<img class="rank-row__img" src="' + img(t.img) + '" alt="" width="48" height="48" loading="lazy">' +
        '<span class="rank-row__name">' + esc(t.name) + '</span>' +
        '<span class="rank-row__bar"><span style="width:' + Math.round(t.qty / max * 100) + '%"></span></span>' +
        '<span class="rank-row__qty">' + t.qty + ' 件</span>' +
      '</li>';
    }).join('');

    return '<section class="admin-panel"><h2 class="admin-panel__h">消費商品排行</h2>' +
        '<ul class="rank-list">' + topHtml + '</ul>' +
        '<p class="panel__note panel__note--tag">此排行同步至後台數據中心，可作為 email 廣告行銷與再行銷推薦依據。</p>' +
      '</section>' +
      '<section class="admin-panel"><h2 class="admin-panel__h">Email 行銷名單</h2>' +
        '<div class="admin-toolbar admin-toolbar--wrap">' +
          '<div class="mk-filter">' +
            '<label>端別 <select class="admin-select" id="mkType"><option value="">全部</option><option value="C">C 端</option><option value="B">B 端</option></select></label>' +
            '<label>累積消費 ≥ <select class="admin-select" id="mkSpend"><option value="0">不限</option><option value="5000">$5,000</option><option value="10000">$10,000</option><option value="100000">$100,000</option></select></label>' +
          '</div>' +
          '<button class="btn btn--primary" type="button" id="exportBtn">匯出 CSV</button>' +
        '</div>' +
        '<div id="mkResult"></div>' +
      '</section>';
  }
  function renderMkResult() {
    var rows = A.marketingList({ type: mkFilter.type || null, minSpend: mkFilter.minSpend || 0 });
    $('#mkResult').innerHTML =
      '<p class="admin-hint" style="margin:0 0 12px">符合條件：<strong>' + rows.length + '</strong> 位，可匯出寄送行銷信。</p>' +
      '<div class="ord-wrap"><table class="ord-table"><thead><tr><th>姓名</th><th>端別</th><th>Email</th><th>累積消費</th></tr></thead><tbody>' +
      rows.map(function (m) {
        return '<tr><td class="admin-td-name">' + esc(m.name) + '</td>' +
          '<td><span class="admin-badge admin-badge--' + m.type + '">' + m.type + ' 端</span></td>' +
          '<td>' + esc(m.email) + '</td><td class="ord__total">' + money(m.spendTotal) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return rows;
  }
  function bindMarketing() {
    mkFilter = { type: '', minSpend: 0 };
    renderMkResult();
    $('#mkType').addEventListener('change', function (e) { mkFilter.type = e.target.value; renderMkResult(); });
    $('#mkSpend').addEventListener('change', function (e) { mkFilter.minSpend = parseInt(e.target.value, 10) || 0; renderMkResult(); });
    $('#exportBtn').addEventListener('click', function () {
      var rows = A.marketingList({ type: mkFilter.type || null, minSpend: mkFilter.minSpend || 0 });
      var csv = A.exportCsv(rows);
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'gg-marketing-list.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast('已匯出 ' + rows.length + ' 筆名單');
    });
  }

  /* ====================================================
     路由
     ==================================================== */
  var VIEWS = {
    dashboard: { title: '儀表板',   render: viewDashboard, bind: null },
    products:  { title: '商品管理', render: viewProducts,  bind: bindProducts },
    orders:    { title: '訂單管理', render: viewOrders,    bind: bindOrders },
    members:   { title: '會員管理', render: function () { return viewMembers('all'); }, bind: bindMembers },
    marketing: { title: '數據行銷', render: viewMarketing, bind: bindMarketing }
  };

  function render(key) {
    var v = VIEWS[key] || VIEWS.dashboard;
    key = VIEWS[key] ? key : 'dashboard';
    $('#adminTitle').textContent = v.title;
    content.innerHTML = v.render();
    if (v.bind) v.bind();
    document.querySelectorAll('.admin-nav__item').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.nav === key);
    });
    if (location.hash.slice(1) !== key) history.replaceState(null, '', '#' + key);
    $('#adminSide').classList.remove('is-open');
    content.scrollIntoView ? window.scrollTo(0, 0) : null;
  }

  $('#adminNav').addEventListener('click', function (e) {
    var b = e.target.closest('[data-nav]');
    if (b) render(b.dataset.nav);
  });

  /* 行動版側欄開合 */
  $('#adminBurger').addEventListener('click', function () { $('#adminSide').classList.toggle('is-open'); });

  /* 登出 */
  $('#logoutBtn').addEventListener('click', function () { A.logout(); location.href = 'admin-login.html'; });

  /* 起始 */
  var start = location.hash.slice(1);
  render(VIEWS[start] ? start : 'dashboard');
})();
