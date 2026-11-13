/* =========================================================
   1ST ANNIVERSARY — 동작 스크립트
   (글자는 content.js 에서 바꾸세요)
   ========================================================= */
(function () {
  'use strict';

  var STAGE_W = 1600;
  var STAGE_H = 900;

  var stage = document.getElementById('stage');

  /* 다음 페이지로 넘어갈 때 열 파일 이름 (page2.html 을 바꾸고 싶으면 여기) */
  var NEXT_PAGE = 'page2.html';
  /* 1·2번 그림이 다시 보이는 시간(ms). 2000~3000 사이가 적당합니다. */
  var OUTRO_HOLD = 2200;
  /* 커튼이 닫히는 시간(ms) — css 의 curtainIn 과 맞춰 두세요 */
  var CURTAIN = 550;

  /* ---------- 1. content.js 의 글자를 화면에 꽂기 ---------- */
  function fillText() {
    if (typeof CONTENT === 'undefined') return;
    document.querySelectorAll('[data-txt]').forEach(function (el) {
      var key = el.getAttribute('data-txt');
      if (CONTENT[key] != null) el.textContent = CONTENT[key];
    });
    if (CONTENT.pageTitle) document.title = CONTENT.pageTitle;

    var m = document.getElementById('marquee');
    if (m && CONTENT.marquee) {
      var unit = CONTENT.marquee;
      var once = '';
      while (once.length < 160) once += unit;      // 한 바퀴 분량
      m.textContent = once + once;                  // 끊김 없이 이어지도록 2배
    }
  }

  /* ---------- 2. images/ 폴더에 그림이 있으면 선화 대신 그걸 사용 ---------- */
  function swapImages() {
    document.querySelectorAll('.fig__img').forEach(function (img) {
      var src = img.getAttribute('data-img');
      if (!src) return;
      img.addEventListener('load', function () {
        if (img.naturalWidth > 1) img.closest('.fig').classList.add('has-img');
      });
      img.addEventListener('error', function () { img.remove(); });
      img.src = src;
    });
  }

  /* ---------- 3. 창 크기에 맞추기 ----------
     가로는 항상 꽉 채우고, 세로는 창 높이만큼 캔버스가 늘어납니다.
     그래야 위/아래 띠가 화면 가장자리에 딱 붙습니다.
     너무 납작하거나 길쭉한 창에서는 아래 두 값 안으로 제한합니다. */
  var MIN_H = 680;
  var MAX_H = 1240;

  function fit() {
    var w = window.innerWidth  || document.documentElement.clientWidth  || STAGE_W;
    var h = window.innerHeight || document.documentElement.clientHeight || STAGE_H;

    var scale   = w / STAGE_W;
    var designH = h / scale;

    if (designH < MIN_H) {          // 아주 납작한 창 → 높이를 채우고 좌우를 조금 자름
      designH = MIN_H;
      scale   = h / MIN_H;
    } else if (designH > MAX_H) {   // 아주 길쭉한 창(세로 화면) → 가로 기준 유지
      designH = MAX_H;
    }
    if (!isFinite(scale) || scale <= 0) scale = 1;

    stage.style.height = designH + 'px';
    stage.style.setProperty('--scale', scale);
    // 제한에 걸린 경우에만 남는 여백을 좌우·위아래로 똑같이 나눔
    stage.style.setProperty('--ox', ((w - STAGE_W * scale) / 2) + 'px');
    stage.style.setProperty('--oy', ((h - designH * scale) / 2) + 'px');
  }

  /* ---------- 4. 애니메이션 재생 ---------- */
  function play() {
    document.body.classList.remove('is-playing', 'is-outro', 'is-leaving', 'can-enter');
    void stage.offsetWidth;                        // 강제 리플로우 → 처음부터 다시
    document.body.classList.add('is-playing');
    armEnter();
  }

  /* ---------- 실행 ---------- */
  fillText();
  if (!stage) return;

  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);

  /* ---------- 글자가 칸을 넘치면 자동으로 줄이기 ----------
     제목·손글씨처럼 장식 서체를 쓰는 글자는 서체마다 폭이 크게 달라서,
     크기를 고정해두면 서체를 바꿨을 때 그림까지 밀고 들어갑니다.
     data-fit 에 적은 폭(캔버스 기준 px)을 넘으면 맞을 때까지 줄입니다. */
  function fitWidth() {
    document.querySelectorAll('[data-fit]').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-fit'));
      if (!max) return;
      el.style.fontSize = '';                                   // css 기본 크기로 되돌리고 시작
      var size = parseFloat(getComputedStyle(el).fontSize);
      var guard = 0;
      while (el.offsetWidth > max && size > 24 && guard++ < 90) {  // offsetWidth 는 화면 배율과 무관
        size -= 2;
        el.style.fontSize = size + 'px';
      }
    });
  }

  /* 두 번째 페이지는 캔버스 크기 맞추고 글자 크기만 손보면 끝 */
  if (document.body.classList.contains('page-two')) {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitWidth);
      setTimeout(fitWidth, 1500);        // 서체가 늦으면 한 번 더
    } else {
      fitWidth();
    }
    return;
  }

  swapImages();

  var replay = document.getElementById('replay');
  if (replay) replay.addEventListener('click', play);

  /* ---------- 5. 가운데 그림 클릭 → 1·2번 복귀 → 다음 페이지 ---------- */
  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function enter() {
    if (document.body.classList.contains('is-outro')) return;   // 두 번 눌러도 한 번만
    document.body.classList.remove('can-enter');
    document.body.classList.add('is-outro');

    var hold = reduced ? 500 : OUTRO_HOLD;
    setTimeout(function () { document.body.classList.add('is-leaving'); }, hold);
    setTimeout(function () { window.location.href = NEXT_PAGE; }, hold + CURTAIN + 60);
  }

  /* 가운데 그림이 완전히 나타난 뒤에야 누를 수 있게 합니다.
     등장 시각은 css 에서 계산되므로 실제 값을 읽어옵니다. */
  function armEnter() {
    var el = document.getElementById('figCenter');
    if (!el) return;
    var cs    = getComputedStyle(el);
    var delay = parseFloat(cs.animationDelay)    || 0;
    var dur   = parseFloat(cs.animationDuration) || 0;
    setTimeout(function () {
      document.body.classList.add('can-enter');
    }, (delay + dur) * 1000);
  }

  var figCenter = document.getElementById('figCenter');
  var enterBtn  = document.getElementById('enter');
  var subtitle = document.querySelector('.subtitle');
  if (figCenter) figCenter.addEventListener('click', enter);
  if (subtitle)  subtitle.addEventListener('click', enter);
  if (enterBtn)  enterBtn.addEventListener('click', enter);
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') &&
        document.body.classList.contains('can-enter')) { e.preventDefault(); enter(); }
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { requestAnimationFrame(play); });
    setTimeout(function () {                      // 폰트가 늦으면 그냥 시작
      if (!document.body.classList.contains('is-playing')) play();
    }, 1200);
  } else {
    requestAnimationFrame(play);
  }
})();
