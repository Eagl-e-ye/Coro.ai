# README blocks — ready to paste

Two required sections plus a licence note that is easy to get wrong.

---

## 1. BodyParts3D attribution

**This is a licence obligation, not just a scoring item.** The meshes are
CC BY-SA 2.1 Japan, and **Share-Alike is viral**: your merged `.glb` is a
derivative work, so it must carry the same licence. That is true regardless of
what licence your *code* uses.

Paste into the README, and also keep a separate `ATTRIBUTION.md`:

```markdown
## Anatomical model attribution

The 3D heart model is derived from **BodyParts3D**, © The Database Center for
Life Science (DBCLS), licensed under
[CC Attribution-Share Alike 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/).

**Changes made:** individual anatomical `.obj` meshes were selected, classified
by coronary territory (LAD / LCX / RCA / Left Main / veins / conduction system /
myocardium), de-duplicated, merged into named nodes, and exported as a single
`.glb` file for use with WebGL.

The derived `.glb` in this repository is a derivative work and is therefore also
licensed under **CC BY-SA 2.1 Japan**. Source: https://lifesciencedb.jp/bp3d/
```

### Licence split in the repo

If your code is MIT (or anything else), say so explicitly — otherwise a reader
assumes one licence covers everything, which would be wrong:

```markdown
## Licence

- **Source code** — MIT (see `LICENSE`)
- **3D anatomical assets** (`*.glb`, `*.obj`) — CC BY-SA 2.1 Japan, inherited
  from BodyParts3D (see `ATTRIBUTION.md`)
- **Dataset** — Z-Alizadeh Sani extension, UCI Machine Learning Repository; see
  the original terms
```

### In the UI

The brief's Technical Implementation criterion names "use of public datasets and
anatomical resources". A line in the footer or an info panel is enough:

> `Heart model: BodyParts3D © DBCLS, CC BY-SA 2.1 JP`

---

## 2. AI coding assistant disclosure

Honest, specific and short. A vague disclosure reads worse than none — it looks
like you are minimising.

```markdown
## AI assistance disclosure

This project was built with the help of AI coding assistants.

**What AI was used for**
- Planning and specification: the build was broken into phased specs that the
  agents followed, kept under version control alongside the code.
- Code generation: substantial parts of the FastAPI backend, the React frontend
  and the 3D asset pipeline were drafted by AI agents against those specs.
- Debugging and review: tracing failures, and reviewing our own decisions —
  including catching a risk-tier function that disagreed with the backend's
  thresholds across up to 20% of the probability range.

**What the team decided**
- The modelling approach: calibrated random forests, the nested-CV threshold
  procedure, and the recall-floor objective for LCX and RCA.
- Which features to drop, and why `St Elevation` was retained on clinical grounds
  while `Diastolic Murmur` was dropped for a clinically backwards direction.
- The decision never to fill missing fields with best-case values, after
  measuring the effect.
- All interface and clinical-safety decisions: read-only patient records,
  intervention-only sliders, and the rule that the tool describes the model and
  never prescribes care.

**Verification.** Every reported metric is produced by the training scripts in
this repository and read from `final_report.json` at runtime — no figure in the
interface or the documentation is typed in by hand.
```

Edit the specifics to match what actually happened. Do not overstate the human
side; judges can read the commit history.

---

## 3. Reproducibility note

Technical Implementation names reproducibility. This is two lines and closes it:

```markdown
## Reproducibility

`scikit-learn` is pinned to `1.9.1` in `requirements.txt`. The calibrated
probabilities — and therefore the decision thresholds in `thresholds.json` —
shift between scikit-learn versions, so an unpinned install will silently
produce different results from the ones reported here.

To reproduce the trained models from scratch:

```bash
python tune.py          # nested CV -> writes thresholds.json
python train_final.py   # reads thresholds.json -> writes models/*.joblib + final_report.json
```
```

---

## 4. Check before you push

```bash
# model weights are real files, not LFS pointers
ls -lh backend/ml/**/final_model/models/*.joblib

# the repo is public — open this in a logged-out browser
# https://github.com/Eagl-e-ye/Coro.ai

# no secrets committed
git log --all --full-history -- '*.env' '*secret*' '*key*'
```

A `.joblib` showing ~130 bytes is a Git LFS pointer, not the model. Judges
cloning the repo would get a file that cannot load.
