const sourceImageInput = document.getElementById("sourceImage");
const sourcePreview = document.getElementById("sourcePreview");
const sourceMeta = document.getElementById("sourceMeta");
const sourceList = document.getElementById("sourceList");
const imageModelInput = document.getElementById("imageModel");
const sceneProfileInput = document.getElementById("sceneProfile");
const sceneHintInput = document.getElementById("sceneHint");
const characterHintInput = document.getElementById("characterHint");
const iconHintInput = document.getElementById("iconHint");
const targetBackgroundInput = document.getElementById("targetBackground");
const targetCharacterInput = document.getElementById("targetCharacter");
const targetIconInput = document.getElementById("targetIcon");
const targetIconPlateInput = document.getElementById("targetIconPlate");
const splitBackgroundElementsInput = document.getElementById("splitBackgroundElements");
const splitBackgroundObjectsInput = document.getElementById("splitBackgroundObjects");
const runSplitButton = document.getElementById("runSplit");
const resetFormButton = document.getElementById("resetForm");
const runStatus = document.getElementById("runStatus");
const resultGrid = document.getElementById("resultGrid");
const uploadZone = document.querySelector(".upload-zone");

const layerOrder = ["background", "background_base", "background_elements", "character", "icon", "icon_plate"];
const layerLabels = {
  background: "背景",
  background_base: "背景底图",
  background_elements: "背景元素",
  character: "角色 / 宠物",
  icon: "icon",
  icon_plate: "icon 底板"
};

let sourceItems = [];
let activeSourceId = "";
let resultGroups = [];
const resolvedDownloadCache = new Map();

sourceImageInput.addEventListener("change", async (event) => {
  await addSourceFiles(event.target.files || []);
});

uploadZone.addEventListener("dragover", (event) => {
  event.preventDefault();
});

uploadZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  await addSourceFiles(event.dataTransfer?.files || []);
});

targetBackgroundInput.addEventListener("change", syncBackgroundOptionState);
splitBackgroundElementsInput.addEventListener("change", syncBackgroundOptionState);

runSplitButton.addEventListener("click", async () => {
  if (!sourceItems.length) {
    setStatus("请先上传至少一张源图。", true);
    return;
  }

  const targets = getSelectedTargets();
  if (!targets.length) {
    setStatus("至少勾选一个拆分目标。", true);
    return;
  }

  runSplitButton.disabled = true;
  resultGroups = [];
  renderResultGroups();

  try {
    for (let index = 0; index < sourceItems.length; index += 1) {
      const item = sourceItems[index];
      setStatus(`正在处理第 ${index + 1} / ${sourceItems.length} 张：${item.file.name}`);
      renderLoadingGroup(item, targets, index, sourceItems.length);
      const payload = await requestSplitForItem(item, targets);
      resultGroups.push({
        sourceId: item.id,
        sourceName: item.file.name,
        sourceSize: item.file.size,
        layers: payload.layers || [],
        totalDurationMs: payload.totalDurationMs || 0
      });
      renderResultGroups();
    }
    setStatus(`拆图完成，共处理 ${sourceItems.length} 张图，生成 ${sumLayerCount(resultGroups)} 张结果图。`);
  } catch (error) {
    renderResultGroups();
    setStatus(error.message || "拆图失败。", true);
  } finally {
    runSplitButton.disabled = false;
  }
});

resetFormButton.addEventListener("click", resetAll);

syncBackgroundOptionState();
renderEmptySource();
renderResultGroups();

function getSelectedTargets() {
  const targets = [];
  if (targetBackgroundInput.checked) {
    if (splitBackgroundElementsInput.checked) {
      targets.push("background_base", "background_elements");
    } else {
      targets.push("background");
    }
  }
  if (targetCharacterInput.checked) targets.push("character");
  if (targetIconInput.checked) targets.push("icon");
  if (targetIconPlateInput.checked) targets.push("icon_plate");
  return targets;
}

async function addSourceFiles(fileList) {
  const files = [...fileList].filter((item) => item.type.startsWith("image/"));
  if (!files.length) return;

  for (const file of files) {
    const duplicate = sourceItems.some((item) => (
      item.file.name === file.name
      && item.file.size === file.size
      && item.file.lastModified === file.lastModified
    ));
    if (duplicate) continue;

    const dataUrl = await readFileAsDataUrl(file);
    sourceItems.push({
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      file,
      dataUrl,
      objectUrl: URL.createObjectURL(file)
    });
  }

  sourceImageInput.value = "";
  activeSourceId = sourceItems[sourceItems.length - 1]?.id || "";
  renderSourceSummary();
  renderSourceList();
  renderActivePreview();
  renderResultGroups();
  setStatus(`已载入 ${sourceItems.length} 张图片，默认预览最新上传的一张。`);
}

