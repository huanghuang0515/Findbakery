/* =========================================================
   商品詳情頁 product.html
   依 ?id= 顯示商品；無參數或找不到時退回第一項。
   ========================================================= */
(function () {
  'use strict';
  var GG = window.GG;
  if (!GG) return;
  var $ = function (s) { return document.querySelector(s); };
  var esc = GG.esc || function (s) { return String(s == null ? '' : s); };

  /* 取得目前商品 */
  var params = new URLSearchParams(location.search);
  var id = params.get('id');
  var item = (id && GG.find(id)) || GG.catalog()[0];

  var stock = GG.stockOf ? GG.stockOf(item) : Infinity;   /* 無庫存欄位視為不限 */
  var maxQty = Math.min(99, stock);
  var soldOut = stock <= 0;
  var offShelf = item.active === false;
  var buyable = !soldOut && !offShelf;

  /* ---- 填入商品資訊（textContent 本身安全）---- */
  document.title = item.name + '｜Gothel\'s Garden';
  $('#crumbName').textContent = item.name;
  var img = $('#pdpImg');
  img.src = 'assets/img/' + item.img + '.jpg';
  img.alt = item.alt;
  $('#pdpCat').textContent = item.cat;
  $('#pdpCatText').textContent = item.cat + '｜手作烘焙';
  $('#pdpName').textContent = item.name;
  $('#pdpPrice').textContent = GG.money(item.price);
  $('#pdpUnit').textContent = item.unit + '　新鮮現做';
  $('#pdpDesc').textContent = item.desc;

  /* ---- 下架／售罄狀態 ---- */
  var addBtn = $('#addBtn');
  var badge = $('#pdpCat');
  if (offShelf || soldOut) {
    var label = offShelf ? '暫停販售' : '已售完';
    badge.textContent = label;
    addBtn.textContent = label;
    addBtn.disabled = true;
    var qtyBox = document.querySelector('.qty');
    if (qtyBox) qtyBox.setAttribute('aria-disabled', 'true');
    ['qtyMinus', 'qtyPlus', 'qtyVal'].forEach(function (i) { var el = $('#' + i); if (el) el.disabled = true; });
  }

  /* ---- 數量選擇器（受庫存上限）---- */
  var val = $('#qtyVal');
  if (isFinite(maxQty)) val.max = maxQty;
  function clampQty() {
    var n = parseInt(val.value, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > maxQty) n = maxQty;
    val.value = n;
    $('#qtyMinus').disabled = (n <= 1) || !buyable;
    $('#qtyPlus').disabled = (n >= maxQty) || !buyable;
    return n;
  }
  if (buyable) {
    $('#qtyMinus').addEventListener('click', function () { val.value = clampQty() - 1; clampQty(); });
    $('#qtyPlus').addEventListener('click', function () { val.value = clampQty() + 1; clampQty(); });
    val.addEventListener('change', clampQty);
    val.addEventListener('input', function () { if (val.value !== '') clampQty(); });
    clampQty();
  }

  /* ---- 加入購物車（處理庫存上限回饋）---- */
  if (buyable) {
    addBtn.addEventListener('click', function () {
      var n = clampQty();
      var res = GG.addItem(item.id, n);
      if (!res || res.added <= 0) {
        if (window.ggToast) window.ggToast('庫存不足，無法加入更多');
      } else if (res.capped) {
        if (window.ggToast) window.ggToast('庫存僅剩 ' + res.stock + ' 件，已加入 ' + res.added + ' 件');
      } else {
        if (window.ggToast) window.ggToast('已加入購物車：' + item.name + ' ×' + res.added);
      }
    });
  }

  /* ---- 其他商品 ---- */
  function card(p) {
    return [
      '<li class="card">',
        '<a class="card__media" href="product.html?id=' + encodeURIComponent(p.id) + '" aria-label="查看 ' + esc(p.name) + '">',
          '<img src="assets/img/' + esc(p.img) + '.jpg" alt="' + esc(p.alt) + '" width="900" height="900" loading="lazy" decoding="async">',
          '<span class="card__add" data-add="' + esc(p.id) + '">加入購物車</span>',
        '</a>',
        '<div class="card__row"><div>',
          '<h3 class="card__name">' + esc(p.name) + '</h3>',
          '<p class="card__price"><span>$</span>' + p.price + '</p>',
        '</div></div>',
        '<span class="card__sold">' + esc(p.unit) + '</span>',
      '</li>'
    ].join('');
  }
  var more = GG.catalog().filter(function (p) { return p.id !== item.id; }).slice(0, 3);
  $('#moreGrid').innerHTML = more.map(card).join('');

  /* 「加入購物車」委派 */
  $('#moreGrid').addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (!add) return;
    e.preventDefault();
    var pid = add.getAttribute('data-add');
    var p = GG.find(pid);
    var res = GG.addItem(pid, 1);
    if (!res || res.added <= 0) {
      if (window.ggToast) window.ggToast('庫存不足，無法加入');
    } else if (window.ggToast) {
      window.ggToast('已加入購物車：' + (p ? p.name : '商品'));
    }
  });
})();
