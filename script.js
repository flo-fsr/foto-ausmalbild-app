const outputCanvas = document.getElementById('outputCanvas');
const outputCtx = outputCanvas.getContext('2d');
const photoInput = document.getElementById('photoInput');
const dropZone = document.getElementById('dropZone');
const statusMessage = document.getElementById('statusMessage');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const printBtn = document.getElementById('printBtn');
const cameraBtn = document.getElementById('cameraBtn');
const cameraWrap = document.getElementById('cameraWrap');
const camera = document.getElementById('camera');
const captureBtn = document.getElementById('captureBtn');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const contrastInput = document.getElementById('contrast');
const thresholdInput = document.getElementById('threshold');
const lineWidthInput = document.getElementById('lineWidth');

const state = { image: null, stream: null, hasResult: false };

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', isError);
}

function loadImageFromFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setStatus('Bitte wähle eine Bilddatei aus (zum Beispiel JPG oder PNG).', true);
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    state.image = image;
    generateColoringPage();
    setStatus(`Foto „${file.name}“ wurde geladen und umgewandelt.`);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    setStatus('Dieses Foto konnte nicht geöffnet werden. Bitte probiere ein anderes Bild.', true);
  };
  image.src = objectUrl;
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
  cameraWrap.classList.add('hidden');
  camera.srcObject = null;
}

async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('Die Kamera wird in diesem Browser nicht unterstützt. Lade stattdessen ein Foto hoch.', true);
    return;
  }
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    camera.srcObject = state.stream;
    cameraWrap.classList.remove('hidden');
    setStatus('Kamera bereit. Nimm ein Foto auf oder schließe die Kamera.');
  } catch (error) {
    setStatus('Die Kamera konnte nicht gestartet werden. Bitte erlaube den Zugriff oder lade ein Foto hoch.', true);
    console.error(error);
  }
}

function captureFromCamera() {
  if (!camera.videoWidth || !camera.videoHeight) return;
  const captureCanvas = document.createElement('canvas');
  captureCanvas.width = camera.videoWidth;
  captureCanvas.height = camera.videoHeight;
  captureCanvas.getContext('2d').drawImage(camera, 0, 0);
  const image = new Image();
  image.onload = () => {
    state.image = image;
    stopCamera();
    generateColoringPage();
    setStatus('Foto aufgenommen und als Ausmalbild umgewandelt.');
  };
  image.src = captureCanvas.toDataURL('image/png');
}

function createEdgeMap(sourceCanvas) {
  const { width, height } = sourceCanvas;
  const sourceData = sourceCanvas.getContext('2d').getImageData(0, 0, width, height).data;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const index = i * 4;
    gray[i] = 0.299 * sourceData[index] + 0.587 * sourceData[index + 1] + 0.114 * sourceData[index + 2];
  }

  const contrastValue = Number(contrastInput.value);
  const thresholdValue = Number(thresholdInput.value);
  const result = new Uint8ClampedArray(width * height * 4);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const tl = gray[(y - 1) * width + (x - 1)];
      const t = gray[(y - 1) * width + x];
      const tr = gray[(y - 1) * width + (x + 1)];
      const l = gray[y * width + (x - 1)];
      const r = gray[y * width + (x + 1)];
      const bl = gray[(y + 1) * width + (x - 1)];
      const b = gray[(y + 1) * width + x];
      const br = gray[(y + 1) * width + (x + 1)];
      const gx = -tl - (2 * l) - bl + tr + (2 * r) + br;
      const gy = -tl - (2 * t) - tr + bl + (2 * b) + br;
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const value = (magnitude * contrastValue) / 100 > thresholdValue ? 0 : 255;
      const resultIndex = (y * width + x) * 4;
      result[resultIndex] = value;
      result[resultIndex + 1] = value;
      result[resultIndex + 2] = value;
      result[resultIndex + 3] = 255;
    }
  }
  return new ImageData(result, width, height);
}

