(function () {
  const HISTORY_KEY = "photoshop-slice-naming-history";

  function readHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveHistory(entries) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  }

  function createMockAdapter() {
    return {
      async getSelectedTarget() {
        return { id: "mock-1", name: "MockArtboard", kind: "artboard" };
      },
      async listExistingTargets() {
        return [{ id: "mock-1", name: "MockArtboard", kind: "artboard" }];
      },
      async getHistoryNames() {
        return readHistory();
      },
      async saveHistoryName(name) {
        saveHistory(PhotoshopNamingCore.addHistoryName(readHistory(), name));
      },
      async renameAndExport(payload) {
        return { exported: true, path: "Mock/" + payload.name + ".png" };
      }
    };
  }

  function detectKind(layer) {
    if (!layer) {
      return "object";
    }
    if (layer.isArtboard) {
      return "artboard";
    }
    if (layer.layers && layer.layers.length >= 0) {
      return "group";
    }
    return "layer";
  }

  function isExportTarget(layer) {
    return Boolean(layer);
  }

  function collectTargets(layers, results) {
    if (!layers) {
      return;
    }
    for (let index = 0; index < layers.length; index += 1) {
      const layer = layers[index];
      if (isExportTarget(layer)) {
        results.push({ id: String(layer.id), name: layer.name, kind: detectKind(layer) });
      }
      if (layer.layers && layer.layers.length) {
        collectTargets(layer.layers, results);
      }
    }
  }

  function findLayerById(layers, targetId) {
    if (!layers) {
      return null;
    }
    for (let index = 0; index < layers.length; index += 1) {
      const layer = layers[index];
      if (String(layer.id) === String(targetId)) {
        return layer;
      }
      const nested = findLayerById(layer.layers, targetId);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  function createUxpAdapter() {
    let photoshop;
    let storage;
    try {
      photoshop = require("photoshop");
      storage = require("uxp").storage.localFileSystem;
    } catch (error) {
      return createMockAdapter();
    }

    async function getDocument() {
      return photoshop.app.activeDocument || null;
    }

    async function selectLayer(targetId) {
      await photoshop.action.batchPlay([{
        _obj: "select",
        _target: [{ _ref: "layer", _id: Number(targetId) }],
        makeVisible: false
      }], {});
    }

    return {
      async getSelectedTarget() {
        const doc = await getDocument();
        if (!doc || !doc.activeLayers || doc.activeLayers.length === 0) {
          return null;
        }
        const layer = doc.activeLayers[0];
        if (!layer) {
          return null;
        }
        return { id: String(layer.id), name: layer.name, kind: detectKind(layer) };
      },
      async listExistingTargets() {
        const doc = await getDocument();
        if (!doc) {
          return [];
        }
        const results = [];
        collectTargets(doc.layers, results);
        return results;
      },
      async getHistoryNames() {
        return readHistory();
      },
      async saveHistoryName(name) {
        saveHistory(PhotoshopNamingCore.addHistoryName(readHistory(), name));
      },
      async renameAndExport(payload) {
        const doc = await getDocument();
        if (!doc) {
          throw new Error("No active Photoshop document.");
        }
        const target = findLayerById(doc.layers, payload.targetId);
        if (!target) {
          throw new Error("Selected target no longer exists.");
        }
        const folder = await storage.getFolder();
        if (!folder) {
          throw new Error("Export canceled.");
        }
        const folderPath = folder.nativePath || folder._path || "";
        const format = payload.format === "JPG" ? "jpg" : "png";

        await photoshop.core.executeAsModal(async function () {
          target.name = payload.name;
          await selectLayer(payload.targetId);
          await photoshop.action.batchPlay([{
            _obj: "exportSelectionAsFileTypePressed",
            _target: [{ _ref: "layer", _id: Number(payload.targetId) }],
            fileType: format,
            quality: 32,
            metadata: 0,
            sRGB: true,
            openWindow: false,
            destFolder: folderPath
          }], {});
        }, { commandName: "Rename And Export Slice" });

        return { exported: true, path: folderPath + "/" + payload.name + "." + format };
      }
    };
  }

  window.addEventListener("DOMContentLoaded", function () {
    PhotoshopPanelApp.createPanelApp({
      adapter: createUxpAdapter(),
      defaults: {
        prefix: "UI",
        keyword: "Product",
        componentType: "Card",
        state: "Active",
        number: "01",
        size: "Lg"
      }
    });
  });
})();
