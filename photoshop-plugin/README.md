# Photoshop Slice Naming Plugin

This plugin scaffold provides:

- a shared naming core in `shared`
- a UXP panel in `uxp`
- a CEP panel in `cep`

## Behavior

- Generated names default to `UI + Keyword + ComponentType + State + Number + Size`
- Validation allows letters, numbers, and underscores
- Validation checks duplicate names against both Photoshop targets and local history
- Validation checks banned word risk
- Rename and export requires explicit confirmation

## Preview

Open the workspace root `index.html` to preview the panel in a browser with a mock adapter.

## UXP

- Plugin entry: `uxp/index.html`
- Manifest: `uxp/manifest.json`

## CEP

- Panel entry: `cep/index.html`
- Manifest: `cep/CSXS/manifest.xml`
- Host bridge: `cep/host/ps-host.jsx`

## Notes

- UXP export uses Photoshop batchPlay to export the selected target as PNG.
- CEP export uses ExtendScript save-for-web export on the active document after renaming the selected target.
- Host-side Photoshop behavior could need small adjustments depending on the Photoshop version in use.
