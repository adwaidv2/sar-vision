/**
 * SAR & Optical Benchmark Sample Generator & Repository
 * Procedural generation of physically realistic paired SAR (Sentinel-1 C-band VV/VH)
 * and Optical (Sentinel-2 MSI RGB) satellite image benchmarks.
 * 
 * Physics modeled:
 * - Specular reflection (calm water, asphalt -> low radar return / dark)
 * - Double-bounce corner reflection (urban structures, ships -> high radar return / bright white)
 * - Volume scattering (crop canopies, forest leaves -> textured medium radar return + speckle noise)
 * - Radar speckle multiplicative noise (Rayleigh / Gamma distributed)
 */

const BenchmarkSamples = {
  samples: [
    {
      id: "flood-disaster",
      title: "Flood Inundation & River Basin",
      location: "Assam / Brahmaputra River Basin",
      date: "August 2024 (Monsoon Season)",
      sensor: "Sentinel-1 C-Band SAR (VV/VH Polarization) vs Sentinel-2 MSI",
      resolution: "10m / pixel",
      description: "Severe monsoon river overflow inundating surrounding agricultural plains. Optical satellites were obstructed by 95% cloud cover, while SAR penetrates rain clouds to map water boundaries.",
      sarInterpretation: "Standing floodwaters appear pitch black due to mirror-like specular reflection deflecting radar pulses away from the antenna. Submerged paddy fields show low backscatter (-18 to -22 dB). Unflooded elevated tree groves show textured medium gray (-11 dB).",
      groundTruthClasses: [
        { name: "Inundated Floodwaters", color: "#1e3a8a", heuristicColor: "#0f172a", pct: "34%" },
        { name: "Saturated Soil / Mud", color: "#78350f", heuristicColor: "#64748b", pct: "21%" },
        { name: "Vegetation & Forest Groves", color: "#15803d", heuristicColor: "#94a3b8", pct: "38%" },
        { name: "Elevated Road / Built-up", color: "#dc2626", heuristicColor: "#f8fafc", pct: "7%" }
      ],
      generate: (width = 512, height = 512) => {
        return generateFloodBenchmark(width, height);
      }
    },
    {
      id: "coastal-port",
      title: "Coastal Harbor & Urban Center",
      location: "Mumbai / Port & Coastal Shoreline",
      date: "November 2024 (Dry Season)",
      sensor: "Sentinel-1 C-Band SAR (Interferometric Wide Swath)",
      resolution: "10m / pixel",
      description: "High-density coastal metropolis with active shipping berths, breakwaters, coastal mangroves, and residential concrete towers.",
      sarInterpretation: "Right-angle intersections between vertical building walls and ground create intense 'double-bounce' corner reflections, appearing as brilliant white clusters (+5 to +12 dB). Ocean surface appears dark with wave ripple texture. Mangroves produce diffuse volume scattering.",
      groundTruthClasses: [
        { name: "Open Sea / Harbor Waters", color: "#0284c7", heuristicColor: "#0f172a", pct: "42%" },
        { name: "Dense Urban / Built Structures", color: "#e11d48", heuristicColor: "#f8fafc", pct: "28%" },
        { name: "Coastal Mangroves / Greenery", color: "#16a34a", heuristicColor: "#64748b", pct: "19%" },
        { name: "Piers / Industrial Yard", color: "#d97706", heuristicColor: "#cbd5e1", pct: "11%" }
      ],
      generate: (width = 512, height = 512) => {
        return generateCoastalBenchmark(width, height);
      }
    },
    {
      id: "agriculture-canals",
      title: "Agricultural Farmland & Irrigation",
      location: "Punjab / Indo-Gangetic Plain",
      date: "March 2024 (Harvest Pre-Season)",
      sensor: "Sentinel-1 Dual Polarization (VV + VH)",
      resolution: "10m / pixel",
      description: "Geometric patchwork of wheat fields, bare fallow soil, irrigation canals, and scattered rural village settlements.",
      sarInterpretation: "Canals show clear zero-backscatter dark ribbons. Crop canopies produce moderate volume scattering (-14 to -8 dB) depending on crop height and moisture content. Rural concrete houses appear as bright isolated points.",
      groundTruthClasses: [
        { name: "Irrigation Canals & Ponds", color: "#0ea5e9", heuristicColor: "#0f172a", pct: "8%" },
        { name: "Mature Crops / High Vegetation", color: "#22c55e", heuristicColor: "#475569", pct: "46%" },
        { name: "Fallow / Bare Agricultural Soil", color: "#d97706", heuristicColor: "#94a3b8", pct: "36%" },
        { name: "Farmsteads / Rural Structures", color: "#ef4444", heuristicColor: "#f1f5f9", pct: "10%" }
      ],
      generate: (width = 512, height = 512) => {
        return generateAgricultureBenchmark(width, height);
      }
    },
    {
      id: "mountain-ridge",
      title: "Mountainous Terrain & Ridge Valleys",
      location: "Western Ghats / Mountain Valley",
      date: "January 2024",
      sensor: "Sentinel-1 C-Band SAR (Ascending Pass)",
      resolution: "10m / pixel",
      description: "Complex undulating mountain topography with steep ridges, dense canopy slopes, and sharp valleys demonstrating SAR geometric effects.",
      sarInterpretation: "Shows classic radar geometric distortion: slopes facing the radar sensor suffer 'foreshortening' and appear very bright, while steep opposite slopes fall into total 'radar shadow' appearing black, regardless of actual surface cover.",
      groundTruthClasses: [
        { name: "Radar Shadow / Deep Valley", color: "#312e81", heuristicColor: "#020617", pct: "18%" },
        { name: "Dense Hillside Forest", color: "#15803d", heuristicColor: "#475569", pct: "44%" },
        { name: "Illuminated Ridge Slopes", color: "#eab308", heuristicColor: "#f8fafc", pct: "26%" },
        { name: "Valley Stream & Rocks", color: "#38bdf8", heuristicColor: "#94a3b8", pct: "12%" }
      ],
      generate: (width = 512, height = 512) => {
        return generateMountainBenchmark(width, height);
      }
    }
  ]
};

