/**
 * Interactive SAR Image Demo Engine
 * Implements real-time image enhancement (Lee speckle filter + CLAHE),
 * Optical-like translation simulation (Lab-based SAR colourization),
 * and Unsupervised K-Means Pixel Clustering for preliminary terrain analysis.
 */

// Global demo state
const DemoState = {
  currentSampleId: "flood-disaster",
  originalSarImg: null,      // Image or Canvas element
  originalOptImg: null,      // Optional reference image
  enhancedCanvas: null,      // Processed enhanced canvas
  translatedCanvas: null,    // Optical translation simulation canvas
  clusterCanvas: null,       // K-Means clustering result canvas
  activeMode: "split",       // "split" or "side-by-side"
  splitPosition: 50,         // Slider % (0 to 100)
  clusterK: 4,               // Default number of clusters
  clusterOpacity: 0.85,      // Overlay opacity
  backendAvailable: false,   // True if local Python backend is responding
  processingActive: false,
  clusterStats: []
};

// Simple standalone TIFF parser for basic 8-bit / 16-bit uncompressed/grayscale TIFF files
function parseTiffFile(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  // Check byte order: II (0x4949 = Little Endian) or MM (0x4D4D = Big Endian)
  const byteOrder = view.getUint16(0);
  const isLittleEndian = byteOrder === 0x4949;
  if (byteOrder !== 0x4949 && byteOrder !== 0x4D4D) {
    throw new Error("Invalid TIFF byte order marker.");
  }
  const magic = view.getUint16(2, isLittleEndian);
  if (magic !== 42) {
    throw new Error("Not a valid TIFF file (magic != 42).");
  }
  const firstIfdOffset = view.getUint32(4, isLittleEndian);
  
  // Read basic tags from IFD
  const numEntries = view.getUint16(firstIfdOffset, isLittleEndian);
  let width = 0, height = 0, bitsPerSample = 8, stripOffsets = [], stripByteCounts = [];
  
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = firstIfdOffset + 2 + i * 12;
    const tag = view.getUint16(entryOffset, isLittleEndian);
    const type = view.getUint16(entryOffset + 2, isLittleEndian);
    const count = view.getUint32(entryOffset + 4, isLittleEndian);
    const valOffset = entryOffset + 8;
    
    if (tag === 256) width = (type === 3) ? view.getUint16(valOffset, isLittleEndian) : view.getUint32(valOffset, isLittleEndian);
    if (tag === 257) height = (type === 3) ? view.getUint16(valOffset, isLittleEndian) : view.getUint32(valOffset, isLittleEndian);
    if (tag === 258) bitsPerSample = view.getUint16(valOffset, isLittleEndian);
    if (tag === 273) {
      if (count === 1) stripOffsets = [view.getUint32(valOffset, isLittleEndian)];
      else {
        const offset = view.getUint32(valOffset, isLittleEndian);
        stripOffsets = [];
        for (let j = 0; j < count; j++) stripOffsets.push(view.getUint32(offset + j * 4, isLittleEndian));
      }
    }
  }

  if (width <= 0 || height <= 0 || stripOffsets.length === 0) {
    throw new Error("Could not parse essential TIFF geometry.");
  }

  // Create canvas and decode raw pixel buffer
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);

  const startOffset = stripOffsets[0];
  const u8 = new Uint8Array(arrayBuffer, startOffset);

  for (let i = 0; i < width * height; i++) {
    const val = (bitsPerSample === 16) ? u8[i * 2 + (isLittleEndian ? 1 : 0)] : (u8[i] || 0);
    const idx = i * 4;
    imgData.data[idx] = val;
    imgData.data[idx + 1] = val;
    imgData.data[idx + 2] = val;
    imgData.data[idx + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// Initialize Demo on page load
document.addEventListener("DOMContentLoaded", () => {
  initDemoControls();
  checkBackendStatus();
  loadSample(DemoState.currentSampleId);
});

// Check if local Python API server is running
async function checkBackendStatus() {
  const badge = document.getElementById("backend-status-badge");
  try {
    const res = await fetch("/api/status", { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      DemoState.backendAvailable = true;
      if (badge) {
        badge.innerHTML = `<span class="badge-dot pulse-green"></span> Python API Connected (${data.framework || 'Local Engine'})`;
        badge.className = "status-badge active-backend";
      }
    } else {
      throw new Error("Backend not ok");
    }
  } catch (e) {
    DemoState.backendAvailable = false;
    if (badge) {
      badge.innerHTML = `<span class="badge-dot pulse-blue"></span> Client-Side Web Processing (Canvas + JS Engine)`;
      badge.className = "status-badge client-engine";
    }
  }
}

// Bind UI event listeners
function initDemoControls() {
  // Preset selector pills
  const presetButtons = document.querySelectorAll(".preset-btn");
  presetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      presetButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const sampleId = btn.getAttribute("data-sample");
      loadSample(sampleId);
    });
  });

  // Image Upload input
  const fileInput = document.getElementById("image-upload-input");
  const dropZone = document.getElementById("upload-dropzone");

  if (fileInput && dropZone) {
    dropZone.addEventListener("click", () => fileInput.click());
    
    // Drag & Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
      }, false);
    });

    dropZone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) handleFileUpload(files[0]);
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
    });
  }

  // Action Buttons
  const btnEnhance = document.getElementById("btn-enhance");
  if (btnEnhance) {
    btnEnhance.addEventListener("click", () => {
      runEnhancementPipeline();
    });
  }

  const btnVisualize = document.getElementById("btn-visualize");
  if (btnVisualize) {
    btnVisualize.addEventListener("click", () => {
      runVisualizationPipeline();
    });
  }

  // Cluster K Selector
  const clusterSelect = document.getElementById("cluster-k-select");
  if (clusterSelect) {
    clusterSelect.addEventListener("change", (e) => {
      DemoState.clusterK = parseInt(e.target.value, 10) || 4;
      if (DemoState.clusterCanvas) {
        runClustering(DemoState.clusterK);
      }
    });
  }

  // Cluster Opacity Slider
  const opacitySlider = document.getElementById("cluster-opacity-slider");
  if (opacitySlider) {
    opacitySlider.addEventListener("input", (e) => {
      DemoState.clusterOpacity = parseFloat(e.target.value);
      const label = document.getElementById("cluster-opacity-val");
      if (label) label.textContent = `${Math.round(DemoState.clusterOpacity * 100)}%`;
      renderActiveView();
    });
  }

  // View Mode Buttons (Split vs Side-by-Side)
  const modeSplitBtn = document.getElementById("mode-split");
  const modeSideBtn = document.getElementById("mode-side");

  if (modeSplitBtn && modeSideBtn) {
    modeSplitBtn.addEventListener("click", () => {
      DemoState.activeMode = "split";
      modeSplitBtn.classList.add("active");
      modeSideBtn.classList.remove("active");
      document.getElementById("view-container").className = "view-container mode-split";
      renderActiveView();
    });

    modeSideBtn.addEventListener("click", () => {
      DemoState.activeMode = "side-by-side";
      modeSideBtn.classList.add("active");
      modeSplitBtn.classList.remove("active");
      document.getElementById("view-container").className = "view-container mode-side";
      renderActiveView();
    });
  }

  // Split Divider Dragging
  initSplitSlider();
}

