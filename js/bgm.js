/* ============================================================
   배경 음악
   ------------------------------------------------------------
   · 자동 재생 + 무한 반복
   · 소리가 나는 자동 재생은 대부분의 브라우저가 막습니다.
     막히면 클릭·터치·키 입력 때 다시 시도합니다.
   · 페이지를 넘어가도 듣던 자리에서 이어집니다.
     (다음 페이지는 새 문서라 음악이 처음부터 다시 시작되므로,
      재생 위치·볼륨·멈춤 여부를 기억해 두었다가 되살립니다)
   ============================================================ */
(function () {
  'use strict';

  var a   = document.getElementById('bgmAudio');
  var box = document.getElementById('bgm');
  if (!a || !box) return;

  var playBtn = document.getElementById('bgmPlay');
  var muteBtn = document.getElementById('bgmMute');
  var bar     = document.getElementById('bgmBar');
  var vol     = document.getElementById('bgmVol');
  var timeEl  = document.getElementById('bgmTime');
  var KEY     = 'wh-bgm';

  /* ---------- 지난 페이지에서 듣던 자리 ---------- */
  var saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) {}

  var pausedByUser = !!saved.paused;

  a.loop   = true;
  a.volume = typeof saved.volume === 'number' ? saved.volume : 0.55;
  a.muted  = !!saved.muted;
  vol.value = Math.round(a.volume * 100);
  box.classList.toggle('is-muted', a.muted);

  function stash() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({
        time: a.currentTime, volume: a.volume, muted: a.muted, paused: pausedByUser
      }));
    } catch (e) {}
  }

  /* ---------- 눈금 그리기 ---------- */
  function mmss(t) {
    if (!isFinite(t) || t < 0) return '0:00';
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function paintTime() { timeEl.textContent = mmss(a.currentTime) + ' / ' + mmss(a.duration); }
  function paintVol()  { vol.style.setProperty('--p', (a.muted ? 0 : a.volume * 100) + '%'); }

  var seeking = false, seekTimer = null;
  function paintBar() {
    if (seeking || !a.duration) return;
    var r = a.currentTime / a.duration;
    bar.value = Math.round(r * 1000);
    bar.style.setProperty('--p', (r * 100) + '%');
  }
  paintVol(); paintTime();

  /* 파일이 이미 받아져 있으면 loadedmetadata 가 스크립트보다 먼저 끝납니다.
     그러면 이벤트는 다시 오지 않으므로, 준비됐는지 직접 확인도 합니다. */
  function restore() {
    if (!a.duration || !isFinite(a.duration)) return;
    if (saved.time > 0 && saved.time < a.duration - 0.3) a.currentTime = saved.time;
    saved.time = 0;                          /* 되살리기는 한 번만 */
    paintTime(); paintBar();
  }
  a.addEventListener('loadedmetadata', restore);
  if (a.readyState >= 1) restore();
  a.addEventListener('timeupdate', function () { paintBar(); paintTime(); });
  a.addEventListener('play',  function () { box.classList.add('is-playing'); });
  a.addEventListener('pause', function () { box.classList.remove('is-playing'); });

  /* ---------- 재생 / 정지 ---------- */
  playBtn.addEventListener('click', function () {
    pausedByUser = !a.paused;
    if (pausedByUser) { a.pause(); } else { a.play().catch(function () {}); }
    stash();
  });

  /* ---------- 음소거 ---------- */
  muteBtn.addEventListener('click', function () {
    a.muted = !a.muted;
    box.classList.toggle('is-muted', a.muted);
    paintVol(); stash();
  });

  /* ---------- 볼륨 ---------- */
  vol.addEventListener('input', function () {
    a.volume = vol.value / 100;
    if (a.volume > 0 && a.muted) { a.muted = false; box.classList.remove('is-muted'); }
    paintVol(); stash();
  });

  /* ---------- 재생 위치 ---------- */
  bar.addEventListener('input', function () {
    seeking = true;
    bar.style.setProperty('--p', (bar.value / 10) + '%');
    if (a.duration) a.currentTime = (bar.value / 1000) * a.duration;
    clearTimeout(seekTimer);                 /* 손을 뗀 걸 놓쳐도 다시 따라가도록 */
    seekTimer = setTimeout(function () { seeking = false; stash(); }, 400);
  });
  bar.addEventListener('change', function () {
    clearTimeout(seekTimer); seeking = false; stash();
  });

  /* ---------- 자동 재생 ---------- */
  if (!pausedByUser) {
    var events = ['click', 'pointerup', 'touchend', 'keydown'];
    var retry = function (event) {
      if (pausedByUser || playBtn.contains(event.target)) return;
      a.play().catch(function () {});
    };
    events.forEach(function (event) { document.addEventListener(event, retry, true); });
    a.addEventListener('playing', function () {
      events.forEach(function (event) { document.removeEventListener(event, retry, true); });
    }, { once: true });
    a.play().catch(function () {});
  }

  /* ---------- 다음 페이지로 넘길 상태 ---------- */
  setInterval(stash, 1000);
  window.addEventListener('pagehide', stash);
  window.addEventListener('beforeunload', stash);
})();