function renderSourceSummary() {
  if (!sourceItems.length) {
    sourceMeta.textContent = "未选择图片";
    return;
  }
  const totalBytes = sourceItems.reduce((sum, item) => sum + item.file.size, 0);
  sourceMeta.textContent = `${sourceItems.length} 张 · ${formatSize(totalBytes)}`;
}

function renderSourceList() {
  sourceList.innerHTML = "";
  if (!sourceItems.length) return;

  sourceItems.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `source-chip${item.id === activeSourceId ? " is-active" : ""}`;
    button.innerHTML = `
      <span class="chip-name">${escapeHtml(item.file.name)}</span>
      <span class="chip-meta">${index + 1}</span>
    `;
    button.addEventListener("click", () => {
      activeSourceId = item.id;
      renderSourceList();
      renderActivePreview();
      renderResultGroups();
    });
    sourceList.appendChild(button);
  });
}

function renderActivePreview() {
  if (!sourceItems.length) {
    renderEmptySource();
    return;
  }

  const activeItem = sourceItems.find((item) => item.id === activeSourceId) || sourceItems[sourceItems.length - 1];
  if (!activeItem) {
    sourcePreview.classList.add("empty");
    sourcePreview.textContent = "已上传图片。点击下方文件名可切换预览。";
    return;
  }

  activeSourceId = activeItem.id;
  sourcePreview.classList.remove("empty");
  sourcePreview.innerHTML = "";
  const image = document.createElement("img");
  image.src = activeItem.objectUrl;
  image.alt = "源图预览";
  sourcePreview.appendChild(image);
}

function renderEmptySource() {
  sourcePreview.classList.add("empty");
  sourcePreview.textContent = "等待上传";
  sourceMeta.textContent = "未选择图片";
  sourceList.innerHTML = "";
}

function syncBackgroundOptionState() {
  const backgroundEnabled = targetBackgroundInput.checked;
  splitBackgroundElementsInput.disabled = !backgroundEnabled;
  splitBackgroundObjectsInput.disabled = !backgroundEnabled || !splitBackgroundElementsInput.checked;

  if (!backgroundEnabled) {
    splitBackgroundElementsInput.checked = false;
  }
  if (!backgroundEnabled || !splitBackgroundElementsInput.checked) {
    splitBackgroundObjectsInput.checked = true;
  }
}

async function requestSplitForItem(item, targets) {
  const response = await fetch("/api/ui-chaitu", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      model: imageModelInput.value,
      sceneProfile: sceneProfileInput.value,
      imageDataUrl: item.dataUrl,
      imageName: item.file.name,
      sceneHint: sceneHintInput.value.trim(),
      characterHint: characterHintInput.value.trim(),
      iconHint: iconHintInput.value.trim(),
      targets
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `${item.file.name} 拆图失败`);
  }
  return payload;
}

