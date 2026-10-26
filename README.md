# AI-Based SAR Image Translation and Terrain Analysis

[![Status](https://img.shields.io/badge/Status-Academic_Prototype-teal.svg)](#)
[![Data](https://img.shields.io/badge/Data-Sentinel--1_SAR_&_Sentinel--2-blue.svg)](#)
[![Architecture](https://img.shields.io/badge/Architecture-CNN_Encoder--Decoder_+_U--Net-indigo.svg)](#)
[![License](https://img.shields.io/badge/License-Academic_Research-green.svg)](#)

---

## 1. Project Overview & Abstract

Synthetic Aperture Radar (SAR) satellites (such as **Sentinel-1**) emit active microwave pulses capable of penetrating cloud cover, smoke, haze, and precipitation, operating 24 hours a day regardless of sunlight. This makes SAR indispensable during monsoons, severe cyclones, and flood disasters.

However, raw SAR images are notoriously difficult for humans and non-specialists to interpret. They represent physical surface roughness, geometric corner reflections, and dielectric moisture as grainy, grayscale speckle patterns rather than familiar optical colors (e.g. water looks pitch black due to specular reflection; buildings appear blindingly bright).

This academic project tackles this challenge through a **two-stage architecture**:
1. **SAR Image Translation (Base-Paper Colourization):** Uses a deep Convolutional Neural Network (CNN) Encoder-Decoder trained on paired Sentinel-1 SAR and Sentinel-2 optical imagery to translate radar inputs into intuitive, optical-like color representations in the CIE Lab color space.
2. **Terrain Analysis (Proposed Innovation):** Extends beyond visual colourization by deploying a **U-Net semantic segmentation network** to identify, delineate, and calculate the exact acreage of functional terrain classes (water bodies/floods, vegetation/forests, built-up urban zones, and bare land).

### Target Audience & Impact
- **Scientists & Geospatial Researchers:** High-throughput radar interpretation without cloud obstruction.
- **Environmental Monitoring Teams:** Automated deforestation and wetland degradation tracking.
- **Disaster Response & Relief Teams:** Rapid all-weather flood inundation mapping.
- **ASHA & Community Frontline Workers:** Accessible, plain-language visual maps identifying isolated hamlets and impassable waterlogged roads during monsoon emergencies.

---

## 2. Key System Architecture & Workflow

The end-to-end workflow follows a 7-stage pipeline:

```
[Satellite Acquisition (Sentinel-1 SAR + Sentinel-2)]
                       │
                       ▼
             [SAR Image Input (VV/VH)]
                       │
                       ▼
           [Preprocessing & Despeckling]
   (Lee Filter, Sigma-0 Calibration, Range-Doppler)
                       │
                       ▼
         [CNN Encoder-Decoder Model (PyTorch)]
    (Multi-scale feature extraction & bottleneck)
                       │
                       ▼
       [Optical-like Image Generation (CIE Lab)]
      (L* from radar + synthesized a*, b* channels)
                       │
                       ▼
       [Semantic Segmentation Network (U-Net)]
 (Skip-connection segmentation of terrain classes)
                       │
                       ▼
   [Decision-Support Outputs & Inundation Metrics]
```

### Paired Data Requirement for Supervised Training
Supervised training of the translation CNN requires **coregistered pairs of Sentinel-1 (C-band SAR) and Sentinel-2 (optical MSI)** captured over the same geographic coordinates with minimal temporal difference (&plusmn;3 days) and 0% cloud cover in the optical pair. Benchmark datasets such as **SEN12MS** and **SpaceNet-6** serve as candidate training repositories.

---

## 3. Interactive Web Demo Features

The project includes an interactive, zero-barrier demonstration workbench:
- **Benchmark Satellite Presets:** Pre-configured scenes including **Assam River Flood Basin**, **Mumbai Coastal Port**, **Punjab Farmland & Canals**, and **Western Ghats Mountain Ridges**.
- **Custom Image Upload:** Accepts **PNG, JPG, and TIFF** formats (with built-in client-side TIFF decoder).
- **Adaptive Speckle Filtering:** Implements the local-variance weighted **Lee Filter** ($3 \times 3$ kernel) to suppress radar multiplicative noise while preserving crisp structural edges.
- **Dynamic Range Optimization:** CLAHE (Contrast Limited Adaptive Histogram Equalization) and gamma dynamic-range stretching.
- **Optical Translation Simulation:** Generates synthetic optical hues based on radar backscatter intensity and spatial context.
- **Preliminary Region Clustering:** Real, client-side unsupervised **K-Means algorithm** on pixel intensity ($K=3, 4, 5, 6$) with cluster percentage breakdowns.
- **Dual Display Modes:**
  - **Split View:** Interactive, draggable before/after curtain slider.
  - **Side-by-Side:** Simultaneous dual display for detailed inspection.
- **Intensity Histogram:** 256-bin real-time backscatter distribution with calibrated dB scale ($-28\text{ dB}$ to $+6\text{ dB}$).
- **Export Result:** Download processed visualizations directly to PNG.

---

## 4. Academic Integrity & Transparency Disclaimers

> [!IMPORTANT]
> **Demo vs Deep Learning Distinction:**
> The interactive web demonstration runs real local signal processing algorithms (Adaptive Lee Filter, CLAHE, and K-Means pixel clustering). This serves as an accessible conceptual demonstration of satellite image analysis and is **explicitly distinguished from the planned deep learning pipeline** (CNN Encoder-Decoder + U-Net) which requires offline GPU training on massive paired datasets.

> [!WARNING]
> **Safety & Emergency Notice:**
> This system provides visual interpretation support only. It **does not predict disasters**, does not establish medical diagnoses or disease risks, and **must never replace official warnings** from national meteorological and disaster management authorities (e.g., NDMA, IMD).

---

## 5. Technology Stack

| Component | Technology | Role |
|---|---|---|
| **Programming Language** | Python 3.9+ | Core scientific computing and pipeline development |
| **Deep Learning** | PyTorch & Torchvision | CNN Encoder-Decoder & U-Net neural training |
| **Colour Space** | CIE Lab | Decoupling radar luminance ($L^*$) from chromaticity ($a^*, b^*$) |
| **Computer Vision** | OpenCV & NumPy | Matrix operations, despeckling, CLAHE, and array manipulation |
| **Frontend UI** | HTML5, CSS3 (Navy/Teal), JS | Responsive, dependency-free interactive web application |
| **Satellite Sensors** | Sentinel-1 & Sentinel-2 | ESA Copernicus SAR & Multispectral satellite data |
| **Training Datasets** | SEN12MS / SpaceNet-6 | Paired SAR-Optical research benchmarks |

---

## 6. Project Directory Structure

```
sar-translation-terrain-analysis/
├── index.html                  # Main responsive web portal & interactive workbench
├── assets/
│   ├── css/
│   │   ├── styles.css          # Navy blue, teal, white design tokens & layout
│   │   └── demo.css            # Split slider, workbench, canvas, and cluster legend styles
│   ├── js/
│   │   ├── samples.js          # Realistic procedural SAR & Optical paired benchmark generator
│   │   ├── demo.js             # Image processing engine (Lee filter, CLAHE, K-Means, Slider)
│   │   └── main.js             # Navbar, scroll spy, plain-English mode toggle, workflow viewer
│   └── images/                 # Satellite icons and static graphics
├── backend/
│   ├── server.py               # Zero-dependency Python HTTP & REST API server
│   ├── api_fastapi.py          # Optional FastAPI backend alternative
│   ├── api_flask.py            # Optional Flask backend alternative
│   └── requirements.txt        # Optional scientific libraries (PyTorch, OpenCV, FastAPI)
├── run_server.bat              # One-click Windows runner script
└── README.md                   # Academic project documentation
```

---

## 7. Setup & Execution Instructions

### Option A: One-Click Execution (Windows)
Double-click `run_server.bat`. This will:
1. Start the zero-dependency Python server on port `8000`.
2. Automatically open your default web browser to `http://localhost:8000`.

### Option B: Command Line (Windows / Linux / macOS)
1. Open terminal and navigate to the project root directory:
   ```bash
   cd path/to/sar-translation-terrain-analysis
   ```
2. Start the built-in server:
   ```bash
   python backend/server.py
   ```
3. Open your browser and navigate to:
   ```
   http://127.0.0.1:8000
   ```

### Option C: Standalone In-Browser (No Python Required)
You can directly open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Firefox, Safari). All interactive features (sample generators, Lee speckle filtering, CLAHE, and K-Means clustering) run natively via HTML5 Canvas and JavaScript without requiring any external internet connection or software installation.

---

## 8. Academic References & Citations

1. **Copernicus Sentinel-1:** European Space Agency (ESA) Sentinel-1 SAR User Guide.
2. **SEN12MS Dataset:** Schmitt, M., Hughes, L. H., & Zhu, X. X. (2019). *SEN12MS -- A Curated Dataset of Georeferenced Multi-Spectral Sentinel-1/2 Imagery for Deep Learning and Data Fusion.* arXiv:1906.07789.
3. **U-Net:** Ronneberger, O., Fischer, P., & Brox, T. (2015). *U-Net: Convolutional Networks for Biomedical Image Segmentation.* MICCAI.
4. **SAR Speckle Filtering:** Lee, J. S. (1980). *Digital image enhancement and noise filtering by use of local statistics.* IEEE Transactions on Pattern Analysis and Machine Intelligence.
