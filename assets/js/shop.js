/* =========================================================
   全部商品頁 shop.html
   由 GG.catalog() 動態渲染，支援分類篩選、加入購物車、收藏。
   ========================================================= */
(function () {
  'use strict';
  var GG = window.GG;
  if (!GG) return;
  var $ = function (s) { return document.querySelector(s); };
  var esc = GG.esc || function (s) { return String(s == null ? '' : s); };
  var FAV_KEY = 'gg.favourites';
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.4S3.8 15.3 3.8 9.6A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 8.2 2c0 5.7-8.2 10.8-8.2 10.8z"/></svg>';

  function readFavs() {
    try { var f = JSON.parse(localStorage.getItem(FAV_KEY)); return Array.isArray(f) ? f : []; }
    catch (e) { return []; }
  }
  function writeFavs(f) { try { localStorage.setItem(FAV_KEY, JSON.stringify(f)); } catch (e) {} }

  var favourites = readFavs();
  var grid = $('#shopGrid'), emptyMsg = $('#shopEmpty');
  var ALL = GG.catalog();
  var current = 'all';

  function soldLabel(item) {
    var stock = GG.stockOf ? GG.stockOf(item) : Infinity;
    if (stock <= 0) return '已售完';
    return '已售出 ' + (item.sold || 0);
  }

  function cardMarkup(item) {
    var faved = favourites.indexOf(item.id) !== -1;
    var name = esc(item.name), alt = esc(item.alt), img = esc(item.img);
    var stock = GG.stockOf ? GG.stockOf(item) : Infinity;
    var out = stock <= 0;
    return [
      '<li class="card reveal" data-id="' + esc(item.id) + '">',
        '<a class="card__media" href="product.html?id=' + encodeURIComponent(item.id) + '" aria-label="查看 ' + name + '">',
          '<img src="assets/img/' + img + '.jpg" alt="' + alt + '" width="900" height="900" loading="lazy" decoding="async">',
          (out ? '' : '<span class="card__add" data-add>加入購物車</span>'),
        '</a>',
        '<div class="card__row">',
          '<div>',
            '<h3 class="card__name">' + name + '</h3>',
            '<p class="card__price"><span>$</span>' + item.price + '</p>',
          '</div>',
          '<button class="card__fav" type="button" data-fav',
            ' aria-pressed="' + faved + '"',
            ' aria-label="收藏 ' + name + '">' + HEART + '</button>',
        '</div>',
        '<span class="card__sold">' + soldLabel(item) + '</span>',
      '</li>'
    ].join('');
  }

  function render() {
    var items = current === 'all' ? ALL : ALL.filter(function (p) { return p.cat === current; });
    grid.innerHTML = items.map(cardMarkup).join('');
    if (emptyMsg) emptyMsg.hidden = items.length !== 0;
    /* 揭露動畫：本頁無 IntersectionObserver，直接顯示 */
    var cards = grid.querySelectorAll('.reveal');
    for (var i = 0; i < cards.length; i++) cards[i].classList.add('is-in');
  }

  /* 分類篩選 */
  var filter = $('#shopFilter');
  if (filter) {
    filter.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-cat]');
      if (!chip) return;
      current = chip.getAttribute('data-cat');
      var chips = filter.querySelectorAll('[data-cat]');
      for (var i = 0; i < chips.length; i++) {
        var on = chips[i] === chip;
        chips[i].classList.toggle('is-on', on);
        chips[i].setAttribute('aria-selected', String(on));
      }
      render();
    });
  }

  /* 收藏 / 加入購物車 */
  grid.addEventListener('click', function (e) {
    var favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      var fcard = favBtn.closest('.card');
      var fid = fcard && fcard.dataset.id;
      if (!fid) return;
      var idx = favourites.indexOf(fid);
      var next = idx === -1;
      if (next) favourites.push(fid); else favourites.splice(idx, 1);
      writeFavs(favourites);
      favBtn.setAttribute('aria-pressed', String(next));
      if (window.ggToast) window.ggToast(next ? '已加入收藏' : '已從收藏移除');
      return;
    }
    var addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      e.preventDefault();
      var card = addBtn.closest('.card');
      var id = card && card.dataset.id;
      if (!id) return;
      var res = GG.addItem(id, 1);
      var p = GG.find(id);
      if (!res || res.added <= 0) {
        if (window.ggToast) window.ggToast('庫存不足，無法加入');
      } else if (res.capped) {
        if (window.ggToast) window.ggToast('庫存僅剩 ' + res.stock + ' 件');
      } else if (window.ggToast) {
        window.ggToast('已加入購物車：' + (p ? p.name : '商品'));
      }
    }
  });

  render();
})();
