# LOOV VISION AI — VERCEL DEPLOYMENT PREPARATION REPORT

**Project Name:** Loov Vision AI  
**Local Project Path:** `D:\Loov_Vision_Ai`  
**Target Deployment Platform:** Vercel  
**Date of Preparation:** October 13, 2026  
**Document Classification:** Internal Technical Deployment Guide  

---

## Executive Summary

This report provides a comprehensive architectural assessment and deployment configuration plan for **Loov Vision AI**. All deployment preparations have been conducted strictly locally within `D:\Loov_Vision_Ai`. 

In compliance with project directives:
- **Zero Application Source Code Changes:** No Python application scripts, inference engines, model weights, UI components, HTML, CSS, or API contracts have been modified or refactored.
- **Zero GitHub / External Operations:** No Git commits, Git pushes, branch modifications, or remote uploads were performed.
- **Minimum Configuration Files Created:** Configured `.vercelignore` and updated `vercel.json` to optimize serverless routing and bundle constraints.
- **Comprehensive Compatibility Audit:** Conducted a rigorous analysis comparing Vercel Serverless Function resource limits against the project's machine learning dependencies and ONNX models.

---

## 1. Original Project Structure

The project represents a multi-modal computer vision and machine learning industrial inspection system for lubricant degradation analysis.

```
D:\Loov_Vision_Ai
├── .env                                  # Local environment secrets (GOOGLE_API_KEY)
├── .env.example                          # Environment template
├── .gitignore                            # Git exclusion rules
├── api/                                  # Vercel Serverless Function entrypoints
│   ├── analyze.py                        # /api/analyze endpoint wrapper
│   ├── index.py                          # Unified fallback API handler
│   ├── report.py                         # /api/report & /api/report/pdf endpoint wrapper
│   └── status.py                         # /api/status & /api/health endpoint wrapper
├── color_pipeline.py                     # Standalone color analysis helper
├── graph/                                # LangGraph State Machine Workflow
│   ├── nodes.py                          # Multi-modal nodes (Gate, ML models, Decision)
│   ├── state.py                          # LubricantState schema definition
│   └── workflow.py                       # LangGraph compilation & edge routing
├── inference/                            # Model inference wrappers
│   ├── color_pipeline.py                 # Two-stage color feature extraction
│   ├── llm_analyzer.py                   # Standalone LLM inference module
│   ├── model_runner.py                   # Master model loader & runner
│   └── onnx_classifier.py                # EfficientNet ONNX session executor
├── logs/                                 # Runtime application logs
├── models/                               # Machine Learning Artifacts
│   ├── color/
│   │   └── color_analysis_pipeline.joblib   # 2.67 MB (Scikit-Learn pipeline)
│   ├── efficientnet/
│   │   ├── class_names.json                 # 0.00 MB (Class labels)
│   │   └── efficientnet_b3_optimized.onnx   # 40.88 MB (ONNX vision backbone)
│   └── texture/
│       ├── texture_random_forest_v4.joblib  # 2.52 MB (Random Forest model)
│       └── texture_v4_features.joblib       # 0.01 MB (GLCM feature extractor)
├── preprocessing/                        # Computer vision image preprocessing
│   ├── color_features.py                 # HSV & CIELAB color space extraction
│   ├── roi_cropper.py                    # Region of Interest square cropping
│   └── texture_features.py               # GLCM surface spatial matrix extraction
├── public/                               # Static Frontend Assets
│   ├── css/
│   │   └── loob-theme.css                # Industrial dark theme styling
│   ├── index.html                        # Single-page application entrypoint
│   └── js/
│       └── app.js                        # React 18 + React Bootstrap UI logic
├── report/                               # Industrial PDF & Analysis Reporting
│   ├── pdf_generator.py                  # ReportLab PDF compilation engine
│   ├── report_builder.py                 # Structured evidence report generator
│   └── report_schema.py                  # Pydantic data models for reports
├── requirements.txt                      # Python dependencies list
├── schemas/                              # Data schemas
│   └── api_models.py                     # Request and response models
├── server.py                             # Local HTTP Server & Core Application Engine
├── tests/                                # Test suites and sample test images
├── venv/                                 # Local Python 3.13 virtual environment
└── vercel.json                           # Vercel deployment routing configuration
```

---

## 2. Recommended Deployment-Ready Structure

