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

  /* 편지가 다 드러났다는 표시. 다음 장 버튼이 이걸 보고 떠오릅니다. */
  function letterDone() { document.body.classList.add('letter-done'); }

  /* 일러스트 등장 — 편지의 한 문장이 읽히는 순간에 부릅니다 */
  var artShown = false;
  function revealArt() {
    if (artShown) return;
    artShown = true;
    var a = document.querySelector('.p2art');
    if (a) a.classList.add('art-in');
  }

  /* ---------- 가운데 글 : 기호 → 본문 ----------
     처음엔 글자가 모두 기호로 보이다가, 맨 윗줄부터 한 줄씩 차례로
     진짜 글자가 툭 떨어지며 드러납니다. 위에서 아래로 벗겨지듯이.

     한글 자리에는 '전각' 기호(！＠＃…)를, 쉼표·마침표 자리에는 좁은
     기호를 넣습니다. 폭이 같은 기호라야 글이 출렁이지 않습니다. */
  function scrambleLetter() {
    var box = document.querySelector('.p2letter');
    if (!box ||
        (window.matchMedia &&
         window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      revealArt(); letterDone(); return;
    }

    var SYM     = '!@#$%^&*<>/\\|=+~?;:'.split('');
    var START   = 2600;   /* 시작하는 시각(ms) */
    var LINE_MS = 4600;    /* 한 줄에서 다음 줄로 넘어가는 간격(ms) — 키우면 느려집니다 */
    var SWEEP   = 4500;    /* 한 줄이 왼쪽에서 오른쪽으로 벗겨지는 데 걸리는 시간(ms) */
    var DOT     = 800;    /* 마침표를 지난 뒤 쉬어 가는 시간(ms) */
    var AHEAD   = 3;      /* 아직 안 드러난 줄 중 지지직거릴 줄 수 */
    var FLICKER = 130;    /* 기호가 바뀌는 간격(ms) */

    function pick() { return SYM[(Math.random() * SYM.length) | 0]; }

    var original = box.innerHTML;
    var cells = [];

    /* 글자 하나하나를 span 으로 감쌉니다. 띄어쓰기는 그대로 둡니다. */
    (function wrap(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.nodeValue.split('').forEach(function (ch) {
            if (!ch.trim()) { frag.appendChild(document.createTextNode(ch)); return; }
            var sp = document.createElement('span');
            sp.className = 'sc';
            sp.textContent = ch;               /* 진짜 글자는 처음부터 제자리에 */
            sp.setAttribute('data-s', pick()); /* 그 위에 덮을 기호 */
            sp.style.cssText =                 /* 가루처럼 제각각 흩날리도록 */
              '--dx:' + ((Math.random() * 120 - 60) | 0) + 'px;' +
              '--dy:' + ((60 + Math.random() * 130) | 0) + 'px;' +
              '--rot:' + ((Math.random() * 280 - 140) | 0) + 'deg';
            frag.appendChild(sp);
            cells.push(sp);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          wrap(n);
        }
      });
    })(box);

    if (!cells.length) { revealArt(); letterDone(); return; }

    setTimeout(function () {
      /* 글자가 실제로 몇 번째 줄에 놓였는지 화면에서 직접 읽어 묶습니다.
         (기호와 본문의 폭이 같으므로 줄바꿈 자리는 끝까지 그대로입니다) */
      var lines = [], last = null;
      cells.forEach(function (sp) {
        var top = Math.round(sp.getBoundingClientRect().top);
        if (last === null || Math.abs(top - last) > 3) { lines.push([]); last = top; }
        lines[lines.length - 1].push(sp);
      });

      /* 일러스트는 신호 문장(.p2cue)이 끝나는 순간에 '딱' 맺힙니다.
         한 줄에 걸리는 시간이 정해져 있어서 그 문장이 벗겨질 시각을
         미리 계산할 수 있습니다. 거기서 등장에 걸리는 시간(--rise)만큼
         앞당겨 시작하면, 끝나는 지점이 문장의 끝과 맞아떨어집니다. */
      var cue      = box.querySelector('.p2cue');
      var cueCells = cue ? [].slice.call(cue.querySelectorAll('.sc')) : [];
      var cueLast  = cueCells[cueCells.length - 1];

      function lineTimes(line) {           /* 그 줄 안에서 글자마다 벗겨지는 시각 */
        var step = SWEEP / Math.max(1, line.length), at = 0, offs = [];
        line.forEach(function (sp, k) {
          offs.push(at);
          at += step;
          if (sp.textContent === '.' && k < line.length - 1) at += DOT;
        });
        return { offs: offs, total: at };
      }

      function riseMs() {                  /* 등장에 걸리는 시간은 css 에서 읽어 옵니다 */
        var art = document.querySelector('.p2art');
        if (!art) return 6500;
        var v = getComputedStyle(art).getPropertyValue('--rise').trim();
        var n = parseFloat(v);
        if (!isFinite(n)) return 6500;
        return /ms\s*$/.test(v) ? n : n * 1000;
      }

      var INK   = 430;                     /* 마지막 글자가 완전히 진해지기까지 (0.09s 지연 + 0.34s) */
      var GAP   = LINE_MS - SWEEP;
      var RISE  = riseMs();
      var info  = lines.map(lineTimes);    /* 줄마다 걸리는 시간 */
      var cueLine = -1, cueOff = 0;
      lines.forEach(function (line, idx) {
        var k = cueLast ? line.indexOf(cueLast) : -1;
        if (k !== -1) { cueLine = idx; cueOff = info[idx].offs[k]; }
      });

      /* idx 줄이 시작하는 순간부터 신호 문장이 다 맺히기까지 남은 시간.
         처음부터 한 번에 계산하면 setTimeout 이 조금씩 밀리는 게 3분 넘게
         쌓여 몇 초씩 어긋납니다. 그래서 매 줄마다 '지금부터' 다시 셉니다. */
      function remainFrom(idx) {
        if (cueLine < idx) return null;
        var t = 0;
        for (var k = idx; k < cueLine; k++) t += info[k].total + GAP;
        return t + cueOff + INK;
      }
      var artQueued = (cueLine < 0);
      if (artQueued) revealArt();          /* 신호 문장을 못 찾으면 그냥 띄웁니다 */

      var i = 0;
      /* 아직 안 벗겨진 글자만 계속 지지직거립니다.
         (마침표에서 쉬는 동안에도 남은 글자들은 계속 떨립니다) */
      var flick = setInterval(function () {
        for (var k = Math.max(0, i - 1); k < Math.min(lines.length, i + AHEAD); k++) {
          lines[k].forEach(function (sp) {
            if (sp.className === 'sc') sp.setAttribute('data-s', pick());
          });
        }
      }, FLICKER);

      function finish() {
        clearInterval(flick);
        setTimeout(function () {
          box.innerHTML = original;            /* span 을 걷어내고 원래 글로 */
          revealArt();                         /* 혹시 아직이면 여기서라도 */
          letterDone();                        /* 다음 장 버튼이 떠오릅니다 */
        }, 1600);
      }

      /* 한 줄씩, 그 줄 안에서는 왼쪽부터 한 글자씩 벗겨냅니다.
         마침표를 지나면 한 박자 쉬었다가 이어서 흩날립니다.
         쉬는 만큼 줄이 길어지므로 다음 줄은 고정 간격이 아니라
         '이 줄이 끝난 뒤'에 시작합니다. */
      function peelLine() {
        if (i >= lines.length) { finish(); return; }

        var line = lines[i], step = SWEEP / Math.max(1, line.length), at = 0;

        /* 신호 문장이 'RISE' 뒤에 끝나는 줄에 닿으면 지금 일러스트를 띄웁니다.
           그래야 등장이 끝나는 순간과 문장이 끝나는 순간이 맞아떨어집니다. */
        if (!artQueued) {
          var remain = remainFrom(i);
          if (remain !== null && remain - RISE <= info[i].total + GAP) {
            artQueued = true;
            setTimeout(revealArt, Math.max(0, remain - RISE));
          }
        }

        line.forEach(function (sp, k) {
          setTimeout(function () { sp.className = 'sc sc--in'; }, at);
          at += step;
          if (sp.textContent === '.' && k < line.length - 1) at += DOT;
        });

        i++;
        setTimeout(peelLine, at + (LINE_MS - SWEEP));   /* 줄과 줄 사이 간격은 그대로 */
      }
      peelLine();
    }, START);
  }

  /* ---------- 2페이지 자리 잡기 ----------
     돌린 세로 이름은 '제자리 폭'이 0 이라, 글자 크기를 재서 빈 상자에 넣어 줍니다.
     (글을 바꾸면 길이가 달라지므로 숫자로 못 박지 않고 그때그때 잽니다) */
  function layoutNames() {
    var box = document.querySelector('.p2side__namesbox');
    var nm  = document.querySelector('.p2side__names');
    if (!box || !nm) return;
    box.style.width  = nm.offsetHeight + 'px';   // 90도 돌리면 높이가 가로폭이 됩니다
    box.style.height = nm.offsetWidth  + 'px';   // 그리고 폭이 세로 길이가 됩니다
  }

  /* 일러스트를 'ANNIVERSARY' 오른쪽에 남은 여백의 한가운데에 둡니다.
     제목 길이도 창 크기도 변하므로 매번 다시 잽니다. */
  function placeArt() {
    var art   = document.querySelector('.p2art');
    var title = document.querySelector('.p2title');
    if (!art || !title || !stage) return;
    var artW = art.offsetWidth;
    if (!artW) return;                            // 그림이 아직 안 불러와졌으면 나중에
    var sr    = stage.getBoundingClientRect();
    var scale = sr.width / STAGE_W || 1;
    var titleRight = (title.getBoundingClientRect().right - sr.left) / scale;
    var EDGE = 16;                                // 오른쪽 끝에 남길 최소 여백
    var left = titleRight + (STAGE_W - titleRight - artW) / 2;
    if (left + artW > STAGE_W - EDGE) left = STAGE_W - EDGE - artW;   // 화면 밖으로 안 나가게
    art.style.left = left + 'px';
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

    function relayout() { fitWidth(); layoutNames(); placeArt(); }
    relayout();
    scrambleLetter();
    window.addEventListener('resize', relayout);

    var art = document.querySelector('.p2art');
    if (art) art.addEventListener('load', placeArt);   // 그림을 다 받으면 다시

    /* 글꼴이 늦게 도착하면 글자 길이가 바뀝니다.
       그때마다 세로 이름 자리를 자동으로 다시 잡습니다. */
    var nm = document.querySelector('.p2side__names');
    if (nm && window.ResizeObserver) new ResizeObserver(layoutNames).observe(nm);

    /* 다음 장으로: 1페이지와 똑같이 커튼을 닫고 넘어갑니다 */
    var nextBtn = document.getElementById('p2next');
    if (nextBtn) {
      nextBtn.addEventListener('click', function (e) {
        e.preventDefault();
        document.body.classList.add('is-leaving');
        setTimeout(function () {
          window.location.href = nextBtn.getAttribute('href');
        }, CURTAIN + 60);
      });
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(relayout);
      setTimeout(relayout, 1500);        // 서체가 늦으면 한 번 더
    }
    return;
  }

  /* ---------- 네 번째 페이지 (후기) ----------
     글이 칸 안에서 스크롤되므로, 올라오는 문단을 하나씩 띄웁니다. */
  if (document.body.classList.contains('page-four')) {
    fitWidth();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWidth);
    window.addEventListener('resize', fitWidth);

    var box = document.getElementById('p4');
    var paras = box ? [].slice.call(box.querySelectorAll('p')) : [];
    if (!box || !window.IntersectionObserver ||
        (window.matchMedia &&
         window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      paras.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    /* 어떤 문단이 보이면 그 앞 문단들도 전부 띄웁니다.
       한 번에 아래로 건너뛰면 지나친 문단이 영영 안 보인 채 남거든요. */
    function showUpTo(idx) {
      for (var k = 0; k <= idx; k++) {
        if (!paras[k].classList.contains('is-in')) {
          paras[k].classList.add('is-in');
          io.unobserve(paras[k]);
        }
      }
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) showUpTo(paras.indexOf(e.target));
      });
    }, { root: box, rootMargin: '0px 0px -8% 0px', threshold: .12 });
    paras.forEach(function (el) { io.observe(el); });
    /* 끝까지 내려 더 보일 것이 없을 때도 남김없이 */
    box.addEventListener('scroll', function () {
      if (box.scrollTop + box.clientHeight >= box.scrollHeight - 4) showUpTo(paras.length - 1);
    });
    return;
  }

  /* ---------- 세 번째 페이지 ---------- */
  if (document.body.classList.contains('page-three')) {
    /* 종이 콜라주는 600px 높이를 전제로 짜여 있습니다.
       창이 낮아 자리가 모자라면 덩어리째 줄여서 아래 체크무늬를
       물지 않게 합니다. (아래 띠 30 + 체크무늬 28 + 여유 = 116) */
    function fitPoster() {
      var el = document.querySelector('.p3');
      if (!el || !stage) return;
      var h = parseFloat(stage.style.height) || 900;
      el.style.scale = Math.min(1, (h - 140) / 600);
    }
    function relayout3() { fitWidth(); fitPoster(); }
    relayout3();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout3);
    window.addEventListener('resize', relayout3);
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

  var musicReady = new Promise(function (resolve) {
    var opening = document.getElementById('musicOpening');
    if (!opening) {
      resolve();
      return;
    }

    // 음악 스크립트를 읽지 못해도 첫 장면은 열 수 있습니다.
    var timeout = setTimeout(function () {
      if (!opening.hasAttribute('data-initialized')) {
        opening.remove();
        resolve();
      }
    }, 5000);
    document.addEventListener('musicopeningready', function () {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
  var fontsReady = new Promise(function (resolve) {
    if (document.fonts && document.fonts.ready) {
      var timeout = setTimeout(resolve, 1200);
      document.fonts.ready.then(function () {
        clearTimeout(timeout);
        resolve();
      });
    } else {
      resolve();
    }
  });
  Promise.all([musicReady, fontsReady]).then(function () { requestAnimationFrame(play); });
})();
