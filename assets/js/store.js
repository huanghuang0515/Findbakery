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
  function shipping() {
    var s = subtotal();
    return (s === 0 || s >= FREE_SHIP) ? 0 : SHIP_FEE;
  }
  function total() { return subtotal() + shipping(); }

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
    getFavs: getFavs,
    saveOrder: saveOrder, getOrder: getOrder,
    money: money, mountBadge: mountBadge,
    esc: esc, stockOf: stockOf
  };
})();
