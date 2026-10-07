#!/usr/bin/env python3
"""
auto_map.py — generate vessel_map.json automatically from whatever your files
are actually called.

BodyParts3D hands out filenames in at least three different shapes depending on
which button you pressed:
    BP9548.obj
    MM420.obj
    FJ1234_BP9548_FMA3862_anterior_interventricular_branch.obj

Rather than make you hand-match 154 of them, this reads whatever ID or words
the filename contains, resolves it to an anatomical name (using the
parts-list .txt from BodyParts3D when an FMA/BP id is present), and sorts each
file into LAD / LCX / RCA / Conduction / Heart.

Usage:
  python3 tools/auto_map.py --obj-dir ./raw_obj --out tools/vessel_map.json
  python3 tools/auto_map.py --obj-dir ./raw_obj --parts-list ./partof_parts_list_e.txt
"""

import argparse
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

ID_RE = re.compile(r"\b(FMA\d+|BP\d+|MM\d+)\b", re.IGNORECASE)


def classify(name: str) -> str:
    """Map an anatomical name to a group. Order matters — most specific first."""
    n = name.lower()

    # --- arteries that merely MENTION conduction tissue -----------------------
    # "Atrioventricular node branch of right coronary artery" and "Sinoatrial
    # nodal branch of right coronary artery" are ARTERIES. They have to be
    # caught before the conduction rules, or a vessel ends up uncolourable.
    if ("node branch" in n or "nodal branch" in n) and "coronary artery" in n:
        return "RCA" if "right coronary" in n else "LCX" if "circumflex" in n else "LAD"

    # --- cardiac veins ------------------------------------------------------
    # Kept apart from the arteries so they can render blue. If they land in
    # "Heart" they read as arteries and mislead anyone looking at the demo.
    if "cardiac vein" in n or "coronary sinus" in n or "marginal vein" in n \
       or n.endswith(" vein") or "venous" in n:
        return "Veins"

    # --- conduction tissue --------------------------------------------------
    if ("atrioventricular bundle" in n or "atrioventricular node" in n
            or "sinuatrial node" in n or "sinoatrial node" in n
            or "sinu-atrial node" in n or "internodal" in n
            or "bundle of his" in n or "purkinje" in n):
        return "Conduction"

    # --- LCX territory ------------------------------------------------------
    if "circumflex" in n and "femoral" not in n and "humeral" not in n and "scapular" not in n:
        return "LCX"
    if "left marginal" in n:
        return "LCX"
    # In a left-dominant heart the PDA comes off the circumflex.
    if "posterior interventricular" in n and "left coronary" in n:
        return "LCX"

    # --- LAD territory ------------------------------------------------------
    if "anterior interventricular" in n or "anterior descending" in n:
        return "LAD"
    if "anterior septal branch" in n:
        return "LAD"
    if "diagonal branch" in n:
        return "LAD"

    # --- RCA territory ------------------------------------------------------
    if "right coronary" in n or "right conus" in n:
        return "RCA"
    if "posterior interventricular" in n:          # right-dominant PDA
        return "RCA"

    # --- left main ----------------------------------------------------------
    # "Stem of left coronary artery" is the same thing as "trunk of" — the
    # dataset uses both words.
    if ("trunk of left coronary" in n or "stem of left coronary" in n
            or n.strip() == "left coronary artery"):
        return "LeftMain"

    # --- everything else is scenery ----------------------------------------
    return "Heart"


def load_lookup(parts_list: Path | None):
    """id -> english name, from a BodyParts3D parts_list .txt (tab separated)."""
    lookup = {}
    if not parts_list or not parts_list.exists():
        return lookup
    with open(parts_list, encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        header = next(reader, None)
        for row in reader:
            if len(row) < 2:
                continue
            # layouts seen: [concept, representation, en]  or  [id, en]
            name = row[-1].strip()
            for cell in row[:-1]:
                cell = cell.strip()
                if cell:
                    lookup[cell.upper()] = name
    return lookup


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--obj-dir", required=True, type=Path)
    ap.add_argument("--parts-list", type=Path,
                    help="partof_parts_list_e.txt (or the heart5.0i list) — lets "
                         "the script resolve bare BP/FMA ids to names")
    ap.add_argument("--out", type=Path, default=Path("tools/vessel_map.json"))
    ap.add_argument("--scheme-name", default="AUTO")
    args = ap.parse_args()

    lookup = load_lookup(args.parts_list)
    files = sorted(p for p in args.obj_dir.rglob("*.obj"))
    if not files:
        raise SystemExit(f"no .obj files found in {args.obj_dir}")

    groups = defaultdict(list)
    unresolved = []

    for p in files:
        stem = p.stem
        ids = [m.upper() for m in ID_RE.findall(stem)]

        # Best available name: a lookup hit, else the words in the filename.
        name = ""
        for i in ids:
            if i in lookup:
                name = lookup[i]
                break
        if not name:
            words = ID_RE.sub(" ", stem).replace("_", " ").replace("-", " ")
            name = " ".join(words.split())

        if not name:
            unresolved.append(stem)
            name = stem

        group = classify(name)
        groups[group].append(stem)
        if group == "Heart" and not name.strip():
            unresolved.append(stem)

    order = ["LAD", "LCX", "RCA", "LeftMain", "Veins", "Conduction", "Heart"]
    out_map = {args.scheme_name: {g: sorted(groups[g]) for g in order if groups.get(g)}}

    # Preserve any schemes already in the file.
    if args.out.exists():
        try:
            existing = json.loads(args.out.read_text())
            existing.update(out_map)
            out_map = existing
        except json.JSONDecodeError:
            pass

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out_map, indent=2))

    print(f"scanned {len(files)} file(s) in {args.obj_dir}\n")
    for g in order:
        if groups.get(g):
            print(f"  {g:<11} {len(groups[g]):>4} file(s)")
            if g != "Heart":
                for s in sorted(groups[g]):
                    print(f"                {s}")
    print(f"\nwrote scheme '{args.scheme_name}' to {args.out}")
    if not lookup:
        print("\nNOTE: no --parts-list given, so grouping relied on words in the\n"
              "filenames. If your files are bare ids (MM420.obj), everything will\n"
              "have landed in 'Heart' — pass --parts-list, or fix by hand.")
    print("\nCheck the LAD/LCX/RCA lists above before building. Those three are the\n"
          "only groups the ML output touches, so they are the ones worth eyeballing.")


if __name__ == "__main__":
    main()