To support deployment without moving files or breaking local operations, the project adopts the following deployment layout:

```
D:\Loov_Vision_Ai
├── .vercelignore                          # [CREATED] Excludes venv, tests, cache & logs
├── vercel.json                           # [UPDATED] Configures v2 runtime, functions & rewrites
├── README_DEPLOYMENT.md                  # [CREATED] This comprehensive deployment guide
├── README_DEPLOYMENT.pdf                 # [CREATED] Downloadable offline technical report
├── public/                               # Served automatically as static web root
│   ├── index.html
│   ├── css/loob-theme.css
│   └── js/app.js
├── api/                                  # Serverless function handlers
│   ├── analyze.py
│   ├── index.py
│   ├── report.py
│   └── status.py
├── models/                               # Model binaries (bundled or externalized)
│   ├── color/
│   ├── efficientnet/
│   └── texture/
├── graph/, inference/, preprocessing/    # Internal business logic
├── report/, schemas/                     # Reporting & validation schemas
├── server.py                             # Core server and handler class
└── requirements.txt                      # Dependencies manifest
```

---

## 3. Configuration Files Created or Modified

### 3.1. `.vercelignore` (Created)
Prevents uploading local virtual environments, test files, local logs, and development artifacts to Vercel, reducing deployment upload payload by hundreds of megabytes:

```
# Python Virtual Environments
venv/
.venv/
env/
ENV/

# Python Bytecode & Cache
__pycache__/
*.py[cod]
*$py.class
.pytest_cache/
.coverage

# Tests & Test Images
tests/

# Temporary Uploads & Logs
temp_uploads/
logs/
*.log

# Environment variables & secrets (set via Vercel Project Settings)
.env
.env.local
.env.*.local
*.env

# IDE & Editor files
.vscode/
.idea/
.git/
.gitignore
.DS_Store
Thumbs.db
desktop.ini

# Deployment PDF artifacts
README_DEPLOYMENT.pdf
```

### 3.2. `vercel.json` (Updated)
Maintains 100% of the existing rewrite routes while specifying Version 2 configuration, clean URLs, and serverless resource allocations:

```json
{
  "version": 2,
  "cleanUrls": true,
  "functions": {
    "api/*.py": {
      "memory": 1024,
      "maxDuration": 15
    }
  },
  "rewrites": [
    {
      "source": "/api/analyze",
      "destination": "/api/analyze.py"
    },
    {
      "source": "/api/report/pdf",
      "destination": "/api/report.py"
    },
    {
      "source": "/api/report",
      "destination": "/api/report.py"
    },
    {
      "source": "/api/status",
      "destination": "/api/status.py"
    },
    {
      "source": "/api/health",
      "destination": "/api/status.py"
    },
    {
      "source": "/analyze",
      "destination": "/api/analyze.py"
    },
    {
      "source": "/api/:match*",
      "destination": "/api/index.py"
    }
  ]
}
```

---

## 4. Confirmation of Source Code Preservation

| Component | Status | Details |
| :--- | :--- | :--- |
| **Python Application Code** | **UNCHANGED** | No logic, imports, or algorithms rewritten |
| **Model Weights & Paths** | **UNCHANGED** | ONNX and Joblib files remain in exact `models/` directory |
| **API Request / Response Formats** | **UNCHANGED** | Request bodies, response JSON, and schemas unchanged |
| **LangGraph Workflow** | **UNCHANGED** | State graph, weights (55/15/30), and node order intact |
| **Frontend UI (HTML, CSS, JS)** | **UNCHANGED** | Components, styling, and client behavior preserved |
| **Directory Hierarchy** | **UNCHANGED** | No files moved, renamed, or deleted |

---

## 5. Dependency and Model-Size Concerns

A rigorous audit of the project's dependencies and binaries was conducted:

### 5.1. Model File Inventory
- `models/efficientnet/efficientnet_b3_optimized.onnx`: **40.88 MB**
- `models/color/color_analysis_pipeline.joblib`: **2.67 MB**
- `models/texture/texture_random_forest_v4.joblib`: **2.52 MB**
- `models/texture/texture_v4_features.joblib`: **0.01 MB**
- `models/efficientnet/class_names.json`: **0.00 MB**
- **Total Models Size:** **46.08 MB**

