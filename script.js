const outputCanvas = document.getElementById('outputCanvas');
const outputCtx = outputCanvas.getContext('2d');
const sourceCanvas = document.getElementById('sourceCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const photoInput = document.getElementById('photoInput');
const dropZone = document.getElementById('dropZone');
const statusMessage = document.getElementById('statusMessage');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');
const printBtn = document.getElementById('printBtn');
const cameraBtn = document.getElementById('cameraBtn');
const cameraWrap = document.getElementById('cameraWrap');
const camera = document.getElementById('camera');
const captureBtn = document.getElementById('captureBtn');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const contrastInput = document.getElementById('contrast');
const thresholdInput = document.getElementById('threshold');
const lineWidthInput = document.getElementById('lineWidth');
const brightnessInput = document.getElementById('brightness');
const saturationInput = document.getElementById('saturation');

const state = { image: null, stream: null, hasResult: false, rotation: 0, flipX: false };

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
    resetTransforms(false);
    generateColoringPage();
    setStatus(`Foto „${file.name || 'Kamerafoto'}“ ist bereit. Du kannst es jetzt bearbeiten.`);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    setStatus('Dieses Foto konnte nicht geöffnet werden. Bitte probiere ein anderes Bild.', true);
  };
  image.src = objectUrl;
}

function resetTransforms(render = true) {
  state.rotation = 0;
  state.flipX = false;
  brightnessInput.value = '100';
  saturationInput.value = '100';
  document.getElementById('brightnessValue').value = '100%';
  document.getElementById('saturationValue').value = '100%';
  document.getElementById('flipBtn').setAttribute('aria-pressed', 'false');
  if (render && state.image) generateColoringPage();
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
  const canvas = document.createElement('canvas');
  canvas.width = camera.videoWidth;
  canvas.height = camera.videoHeight;
  canvas.getContext('2d').drawImage(camera, 0, 0);
  const image = new Image();
  image.onload = () => {
    state.image = image;
    resetTransforms(false);
    stopCamera();
    generateColoringPage();
    setStatus('Foto aufgenommen. Bearbeite es nach Wunsch und drucke oder teile danach dein Ausmalbild.');
  };
  image.src = canvas.toDataURL('image/png');
}

function createEditedPhoto() {
  if (!state.image) return null;
  const maxDimension = 1400;
  const scale = Math.min(maxDimension / state.image.width, maxDimension / state.image.height, 1);
  const originalWidth = Math.max(1, Math.round(state.image.width * scale));
  const originalHeight = Math.max(1, Math.round(state.image.height * scale));
  const sideways = Math.abs(state.rotation % 180) === 90;
  const width = sideways ? originalHeight : originalWidth;
  const height = sideways ? originalWidth : originalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.scale(state.flipX ? -1 : 1, 1);
  ctx.filter = `brightness(${brightnessInput.value}%) saturate(${saturationInput.value}%)`;
  ctx.drawImage(state.image, -originalWidth / 2, -originalHeight / 2, originalWidth, originalHeight);
  ctx.restore();
  return canvas;
}

function updateSourcePreview(editedCanvas) {
  document.getElementById('sourcePlaceholder').hidden = true;
  sourceCanvas.width = editedCanvas.width;
  sourceCanvas.height = editedCanvas.height;
  sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  sourceCtx.drawImage(editedCanvas, 0, 0);
}

function createEdgeMap(source) {
  const { width, height } = source;
  const sourceData = source.getContext('2d').getImageData(0, 0, width, height).data;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const index = i * 4;
    gray[i] = 0.299 * sourceData[index] + 0.587 * sourceData[index + 1] + 0.114 * sourceData[index + 2];
  }
  const contrast = Number(contrastInput.value);
  const threshold = Number(thresholdInput.value);
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const tl = gray[(y - 1) * width + x - 1];
      const t = gray[(y - 1) * width + x];
      const tr = gray[(y - 1) * width + x + 1];
      const l = gray[y * width + x - 1];
      const r = gray[y * width + x + 1];
      const bl = gray[(y + 1) * width + x - 1];
      const b = gray[(y + 1) * width + x];
      const br = gray[(y + 1) * width + x + 1];
      const gx = -tl - 2 * l - bl + tr + 2 * r + br;
      const gy = -tl - 2 * t - tr + bl + 2 * b + br;
      const value = (Math.hypot(gx, gy) * contrast) / 100 > threshold ? 0 : 255;
      const index = (y * width + x) * 4;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }
  }
  return new ImageData(pixels, width, height);
}