function renderLoadingGroup(item, targets, index, total) {
  if (item.id !== activeSourceId) {
    return;
  }

  resultGrid.innerHTML = `
    <section class="result-group">
      <div class="result-group-head">
        <div>
          <p class="eyebrow">RUNNING</p>
          <h3>${escapeHtml(item.file.name)}</h3>
          <p class="result-meta">正在处理第 ${index + 1} / ${total} 张，准备生成 ${targets.length} 层。</p>
        </div>
      </div>
      <div class="result-grid">
        ${targets.map((target) => `
          <article class="result-card">
            <div class="result-card-head">
              <h4>${escapeHtml(layerLabels[target] || target)}</h4>
            </div>
            <div class="result-canvas"></div>
            <div class="result-card-body">
              <p class="result-meta">正在生成透明 PNG...</p>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderResultGroups() {
  if (!resultGroups.length) {
    const activeItem = sourceItems.find((item) => item.id === activeSourceId);
    if (activeItem) {
      resultGrid.innerHTML = `
        <article class="result-empty">
          <strong>${escapeHtml(activeItem.file.name)}</strong>
          <span>这张图还没有拆分结果。开始拆图后，这里会显示当前图片的内容。</span>
        </article>
      `;
      return;
    }

    resultGrid.innerHTML = `
      <article class="result-empty">
        <strong>结果会显示在这里</strong>
        <span>支持批量拆图。上方选中哪张源图，下方就显示哪张图的拆分结果。</span>
      </article>
    `;
    return;
  }

  const visibleGroups = getVisibleResultGroups();
  if (!visibleGroups.length) {
    const activeItem = sourceItems.find((item) => item.id === activeSourceId);
    resultGrid.innerHTML = `
      <article class="result-empty">
        <strong>${escapeHtml(activeItem?.file?.name || "当前图片")} 暂无结果</strong>
        <span>切换其他源图可查看它的拆图结果。</span>
      </article>
    `;
    return;
  }

  resultGrid.innerHTML = visibleGroups.map((group) => {
    const groupIndex = resultGroups.findIndex((item) => item.sourceId === group.sourceId);
    return `
      <section class="result-group">
        <div class="result-group-head">
          <div>
            <p class="eyebrow">SOURCE ${groupIndex + 1}</p>
            <h3>${escapeHtml(group.sourceName)}</h3>
            <p class="result-meta">共 ${group.layers.length} 层${group.totalDurationMs ? ` · ${(group.totalDurationMs / 1000).toFixed(1)} 秒` : ""}</p>
          </div>
          <button class="secondary-button" type="button" data-download-group="${groupIndex}">下载全部结果</button>
        </div>
        <div class="result-grid">
          ${(group.layers || [])
            .slice()
            .sort((a, b) => layerOrder.indexOf(a.id) - layerOrder.indexOf(b.id))
            .map((layer) => {
              const title = layer.label || layerLabels[layer.id] || layer.id;
              const durationText = layer.durationMs ? `生成 ${(layer.durationMs / 1000).toFixed(1)} 秒` : "已生成";
              return `
                <article class="result-card">
                  <div class="result-card-head">
                    <h4>${escapeHtml(title)}</h4>
                    <button class="download-button" type="button" data-download-layer="${groupIndex}:${escapeAttribute(layer.id)}">下载 PNG</button>
                  </div>
                  <div class="result-canvas">
                    <img class="result-image" src="${escapeAttribute(layer.imageUrl)}" alt="${escapeAttribute(title)}">
                  </div>
                  <div class="result-card-body">
                    <p class="result-meta">${escapeHtml(durationText)}</p>
                  </div>
                </article>
              `;
            }).join("")}
        </div>
      </section>
    `;
  }).join("");

  bindResultActions();
}

function getVisibleResultGroups() {
  if (!activeSourceId) {
    return resultGroups;
  }
  const activeGroup = resultGroups.find((group) => group.sourceId === activeSourceId);
  return activeGroup ? [activeGroup] : [];
}

function bindResultActions() {
  resultGrid.querySelectorAll("[data-download-group]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.getAttribute("data-download-group"));
      const group = resultGroups[index];
      if (!group) return;

      setStatus(`正在下载 ${group.sourceName} 的全部结果。`);
      try {
        await downloadLayerSet(group.layers || []);
        setStatus(`已触发 ${group.sourceName} 的结果下载。`);
      } catch (error) {
        setStatus(error.message || "下载失败。", true);
      }
    });
  });

  resultGrid.querySelectorAll("[data-download-layer]").forEach((button) => {
    button.addEventListener("click", async () => {
      const token = button.getAttribute("data-download-layer") || "";
      const [groupIndexText, layerId] = token.split(":");
      const group = resultGroups[Number(groupIndexText)];
      const layer = group?.layers?.find((item) => item.id === layerId);
      if (!layer) {
        setStatus("找不到对应的下载结果。", true);
        return;
      }

      setStatus(`正在下载 ${group.sourceName} / ${layer.filename || layer.id} ...`);
      try {
        const files = await downloadLayer(layer);
        setStatus(`${group.sourceName} / ${layer.filename || layer.id} 已开始下载 ${files.length} 张图。`);
      } catch (error) {
        setStatus(error.message || "下载失败。", true);
      }
    });
  });
}

async function downloadLayerSet(layers) {
  for (const layer of layers) {
    await downloadLayer(layer);
    await wait(180);
  }
}

async function downloadLayer(layer) {
  const exportFiles = await buildExportFiles(layer);
  for (const file of exportFiles) {
    triggerDataUrlDownload(file.dataUrl, file.filename);
    await wait(120);
  }
  return exportFiles;
}

