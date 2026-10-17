/* On-screen guided player for the SWAN demos.
   Visitors don't need to know any keys: the story plays itself, and they can
   pause it, step it, or restart it with the buttons. */
(function () {
'use strict';

var DWELL_MS = 3600;     // pause between steps while playing
var START_MS = 2200;     // let the first scene settle before autoplay begins

var box, btnPlay, btnNext, btnRestart, cap, fill;
var playing = true, timer = null, finished = false;

function app() { return window.DemoApp; }

function build() {
  box = document.getElementById('player');
  if (!box || !app()) return false;
  box.innerHTML =
    '<button type="button" class="primary" id="pl-play" aria-label="Pause demo">❚❚ Pause</button>' +
    '<button type="button" id="pl-next" aria-label="Next step">Next ▸</button>' +
    '<div class="pl-cap" aria-live="polite"><span id="pl-cap">Starting…</span><div class="pl-bar"><i id="pl-fill"></i></div></div>' +
    '<button type="button" id="pl-restart" aria-label="Restart demo">↺</button>' +
    '<a class="pl-link" href="./">About</a>';
  btnPlay = box.querySelector('#pl-play');
  btnNext = box.querySelector('#pl-next');
  btnRestart = box.querySelector('#pl-restart');
  cap = box.querySelector('#pl-cap');
  fill = box.querySelector('#pl-fill');
  btnPlay.addEventListener('click', function () { playing ? pause() : play(); });
  btnNext.addEventListener('click', function () { pause(); stepOnce(); });
  btnRestart.addEventListener('click', function () { location.href = location.pathname; });
  return true;
}

function setPlayLabel() {
  if (finished) { btnPlay.textContent = '▶ Replay'; btnPlay.setAttribute('aria-label', 'Replay demo'); return; }
  btnPlay.textContent = playing ? '❚❚ Pause' : '▶ Play';
  btnPlay.setAttribute('aria-label', playing ? 'Pause demo' : 'Play demo');
}

function schedule(ms) {
  clearTimeout(timer);
  if (playing && !finished) timer = setTimeout(tick, ms);
}

function play() {
  if (finished) { location.href = location.pathname; return; }
  playing = true; setPlayLabel(); schedule(300);
}
function pause() { playing = false; clearTimeout(timer); setPlayLabel(); }

async function stepOnce() {
  if (app().isBusy()) return false;
  var moved = await app().step();
  return moved;
}

async function tick() {
  if (!playing) return;
  if (app().isBusy()) { schedule(400); return; }
  var moved = await stepOnce();
  if (!moved && !app().isBusy()) { markDone(); return; }
  schedule(DWELL_MS);
}

function markDone() {
  finished = true; playing = false; clearTimeout(timer);
  btnNext.disabled = true; setPlayLabel();
}

window.DemoPlayer = {
  update: function (beatIdx, caption) {
    if (!box) return;
    var last = app().last;
    fill.style.width = Math.max(0, Math.min(100, (beatIdx / last) * 100)) + '%';
    if (beatIdx >= last) { markDone(); cap.innerHTML = '<b>Demo complete</b>'; return; }
    cap.innerHTML = caption ? 'Up next: <b>' + caption + '</b>' : 'Playing…';
  }
};

document.addEventListener('DOMContentLoaded', function () {
  if (!build()) return;
  setPlayLabel();
  window.DemoPlayer.update(app().beat(), null);
  var p = new URLSearchParams(location.search);
  if (p.has('beat') || p.has('paused')) { playing = false; setPlayLabel(); }   // deep links stay put
  schedule(START_MS);
});
})();
