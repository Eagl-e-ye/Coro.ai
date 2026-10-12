# Submission checklist — Track A

Five deliverables. Tick only what you have actually opened and checked.

---

## 1. Working Software Prototype
*"A web-based application featuring the interactive 3D viewer integrated with the
ML model backend."*

- [ ] Deployed URL opens in a **logged-out / incognito** browser
- [ ] A prediction completes end-to-end on the deployed version, not just locally
- [ ] If the host sleeps on idle, warm it up before judging and say so in the
      video description
- [ ] Clinical disclaimer visible in every frame (explicitly required: *"clear,
      visible visual disclaimers … decision support / educational purposes only
      and not a substitute for formal diagnostic imaging"*)
- [ ] No console errors on a fresh load

---

## 2. Trained Prediction Pipeline
*"Clean code and model weights for cardiac risk and multi-vessel stenosis
classification."*

- [ ] `models/*.joblib` committed and **are real files, not LFS pointers**
      (`ls -lh` → megabytes, not ~130 bytes)
- [ ] `tune.py`, `train_final.py`, `data.py` present and runnable
- [ ] `thresholds.json` and `final_report.json` committed
- [ ] `scikit-learn==1.9.1` pinned in `requirements.txt`
- [ ] **Target leakage**: confirm `Cath`, `LAD`, `LCX`, `RCA` are excluded from
      the input features. The brief calls this out specifically (1d). It is worth
      one explicit line in the documentation — judges look for it.

---

## 3. Clinical Explanation Dashboard
*"Interactive display showing prediction metrics, feature importances
(SHAP/LIME), and patient physiological breakdowns."*

- [ ] Prediction metrics — the `/model` performance view
- [ ] Feature importances — per-patient SHAP **and** global permutation importance
- [ ] Physiological breakdowns — the patient's own values beside each contribution
- [ ] SHAP bars are **signed**: positive right, negative left. A bar whose length
      ignores sign contradicts the number printed next to it

---

## 4. Project Documentation — max 6 pages
*"Overview of dataset preprocessing, model architecture, 3D pipeline setup, usage
instructions, and evaluation results."*

Five required topics. All five must appear, or you lose marks for a missing
section regardless of how good the others are.

- [ ] Dataset preprocessing
- [ ] Model architecture
- [ ] 3D pipeline setup
- [ ] Usage instructions
- [ ] Evaluation results
- [ ] **6 pages or fewer** — count the actual PDF, cut rather than shrink type

*(In progress — blocked on the re-tuned `final_report.json` and
`thresholds.json`.)*

---

## 5. Demonstration Video — 3–10 min, YouTube
*"Demonstrating the working system, feature input workflow, 3D visualization
interactions, and technical implementation."*

- [ ] All four named elements present
- [ ] Length between 3 and 10 minutes
- [ ] **Unlisted or Public — never Private.** The most common way a submission
      fails is a video nobody can open
- [ ] Link checked in an incognito window
- [ ] Description carries the repo link, the live URL, and timestamps

---

## Repo (Technical Implementation, 10%)

- [ ] **Repository made public** — it was private when checked
- [ ] BodyParts3D CC BY-SA 2.1 JP attribution, in README **and** in the UI
- [ ] Licence split stated: code vs the `.glb` (Share-Alike is viral — the
      derived model inherits CC BY-SA)
- [ ] AI coding assistant disclosure
- [ ] Reproducibility note with the sklearn pin
- [ ] No secrets in git history

---

## Final sweep — 20 minutes, do it as a team

1. **Open everything logged out.** Repo, video, live URL. Every link, from a
   browser with no session. This catches more failures than anything else here.
2. **Load the app fresh and run one patient end to end.** Watch for a stale
   number or a vessel colour that disagrees with its text.
3. **Check one female patient.** The dataset spells it `Fmale`; confirm a female
   patient's probability differs from the same patient as male. Identical numbers
   mean the encoding is silently broken.
4. **Read the documentation out loud once.** Typos survive silent reading.
5. **Confirm every number in the docs and the video matches the live
   `/model` page.** If you re-tuned, old figures may still be sitting in a draft.

---

## Where the marks are, one last time

| criterion | weight | your strongest evidence |
|---|---|---|
| Predictive Performance | 30% | nested CV, calibration, CIs, the honest RCA framing |
| 3D Visualization | 25% | named-vessel BodyParts3D mesh, live recolour, inspection |
| Clinical Interpretability | 20% | SHAP with patient values + global importance |
| System Integration | 15% | debounced, abort-guarded live updates |
| Technical Implementation | 10% | pinned deps, public dataset, proper attribution |

The RCA result is the one place a judge could mark you down hard. Raising it
first, with the confidence interval and the recall-floor reasoning, converts the
weakest number in the project into evidence that you understood it. Make sure it
appears in **all three** of the video, the documentation, and the `/model` page.