async function buildExportFiles(layer) {
  const filename = layer.filename || `${layer.id}.png`;
  const sourceDataUrl = await resolveLayerDownloadDataUrl(layer);
  const dataUrl = await prepareLayerDataUrl(layer, sourceDataUrl);

  if (shouldSplitIntoObjects(layer)) {
    const objectFiles = await splitLayerIntoObjects(dataUrl, filename);
    if (objectFiles.length) {
      return objectFiles;
    }
  }

  const exportDataUrl = await buildExportDataUrl(layer, dataUrl);
  return [{ filename, dataUrl: exportDataUrl }];
}

async function prepareLayerDataUrl(layer, dataUrl, sourceDataUrl = "") {
  if (!shouldAutoCleanBackground(layer?.id)) {
    return dataUrl;
  }
  try {
    const cleaned = await removeEdgeMatteBackground(dataUrl);
    const refined = await refineExtractionMask(cleaned, sourceDataUrl);
    return await highRefineLayerObjects(layer, refined, sourceDataUrl);
  } catch {
    return dataUrl;
  }
}

function shouldHighRefineLayer(layerId) {
  return ["background_elements", "character", "icon", "icon_plate"].includes(String(layerId || ""));
}

function shouldSplitIntoObjects(layer) {
  return layer?.id === "background_elements" && splitBackgroundElementsInput.checked && splitBackgroundObjectsInput.checked;
}

function shouldAutoCleanBackground(layerId) {
  return !["background", "background_base"].includes(String(layerId || ""));
}

async function splitLayerIntoObjects(dataUrl, filename) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);

  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const components = findOpaqueComponents(imageData.data, width, height);
  if (components.length <= 1) {
    return [];
  }

  const filtered = components
    .filter((component) => component.pixelCount >= 120)
    .sort((a, b) => {
      if (a.minY !== b.minY) return a.minY - b.minY;
      return a.minX - b.minX;
    });

  if (filtered.length <= 1) {
    return [];
  }

  const baseName = filename.replace(/\.png$/i, "");
  return filtered.map((component, index) => ({
    filename: `${baseName}-${String(index + 1).padStart(2, "0")}.png`,
    dataUrl: exportComponentToDataUrl(canvas, component)
  }));
}

function findOpaqueComponents(pixels, width, height) {
  const visited = new Uint8Array(width * height);
  const components = [];
  const queue = new Int32Array(width * height);
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x;
      if (visited[startIndex]) continue;
      visited[startIndex] = 1;

      const startAlpha = pixels[startIndex * 4 + 3];
      if (startAlpha === 0) continue;

      let head = 0;
      let tail = 0;
      queue[tail] = startIndex;
      tail += 1;

      const component = {
        minX: x,
        minY: y,
        maxX: x,
        maxY: y,
        pixelCount: 0
      };

      while (head < tail) {
        const index = queue[head];
        head += 1;
        const currentX = index % width;
        const currentY = Math.floor(index / width);
        component.pixelCount += 1;
        if (currentX < component.minX) component.minX = currentX;
        if (currentY < component.minY) component.minY = currentY;
        if (currentX > component.maxX) component.maxX = currentX;
        if (currentY > component.maxY) component.maxY = currentY;

        for (const [dx, dy] of directions) {
          const nextX = currentX + dx;
          const nextY = currentY + dy;
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
          const nextIndex = nextY * width + nextX;
          if (visited[nextIndex]) continue;
          visited[nextIndex] = 1;
          if (pixels[nextIndex * 4 + 3] === 0) continue;
          queue[tail] = nextIndex;
          tail += 1;
        }
      }

      components.push(component);
    }
  }

  return components;
}

function exportComponentToDataUrl(sourceCanvas, component) {
  const cropWidth = component.maxX - component.minX + 1;
  const cropHeight = component.maxY - component.minY + 1;
  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const context = canvas.getContext("2d");
  context.drawImage(
    sourceCanvas,
    component.minX,
    component.minY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );
  return canvas.toDataURL("image/png");
}

