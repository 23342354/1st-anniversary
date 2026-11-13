/* ============================================================
   배경 음악
   ------------------------------------------------------------
   · 문서 앞부분에서 음원을 읽고 화면 연출을 기다리지 않고 재생합니다.
   · 자동 재생이 차단되면 클릭·터치·키 입력 때 다시 시도합니다.
   · 두 페이지 사이에 재생 위치와 볼륨, 음소거, 일시정지 상태를 이어갑니다.
   ============================================================ */
(function () {
  'use strict';

  var a = document.getElementById('bgmAudio');
  if (!a) return;

  var KEY = 'wh-bgm';
  var saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (e) {}

  var pausedByUser = !!saved.paused;
  var playBtn;
  a.volume = typeof saved.volume === 'number' && saved.volume >= 0 && saved.volume <= 1
    ? saved.volume : 0.55;
  a.muted = !!saved.muted;

  function restorePosition() {
    if (!a.duration || !isFinite(a.duration)) return;
    if (saved.time > 0 && saved.time < a.duration - 0.3) a.currentTime = saved.time;
    saved.time = 0;
  }
  if (a.readyState >= 1) {
    restorePosition();
  } else {
    a.addEventListener('loadedmetadata', restorePosition, { once: true });
  }

  function stash() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({
        time: a.readyState >= 1 ? a.currentTime : (saved.time || 0),
        volume: a.volume,
        muted: a.muted,
        paused: pausedByUser
      }));
    } catch (e) {}
  }

  function play() {
    a.play().catch(function () {});
  }

  if (!pausedByUser) {
    var events = ['click', 'pointerup', 'touchend', 'keydown'];
    var retry = function (event) {
      if (pausedByUser || !a.paused || (playBtn && playBtn.contains(event.target))) return;
      play();
    };
    events.forEach(function (event) { document.addEventListener(event, retry, true); });
    a.addEventListener('playing', function () {
      events.forEach(function (event) { document.removeEventListener(event, retry, true); });
    }, { once: true });
    a.autoplay = true;
    play();
  }

  setInterval(stash, 1000);
  window.addEventListener('pagehide', stash);
  window.addEventListener('beforeunload', stash);

  function bindControls() {
    var box = document.getElementById('bgm');
    if (!box) return;

    playBtn = document.getElementById('bgmPlay');
    var muteBtn = document.getElementById('bgmMute');
    var bar = document.getElementById('bgmBar');
    var vol = document.getElementById('bgmVol');
    var timeEl = document.getElementById('bgmTime');
    var seeking = false;
    var seekTimer;

    function mmss(t) {
      if (!isFinite(t) || t < 0) return '0:00';
      var m = Math.floor(t / 60), s = Math.floor(t % 60);
      return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function paintProgress() {
      timeEl.textContent = mmss(a.currentTime) + ' / ' + mmss(a.duration);
      if (seeking || !a.duration) return;
      var r = a.currentTime / a.duration;
      bar.value = Math.round(r * 1000);
      bar.style.setProperty('--p', (r * 100) + '%');
    }

    function paintVol() {
      box.classList.toggle('is-muted', a.muted);
      vol.style.setProperty('--p', (a.muted ? 0 : a.volume * 100) + '%');
    }

    function paintPlaying() {
      box.classList.toggle('is-playing', !a.paused);
    }

    vol.value = Math.round(a.volume * 100);
    paintVol();
    paintProgress();
    paintPlaying();
    a.addEventListener('loadedmetadata', paintProgress);
    a.addEventListener('timeupdate', paintProgress);
    a.addEventListener('play', paintPlaying);
    a.addEventListener('pause', paintPlaying);

    playBtn.addEventListener('click', function () {
      pausedByUser = !a.paused;
      if (pausedByUser) {
        a.autoplay = false;
        a.pause();
      } else {
        play();
      }
      stash();
    });

    muteBtn.addEventListener('click', function () {
      a.muted = !a.muted;
      paintVol();
      stash();
    });

    vol.addEventListener('input', function () {
      a.volume = vol.value / 100;
      if (a.volume > 0 && a.muted) a.muted = false;
      paintVol();
      stash();
    });

    function finishSeek() {
      seeking = false;
      stash();
    }
    bar.addEventListener('input', function () {
      seeking = true;
      bar.style.setProperty('--p', (bar.value / 10) + '%');
      if (a.duration) a.currentTime = (bar.value / 1000) * a.duration;
      clearTimeout(seekTimer);
      seekTimer = setTimeout(finishSeek, 400);
    });
    bar.addEventListener('change', function () {
      clearTimeout(seekTimer);
      finishSeek();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindControls, { once: true });
  } else {
    bindControls();
  }
})();
