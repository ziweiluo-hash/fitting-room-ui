(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(root.PhotoshopNamingCore || require("./naming-core"));
    return;
  }
  root.PhotoshopPanelApp = factory(root.PhotoshopNamingCore);
})(typeof self !== "undefined" ? self : this, function (core) {
  function $(id) {
    return document.getElementById(id);
  }

  function populateSelect(select, values) {
    select.innerHTML = "";
    values.forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value || "无";
      select.appendChild(option);
    });
  }

  function renderValidation(result) {
    var list = $("validation-results");
    list.innerHTML = "";
    result.entries.forEach(function (entry) {
      var item = document.createElement("li");
      item.className = "validation-item " + (entry.status === "pass" ? "pass" : "fail");
      item.textContent = entry.message;
      list.appendChild(item);
    });
  }

  function setStatus(message, kind) {
    var status = $("status-message");
    status.className = "status-message " + (kind || "idle");
    status.textContent = message;
  }

  function setTargetBanner(target) {
    var banner = $("selected-target-banner");
    if (!banner) {
      return;
    }
    if (!target) {
      banner.className = "target-banner fail";
      banner.textContent = "当前未识别到选中图层";
      return;
    }
    banner.className = "target-banner pass";
    banner.textContent = "当前已识别：" + (target.name || "未命名对象") + "（" + (target.kind || "layer") + "）";
  }

  function selectTextInput(input) {
    if (!input) {
      return;
    }
    input.removeAttribute("readonly");
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);
    input.setAttribute("readonly", "readonly");
  }

  function copyText(text, sourceInput) {
    return new Promise(function (resolve, reject) {
      var success = false;
      if (sourceInput) {
        try {
          selectTextInput(sourceInput);
          success = document.execCommand("copy");
        } catch (execError) {
          success = false;
        }
      }

      if (!success && window.__adobe_cep__ && window.__adobe_cep__.util && window.__adobe_cep__.util.copyToClipboard) {
        try {
          success = window.__adobe_cep__.util.copyToClipboard(text);
        } catch (cepError) {
          success = false;
        }
      }

      if (success) {
        resolve(true);
        return;
      }

      try {
        var input = document.createElement("textarea");
        input.value = text;
        input.setAttribute("readonly", "readonly");
        input.style.position = "fixed";
        input.style.left = "12px";
        input.style.top = "12px";
        input.style.width = "1px";
        input.style.height = "1px";
        input.style.opacity = "0.01";
        document.body.appendChild(input);
        input.focus();
        input.select();
        input.setSelectionRange(0, input.value.length);
        success = document.execCommand("copy");
        document.body.removeChild(input);
        if (success) {
          resolve(true);
        } else {
          reject(new Error("copy-failed"));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  function createPanelApp(options) {
    var adapter = options.adapter;
    var defaults = options.defaults || {};
    var state = {
      target: null,
      historyNames: [],
      generatedName: "",
      recalcTimer: null,
      lastExportAt: 0
    };

    var form = $("naming-form");
    var prefixDisplay = $("prefix-display");
    var keywordInput = $("keyword");
    var componentTypeSelect = $("component-type");
    var stateSelect = $("state");
    var numberSelect = $("number");
    var sizeSelect = $("size");
    var formatSelect = $("export-format");
    var fullName = $("full-name");
    var exportButton = $("export-now");
    var exportButtonDefaultText = exportButton.textContent;
    var copyButton = $("copy-full-name");
    var refreshButton = $("refresh-target");

    populateSelect(componentTypeSelect, core.COMPONENT_TYPES);
    populateSelect(stateSelect, core.STATES);
    populateSelect(numberSelect, core.NUMBERS);
    populateSelect(sizeSelect, core.SIZES);
    populateSelect(formatSelect, core.EXPORT_FORMATS);

    prefixDisplay.textContent = defaults.prefix || "UI";
    keywordInput.value = defaults.keyword || "";
    componentTypeSelect.value = defaults.componentType || core.COMPONENT_TYPES[0];
    stateSelect.value = defaults.state || "";
    numberSelect.value = defaults.number || "";
    sizeSelect.value = defaults.size || "";
    formatSelect.value = defaults.exportFormat || "PNG";

    function buildInput() {
      return {
        prefix: prefixDisplay.textContent,
        keyword: keywordInput.value,
        componentType: componentTypeSelect.value,
        state: stateSelect.value,
        number: numberSelect.value,
        size: sizeSelect.value
      };
    }

    async function refreshTarget(options) {
      var preserveStatus = options && options.preserveStatus;
      state.target = await adapter.getSelectedTarget();
      state.historyNames = await adapter.getHistoryNames();
      setTargetBanner(state.target);
      await recalc(true, preserveStatus);
    }

    async function recalc(skipDuplicateCheck, preserveStatus) {
      var generated = core.generateName(buildInput());
      state.generatedName = generated;
      fullName.value = generated || "";
      renderValidation(core.validateName(generated, {
        historyNames: state.historyNames,
        skipDuplicateCheck: skipDuplicateCheck !== false
      }));
      exportButton.disabled = !state.target || !generated;

      if (preserveStatus || (Date.now() - state.lastExportAt < 4000)) {
        return;
      }

      if (!state.target) {
        setStatus("请先在 Photoshop 中选中一个组、图层或画板。", "error");
      } else {
        setStatus("已识别当前选中对象，可以直接导出。", "idle");
      }
    }

    function scheduleRecalc(delay) {
      if (state.recalcTimer) {
        clearTimeout(state.recalcTimer);
      }
      state.recalcTimer = setTimeout(function () {
        state.recalcTimer = null;
        void recalc(true);
      }, typeof delay === "number" ? delay : 80);
    }

    async function exportNow() {
      var existingTargets;
      var validation;
      var result;

      if (!state.target || !state.generatedName) {
        setStatus("请先选中对象并生成名称。", "error");
        return;
      }

      existingTargets = await adapter.listExistingTargets();
      validation = core.validateName(state.generatedName, {
        existingNames: existingTargets.filter(function (entry) {
          return entry.id !== state.target.id;
        }).map(function (entry) {
          return entry.name;
        }),
        historyNames: state.historyNames
      });
      renderValidation(validation);
      if (!validation.valid) {
        setStatus("导出前校验未通过，请先处理命名风险。", "error");
        return;
      }

      setStatus("正在导出当前选中对象...", "busy");
      exportButton.disabled = true;
      exportButton.textContent = "请选择导出文件夹...";
      try {
        result = await adapter.renameAndExport({
          targetId: state.target.id,
          name: state.generatedName,
          format: formatSelect.value || "PNG"
        });
        if (!result || result.exported !== true) {
          throw new Error((result && result.message) || "导出没有成功完成。");
        }
        await adapter.saveHistoryName(state.generatedName);
        state.historyNames = await adapter.getHistoryNames();
        state.lastExportAt = Date.now();
        setStatus("已导出", "success");
        exportButton.textContent = exportButtonDefaultText;
        exportButton.disabled = false;
        await refreshTarget({ preserveStatus: true });
      } catch (error) {
        setStatus((error && error.message) || "导出失败。", "error");
        exportButton.textContent = exportButtonDefaultText;
        exportButton.disabled = false;
      }
    }

    refreshButton.addEventListener("click", function (event) {
      if (event && event.currentTarget && event.currentTarget.blur) {
        event.currentTarget.blur();
      }
      void refreshTarget();
    });

    fullName.addEventListener("click", function () {
      selectTextInput(fullName);
    });

    copyButton.addEventListener("click", function () {
      if (!state.generatedName) {
        setStatus("当前没有可复制的完整名称。", "error");
        return;
      }
      copyText(state.generatedName, fullName).then(function () {
        setStatus("已复制完整名称：" + state.generatedName, "success");
      }).catch(function () {
        selectTextInput(fullName);
        setStatus("复制失败，已选中完整名称，请直接按 Ctrl+C。", "error");
      });
    });

    exportButton.addEventListener("click", function () {
      void exportNow();
    });

    form.addEventListener("input", function () {
      scheduleRecalc(100);
    });

    form.addEventListener("change", function () {
      scheduleRecalc(0);
    });

    if (adapter.watchSelection) {
      adapter.watchSelection(function () {
        void refreshTarget();
      });
    }

    void refreshTarget();
    return { refreshTarget: refreshTarget };
  }

  return { createPanelApp: createPanelApp };
});
