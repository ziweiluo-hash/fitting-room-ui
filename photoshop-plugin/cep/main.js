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

  function escapeForScript(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  }

  function createMockAdapter() {
    return {
      async getSelectedTarget() {
        return { id: "mock-cep-1", name: "MockGroup", kind: "group" };
      },
      async listExistingTargets() {
        return [{ id: "mock-cep-1", name: "MockGroup", kind: "group" }];
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

  function createCepBridge() {
    if (!window.__adobe_cep__) {
      return null;
    }

    function evalScript(script) {
      return new Promise(function (resolve) {
        window.__adobe_cep__.evalScript(script, resolve);
      });
    }

    function parseHostJson(result) {
      if (!result || result === "null" || result === "undefined" || result === "EvalScript error.") {
        return null;
      }
      try {
        return JSON.parse(result);
      } catch (error) {
        return null;
      }
    }

    let selectionWatcher = null;
    let lastTargetId = null;

    function buildSelectedTargetScript() {
      return [
        "(function () {",
        "  function encode(value) {",
        "    if (value === undefined || value === null) { return 'null'; }",
        "    if (typeof value === 'string') { return '\"' + value.replace(/\\\\/g, '\\\\\\\\').replace(/\"/g, '\\\\\"') + '\"'; }",
        "    if (value instanceof Array) {",
        "      var items = [];",
        "      for (var i = 0; i < value.length; i += 1) { items.push(encode(value[i])); }",
        "      return '[' + items.join(',') + ']';",
        "    }",
        "    if (typeof value === 'object') {",
        "      var pairs = [];",
        "      for (var key in value) { if (value.hasOwnProperty(key)) { pairs.push('\"' + key + '\":' + encode(value[key])); } }",
        "      return '{' + pairs.join(',') + '}';",
        "    }",
        "    return String(value);",
        "  }",
        "  function findLayerById(container, targetId) {",
        "    if (!container || !container.layers) { return null; }",
        "    for (var index = 0; index < container.layers.length; index += 1) {",
        "      var layer = container.layers[index];",
        "      if (String(layer.id) === String(targetId)) { return layer; }",
        "      if (layer.typename === 'LayerSet') {",
        "        var nested = findLayerById(layer, targetId);",
        "        if (nested) { return nested; }",
        "      }",
        "    }",
        "    return null;",
        "  }",
        "  try {",
        "    if (!app.documents.length) { return 'null'; }",
        "    var doc = app.activeDocument;",
        "    var layer = doc.activeLayer;",
        "    var previousId = $.global.__sliceNamingLastHighlightId;",
        "    var previousLayer = null;",
        "    if (!layer) { return 'null'; }",
        "    if (previousId && String(previousId) !== String(layer.id)) {",
        "      previousLayer = findLayerById(doc, previousId);",
        "      if (previousLayer) { try { previousLayer.color = LayerColor.NONE; } catch (clearError) {} }",
        "    }",
        "    try { layer.color = LayerColor.GREEN; } catch (colorError) {}",
        "    $.global.__sliceNamingLastHighlightId = String(layer.id);",
        "    return encode({",
        "      id: String(layer.id),",
        "      name: layer.name || '',",
        "      kind: (function () {",
        "        try { if (layer.artboardEnabled) { return 'artboard'; } } catch (artboardError) {}",
        "        return layer.typename === 'LayerSet' ? 'group' : 'layer';",
        "      })()",
        "    });",
        "  } catch (error) {",
        "    return '__ERROR__:' + error.message;",
        "  }",
        "})()"
      ].join("");
    }

    function buildRenameAndExportScript(payload) {
      const targetId = escapeForScript(payload.targetId);
      const targetName = escapeForScript(payload.name);
      const targetFormat = escapeForScript(payload.format || "PNG");
      return [
        "(function () {",
        "  function encode(value) {",
        "    if (value === undefined || value === null) { return 'null'; }",
        "    if (typeof value === 'string') { return '\"' + value.replace(/\\\\/g, '\\\\\\\\').replace(/\"/g, '\\\\\"') + '\"'; }",
        "    if (value instanceof Array) {",
        "      var items = [];",
        "      for (var i = 0; i < value.length; i += 1) { items.push(encode(value[i])); }",
        "      return '[' + items.join(',') + ']';",
        "    }",
        "    if (typeof value === 'object') {",
        "      var pairs = [];",
        "      for (var key in value) { if (value.hasOwnProperty(key)) { pairs.push('\"' + key + '\":' + encode(value[key])); } }",
        "      return '{' + pairs.join(',') + '}';",
        "    }",
        "    return String(value);",
        "  }",
        "  function findLayerById(container, wantedId) {",
        "    if (!container || !container.layers) { return null; }",
        "    for (var index = 0; index < container.layers.length; index += 1) {",
        "      var layer = container.layers[index];",
        "      if (String(layer.id) === String(wantedId)) { return layer; }",
        "      if (layer.typename === 'LayerSet') {",
        "        var nested = findLayerById(layer, wantedId);",
        "        if (nested) { return nested; }",
        "      }",
        "    }",
        "    return null;",
        "  }",
        "  function buildPath(container, wantedId, trail) {",
        "    if (!container || !container.layers) { return null; }",
        "    for (var index = 0; index < container.layers.length; index += 1) {",
        "      var layer = container.layers[index];",
        "      var nextTrail = trail.slice();",
        "      nextTrail.push(index);",
        "      if (String(layer.id) === String(wantedId)) { return nextTrail; }",
        "      if (layer.typename === 'LayerSet') {",
        "        var nested = buildPath(layer, wantedId, nextTrail);",
        "        if (nested) { return nested; }",
        "      }",
        "    }",
        "    return null;",
        "  }",
        "  function resolveByPath(container, path) {",
        "    var current = container;",
        "    for (var i = 0; i < path.length; i += 1) {",
        "      if (!current.layers || path[i] >= current.layers.length) { return null; }",
        "      current = current.layers[path[i]];",
        "    }",
        "    return current;",
        "  }",
        "  function hideAllExceptTarget(container, targetPath, depth) {",
        "    if (!container || !container.layers) { return; }",
        "    for (var index = 0; index < container.layers.length; index += 1) {",
        "      var layer = container.layers[index];",
        "      var isInPath = depth < targetPath.length && index === targetPath[depth];",
        "      try { layer.visible = isInPath; } catch (visibilityError) {}",
        "      if (isInPath && layer.typename === 'LayerSet' && depth < targetPath.length - 1) {",
        "        hideAllExceptTarget(layer, targetPath, depth + 1);",
        "      }",
        "    }",
        "  }",
        "  function trimVisible(docRef) {",
        "    try { docRef.trim(TrimType.TRANSPARENT, true, true, true, true); } catch (trimError) {}",
        "  }",
        "  function addWhiteBackground(docRef) {",
        "    var background = docRef.artLayers.add();",
        "    var white = new SolidColor();",
        "    white.rgb.red = 255;",
        "    white.rgb.green = 255;",
        "    white.rgb.blue = 255;",
        "    background.name = '__export_bg__';",
        "    background.move(docRef, ElementPlacement.PLACEATEND);",
        "    docRef.activeLayer = background;",
        "    docRef.selection.selectAll();",
        "    docRef.selection.fill(white);",
        "    docRef.selection.deselect();",
        "  }",
        "  function normalizeVariantName(fileName) {",
        "    var dotIndex = String(fileName).lastIndexOf('.');",
        "    var ext = dotIndex >= 0 ? String(fileName).slice(dotIndex) : '';",
        "    var base = dotIndex >= 0 ? String(fileName).slice(0, dotIndex) : String(fileName);",
        "    base = base.replace(/\\s+copy(?:\\s*\\d+)?$/i, '').replace(/\\s+拷贝(?:\\s*\\d+)?$/i, '');",
        "    return base + ext;",
        "  }",
        "  function finalizeExportFile(folderPath, exportName, extension) {",
        "    var exactFile = new File(folderPath + '\\\\' + exportName + extension);",
        "    var folder = new Folder(folderPath);",
        "    var files;",
        "    var index;",
        "    if (exactFile.exists) {",
        "      return { exists: true, path: exactFile.fsName };",
        "    }",
        "    files = folder.getFiles('*' + extension);",
        "    for (index = 0; index < files.length; index += 1) {",
        "      if (files[index] instanceof File && normalizeVariantName(files[index].name) === exportName + extension) {",
        "        try {",
        "          if (files[index].name !== exportName + extension) {",
        "            files[index].rename(exportName + extension);",
        "          }",
        "        } catch (renameError) {}",
        "        exactFile = new File(folderPath + '\\\\' + exportName + extension);",
        "        if (exactFile.exists) {",
        "          return { exists: true, path: exactFile.fsName };",
        "        }",
        "        return { exists: true, path: files[index].fsName };",
        "      }",
        "    }",
        "    return { exists: false, path: exactFile.fsName };",
        "  }",
        "  function exportDocument(docRef, folderPath, exportName, format) {",
        "    var extension = format === 'JPG' ? '.jpg' : '.png';",
        "    var exportFile = new File(folderPath + '\\\\' + exportName + extension);",
        "    var previousDialogs = app.displayDialogs;",
        "    try { if (exportFile.exists) { exportFile.remove(); } } catch (removeError) {}",
        "    app.displayDialogs = DialogModes.NO;",
        "    try {",
        "      if (format === 'JPG') {",
        "        var jpgOptions = new JPEGSaveOptions();",
        "        jpgOptions.quality = 12;",
        "        jpgOptions.embedColorProfile = true;",
        "        jpgOptions.formatOptions = FormatOptions.STANDARDBASELINE;",
        "        docRef.saveAs(exportFile, jpgOptions, true, Extension.LOWERCASE);",
        "      } else {",
        "        var pngOptions = new PNGSaveOptions();",
        "        docRef.saveAs(exportFile, pngOptions, true, Extension.LOWERCASE);",
        "      }",
        "    } finally {",
        "      app.displayDialogs = previousDialogs;",
        "    }",
        "    return finalizeExportFile(folderPath, exportName, extension);",
        "  }",
        "  function exportTargetOnly(docRef, targetId, folderPath, format, exportName) {",
        "    var targetPath = buildPath(docRef, targetId, []);",
        "    var tempDoc = null;",
        "    var tempTarget = null;",
        "    var exportResult = null;",
        "    if (!targetPath) { throw new Error('未找到选中对象路径。'); }",
        "    try {",
        "      tempDoc = docRef.duplicate(exportName, false);",
        "      app.activeDocument = tempDoc;",
        "      tempTarget = resolveByPath(tempDoc, targetPath);",
        "      if (!tempTarget) { throw new Error('临时文档中未找到选中对象。'); }",
        "      try { tempDoc.name = exportName; } catch (renameDocError) {}",
        "      hideAllExceptTarget(tempDoc, targetPath, 0);",
        "      try { tempTarget.visible = true; } catch (targetVisibleError) {}",
        "      trimVisible(tempDoc);",
        "      if (format === 'JPG') { addWhiteBackground(tempDoc); }",
        "      exportResult = exportDocument(tempDoc, folderPath, exportName, format);",
        "    } finally {",
        "      try { if (tempDoc) { tempDoc.close(SaveOptions.DONOTSAVECHANGES); } } catch (closeError) {}",
        "      try { app.activeDocument = docRef; } catch (restoreError) {}",
        "    }",
        "    return exportResult || finalizeExportFile(folderPath, exportName, format === 'JPG' ? '.jpg' : '.png');",
        "  }",
        "  try {",
        "    if (!app.documents.length) { return encode({ exported: false, message: '当前没有打开的 Photoshop 文档。' }); }",
        "    var doc = app.activeDocument;",
        "    var target = findLayerById(doc, '" + targetId + "');",
        "    if (!target) { return encode({ exported: false, message: '当前选中对象已不存在。' }); }",
        "    var exportFolder = Folder.selectDialog('请选择导出文件夹');",
        "    if (!exportFolder) { return encode({ exported: false, message: '已取消导出。' }); }",
        "    var exportFormat = '" + targetFormat + "' === 'JPG' ? 'JPG' : 'PNG';",
        "    var exportResult = exportTargetOnly(doc, '" + targetId + "', exportFolder.fsName, exportFormat, '" + targetName + "');",
        "    if (!exportResult.exists) { return encode({ exported: false, message: '导出文件未成功写入。' }); }",
        "    return encode({ exported: true, path: exportResult.path, message: '已导出。' });",
        "  } catch (error) {",
        "    return encode({ exported: false, message: error.message || '导出失败。' });",
        "  }",
        "})()"
      ].join("");
    }

    async function pollSelection(onChange) {
      const current = await evalScript(buildSelectedTargetScript());
      if (current !== lastTargetId) {
        lastTargetId = current;
        onChange();
      }
    }

    return {
      async init() {
        lastTargetId = await evalScript(buildSelectedTargetScript());
      },
      async getSelectedTarget() {
        const result = await evalScript(buildSelectedTargetScript());
        if (typeof result === "string" && result.indexOf("__ERROR__:") === 0) {
          return null;
        }
        lastTargetId = result;
        return parseHostJson(result);
      },
      async listExistingTargets() {
        const result = await evalScript(
          "(function(){function encode(value){if(value===undefined||value===null){return 'null';}if(typeof value==='string'){return '\"'+value.replace(/\\\\/g,'\\\\\\\\').replace(/\"/g,'\\\\\"')+'\"';}if(value instanceof Array){var items=[];for(var i=0;i<value.length;i+=1){items.push(encode(value[i]));}return '['+items.join(',')+']';}if(typeof value==='object'){var pairs=[];for(var key in value){if(value.hasOwnProperty(key)){pairs.push('\"'+key+'\":'+encode(value[key]));}}return '{'+pairs.join(',')+'}';}return String(value);}function walk(container, results){if(!container||!container.layers){return;}for(var i=0;i<container.layers.length;i+=1){var layer=container.layers[i];results.push({id:String(layer.id),name:layer.name,kind:(layer.typename==='LayerSet'?'group':'layer')});if(layer.typename==='LayerSet'){walk(layer,results);}}}try{if(!app.documents.length){return '[]';}var results=[];walk(app.activeDocument,results);return encode(results);}catch(error){return '[]';}})()"
        );
        return parseHostJson(result) || [];
      },
      async getHistoryNames() {
        return readHistory();
      },
      async saveHistoryName(name) {
        saveHistory(PhotoshopNamingCore.addHistoryName(readHistory(), name));
      },
      async renameAndExport(payload) {
        const result = await evalScript(buildRenameAndExportScript(payload));
        if (!result || result === "EvalScript error.") {
          return { exported: false, message: "Photoshop 执行导出脚本失败。" };
        }
        if (typeof result === "string" && result.indexOf("__ERROR__:") === 0) {
          return { exported: false, message: result.replace("__ERROR__:", "") };
        }
        return parseHostJson(result) || { exported: false, message: "导出结果解析失败。" };
      },
      watchSelection(onChange) {
        if (selectionWatcher) {
          clearInterval(selectionWatcher);
        }
        selectionWatcher = setInterval(function () {
          void pollSelection(onChange);
        }, 900);
      }
    };
  }

  window.addEventListener("DOMContentLoaded", async function () {
    const adapter = createCepBridge() || createMockAdapter();
    if (adapter.init) {
      await adapter.init();
    }
    PhotoshopPanelApp.createPanelApp({
      adapter: adapter,
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
