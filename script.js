(function () {
  const historyKey = "mock-photoshop-history";
  const mockTargets = [
    { id: "101", name: "LandingHero", kind: "artboard" },
    { id: "102", name: "UIProfileCardActive01Lg", kind: "group" },
    { id: "103", name: "PaymentDialog", kind: "group" }
  ];
  let selectedTargetId = "102";

  function readHistory() {
    try {
      const raw = window.localStorage.getItem(historyKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveHistory(entries) {
    window.localStorage.setItem(historyKey, JSON.stringify(entries));
  }

  const mockAdapter = {
    async getSelectedTarget() {
      return mockTargets.find(function (entry) {
        return entry.id === selectedTargetId;
      }) || null;
    },
    async listExistingTargets() {
      return mockTargets.slice();
    },
    async getHistoryNames() {
      return readHistory();
    },
    async saveHistoryName(name) {
      const next = PhotoshopNamingCore.addHistoryName(readHistory(), name);
      saveHistory(next);
    },
    async renameAndExport(payload) {
      const target = mockTargets.find(function (entry) {
        return entry.id === payload.targetId;
      });
      if (!target) {
        throw new Error("Mock target not found.");
      }
      target.name = payload.name;
      return {
        exported: true,
        path: "Mock/Exports/" + payload.name + ".png"
      };
    }
  };

  window.addEventListener("DOMContentLoaded", function () {
    PhotoshopPanelApp.createPanelApp({
      adapter: mockAdapter,
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
