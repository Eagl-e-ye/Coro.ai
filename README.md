# Coro.ai — Cardiovascular Risk Visualization & Prediction

Multimodal AI Hackathon 2026 · Track A

Predicts coronary artery disease and per-vessel stenosis (LAD / LCX / RCA) from routine clinical data, and maps each prediction onto an interactive 3D heart with per-patient explanations.

> **Research prototype. Not a medical device. Not for clinical decision-making or formal diagnosis.**

## Live demo
**TODO_LIVE_URL**

## Demonstration video
**TODO_VIDEO_URL**

## Where to find each deliverable

| # | Deliverable | Where |
|---|---|---|
| 1 | Working software prototype | **TODO_LIVE_URL** · run locally: *Quick start* below |
| 2 | Trained prediction pipeline | [`backend/ml/final_model/`](file:///e:/multimodal_ai_hackathon/backend/ml/final_model/) — code, weights, `MODEL_CARD.md`, `verify_models.py` |
| 3 | Clinical explanation dashboard | In the app: vessel cards, SHAP drivers, global importance, and the **Model performance** page |
| 4 | Project documentation (6 pp.) | [`docs/Coro_ai_Documentation.pdf`](file:///e:/multimodal_ai_hackathon/docs/Coro_ai_Documentation.pdf) |
| 5 | Demonstration video | **TODO_VIDEO_URL** |

## Results

| Target | Accuracy | 95% CI | Recall | Precision | F1 | ROC-AUC | Majority Baseline |
|---|---|---|---|---|---|---|---|
| Cath (Overall CAD) | 86.9% | 78.4–95.4% | 97.7% | 85.7% | 91.3% | 0.873 | 71.3% |
| LAD (Left Anterior Descending) | 72.1% | 60.9–83.4% | 94.1% | 68.1% | 79.0% | 0.798 | 58.4% |
| LCX (Left Circumflex) | 59.0% | 46.7–71.4% | 76.9% | 51.3% | 61.5% | 0.698 | 60.7% |
| RCA (Right Coronary Artery) | 50.8% | 38.3–63.4% | 85.0% | 38.6% | 53.1% | 0.712 | 62.4% |

Held-out test set, n = 61. Thresholds for LCX (0.32) and RCA (0.30) are set to a recall floor rather than to maximise accuracy — see [`MODEL_CARD.md`](file:///e:/multimodal_ai_hackathon/docs/MODEL_CARD.md) for what that trades away, including why RCA sits below its majority-class baseline on accuracy.

Reproduce every figure above from the committed weights:
```bash
cd backend/ml/final_model
python verify_models.py
```

## Quick start

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Start the FastAPI backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend health check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 2. Start the React frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

## Architecture

- **Backend:** FastAPI service serving 4 calibrated Random Forest classifiers wrapped with `CalibratedClassifierCV(method='sigmoid')`, per-patient SHAP explanations via `TreeExplainer`, feature engineering (`Lipid_Risk_Ratio`, `ECG_Abnormality_Count`, `Anterior_Risk_Score`), and `GET /api/model-info` for validation metrics.
- **Frontend:** React 19 + Vite application with React Three Fiber (`@react-three/fiber` and `@react-three/drei`) rendering the interactive 3D coronary vascular tree with real-time risk recolouring.
- **Contract & Guards:** Debounced updates with in-flight `AbortController` cancellation, read-only patient baseline records, intervention What-If sliders, and isolated PDF report printing.

## Anatomical model attribution

The 3D heart model is derived from **BodyParts3D**, © The Database Center for Life Science (DBCLS), licensed under [CC Attribution-Share Alike 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/).

**Changes made:** individual anatomical `.obj` meshes were selected, classified by coronary territory (LAD / LCX / RCA / Left Main / veins / conduction system / myocardium), de-duplicated, merged into named nodes, and exported as a single `.glb` file for use with WebGL.

The derived `.glb` in this repository is a derivative work and is therefore also licensed under **CC BY-SA 2.1 Japan**. Source: https://lifesciencedb.jp/bp3d/

## Licence

- **Source code** — MIT (see [`LICENSE`](file:///e:/multimodal_ai_hackathon/LICENSE))
- **3D anatomical assets** (`*.glb`, `*.obj`) — CC BY-SA 2.1 Japan, inherited from BodyParts3D (see [`ATTRIBUTION.md`](file:///e:/multimodal_ai_hackathon/ATTRIBUTION.md))
- **Dataset** — Z-Alizadeh Sani extension, UCI Machine Learning Repository; see original terms

## AI assistance disclosure

This project was built with the help of AI coding assistants.

**What AI was used for:**
- Planning and specification: the build was broken into phased specs that the agents followed, kept under version control alongside the code in [`docs/build-process/`](file:///e:/multimodal_ai_hackathon/docs/build-process/).
- Code generation: substantial parts of the FastAPI backend, the React frontend, and the 3D asset pipeline were drafted by AI agents against those specs.
- Debugging and review: tracing failures, and reviewing decisions — including catching a risk-tier function that disagreed with the backend's thresholds across up to 20% of the probability range.

**What the team decided:**
- The modelling approach: calibrated random forests, the nested-CV threshold procedure, and the recall-floor objective for LCX and RCA.
- Which features to drop, and why `St Elevation` was retained on clinical grounds while `Diastolic Murmur` was dropped for a clinically backwards direction.
- The decision never to fill missing fields with best-case values, after measuring the effect.
- All interface and clinical-safety decisions: read-only patient records, intervention-only sliders, and the rule that the tool describes the model and never prescribes care.

**Verification:** Every reported metric is produced by the training scripts in this repository and read from `final_report.json` at runtime — no figure in the interface or the documentation is typed in by hand.

## Reproducibility

`scikit-learn` is pinned to `1.9.1` in `requirements.txt`. The calibrated probabilities — and therefore the decision thresholds in `thresholds.json` — shift between scikit-learn versions, so an unpinned install will silently produce different results from the ones reported here.

To reproduce the trained models from scratch:
```bash
cd backend/ml/final_model
python tune.py          # nested CV -> writes thresholds.json
python train_final.py   # reads thresholds.json -> writes models/*.joblib + final_report.json
python verify_models.py # verifies committed weights against final_report.json
```