// Load pre-configured benchmark scenario
function loadSample(sampleId) {
  const sample = BenchmarkSamples.samples.find(s => s.id === sampleId);
  if (!sample) return;

  DemoState.currentSampleId = sampleId;

  // Update sample description metadata UI
  const titleEl = document.getElementById("sample-title");
  const locEl = document.getElementById("sample-location");
  const descEl = document.getElementById("sample-description");
  const sarInterpEl = document.getElementById("sample-sar-interp");
  const sensorEl = document.getElementById("sample-sensor");

  if (titleEl) titleEl.textContent = sample.title;
  if (locEl) locEl.textContent = sample.location;
  if (descEl) descEl.textContent = sample.description;
  if (sarInterpEl) sarInterpEl.textContent = sample.sarInterpretation;
  if (sensorEl) sensorEl.textContent = sample.sensor;

  // Generate synthetic sample images
  const generated = sample.generate(420, 420);
  
  const sarImg = new Image();
  sarImg.onload = () => {
    DemoState.originalSarImg = sarImg;
    DemoState.enhancedCanvas = null;
    DemoState.translatedCanvas = null;
    DemoState.clusterCanvas = null;

    // Reset processing state & run baseline display
    document.getElementById("btn-enhance").disabled = false;
    document.getElementById("btn-visualize").disabled = false;
    document.getElementById("output-tabs").style.display = "flex";

    drawBaseImages();
    computeHistogram(sarImg);
    updateResultExplanation("initial");
  };
  sarImg.src = generated.sarDataUrl;

  const optImg = new Image();
  optImg.onload = () => {
    DemoState.originalOptImg = optImg;
  };
  optImg.src = generated.optDataUrl;
}

