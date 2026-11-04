const outputCanvas = document.getElementById('outputCanvas');
const outputCtx = outputCanvas.getContext('2d');
const photoInput = document.getElementById('photoInput');
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

const state = {
  image: null,
  stream: null,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function loadImageFromFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      generateColoringPage();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
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
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
      },
      audio: false,
    });

    state.stream = stream;
    camera.srcObject = stream;
    cameraWrap.classList.remove('hidden');
  } catch (error) {
    alert('Die Kamera konnte nicht gestartet werden. Bitte ein Foto aus dem Gerät auswählen.');
    console.error(error);
  }
}

function captureFromCamera() {
  if (!camera.videoWidth || !camera.videoHeight) {
    return;
  }

  const captureCanvas = document.createElement('canvas');
  captureCanvas.width = camera.videoWidth;
  captureCanvas.height = camera.videoHeight;

  const ctx = captureCanvas.getContext('2d');
  ctx.drawImage(camera, 0, 0, captureCanvas.width, captureCanvas.height);

  const image = new Image();
  image.onload = () => {
    state.image = image;
    stopCamera();
    generateColoringPage();
  };
  image.src = captureCanvas.toDataURL('image/png');
}

function createEdgeMap(sourceCanvas) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const sourceData = sourceCanvas.getContext('2d').getImageData(0, 0, width, height).data;
  const gray = new Float32Array(width * height);

  for (let i = 0; i < width * height; i += 1) {
    const index = i * 4;
    const r = sourceData[index];
    const g = sourceData[index + 1];
    const b = sourceData[index + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const contrastValue = Number(contrastInput.value);
  const thresholdValue = Number(thresholdInput.value);

  const result = new Uint8ClampedArray(width * height * 4);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const tl = gray[(y - 1) * width + (x - 1)];
      const t = gray[(y - 1) * width + x];
      const tr = gray[(y - 1) * width + (x + 1)];
      const l = gray[y * width + (x - 1)];
      const r = gray[y * width + (x + 1)];
      const bl = gray[(y + 1) * width + (x - 1)];
      const b = gray[(y + 1) * width + x];
      const br = gray[(y + 1) * width + (x + 1)];

      const gx = (-tl) + (-2 * l) + (-bl) + tr + (2 * r) + br;
      const gy = (-tl) + (-2 * t) + (-tr) + bl + (2 * b) + br;
      const magnitude = Math.sqrt(gx * gx + gy * gy);

      const adjusted = clamp((magnitude * contrastValue) / 100, 0, 255);
      const value = adjusted > thresholdValue ? 0 : 255;
      const resultIndex = index * 4;
      result[resultIndex] = value;
      result[resultIndex + 1] = value;
      result[resultIndex + 2] = value;
      result[resultIndex + 3] = 255;
    }
  }

  return new ImageData(result, width, height);
}

function renderLineDrawing(finalImage) {
  const lineWidth = Number(lineWidthInput.value);
  const width = finalImage.width;
  const height = finalImage.height;

  outputCanvas.width = width;
  outputCanvas.height = height;
  outputCtx.clearRect(0, 0, width, height);
  outputCtx.fillStyle = '#ffffff';
  outputCtx.fillRect(0, 0, width, height);

  outputCtx.lineWidth = lineWidth;
  outputCtx.strokeStyle = '#111111';
  outputCtx.beginPath();

  const imageData = finalImage.getContext('2d').getImageData(0, 0, width, height);
  const { data } = imageData;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      const brightness = data[index];

      if (alpha > 0 && brightness < 128) {
        outputCtx.beginPath();
        outputCtx.arc(x, y, Math.max(0.7, lineWidth * 0.8), 0, Math.PI * 2);
        outputCtx.fillStyle = '#111111';
        outputCtx.fill();
      }
    }
  }
}

function generateColoringPage() {
  if (!state.image) {
    return;
  }

  const maxDimension = 1100;
  const ratio = Math.min(maxDimension / state.image.width, maxDimension / state.image.height, 1);
  const width = Math.max(300, Math.round(state.image.width * ratio));
  const height = Math.max(300, Math.round(state.image.height * ratio));

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;

  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.clearRect(0, 0, width, height);
  tempCtx.drawImage(state.image, 0, 0, width, height);

  const edgeImage = createEdgeMap(tempCanvas);

  const stageCanvas = document.createElement('canvas');
  stageCanvas.width = width;
  stageCanvas.height = height;
  const stageCtx = stageCanvas.getContext('2d');
  stageCtx.putImageData(edgeImage, 0, 0);

  renderLineDrawing(stageCanvas);
}

photoInput.addEventListener('change', (event) => {
  loadImageFromFile(event.target.files[0]);
});

cameraBtn.addEventListener('click', openCamera);
closeCameraBtn.addEventListener('click', stopCamera);
captureBtn.addEventListener('click', captureFromCamera);
generateBtn.addEventListener('click', generateColoringPage);

contrastInput.addEventListener('input', () => {
  if (state.image) {
    generateColoringPage();
  }
});

thresholdInput.addEventListener('input', () => {
  if (state.image) {
    generateColoringPage();
  }
});

lineWidthInput.addEventListener('input', () => {
  if (state.image) {
    generateColoringPage();
  }
});

downloadBtn.addEventListener('click', () => {
  const image = outputCanvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = image;
  link.download = 'ausmalbild.png';
  link.click();
});

printBtn.addEventListener('click', () => {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Ausmalbild drucken</title>
        <style>
          body { margin: 0; display: grid; place-items: center; background: white; }
          img { max-width: 95vw; max-height: 95vh; object-fit: contain; }
        </style>
      </head>
      <body>
        <img src="${outputCanvas.toDataURL('image/png')}" />
        <script>window.onload = () => setTimeout(() => window.print(), 200);</script>
      </body>
    </html>
  `);
  printWindow.document.close();
});

const placeholder = document.createElement('canvas');
placeholder.width = 900;
placeholder.height = 900;
const placeholderCtx = placeholder.getContext('2d');
placeholderCtx.fillStyle = '#ffffff';
placeholderCtx.fillRect(0, 0, 900, 900);
placeholderCtx.strokeStyle = '#d8d2c7';
placeholderCtx.lineWidth = 4;
placeholderCtx.strokeRect(40, 40, 820, 820);
placeholderCtx.font = 'bold 52px Arial';
placeholderCtx.fillStyle = '#2c2a29';
placeholderCtx.fillText('Foto hier einfügen', 240, 460);
outputCtx.drawImage(placeholder, 0, 0);
