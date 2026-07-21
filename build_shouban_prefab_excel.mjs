import fs from "node:fs/promises";
import path from "node:path";

import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = String.raw`C:\Users\ziwei.luo\Documents\New project`;
const outputDir = path.join(root, "outputs", "019f7fba-927f-79e3-8011-0f288ea1fbe1");
const dataPath = path.join(root, "tmp", "shouban_prefab_data.json");

const title = "手办系统 Prefab 对照整理";
const subtitle = "来源：手办系统prefab.pdf。对应图片优先使用 PDF 表格中的配图裁切；无独立配图的条目在备注中说明。";

const raw = await fs.readFile(dataPath, "utf8");
const rows = JSON.parse(raw);

await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Prefab整理");
sheet.showGridLines = false;

sheet.getRange("A1:F1").merge();
sheet.getRange("A1").values = [[title]];
sheet.getRange("A2:F2").merge();
sheet.getRange("A2").values = [[subtitle]];
sheet.getRange("A4:F4").values = [[
  "PDF页码",
  "Prefab名称",
  "对应图片",
  "对应含义",
  "界面位置 / 图片表达",
  "关键说明 / 备注",
]];

const valueRows = rows.map((row) => [
  row.page,
  row.name,
  row.image_path ? "" : "PDF未提供独立配图",
  row.meaning,
  row.position,
  `${row.details}\n${row.image_note}`,
]);
sheet.getRange(`A5:F${rows.length + 4}`).values = valueRows;

sheet.getRange("A1:F2").format = {
  fill: "#F7F3E8",
  font: { color: "#3F2D1D" },
  wrapText: true,
};
sheet.getRange("A1").format = {
  fill: "#F7F3E8",
  font: { bold: true, color: "#3F2D1D", size: 16 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
};
sheet.getRange("A2").format = {
  fill: "#F7F3E8",
  font: { color: "#6B5845", size: 10 },
  horizontalAlignment: "left",
  verticalAlignment: "center",
  wrapText: true,
};
sheet.getRange("A4:F4").format = {
  fill: "#2D5B83",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#D9D9D9" },
};
sheet.getRange(`A5:F${rows.length + 4}`).format = {
  borders: { preset: "all", style: "thin", color: "#D9D9D9" },
  verticalAlignment: "center",
  wrapText: true,
};
sheet.getRange(`A5:A${rows.length + 4}`).format.horizontalAlignment = "center";
sheet.getRange(`B5:F${rows.length + 4}`).format.horizontalAlignment = "left";

sheet.getRange("A1:F1").format.rowHeight = 28;
sheet.getRange("A2:F2").format.rowHeight = 38;
sheet.getRange("A3:F3").format.rowHeight = 10;
sheet.getRange("A4:F4").format.rowHeight = 24;

sheet.getRange("A:A").format.columnWidth = 9;
sheet.getRange("B:B").format.columnWidth = 24;
sheet.getRange("C:C").format.columnWidth = 28;
sheet.getRange("D:D").format.columnWidth = 18;
sheet.getRange("E:E").format.columnWidth = 24;
sheet.getRange("F:F").format.columnWidth = 54;

for (let i = 0; i < rows.length; i += 1) {
  const rowNumber = i + 5;
  sheet.getRange(`A${rowNumber}:F${rowNumber}`).format.rowHeight = 96;
  const imagePath = rows[i].image_path;
  if (!imagePath) continue;
  const bytes = await fs.readFile(imagePath);
  const ext = path.extname(imagePath).slice(1).toLowerCase() || "png";
  const dataUrl = `data:image/${ext};base64,${bytes.toString("base64")}`;
  sheet.images.add({
    dataUrl,
    anchor: {
      from: { row: rowNumber - 1, col: 2, rowOffsetPx: 6, colOffsetPx: 8 },
      extent: { widthPx: 165, heightPx: 84 },
    },
  });
}

sheet.freezePanes.freezeRows(4);

const inspect = await workbook.inspect({
  kind: "table",
  sheetId: "Prefab整理",
  range: `A1:F10`,
  include: "values",
  tableMaxRows: 10,
  tableMaxCols: 6,
  maxChars: 4000,
});
console.log(inspect.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: "Prefab整理",
  range: `A1:F12`,
  scale: 1,
  format: "png",
});
await fs.writeFile(
  path.join(outputDir, "shouban_prefab_preview.png"),
  new Uint8Array(await preview.arrayBuffer()),
);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(outputDir, "手办系统_prefab整理.xlsx"));