// Seeded pseudo-random number generator for reproducible satellite textures
function createPRNG(seed = 12345) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Generate realistic Rayleigh / Gamma speckle noise for SAR
function applySpeckle(val, noiseFactor, rng) {
  // Multiplicative speckle: I_measured = I_true * noise
  const u1 = Math.max(0.0001, rng());
  const u2 = rng();
  // Box-Muller transform for normal distribution
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const noise = 1.0 + z0 * noiseFactor;
  return Math.max(0, Math.min(255, val * noise));
}

// 1. FLOOD BENCHMARK GENERATOR
function generateFloodBenchmark(w, h) {
  const sarCanvas = document.createElement('canvas');
  const optCanvas = document.createElement('canvas');
  sarCanvas.width = optCanvas.width = w;
  sarCanvas.height = optCanvas.height = h;

  const sarCtx = sarCanvas.getContext('2d');
  const optCtx = optCanvas.getContext('2d');

  const sarImgData = sarCtx.createImageData(w, h);
  const optImgData = optCtx.createImageData(w, h);

  const rng = createPRNG(42);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      // Meandering river + flood overflow
      const riverCenter1 = w * 0.45 + Math.sin(y / 60) * 80 + Math.cos(y / 30) * 30;
      const dist1 = Math.abs(x - riverCenter1);

      // Flooded lake / depression on east side
      const dxLake = x - w * 0.75;
      const dyLake = y - h * 0.4;
      const lakeDist = Math.sqrt(dxLake * dxLake + dyLake * dyLake * 1.8);

      // Flood basin fingers
      const floodFinger = Math.sin(x / 40) * 25 + Math.cos(y / 50) * 20;

      let isMainWater = dist1 < (45 + Math.sin(y / 25) * 15);
      let isFloodInundation = (dist1 < (90 + floodFinger) && y > h * 0.25) || (lakeDist < 65);
      let isMudZone = (dist1 < (120 + floodFinger) && y > h * 0.2) || (lakeDist < 85);
      
      // Scattered village embankments / roads
      const isRoad = Math.abs(y - (h * 0.7 - x * 0.2)) < 4 || Math.abs(x - w * 0.2) < 3;
      const isHouse = isRoad && (x % 35 < 8) && (y % 40 < 8);

      let sarVal = 0;
      let optR = 0, optG = 0, optB = 0;

      if (isHouse) {
        // High double-bounce reflection
        sarVal = applySpeckle(240, 0.08, rng);
        optR = 210; optG = 215; optB = 225; // Light concrete roof
      } else if (isRoad) {
        sarVal = applySpeckle(170, 0.12, rng);
        optR = 150; optG = 145; optB = 140; // Embankment gravel
      } else if (isMainWater) {
        // Pure specular reflection (black in SAR)
        sarVal = applySpeckle(18, 0.25, rng);
        optR = 30; optG = 75; optB = 135; // Deep silty water
      } else if (isFloodInundation) {
        // Shallow muddy flood water with emergent weeds
        sarVal = applySpeckle(38, 0.35, rng);
        optR = 55; optG = 95; optB = 120; // Turbid flood water
      } else if (isMudZone) {
        // Saturated soil
        sarVal = applySpeckle(85, 0.3, rng);
        optR = 110; optG = 95; optB = 65; // Wet brown mud
      } else {
        // Surrounding agricultural vegetation & trees
        const vegNoise = Math.sin(x / 12) * Math.cos(y / 12);
        sarVal = applySpeckle(125 + vegNoise * 20, 0.28, rng);
        optR = 40 + Math.floor(rng() * 15);
        optG = 130 + Math.floor(rng() * 30);
        optB = 45 + Math.floor(rng() * 15);
      }

      // Fill SAR Grayscale
      sarImgData.data[idx] = sarVal;
      sarImgData.data[idx + 1] = sarVal;
      sarImgData.data[idx + 2] = sarVal;
      sarImgData.data[idx + 3] = 255;

      // Fill Optical Reference RGB
      optImgData.data[idx] = optR;
      optImgData.data[idx + 1] = optG;
      optImgData.data[idx + 2] = optB;
      optImgData.data[idx + 3] = 255;
    }
  }

  sarCtx.putImageData(sarImgData, 0, 0);
  optCtx.putImageData(optImgData, 0, 0);

  return {
    sarDataUrl: sarCanvas.toDataURL("image/png"),
    optDataUrl: optCanvas.toDataURL("image/png")
  };
}