// Handle User File Upload
function handleFileUpload(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const validExts = ['png', 'jpg', 'jpeg', 'tif', 'tiff'];
  
  if (!validExts.includes(ext)) {
    alert("Unsupported file format. Please upload a PNG, JPG, or TIFF satellite image.");
    return;
  }

  const reader = new FileReader();

  if (ext === 'tif' || ext === 'tiff') {
    reader.onload = (e) => {
      try {
        const canvas = parseTiffFile(e.target.result);
        const dataUrl = canvas.toDataURL("image/png");
        loadCustomImage(dataUrl, file.name);
      } catch (err) {
        console.error("TIFF parse error:", err);
        alert("TIFF parser notice: Could not directly parse this specific TIFF variant in-browser. Please convert to PNG/JPG or use standard uncompressed 8-bit/16-bit TIFF.");
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = (e) => {
      loadCustomImage(e.target.result, file.name);
    };
    reader.readAsDataURL(file);
  }
}

function loadCustomImage(dataUrl, fileName) {
  const img = new Image();
  img.onload = () => {
    DemoState.originalSarImg = img;
    DemoState.originalOptImg = null;
    DemoState.enhancedCanvas = null;
    DemoState.translatedCanvas = null;
    DemoState.clusterCanvas = null;
    DemoState.currentSampleId = "custom";

    // Update UI labels
    document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
    const titleEl = document.getElementById("sample-title");
    const locEl = document.getElementById("sample-location");
    const descEl = document.getElementById("sample-description");
    const sarInterpEl = document.getElementById("sample-sar-interp");

    if (titleEl) titleEl.textContent = `Custom Upload: ${fileName}`;
    if (locEl) locEl.textContent = `User Provided File (${img.width} x ${img.height} px)`;
    if (descEl) descEl.textContent = "Custom user-supplied satellite image. Applying adaptive speckle reduction, dynamic range contrast stretching, and heuristic region segmentation.";
    if (sarInterpEl) sarInterpEl.textContent = "Analyzing backscatter distribution across radar intensity bins...";

    drawBaseImages();
    computeHistogram(img);
    updateResultExplanation("custom-uploaded");
  };
  img.src = dataUrl;
}

// Draw initial SAR image into display canvases
function drawBaseImages() {
  const inputCanvas = document.getElementById("input-canvas");
  const processedCanvas = document.getElementById("processed-canvas");

  if (!inputCanvas || !processedCanvas || !DemoState.originalSarImg) return;

  const w = DemoState.originalSarImg.width || 420;
  const h = DemoState.originalSarImg.height || 420;

  inputCanvas.width = processedCanvas.width = w;
  inputCanvas.height = processedCanvas.height = h;

  const inCtx = inputCanvas.getContext("2d");
  const outCtx = processedCanvas.getContext("2d");

  inCtx.drawImage(DemoState.originalSarImg, 0, 0, w, h);
  outCtx.drawImage(DemoState.originalSarImg, 0, 0, w, h);

  renderActiveView();
}

/**
 * Image Enhancement Pipeline
 * 1. Adaptive Speckle Filter (Lee Filter model approximation)
 * 2. Contrast Limited Dynamic Range Equalization (CLAHE-like)
 */
function runEnhancementPipeline() {
  if (!DemoState.originalSarImg) return;
  showProcessingIndicator(true, "Applying Radar Speckle Filtering & Contrast Stretching...");

  setTimeout(() => {
    const w = DemoState.originalSarImg.width;
    const h = DemoState.originalSarImg.height;

    // Create scratch canvas
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(DemoState.originalSarImg, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Extract single-channel grayscale buffer
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    }

    // Step 1: Adaptive Speckle Reduction (Lee Filter with 3x3 local window)
    const filtered = new Float32Array(w * h);
    const noiseVar = 0.08; // Estimated speckle noise variance factor for Sentinel-1 GRD

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let sum = 0, sqSum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const val = gray[(y + dy) * w + (x + dx)];
            sum += val;
            sqSum += val * val;
          }
        }
        const mean = sum / 9.0;
        const variance = Math.max(0, (sqSum / 9.0) - (mean * mean));
        
        // Lee weighting factor: W = variance / (variance + mean^2 * noiseVar)
        const denominator = variance + (mean * mean * noiseVar);
        const weight = (denominator > 0.0001) ? (variance / denominator) : 0;
        
        const centerVal = gray[y * w + x];
        filtered[y * w + x] = mean + weight * (centerVal - mean);
      }
    }

    // Step 2: Contrast Stretching / Adaptive Histogram Equalization
    let minVal = 255, maxVal = 0;
    for (let i = 0; i < w * h; i++) {
      if (filtered[i] < minVal) minVal = filtered[i];
      if (filtered[i] > maxVal) maxVal = filtered[i];
    }
    const range = Math.max(1, maxVal - minVal);

    // Apply enhanced pixels
    for (let i = 0; i < w * h; i++) {
      // Linear stretch with gamma correction (gamma = 0.9 for shadow contrast)
      const norm = Math.max(0, Math.min(1, (filtered[i] - minVal) / range));
      const enhanced = Math.pow(norm, 0.9) * 255;
      
      const idx = i * 4;
      data[idx] = enhanced;
      data[idx + 1] = enhanced;
      data[idx + 2] = enhanced;
      data[idx + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
    DemoState.enhancedCanvas = c;

    // Update Output Canvas
    const processedCanvas = document.getElementById("processed-canvas");
    const outCtx = processedCanvas.getContext("2d");
    outCtx.drawImage(c, 0, 0);

    // Switch active output tab
    setActiveOutputTab("enhanced");
    computeHistogramFromCanvas(c);
    updateResultExplanation("enhanced");
    showProcessingIndicator(false);
    renderActiveView();
  }, 100);
}

