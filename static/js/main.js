const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', {alpha: false});
const debugEl = document.getElementById('debug');

const state = {
  x: 0,
  y: 0,
  dx: 0,
  dy: 0,
  active: false,
  hasMoved: false,
};

let lastSendTime = 0;
const SEND_INTERVAL = 16; // ~60fps throttle
const CLICK_THRESHOLD = 10; // pixels - max movement to count as click

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  render();
}

function updateDebug() {
  const lines = [
    `<div class="debug-line"><span class="label">Position:</span> <span class="value">${state.x.toFixed(0)}, ${state.y.toFixed(0)} </span></div>`,
    `<div class="debug-line"><span class="label">Move:</span> <span class="value">${state.dx.toFixed(1)}, ${state.dy.toFixed(1)}</span></div>`,
    `<div class="debug-line"><span class="label">Active:</span> <span class="value">${state.active}</span></div>`,
  ];

  debugEl.innerHTML = lines.join('');
}

function getTouchPos(touch) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

function sendMove(dx, dy) {
  const now = Date.now();
  if (now - lastSendTime < SEND_INTERVAL) return;
  lastSendTime = now;

  const x = Math.round(dx * 4.0);
  const y = Math.round(dy * 4.0);

  if (x === 0 && y === 0) return;

  fetch(`/move/${x}/${y}`)
    .catch(err => console.error('Move error:', err));
}

function sendClick() {
  fetch('/click')
    .catch(err => console.error('Click error:', err));
}

function render() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.active) {
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(state.x, state.y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const pos = getTouchPos(e.touches[0]);

  state.x = pos.x;
  state.y = pos.y;

  state.dx = 0;
  state.dy = 0;

  state.active = true;
  state.hasMoved = false;

  updateDebug();
  render();
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!state.active) return;

  const pos = getTouchPos(e.touches[0]);
  state.dx = pos.x - state.x;
  state.dy = pos.y - state.y;

  if (Math.abs(state.dx) > CLICK_THRESHOLD || Math.abs(state.dy) > CLICK_THRESHOLD) {
    state.hasMoved = true;
  }

  state.x = pos.x;
  state.y = pos.y;

  sendMove(state.dx, state.dy);
  updateDebug();

  render();
}, {passive: false});

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (!state.hasMoved) {
    sendClick();
  }

  state.dx = 0;
  state.dy = 0;

  state.active = false;
  state.hasMoved = false;

  updateDebug();
  render();
});

canvas.addEventListener('touchcancel', (e) => {
  e.preventDefault();

  state.dx = 0;
  state.dy = 0;

  state.active = false;
  state.hasMoved = false;

  updateDebug();
  render();
});

window.addEventListener('resize', resize);
resize();
updateDebug();
