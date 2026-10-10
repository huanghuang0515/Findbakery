/* =========================================================
   後台登入 admin-login.html
   ========================================================= */
(function () {
  'use strict';
  var A = window.GGAdmin;
  if (!A) return;
  var $ = function (s) { return document.querySelector(s); };

  /* 簡易 toast */
  var toastEl = $('#toast'), tTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(tTimer); tTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2000);
  }

  if (A.isLoggedIn()) { location.replace('admin.html'); return; }

  var email = $('#email'), pw = $('#password'), err = $('#loginErr');
  var demo = A.demoAdmin();

  $('#demoFill').addEventListener('click', function () {
    email.value = demo.email; pw.value = demo.pw; err.textContent = ''; pw.focus();
  });

  $('#adminLoginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    err.textContent = '';
    if (!email.value.trim() || !pw.value) { err.textContent = '請輸入帳號與密碼'; return; }
    var res = A.login(email.value, pw.value);
    if (res.ok) { toast('登入成功'); location.href = 'admin.html'; }
    else { err.textContent = res.error || '登入失敗'; pw.select(); }
  });
})();
