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

  /* ---- 管理員帳號（demo，可於後台「管理員帳號」維護）---- */
  var K_ADMINS = 'gg.admin.accounts';
  function seedAdmins() {
    return [{ email: 'admin@gg.com', pw: 'admin123', name: 'Amy 陳', role: '店長', active: true }];
  }
  function adminAccounts() {
    var list = read(K_ADMINS, null);
    if (!list || !list.length) { list = seedAdmins(); write(K_ADMINS, list); }
    return list;
  }
  function findAdmin(email) {
    email = String(email || '').trim().toLowerCase();
    var list = adminAccounts();
    for (var i = 0; i < list.length; i++) if (list[i].email === email) return list[i];
    return null;
  }
  function addAdmin(obj) {
    var email = String(obj.email || '').trim().toLowerCase();
    if (!email) return { ok: false, error: '請輸入 Email' };
    if (findAdmin(email)) return { ok: false, error: '此 Email 已存在' };
    var list = adminAccounts();
    list.push({ email: email, pw: obj.pw || '123456', name: obj.name || '新管理員', role: obj.role || '管理員', active: true });
    write(K_ADMINS, list);
    return { ok: true };
  }
  function updateAdmin(email, patch) {
    var a = findAdmin(email);
    if (!a) return;
    for (var k in patch) if (patch.hasOwnProperty(k)) a[k] = patch[k];
    write(K_ADMINS, adminAccounts());
  }
  function removeAdmin(email) {
    var list = adminAccounts().filter(function (a) { return a.email !== String(email || '').toLowerCase(); });
    if (!list.length) return { ok: false, error: '至少需保留一個管理員帳號' };
    write(K_ADMINS, list);
    return { ok: true };
  }

  function login(email, pw) {
    email = String(email || '').trim().toLowerCase();
    var a = findAdmin(email);
    if (!a) return { ok: false, error: '查無此管理員帳號' };
    if (a.active === false) return { ok: false, error: '此帳號已停用' };
    if (a.pw !== pw) return { ok: false, error: '密碼錯誤' };
    write(K_SESSION, { email: email });
    return { ok: true };
  }
  function logout() { try { localStorage.removeItem(K_SESSION); } catch (e) {} }
  function current() {
    var s = read(K_SESSION, null);
    if (!s || !s.email) return null;
    var a = findAdmin(s.email);
    if (!a || a.active === false) return null;
    return { email: a.email, name: a.name, role: a.role };
  }
  function isLoggedIn() { return !!current(); }
  function demoAdmin() { return { email: 'admin@gg.com', pw: 'admin123' }; }

  /* ======================================================
     商品（連動前台 store.js）
     ====================================================== */
  function seedProducts() {
    var base = (GG && GG.baseCatalog) ? GG.baseCatalog() : [];
    var stockMap = { 'sub-01': 40, 'sub-02': 25, 'sub-03': 18, 'p-03': 120, 'p-06': 90,
                     'p-07': 60, 'p-08': 8, 'p-09': 50, 'p-10': 6 };
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

  /* ======================================================
     運費管理（連動前台 store.js 的 shipping）
     ====================================================== */
  var K_SHIP = 'gg.admin.shipping';
  function seedShipping() {
    return { freeThreshold: 800, flatRate: 120, pickup: true,
      zones: [
        { id: 'main', name: '台灣本島', fee: 120 },
        { id: 'offshore', name: '離島（澎湖／金門／馬祖）', fee: 250 }
      ] };
  }
  function shippingConfig() {
    var c = read(K_SHIP, null);
    if (!c) { c = seedShipping(); write(K_SHIP, c); }
    return c;
  }
  function saveShipping(patch) {
    var c = shippingConfig();
    for (var k in patch) if (patch.hasOwnProperty(k)) c[k] = patch[k];
    write(K_SHIP, c);
    try { window.dispatchEvent(new CustomEvent('gg:adminchange', { detail: { what: 'shipping' } })); } catch (e) {}
  }

  /* ======================================================
     點數管理（紅利點數 demo）
     每消費 earnPer 元得 earnPoints 點；redeemRate：1 點可折抵金額
     ====================================================== */
  var K_POINTS = 'gg.admin.points';
  function seedPoints() {
    return { enabled: true, earnPer: 100, earnPoints: 1, redeemRate: 1, signupBonus: 100, ledger: {} };
  }
  function pointsConfig() {
    var c = read(K_POINTS, null);
    if (!c) { c = seedPoints(); write(K_POINTS, c); }
    if (!c.ledger) c.ledger = {};
    return c;
  }
  function savePoints(patch) {
    var c = pointsConfig();
    for (var k in patch) if (patch.hasOwnProperty(k)) c[k] = patch[k];
    write(K_POINTS, c);
  }
  function memberPoints() {
    var c = pointsConfig();
    var per = c.earnPer || 100;
    return members().map(function (m) {
      var earned = Math.floor((m.spendTotal / per) * (c.earnPoints || 0));
      var adj = c.ledger[m.email] || 0;
      return { name: m.name, type: m.type, email: m.email, points: earned + adj, earned: earned, adj: adj };
    });
  }
  function adjustPoints(email, delta) {
    var c = pointsConfig();
    c.ledger[email] = (c.ledger[email] || 0) + delta;
    write(K_POINTS, c);
  }

  /* ======================================================
     媒體庫（圖片素材 demo；上傳僅存於本機）
     ====================================================== */
  var K_MEDIA = 'gg.admin.media';
  function seedMedia() {
    var imgs = [
      { id: 'p-01', name: '可頌.jpg' }, { id: 'p-03', name: '原味貝果.jpg' },
      { id: 'p-04', name: '酸種麵包.jpg' }, { id: 'p-05', name: '奶油甜點.jpg' },
      { id: 'p-06', name: '黑芝麻餐包.jpg' }, { id: 'p-07', name: '生吐司.jpg' },
      { id: 'p-08', name: '甜甜圈.jpg' }, { id: 'p-09', name: '厚片吐司.jpg' },
      { id: 'p-10', name: '雜糧麵包.jpg' }, { id: 'about-main', name: '品牌故事.jpg' }
    ];
    return imgs.map(function (x) {
      return { id: x.id, name: x.name, src: 'assets/img/' + x.id + '.jpg', seed: true, uploadedAt: '2026.09.01' };
    });
  }
  function media() {
    var list = read(K_MEDIA, null);
    if (!list) { list = seedMedia(); write(K_MEDIA, list); }
    return list;
  }
  function addMedia(obj) {
    var list = media();
    list.unshift({ id: 'm-' + (Date.now() % 1000000), name: obj.name || '未命名.png',
      src: obj.src, seed: false, uploadedAt: new Date().toISOString().slice(0, 10).replace(/-/g, '.') });
    try { write(K_MEDIA, list); return { ok: true }; }
    catch (e) { return { ok: false, error: '儲存空間不足（demo 上限）' }; }
  }
  function removeMedia(id) {
    write(K_MEDIA, media().filter(function (m) { return m.id !== id; }));
  }

  /* ======================================================
     優惠券管理
     ====================================================== */
  var K_COUPON = 'gg.admin.coupons';
  function seedCoupons() {
    return [
      { id: 'c1', code: 'WELCOME100', type: 'fixed', value: 100, minSpend: 500, expiry: '2026.12.31', active: true, used: 32 },
      { id: 'c2', code: 'SUMMER15', type: 'percent', value: 15, cap: 200, minSpend: 800, expiry: '2026.09.30', active: false, used: 118 },
      { id: 'c3', code: 'VIPFREESHIP', type: 'fixed', value: 120, minSpend: 0, expiry: '2026.12.31', active: true, used: 7 }
    ];
  }
  function coupons() {
    var list = read(K_COUPON, null);
    if (!list) { list = seedCoupons(); write(K_COUPON, list); }
    return list;
  }
  function addCoupon(obj) {
    var list = coupons();
    list.unshift({ id: 'c-' + (Date.now() % 1000000), code: String(obj.code || 'NEWCODE').toUpperCase(),
      type: obj.type || 'fixed', value: parseInt(obj.value, 10) || 0, cap: parseInt(obj.cap, 10) || 0,
      minSpend: parseInt(obj.minSpend, 10) || 0, expiry: obj.expiry || '2026.12.31', active: true, used: 0 });
    write(K_COUPON, list);
  }
  function updateCoupon(id, patch) {
    var list = coupons();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) { for (var k in patch) if (patch.hasOwnProperty(k)) list[i][k] = patch[k]; break; }
    write(K_COUPON, list);
  }
  function toggleCoupon(id) {
    var list = coupons();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) { list[i].active = !list[i].active; break; }
    write(K_COUPON, list);
  }
  function removeCoupon(id) {
    write(K_COUPON, coupons().filter(function (c) { return c.id !== id; }));
  }

  /* ======================================================
     金流串接（設定 demo，無真實串接）
     ====================================================== */
  var K_PAY = 'gg.admin.payment';
  function seedPayment() {
    return { enabled: false, provider: 'ecpay', env: 'test', merchantId: '', hashKey: '',
      methods: { credit: true, atm: true, cvs: false, linepay: false } };
  }
  function paymentConfig() {
    var c = read(K_PAY, null);
    if (!c) { c = seedPayment(); write(K_PAY, c); }
    if (!c.methods) c.methods = { credit: true };
    return c;
  }
  function savePayment(patch) {
    var c = paymentConfig();
    for (var k in patch) if (patch.hasOwnProperty(k)) c[k] = patch[k];
    write(K_PAY, c);
  }

  /* ======================================================
     電子發票（設定 demo，無真實串接）
     ====================================================== */
  var K_INV = 'gg.admin.einvoice';
  function seedInvoice() {
    return { enabled: false, provider: 'ecpay', sellerTaxId: '', autoIssue: true,
      defaultType: 'B2C', carrier: 'mobile', donationCode: '' };
  }
  function invoiceConfig() {
    var c = read(K_INV, null);
    if (!c) { c = seedInvoice(); write(K_INV, c); }
    return c;
  }
  function saveInvoice(patch) {
    var c = invoiceConfig();
    for (var k in patch) if (patch.hasOwnProperty(k)) c[k] = patch[k];
    write(K_INV, c);
  }

  /* ======================================================
     版本紀錄
     ====================================================== */
  var K_LOG = 'gg.admin.changelog';
  function seedChangelog() {
    return [
      { version: 'v1.3.0', date: '2026.10.11', author: 'Amy 陳', items: ['新增後台模組：運費、點數、媒體庫、優惠券、管理員帳號、金流串接、電子發票、版本紀錄'] },
      { version: 'v1.2.0', date: '2026.09.20', author: 'Amy 陳', items: ['後台商品改價／下架即時連動前台', '新增數據行銷與 CSV 匯出'] },
      { version: 'v1.1.0', date: '2026.09.08', author: 'Amy 陳', items: ['完成會員中心（C／B 端）與購物結帳流程'] },
      { version: 'v1.0.0', date: '2026.08.30', author: 'Amy 陳', items: ['Gothel\'s Garden 品牌官網上線'] }
    ];
  }
  function changelog() {
    var list = read(K_LOG, null);
    if (!list) { list = seedChangelog(); write(K_LOG, list); }
    return list;
  }
  function addChangelog(obj) {
    var list = changelog();
    list.unshift({ version: obj.version || 'v1.0.0',
      date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      author: obj.author || '管理員',
      items: (obj.items || []).map(function (s) { return String(s).trim(); }).filter(function (s) { return s; }) });
    write(K_LOG, list);
  }

  /* ======================================================
     通知（由目前資料即時衍生：低庫存、待處理訂單）
     ====================================================== */
  var K_NOTIF_READ = 'gg.admin.notifsRead';
  function notifications() {
    var list = [];
    products().forEach(function (p) {
      if (p.active !== false && typeof p.stock === 'number' && p.stock <= 10) {
        list.push({ id: 'stock:' + p.id, type: 'stock',
          text: '「' + p.name + '」庫存僅剩 ' + p.stock + ' 件', sub: '商品管理', nav: 'products' });
      }
    });
    orders().forEach(function (o) {
      if (o.status === '處理中') {
        list.push({ id: 'order:' + o.no, type: 'order',
          text: '訂單 ' + o.no + ' 待處理', sub: o.customer + '｜' + money(o.total), nav: 'orders' });
      }
    });
    return list;
  }
  function notifReadIds() { var r = read(K_NOTIF_READ, null); return Array.isArray(r) ? r : []; }
  function markNotifRead(id) { var r = notifReadIds(); if (r.indexOf(id) === -1) { r.push(id); write(K_NOTIF_READ, r); } }
  function markAllNotifRead() { write(K_NOTIF_READ, notifications().map(function (n) { return n.id; })); }
  function unreadNotifCount() {
    var reads = notifReadIds();
    return notifications().filter(function (n) { return reads.indexOf(n.id) === -1; }).length;
  }

  /* 開發用：清空後台資料回到示範狀態 */
  function resetDemo() {
    [K_PROD, K_ORD, K_MEM, K_ADMINS, K_SHIP, K_POINTS, K_MEDIA, K_COUPON, K_PAY, K_INV, K_LOG, K_NOTIF_READ]
      .forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
  }

  return {
    STATUSES: STATUSES,
    login: login, logout: logout, current: current, isLoggedIn: isLoggedIn, demoAdmin: demoAdmin,
    adminAccounts: adminAccounts, addAdmin: addAdmin, updateAdmin: updateAdmin, removeAdmin: removeAdmin,
    products: products, findProduct: findProduct, updateProduct: updateProduct,
    toggleActive: toggleActive, addProduct: addProduct, removeProduct: removeProduct,
    orders: orders, setOrderStatus: setOrderStatus,
    members: members,
    revenue: revenue, orderCount: orderCount, memberStats: memberStats,
    topProducts: topProducts, marketingList: marketingList, exportCsv: exportCsv,
    shippingConfig: shippingConfig, saveShipping: saveShipping,
    pointsConfig: pointsConfig, savePoints: savePoints, memberPoints: memberPoints, adjustPoints: adjustPoints,
    media: media, addMedia: addMedia, removeMedia: removeMedia,
    coupons: coupons, addCoupon: addCoupon, updateCoupon: updateCoupon, toggleCoupon: toggleCoupon, removeCoupon: removeCoupon,
    paymentConfig: paymentConfig, savePayment: savePayment,
    invoiceConfig: invoiceConfig, saveInvoice: saveInvoice,
    changelog: changelog, addChangelog: addChangelog,
    notifications: notifications, notifReadIds: notifReadIds, markNotifRead: markNotifRead,
    markAllNotifRead: markAllNotifRead, unreadNotifCount: unreadNotifCount,
    money: money, resetDemo: resetDemo
  };
})();