function buildExpandedBounds(component, width, height, padding = 18) {
  const minX = Math.max(0, component.minX - padding);
  const minY = Math.max(0, component.minY - padding);
  const maxX = Math.min(width - 1, component.maxX + padding);
  const maxY = Math.min(height - 1, component.maxY + padding);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

function exportBoundsToDataUrl(sourceCanvas, bounds) {
  const canvas = document.createElement("canvas");
  canvas.width = bounds.width;
  canvas.height = bounds.height;
  const context = canvas.getContext("2d");
  context.drawImage(
    sourceCanvas,
    bounds.minX,
    bounds.minY,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height
  );
  return canvas.toDataURL("image/png");
}

async function highRefineLayerObjects(layer, layerDataUrl, sourceDataUrl) {
  if (!shouldHighRefineLayer(layer?.id) || !sourceDataUrl) {
    return layerDataUrl;
  }

  const [layerImage, sourceImage] = await Promise.all([
    loadImage(layerDataUrl),
    loadImage(sourceDataUrl)
  ]);

  const width = layerImage.naturalWidth || layerImage.width;
  const height = layerImage.naturalHeight || layerImage.height;
  const layerCanvas = document.createElement("canvas");
  layerCanvas.width = width;
  layerCanvas.height = height;
  const layerContext = layerCanvas.getContext("2d", { willReadFrequently: true });
  layerContext.drawImage(layerImage, 0, 0);

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d");
  sourceContext.drawImage(sourceImage, 0, 0, width, height);

  const imageData = layerContext.getImageData(0, 0, width, height);
  const components = findOpaqueComponents(imageData.data, width, height)
    .filter((component) => component.pixelCount >= getHighRefineMinPixels(layer?.id))
    .sort((a, b) => b.pixelCount - a.pixelCount)
    .slice(0, getHighRefineMaxObjects(layer?.id));

  if (!components.length) {
    return layerDataUrl;
  }

  const resultCanvas = document.createElement("canvas");
  resultCanvas.width = width;
  resultCanvas.height = height;
  const resultContext = resultCanvas.getContext("2d");
  resultContext.drawImage(layerCanvas, 0, 0);

  for (const component of components) {
    const bounds = buildExpandedBounds(component, width, height, getHighRefinePadding(layer?.id, component));
    const sourceCropDataUrl = exportBoundsToDataUrl(sourceCanvas, bounds);
    const layerCropDataUrl = exportBoundsToDataUrl(layerCanvas, bounds);
    try {
      const refinedCropDataUrl = await requestObjectHighRefine(layer, sourceCropDataUrl, layerCropDataUrl, bounds);
      const refinedCropImage = await loadImage(refinedCropDataUrl);
      resultContext.clearRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
      resultContext.drawImage(refinedCropImage, bounds.minX, bounds.minY, bounds.width, bounds.height);
    } catch {
      // Keep the current local crop if the per-object refine call fails.
    }
  }

  return resultCanvas.toDataURL("image/png");
}

function getHighRefineMinPixels(layerId) {
  if (layerId === "icon") return 120;
  if (layerId === "icon_plate") return 220;
  if (layerId === "character") return 500;
  return 260;
}

function getHighRefineMaxObjects(layerId) {
  if (layerId === "icon") return 18;
  if (layerId === "icon_plate") return 18;
  if (layerId === "character") return 8;
  return 12;
}

function getHighRefinePadding(layerId, component) {
  const span = Math.max(component.maxX - component.minX + 1, component.maxY - component.minY + 1);
  if (layerId === "character") return Math.min(48, Math.max(18, Math.round(span * 0.08)));
  if (layerId === "icon_plate") return Math.min(28, Math.max(14, Math.round(span * 0.12)));
  return Math.min(24, Math.max(12, Math.round(span * 0.14)));
}

async function requestObjectHighRefine(layer, sourceCropDataUrl, layerCropDataUrl, bounds) {
  const response = await fetch("/api/ui-chaitu-refine-object", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      model: imageModelInput.value,
      sceneProfile: sceneProfileInput.value,
      sceneHint: sceneHintInput.value.trim(),
      characterHint: characterHintInput.value.trim(),
      iconHint: iconHintInput.value.trim(),
      layerId: layer?.id || "",
      sourceCropDataUrl,
      layerCropDataUrl,
      cropWidth: bounds.width,
      cropHeight: bounds.height
    })
  });

  const payload = await response.json();
  if (!response.ok || !payload?.dataUrl) {
    throw new Error(payload?.error || "高精修失败");
  }
  return payload.dataUrl;
}

async function buildExportDataUrl(layer, dataUrl) {
  if (!shouldTrimTransparentBounds(layer?.id)) {
    return dataUrl;
  }
  try {
    return await trimTransparentBounds(dataUrl);
  } catch {
    return dataUrl;
  }
}

function shouldTrimTransparentBounds(layerId) {
  return !["background", "background_base"].includes(String(layerId || ""));
}

