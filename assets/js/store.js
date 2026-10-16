/* =========================================================
   Gothel's Garden — 共用資料層（商品目錄 + 購物車）
   四個購買流程頁面與首頁皆載入此檔，共用同一份 localStorage 購物車。
   無後端；資料存於瀏覽器 localStorage（不跨裝置同步）。
   ========================================================= */
window.GG = (function () {
  'use strict';

  var CART_KEY = 'gg.cart';        /* 購物車：[{ id, qty }] */
  var FAV_KEY  = 'gg.favourites';  /* 收藏：[id]（沿用首頁） */
  var ORDER_KEY = 'gg.lastOrder';  /* 最近一筆訂單（供完成頁顯示） */

  var SHIP_FEE = 120;              /* 運費 */
  var FREE_SHIP = 800;            /* 滿額免運門檻 */

  /* ---- 商品目錄 ----
     img 對應 assets/img/<img>.jpg（900×900）。 */
  var CATALOG = [
    { id: 'sub-01', name: '每週麵包箱',   price: 230, img: 'p-04', cat: '訂閱', unit: '每箱', sold: 128,
      alt: '每週配送的鄉村酸種麵包',
      desc: '每週固定配送的綜合麵包箱，依當季小麥與烘焙師手感搭配 4–5 款麵包，適合小家庭的一週早餐。' },
    { id: 'sub-02', name: '經典可頌計畫', price: 380, img: 'p-01', cat: '訂閱', unit: '每箱', sold: 96,
      alt: '層層酥脆的法式可頌',
      desc: '以法國進口發酵奶油、三天低溫發酵折疊而成的可頌計畫，每週為你送上剛出爐的酥脆層次。' },
    { id: 'sub-03', name: '週末早午餐組', price: 460, img: 'p-05', cat: '訂閱', unit: '每組', sold: 74,
      alt: '搭配奶油甜點的早午餐組合',
      desc: '週末限定的早午餐組合，含麵包、奶油甜點與果醬，讓假日的餐桌從一杯咖啡開始慢慢展開。' },
    { id: 'p-03', name: '原味貝果',     price: 65,  img: 'p-03', cat: '麵包', unit: '每入', sold: 312,
      alt: '疊放整齊的原味貝果',
      desc: '低溫發酵、先煮後烤的紐約風貝果，外皮帶嚼勁、內裡緊實，單吃或夾餡都合適。' },
    { id: 'p-06', name: '黑芝麻餐包',   price: 45,  img: 'p-06', cat: '麵包', unit: '每入', sold: 402,
      alt: '撒上黑芝麻的小餐包',
      desc: '揉入研磨黑芝麻的柔軟小餐包，表面撒上整粒芝麻，香氣飽滿、一口一個。' },
    { id: 'p-07', name: '北海道生吐司', price: 260, img: 'p-07', cat: '麵包', unit: '每條', sold: 156,
      alt: '切開的北海道生吐司',
      desc: '以北海道鮮奶油與湯種製法揉製，組織綿密濕潤、入口回甘，不塗抹也好吃的生吐司。' },
    { id: 'p-08', name: '綜合甜甜圈',   price: 180, img: 'p-08', cat: '西點', unit: '每盒', sold: 240,
      alt: '各種口味的手作甜甜圈',
      desc: '一盒六入的手作甜甜圈，含糖霜、可可與季節口味，是分享時刻最受歡迎的甜點。' },
    { id: 'p-09', name: '湯種厚片吐司', price: 120, img: 'p-09', cat: '麵包', unit: '每條', sold: 198,
      alt: '柔軟的湯種厚片吐司',
      desc: '湯種製法帶來柔軟濕潤的口感，切成厚片微烤，抹上奶油便是簡單的幸福早餐。' },
    { id: 'p-10', name: '裸麥雜糧麵包', price: 195, img: 'p-10', cat: '麵包', unit: '每條', sold: 64,
      alt: '裸麥雜糧麵包與麥穗',
      desc: '混入裸麥與多種穀物的歐式麵包，紮實有麥香、越嚼越甜，適合搭配湯品與起司。' }
  ];

  /* ---- localStorage 讀寫 ---- */
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  /* ---- 目錄查詢 ----
     後台（admin-store.js）會把商品覆寫層寫入 gg.admin.products，
     其中含 price / stock / active 等可編輯欄位；此處讀取以連動前台：
     - allProducts()：完整清單（含下架品，供 find 直連商品頁用）
     - catalog()：只回上架（active !== false）商品，供前台列表
     無覆寫層時回內建 CATALOG，行為與原本一致（向後相容）。 */
  var ADMIN_PROD_KEY = 'gg.admin.products';

  function baseCatalog() { return CATALOG.slice(); }

  function allProducts() {
    var ov = read(ADMIN_PROD_KEY, null);
    if (ov && ov.length) return ov;
    return CATALOG.slice();
  }
  function catalog() {
    return allProducts().filter(function (p) { return p.active !== false; });
  }
  function find(id) {
    var all = allProducts();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  /* ---- 購物車 ---- */
  function getCart() {
    var items = read(CART_KEY, []);
    if (!Array.isArray(items)) items = [];
    /* 過濾掉目錄中已不存在的品項，並確保 qty 為正整數 */
    return items
      .filter(function (it) { return it && find(it.id); })
      .map(function (it) { return { id: it.id, qty: Math.max(1, parseInt(it.qty, 10) || 1) }; });
  }

  function saveCart(items) {
    write(CART_KEY, items);
    /* 廣播變更，讓頁首件數與各頁即時更新 */
    try { window.dispatchEvent(new CustomEvent('gg:cartchange', { detail: { count: count() } })); } catch (e) {}
  }

  /* 商品若設有庫存（後台 stock 為數字），購物車該品總量不得超過庫存；
     無 stock 欄位（未經後台設定）視為不限，維持原本行為。 */
  function stockOf(p) { return (p && typeof p.stock === 'number') ? p.stock : Infinity; }

  function addItem(id, qty) {
    var p = find(id);
    if (!p) return { added: 0, reason: 'notfound' };
    qty = Math.max(1, parseInt(qty, 10) || 1);
    var cart = getCart();
    var hit = null;
    for (var i = 0; i < cart.length; i++) if (cart[i].id === id) { hit = cart[i]; break; }
    var current = hit ? hit.qty : 0;
    var room = Math.max(0, stockOf(p) - current);
    var add = Math.min(qty, room);
    if (add <= 0) return { added: 0, reason: 'stock', stock: stockOf(p) };
    if (hit) hit.qty += add; else cart.push({ id: id, qty: add });
    saveCart(cart);
    return { added: add, capped: add < qty, stock: stockOf(p) };
  }

  function setQty(id, qty) {
    qty = parseInt(qty, 10) || 0;
    var cart = getCart();
    if (qty <= 0) { removeItem(id); return { qty: 0 }; }
    var p = find(id);
    var capped = false;
    var max = stockOf(p);
    if (qty > max) { qty = max; capped = true; }
    for (var i = 0; i < cart.length; i++) if (cart[i].id === id) { cart[i].qty = qty; break; }
    saveCart(cart);
    return { qty: qty, capped: capped };
  }

  function removeItem(id) {
    saveCart(getCart().filter(function (it) { return it.id !== id; }));
  }

  function clearCart() { saveCart([]); }

  /* ---- 金額 ---- */
  function count() {
    return getCart().reduce(function (n, it) { return n + it.qty; }, 0);
  }
  function subtotal() {
    return getCart().reduce(function (sum, it) {
      var p = find(it.id);
      return sum + (p ? p.price * it.qty : 0);
    }, 0);
  }
  /* ---- 配送情境（門市自取／配送區域；由結帳頁設定）---- */
  var PICKUP_KEY = 'gg.ship.pickup';   /* '1' = 門市自取 */
  var ZONE_KEY   = 'gg.ship.zone';     /* 選定的區域 id */
  /* 後台「運費管理」尚未初始化時的預設（與 admin-store 的 seedShipping 一致）；
     後台一旦有設定（gg.admin.shipping）即以後台為準。 */
  var DEFAULT_SHIP = {
    freeThreshold: FREE_SHIP, flatRate: SHIP_FEE, pickup: true,
    zones: [
      { id: 'main', name: '台灣本島', fee: SHIP_FEE },
      { id: 'offshore', name: '離島（澎湖／金門／馬祖）', fee: 250 }
    ]
  };
  function shipCfg() { return read('gg.admin.shipping', null) || DEFAULT_SHIP; }
  function isPickup() { try { return localStorage.getItem(PICKUP_KEY) === '1'; } catch (e) { return false; } }
  function setPickup(on) {
    try { if (on) localStorage.setItem(PICKUP_KEY, '1'); else localStorage.removeItem(PICKUP_KEY); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('gg:cartchange', { detail: { count: count() } })); } catch (e) {}
  }
  function getZone() { try { return localStorage.getItem(ZONE_KEY) || ''; } catch (e) { return ''; } }
  function setZone(id) {
    try { if (id) localStorage.setItem(ZONE_KEY, id); else localStorage.removeItem(ZONE_KEY); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('gg:cartchange', { detail: { count: count() } })); } catch (e) {}
  }
  function clearShip() { try { localStorage.removeItem(PICKUP_KEY); localStorage.removeItem(ZONE_KEY); } catch (e) {} }
  /* 後台設定的配送區域清單（供結帳頁選擇）*/
  function shippingZones() {
    var c = shipCfg();
    return (c && Array.isArray(c.zones)) ? c.zones : [];
  }
  /* 原始運費（未計免運券）：依後台「運費管理」gg.admin.shipping，
     門市自取免運、依選定區域採區域費率、滿額免運。 */
  function baseShipping() {
    var s = subtotal();
    if (s === 0) return 0;
    var c = shipCfg();
    /* 門市自取：後台開放自取時免運 */
    if (isPickup() && (!c || c.pickup !== false)) return 0;
    var free = (c && c.freeThreshold != null) ? c.freeThreshold : FREE_SHIP;
    if (s >= free) return 0;
    /* 配送區域費率；未選或查無則用基本運費 */
    var fee = (c && c.flatRate != null) ? c.flatRate : SHIP_FEE;
    var zid = getZone();
    if (zid && c && Array.isArray(c.zones)) {
      for (var i = 0; i < c.zones.length; i++) if (c.zones[i].id === zid) { fee = c.zones[i].fee; break; }
    }
    return fee;
  }
  /* 實際運費：套用有效的「免運」優惠券時為 0 */
  function shipping() {
    return isFreeShipCoupon() ? 0 : baseShipping();
  }
  /* 免運券實際省下的運費（原本就免運則為 0）*/
  function shippingWaived() {
    return isFreeShipCoupon() ? baseShipping() : 0;
  }
  /* ---- 優惠券（連動後台「優惠券管理」gg.admin.coupons）---- */
  var COUPON_KEY = 'gg.coupon';   /* 目前套用的折扣碼 { code } */
  function adminCoupons() {
    var r = read('gg.admin.coupons', null);
    return Array.isArray(r) ? r : [];
  }
  function findCouponDef(code) {
    code = String(code || '').trim().toUpperCase();
    if (!code) return null;
    var list = adminCoupons();
    for (var i = 0; i < list.length; i++) if (String(list[i].code).toUpperCase() === code) return list[i];
    return null;
  }
  function couponExpired(c) {
    if (!c || !c.expiry) return false;
    var mm = String(c.expiry).match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
    if (!mm) return false;
    return new Date() > new Date(+mm[1], +mm[2] - 1, +mm[3], 23, 59, 59);
  }
  function couponDiscountOf(c, sub) {
    if (!c || c.type === 'freeship') return 0;   /* 免運券的優惠反映在運費，非商品折扣 */
    if (sub == null) sub = subtotal();
    var d = c.type === 'percent' ? Math.round(sub * (c.value || 0) / 100) : (c.value || 0);
    if (c.type === 'percent' && c.cap) d = Math.min(d, c.cap);   /* 百分比折扣上限 */
    return Math.max(0, Math.min(d, sub));
  }
  /* 驗證折扣碼是否可用於目前購物車；回 { ok, coupon, discount } 或 { ok:false, msg } */
  function checkCoupon(code) {
    var c = findCouponDef(code);
    if (!c) return { ok: false, msg: '查無此優惠碼' };
    if (!c.active) return { ok: false, msg: '此優惠碼已停用' };
    if (couponExpired(c)) return { ok: false, msg: '此優惠碼已過期' };
    var sub = subtotal();
    if (c.minSpend && sub < c.minSpend) return { ok: false, msg: '消費滿 ' + money(c.minSpend) + ' 才能使用此碼' };
    return { ok: true, coupon: c, discount: couponDiscountOf(c, sub) };
  }
  function applyCoupon(code) {
    var r = checkCoupon(code);
    if (r.ok) {
      write(COUPON_KEY, { code: String(r.coupon.code).toUpperCase() });
      try { window.dispatchEvent(new CustomEvent('gg:cartchange', { detail: { count: count() } })); } catch (e) {}
    }
    return r;
  }
  function clearCoupon() {
    try { localStorage.removeItem(COUPON_KEY); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('gg:cartchange', { detail: { count: count() } })); } catch (e) {}
  }
  /* 下單後讓後台「優惠券管理」的使用次數 +1（呼叫端需自行防止重複計算）*/
  function markCouponUsed(code) {
    code = String(code || '').trim().toUpperCase();
    if (!code) return;
    var list = read('gg.admin.coupons', null);
    if (!Array.isArray(list)) return;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].code).toUpperCase() === code) { list[i].used = (list[i].used || 0) + 1; break; }
    }
    write('gg.admin.coupons', list);
    try { window.dispatchEvent(new CustomEvent('gg:adminchange', { detail: { what: 'coupons' } })); } catch (e) {}
  }
  /* 目前套用且仍有效的優惠券（失效則回 null，不折抵）*/
  function appliedCoupon() {
    var saved = read(COUPON_KEY, null);
    if (!saved || !saved.code) return null;
    var r = checkCoupon(saved.code);
    return r.ok ? r.coupon : null;
  }
  function discount() {
    var c = appliedCoupon();
    return c ? couponDiscountOf(c, subtotal()) : 0;
  }
  function isFreeShipCoupon() {
    var c = appliedCoupon();
    return !!(c && c.type === 'freeship');
  }
  /* 摘要用的折扣／免運顯示行：{ show, label, value } */
  function discountLine() {
    var c = appliedCoupon();
    if (!c) return { show: false };
    if (c.type === 'freeship') {
      var w = shippingWaived();
      return { show: true, label: '免運優惠（' + c.code + '）', value: w > 0 ? '-' + money(w) : '已免運' };
    }
    var d = couponDiscountOf(c, subtotal());
    if (d > 0) return { show: true, label: '折扣（' + c.code + '）', value: '-' + money(d) };
    return { show: false };
  }

  /* ---- 點數折抵（需登入會員；餘額由呼叫端以 pointsBalance 取得）---- */
  var POINTS_REDEEM_KEY = 'gg.pointsRedeem';   /* { points } */
  function pointsCfg() {
    var r = read('gg.admin.points', null);
    return (r && r.enabled !== false) ? r : null;
  }
  function pointsRedeemRate() { var c = pointsCfg(); return c ? (c.redeemRate || 0) : 0; }
  /* 會員目前可用點數（spendTotal 與 email 由呼叫端提供，例如 GGAuth.current）*/
  function pointsBalance(spendTotal, email) {
    var c = pointsCfg(); if (!c) return null;
    var per = c.earnPer || 100, pts = c.earnPoints || 0;
    var earned = Math.floor(((spendTotal || 0) / per) * pts);
    var adj = (c.ledger && c.ledger[email]) || 0;
    return { balance: Math.max(0, earned + adj), rate: c.redeemRate || 0, per: per, pts: pts };
  }
  function getPointsRedeem() {
    var r = read(POINTS_REDEEM_KEY, null);
    return (r && r.points > 0) ? Math.floor(r.points) : 0;
  }
  function setPointsRedeem(points) {
    points = Math.max(0, parseInt(points, 10) || 0);
    if (points > 0) write(POINTS_REDEEM_KEY, { points: points });
    else { try { localStorage.removeItem(POINTS_REDEEM_KEY); } catch (e) {} }
    try { window.dispatchEvent(new CustomEvent('gg:cartchange', { detail: { count: count() } })); } catch (e) {}
  }
  function clearPointsRedeem() {
    try { localStorage.removeItem(POINTS_REDEEM_KEY); } catch (e) {}
  }
  /* 點數折抵金額：受可折抵點數與「折扣後商品餘額」雙重上限 */
  function pointsDiscount() {
    var rate = pointsRedeemRate();
    if (!rate) return 0;
    var n = getPointsRedeem();
    if (n <= 0) return 0;
    var remaining = Math.max(0, subtotal() - discount());
    return Math.min(n * rate, remaining);
  }
  function pointsUsed() {
    var rate = pointsRedeemRate();
    if (!rate) return 0;
    return Math.round(pointsDiscount() / rate);
  }
  /* 折扣後的商品淨額（不含運費）*/
  function netGoods() { return Math.max(0, subtotal() - discount() - pointsDiscount()); }

  /* 本次可獲得點數：依後台規則，以折扣後商品淨額計；關閉或無設定回 null */
  function pointsForAmount(amount) {
    var c = pointsCfg(); if (!c) return null;
    if (amount == null) amount = netGoods();
    var per = c.earnPer || 100, pts = c.earnPoints || 0;
    return Math.floor((amount / per) * pts);
  }

  /* 直接調整後台點數帳 ledger（下單後回饋／扣抵用）*/
  function adjustLedger(email, delta) {
    if (!email || !delta) return;
    var r = read('gg.admin.points', null); if (!r) return;
    if (!r.ledger) r.ledger = {};
    r.ledger[email] = (r.ledger[email] || 0) + delta;
    write('gg.admin.points', r);
  }

  function total() { return netGoods() + shipping(); }

  /* 展開購物車為含商品明細的列表，供渲染用 */
  function lines() {
    return getCart().map(function (it) {
      var p = find(it.id);
      return {
        id: it.id, qty: it.qty,
        name: p.name, price: p.price, img: p.img, cat: p.cat, unit: p.unit,
        lineTotal: p.price * it.qty
      };
    });
  }

  /* ---- 收藏（沿用首頁） ---- */
  function getFavs() {
    var f = read(FAV_KEY, []);
    return Array.isArray(f) ? f : [];
  }

  /* ---- 訂單（結帳→完成頁傳遞）---- */
  function saveOrder(order) { write(ORDER_KEY, order); }
  function getOrder() { return read(ORDER_KEY, null); }

  /* ---- 金額格式化 ---- */
  function money(n) { return '$' + Number(n).toLocaleString('en-US'); }

  /* ---- HTML 跳脫（供前台以 innerHTML 插入商品名等使用者可控字串）----
     後台可新增任意名稱的商品，若不跳脫會造成儲存型 XSS。 */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- 頁首購物車件數徽章（四頁共用）----
     更新 #cartCount，並監聽購物車變更與跨分頁 storage 事件。 */
  function mountBadge() {
    var el = document.getElementById('cartCount');
    if (!el) return;
    function upd() {
      var n = count();
      el.textContent = String(n);
      el.hidden = (n === 0);        /* 空車時隱藏數字 */
    }
    upd();
    window.addEventListener('gg:cartchange', upd);
    window.addEventListener('storage', function (e) { if (e.key === CART_KEY) upd(); });
  }

  return {
    SHIP_FEE: SHIP_FEE, FREE_SHIP: FREE_SHIP,
    catalog: catalog, find: find, baseCatalog: baseCatalog,
    getCart: getCart, addItem: addItem, setQty: setQty, removeItem: removeItem, clearCart: clearCart,
    count: count, subtotal: subtotal, shipping: shipping, total: total, lines: lines,
    discount: discount, appliedCoupon: appliedCoupon, checkCoupon: checkCoupon,
    applyCoupon: applyCoupon, clearCoupon: clearCoupon, markCouponUsed: markCouponUsed,
    baseShipping: baseShipping, isPickup: isPickup, setPickup: setPickup,
    getZone: getZone, setZone: setZone, clearShip: clearShip, shippingZones: shippingZones,
    shippingWaived: shippingWaived, discountLine: discountLine, pointsForAmount: pointsForAmount,
    pointsBalance: pointsBalance, pointsRedeemRate: pointsRedeemRate,
    getPointsRedeem: getPointsRedeem, setPointsRedeem: setPointsRedeem, clearPointsRedeem: clearPointsRedeem,
    pointsDiscount: pointsDiscount, pointsUsed: pointsUsed, netGoods: netGoods, adjustLedger: adjustLedger,
    getFavs: getFavs,
    saveOrder: saveOrder, getOrder: getOrder,
    money: money, mountBadge: mountBadge,
    esc: esc, stockOf: stockOf
  };
})();