function renderLineDrawing(edgeImage) {
  const { width, height, data } = edgeImage;
  const lineWidth = Number(lineWidthInput.value);
  if (lineWidth > 1) {
    const original = new Uint8ClampedArray(data);
    const radius = Math.max(1, Math.round((lineWidth - 1) * 1.5));
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        let isEdge = false;
        for (let dy = -radius; !isEdge && dy <= radius; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            if (original[((y + dy) * width + x + dx) * 4] < 128) { isEdge = true; break; }
          }
        }
        const index = (y * width + x) * 4;
        data[index] = data[index + 1] = data[index + 2] = isEdge ? 0 : 255;
      }
    }
  }
  outputCanvas.width = width;
  outputCanvas.height = height;
  outputCtx.putImageData(edgeImage, 0, 0);
  state.hasResult = true;
}

function generateColoringPage() {
  if (!state.image) {
    setStatus('Lade zuerst ein Foto hoch oder nimm eines mit der Kamera auf.', true);
    return;
  }
  const editedPhoto = createEditedPhoto();
  updateSourcePreview(editedPhoto);
  renderLineDrawing(createEdgeMap(editedPhoto));
}

function getColoringPageFile() {
  return new Promise((resolve, reject) => {
    outputCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Das Ausmalbild konnte nicht erstellt werden.'));
        return;
      }
      resolve(new File([blob], 'ausmalbild.png', { type: 'image/png' }));
    }, 'image/png');
  });
}

async function shareColoringPage() {
  if (!state.hasResult) {
    setStatus('Lade zuerst ein Foto hoch, bevor du es teilst.', true);
    return;
  }

  try {
    const file = await getColoringPageFile();
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({
        title: 'Mein Ausmalbild',
        text: 'Schau dir mein Ausmalbild an!',
        files: [file],
      });
      setStatus('Ausmalbild wurde zum Teilen freigegeben.');
      return;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    setStatus('Teilen wird von diesem Browser nicht unterstützt. Das Ausmalbild wurde heruntergeladen – du kannst es jetzt als Anhang verschicken.');
  } catch (error) {
    if (error.name === 'AbortError') {
      setStatus('Teilen abgebrochen.');
      return;
    }
    console.error(error);
    setStatus('Das Ausmalbild konnte nicht geteilt werden. Bitte speichere es als PNG und verschicke die Datei.', true);
  }
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
  printWindow.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Ausmalbild drucken</title><style>@page{size:A4;margin:12mm}html,body{width:100%;height:100%;margin:0}body{display:grid;place-items:center;background:white}img{display:block;max-width:100%;max-height:100%;object-fit:contain}@media screen{body{min-height:100vh;padding:12px;box-sizing:border-box}img{max-height:calc(100vh - 24px)}}</style></head><body><img src="${imageUrl}" alt="Ausmalbild"><script>window.onload=()=>setTimeout(()=>{window.focus();window.print()},250);<\/script></body></html>`);
  printWindow.document.close();
}

document.getElementById('choosePhotoBtn').addEventListener('click', () => photoInput.click());
photoInput.addEventListener('change', (event) => {
  loadImageFromFile(event.target.files[0]);
  event.target.value = '';
});
['dragenter', 'dragover'].forEach((name) => dropZone.addEventListener(name, (event) => {
  event.preventDefault();
  dropZone.classList.add('is-dragging');
}));
['dragleave', 'drop'].forEach((name) => dropZone.addEventListener(name, (event) => {
  event.preventDefault();
  dropZone.classList.remove('is-dragging');
}));
dropZone.addEventListener('drop', (event) => loadImageFromFile(event.dataTransfer.files[0]));
cameraBtn.addEventListener('click', openCamera);
closeCameraBtn.addEventListener('click', stopCamera);
captureBtn.addEventListener('click', captureFromCamera);
generateBtn.addEventListener('click', generateColoringPage);
document.getElementById('rotateLeftBtn').addEventListener('click', () => { state.rotation = (state.rotation + 270) % 360; generateColoringPage(); });
document.getElementById('rotateRightBtn').addEventListener('click', () => { state.rotation = (state.rotation + 90) % 360; generateColoringPage(); });
document.getElementById('flipBtn').addEventListener('click', (event) => {
  state.flipX = !state.flipX;
  event.currentTarget.setAttribute('aria-pressed', String(state.flipX));
  generateColoringPage();
});
document.getElementById('resetEditBtn').addEventListener('click', () => resetTransforms());
brightnessInput.addEventListener('input', () => {
  document.getElementById('brightnessValue').value = `${brightnessInput.value}%`;
  generateColoringPage();
});
saturationInput.addEventListener('input', () => {
  document.getElementById('saturationValue').value = `${saturationInput.value}%`;
  generateColoringPage();
});
[contrastInput, thresholdInput, lineWidthInput].forEach((input) => input.addEventListener('input', generateColoringPage));
downloadBtn.addEventListener('click', () => {
  if (!state.hasResult) { setStatus('Lade zuerst ein Foto hoch, bevor du es speicherst.', true); return; }
  const link = document.createElement('a');
  link.href = outputCanvas.toDataURL('image/png');
  link.download = 'ausmalbild.png';
  link.click();
});
shareBtn.addEventListener('click', shareColoringPage);
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