async function removeEdgeMatteBackground(dataUrl) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);

  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const bgSamples = collectEdgeBackgroundSamples(pixels, width, height);
  if (!bgSamples.length) {
    return dataUrl;
  }

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  tail = enqueueEdgePixels(queue, visited, pixels, width, height, bgSamples);

  while (head < tail) {
    const index = queue[head];
    head += 1;

    const pixelOffset = index * 4;
    pixels[pixelOffset + 3] = 0;

    const x = index % width;
    const y = Math.floor(index / width);
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1]
    ];

    for (const [nextX, nextY] of neighbors) {
      if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
      const nextIndex = nextY * width + nextX;
      if (visited[nextIndex]) continue;
      visited[nextIndex] = 1;
      if (!isBackgroundLikePixel(pixels, nextIndex, bgSamples)) continue;
      queue[tail] = nextIndex;
      tail += 1;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function collectEdgeBackgroundSamples(pixels, width, height) {
  const buckets = new Map();
  const step = Math.max(1, Math.floor(Math.min(width, height) / 40));

  const addSample = (x, y) => {
    const index = (y * width + x) * 4;
    if (pixels[index + 3] === 0) return;
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const key = `${Math.round(r / 16)}_${Math.round(g / 16)}_${Math.round(b / 16)}`;
    const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.count += 1;
    buckets.set(key, bucket);
  };

  for (let x = 0; x < width; x += step) {
    addSample(x, 0);
    addSample(x, height - 1);
  }
  for (let y = 0; y < height; y += step) {
    addSample(0, y);
    addSample(width - 1, y);
  }

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((bucket) => ({
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count)
    }));
}

function enqueueEdgePixels(queue, visited, pixels, width, height, bgSamples) {
  let tail = 0;
  for (let x = 0; x < width; x += 1) {
    tail = tryQueuePixel(x, 0, queue, visited, pixels, width, bgSamples, tail);
    tail = tryQueuePixel(x, height - 1, queue, visited, pixels, width, bgSamples, tail);
  }
  for (let y = 0; y < height; y += 1) {
    tail = tryQueuePixel(0, y, queue, visited, pixels, width, bgSamples, tail);
    tail = tryQueuePixel(width - 1, y, queue, visited, pixels, width, bgSamples, tail);
  }
  return tail;
}

function tryQueuePixel(x, y, queue, visited, pixels, width, bgSamples, tail) {
  const index = y * width + x;
  if (visited[index]) return tail;
  visited[index] = 1;
  if (!isBackgroundLikePixel(pixels, index, bgSamples)) return tail;
  queue[tail] = index;
  return tail + 1;
}

function isBackgroundLikePixel(pixels, index, bgSamples) {
  const offset = index * 4;
  const alpha = pixels[offset + 3];
  if (alpha === 0) return true;

  const color = {
    r: pixels[offset],
    g: pixels[offset + 1],
    b: pixels[offset + 2]
  };
  return isBackgroundLikeColor(color, bgSamples, 46);
}