function renderLineDrawing(edgeImage) {
  const width = edgeImage.width;
  const height = edgeImage.height;
  const lineWidth = Number(lineWidthInput.value);
  outputCanvas.width = width;
  outputCanvas.height = height;

  // Turn the detected edges into clean, continuous black lines on white paper.
  const pixels = edgeImage.data;
  if (lineWidth > 1) {
    const source = new Uint8ClampedArray(pixels);
    const radius = Math.max(0, Math.round((lineWidth - 1) * 1.5));
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = (y * width + x) * 4;
        let isEdge = source[index] < 128;
        for (let dy = -radius; !isEdge && dy <= radius; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            if (source[((y + dy) * width + x + dx) * 4] < 128) { isEdge = true; break; }
          }
        }
        const value = isEdge ? 0 : 255;
        pixels[index] = value;
        pixels[index + 1] = value;
        pixels[index + 2] = value;
      }
    }
  }
  outputCtx.putImageData(edgeImage, 0, 0);
  state.hasResult = true;
}

function generateColoringPage() {
  if (!state.image) {
    setStatus('Lade zuerst ein Foto hoch oder nimm eines mit der Kamera auf.', true);
    return;
  }
  const maxDimension = 1400;
  const ratio = Math.min(maxDimension / state.image.width, maxDimension / state.image.height, 1);
  const width = Math.max(1, Math.round(state.image.width * ratio));
  const height = Math.max(1, Math.round(state.image.height * ratio));
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  tempCanvas.getContext('2d').drawImage(state.image, 0, 0, width, height);
  renderLineDrawing(createEdgeMap(tempCanvas));
}

function printColoringPage() {
  if (!state.hasResult) {
    setStatus('Lade zuerst ein Foto hoch, bevor du druckst.', true);
    return;
  }
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    setStatus('Das Druckfenster wurde blockiert. Erlaube Pop-ups und versuche es erneut.', true);
    return;
  }
  const imageUrl = outputCanvas.toDataURL('image/png');
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Ausmalbild drucken</title><style>
    @page { size: A4; margin: 12mm; }
    html, body { width: 100%; height: 100%; margin: 0; }
    body { display: grid; place-items: center; background: white; }
    img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
    @media screen { body { min-height: 100vh; padding: 12px; box-sizing: border-box; } img { max-height: calc(100vh - 24px); } }
  </style></head><body><img src="${imageUrl}" alt="Ausmalbild"><script>window.onload = () => setTimeout(() => { window.focus(); window.print(); }, 250);<\/script></body></html>`);
  printWindow.document.close();
}

document.getElementById('choosePhotoBtn').addEventListener('click', () => photoInput.click());
photoInput.addEventListener('change', (event) => {
  loadImageFromFile(event.target.files[0]);
  event.target.value = '';
});
['dragenter', 'dragover'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
  event.preventDefault();
  dropZone.classList.add('is-dragging');
}));
['dragleave', 'drop'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
  event.preventDefault();
  dropZone.classList.remove('is-dragging');
}));
dropZone.addEventListener('drop', (event) => loadImageFromFile(event.dataTransfer.files[0]));
cameraBtn.addEventListener('click', openCamera);
closeCameraBtn.addEventListener('click', stopCamera);
captureBtn.addEventListener('click', captureFromCamera);
generateBtn.addEventListener('click', generateColoringPage);
contrastInput.addEventListener('input', generateColoringPage);
thresholdInput.addEventListener('input', generateColoringPage);
lineWidthInput.addEventListener('input', generateColoringPage);
downloadBtn.addEventListener('click', () => {
  if (!state.hasResult) {
    setStatus('Lade zuerst ein Foto hoch, bevor du es speicherst.', true);
    return;
  }
  const link = document.createElement('a');
  link.href = outputCanvas.toDataURL('image/png');
  link.download = 'ausmalbild.png';
  link.click();
});
printBtn.addEventListener('click', printColoringPage);

function drawPlaceholder() {
  outputCtx.fillStyle = '#fff';
  outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputCtx.strokeStyle = '#d8d2c7';
  outputCtx.lineWidth = 3;
  outputCtx.setLineDash([12, 10]);
  outputCtx.strokeRect(32, 32, outputCanvas.width - 64, outputCanvas.height - 64);
  outputCtx.setLineDash([]);
  outputCtx.fillStyle = '#77736b';
  outputCtx.textAlign = 'center';
  outputCtx.font = 'bold 34px Arial';
  outputCtx.fillText('Dein Ausmalbild erscheint hier', outputCanvas.width / 2, outputCanvas.height / 2);
}
drawPlaceholder();
