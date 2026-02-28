// =========================================
//  SignSpeak — Vanilla JS Controller (FIXED)
// =========================================

const API_URL = 'http://127.0.0.1:5000/predict';

// --- DOM References ---
const webcam            = document.getElementById('webcam');
const videoOverlay      = document.getElementById('videoOverlay');
const scanLine          = document.getElementById('scanLine');
const corners           = document.querySelectorAll('.corner');
const statusBadge       = document.getElementById('statusBadge');
const statusText        = document.getElementById('statusText');
const outputPlaceholder = document.getElementById('outputPlaceholder');
const outputLabel       = document.getElementById('outputLabel');
const confidenceWrapper = document.getElementById('confidenceWrapper');
const confidenceFill    = document.getElementById('confidenceFill');
const historyItems      = document.getElementById('historyItems');

const btnStart   = document.getElementById('btnStart');
const btnStop    = document.getElementById('btnStop');
const btnPredict = document.getElementById('btnPredict');
const btnClear   = document.getElementById('btnClear');

let stream = null;
let detectionHistory = [];

// Hidden canvas used to grab frames from the video
const canvas = document.createElement('canvas');
const ctx    = canvas.getContext('2d');

// =========================================
//  Camera Controls
// =========================================

btnStart.addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    webcam.srcObject = stream;

    videoOverlay.classList.add('hidden');
    scanLine.classList.add('active');
    corners.forEach(c => c.classList.add('visible'));

    statusBadge.classList.add('active');
    statusText.textContent = 'Camera Live';

    btnStart.disabled   = true;
    btnStop.disabled    = false;
    btnPredict.disabled = false;

  } catch (err) {
    showToast('Camera access denied or unavailable.');
    console.error('getUserMedia error:', err);
  }
});

btnStop.addEventListener('click', () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
    webcam.srcObject = null;
  }

  videoOverlay.classList.remove('hidden');
  scanLine.classList.remove('active');
  corners.forEach(c => c.classList.remove('visible'));

  statusBadge.classList.remove('active');
  statusText.textContent = 'Camera Off';

  btnStart.disabled   = false;
  btnStop.disabled    = true;
  btnPredict.disabled = true;
});

// =========================================
//  Capture Frame from Webcam → base64
// =========================================

function captureFrame() {
  // Match canvas size to the video's actual resolution
  canvas.width  = webcam.videoWidth  || 640;
  canvas.height = webcam.videoHeight || 480;
  ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
  // Returns a data-URL like "data:image/jpeg;base64,..."
  return canvas.toDataURL('image/jpeg', 0.8);
}

// =========================================
//  Predict  (FIX: send image, not timestamp)
// =========================================

btnPredict.addEventListener('click', async () => {
  if (!stream) {
    showToast('Please start the camera first.');
    return;
  }

  setLoading(true);

  try {
    const imageData = captureFrame();   // <-- grab current frame

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData })  // <-- send as { image: "data:image/jpeg;base64,..." }
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();
    const label = data.label || 'UNKNOWN';

    displayResult(label, data.confidence);

  } catch (err) {
    showToast(`Prediction failed: ${err.message}`);
    console.error('Predict error:', err);
  } finally {
    setLoading(false);
  }
});

// =========================================
//  Display Result
// =========================================

function displayResult(label, confidence) {
  outputPlaceholder.classList.add('hidden');
  outputLabel.textContent = label;
  outputLabel.classList.add('visible');

  if (typeof confidence === 'number') {
    const pct = Math.round(confidence * 100);
    confidenceWrapper.classList.add('visible');
    requestAnimationFrame(() => {
      confidenceFill.style.width = pct + '%';
    });
  }

  addToHistory(label);
}

function addToHistory(label) {
  detectionHistory.push(label);

  const emptyEl = historyItems.querySelector('.history-empty');
  if (emptyEl) emptyEl.remove();

  if (detectionHistory.length > 10) {
    detectionHistory.shift();
    historyItems.removeChild(historyItems.firstChild);
  }

  const chip = document.createElement('span');
  chip.className = 'history-chip';
  chip.textContent = label;
  historyItems.appendChild(chip);
}

// =========================================
//  Clear
// =========================================

btnClear.addEventListener('click', () => {
  outputLabel.textContent = '';
  outputLabel.classList.remove('visible');
  outputPlaceholder.classList.remove('hidden');

  confidenceWrapper.classList.remove('visible');
  confidenceFill.style.width = '0%';

  detectionHistory = [];
  historyItems.innerHTML = '<span class="history-empty">No detections yet</span>';
});

// =========================================
//  Loading State
// =========================================

function setLoading(isLoading) {
  btnPredict.disabled = isLoading;
  if (isLoading) {
    btnPredict.classList.add('loading');
    btnPredict.querySelector('.btn-icon').textContent = '⟳';
  } else {
    btnPredict.classList.remove('loading');
    btnPredict.querySelector('.btn-icon').textContent = '⚡';
    btnPredict.disabled = !stream;
  }
}

// =========================================
//  Toast Notification
// =========================================

let toastTimer = null;

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
