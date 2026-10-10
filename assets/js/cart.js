/* =========================================================
   購物車頁 cart.html
   ========================================================= */
(function () {
  'use strict';
  var GG = window.GG;
  if (!GG) return;
  var $ = function (s) { return document.querySelector(s); };
  var esc = GG.esc || function (s) { return String(s == null ? '' : s); };
  function stockOf(id) { return GG.stockOf ? GG.stockOf(GG.find(id)) : Infinity; }
  function maxOf(id) { return Math.min(99, stockOf(id)); }

  var layout = $('#cartLayout'), empty = $('#cartEmpty'), list = $('#cartList');

  function rowMarkup(l) {
    var id = encodeURIComponent(l.id);
    var max = maxOf(l.id);
    return [
      '<li class="cart-row" data-id="' + esc(l.id) + '">',
        '<a href="product.html?id=' + id + '"><img class="cart-row__thumb" src="assets/img/' + esc(l.img) + '.jpg" alt="' + esc(l.name) + '" width="96" height="96" loading="lazy"></a>',
        '<div class="cart-row__info">',
          '<p class="cart-row__cat">' + esc(l.cat) + '</p>',
          '<h2 class="cart-row__name"><a href="product.html?id=' + id + '">' + esc(l.name) + '</a></h2>',
          '<p class="cart-row__unit">' + GG.money(l.price) + '　' + esc(l.unit) + '</p>',
          '<div class="qty" role="group" aria-label="' + esc(l.name) + ' 數量" style="margin-top:12px">',
            '<button class="qty__btn" type="button" data-dec aria-label="減少數量">−</button>',
            '<input class="qty__val" type="number" inputmode="numeric" value="' + l.qty + '" min="1" max="' + (isFinite(max) ? max : 99) + '" data-qty aria-label="數量">',
            '<button class="qty__btn" type="button" data-inc aria-label="增加數量">＋</button>',
          '</div>',
        '</div>',
        '<div class="cart-row__right">',
          '<p class="cart-row__price">' + GG.money(l.lineTotal) + '</p>',
          '<button class="cart-row__remove" type="button" data-remove>移除</button>',
        '</div>',
      '</li>'
    ].join('');
  }

  function renderSummary() {
    var sub = GG.subtotal(), ship = GG.shipping();
    $('#sumSubtotal').textContent = GG.money(sub);
    $('#sumShipping').textContent = ship === 0 ? '免運' : GG.money(ship);
    $('#sumTotal').textContent = GG.money(GG.total());
    var hint = $('#sumHint');
    if (sub === 0) { hint.textContent = ''; }
    else if (ship === 0) { hint.textContent = '已達免運門檻。'; }
    else { hint.textContent = '再買 ' + GG.money(GG.FREE_SHIP - sub) + ' 即可免運（滿 ' + GG.money(GG.FREE_SHIP) + '）。'; }
  }

  function render() {
    var lines = GG.lines();
    if (!lines.length) {
      layout.hidden = true;
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    layout.hidden = false;
    list.innerHTML = lines.map(rowMarkup).join('');
    renderSummary();
  }

  /* 事件委派：數量增減、輸入、移除 */
  list.addEventListener('click', function (e) {
    var row = e.target.closest('.cart-row');
    if (!row) return;
    var id = row.dataset.id;
    if (e.target.closest('[data-remove]')) {
      GG.removeItem(id);
      var p = GG.find(id);
      if (window.ggToast) window.ggToast('已移除：' + (p ? p.name : '商品'));
      render();
      return;
    }
    if (e.target.closest('[data-inc]') || e.target.closest('[data-dec]')) {
      var input = row.querySelector('[data-qty]');
      var n = parseInt(input.value, 10) || 1;
      n += e.target.closest('[data-inc]') ? 1 : -1;
      if (n < 1) n = 1;
      var max = maxOf(id);
      if (n > max) { n = max; if (window.ggToast) window.ggToast('已達庫存上限（' + max + ' 件）'); }
      GG.setQty(id, n);
      render();
    }
  });
  list.addEventListener('change', function (e) {
    var input = e.target.closest('[data-qty]');
    if (!input) return;
    var row = e.target.closest('.cart-row');
    var n = parseInt(input.value, 10);
    if (isNaN(n) || n < 1) n = 1;
    var max = maxOf(row.dataset.id);
    if (n > max) { n = max; if (window.ggToast) window.ggToast('已達庫存上限（' + max + ' 件）'); }
    GG.setQty(row.dataset.id, n);
    render();
  });

  render();
})();