function colorDistance(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function refineExtractionMask(dataUrl, sourceDataUrl = "") {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);

  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const bgSamples = collectEdgeBackgroundSamples(pixels, width, height);
  const sourcePixels = await loadSourcePixels(sourceDataUrl, width, height);

  removeBackgroundLikeRegions(pixels, width, height, bgSamples);
  removeBackgroundLikeEdgeFringe(pixels, width, height, bgSamples);
  removeSmallOpaqueComponents(pixels, width, height, 12);
  fillTinyProtectedGapsFromSource(pixels, sourcePixels, width, height, bgSamples);
  restoreEdgeColorsFromSource(pixels, sourcePixels, width, height, bgSamples);

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

async function loadSourcePixels(sourceDataUrl, width, height) {
  if (!sourceDataUrl) {
    return null;
  }
  try {
    const image = await loadImage(sourceDataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, width, height);
    return context.getImageData(0, 0, width, height).data;
  } catch {
    return null;
  }
}

function removeBackgroundLikeRegions(pixels, width, height, bgSamples) {
  if (!bgSamples.length) {
    return;
  }

  const components = findBackgroundCandidateComponents(pixels, width, height, bgSamples);
  for (const component of components) {
    if (!component.touchesEdge) continue;
    for (const index of component.indices) {
      const offset = index * 4;
      pixels[offset + 3] = 0;
      pixels[offset] = 0;
      pixels[offset + 1] = 0;
      pixels[offset + 2] = 0;
    }
  }
}

function removeSmallOpaqueComponents(pixels, width, height, minPixels) {
  const components = findOpaqueComponents(pixels, width, height);
  for (const component of components) {
    if (component.pixelCount >= minPixels) continue;
    for (let y = component.minY; y <= component.maxY; y += 1) {
      for (let x = component.minX; x <= component.maxX; x += 1) {
        const index = y * width + x;
        const offset = index * 4;
        if (pixels[offset + 3] === 0) continue;
        pixels[offset + 3] = 0;
      }
    }
  }
}


function fillTinyProtectedGapsFromSource(pixels, sourcePixels, width, height, bgSamples) {
  if (!sourcePixels) {
    return;
  }

  const alphaSnapshot = new Uint8ClampedArray(width * height);
  for (let index = 0; index < width * height; index += 1) {
    alphaSnapshot[index] = pixels[index * 4 + 3];
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (alphaSnapshot[index] !== 0) continue;
      const opaqueNeighbors = countOpaqueNeighbors(alphaSnapshot, width, height, x, y);
      if (opaqueNeighbors < 7) continue;
      const sourceOffset = index * 4;
      const sourceColor = {
        r: sourcePixels[sourceOffset],
        g: sourcePixels[sourceOffset + 1],
        b: sourcePixels[sourceOffset + 2]
      };
      if (isBackgroundLikeColor(sourceColor, bgSamples, 36)) continue;
      pixels[sourceOffset] = sourceColor.r;
      pixels[sourceOffset + 1] = sourceColor.g;
      pixels[sourceOffset + 2] = sourceColor.b;
      pixels[sourceOffset + 3] = 255;
    }
  }
}

function restoreEdgeColorsFromSource(pixels, sourcePixels, width, height, bgSamples) {
  if (!sourcePixels) {
    return;
  }

  const alphaSnapshot = new Uint8ClampedArray(width * height);
  for (let index = 0; index < width * height; index += 1) {
    alphaSnapshot[index] = pixels[index * 4 + 3];
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (alphaSnapshot[index] === 0) continue;
      const offset = index * 4;
      const transparentNeighbors = countTransparentNeighbors(alphaSnapshot, width, height, x, y);
      if (transparentNeighbors === 0) continue;
      const color = {
        r: pixels[offset],
        g: pixels[offset + 1],
        b: pixels[offset + 2]
      };
      if (!isBackgroundLikeColor(color, bgSamples, 44)) continue;
      pixels[offset] = sourcePixels[offset];
      pixels[offset + 1] = sourcePixels[offset + 1];
      pixels[offset + 2] = sourcePixels[offset + 2];
    }
  }
}

function countOpaqueNeighbors(alphaSnapshot, width, height, x, y) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const neighborX = x + dx;
      const neighborY = y + dy;
      if (neighborX < 0 || neighborX >= width || neighborY < 0 || neighborY >= height) continue;
      const neighborIndex = neighborY * width + neighborX;
      if (alphaSnapshot[neighborIndex] !== 0) {
        count += 1;
      }
    }
  }
  return count;
}

function removeBackgroundLikeEdgeFringe(pixels, width, height, bgSamples) {
  if (!bgSamples.length) {
    return;
  }

  const alphaSnapshot = new Uint8ClampedArray(width * height);
  for (let index = 0; index < width * height; index += 1) {
    alphaSnapshot[index] = pixels[index * 4 + 3];
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (alphaSnapshot[index] === 0) continue;
      const offset = index * 4;
      const color = {
        r: pixels[offset],
        g: pixels[offset + 1],
        b: pixels[offset + 2]
      };
      if (!isBackgroundLikeColor(color, bgSamples, 40)) continue;
      const transparentNeighbors = countTransparentNeighbors(alphaSnapshot, width, height, x, y);
      if (transparentNeighbors >= 6) {
        pixels[offset + 3] = 0;
        pixels[offset] = 0;
        pixels[offset + 1] = 0;
        pixels[offset + 2] = 0;
      }
    }
  }
}

function countTransparentNeighbors(alphaSnapshot, width, height, x, y) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const neighborX = x + dx;
      const neighborY = y + dy;
      if (neighborX < 0 || neighborX >= width || neighborY < 0 || neighborY >= height) continue;
      const neighborIndex = neighborY * width + neighborX;
      if (alphaSnapshot[neighborIndex] === 0) {
        count += 1;
      }
    }
  }
  return count;
}