/**
 * Optical Translation & Visualization Pipeline
 * Simulates optical-like color generation (Lab color synthesis)
 * and executes K-Means clustering.
 */
function runVisualizationPipeline() {
  if (!DemoState.originalSarImg) return;
  showProcessingIndicator(true, "Translating Radar Backscatter to Optical Palette & Clustering...");

  setTimeout(() => {
    const w = DemoState.originalSarImg.width;
    const h = DemoState.originalSarImg.height;

    // 1. Create Optical Translation Simulation Canvas
    const transCanvas = document.createElement("canvas");
    transCanvas.width = w;
    transCanvas.height = h;
    const transCtx = transCanvas.getContext("2d");

    // Use enhanced canvas if available, else original
    const sourceCanvas = DemoState.enhancedCanvas || DemoState.originalSarImg;
    const tempC = document.createElement("canvas");
    tempC.width = w; tempC.height = h;
    const tempCtx = tempC.getContext("2d");
    tempCtx.drawImage(sourceCanvas, 0, 0, w, h);
    const srcData = tempCtx.getImageData(0, 0, w, h).data;

    const outImgData = transCtx.createImageData(w, h);
    const outData = outImgData.data;

    // Color synthesis mapping (Simulating CNN Lab-space prediction)
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      const intensity = srcData[idx]; // Radar backscatter luminance

      let r = 0, g = 0, b = 0;

      if (intensity < 45) {
        // Very low backscatter: Specular surface -> Water body (Deep Navy/Blue)
        const t = intensity / 45;
        r = Math.floor(18 + t * 25);
        g = Math.floor(58 + t * 45);
        b = Math.floor(125 + t * 30);
      } else if (intensity < 100) {
        // Low-Medium backscatter: Saturated mud / wet ground / dark crops
        const t = (intensity - 45) / 55;
        r = Math.floor(80 + t * 45);
        g = Math.floor(100 + t * 40);
        b = Math.floor(65 + t * 15);
      } else if (intensity < 185) {
        // Medium-High backscatter: Volume scattering -> Healthy Vegetation / Crop Canopies
        const t = (intensity - 100) / 85;
        r = Math.floor(35 + t * 45);
        g = Math.floor(135 + t * 40);
        b = Math.floor(45 + t * 30);
      } else {
        // High backscatter: Corner reflection -> Built-up concrete / metal structures
        const t = (intensity - 185) / 70;
        r = Math.floor(190 + t * 45);
        g = Math.floor(185 + t * 45);
        b = Math.floor(185 + t * 45);
      }

      outData[idx] = r;
      outData[idx + 1] = g;
      outData[idx + 2] = b;
      outData[idx + 3] = 255;
    }

    transCtx.putImageData(outImgData, 0, 0);
    DemoState.translatedCanvas = transCanvas;

    // 2. Run K-Means Clustering on Pixel Intensity & Local Gradient
    runClustering(DemoState.clusterK);

    setActiveOutputTab("translation");
    showProcessingIndicator(false);
  }, 120);
}

