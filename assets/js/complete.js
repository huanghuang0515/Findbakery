/* =========================================================
   訂單完成頁 complete.html
   ========================================================= */
(function () {
  'use strict';
  var GG = window.GG;
  if (!GG) return;
  var $ = function (s) { return document.querySelector(s); };

  var order = GG.getOrder();

  /* 沒有訂單資料（直接進入此頁）→ 導回首頁 */
  if (!order || !order.lines || !order.lines.length) {
    location.replace('index.html');
    return;
  }

  /* 訂單已成立 → 清空購物車（頁首件數同步歸零） */
  GG.clearCart();
  if (GG.mountBadge) GG.mountBadge();

  /* ---- 填入內容 ---- */
  $('#orderNo').textContent = order.no;

  $('#orderLines').innerHTML = order.lines.map(function (l) {
    return [
      '<li class="mini-line">',
        '<img src="assets/img/' + l.img + '.jpg" alt="' + l.name + '" width="52" height="52" loading="lazy">',
        '<span class="mini-line__name">' + l.name + '<br><span class="mini-line__qty">數量 ' + l.qty + '</span></span>',
        '<span class="mini-line__price">' + GG.money(l.lineTotal) + '</span>',
      '</li>'
    ].join('');
  }).join('');

  $('#sumSubtotal').textContent = GG.money(order.subtotal);
  $('#sumShipping').textContent = order.shipping === 0 ? '免運' : GG.money(order.shipping);
  $('#sumTotal').textContent = GG.money(order.total);

  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  var info = [
    '<strong>收件人</strong>　' + esc(order.name),
    '<strong>電話</strong>　' + esc(order.phone),
    '<strong>信箱</strong>　' + esc(order.email),
    '<strong>配送</strong>　' + esc(order.delivery) + (order.address && order.address !== '門市自取' ? '｜' + esc(order.address) : ''),
    '<strong>付款</strong>　' + esc(order.payment)
  ];
  if (order.note) info.push('<strong>備註</strong>　' + esc(order.note));
  $('#orderInfo').innerHTML = info.join('<br>');
})();