### 5.2. Installed Python Dependencies Inventory (`site-packages`)
- `opencv-python-headless` (`cv2`): **112.40 MB**
- `scipy` (sub-dependency): **108.49 MB**
- `pandas`: **59.38 MB**
- `onnxruntime`: **43.85 MB**
- `scikit-learn` (`sklearn`): **40.44 MB**
- `numpy` & `numpy.libs`: **51.02 MB**
- `scikit-image` (`skimage`): **23.06 MB**
- `Pillow` (`PIL`): **15.29 MB**
- `google-genai` / `langchain`: **14.65 MB**
- `reportlab`: **7.93 MB**
- Other sub-dependencies: **112.98 MB**
- **Total Installed Site-Packages:** **589.53 MB**

### 5.3. The Serverless Size Conflict
- **Total Uncompressed Package Size:** **~635.6 MB** (`589.5 MB` libraries + `46.1 MB` models).
- **Vercel Serverless Function Limit:** AWS Lambda and Vercel enforce an **uncompressed limit of 250 MB** and a **zipped artifact limit of 50 MB**.
- **Assessment:** Packaging the full scientific Python stack into Vercel Serverless Functions exceeds the 250 MB quota by approximately **2.5x**.

---

## 6. Vercel Compatibility Audit Results

| Feature / Requirement | Vercel Serverless Compatibility | Audit Notes |
| :--- | :---: | :--- |
| **Static Frontend (`public/`)** | **100% Compatible (PASSED)** | Instant global Edge CDN delivery, sub-50ms latency. |
| **API Routing (`vercel.json`)** | **100% Compatible (PASSED)** | Rewrites map directly to `api/*.py` functions. |
| **Filesystem Access** | **100% Compatible (PASSED)** | Server uses `/tmp` for image uploads; Vercel provides 512MB writable `/tmp`. |
| **Environment Variables** | **100% Compatible (PASSED)** | `GOOGLE_API_KEY` supported in Vercel Dashboard Settings. |
| **Execution Duration** | **Borderline (15s Limit)** | Analysis completes in 6–9s locally, but cold starts can approach the 15s Hobby limit. |
| **Python ML Bundle Size** | **Incompatible (EXCEEDS LIMIT)** | The 635.6 MB ML stack exceeds Vercel's 250 MB unzipped serverless limit. |

---

## 7. Recommended Production Architecture (Decoupled Standard)

Because Vercel is designed for fast web applications and frontend CDNs rather than heavy C++ machine learning runtimes, attempting to force 635 MB of ONNX and OpenCV libraries into a 250 MB serverless function often leads to build failures.

The standard, battle-tested industry architecture is **Decoupled Deployment**:

```
                       ┌────────────────────────────────────────┐
                       │          USER WEB BROWSER              │
                       └───────────────────┬────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
             HTTP GET / (Static UI)                   HTTP POST /api/analyze
                    │                                             │
                    ▼                                             ▼
       ┌────────────────────────┐                   ┌───────────────────────────┐
       │     VERCEL EDGE CDN    │                   │   VERCEL REWRITE PROXY    │
       │ (Serves public/ files) │                   │  (vercel.json rewrites)   │
       └────────────────────────┘                   └─────────────┬─────────────┘
                                                                  │
                                                                  ▼
                                                    ┌───────────────────────────┐
                                                    │   DEDICATED AI BACKEND    │
                                                    │ (Render / Railway / Fly)  │
                                                    │  • Docker / Native Python │
                                                    │  • No 250MB Size Limit    │
                                                    │  • Full ONNX & OpenCV ML  │
                                                    └───────────────────────────┘
```

### Advantages of Decoupled Deployment
1. **Zero Cold-Start Failures:** The backend container keeps models warm in memory.
2. **No Size Restrictions:** Full ONNX, OpenCV, and Scikit-Learn libraries run without pruning.
3. **Seamless to the User:** The frontend still communicates through `/api/analyze` on your custom Vercel domain; Vercel transparently proxies the request to the AI container.

---

## 8. Local Project Validation Results

All checks were executed locally against `D:\Loov_Vision_Ai` without modifying application code:

