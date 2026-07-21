# Photoshop Slice Naming Plugin

This workspace now includes a Photoshop-oriented naming and export plugin scaffold.

## Main folders

- `photoshop-plugin/shared`
- `photoshop-plugin/uxp`
- `photoshop-plugin/cep`
- `tests`

## Local preview

Open `index.html` in a browser to preview the panel with a mock Photoshop adapter.

## Notes

- Generated names still default to the `UI` prefix.
- Validation does not require the name to start with `UI`.
- Duplicate checks look at both document targets and local history.