// 2. COASTAL & PORT BENCHMARK GENERATOR
function generateCoastalBenchmark(w, h) {
  const sarCanvas = document.createElement('canvas');
  const optCanvas = document.createElement('canvas');
  sarCanvas.width = optCanvas.width = w;
  sarCanvas.height = optCanvas.height = h;

  const sarCtx = sarCanvas.getContext('2d');
  const optCtx = optCanvas.getContext('2d');

  const sarImgData = sarCtx.createImageData(w, h);
  const optImgData = optCtx.createImageData(w, h);

  const rng = createPRNG(999);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      // Coastline diagonal boundary
      const coastLine = w * 0.45 + (y * 0.35) + Math.sin(y / 40) * 18;
      const isOcean = x < coastLine;

      // Shipping vessels in ocean
      const isShip1 = (Math.abs(x - 90) < 16 && Math.abs(y - 120) < 6);
      const isShip2 = (Math.abs(x - 140) < 20 && Math.abs(y - 280) < 7);
      const isShip3 = (Math.abs(x - 80) < 14 && Math.abs(y - 400) < 5);
      const isShip = isShip1 || isShip2 || isShip3;

      // Harbor Pier / Jetty jutting into water
      const isPier = (x > coastLine - 65 && x < coastLine && Math.abs(y - 220) < 18);

      let sarVal = 0;
      let optR = 0, optG = 0, optB = 0;

      if (isShip) {
        sarVal = applySpeckle(255, 0.05, rng); // Extreme steel radar cross-section
        optR = 240; optG = 240; optB = 245;
      } else if (isPier) {
        sarVal = applySpeckle(220, 0.1, rng);
        optR = 175; optG = 175; optB = 180;
      } else if (isOcean) {
        // Ocean surface with slight wind capillary waves
        const wave = Math.sin(x / 6 + y / 4) * 8;
        sarVal = applySpeckle(22 + wave, 0.35, rng);
        optR = 15; optG = 65; optB = 115;
      } else {
        // Land side: Urban buildings vs coastal greenery
        const distFromCoast = x - coastLine;
        const isMangrove = distFromCoast < 35 && (Math.sin(y / 20) > -0.2);
        
        // Urban grid
        const gridX = Math.floor(x / 24);
        const gridY = Math.floor(y / 24);
        const isBuilding = ((x % 24 > 5) && (y % 24 > 5)) && ((gridX + gridY) % 3 !== 0);

        if (isMangrove) {
          sarVal = applySpeckle(110, 0.25, rng);
          optR = 20; optG = 100; optB = 40; // Dark green mangrove
        } else if (isBuilding) {
          sarVal = applySpeckle(235, 0.12, rng); // High urban backscatter
          optR = 195; optG = 190; optB = 185; // Concrete/rooftop
        } else {
          // Roads and open ground
          sarVal = applySpeckle(90, 0.22, rng);
          optR = 90; optG = 90; optB = 95; // Asphalt street
        }
      }

      sarImgData.data[idx] = sarVal;
      sarImgData.data[idx + 1] = sarVal;
      sarImgData.data[idx + 2] = sarVal;
      sarImgData.data[idx + 3] = 255;

      optImgData.data[idx] = optR;
      optImgData.data[idx + 1] = optG;
      optImgData.data[idx + 2] = optB;
      optImgData.data[idx + 3] = 255;
    }
  }

  sarCtx.putImageData(sarImgData, 0, 0);
  optCtx.putImageData(optImgData, 0, 0);

  return {
    sarDataUrl: sarCanvas.toDataURL("image/png"),
    optDataUrl: optCanvas.toDataURL("image/png")
  };
}

