# Cardiovascular Risk Visualization — Multimodal AI Hackathon 2026, Track A

Predicts coronary artery disease and per-vessel stenosis from patient clinical
data, and maps the predictions onto an interactive 3D heart. The LAD, LCX and
RCA recolour according to their predicted stenosis risk.

> **Decision support and education only.** Not a diagnosis, and not a substitute
> for formal diagnostic imaging.

---

## Repo layout

```
multimodal_ai_hackathon/
├── frontend/                  React + Three.js web app  ← the webpage
│   ├── public/models/         heart_anatomy.glb lives here
│   └── src/
├── anatomy/                   3D model build
│   ├── tools/                 scripts that produce the .glb
│   ├── raw_obj/               129 BodyParts3D .obj files (not in git)
│   └── out/                   build output (not in git)
├── test_ml_model/             model training + evaluation
├── backend/                   FastAPI service (not built yet)
│   ├── ml/
│   └── data/
├── dataset.xlsx               303 patients, 55 features, 4 targets
├── venv/                      Python virtual environment (not in git)
└── README.md
```

---

## Prerequisites

| | version | check with |
|---|---|---|
| Node.js | 18 or newer | `node -v` |
| Python | 3.10 or newer | `python --version` |

Node is only needed for the webpage; Python only for the models and the 3D build.

---

## Running the webpage

This is the main thing. Three commands.

```powershell
cd E:\multimodal_ai_hackathon\frontend
npm install          # first time only, ~1 min
npm run dev
```

Then open **http://localhost:5173** — or Ctrl-click the link the terminal prints.

You should see a beating translucent heart with coloured coronary arteries, a
patient dropdown, a risk gauge and a vessel list. Drag to rotate, scroll to zoom,
click a vessel to inspect it.

`npm run dev` keeps running and hot-reloads on save. Stop it with **Ctrl+C**.

### Checking it will work before you start

The app needs the 3D model file. Confirm it exists:

```powershell
Test-Path E:\multimodal_ai_hackathon\frontend\public\models\heart_anatomy.glb
```

`True` → you're fine. `False` → rebuild it (next section).

---

## Rebuilding the 3D model

Only needed if `heart_anatomy.glb` is missing, or you changed which anatomical
parts belong to which vessel.

```powershell
cd E:\multimodal_ai_hackathon\anatomy

python -m pip install trimesh numpy shapely

# merge the .obj parts into one .glb with named nodes
python tools/build_heart_glb.py --obj-dir ./raw_obj --map tools/vessel_map.json --scheme AUTO --out out/heart_anatomy.glb

# put it where the web app serves it from
Copy-Item out\heart_anatomy.glb ..\frontend\public\models\ -Force
```

`vessel_map.json` is the file that decides which `.obj` files form the LAD, LCX
and RCA. It is already filled in for the 129 files in `raw_obj/`.

Two helper scripts, rarely needed:

```powershell
# list every .obj with its size — use when filenames look unfamiliar
python tools/build_heart_glb.py --obj-dir ./raw_obj --inspect

# find parts that sit inside other parts (drawing the same tissue twice)
python tools/find_overlaps.py --obj-dir ./raw_obj --only FMA84850
```

---

## Running the models

```powershell
cd E:\multimodal_ai_hackathon\test_ml_model
pip install -r requirements.txt

python compare.py        # compare model families   (~3 min)
python tune.py           # pick decision thresholds (~5 min)  -> thresholds.json
python train_final.py    # fit, save, score test set (~1 min) <- thresholds.json
```

**Run them in that order.** `train_final.py` reads the file `tune.py` writes and
refuses to start without it.

**Only `train_final.py` touches the test set.** With 303 patients the test set is
61 people, so the 95% interval around any score is about ±10 points. Running it
repeatedly and keeping the best result turns the test set into a validation set
and the reported number stops meaning anything.

Trained models land in `test_ml_model/models/*.joblib`.

---

