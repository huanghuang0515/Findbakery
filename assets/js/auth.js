/* =========================================================
   Gothel's Garden — 會員登入狀態（純前端 demo）
   兩組帳號：C 端（一般會員）與 B 端（企業會員）。
   登入狀態存 localStorage（無後端，僅供畫面示意）。
   ========================================================= */
window.GGAuth = (function () {
  'use strict';
  var KEY = 'gg.member';

  /* ---- Demo 帳號與會員資料 ----
     type: 'C' 一般消費會員 / 'B' 企業批發客戶 */
  var ACCOUNTS = {
    'member@gg.com': {
      pw: 'member123', type: 'C',
      name: '陳美好', title: '金卡會員',
      email: 'member@gg.com', phone: '0922-111-222',
      address: '台中市西區美村路一段 100 號',
      joined: '2024.03',
      spendTotal: 12480, orderCount: 18, nextTier: '白金卡會員', nextTierGap: 2520,
      ranking: [
        { name: '北海道生吐司', qty: 12, img: 'p-07' },
        { name: '原味貝果',     qty: 9,  img: 'p-03' },
        { name: '綜合甜甜圈',   qty: 6,  img: 'p-08' },
        { name: '湯種厚片吐司', qty: 5,  img: 'p-09' },
        { name: '黑芝麻餐包',   qty: 4,  img: 'p-06' }
      ],
      history: [
        { name: '北海道生吐司', img: 'p-07', last: '2026.09.10' },
        { name: '原味貝果',     img: 'p-03', last: '2026.09.03' },
        { name: '綜合甜甜圈',   img: 'p-08', last: '2026.08.28' },
        { name: '每週麵包箱',   img: 'p-04', last: '2026.08.20' }
      ],
      orders: [
        { no: 'GG-20260910-2043', date: '2026.09.10', items: '北海道生吐司 等 3 項', total: 930, status: '已送達' },
        { no: 'GG-20260903-1876', date: '2026.09.03', items: '原味貝果 等 2 項',     total: 410, status: '已送達' },
        { no: 'GG-20260820-1502', date: '2026.08.20', items: '每週麵包箱',           total: 230, status: '已完成' }
      ]
    },
    'business@gg.com': {
      pw: 'business123', type: 'B',
      name: '好食餐飲有限公司', title: '企業批發客戶',
      contact: '林采潔　採購經理', taxId: '12345678',
      email: 'business@gg.com', phone: '04-2222-3333',
      address: '台中市南屯區大墩路 500 號 8 樓',
      joined: '2023.06',
      spendTotal: 284600, orderCount: 96, terms: '月結 30 天',
      history: [
        { name: '北海道生吐司', img: 'p-07', last: '2026.09.15' },
        { name: '裸麥雜糧麵包', img: 'p-10', last: '2026.09.15' },
        { name: '原味貝果',     img: 'p-03', last: '2026.09.08' },
        { name: '湯種厚片吐司', img: 'p-09', last: '2026.09.01' }
      ],
      orders: [
        { no: 'GG-B-20260915-0088', date: '2026.09.15', items: '北海道生吐司 ×40、裸麥雜糧 ×30', total: 16250, status: '配送中' },
        { no: 'GG-B-20260908-0081', date: '2026.09.08', items: '原味貝果 ×120',                 total: 7800,  status: '已送達' },
        { no: 'GG-B-20260901-0074', date: '2026.09.01', items: '湯種厚片吐司 ×50',              total: 6000,  status: '已結算' }
      ]
    }
  };

  /* 供登入頁提示用的 demo 帳號清單 */
  function demoList() {
    return [
      { label: 'C 端 一般會員', email: 'member@gg.com',   pw: 'member123' },
      { label: 'B 端 企業會員', email: 'business@gg.com', pw: 'business123' }
    ];
  }

  function login(email, pw) {
    email = String(email || '').trim().toLowerCase();
    var acc = ACCOUNTS[email];
    if (!acc) return { ok: false, error: '查無此帳號' };
    if (acc.pw !== pw) return { ok: false, error: '密碼錯誤' };
    var session = { type: acc.type, email: email };
    try { localStorage.setItem(KEY, JSON.stringify(session)); } catch (e) {}
    return { ok: true, type: acc.type };
  }

  function logout() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  /* 目前登入的完整會員資料（含假資料）；未登入回 null */
  function current() {
    var s;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s || !s.email) return null;
    var acc = ACCOUNTS[s.email];
    if (!acc) return null;
    var data = {};
    for (var k in acc) if (acc.hasOwnProperty(k) && k !== 'pw') data[k] = acc[k];
    return data;
  }

  function isLoggedIn() { return !!current(); }

  return {
    demoList: demoList,
    login: login,
    logout: logout,
    current: current,
    isLoggedIn: isLoggedIn
  };
})();