// 3. AGRICULTURE BENCHMARK GENERATOR
function generateAgricultureBenchmark(w, h) {
  const sarCanvas = document.createElement('canvas');
  const optCanvas = document.createElement('canvas');
  sarCanvas.width = optCanvas.width = w;
  sarCanvas.height = optCanvas.height = h;

  const sarCtx = sarCanvas.getContext('2d');
  const optCtx = optCanvas.getContext('2d');

  const sarImgData = sarCtx.createImageData(w, h);
  const optImgData = optCtx.createImageData(w, h);

  const rng = createPRNG(777);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      // Irrigation canal cross lines
      const isCanalH = Math.abs(y - h * 0.48) < 6;
      const isCanalV = Math.abs(x - w * 0.6) < 5;
      const isCanal = isCanalH || isCanalV;

      // Field grid
      const fieldCol = Math.floor(x / 64);
      const fieldRow = Math.floor(y / 64);
      const fieldSeed = (fieldCol * 13 + fieldRow * 29) % 7;

      let sarVal = 0;
      let optR = 0, optG = 0, optB = 0;

      if (isCanal) {
        sarVal = applySpeckle(15, 0.2, rng);
        optR = 25; optG = 90; optB = 145;
      } else {
        if (fieldSeed === 0 || fieldSeed === 3) {
          // Lush dense wheat/paddy crop (high volume scattering)
          sarVal = applySpeckle(145, 0.22, rng);
          optR = 35; optG = 150; optB = 40;
        } else if (fieldSeed === 1 || fieldSeed === 4) {
          // Moderate vegetation / young crops
          sarVal = applySpeckle(105, 0.25, rng);
          optR = 95; optG = 165; optB = 55;
        } else if (fieldSeed === 2) {
          // Dry fallow ploughed soil (moderate surface roughness)
          sarVal = applySpeckle(75, 0.28, rng);
          optR = 160; optG = 120; optB = 80;
        } else {
          // Farmstead / hamlet
          sarVal = applySpeckle(215, 0.15, rng);
          optR = 210; optG = 180; optB = 160;
        }
      }

      sarImgData.data[idx] = sarVal;
      sarImgData.data[idx + 1] = sarVal;
      sarImgData.data[idx + 2] = sarVal;
      sarImgData.data[idx + 3] = 255;

      optImgData.data[idx] = optR;
      optImgData.data[idx + 1] = optG;
      optImgData.data[idx + 2] = optB;
      optImgData.data[idx + 3] = 255;
    }
  }

  sarCtx.putImageData(sarImgData, 0, 0);
  optCtx.putImageData(optImgData, 0, 0);

  return {
    sarDataUrl: sarCanvas.toDataURL("image/png"),
    optDataUrl: optCanvas.toDataURL("image/png")
  };
}

