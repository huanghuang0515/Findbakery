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
    { key: 'marketing', label: '數據行銷' },
    { key: 'shipping',  label: '運費管理' },
    { key: 'points',    label: '點數管理' },
    { key: 'coupons',   label: '優惠券管理' },
    { key: 'media',     label: '媒體庫' },
    { key: 'admins',    label: '管理員帳號' },
    { key: 'payment',   label: '金流串接' },
    { key: 'einvoice',  label: '電子發票' },
    { key: 'changelog', label: '版本紀錄' }
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
     模組：運費管理
     ==================================================== */
  function viewShipping() {
    var c = A.shippingConfig();
    var zones = (c.zones || []).map(function (z) {
      return '<tr><td>' + esc(z.name) + '</td><td class="ord__total">' + money(z.fee) + '</td></tr>';
    }).join('');
    return '<section class="admin-panel"><h2 class="admin-panel__h">基本運費設定</h2>' +
      '<p class="admin-hint" style="margin:0 0 18px">此設定會<strong>即時連動前台</strong>購物車與結帳的運費計算。</p>' +
      '<form class="admin-form" id="shipForm"><div class="form-grid">' +
        '<div class="field"><label for="shipFree">滿額免運門檻（元）</label><input id="shipFree" type="number" min="0" value="' + c.freeThreshold + '"></div>' +
        '<div class="field"><label for="shipFlat">一般運費（元）</label><input id="shipFlat" type="number" min="0" value="' + c.flatRate + '"></div>' +
        '<div class="field field--full"><label>門市自取</label><button class="admin-toggle' + (c.pickup ? '' : ' is-off') + '" type="button" id="shipPickup">' + (c.pickup ? '開放自取（免運）' : '關閉自取') + '</button></div>' +
      '</div><div class="admin-actions"><button class="btn btn--primary" type="submit">儲存設定</button></div></form></section>' +
      '<section class="admin-panel"><h2 class="admin-panel__h">配送區域費率（參考）</h2>' +
        '<div class="ord-wrap"><table class="ord-table"><thead><tr><th>區域</th><th>運費</th></tr></thead><tbody>' + zones + '</tbody></table></div>' +
        '<p class="panel__note">前台結帳目前以「基本運費設定」計算；區域費率為展示用途。</p></section>';
  }
  function bindShipping() {
    var state = { pickup: A.shippingConfig().pickup };
    var pickup = $('#shipPickup');
    pickup.addEventListener('click', function () {
      state.pickup = !state.pickup;
      pickup.classList.toggle('is-off', !state.pickup);
      pickup.textContent = state.pickup ? '開放自取（免運）' : '關閉自取';
    });
    $('#shipForm').addEventListener('submit', function (e) {
      e.preventDefault();
      A.saveShipping({ freeThreshold: Math.max(0, parseInt($('#shipFree').value, 10) || 0),
        flatRate: Math.max(0, parseInt($('#shipFlat').value, 10) || 0), pickup: state.pickup });
      toast('運費設定已儲存，前台即時生效');
    });
  }

  /* ====================================================
     模組：點數管理
     ==================================================== */
  function viewPoints() {
    var c = A.pointsConfig();
    var rows = A.memberPoints().map(function (m) {
      return '<tr data-email="' + esc(m.email) + '">' +
        '<td class="admin-td-name">' + esc(m.name) + '</td>' +
        '<td><span class="admin-badge admin-badge--' + m.type + '">' + m.type + ' 端</span></td>' +
        '<td>' + esc(m.email) + '</td>' +
        '<td class="ord__total">' + m.points + ' 點</td>' +
        '<td><button class="btn btn--line btn--xs" type="button" data-add>＋100</button> ' +
            '<button class="btn btn--line btn--xs" type="button" data-sub>－100</button></td></tr>';
    }).join('');
    return '<section class="admin-panel"><h2 class="admin-panel__h">點數規則</h2>' +
      '<form class="admin-form" id="ptForm"><div class="form-grid">' +
        '<div class="field"><label for="ptEarnPer">每消費金額（元）</label><input id="ptEarnPer" type="number" min="1" value="' + c.earnPer + '"></div>' +
        '<div class="field"><label for="ptEarnPts">可得點數</label><input id="ptEarnPts" type="number" min="0" value="' + c.earnPoints + '"></div>' +
        '<div class="field"><label for="ptRedeem">1 點折抵金額（元）</label><input id="ptRedeem" type="number" min="0" value="' + c.redeemRate + '"></div>' +
        '<div class="field"><label for="ptBonus">註冊贈點</label><input id="ptBonus" type="number" min="0" value="' + c.signupBonus + '"></div>' +
      '</div><div class="admin-actions"><button class="btn btn--primary" type="submit">儲存規則</button></div></form>' +
      '<p class="panel__note panel__note--tag">會員點數 = 累積消費 ÷ 每消費金額 × 可得點數 ＋ 手動調整。</p></section>' +
      '<section class="admin-panel"><h2 class="admin-panel__h">會員點數</h2>' +
        '<div class="ord-wrap"><table class="ord-table"><thead><tr><th>姓名</th><th>端別</th><th>Email</th><th>點數</th><th>調整</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  }
  function bindPoints() {
    $('#ptForm').addEventListener('submit', function (e) {
      e.preventDefault();
      A.savePoints({ earnPer: Math.max(1, parseInt($('#ptEarnPer').value, 10) || 1),
        earnPoints: Math.max(0, parseInt($('#ptEarnPts').value, 10) || 0),
        redeemRate: Math.max(0, parseInt($('#ptRedeem').value, 10) || 0),
        signupBonus: Math.max(0, parseInt($('#ptBonus').value, 10) || 0) });
      render('points'); toast('點數規則已儲存');
    });
    content.querySelectorAll('tbody tr').forEach(function (tr) {
      var email = tr.dataset.email;
      tr.querySelector('[data-add]').addEventListener('click', function () { A.adjustPoints(email, 100); render('points'); toast('已加 100 點'); });
      tr.querySelector('[data-sub]').addEventListener('click', function () { A.adjustPoints(email, -100); render('points'); toast('已扣 100 點'); });
    });
  }

  /* ====================================================
     模組：優惠券管理
     ==================================================== */
  function viewCoupons() {
    var rows = A.coupons().map(function (c) {
      var val = c.type === 'percent' ? (c.value + '% 折扣') : ('折 ' + money(c.value));
      return '<tr data-id="' + c.id + '">' +
        '<td class="admin-td-name"><code class="admin-code">' + esc(c.code) + '</code></td>' +
        '<td>' + val + '</td>' +
        '<td>' + (c.minSpend ? '滿 ' + money(c.minSpend) : '無門檻') + '</td>' +
        '<td>' + esc(c.expiry) + '</td>' +
        '<td>' + c.used + ' 次</td>' +
        '<td><button class="admin-toggle' + (c.active ? '' : ' is-off') + '" type="button" data-toggle>' + (c.active ? '啟用中' : '已停用') + '</button></td>' +
        '<td><button class="admin-del" type="button" data-del>刪除</button></td></tr>';
    }).join('');
    return '<div class="admin-toolbar"><p class="admin-hint">共 ' + A.coupons().length + ' 張優惠券。</p>' +
        '<button class="btn btn--primary" type="button" id="addCouponBtn">＋ 新增優惠券</button></div>' +
      '<section class="admin-panel admin-panel--form" id="couponForm" hidden><h2 class="admin-panel__h">新增優惠券</h2>' +
      '<form class="admin-form" id="cpForm"><div class="form-grid">' +
        '<div class="field"><label for="cpCode">代碼</label><input id="cpCode" placeholder="如 WELCOME100" required></div>' +
        '<div class="field"><label for="cpType">類型</label><select id="cpType"><option value="fixed">固定金額</option><option value="percent">百分比</option></select></div>' +
        '<div class="field"><label for="cpVal">折扣值</label><input id="cpVal" type="number" min="0" value="100"></div>' +
        '<div class="field"><label for="cpMin">最低消費</label><input id="cpMin" type="number" min="0" value="0"></div>' +
        '<div class="field"><label for="cpExp">到期日</label><input id="cpExp" placeholder="2026.12.31" value="2026.12.31"></div>' +
      '</div><div class="admin-actions"><button class="btn btn--line" type="button" id="cpCancel">取消</button><button class="btn btn--primary" type="submit">新增</button></div></form></section>' +
      '<div class="ord-wrap"><table class="ord-table"><thead><tr><th>代碼</th><th>優惠</th><th>門檻</th><th>到期</th><th>已使用</th><th>狀態</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function bindCoupons() {
    var form = $('#couponForm');
    $('#addCouponBtn').addEventListener('click', function () { form.hidden = !form.hidden; if (!form.hidden) $('#cpCode').focus(); });
    $('#cpCancel').addEventListener('click', function () { form.hidden = true; });
    $('#cpForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var code = $('#cpCode').value.trim();
      if (!code) { $('#cpCode').focus(); return; }
      A.addCoupon({ code: code, type: $('#cpType').value, value: $('#cpVal').value, minSpend: $('#cpMin').value, expiry: $('#cpExp').value.trim() });
      render('coupons'); toast('已新增優惠券：' + code.toUpperCase());
    });
    content.querySelectorAll('tbody tr').forEach(function (tr) {
      var id = tr.dataset.id;
      tr.querySelector('[data-toggle]').addEventListener('click', function () { A.toggleCoupon(id); render('coupons'); });
      tr.querySelector('[data-del]').addEventListener('click', function () { if (window.confirm('確定刪除此優惠券？')) { A.removeCoupon(id); render('coupons'); toast('已刪除'); } });
    });
  }

  /* ====================================================
     模組：媒體庫
     ==================================================== */
  function viewMedia() {
    var cards = A.media().map(function (m) {
      return '<figure class="media-card" data-id="' + m.id + '">' +
        '<div class="media-card__img"><img src="' + esc(m.src) + '" alt="' + esc(m.name) + '" loading="lazy"></div>' +
        '<figcaption class="media-card__cap"><span class="media-card__name">' + esc(m.name) + '</span>' +
          '<span class="media-card__meta">' + esc(m.uploadedAt) + (m.seed ? ' · 內建' : '') + '</span></figcaption>' +
        '<div class="media-card__act"><button class="btn btn--line btn--xs" type="button" data-copy>複製路徑</button>' +
          (m.seed ? '' : '<button class="admin-del" type="button" data-del>刪除</button>') + '</div></figure>';
    }).join('');
    return '<div class="admin-toolbar"><p class="admin-hint">共 ' + A.media().length + ' 個檔案。上傳僅存於本機瀏覽器（demo，請小於 1.5MB）。</p>' +
        '<label class="btn btn--primary media-upload">＋ 上傳圖片<input type="file" id="mediaUpload" accept="image/*" hidden></label></div>' +
      '<div class="media-grid">' + cards + '</div>';
  }
  function bindMedia() {
    var up = $('#mediaUpload');
    up.addEventListener('change', function () {
      var f = up.files && up.files[0];
      if (!f) return;
      if (f.size > 1500000) { toast('檔案過大（請小於 1.5MB）'); up.value = ''; return; }
      var reader = new FileReader();
      reader.onload = function () {
        var r = A.addMedia({ name: f.name, src: reader.result });
        if (r && !r.ok) { toast(r.error); return; }
        render('media'); toast('已上傳：' + f.name);
      };
      reader.readAsDataURL(f);
    });
    content.querySelectorAll('.media-card').forEach(function (fig) {
      var id = fig.dataset.id;
      var src = fig.querySelector('img').getAttribute('src');
      fig.querySelector('[data-copy]').addEventListener('click', function () {
        try { navigator.clipboard.writeText(src); } catch (e) {}
        toast('已複製路徑');
      });
      var del = fig.querySelector('[data-del]');
      if (del) del.addEventListener('click', function () { if (window.confirm('確定刪除此檔案？')) { A.removeMedia(id); render('media'); toast('已刪除'); } });
    });
  }

  /* ====================================================
     模組：管理員帳號
     ==================================================== */
  function viewAdmins() {
    var me = admin.email;
    var rows = A.adminAccounts().map(function (a) {
      var isMe = a.email === me;
      return '<tr data-email="' + esc(a.email) + '">' +
        '<td class="admin-td-name">' + esc(a.name) + (isMe ? '<span class="admin-td-sub">目前登入</span>' : '') + '</td>' +
        '<td>' + esc(a.email) + '</td>' +
        '<td>' + esc(a.role) + '</td>' +
        '<td><button class="admin-toggle' + (a.active === false ? ' is-off' : '') + '" type="button" data-toggle' + (isMe ? ' disabled' : '') + '>' + (a.active === false ? '已停用' : '啟用中') + '</button></td>' +
        '<td>' + (isMe ? '—' : '<button class="admin-del" type="button" data-del>刪除</button>') + '</td></tr>';
    }).join('');
    return '<div class="admin-toolbar"><p class="admin-hint">共 ' + A.adminAccounts().length + ' 個管理員帳號。</p>' +
        '<button class="btn btn--primary" type="button" id="addAdminBtn">＋ 新增管理員</button></div>' +
      '<section class="admin-panel admin-panel--form" id="adminFormPanel" hidden><h2 class="admin-panel__h">新增管理員</h2>' +
      '<form class="admin-form" id="adForm"><div class="form-grid">' +
        '<div class="field"><label for="adName">姓名</label><input id="adName" required></div>' +
        '<div class="field"><label for="adEmail">Email</label><input id="adEmail" type="email" required></div>' +
        '<div class="field"><label for="adPw">密碼</label><input id="adPw" value="123456"></div>' +
        '<div class="field"><label for="adRole">身分</label><select id="adRole"><option>店長</option><option>管理員</option><option>客服</option><option>倉管</option></select></div>' +
      '</div><div class="admin-actions"><button class="btn btn--line" type="button" id="adCancel">取消</button><button class="btn btn--primary" type="submit">新增</button></div></form></section>' +
      '<div class="ord-wrap"><table class="ord-table"><thead><tr><th>姓名</th><th>Email</th><th>身分</th><th>狀態</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function bindAdmins() {
    var form = $('#adminFormPanel');
    $('#addAdminBtn').addEventListener('click', function () { form.hidden = !form.hidden; if (!form.hidden) $('#adName').focus(); });
    $('#adCancel').addEventListener('click', function () { form.hidden = true; });
    $('#adForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var r = A.addAdmin({ name: $('#adName').value.trim(), email: $('#adEmail').value.trim(), pw: $('#adPw').value, role: $('#adRole').value });
      if (!r.ok) { toast(r.error); return; }
      render('admins'); toast('已新增管理員');
    });
    content.querySelectorAll('tbody tr').forEach(function (tr) {
      var email = tr.dataset.email;
      var tg = tr.querySelector('[data-toggle]');
      if (tg && !tg.disabled) tg.addEventListener('click', function () {
        var a = A.adminAccounts().filter(function (x) { return x.email === email; })[0];
        A.updateAdmin(email, { active: !(a && a.active !== false) }); render('admins');
      });
      var del = tr.querySelector('[data-del]');
      if (del) del.addEventListener('click', function () {
        if (window.confirm('確定刪除帳號 ' + email + '？')) { var r = A.removeAdmin(email); if (!r.ok) { toast(r.error); return; } render('admins'); toast('已刪除'); }
      });
    });
  }

  /* ====================================================
     模組：金流串接（設定 demo）
     ==================================================== */
  function viewPayment() {
    var c = A.paymentConfig();
    function opt(v, label, cur) { return '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + label + '</option>'; }
    function chk(id, label, on) { return '<label class="admin-check"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '> ' + label + '</label>'; }
    return '<section class="admin-panel"><div class="admin-toolbar"><h2 class="admin-panel__h" style="margin:0">金流設定</h2>' +
        '<button class="admin-toggle' + (c.enabled ? '' : ' is-off') + '" type="button" id="payEnabled">' + (c.enabled ? '已啟用' : '未啟用') + '</button></div>' +
      '<p class="admin-hint" style="margin:0 0 18px">純前端 demo，僅儲存設定於本機，不會對接真實金流商（需後端）。</p>' +
      '<form class="admin-form" id="payForm"><div class="form-grid">' +
        '<div class="field"><label for="payProvider">金流商</label><select id="payProvider">' +
          opt('ecpay', '綠界 ECPay', c.provider) + opt('newebpay', '藍新 NewebPay', c.provider) + opt('linepay', 'LINE Pay', c.provider) + opt('stripe', 'Stripe', c.provider) + '</select></div>' +
        '<div class="field"><label for="payEnv">環境</label><select id="payEnv">' + opt('test', '測試', c.env) + opt('prod', '正式', c.env) + '</select></div>' +
        '<div class="field"><label for="payMid">商店代號 / Merchant ID</label><input id="payMid" value="' + esc(c.merchantId) + '" placeholder="2000132"></div>' +
        '<div class="field"><label for="payKey">HashKey / API Key</label><input id="payKey" type="password" value="' + esc(c.hashKey) + '" placeholder="••••••••"></div>' +
        '<div class="field field--full"><label>啟用付款方式</label><div class="admin-checks">' +
          chk('payCredit', '信用卡', c.methods.credit) + chk('payAtm', 'ATM 轉帳', c.methods.atm) + chk('payCvs', '超商代碼', c.methods.cvs) + chk('payLine', 'LINE Pay', c.methods.linepay) + '</div></div>' +
      '</div><div class="admin-actions"><button class="btn btn--primary" type="submit">儲存設定</button><button class="btn btn--line" type="button" id="payTest">測試連線</button></div></form></section>';
  }
  function bindPayment() {
    var state = { enabled: A.paymentConfig().enabled };
    var en = $('#payEnabled');
    en.addEventListener('click', function () { state.enabled = !state.enabled; en.classList.toggle('is-off', !state.enabled); en.textContent = state.enabled ? '已啟用' : '未啟用'; });
    $('#payTest').addEventListener('click', function () { toast('測試連線成功（模擬）'); });
    $('#payForm').addEventListener('submit', function (e) {
      e.preventDefault();
      A.savePayment({ enabled: state.enabled, provider: $('#payProvider').value, env: $('#payEnv').value,
        merchantId: $('#payMid').value.trim(), hashKey: $('#payKey').value,
        methods: { credit: $('#payCredit').checked, atm: $('#payAtm').checked, cvs: $('#payCvs').checked, linepay: $('#payLine').checked } });
      toast('金流設定已儲存');
    });
  }

  /* ====================================================
     模組：電子發票（設定 demo）
     ==================================================== */
  function viewInvoice() {
    var c = A.invoiceConfig();
    function opt(v, label, cur) { return '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + label + '</option>'; }
    return '<section class="admin-panel"><div class="admin-toolbar"><h2 class="admin-panel__h" style="margin:0">電子發票設定</h2>' +
        '<button class="admin-toggle' + (c.enabled ? '' : ' is-off') + '" type="button" id="invEnabled">' + (c.enabled ? '已啟用' : '未啟用') + '</button></div>' +
      '<p class="admin-hint" style="margin:0 0 18px">純前端 demo，僅儲存設定；實際開立需串接加值中心（綠界／ezPay 等）與後端。</p>' +
      '<form class="admin-form" id="invForm"><div class="form-grid">' +
        '<div class="field"><label for="invProvider">發票服務商</label><select id="invProvider">' + opt('ecpay', '綠界 ECPay', c.provider) + opt('ezpay', 'ezPay 簡單付', c.provider) + opt('neweb', '藍新', c.provider) + '</select></div>' +
        '<div class="field"><label for="invTax">賣方統一編號</label><input id="invTax" value="' + esc(c.sellerTaxId) + '" placeholder="12345678"></div>' +
        '<div class="field"><label for="invType">預設發票類型</label><select id="invType">' + opt('B2C', 'B2C 個人', c.defaultType) + opt('B2B', 'B2B 公司', c.defaultType) + '</select></div>' +
        '<div class="field"><label for="invCarrier">預設載具</label><select id="invCarrier">' + opt('mobile', '手機條碼', c.carrier) + opt('npc', '自然人憑證', c.carrier) + opt('member', '會員載具', c.carrier) + opt('donation', '捐贈', c.carrier) + '</select></div>' +
        '<div class="field"><label for="invDonation">捐贈碼（選填）</label><input id="invDonation" value="' + esc(c.donationCode) + '" placeholder="如 919"></div>' +
        '<div class="field field--full"><label>自動開立</label><button class="admin-toggle' + (c.autoIssue ? '' : ' is-off') + '" type="button" id="invAuto">' + (c.autoIssue ? '訂單完成後自動開立' : '手動開立') + '</button></div>' +
      '</div><div class="admin-actions"><button class="btn btn--primary" type="submit">儲存設定</button></div></form></section>';
  }
  function bindInvoice() {
    var cfg = A.invoiceConfig();
    var state = { enabled: cfg.enabled, auto: cfg.autoIssue };
    var en = $('#invEnabled');
    en.addEventListener('click', function () { state.enabled = !state.enabled; en.classList.toggle('is-off', !state.enabled); en.textContent = state.enabled ? '已啟用' : '未啟用'; });
    var au = $('#invAuto');
    au.addEventListener('click', function () { state.auto = !state.auto; au.classList.toggle('is-off', !state.auto); au.textContent = state.auto ? '訂單完成後自動開立' : '手動開立'; });
    $('#invForm').addEventListener('submit', function (e) {
      e.preventDefault();
      A.saveInvoice({ enabled: state.enabled, provider: $('#invProvider').value, sellerTaxId: $('#invTax').value.trim(),
        defaultType: $('#invType').value, carrier: $('#invCarrier').value, donationCode: $('#invDonation').value.trim(), autoIssue: state.auto });
      toast('電子發票設定已儲存');
    });
  }

  /* ====================================================
     模組：版本紀錄
     ==================================================== */
  function viewChangelog() {
    var items = A.changelog().map(function (v) {
      var lis = (v.items || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
      return '<li class="cl-item"><div class="cl-item__head"><span class="cl-ver">' + esc(v.version) + '</span>' +
        '<span class="cl-date">' + esc(v.date) + '</span><span class="cl-author">' + esc(v.author) + '</span></div>' +
        '<ul class="cl-list">' + lis + '</ul></li>';
    }).join('');
    return '<div class="admin-toolbar"><p class="admin-hint">共 ' + A.changelog().length + ' 筆版本紀錄。</p>' +
        '<button class="btn btn--primary" type="button" id="addLogBtn">＋ 新增版本</button></div>' +
      '<section class="admin-panel admin-panel--form" id="logFormPanel" hidden><h2 class="admin-panel__h">新增版本紀錄</h2>' +
      '<form class="admin-form" id="clForm"><div class="form-grid">' +
        '<div class="field"><label for="clVer">版本號</label><input id="clVer" placeholder="v1.3.1" required></div>' +
        '<div class="field"><label for="clAuthor">作者</label><input id="clAuthor" value="' + esc(admin.name) + '"></div>' +
        '<div class="field field--full"><label for="clItems">更新內容（每行一項）</label><textarea id="clItems" rows="3" placeholder="例：修正頁尾分隔線"></textarea></div>' +
      '</div><div class="admin-actions"><button class="btn btn--line" type="button" id="clCancel">取消</button><button class="btn btn--primary" type="submit">新增</button></div></form></section>' +
      '<ol class="cl-timeline">' + items + '</ol>';
  }
  function bindChangelog() {
    var form = $('#logFormPanel');
    $('#addLogBtn').addEventListener('click', function () { form.hidden = !form.hidden; if (!form.hidden) $('#clVer').focus(); });
    $('#clCancel').addEventListener('click', function () { form.hidden = true; });
    $('#clForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var ver = $('#clVer').value.trim();
      if (!ver) { $('#clVer').focus(); return; }
      A.addChangelog({ version: ver, author: $('#clAuthor').value.trim() || admin.name, items: $('#clItems').value.split('\n') });
      render('changelog'); toast('已新增版本 ' + ver);
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
    marketing: { title: '數據行銷', render: viewMarketing, bind: bindMarketing },
    shipping:  { title: '運費管理', render: viewShipping,  bind: bindShipping },
    points:    { title: '點數管理', render: viewPoints,    bind: bindPoints },
    coupons:   { title: '優惠券管理', render: viewCoupons, bind: bindCoupons },
    media:     { title: '媒體庫',   render: viewMedia,     bind: bindMedia },
    admins:    { title: '管理員帳號', render: viewAdmins,  bind: bindAdmins },
    payment:   { title: '金流串接', render: viewPayment,   bind: bindPayment },
    einvoice:  { title: '電子發票', render: viewInvoice,   bind: bindInvoice },
    changelog: { title: '版本紀錄', render: viewChangelog, bind: bindChangelog }
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
