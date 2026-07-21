const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../photoshop-plugin/shared/naming-core.js");

test("generateName builds the expected full name", function () {
  const generated = core.generateName({
    prefix: "UI",
    keyword: "Product",
    componentType: "Card",
    state: "Active",
    number: "01",
    size: "Lg"
  });
  assert.equal(generated, "UIProductCardActive01Lg");
});

test("generateName collapses empty optional segments", function () {
  const generated = core.generateName({
    prefix: "UI",
    keyword: "Product Card",
    componentType: "Panel",
    state: "",
    number: "",
    size: ""
  });
  assert.equal(generated, "UIProductCardPanel");
});

test("validateName allows underscores and does not require UI prefix", function () {
  const result = core.validateName("Product_Card01", {
    existingNames: [],
    historyNames: []
  });
  assert.equal(result.valid, true);
  assert.equal(result.entries.some(function (entry) { return entry.key === "summary"; }), true);
});

test("validateName rejects spaces and banned words", function () {
  const result = core.validateName("Mock Name", {
    existingNames: [],
    historyNames: []
  });
  assert.equal(result.valid, false);
  assert.equal(result.entries.some(function (entry) { return entry.key === "allowed-characters" && entry.status === "fail"; }), true);
  assert.equal(result.entries.some(function (entry) { return entry.key === "banned-words" && entry.status === "fail"; }), true);
});

test("validateName detects duplicate names from document and local history", function () {
  const result = core.validateName("PaymentDialog", {
    existingNames: ["PaymentDialog"],
    historyNames: ["PaymentDialog"]
  });
  assert.equal(result.valid, false);
  assert.equal(result.entries.some(function (entry) { return entry.key === "duplicate-name" && entry.status === "fail"; }), true);
});