| Test Item | Verification Command | Status |
| :--- | :--- | :---: |
| **Configuration Syntax** | Python `json.load(open('vercel.json'))` | **PASSED** (Valid JSON, 7 rewrites) |
| **Model Binaries** | Existence & file size checks in `models/` | **PASSED** (All 5 files verified) |
| **Serverless Entrypoints** | File integrity checks in `api/*.py` | **PASSED** (All 4 files present) |
| **Frontend Static Files** | HTML, CSS, and JS file size checks | **PASSED** (All assets verified) |
| **Backend Pipeline Import** | Python `import server` & workflow compile | **PASSED** (LangGraph compiled) |
| **End-to-End Analysis** | Live HTTP POST to `/api/analyze` | **PASSED** (HTTP 200 in ~9.4s) |
| **PDF Report Generation** | Live HTTP GET to `/api/report/pdf` | **PASSED** (333 KB PDF produced) |

---

## 9. Step-by-Step Manual Deployment Instructions

*(No GitHub push or automated actions will be taken. Follow these steps when you are ready to deploy manually.)*

### Approach 1: Deploying Directly to Vercel (Using Vercel CLI)

#### Step 1: Install Node.js & Vercel CLI (If not installed)
1. Download and install Node.js (LTS version) from [https://nodejs.org/](https://nodejs.org/).
2. Open PowerShell in `D:\Loov_Vision_Ai` and install the Vercel CLI globally:
   ```powershell
   npm install -g vercel
   ```

#### Step 2: Log In to Vercel
In PowerShell, run:
```powershell
vercel login
```
Follow the browser prompt to authenticate with your Vercel account.

#### Step 3: Run a Preview Deployment
From `D:\Loov_Vision_Ai`, execute:
```powershell
vercel
```
- Set up and deploy: `Y`
- Which scope: Select your personal or team account
- Link to existing project: `N`
- Project name: `loov-vision-ai`
- In which directory is your code located: `./`
- Want to modify settings: `N`

#### Step 4: Configure Environment Variables
In the Vercel Web Dashboard (or via CLI):
1. Navigate to **Project Settings** > **Environment Variables**.
2. Add:
   - **Key:** `GOOGLE_API_KEY`
   - **Value:** `AIzaSy...` (your Google Gemini API key)
   - **Environments:** Production, Preview, Development

#### Step 5: Run Production Deployment
Once preview validation is confirmed, deploy to production:
```powershell
vercel --prod
```

---

### Approach 2: Deploying the Recommended Decoupled Backend (Render + Vercel)

If Vercel exceeds the 250 MB Lambda bundle size during Step 3, use this recommended 2-step setup:

#### Step 1: Deploy Python Backend to Render.com (Free / Starter Tier)
1. Sign up at [https://render.com/](https://render.com/).
2. Create a **New Web Service**.
3. Select your local folder (or private Git repo if desired) or use Render CLI.
4. Settings:
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python server.py 10000`
   - **Environment Variable:** `GOOGLE_API_KEY = your_key_here`
5. Render will assign you a URL: `https://loov-vision-backend.onrender.com`.

#### Step 2: Update `vercel.json` Proxy in 10 Seconds
In `D:\Loov_Vision_Ai\vercel.json`, simply route API calls to your Render URL:
```json
{
  "version": 2,
  "cleanUrls": true,
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://loov-vision-backend.onrender.com/api/:path*"
    }
  ]
}
```
Now, deploy the frontend to Vercel:
```powershell
vercel --prod
```
The frontend will deploy in under 15 seconds, and all AI queries will route directly to your unconstrained backend!

---

## 10. Summary of Files Created During Preparation

| File Path | Action | Description |
| :--- | :---: | :--- |
| [`D:\Loov_Vision_Ai\.vercelignore`](file:///d:/Loov_Vision_Ai/.vercelignore) | **Created** | Excludes virtual environments, test data, cache, and logs |
| [`D:\Loov_Vision_Ai\vercel.json`](file:///d:/Loov_Vision_Ai/vercel.json) | **Updated** | Added version 2, memory/duration limits, and preserved rewrites |
| [`D:\Loov_Vision_Ai\README_DEPLOYMENT.md`](file:///d:/Loov_Vision_Ai/README_DEPLOYMENT.md) | **Created** | Master deployment preparation report |
| [`D:\Loov_Vision_Ai\README_DEPLOYMENT.pdf`](file:///d:/Loov_Vision_Ai/README_DEPLOYMENT.pdf) | **Created** | Offline downloadable PDF version of this report |

---

*Report generated locally by Antigravity AI Engineering Suite.*
