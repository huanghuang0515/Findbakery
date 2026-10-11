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

  /* 訂單已成立 → 清空購物車、折扣碼與點數折抵（頁首件數同步歸零） */
  GG.clearCart();
  if (GG.clearCoupon) GG.clearCoupon();
  if (GG.clearPointsRedeem) GG.clearPointsRedeem();
  if (GG.mountBadge) GG.mountBadge();

  /* 點數回饋與折抵反映到會員點數帳（demo）；以 pointsSettled 防止重整重複計算 */
  if (order.memberEmail && GG.adjustLedger && !order.pointsSettled) {
    var net = (order.earnedPoints || 0) - (order.pointsUsed || 0);
    if (net) GG.adjustLedger(order.memberEmail, net);
    order.pointsSettled = true;
    GG.saveOrder(order);
  }

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
  var dRow = $('#discountRow');
  if (dRow) {
    if (order.couponType === 'freeship') {
      dRow.hidden = false;
      $('#discountLabel').textContent = '免運優惠' + (order.coupon ? '（' + order.coupon + '）' : '');
      $('#sumDiscount').textContent = (order.shippingWaived && order.shippingWaived > 0) ? '-' + GG.money(order.shippingWaived) : '已免運';
    } else if (order.discount && order.discount > 0) {
      dRow.hidden = false;
      $('#discountLabel').textContent = '折扣' + (order.coupon ? '（' + order.coupon + '）' : '');
      $('#sumDiscount').textContent = '-' + GG.money(order.discount);
    }
  }
  var pRow = $('#pointsRow');
  if (pRow && order.pointsDiscount && order.pointsDiscount > 0) {
    pRow.hidden = false;
    $('#pointsLabel').textContent = '點數折抵（' + (order.pointsUsed || 0) + ' 點）';
    $('#sumPoints').textContent = '-' + GG.money(order.pointsDiscount);
  }
  $('#sumTotal').textContent = GG.money(order.total);
  var epEl = $('#earnPoints');
  if (epEl && order.earnedPoints && order.earnedPoints > 0) {
    epEl.hidden = false;
    epEl.textContent = '本次獲得 ' + order.earnedPoints + ' 點，已累積至您的會員帳戶';
  }

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