// 4. MOUNTAINOUS RIDGE BENCHMARK GENERATOR
function generateMountainBenchmark(w, h) {
  const sarCanvas = document.createElement('canvas');
  const optCanvas = document.createElement('canvas');
  sarCanvas.width = optCanvas.width = w;
  sarCanvas.height = optCanvas.height = h;

  const sarCtx = sarCanvas.getContext('2d');
  const optCtx = optCanvas.getContext('2d');

  const sarImgData = sarCtx.createImageData(w, h);
  const optImgData = optCtx.createImageData(w, h);

  const rng = createPRNG(555);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      // Mountain ridge spine running diagonally
      const ridgeY = h * 0.5 + Math.sin(x / 40) * 50 + (x - w * 0.5) * 0.2;
      const distFromRidge = y - ridgeY;

      let sarVal = 0;
      let optR = 0, optG = 0, optB = 0;

      if (distFromRidge < -30) {
        // Deep radar shadow side (facing away from satellite look angle)
        sarVal = applySpeckle(10, 0.2, rng);
        optR = 30; optG = 45; optB = 30; // Shaded mountain forest
      } else if (distFromRidge >= -30 && distFromRidge < 10) {
        // Bright crest / ridge line (high return)
        sarVal = applySpeckle(240, 0.12, rng);
        optR = 190; optG = 185; optB = 140; // Sunlit rocky crest
      } else if (distFromRidge >= 10 && distFromRidge < 70) {
        // Foreshortened slope facing radar antenna
        sarVal = applySpeckle(185, 0.18, rng);
        optR = 50; optG = 135; optB = 55;
      } else {
        // Valley floor with gentle stream
        const isStream = Math.abs(distFromRidge - 120) < 6;
        if (isStream) {
          sarVal = applySpeckle(16, 0.2, rng);
          optR = 40; optG = 110; optB = 175;
        } else {
          sarVal = applySpeckle(95, 0.25, rng);
          optR = 45; optG = 115; optB = 40;
        }
      }

      sarImgData.data[idx] = sarVal;
      sarImgData.data[idx + 1] = sarVal;
      sarImgData.data[idx + 2] = sarVal;
      sarImgData.data[idx + 3] = 255;

      optImgData.data[idx] = optR;
      optImgData.data[idx + 1] = optG;
      optImgData.data[idx + 2] = optB;
      optImgData.data[idx + 3] = 255;
    }
  }

  sarCtx.putImageData(sarImgData, 0, 0);
  optCtx.putImageData(optImgData, 0, 0);

  return {
    sarDataUrl: sarCanvas.toDataURL("image/png"),
    optDataUrl: optCanvas.toDataURL("image/png")
  };
}
