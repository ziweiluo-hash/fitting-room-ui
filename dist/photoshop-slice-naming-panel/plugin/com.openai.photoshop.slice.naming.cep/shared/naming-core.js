(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.PhotoshopNamingCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  var COMPONENT_TYPES = ["Button", "Icon", "Decoration", "Card", "Background"];
  var STATES = ["", "Default", "Active", "Hover", "Focus", "Disabled", "Selected", "Loading", "Success", "Error", "Empty"];
  var NUMBERS = ["", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
  var SIZES = ["", "Xs", "Sm", "Md", "Lg", "Xl"];
  var EXPORT_FORMATS = ["PNG", "JPG"];
  var BANNED_WORDS = ["Test", "Demo", "Temp", "Tmp", "Fake", "Mock", "Sample", "Delete", "Deprecated", "Forbidden"];
  var HISTORY_LIMIT = 200;

  function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function toPascalCase(value) {
    return cleanString(value)
      .replace(/[^a-zA-Z0-9_\s-]/g, " ")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map(function (segment) {
        return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
      })
      .join("");
  }

  function generateName(input) {
    return [
      toPascalCase(input.prefix || "UI"),
      toPascalCase(input.keyword),
      toPascalCase(input.componentType),
      toPascalCase(input.state),
      cleanString(input.number),
      toPascalCase(input.size)
    ].filter(Boolean).join("");
  }

  function equalsIgnoreCase(left, right) {
    return cleanString(left).toLowerCase() === cleanString(right).toLowerCase();
  }

  function validateName(name, context) {
    var targetName = cleanString(name);
    var existingNames = Array.isArray(context && context.existingNames) ? context.existingNames : [];
    var historyNames = Array.isArray(context && context.historyNames) ? context.historyNames : [];
    var bannedWords = Array.isArray(context && context.bannedWords) ? context.bannedWords : BANNED_WORDS;
    var includeDuplicates = !(context && context.skipDuplicateCheck);
    var entries = [];
    var charactersValid = /^[A-Za-z0-9_]+$/.test(targetName);
    var hitWords;
    var duplicateSources;
    var hasFailure;

    entries.push({
      key: "allowed-characters",
      status: charactersValid ? "pass" : "fail",
      source: "generated",
      message: charactersValid
        ? "允许字符检查通过。仅包含字母、数字或下划线。"
        : "允许字符检查未通过。名称只能包含字母、数字或下划线。"
    });

    if (includeDuplicates) {
      duplicateSources = [];
      if (existingNames.some(function (entry) { return equalsIgnoreCase(entry, targetName); })) {
        duplicateSources.push("当前文档");
      }
      if (historyNames.some(function (entry) { return equalsIgnoreCase(entry, targetName); })) {
        duplicateSources.push("本地历史");
      }
      entries.push({
        key: "duplicate-name",
        status: duplicateSources.length === 0 ? "pass" : "fail",
        source: duplicateSources.length === 0 ? "generated" : "photoshop-document",
        message: duplicateSources.length === 0
          ? "重复命名检查通过。未检测到重复名称。"
          : "重复命名检查未通过。在" + duplicateSources.join("和") + "中检测到重复名称。"
      });
    }

    hitWords = bannedWords.filter(function (word) {
      return targetName.toLowerCase().indexOf(word.toLowerCase()) >= 0;
    });
    entries.push({
      key: "banned-words",
      status: hitWords.length === 0 ? "pass" : "fail",
      source: "generated",
      message: hitWords.length === 0
        ? "禁用词检查通过。未检测到禁用词风险。"
        : "禁用词检查未通过。检测到禁用词风险：" + hitWords.join(", ") + "。"
    });

    hasFailure = entries.some(function (entry) {
      return entry.status === "fail";
    });
    if (!hasFailure) {
      entries.push({
        key: "summary",
        status: "pass",
        source: "generated",
        message: "全部校验通过。"
      });
    }

    return {
      valid: !hasFailure,
      entries: entries
    };
  }

  function addHistoryName(historyNames, name) {
    var current = Array.isArray(historyNames) ? historyNames.slice() : [];
    if (!cleanString(name)) {
      return current;
    }
    if (!current.some(function (entry) { return equalsIgnoreCase(entry, name); })) {
      current.push(name);
    }
    return current.slice(-HISTORY_LIMIT);
  }

  return {
    COMPONENT_TYPES: COMPONENT_TYPES,
    STATES: STATES,
    NUMBERS: NUMBERS,
    SIZES: SIZES,
    EXPORT_FORMATS: EXPORT_FORMATS,
    BANNED_WORDS: BANNED_WORDS,
    generateName: generateName,
    validateName: validateName,
    addHistoryName: addHistoryName
  };
});
