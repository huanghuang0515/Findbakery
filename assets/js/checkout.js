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
    $('#sumTotal').textContent = GG.money(GG.total());
  }
  renderSummary();

  /* ---- 配送方式：門市自取時隱藏地址欄並免除必填 ---- */
  var addrField = $('#addrField'), addrInput = $('#address');
  function syncDelivery() {
    var pickup = $('input[name="delivery"]:checked').value === '門市自取';
    addrField.style.display = pickup ? 'none' : '';
    addrInput.required = !pickup;
    if (pickup) clearError(addrInput);
  }
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
      total: GG.total()
    };
    GG.saveOrder(order);
    /* 購物車於完成頁載入時清空，避免返回時遺失；此處直接前往完成頁 */
    location.href = 'complete.html';
  });
})();
