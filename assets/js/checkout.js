/* =========================================================
   結帳頁 checkout.html
   ========================================================= */
(function () {
  'use strict';
  var GG = window.GG;
  if (!GG) return;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  /* 購物車為空 → 導回購物車頁 */
  if (!GG.lines().length) { location.replace('cart.html'); return; }

  /* 登入會員（供點數折抵用）；未登入則 member 為 null */
  var member = (window.GGAuth && GGAuth.current && GGAuth.current()) || null;
  function pointsState() {
    if (!member || !GG.pointsBalance) return null;
    return GG.pointsBalance(member.spendTotal, member.email);  /* { balance, rate } 或 null */
  }
  function maxRedeem() {
    var ps = pointsState();
    if (!ps || !ps.rate) return 0;
    var remaining = Math.max(0, GG.subtotal() - GG.discount());
    return Math.min(ps.balance, Math.floor(remaining / ps.rate));
  }

  /* ---- 訂單摘要 ---- */
  function renderSummary() {
    $('#miniLines').innerHTML = GG.lines().map(function (l) {
      return [
        '<li class="mini-line">',
          '<img src="assets/img/' + l.img + '.jpg" alt="' + l.name + '" width="52" height="52" loading="lazy">',
          '<span class="mini-line__name">' + l.name + '<br><span class="mini-line__qty">數量 ' + l.qty + '</span></span>',
          '<span class="mini-line__price">' + GG.money(l.lineTotal) + '</span>',
        '</li>'
      ].join('');
    }).join('');
    $('#sumSubtotal').textContent = GG.money(GG.subtotal());
    $('#sumShipping').textContent = GG.shipping() === 0 ? '免運' : GG.money(GG.shipping());
    var dRow = $('#discountRow');
    if (dRow) {
      var dl = GG.discountLine ? GG.discountLine() : { show: false };
      if (dl.show) {
        dRow.hidden = false;
        $('#discountLabel').textContent = dl.label;
        $('#sumDiscount').textContent = dl.value;
      } else { dRow.hidden = true; }
    }
    var pRow = $('#pointsRow');
    if (pRow) {
      var pd = GG.pointsDiscount ? GG.pointsDiscount() : 0;
      if (pd > 0) {
        pRow.hidden = false;
        $('#pointsLabel').textContent = '點數折抵（' + (GG.pointsUsed ? GG.pointsUsed() : 0) + ' 點）';
        $('#sumPoints').textContent = '-' + GG.money(pd);
      } else { pRow.hidden = true; }
    }
    $('#sumTotal').textContent = GG.money(GG.total());
    var epEl = $('#earnPoints');
    if (epEl) {
      var ep = GG.pointsForAmount ? GG.pointsForAmount() : null;
      if (ep && ep > 0) { epEl.hidden = false; epEl.textContent = '本次可獲得 ' + ep + ' 點'; }
      else { epEl.hidden = true; }
    }
    renderCouponState();
    renderPointsBox();
  }

  /* 點數折抵：顯示/狀態 */
  function renderPointsBox() {
    var box = $('#pointsRedeem'), loginHint = $('#ptLogin');
    if (!box) return;
    var ps = pointsState();
    /* 功能關閉：兩者皆隱藏 */
    if (!GG.pointsRedeemRate || !GG.pointsRedeemRate()) { box.hidden = true; if (loginHint) loginHint.hidden = true; return; }
    if (!ps || ps.balance <= 0) {
      box.hidden = true;
      if (loginHint) loginHint.hidden = member ? true : false;   /* 未登入才提示登入 */
      return;
    }
    if (loginHint) loginHint.hidden = true;
    box.hidden = false;
    var used = GG.getPointsRedeem ? GG.getPointsRedeem() : 0;
    var apply = $('#ptApply'), input = $('#ptInput'), bal = $('#ptBalance'), msg = $('#ptMsg');
    bal.textContent = '可用 ' + ps.balance + ' 點（1 點折 ' + GG.money(ps.rate) + '）';
    if (used > 0) {
      input.value = used; input.disabled = true;
      apply.textContent = '移除'; apply.dataset.mode = 'remove';
      $('#ptMax').hidden = true;
      if (!msg.classList.contains('is-err')) { msg.textContent = '已折抵 ' + (GG.pointsUsed ? GG.pointsUsed() : used) + ' 點'; msg.className = 'coupon__msg is-ok'; }
    } else {
      input.disabled = false;
      apply.textContent = '折抵'; apply.dataset.mode = 'apply';
      $('#ptMax').hidden = false;
      input.setAttribute('max', String(maxRedeem()));
      if (!msg.classList.contains('is-err')) { msg.textContent = ''; msg.className = 'coupon__msg'; }
    }
  }
  function bindPointsRedeem() {
    var apply = $('#ptApply'), input = $('#ptInput'), msg = $('#ptMsg'), maxBtn = $('#ptMax');
    if (!apply) return;
    apply.addEventListener('click', function () {
      if (apply.dataset.mode === 'remove') { GG.setPointsRedeem(0); msg.textContent = ''; msg.className = 'coupon__msg'; renderSummary(); return; }
      var n = parseInt(input.value, 10) || 0;
      var max = maxRedeem();
      if (n <= 0) { input.focus(); return; }
      if (n > max) { n = max; }
      if (max <= 0) { msg.textContent = '目前無可折抵點數'; msg.className = 'coupon__msg is-err'; return; }
      GG.setPointsRedeem(n); renderSummary();
    });
    maxBtn.addEventListener('click', function () { var max = maxRedeem(); if (max > 0) { GG.setPointsRedeem(max); renderSummary(); } });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); apply.click(); } });
  }

  /* 折扣碼：反映目前套用狀態 */
  function renderCouponState() {
    var apply = $('#couponApply'), input = $('#couponInput'), msg = $('#couponMsg');
    if (!apply) return;
    var c = GG.appliedCoupon && GG.appliedCoupon();
    if (c) {
      input.value = c.code; input.disabled = true;
      apply.textContent = '移除'; apply.dataset.mode = 'remove';
      msg.textContent = '已套用折扣碼 ' + c.code; msg.className = 'coupon__msg is-ok';
    } else {
      input.disabled = false;
      apply.textContent = '套用'; apply.dataset.mode = 'apply';
      if (!msg.classList.contains('is-err')) { msg.textContent = ''; msg.className = 'coupon__msg'; }
    }
  }
  function bindCoupon() {
    var apply = $('#couponApply'), input = $('#couponInput'), msg = $('#couponMsg');
    if (!apply) return;
    apply.addEventListener('click', function () {
      if (apply.dataset.mode === 'remove') { GG.clearCoupon(); msg.textContent = ''; msg.className = 'coupon__msg'; renderSummary(); return; }
      var code = (input.value || '').trim();
      if (!code) { input.focus(); return; }
      var r = GG.applyCoupon(code);
      if (r.ok) { if (window.ggToast) window.ggToast('已套用折扣碼 ' + code.toUpperCase()); renderSummary(); }
      else { msg.textContent = r.msg; msg.className = 'coupon__msg is-err'; }
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); apply.click(); } });
  }
  renderSummary();
  bindCoupon();
  bindPointsRedeem();

  /* ---- 配送方式：門市自取免運並隱藏地址欄；宅配可選配送區域（連動後台運費管理）---- */
  var addrField = $('#addrField'), addrInput = $('#address');
  var zoneField = $('#zoneField'), zoneSel = $('#shipZone');
  function initZones() {
    if (!zoneSel) return;
    var zones = GG.shippingZones ? GG.shippingZones() : [];
    if (!zones.length) { if (zoneField) zoneField.style.display = 'none'; return; }
    zoneSel.innerHTML = zones.map(function (z) {
      return '<option value="' + z.id + '">' + z.name + '（運費 ' + GG.money(z.fee) + '）</option>';
    }).join('');
    var cur = GG.getZone ? GG.getZone() : '';
    if (cur) zoneSel.value = cur;
    if (!zoneSel.value) zoneSel.value = zones[0].id;
    if (GG.setZone) GG.setZone(zoneSel.value);
    zoneSel.addEventListener('change', function () { if (GG.setZone) GG.setZone(zoneSel.value); renderSummary(); });
  }
  function syncDelivery() {
    var pickup = $('input[name="delivery"]:checked').value === '門市自取';
    if (GG.setPickup) GG.setPickup(pickup);
    addrField.style.display = pickup ? 'none' : '';
    if (zoneField) zoneField.style.display = pickup ? 'none' : '';
    addrInput.required = !pickup;
    if (pickup) clearError(addrInput);
    renderSummary();
  }
  initZones();
  $$('input[name="delivery"]').forEach(function (r) { r.addEventListener('change', syncDelivery); });
  syncDelivery();

  /* ---- 驗證 ---- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE = /^[0-9\-+() ]{7,}$/;

  function setError(input, msg) {
    input.classList.add('is-error');
    var box = document.querySelector('[data-err-for="' + input.id + '"]');
    if (box) box.textContent = msg;
  }
  function clearError(input) {
    input.classList.remove('is-error');
    var box = document.querySelector('[data-err-for="' + input.id + '"]');
    if (box) box.textContent = '';
  }

  function validate() {
    var ok = true, firstBad = null;
    function check(input, cond, msg) {
      if (cond) { clearError(input); }
      else { setError(input, msg); ok = false; if (!firstBad) firstBad = input; }
    }
    var name = $('#name'), phone = $('#phone'), email = $('#email');
    check(name, name.value.trim() !== '', '請填寫收件人姓名');
    check(phone, PHONE.test(phone.value.trim()), '請填寫正確的聯絡電話');
    check(email, EMAIL.test(email.value.trim()), '請填寫正確的電子信箱');
    if (addrInput.required) check(addrInput, addrInput.value.trim() !== '', '請填寫收件地址');
    if (firstBad) firstBad.focus();
    return ok;
  }

  /* 輸入時即時清除錯誤 */
  ['name', 'phone', 'email', 'address'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { if (el.classList.contains('is-error')) clearError(el); });
  });

  /* ---- 訂單編號 ---- */
  function orderNo() {
    var d = new Date();
    function p(n) { return ('0' + n).slice(-2); }
    var ymd = '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
    var rnd = Math.floor(1000 + Math.random() * 9000);
    return 'GG-' + ymd + '-' + rnd;
  }

  /* ---- 送出 ---- */
  $('#checkoutForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) {
      if (window.ggToast) window.ggToast('請確認必填欄位');
      return;
    }
    var delivery = $('input[name="delivery"]:checked').value;
    var order = {
      no: orderNo(),
      date: new Date().toISOString(),
      name: $('#name').value.trim(),
      phone: $('#phone').value.trim(),
      email: $('#email').value.trim(),
      delivery: delivery,
      address: delivery === '門市自取' ? '門市自取' : $('#address').value.trim(),
      note: $('#note').value.trim(),
      payment: $('input[name="payment"]:checked').value,
      lines: GG.lines(),
      subtotal: GG.subtotal(),
      shipping: GG.shipping(),
      discount: GG.discount ? GG.discount() : 0,
      coupon: (GG.appliedCoupon && GG.appliedCoupon() ? GG.appliedCoupon().code : null),
      couponType: (GG.appliedCoupon && GG.appliedCoupon() ? GG.appliedCoupon().type : null),
      shippingWaived: GG.shippingWaived ? GG.shippingWaived() : 0,
      pointsDiscount: GG.pointsDiscount ? GG.pointsDiscount() : 0,
      pointsUsed: GG.pointsUsed ? GG.pointsUsed() : 0,
      earnedPoints: GG.pointsForAmount ? GG.pointsForAmount() : null,
      memberEmail: (member ? member.email : null),
      shipZone: (delivery === '門市自取' ? null : (GG.getZone ? GG.getZone() : null)),
      total: GG.total()
    };
    GG.saveOrder(order);
    /* 下單後讓後台優惠券「已使用」+1（每張訂單計一次）*/
    if (order.coupon && GG.markCouponUsed) GG.markCouponUsed(order.coupon);
    /* 購物車於完成頁載入時清空，避免返回時遺失；此處直接前往完成頁 */
    location.href = 'complete.html';
  });
})();
