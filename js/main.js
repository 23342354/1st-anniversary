/* =========================================================
   1ST ANNIVERSARY — 동작 스크립트
   (글자는 content.js 에서 바꾸세요)
   ========================================================= */
(function () {
  'use strict';

  var STAGE_W = 1600;
  var STAGE_H = 900;

  var stage = document.getElementById('stage');

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
    document.body.classList.remove('is-playing');
    void stage.offsetWidth;                        // 강제 리플로우 → 처음부터 다시
    document.body.classList.add('is-playing');
  }

  /* ---------- 실행 ---------- */
  fillText();
  swapImages();
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);

  var replay = document.getElementById('replay');
  if (replay) replay.addEventListener('click', play);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { requestAnimationFrame(play); });
    setTimeout(function () {                      // 폰트가 늦으면 그냥 시작
      if (!document.body.classList.contains('is-playing')) play();
    }, 1200);
  } else {
    requestAnimationFrame(play);
  }
})();
