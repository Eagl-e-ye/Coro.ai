# Anatomical Model Attribution

The 3D heart model is derived from **BodyParts3D**, © The Database Center for Life Science (DBCLS), licensed under [CC Attribution-Share Alike 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/).

**Changes made:** individual anatomical `.obj` meshes were selected, classified by coronary territory (LAD / LCX / RCA / Left Main / veins / conduction system / myocardium), de-duplicated, merged into named nodes, and exported as a single `.glb` file for use with WebGL.

The derived `.glb` in this repository is a derivative work and is therefore also licensed under **CC BY-SA 2.1 Japan**. Source: https://lifesciencedb.jp/bp3d/

## Licence split in the repository

- **Source code** — MIT (see `LICENSE`)
- **3D anatomical assets** (`*.glb`, `*.obj`) — CC BY-SA 2.1 Japan, inherited from BodyParts3D
- **Dataset** — Z-Alizadeh Sani extension, UCI Machine Learning Repository; see original terms
