/* =========================================================
   Gothel's Garden — 後台資料層（純前端 demo）
   管理員登入 + 商品／訂單／會員資料集（localStorage 可編輯 CRUD）
   + 統計與 email 行銷名單。
   商品覆寫層 gg.admin.products 會連動前台 store.js。
   ========================================================= */
window.GGAdmin = (function () {
  'use strict';

  var K_SESSION = 'gg.admin';           /* 管理員登入 session */
  var K_PROD    = 'gg.admin.products';  /* 商品（連動前台） */
  var K_ORD     = 'gg.admin.orders';    /* 訂單 */
  var K_MEM     = 'gg.admin.members';   /* 會員 */

  var GG = window.GG;

  function read(key, fb) {
    try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch (e) { return fb; }
  }
  function write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function money(n) { return GG ? GG.money(n) : '$' + Number(n).toLocaleString('en-US'); }

  /* ---- 管理員帳號（demo）---- */
  var ADMINS = {
    'admin@gg.com': { pw: 'admin123', name: 'Amy 陳', role: '店長' }
  };

  function login(email, pw) {
    email = String(email || '').trim().toLowerCase();
    var a = ADMINS[email];
    if (!a) return { ok: false, error: '查無此管理員帳號' };
    if (a.pw !== pw) return { ok: false, error: '密碼錯誤' };
    write(K_SESSION, { email: email });
    return { ok: true };
  }
  function logout() { try { localStorage.removeItem(K_SESSION); } catch (e) {} }
  function current() {
    var s = read(K_SESSION, null);
    if (!s || !s.email || !ADMINS[s.email]) return null;
    var a = ADMINS[s.email];
    return { email: s.email, name: a.name, role: a.role };
  }
  function isLoggedIn() { return !!current(); }
  function demoAdmin() { return { email: 'admin@gg.com', pw: 'admin123' }; }

  /* ======================================================
     商品（連動前台 store.js）
     ====================================================== */
  function seedProducts() {
    var base = (GG && GG.baseCatalog) ? GG.baseCatalog() : [];
    var stockMap = { 'sub-01': 40, 'sub-02': 25, 'sub-03': 18, 'p-03': 120, 'p-06': 90,
                     'p-07': 60, 'p-08': 45, 'p-09': 50, 'p-10': 30 };
    return base.map(function (p) {
      var o = {};
      for (var k in p) if (p.hasOwnProperty(k)) o[k] = p[k];
      o.stock = stockMap[p.id] != null ? stockMap[p.id] : 50;
      o.active = true;
      return o;
    });
  }
  function products() {
    var list = read(K_PROD, null);
    if (!list || !list.length) { list = seedProducts(); write(K_PROD, list); }
    return list;
  }
  function saveProducts(list) {
    write(K_PROD, list);
    try { window.dispatchEvent(new CustomEvent('gg:adminchange', { detail: { what: 'products' } })); } catch (e) {}
  }
  function updateProduct(id, patch) {
    var list = products();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        for (var k in patch) if (patch.hasOwnProperty(k)) list[i][k] = patch[k];
        break;
      }
    }
    saveProducts(list);
  }
  function toggleActive(id) {
    var p = findProduct(id);
    if (p) updateProduct(id, { active: !p.active });
  }
  function addProduct(obj) {
    var list = products();
    var id = obj.id || ('new-' + (Date.now() % 100000));
    list.unshift({
      id: id, name: obj.name || '新商品', price: parseInt(obj.price, 10) || 0,
      img: obj.img || 'p-03', cat: obj.cat || '麵包', unit: obj.unit || '每入',
      sold: 0, stock: parseInt(obj.stock, 10) || 0, active: true,
      alt: obj.name || '新商品', desc: obj.desc || ''
    });
    saveProducts(list);
    return id;
  }
  function removeProduct(id) {
    saveProducts(products().filter(function (p) { return p.id !== id; }));
  }
  function findProduct(id) {
    var list = products();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ======================================================
     訂單
     ====================================================== */
  function seedOrders() {
    return [
      { no: 'GG-20260917-3391', date: '2026.09.17', type: 'C', customer: '陳美好',
        lines: [{ name: '北海道生吐司', qty: 2 }, { name: '綜合甜甜圈', qty: 1 }],
        total: 700, status: '處理中' },
      { no: 'GG-B-20260916-0091', date: '2026.09.16', type: 'B', customer: '好食餐飲有限公司',
        lines: [{ name: '北海道生吐司', qty: 40 }, { name: '裸麥雜糧麵包', qty: 30 }],
        total: 16250, status: '備貨中' },
      { no: 'GG-20260915-3352', date: '2026.09.15', type: 'C', customer: '林志豪',
        lines: [{ name: '原味貝果', qty: 6 }, { name: '黑芝麻餐包', qty: 4 }],
        total: 570, status: '配送中' },
      { no: 'GG-20260914-3310', date: '2026.09.14', type: 'C', customer: '王芷筠',
        lines: [{ name: '每週麵包箱', qty: 1 }],
        total: 230, status: '已完成' },
      { no: 'GG-B-20260912-0088', date: '2026.09.12', type: 'B', customer: '晨光咖啡',
        lines: [{ name: '湯種厚片吐司', qty: 20 }, { name: '原味貝果', qty: 40 }],
        total: 5000, status: '已完成' },
      { no: 'GG-20260910-3287', date: '2026.09.10', type: 'C', customer: '張書瑋',
        lines: [{ name: '綜合甜甜圈', qty: 2 }],
        total: 360, status: '已取消' }
    ];
  }
  function orders() {
    var list = read(K_ORD, null);
    if (!list) { list = seedOrders(); write(K_ORD, list); }
    /* 併入前台剛下的訂單（gg.lastOrder），避免重複 */
    var last = (GG && GG.getOrder) ? GG.getOrder() : null;
    if (last && last.no && !list.some(function (o) { return o.no === last.no; })) {
      list.unshift({
        no: last.no, date: (last.date || '').slice(0, 10).replace(/-/g, '.'),
        type: 'C', customer: last.name || '線上顧客',
        lines: (last.lines || []).map(function (l) { return { name: l.name, qty: l.qty }; }),
        total: last.total, status: '處理中'
      });
      write(K_ORD, list);
    }
    return list;
  }
  var STATUSES = ['處理中', '備貨中', '配送中', '已完成', '已取消'];
  function setOrderStatus(no, status) {
    var list = orders();
    for (var i = 0; i < list.length; i++) if (list[i].no === no) { list[i].status = status; break; }
    write(K_ORD, list);
    try { window.dispatchEvent(new CustomEvent('gg:adminchange', { detail: { what: 'orders' } })); } catch (e) {}
  }

  /* ======================================================
     會員
     ====================================================== */
  function seedMembers() {
    return [
      { name: '陳美好',           type: 'C', title: '金卡會員',   email: 'member@gg.com',   phone: '0922-111-222', spendTotal: 12480,  orderCount: 18, joined: '2024.03' },
      { name: '林志豪',           type: 'C', title: '銀卡會員',   email: 'chih.hao@example.com', phone: '0933-222-333', spendTotal: 6820, orderCount: 11, joined: '2024.07' },
      { name: '王芷筠',           type: 'C', title: '一般會員',   email: 'chih.yun@example.com', phone: '0955-444-555', spendTotal: 2380, orderCount: 5,  joined: '2025.01' },
      { name: '張書瑋',           type: 'C', title: '一般會員',   email: 'shu.wei@example.com',  phone: '0966-777-888', spendTotal: 1560, orderCount: 4,  joined: '2025.04' },
      { name: '李佩珊',           type: 'C', title: '銀卡會員',   email: 'pei.shan@example.com', phone: '0977-888-999', spendTotal: 5240, orderCount: 9,  joined: '2024.11' },
      { name: '好食餐飲有限公司', type: 'B', title: '企業批發客戶', email: 'business@gg.com',  phone: '04-2222-3333', spendTotal: 284600, orderCount: 96, joined: '2023.06' },
      { name: '晨光咖啡',         type: 'B', title: '企業批發客戶', email: 'morning@example.com', phone: '04-3333-4444', spendTotal: 128400, orderCount: 54, joined: '2023.10' }
    ];
  }
  function members() {
    var list = read(K_MEM, null);
    if (!list) { list = seedMembers(); write(K_MEM, list); }
    return list;
  }

  /* ======================================================
     統計
     ====================================================== */
  function revenue() {
    return orders().filter(function (o) { return o.status !== '已取消'; })
                   .reduce(function (s, o) { return s + o.total; }, 0);
  }
  function orderCount() { return orders().length; }
  function memberStats() {
    var ms = members();
    return { total: ms.length,
      C: ms.filter(function (m) { return m.type === 'C'; }).length,
      B: ms.filter(function (m) { return m.type === 'B'; }).length };
  }
  /* 熱銷商品：由未取消訂單的明細彙總數量 */
  function topProducts(n) {
    var agg = {};
    orders().forEach(function (o) {
      if (o.status === '已取消') return;
      (o.lines || []).forEach(function (l) { agg[l.name] = (agg[l.name] || 0) + l.qty; });
    });
    var base = (GG && GG.baseCatalog) ? GG.baseCatalog() : [];
    function imgOf(name) { var h = base.filter(function (p) { return p.name === name; })[0]; return h ? h.img : 'p-03'; }
    return Object.keys(agg).map(function (name) { return { name: name, qty: agg[name], img: imgOf(name) }; })
      .sort(function (a, b) { return b.qty - a.qty; })
      .slice(0, n || 6);
  }

  /* email 行銷名單（可依端別／消費門檻篩選） */
  function marketingList(opts) {
    opts = opts || {};
    return members().filter(function (m) {
      if (opts.type && m.type !== opts.type) return false;
      if (opts.minSpend && m.spendTotal < opts.minSpend) return false;
      return true;
    });
  }
  function exportCsv(rows) {
    var head = ['姓名', '端別', '會員等級', 'Email', '電話', '累積消費', '訂單數'];
    var lines = [head.join(',')].concat(rows.map(function (m) {
      return [m.name, m.type, m.title, m.email, m.phone, m.spendTotal, m.orderCount].join(',');
    }));
    return '﻿' + lines.join('\r\n');   /* BOM 讓 Excel 正確辨識中文 */
  }

  /* 開發用：清空後台資料回到示範狀態 */
  function resetDemo() {
    [K_PROD, K_ORD, K_MEM].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
  }

  return {
    STATUSES: STATUSES,
    login: login, logout: logout, current: current, isLoggedIn: isLoggedIn, demoAdmin: demoAdmin,
    products: products, findProduct: findProduct, updateProduct: updateProduct,
    toggleActive: toggleActive, addProduct: addProduct, removeProduct: removeProduct,
    orders: orders, setOrderStatus: setOrderStatus,
    members: members,
    revenue: revenue, orderCount: orderCount, memberStats: memberStats,
    topProducts: topProducts, marketingList: marketingList, exportCsv: exportCsv,
    money: money, resetDemo: resetDemo
  };
})();