## Housekeeping

These are in the repo root and shouldn't be:

```powershell
cd E:\multimodal_ai_hackathon
Remove-Item 3d_files.zip                 # superseded by the extracted folders
Remove-Item package-lock.json            # stray: npm run from the wrong folder
Remove-Item "~`$dataset.xlsx" -EA Ignore  # Excel lock file
```

A `package-lock.json` at the root with no `package.json` beside it means `npm
install` was run one directory too high. Harmless, but it makes npm treat the
root as a project.

`code.py` and `dataset.xlsx` also sit at the root. If `code.py` is earlier model
work, fold it into `test_ml_model/` — two training paths that can disagree is a
bug waiting for the worst possible moment. Same for `dataset.xlsx`: keep one
copy as the source of truth and have the others read from it.

---

## Troubleshooting

**Blank dark canvas, no heart**

The `.glb` is missing or its node names are wrong. Check the file exists, then
open the browser console (F12). React looks up nodes named exactly `LAD`, `LCX`
and `RCA` — if the names differ, nothing renders and nothing errors.

**`'npm' is not recognized`**

Node isn't installed or isn't on PATH. Install from nodejs.org, then open a new
terminal — PATH changes don't apply to already-open ones.

**Port 5173 already in use**

Another dev server is running. Either stop it, or `npm run dev -- --port 5174`.

**`ModuleNotFoundError: No module named 'data'`**

You ran Python with `-I`. That flag strips the script's own folder from the
import path. Use plain `python`.

**pandas can't read `dataset.xlsx`**

Close it in Excel. An open workbook can block reads on Windows and leaves a
`~$dataset.xlsx` lock file behind.

**Heart renders but looks sideways**

Medical datasets are usually Z-up; Three.js is Y-up. Add
`rotation={[-Math.PI/2, 0, 0]}` to the `<group>` in `HeartModel.jsx`.

---

## How it fits together

```
dataset.xlsx
    │
    ▼
test_ml_model/          trains 4 models (Cath, LAD, LCX, RCA)
    │                   outputs calibrated probabilities 0–1
    ▼
backend/                FastAPI /api/predict
    │                   [not built yet — frontend/src/mockPredict.js stands in]
    │                   returns JSON: probability, status, colour per vessel
    ▼
frontend/               reads vessels[name].color_hex
                        paints the matching 3D node

anatomy/  ──builds──>   frontend/public/models/heart_anatomy.glb
                        (one-off; not part of the runtime path)
```

The frontend only ever reads `color_hex` and `risk_level` from the payload, so
replacing the mock with the real backend is a one-line change in `App.jsx`.

---

## Model performance

Cross-validated, 5-fold × 5 repeats:

| target | CV accuracy | ROC-AUC | majority baseline |
|---|---|---|---|
| Cath (overall CAD) | 87.6% | 92.7 | 71.3% |
| LAD | 78.9% | 86.1 | 58.4% |
| LCX | 66.1% | 72.1 | 60.7% |
| RCA | 59.9% | 72.1 | 62.4% |

Cath and LAD carry real signal. LCX and RCA are weak — the clinical features in
this dataset simply do not say much about those two territories, and no model
family tested (including XGBoost and LightGBM) changed that.

Probabilities are Platt-calibrated, so a displayed "88%" means roughly what it
says. Raw random-forest vote fractions were off by about 13 percentage points.

---

## Attribution

3D anatomical meshes derived from **BodyParts3D**, © The Database Center for
Life Science, licensed under **CC BY-SA 2.1 Japan**.
https://dbarchive.biosciencedbc.jp/en/bodyparts3d/

`heart_anatomy.glb` is a derivative work of those meshes and carries the same
CC BY-SA 2.1 Japan licence.

Dataset: Extension of Z-Alizadeh Sani dataset, UCI Machine Learning Repository.

## AI assistance disclosure

[Required by the hackathon rules — fill in which assistants you used and for
what, before submission.]
