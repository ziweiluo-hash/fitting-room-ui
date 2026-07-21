var __sliceNamingHost = (function () {
  function encode(value) {
    if (value === undefined || value === null) {
      return "null";
    }
    if (typeof value === "string") {
      return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
    }
    if (value instanceof Array) {
      var items = [];
      var index;
      for (index = 0; index < value.length; index += 1) {
        items.push(encode(value[index]));
      }
      return "[" + items.join(",") + "]";
    }
    if (typeof value === "object") {
      var pairs = [];
      var key;
      for (key in value) {
        if (value.hasOwnProperty(key)) {
          pairs.push('"' + key + '":' + encode(value[key]));
        }
      }
      return "{" + pairs.join(",") + "}";
    }
    return String(value);
  }

  function getDocument() {
    try {
      return app.activeDocument;
    } catch (error) {
      return null;
    }
  }

  function detectKind(layer) {
    if (!layer) {
      return "object";
    }
    try {
      if (layer.artboardEnabled) {
        return "artboard";
      }
    } catch (error) {}
    return layer.typename === "LayerSet" ? "group" : "layer";
  }

  function isExportTarget(layer) {
    return Boolean(layer && (layer.typename === "LayerSet" || layer.typename === "ArtLayer"));
  }

  function findLayerById(container, targetId) {
    var index;
    var nested;
    if (!container || !container.layers) {
      return null;
    }
    for (index = 0; index < container.layers.length; index += 1) {
      if (String(container.layers[index].id) === String(targetId)) {
        return container.layers[index];
      }
      if (container.layers[index].typename === "LayerSet") {
        nested = findLayerById(container.layers[index], targetId);
        if (nested) {
          return nested;
        }
      }
    }
    return null;
  }

  function collectLayers(container, results) {
    var index;
    var layer;
    if (!container || !container.layers) {
      return;
    }
    for (index = 0; index < container.layers.length; index += 1) {
      layer = container.layers[index];
      if (isExportTarget(layer)) {
        results.push({
          id: String(layer.id),
          name: layer.name,
          kind: detectKind(layer)
        });
      }
      if (layer.typename === "LayerSet") {
        collectLayers(layer, results);
      }
    }
  }

  function toPixels(unitValue) {
    return Number(unitValue.as("px"));
  }

  function getLayerBounds(layer) {
    var bounds = layer.bounds;
    var left = toPixels(bounds[0]);
    var top = toPixels(bounds[1]);
    var right = toPixels(bounds[2]);
    var bottom = toPixels(bounds[3]);
    return {
      left: left,
      top: top,
      right: right,
      bottom: bottom,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top)
    };
  }

  function addWhiteBackground(doc) {
    var background = doc.artLayers.add();
    var white = new SolidColor();
    white.rgb.red = 255;
    white.rgb.green = 255;
    white.rgb.blue = 255;
    background.name = "__export_bg__";
    background.move(doc, ElementPlacement.PLACEATEND);
    doc.activeLayer = background;
    doc.selection.selectAll();
    doc.selection.fill(white);
    doc.selection.deselect();
  }

  function exportDocument(filePath, format) {
    var exportOptions = new ExportOptionsSaveForWeb();
    if (format === "JPG") {
      exportOptions.format = SaveDocumentType.JPEG;
      exportOptions.quality = 100;
    } else {
      exportOptions.format = SaveDocumentType.PNG;
      exportOptions.PNG8 = false;
      exportOptions.transparency = true;
    }
    exportOptions.interlaced = false;
    app.activeDocument.exportDocument(new File(filePath), ExportType.SAVEFORWEB, exportOptions);
  }

  function exportTargetOnly(doc, target, filePath, format) {
    var bounds = getLayerBounds(target);
    var tempDoc = null;
    var duplicateRef = null;
    try {
      tempDoc = app.documents.add(
        UnitValue(bounds.width, "px"),
        UnitValue(bounds.height, "px"),
        doc.resolution,
        target.name,
        NewDocumentMode.RGB,
        DocumentFill.TRANSPARENT
      );
      duplicateRef = target.duplicate(tempDoc, ElementPlacement.PLACEATBEGINNING);
      app.activeDocument = tempDoc;
      tempDoc.activeLayer = duplicateRef;
      duplicateRef.translate(-bounds.left, -bounds.top);
      try {
        tempDoc.trim(TrimType.TRANSPARENT, true, true, true, true);
      } catch (trimError) {}
      if (format === "JPG") {
        addWhiteBackground(tempDoc);
      }
      exportDocument(filePath, format);
    } catch (error) {
      throw new Error("导出对象失败：" + error.message);
    } finally {
      try {
        if (tempDoc) {
          tempDoc.close(SaveOptions.DONOTSAVECHANGES);
        }
      } catch (closeError) {}
      try {
        app.activeDocument = doc;
      } catch (restoreError) {}
    }
  }

  return {
    listExistingTargets: function () {
      var doc = getDocument();
      var results = [];
      if (!doc) {
        return encode(results);
      }
      collectLayers(doc, results);
      return encode(results);
    },
    renameAndExport: function (targetId, name, format) {
      var doc = getDocument();
      var target;
      var folder;
      var exportFormat;
      var extension;
      var filePath;

      if (!doc) {
        return encode({ exported: false, message: "当前没有打开的 Photoshop 文档。" });
      }

      target = findLayerById(doc, targetId);
      if (!target) {
        return encode({ exported: false, message: "当前选中对象已不存在。" });
      }

      folder = Folder.selectDialog("请选择导出文件夹");
      if (!folder) {
        return encode({ exported: false, message: "已取消导出。" });
      }

      exportFormat = format === "JPG" ? "JPG" : "PNG";
      extension = exportFormat === "JPG" ? ".jpg" : ".png";

      try {
        target.name = name;
        filePath = folder.fsName + "/" + name + extension;
        exportTargetOnly(doc, target, filePath, exportFormat);
        return encode({ exported: true, path: filePath, message: "导出成功。" });
      } catch (error) {
        return encode({ exported: false, message: error.message || "导出失败。" });
      }
    }
  };
})();
