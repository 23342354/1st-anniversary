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

  /* ---------- 4. 타자기 효과 ----------
     각 글 덩어리는 짝이 되는 그림이 나타나는 순간 찍히기 시작하고,
     다 찍힌 뒤에는 그대로 남습니다. (그림이 사라져도 글은 유지)
     시작 시각은 css 가 계산한 그림의 등장 시각을 그대로 읽어옵니다. */
  var JAMO_MS  = 20;       /* 자음·모음 한 조각이 찍히는 간격(ms) — 작을수록 빠름 */
  var CHAR_MS  = 38;       /* 글자 하나가 완성되고 다음 글자로 넘어가는 간격(ms) */
  var LINE_GAP = 150;      /* 줄과 줄 사이 쉬는 시간(ms) */
  var typeTimers = [];

  /* ----- 한글을 실제 입력기처럼 조립하기 -----
     "우" → ㅇ → 우 / "한" → ㅎ → 하 → 한 / "값" → ㄱ → 가 → 갑 → 값 */
  var CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ',
             'ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var JUNG_PARTS = {9:8,10:8,11:8,14:13,15:13,16:13,19:18};          /* 겹모음 → 먼저 찍히는 쪽 */
  var JONG_PARTS = {3:1,5:4,6:4,9:8,10:8,11:8,12:8,13:8,14:8,15:8,18:17}; /* 겹받침 → 먼저 찍히는 쪽 */

  function syllableSteps(ch) {
    var code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return [ch];                       /* 한글이 아니면 한 번에 */
    var cho  = Math.floor(code / 588),
        jung = Math.floor((code % 588) / 28),
        jong = code % 28,
        base = 0xAC00 + cho * 588,
        steps = [CHO[cho]];                                          /* 첫 자음만 */
    if (JUNG_PARTS[jung] !== undefined)
      steps.push(String.fromCharCode(base + JUNG_PARTS[jung] * 28));
    steps.push(String.fromCharCode(base + jung * 28));                /* 모음까지 */
    if (jong) {
      if (JONG_PARTS[jong] !== undefined)
        steps.push(String.fromCharCode(base + jung * 28 + JONG_PARTS[jong]));
      steps.push(ch);                                                 /* 받침까지 */
    }
    return steps;
  }

  /* css 에 적힌 시간값 읽기 (".6s" → 0.6) */
  function cssTime(name) {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
  }

  /* 한 줄 전체를 "화면에 보일 문자열" 단계 목록으로 */
  function lineSteps(txt) {
    var out = [], done = '';
    for (var i = 0; i < txt.length; i++) {
      var st = syllableSteps(txt[i]);
      for (var k = 0; k < st.length; k++)
        out.push({ text: done + st[k], last: k === st.length - 1 });
      done += txt[i];
    }
    return out;
  }

  function delayOf(sel) {
    var el = document.querySelector(sel);
    return el ? (parseFloat(getComputedStyle(el).animationDelay) || 0) : 0;
  }

  function buildLines(box) {
    var src = box.getAttribute('data-src');
    if (src === null) { src = box.textContent; box.setAttribute('data-src', src); }
    box.innerHTML = '';
    return src.split('\n').map(function (txt) {
      var p = document.createElement('p');
      box.appendChild(p);
      /* 빈 줄은 글자 없이 사이만 벌리는 칸 */
      if (txt.trim() === '') {
        p.className = 'typed__line typed__line--space';
        return { p: p, span: null, full: '' };
      }
      /* 한글이 없는 줄(영문·숫자만)은 작은 고정폭 글씨로 */
      p.className = 'typed__line' + (/[가-힣]/.test(txt) ? '' : ' typed__line--mono');
      var s = document.createElement('span');
      p.appendChild(s);
      return { p: p, span: s, full: txt };
    });
  }

  function typeBlock(box, startSec, onDone) {
    if (!box) return;
    var lines = buildLines(box);
    var i = 0;
    function nextLine() {
      if (i >= lines.length) { if (onDone) onDone(); return; }
      var L = lines[i++];
      L.p.style.visibility = 'visible';
      if (!L.span) { typeTimers.push(setTimeout(nextLine, LINE_GAP)); return; }   /* 빈 줄은 건너뜀 */
      var steps = lineSteps(L.full), k = 0;
      (function step() {
        if (k >= steps.length) {                       /* 줄 끝 → 커서 떼고 다음 줄 */
          L.span.textContent = L.full;
          typeTimers.push(setTimeout(nextLine, LINE_GAP));
          return;
        }
        var s = steps[k++];
        L.span.textContent = s.text + '|';
        typeTimers.push(setTimeout(step, s.last ? CHAR_MS : JAMO_MS));
      })();
    }
    typeTimers.push(setTimeout(nextLine, startSec * 1000));
  }

  function showAtOnce(box) {
    if (!box) return;
    buildLines(box).forEach(function (L) {
      L.p.style.visibility = 'visible';
      if (L.span) L.span.textContent = L.full;
    });
  }

  /* 왼쪽 글이 다 찍힌 순간 — 여기서부터 가운데 그림이 등장합니다 */
  function typingDone() {
    document.body.classList.add('typing-done', 'left-out');   /* 글이 끝나야 왼쪽 전신이 나감 */
    armEnter();
  }

  function startTyping() {
    typeTimers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
    typeTimers = [];
    var right = document.getElementById('typeRight');
    var left  = document.getElementById('typeLeft');
    if (reduced) { showAtOnce(right); showAtOnce(left); typingDone(); return; }
    typeBlock(right, delayOf('.fig--head'));
    typeBlock(left,  delayOf('.fig--left'), typingDone);   /* 다 찍히면 가운데 그림 차례 */
  }

  /* ---------- 5. 애니메이션 재생 ---------- */
  function play() {
    document.body.classList.remove('is-playing', 'is-outro', 'is-leaving', 'can-enter', 'typing-done', 'left-out');
    void stage.offsetWidth;                        // 강제 리플로우 → 처음부터 다시
    document.body.classList.add('is-playing');
    startTyping();                                 // 다 찍히면 typingDone() 이 이어받습니다
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

  /* ---------- 손글씨를 획 순서대로 그리기 ----------
     각 선의 실제 길이를 재서, 긴 획은 오래 짧은 획은 짧게 그립니다.
     그래야 속도가 일정해 보여 사람이 쓰는 것처럼 읽힙니다. */
  function drawScript() {
    var svg = document.querySelector('.p2script__svg');
    if (!svg) return;
    var SPEED = 6200;   /* 초당 그려지는 길이 — 키우면 빨라집니다 */
    var LIFT  = 0.045;  /* 획과 획 사이 펜을 떼는 시간(초) */
    var START = 1.55;   /* 쓰기 시작하는 시각(초) */
    var at = START;
    /* .p2script__pen 안의 선만 그립니다 (clipPath 의 글자 윤곽선은 제외) */
    [].forEach.call(svg.querySelectorAll('.p2script__pen path'), function (p) {
      var len = p.getTotalLength();
      var dur = len / SPEED;
      p.style.strokeDasharray  = len + ' ' + len;
      p.style.strokeDashoffset = len;
      if (reduced) { p.style.strokeDashoffset = 0; return; }
      p.style.animation = 'drawStroke ' + dur.toFixed(2) + 's linear ' + at.toFixed(2) + 's forwards';
      at += dur + LIFT;
    });
    return at;
  }

  /* 두 번째 페이지는 캔버스 크기 맞추고 글자 크기·손글씨만 손보면 끝 */
  if (document.body.classList.contains('page-two')) {
    drawScript();
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

  /* ---------- 6. 가운데 그림 클릭 → 1·2번 복귀 → 다음 페이지 ---------- */
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
  /* 가운데 그림이 다 나타난 뒤에야 누를 수 있게 합니다.
     타이핑이 끝난 시점부터 재므로 글 길이와 무관하게 정확합니다. */
  function armEnter() {
    setTimeout(function () {
      document.body.classList.add('can-enter');
    }, (cssTime('--afterTyping') + cssTime('--inDur')) * 1000);
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