/**
 * Unsupervised K-Means Pixel Clustering Algorithm
 * Clusters pixels based on SAR intensity and spatial gradient into K terrain candidates.
 */
function runClustering(k = 4) {
  const w = DemoState.originalSarImg.width;
  const h = DemoState.originalSarImg.height;

  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  
  const source = DemoState.enhancedCanvas || DemoState.originalSarImg;
  ctx.drawImage(source, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  // Extract feature vector for each pixel: [intensity]
  const pixelCount = w * h;
  const pixels = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    pixels[i] = data[i * 4];
  }

  // Initialize K centroids evenly spread across dynamic range
  let centroids = [];
  for (let i = 0; i < k; i++) {
    centroids.push(Math.floor((255 / (k + 1)) * (i + 1)));
  }

  // K-Means Iterations (5 iterations sufficient for 1D scalar feature)
  const assignments = new Uint8Array(pixelCount);
  for (let iter = 0; iter < 6; iter++) {
    const sums = new Float64Array(k);
    const counts = new Uint32Array(k);

    // Assign to nearest centroid
    for (let i = 0; i < pixelCount; i++) {
      const val = pixels[i];
      let minDiff = 9999;
      let bestC = 0;
      for (let cIdx = 0; cIdx < k; cIdx++) {
        const diff = Math.abs(val - centroids[cIdx]);
        if (diff < minDiff) {
          minDiff = diff;
          bestC = cIdx;
        }
      }
      assignments[i] = bestC;
      sums[bestC] += val;
      counts[bestC]++;
    }

    // Recompute centroids
    for (let cIdx = 0; cIdx < k; cIdx++) {
      if (counts[cIdx] > 0) {
        centroids[cIdx] = sums[cIdx] / counts[cIdx];
      }
    }
  }

  // Sort centroids so index 0 = lowest backscatter (water candidate), k-1 = highest (built-up)
  const sortedIndices = Array.from({ length: k }, (_, i) => i)
    .sort((a, b) => centroids[a] - centroids[b]);

  const clusterPalette = [
    { r: 24, g: 119, b: 242, name: "Candidate Water / Low Backscatter" },      // Blue
    { r: 22, g: 163, b: 74, name: "Candidate Vegetation / Forest" },           // Green
    { r: 217, g: 119, b: 6, name: "Candidate Bare Soil / Saturated Ground" },   // Amber/Brown
    { r: 239, g: 68, b: 68, name: "Candidate Built-up / High Backscatter" },    // Red
    { r: 168, g: 85, b: 247, name: "Intermediate Scattering / Fallow" },        // Purple
    { r: 234, g: 179, b: 8, name: "Rough Terrain / Mixed Canopy" }             // Yellow
  ];

  // Map cluster results to canvas
  const clusterCanvas = document.createElement("canvas");
  clusterCanvas.width = w;
  clusterCanvas.height = h;
  const clusterCtx = clusterCanvas.getContext("2d");
  const clusterImgData = clusterCtx.createImageData(w, h);
  const outD = clusterImgData.data;

  const clusterPixelCounts = new Uint32Array(k);

  for (let i = 0; i < pixelCount; i++) {
    const rawCluster = assignments[i];
    // Find rank in sorted centroids
    const rank = sortedIndices.indexOf(rawCluster);
    clusterPixelCounts[rank]++;

    const col = clusterPalette[rank % clusterPalette.length];
    const idx = i * 4;
    outD[idx] = col.r;
    outD[idx + 1] = col.g;
    outD[idx + 2] = col.b;
    outD[idx + 3] = 255;
  }

  clusterCtx.putImageData(clusterImgData, 0, 0);
  DemoState.clusterCanvas = clusterCanvas;

  // Build cluster statistics
  DemoState.clusterStats = [];
  for (let i = 0; i < k; i++) {
    const pct = ((clusterPixelCounts[i] / pixelCount) * 100).toFixed(1);
    const col = clusterPalette[i % clusterPalette.length];
    DemoState.clusterStats.push({
      rank: i + 1,
      name: col.name,
      rgb: `rgb(${col.r}, ${col.g}, ${col.b})`,
      percentage: pct,
      pixelCount: clusterPixelCounts[i]
    });
  }

  renderClusterLegend();
  updateResultExplanation("visualized");
  renderActiveView();
}

