const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const debugEl = document.getElementById('debug');

const state = {
  touches: new Map(),
  lastSendTime: 0,
  totalMovement: 0,
  initialTouchCount: 0,
  clickSent: false,
  accScrollY: 0,
};

const CONFIG = {
  sendInterval: 16,         // ~60fps
  clickThreshold: 10,       // max movement to register as click
  moveSensitivity: 4.0,     // how fast pointer movement is applied
  scrollThreshold: 6,       // min movement to start scrolling
  scrollSensitivity: 2.0,   // how fast scrolling responds to input
};

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  render();
}

function updateDebug() {
  debugEl.innerHTML = `
    <div class="debug-line"><span class="label">Touches:</span> <span class="value">${state.touches.size}</span></div>
    ${Array.from(state.touches.values()).map((t, i) => `<div class="debug-line"><span class="label">Position #${i + 1}:</span> <span class="value">(${t.x.toFixed(0)}, ${t.y.toFixed(0)})</span></div>`).join("")}
    <div class="debug-line"><span class="label">Movement:</span> <span class="value">${state.totalMovement.toFixed(1)}px</span></div>
    <div class="debug-line"><span class="label">Initial Count:</span> <span class="value">${state.initialTouchCount}</span></div>
  `;
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
  if (now - state.lastSendTime < CONFIG.sendInterval) return;
  state.lastSendTime = now;

  if (state.initialTouchCount === 1) {
    const mx = Math.round(dx * CONFIG.moveSensitivity);
    const my = Math.round(dy * CONFIG.moveSensitivity);

    if (mx !== 0 && my !== 0) {
      fetch('/move', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: mx, y: my }),
      }).catch(err => console.error('Move error:', err));
    }

    return;
  }

  if (state.initialTouchCount === 2) {
    // collects tiny scroll movements until they've accumulated at least one full pixel,
    // then sends it to server, this keeps scrolling smooth instead of jumpy.
    state.accScrollY += dy * CONFIG.scrollSensitivity;
    const sy = Math.round(state.accScrollY);
    
    if (sy !== 0) {
      state.accScrollY -= sy;
      fetch('/scroll', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ y: sy }),
      }).catch(err => console.error('Scroll error:', err));
    }

    return;
  }
}

function sendClick(type) {
  fetch(`/click`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  }).catch(err => console.error('Click error:', err));
}

function render() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  let index = 1;
  for (const touch of state.touches.values()) {
    ctx.fillStyle = '#cf000f';
    ctx.beginPath();
    ctx.arc(touch.x, touch.y, 24, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(index++, touch.x, touch.y);
  }
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  
  for (const touch of e.touches) {
    const pos = getTouchPos(touch);
    state.touches.set(touch.identifier, { ...pos });
  }
  
  state.totalMovement = 0;
  state.initialTouchCount = e.touches.length;
  state.clickSent = false;
  state.accScrollY = 0;

  updateDebug();
  render();
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  
  if (state.touches.size === 0) return;

  const primaryTouch = e.touches[0];
  const stored = state.touches.get(primaryTouch.identifier);
  
  if (stored) {
    // gets current touch and computes horizontal (dx) and vertical (dy) movement from touch start.
    const pos = getTouchPos(primaryTouch);
    const dx = pos.x - stored.x;
    const dy = pos.y - stored.y;
    
    state.totalMovement += Math.hypot(dx, dy);
    
    sendMove(dx, dy);
    
    for (const touch of e.touches) {
      const touchStored = state.touches.get(touch.identifier);
      if (touchStored) {
        const touchPos = getTouchPos(touch);
        touchStored.x = touchPos.x;
        touchStored.y = touchPos.y;
      }
    }
  }
  
  updateDebug();
  render();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  
  const activeTouchIds = new Set(Array.from(e.touches).map(t => t.identifier));
  for (const id of state.touches.keys()) {
    if (!activeTouchIds.has(id)) {
      state.touches.delete(id);
    }
  }
  
  if (state.touches.size === 0 && !state.clickSent && state.totalMovement < CONFIG.clickThreshold) {
    if (state.initialTouchCount === 1) sendClick('left');
    else if (state.initialTouchCount === 2) sendClick('right');
    state.clickSent = true;
  }
  
  if (state.touches.size === 0) {
    state.totalMovement = 0;
    state.initialTouchCount = 0;
  }
  
  updateDebug();
  render();
});

canvas.addEventListener('touchcancel', (e) => {
  e.preventDefault();

  state.touches.clear();
  state.totalMovement = 0;
  state.initialTouchCount = 0;

  updateDebug();
  render();
});

window.addEventListener('resize', resize);
resize();
updateDebug();

document.getElementById('keyboard').addEventListener('click', () => {
  const input = createHiddenInput();
  document.body.appendChild(input);
  input.value = 'x'; // sets 'x' for backspace handling on input change
  input.autocomplete = 'off';
  input.autocapitalize = 'off';
  input.autocorrect = 'off';

  input.addEventListener('input', handleInput);
  input.addEventListener('keydown', handleKeydown);
  input.addEventListener('blur', () => input.remove());

  input.focus();
  input.select();
});

function createHiddenInput() {
  const input = document.createElement('input');

  input.type = 'text';
  Object.assign(input.style, {
    position: 'absolute',
    left: '-9999px',
    opacity: '0',
    pointerEvents: 'none'
  });

  return input;
}

function handleInput(e) {
  const value = e.target.value;
  
  if (value === '') {
    sendKey('backspace');
    e.target.value = 'x'; // if backspace is pressed, restore placeholder
    return;
  }

  if (value) {
    const newChars = value.replace('x', ''); // gets only new characters (except placeholder)
    for (const char of newChars) {
      sendKey(char);
    }
  }
  
  e.target.value = 'x';
}

function handleKeydown(e) {
  const keyCodes = {
    13: 'enter',
    32: 'space',
  };
  
  if (keyCodes[e.keyCode]) {
    e.preventDefault();
    sendKey(keyCodes[e.keyCode]);
  }
}

function sendKey(key) {
  fetch('/type', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  }).catch(error => console.error('Error sending key:', error));
}

// Settings
document.getElementById('settings').addEventListener('click', () => {
  const panel = document.getElementById('settingsPanel');
  panel.classList.toggle('active');
});

document.getElementById('close').addEventListener('click', () => {
  const panel = document.getElementById('settingsPanel');
  panel.classList.toggle('active');
});

document.getElementById('moveSensitivity').addEventListener('input', (e) => {
  CONFIG.moveSensitivity = parseFloat(e.target.value);
  document.getElementById('moveSensitivityValue').textContent = CONFIG.moveSensitivity.toFixed(1);
});

document.getElementById('scrollSensitivity').addEventListener('input', (e) => {
  CONFIG.scrollSensitivity = parseFloat(e.target.value);
  document.getElementById('scrollSensitivityValue').textContent = CONFIG.scrollSensitivity.toFixed(1);
});

document.getElementById('debugToggle').addEventListener('change', (e) => {
  document.getElementById('debug').classList.toggle('active');
  saveSettings();
});
