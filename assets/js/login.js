/* =========================================================
   會員登入頁 login.html
   ========================================================= */
(function () {
  'use strict';
  var A = window.GGAuth;
  if (!A) return;
  var $ = function (s) { return document.querySelector(s); };

  /* 已登入 → 直接進會員中心 */
  if (A.isLoggedIn()) { location.replace('member.html'); return; }

  var email = $('#email'), pw = $('#password'), err = $('#loginErr');

  /* 示範帳號提示：點擊自動填入 */
  var list = A.demoList();
  $('#demoList').innerHTML = list.map(function (a, i) {
    return '<button class="auth__demo-item" type="button" data-i="' + i + '">' +
             '<span class="auth__demo-label">' + a.label + '</span>' +
             '<span class="auth__demo-cred">' + a.email + '　/　' + a.pw + '</span>' +
           '</button>';
  }).join('');
  $('#demoList').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-i]');
    if (!btn) return;
    var a = list[parseInt(btn.getAttribute('data-i'), 10)];
    email.value = a.email; pw.value = a.pw;
    err.textContent = '';
    pw.focus();
  });

  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    err.textContent = '';
    if (!email.value.trim() || !pw.value) {
      err.textContent = '請輸入電子信箱與密碼';
      return;
    }
    var res = A.login(email.value, pw.value);
    if (res.ok) {
      if (window.ggToast) window.ggToast('登入成功');
      location.href = 'member.html';
    } else {
      err.textContent = res.error || '登入失敗';
      pw.select();
    }
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
    if (!fEmail.value.trim()) { fMsg.textContent = '請輸入電子信箱'; return; }
    if (fPw.value !== fPw2.value) { fMsg.textContent = '兩次新密碼不一致'; return; }
    var r = A.resetPassword(fEmail.value, fPw.value);
    if (!r.ok) { fMsg.textContent = r.error; return; }
    fMsg.className = 'auth__ok'; fMsg.textContent = '密碼已重設，請用新密碼登入';
    email.value = fEmail.value; pw.value = '';
    setTimeout(function () { forgotForm.hidden = true; loginView.hidden = false; pw.focus(); }, 1200);
  });
})();