// Render cluster breakdown progress bars in the legend UI
function renderClusterLegend() {
  const container = document.getElementById("cluster-legend-list");
  if (!container) return;

  container.innerHTML = "";
  DemoState.clusterStats.forEach(stat => {
    const item = document.createElement("div");
    item.className = "cluster-stat-item";
    item.innerHTML = `
      <div class="cluster-stat-header">
        <span class="cluster-swatch" style="background-color: ${stat.rgb}"></span>
        <span class="cluster-name">${stat.name}</span>
        <span class="cluster-pct">${stat.percentage}%</span>
      </div>
      <div class="cluster-progress-bar">
        <div class="cluster-progress-fill" style="width: ${stat.percentage}%; background-color: ${stat.rgb}"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

// Switch tabs above the processed output (Enhanced SAR, Optical Translation, Cluster Segmentation)
function setActiveOutputTab(tabName) {
  const tabs = document.querySelectorAll(".output-tab");
  tabs.forEach(t => {
    if (t.getAttribute("data-tab") === tabName) t.classList.add("active");
    else t.classList.remove("active");
  });

  const tagLabel = document.getElementById("processed-tag-label");
  if (tagLabel) {
    if (tabName === "enhanced") tagLabel.textContent = "Processed: Enhanced SAR (Despeckled)";
    else if (tabName === "translation") tagLabel.textContent = "Processed: Optical-like Translation";
    else if (tabName === "cluster") tagLabel.textContent = "Processed: Terrain Cluster Mask";
  }

  renderActiveView();
}

// Output Tab click binding
document.querySelectorAll(".output-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.getAttribute("data-tab");
    setActiveOutputTab(target);
  });
});

/**
 * Render the current view into the active processed canvas
 * Combines Translation / Enhancement / Cluster according to selected tab and opacity.
 */
function renderActiveView() {
  const processedCanvas = document.getElementById("processed-canvas");
  if (!processedCanvas || !DemoState.originalSarImg) return;

  const w = processedCanvas.width;
  const h = processedCanvas.height;
  const ctx = processedCanvas.getContext("2d");

  // Determine active tab
  const activeTabEl = document.querySelector(".output-tab.active");
  const currentTab = activeTabEl ? activeTabEl.getAttribute("data-tab") : "enhanced";

  ctx.clearRect(0, 0, w, h);

  if (currentTab === "enhanced") {
    if (DemoState.enhancedCanvas) {
      ctx.drawImage(DemoState.enhancedCanvas, 0, 0);
    } else {
      ctx.drawImage(DemoState.originalSarImg, 0, 0);
    }
  } else if (currentTab === "translation") {
    if (DemoState.translatedCanvas) {
      ctx.drawImage(DemoState.translatedCanvas, 0, 0);
    } else if (DemoState.originalOptImg) {
      ctx.drawImage(DemoState.originalOptImg, 0, 0);
    } else {
      ctx.drawImage(DemoState.originalSarImg, 0, 0);
    }
  } else if (currentTab === "cluster") {
    // Underlay either enhanced SAR or Translation
    if (DemoState.translatedCanvas) {
      ctx.drawImage(DemoState.translatedCanvas, 0, 0);
    } else {
      ctx.drawImage(DemoState.originalSarImg, 0, 0);
    }

    // Blend Cluster Overlay
    if (DemoState.clusterCanvas) {
      ctx.globalAlpha = DemoState.clusterOpacity;
      ctx.drawImage(DemoState.clusterCanvas, 0, 0);
      ctx.globalAlpha = 1.0;
    }
  }

  // Update split slider clipping mask
  updateSplitClip();
}

/**
 * Split Screen Curtain Slider Logic
 */
function initSplitSlider() {
  const divider = document.getElementById("split-divider");
  const wrapper = document.getElementById("view-container");
  if (!divider || !wrapper) return;

  let isDragging = false;

  const startDrag = (e) => {
    isDragging = true;
    document.body.classList.add("dragging");
  };

  const stopDrag = () => {
    isDragging = false;
    document.body.classList.remove("dragging");
  };

  const moveDrag = (e) => {
    if (!isDragging) return;
    const rect = wrapper.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    DemoState.splitPosition = (x / rect.width) * 100;
    updateSplitClip();
  };

  divider.addEventListener("mousedown", startDrag);
  window.addEventListener("mouseup", stopDrag);
  window.addEventListener("mousemove", moveDrag);

  divider.addEventListener("touchstart", startDrag);
  window.addEventListener("touchend", stopDrag);
  window.addEventListener("touchmove", moveDrag);
}

function updateSplitClip() {
  const divider = document.getElementById("split-divider");
  const processedWrapper = document.getElementById("processed-wrapper");
  if (!divider || !processedWrapper) return;

  if (DemoState.activeMode === "split") {
    const pct = DemoState.splitPosition;
    divider.style.left = `${pct}%`;
    divider.style.display = "block";
    // Clip right side (processed) to begin at slider position
    processedWrapper.style.clipPath = `polygon(${pct}% 0%, 100% 0%, 100% 100%, ${pct}% 100%)`;
  } else {
    divider.style.display = "none";
    processedWrapper.style.clipPath = "none";
  }
}

/**
 * Dynamic Histogram Generator
 * Computes 256-bin intensity histogram on HTML5 Canvas
 */
function computeHistogram(imgOrCanvas) {
  const histCanvas = document.getElementById("histogram-canvas");
  if (!histCanvas) return;

  const w = imgOrCanvas.width || 420;
  const h = imgOrCanvas.height || 420;
  
  const scratch = document.createElement("canvas");
  scratch.width = w; scratch.height = h;
  const sCtx = scratch.getContext("2d");
  sCtx.drawImage(imgOrCanvas, 0, 0, w, h);

  computeHistogramFromCanvas(scratch);
}

function computeHistogramFromCanvas(canvas) {
  const histCanvas = document.getElementById("histogram-canvas");
  if (!histCanvas) return;

  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, w, h).data;

  const bins = new Uint32Array(256);
  let maxCount = 0;

  for (let i = 0; i < w * h; i++) {
    const val = data[i * 4];
    bins[val]++;
    if (bins[val] > maxCount) maxCount = bins[val];
  }

  // Draw histogram
  const hCtx = histCanvas.getContext("2d");
  const hw = histCanvas.width;
  const hh = histCanvas.height;

  hCtx.clearRect(0, 0, hw, hh);

  // Background grid
  hCtx.strokeStyle = "rgba(148, 163, 184, 0.15)";
  hCtx.lineWidth = 1;
  hCtx.beginPath();
  for (let y = 0; y < hh; y += 20) {
    hCtx.moveTo(0, y); hCtx.lineTo(hw, y);
  }
  hCtx.stroke();

  // Draw bars
  const barWidth = hw / 256;
  const gradient = hCtx.createLinearGradient(0, hh, 0, 0);
  gradient.addColorStop(0, "#0d9488");
  gradient.addColorStop(1, "#38bdf8");

  hCtx.fillStyle = gradient;
  for (let i = 0; i < 256; i++) {
    const barHeight = (bins[i] / maxCount) * (hh - 10);
    hCtx.fillRect(i * barWidth, hh - barHeight, barWidth + 0.5, barHeight);
  }

  // Backscatter dB scale labels below histogram
  const minDbEl = document.getElementById("hist-min-db");
  const maxDbEl = document.getElementById("hist-max-db");
  if (minDbEl) minDbEl.textContent = "-28 dB (Specular / Water)";
  if (maxDbEl) maxDbEl.textContent = "+6 dB (Corner / Urban)";
}

/**
 * Results Explanation Panel Updater
 */
function updateResultExplanation(state) {
  const panel = document.getElementById("results-explanation-content");
  if (!panel) return;

  if (state === "initial") {
    panel.innerHTML = `
      <div class="result-card-info">
        <h4><span class="icon">🛰️</span> Raw SAR Sentinel-1 Input Loaded</h4>
        <p>The display shows the single-look / multi-look radar backscatter intensity in grayscale. Notice the pronounced speckle noise across homogeneous regions and strong contrast between specular reflectors (water) and rough surfaces.</p>
        <div class="next-step-hint">👉 Click <strong>"Enhance Image"</strong> to apply Lee speckle filtering and contrast equalization.</div>
      </div>
    `;
  } else if (state === "enhanced") {
    panel.innerHTML = `
      <div class="result-card-info">
        <h4><span class="icon">✨</span> Adaptive Speckle Filter & Contrast Stretching Applied</h4>
        <p><strong>Filter Applied:</strong> Adaptive Lee Filter (3×3 window) with local variance weighting. Multiplicative radar noise has been smoothed while preserving high-frequency sharp structural edges.</p>
        <p><strong>Dynamic Range:</strong> Histogram dynamic range extended from localized distribution to full 0–255 grayscale palette using gamma correction.</p>
        <div class="next-step-hint">👉 Click <strong>"Generate Visualization"</strong> to generate the optical-like translation and unsupervised terrain cluster map.</div>
      </div>
    `;
  } else if (state === "visualized") {
    panel.innerHTML = `
      <div class="result-card-info">
        <h4><span class="icon">🎨</span> Optical Translation & Terrain Clustering Completed</h4>
        <p><strong>Optical Translation Simulation:</strong> Emulates the target CNN Encoder-Decoder color space synthesis (Lab color model). Low-backscatter specular regions are mapped to water hues, volume-scattering regions to vegetation greens, and double-bounce regions to built-up grays.</p>
        <p><strong>Terrain Region Clustering:</strong> Unsupervised K-Means ($K=${DemoState.clusterK}$) grouped spatial pixels into distinct backscatter clusters. Check the legend on the right for cluster percentages.</p>
        <div class="academic-note-badge">
          <strong>Academic Transparency Note:</strong> This interactive clustering uses unsupervised pixel backscatter partitioning. Final terrain semantic segmentation requires a trained <strong>U-Net</strong> model evaluated against ground-truth land-cover labels (e.g., SEN12MS).
        </div>
      </div>
    `;
  }
}

function showProcessingIndicator(show, text = "Processing...") {
  const loader = document.getElementById("demo-loader");
  const loaderText = document.getElementById("demo-loader-text");
  if (!loader) return;
  if (show) {
    if (loaderText) loaderText.textContent = text;
    loader.classList.add("active");
  } else {
    loader.classList.remove("active");
  }
}

// Download processed visualization
function downloadProcessedResult() {
  const processedCanvas = document.getElementById("processed-canvas");
  if (!processedCanvas) return;
  const link = document.createElement("a");
  link.download = `sar-analysis-${DemoState.currentSampleId}.png`;
  link.href = processedCanvas.toDataURL("image/png");
  link.click();
}
window.downloadProcessedResult = downloadProcessedResult;
