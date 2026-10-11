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

  /* ---- 忘記密碼 ---- */
  var loginView = $('#loginView'), forgotForm = $('#forgotForm');
  var fEmail = $('#fEmail'), fPw = $('#fPw'), fPw2 = $('#fPw2'), fMsg = $('#forgotMsg');
  $('#forgotToggle').addEventListener('click', function () {
    loginView.hidden = true; forgotForm.hidden = false;
    fMsg.textContent = ''; fMsg.className = 'auth__err';
    if (email.value) fEmail.value = email.value;
    fEmail.focus();
  });
  $('#backToLogin').addEventListener('click', function () {
    forgotForm.hidden = true; loginView.hidden = false; err.textContent = '';
  });
  forgotForm.addEventListener('submit', function (e) {
    e.preventDefault();
    fMsg.className = 'auth__err'; fMsg.textContent = '';
    if (!fEmail.value.trim()) { fMsg.textContent = '請輸入管理員信箱'; return; }
    if (fPw.value !== fPw2.value) { fMsg.textContent = '兩次新密碼不一致'; return; }
    var r = A.resetAdminPassword(fEmail.value, fPw.value);
    if (!r.ok) { fMsg.textContent = r.error; return; }
    fMsg.className = 'auth__ok'; fMsg.textContent = '密碼已重設，請用新密碼登入';
    email.value = fEmail.value; pw.value = '';
    setTimeout(function () { forgotForm.hidden = true; loginView.hidden = false; pw.focus(); }, 1200);
  });
})();