function isBackgroundLikeColor(color, bgSamples, tolerance = 46) {
  if (!bgSamples.length) {
    return false;
  }

  let minDistance = Infinity;
  for (const sample of bgSamples) {
    const distance = colorDistance(color, sample);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  return minDistance <= tolerance;
}

function findBackgroundCandidateComponents(pixels, width, height, bgSamples) {
  const visited = new Uint8Array(width * height);
  const components = [];
  const queue = new Int32Array(width * height);
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x;
      if (visited[startIndex]) continue;
      visited[startIndex] = 1;
      const startOffset = startIndex * 4;
      if (pixels[startOffset + 3] === 0) continue;
      const startColor = {
        r: pixels[startOffset],
        g: pixels[startOffset + 1],
        b: pixels[startOffset + 2]
      };
      if (!isBackgroundLikeColor(startColor, bgSamples, 46)) continue;

      let head = 0;
      let tail = 0;
      queue[tail] = startIndex;
      tail += 1;

      const component = {
        indices: [],
        pixelCount: 0,
        touchesEdge: false
      };

      while (head < tail) {
        const index = queue[head];
        head += 1;
        const currentX = index % width;
        const currentY = Math.floor(index / width);
        component.indices.push(index);
        component.pixelCount += 1;
        if (currentX === 0 || currentX === width - 1 || currentY === 0 || currentY === height - 1) {
          component.touchesEdge = true;
        }

        for (const [dx, dy] of directions) {
          const nextX = currentX + dx;
          const nextY = currentY + dy;
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
          const nextIndex = nextY * width + nextX;
          if (visited[nextIndex]) continue;
          visited[nextIndex] = 1;
          const nextOffset = nextIndex * 4;
          if (pixels[nextOffset + 3] === 0) continue;
          const nextColor = {
            r: pixels[nextOffset],
            g: pixels[nextOffset + 1],
            b: pixels[nextOffset + 2]
          };
          if (!isBackgroundLikeColor(nextColor, bgSamples, 46)) continue;
          queue[tail] = nextIndex;
          tail += 1;
        }
      }

      components.push(component);
    }
  }

  return components;
}

async function trimTransparentBounds(dataUrl) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);

  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha === 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return dataUrl;
  }

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  if (cropWidth === width && cropHeight === height) {
    return dataUrl;
  }

  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = cropWidth;
  trimmedCanvas.height = cropHeight;
  const trimmedContext = trimmedCanvas.getContext("2d");
  trimmedContext.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return trimmedCanvas.toDataURL("image/png");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("加载导出图片失败。"));
    image.src = src;
  });
}

async function resolveLayerDownloadDataUrl(layer) {
  const imageUrl = String(layer?.imageUrl || "");
  if (!imageUrl) {
    throw new Error("缺少可下载的图片地址。");
  }
  if (imageUrl.startsWith("data:image/")) {
    return imageUrl;
  }
  if (resolvedDownloadCache.has(imageUrl)) {
    return resolvedDownloadCache.get(imageUrl);
  }

  const response = await fetch("/api/resolve-image-reference", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      imageUrl
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload?.dataUrl) {
    throw new Error(payload?.error || "远程图片转换下载链接失败。");
  }

  resolvedDownloadCache.set(imageUrl, payload.dataUrl);
  return payload.dataUrl;
}

function triggerDataUrlDownload(dataUrl, filename) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function sumLayerCount(groups) {
  return groups.reduce((sum, group) => sum + ((group.layers || []).length), 0);
}

function resetAll() {
  sourceItems.forEach((item) => {
    if (item.objectUrl) {
      URL.revokeObjectURL(item.objectUrl);
    }
  });

  sourceItems = [];
  activeSourceId = "";
  resultGroups = [];
  resolvedDownloadCache.clear();
  sourceImageInput.value = "";
  sceneProfileInput.value = "auto";
  sceneHintInput.value = "";
  characterHintInput.value = "";
  iconHintInput.value = "";
  targetBackgroundInput.checked = true;
  targetCharacterInput.checked = true;
  targetIconInput.checked = true;
  targetIconPlateInput.checked = true;
  splitBackgroundElementsInput.checked = false;
  splitBackgroundObjectsInput.checked = true;
  syncBackgroundOptionState();
  renderEmptySource();
  renderResultGroups();
  setStatus("已清空。");
}

function setStatus(text, isError = false) {
  runStatus.textContent = text;
  runStatus.style.color = isError ? "#aa3a20" : "";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取图片失败。"));
    reader.readAsDataURL(file);
  });
}

function formatSize(size) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
