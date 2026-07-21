from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlparse
import base64
import json
import mimetypes
import os
import socket
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.request

try:
    import cv2
    import numpy as np
except Exception:  # pragma: no cover - optional runtime dependency
    cv2 = None
    np = None


ROOT = Path(__file__).resolve().parent
RUNTIME_TEMP_ROOT = ROOT / ".runtime-temp"
PORT = int(os.environ.get("GAME_UX_BOARD_PORT", "8787"))
BABYLON_URL = "https://babylon.garenanow.com/ai/babylon/dock"
BABYLON_HOST = "https://babylon.garenanow.com"
ALLOWED_TEXT_MODELS = {
    "kimi-k2-thinking",
    "gemini-2.5-pro",
    "gpt-5.2",
    "gpt-5.4",
    "glm-5",
}

DEFAULT_IMAGE_TIMEOUT_SECONDS = 360
DEFAULT_TEXT_TIMEOUT_SECONDS = 300
MAX_REFERENCE_IMAGE_BYTES = 20 * 1024 * 1024
REFERENCE_IMAGE_LIMIT = 5
DESIGN_REQUEST_STATUS_LIMIT = 120
UI_CHAITU_REFINE_PASSES = 3
PROXY_ENV_KEYS = (
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "GIT_HTTP_PROXY",
    "GIT_HTTPS_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
    "git_http_proxy",
    "git_https_proxy",
)


def clear_external_proxy_env():
    cleared = []
    for key in PROXY_ENV_KEYS:
        if os.environ.pop(key, None):
            cleared.append(key)
    os.environ["NO_PROXY"] = "localhost,127.0.0.1,::1"
    os.environ["no_proxy"] = "localhost,127.0.0.1,::1"
    return cleared


CLEARED_PROXY_ENV_KEYS = clear_external_proxy_env()
NO_PROXY_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def read_env_file():
    env = {}
    env_path = ROOT / ".env"
    if not env_path.exists():
        return env

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


def json_bytes(payload):
    return json.dumps(payload, ensure_ascii=False).encode("utf-8")


DESIGN_REQUEST_STATUSES = {}
DESIGN_REQUEST_STATUS_ORDER = []
DESIGN_REQUEST_STATUS_LOCK = threading.Lock()


def sanitize_request_id(value):
    text = str(value or "").strip()
    if not text:
        return ""
    safe = []
    for char in text[:120]:
        if char.isalnum() or char in ("-", "_", ".", ":"):
            safe.append(char)
    return "".join(safe)[:120]


def record_design_request_stage(request_id, stage, label="", **details):
    request_id = sanitize_request_id(request_id)
    if not request_id:
        return
    now = time.time()
    event = {
        "stage": stage,
        "label": label or stage,
        "updatedAt": int(now * 1000),
    }
    for key in (
        "model",
        "referenceCount",
        "promptLength",
        "durationMs",
        "rawStatus",
        "code",
        "error",
        "sourceCount",
        "usableCount",
        "referenceIndex",
        "referenceType",
        "warning",
        "imageUrl",
        "images",
        "files",
        "referenceWarnings",
    ):
        if key in details and details[key] not in (None, ""):
            event[key] = details[key]

    with DESIGN_REQUEST_STATUS_LOCK:
        status = DESIGN_REQUEST_STATUSES.get(request_id)
        if not status:
            status = {
                "requestId": request_id,
                "events": [],
                "createdAt": event["updatedAt"],
            }
            DESIGN_REQUEST_STATUSES[request_id] = status
            DESIGN_REQUEST_STATUS_ORDER.append(request_id)
        status.update(event)
        status["events"] = (status.get("events") or [])[-20:] + [event]
        while len(DESIGN_REQUEST_STATUS_ORDER) > DESIGN_REQUEST_STATUS_LIMIT:
            old_request_id = DESIGN_REQUEST_STATUS_ORDER.pop(0)
            DESIGN_REQUEST_STATUSES.pop(old_request_id, None)

    log_parts = [f"[design-request:{request_id}]", stage]
    for key in (
        "model",
        "referenceCount",
        "promptLength",
        "durationMs",
        "rawStatus",
        "code",
        "sourceCount",
        "usableCount",
        "referenceIndex",
        "referenceType",
    ):
        if key in event:
            log_parts.append(f"{key}={event[key]}")
    if event.get("warning"):
        log_parts.append(f"warning={str(event['warning'])[:160]}")
    if event.get("error"):
        log_parts.append(f"error={str(event['error'])[:240]}")
    print(" ".join(log_parts), flush=True)


def log_design_request_without_id(stage, **details):
    log_parts = ["[design-request:missing_request_id]", stage]
    for key in ("model", "referenceCount", "promptLength", "durationMs", "rawStatus", "code"):
        value = details.get(key)
        if value not in (None, ""):
            log_parts.append(f"{key}={value}")
    error = details.get("error")
    if error:
        log_parts.append(f"error={str(error)[:240]}")
    print(" ".join(log_parts), flush=True)


def get_design_request_status(request_id):
    request_id = sanitize_request_id(request_id)
    if not request_id:
        return {
            "ok": False,
            "found": False,
            "error": "Missing requestId",
        }
    with DESIGN_REQUEST_STATUS_LOCK:
        status = DESIGN_REQUEST_STATUSES.get(request_id)
        if not status:
            return {
                "ok": True,
                "found": False,
                "requestId": request_id,
            }
        return {
            "ok": True,
            "found": True,
            **status,
            "events": list(status.get("events") or []),
        }


def env_int(env, key, default):
    raw = env.get(key) or os.environ.get(key)
    try:
        value = int(raw)
        return value if value > 0 else default
    except (TypeError, ValueError):
        return default


def bounded_int(value, default, minimum, maximum):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))


def safe_download_filename(value, default="download"):
    text = str(value or default).strip()
    for char in '\\/:*?"<>|':
        text = text.replace(char, "_")
    text = "_".join(text.split())
    return (text[:120] or default).strip("._ ") or default


def ensure_pdf_filename(value):
    filename = safe_download_filename(value, "document.pdf")
    if not filename.lower().endswith(".pdf"):
        filename += ".pdf"
    return filename


def content_disposition_filename(filename):
    safe = ensure_pdf_filename(filename)
    fallback = "".join(char if 32 <= ord(char) < 127 and char not in '"\\' else "_" for char in safe)
    fallback = fallback or "document.pdf"
    return f'attachment; filename="{fallback}"; filename*=UTF-8\'\'{quote(safe)}'


PDF_BROWSER_CANDIDATES = (
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
)


def find_pdf_browser():
    env = read_env_file()
    candidates = [os.environ.get("PDF_BROWSER_PATH"), env.get("PDF_BROWSER_PATH"), *PDF_BROWSER_CANDIDATES]
    for candidate in candidates:
        if not candidate:
            continue
        path = Path(candidate.strip().strip('"'))
        if path.exists() and path.is_file():
            return str(path)
    return ""


def run_browser_pdf_export(browser_path, html_path, pdf_path, profile_path):
    base_command = [
        browser_path,
        "--headless=new",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
        "--no-first-run",
        "--no-pdf-header-footer",
        f"--user-data-dir={profile_path}",
        f"--print-to-pdf={pdf_path}",
        html_path.as_uri(),
    ]
    result = subprocess.run(base_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=90, check=False)
    if result.returncode == 0 and pdf_path.exists() and pdf_path.stat().st_size > 0:
        return result

    fallback_command = list(base_command)
    fallback_command[1] = "--headless"
    return subprocess.run(fallback_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=90, check=False)


def export_pdf_from_html(body):
    html = str(body.get("html") or "")
    if not html.strip():
        raise RuntimeError("缺少可导出的 HTML 内容。")
    if len(html.encode("utf-8")) > 12 * 1024 * 1024:
        raise RuntimeError("PDF 内容过大，请缩短文档后重试。")

    browser_path = find_pdf_browser()
    if not browser_path:
        raise RuntimeError("未找到可用于生成 PDF 的 Edge/Chrome，请安装浏览器或配置 PDF_BROWSER_PATH。")

    filename = ensure_pdf_filename(body.get("filename") or "document.pdf")
    RUNTIME_TEMP_ROOT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="game_ux_pdf_", dir=RUNTIME_TEMP_ROOT) as temp_dir:
        temp_path = Path(temp_dir)
        html_path = temp_path / "document.html"
        pdf_path = temp_path / "document.pdf"
        profile_path = temp_path / "profile"
        html_path.write_text(html, encoding="utf-8")

        result = run_browser_pdf_export(browser_path, html_path, pdf_path, profile_path)
        if result.returncode != 0 or not pdf_path.exists() or pdf_path.stat().st_size <= 0:
            stderr = result.stderr.decode("utf-8", errors="replace").strip()
            stdout = result.stdout.decode("utf-8", errors="replace").strip()
            detail = (stderr or stdout or "浏览器未返回 PDF。")[-1200:]
            raise RuntimeError(f"PDF 生成失败：{detail}")

        return filename, pdf_path.read_bytes()


def absolute_babylon_url(url):
    if not url:
        return ""
    if url.startswith(("http://", "https://", "data:image/")):
        return url
    if url.startswith("/"):
        return f"{BABYLON_HOST}{url}"
    return url


def open_babylon_request(request, timeout_seconds):
    return NO_PROXY_OPENER.open(request, timeout=timeout_seconds)


def is_trusted_babylon_resource_url(url):
    try:
        parsed = urlparse(url)
    except Exception:
        return False
    return (
        parsed.scheme == "https"
        and parsed.netloc == "babylon.garenanow.com"
        and (parsed.path.startswith("/resources/") or parsed.path.startswith("/ai/babylon/resources/"))
    )


def download_image_as_data_url(url, timeout_seconds, token=None):
    if not isinstance(url, str) or not url:
        raise RuntimeError("Missing image URL.")
    if url.startswith("data:image/"):
        return url
    if not is_trusted_babylon_resource_url(url):
        raise RuntimeError("Only Babylon resource image URLs can be converted automatically.")

    headers = {"User-Agent": "game-ux-board/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers, method="GET")

    try:
        with open_babylon_request(request, timeout_seconds) as response:
            content_type = (response.headers.get("Content-Type") or "").split(";", 1)[0].strip().lower()
            chunks = []
            total = 0
            while True:
                chunk = response.read(256 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_REFERENCE_IMAGE_BYTES:
                    raise RuntimeError("Reference image is too large.")
                chunks.append(chunk)
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Reference image download failed: {error.code} {details}") from error
    except (TimeoutError, socket.timeout) as error:
        raise RuntimeError("Reference image download timed out.") from error
    except urllib.error.URLError as error:
        raise RuntimeError(format_babylon_network_error("image reference", error)) from error

    if not content_type.startswith("image/"):
        guessed = mimetypes.guess_type(urlparse(url).path)[0] or ""
        if guessed.startswith("image/"):
            content_type = guessed
        else:
            raise RuntimeError(f"Reference URL did not return image data: {content_type or 'unknown'}")

    image_bytes = b"".join(chunks)
    if not image_bytes:
        raise RuntimeError("Reference image is empty.")
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def decode_image_data_url(data_url):
    if not isinstance(data_url, str) or not data_url.startswith("data:image/"):
        raise RuntimeError("缺少有效的图片 data URL。")
    try:
        header, encoded = data_url.split(",", 1)
    except ValueError as error:
        raise RuntimeError("图片 data URL 格式无效。") from error
    mime_type = "image/png"
    if ";" in header:
        mime_type = header[5:header.index(";")] or mime_type
    try:
        return mime_type, base64.b64decode(encoded)
    except Exception as error:
        raise RuntimeError("图片 data URL 解码失败。") from error


def encode_png_data_url(image_bytes):
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def decode_rgba_image_from_data_url(data_url):
    if cv2 is None or np is None:
        raise RuntimeError("本地高精修依赖缺失，请先安装 numpy 和 opencv-python-headless。")
    _, image_bytes = decode_image_data_url(data_url)
    array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_UNCHANGED)
    if image is None:
        raise RuntimeError("图片解码失败。")
    if image.ndim == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGRA)
    elif image.shape[2] == 3:
        alpha = np.full((image.shape[0], image.shape[1], 1), 255, dtype=np.uint8)
        image = np.concatenate([image, alpha], axis=2)
    return image


def encode_rgba_png_data_url(image):
    ok, encoded = cv2.imencode(".png", image)
    if not ok:
        raise RuntimeError("PNG 编码失败。")
    return encode_png_data_url(encoded.tobytes())


def collect_border_background_palette(image_bgra):
    height, width = image_bgra.shape[:2]
    step = max(1, min(width, height) // 36)
    buckets = {}

    def add_pixel(pixel):
        if int(pixel[3]) <= 6:
            return
        b, g, r = [int(value) for value in pixel[:3]]
        key = (r // 16, g // 16, b // 16)
        bucket = buckets.get(key)
        if not bucket:
            bucket = [0, 0, 0, 0]
            buckets[key] = bucket
        bucket[0] += b
        bucket[1] += g
        bucket[2] += r
        bucket[3] += 1

    for x in range(0, width, step):
        add_pixel(image_bgra[0, x])
        add_pixel(image_bgra[height - 1, x])
    for y in range(0, height, step):
        add_pixel(image_bgra[y, 0])
        add_pixel(image_bgra[y, width - 1])

    palette = []
    for bucket in sorted(buckets.values(), key=lambda item: item[3], reverse=True)[:8]:
        count = max(1, bucket[3])
        palette.append([
            bucket[0] / count,
            bucket[1] / count,
            bucket[2] / count,
        ])
    return np.array(palette, dtype=np.float32) if palette else np.zeros((0, 3), dtype=np.float32)


def compute_background_distance_map(image_bgra, palette):
    rgb = image_bgra[:, :, :3].astype(np.float32)
    if palette.size == 0:
        return np.full(rgb.shape[:2], 255.0, dtype=np.float32)
    diffs = rgb[:, :, None, :] - palette[None, None, :, :]
    return np.sqrt(np.sum(diffs * diffs, axis=3)).min(axis=2)


def threshold_distance_map(distance_map):
    clipped = np.clip(distance_map, 0, 255).astype(np.uint8)
    threshold_value, _ = cv2.threshold(clipped, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return int(max(22, min(90, threshold_value)))


def build_local_object_mask(layer_image_bgra):
    height, width = layer_image_bgra.shape[:2]
    area = max(1, height * width)
    alpha = layer_image_bgra[:, :, 3]
    palette = collect_border_background_palette(layer_image_bgra)
    distance_map = compute_background_distance_map(layer_image_bgra, palette)
    color_threshold = threshold_distance_map(distance_map)
    color_foreground = distance_map >= color_threshold
    has_transparency = int(np.count_nonzero(alpha <= 8)) >= area * 0.01
    alpha_foreground = alpha >= 26

    if has_transparency:
        mask = np.logical_or(alpha_foreground, distance_map >= max(20, color_threshold - 6))
    else:
        mask = color_foreground

    background_like = distance_map <= min(110, color_threshold + 10)
    background_like = np.logical_or(background_like, alpha <= 8)
    label_count, labels = cv2.connectedComponents(background_like.astype(np.uint8), connectivity=4)
    background_labels = set()
    if label_count > 1:
        background_labels.update(np.unique(labels[0, :]).tolist())
        background_labels.update(np.unique(labels[height - 1, :]).tolist())
        background_labels.update(np.unique(labels[:, 0]).tolist())
        background_labels.update(np.unique(labels[:, width - 1]).tolist())
        background_labels.discard(0)
    reachable_background = np.isin(labels, list(background_labels))
    mask = np.logical_and(mask, np.logical_not(reachable_background))
    return (mask.astype(np.uint8) * 255), distance_map


def keep_meaningful_components(mask_u8):
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask_u8, connectivity=8)
    if count <= 1:
        return mask_u8
    areas = [int(stats[index, cv2.CC_STAT_AREA]) for index in range(1, count)]
    if not areas:
        return mask_u8
    largest_area = max(areas)
    min_keep_area = max(18, min(largest_area // 12, max(32, largest_area // 40)))
    cleaned = np.zeros_like(mask_u8)
    for index in range(1, count):
        area = int(stats[index, cv2.CC_STAT_AREA])
        if area < min_keep_area:
            continue
        cleaned[labels == index] = 255
    return cleaned


def fill_small_holes(mask_u8):
    inverse = cv2.bitwise_not(mask_u8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(inverse, connectivity=8)
    if count <= 1:
        return mask_u8
    height, width = mask_u8.shape[:2]
    max_hole_area = max(16, (height * width) // 900)
    filled = mask_u8.copy()
    for index in range(1, count):
        left = int(stats[index, cv2.CC_STAT_LEFT])
        top = int(stats[index, cv2.CC_STAT_TOP])
        component_width = int(stats[index, cv2.CC_STAT_WIDTH])
        component_height = int(stats[index, cv2.CC_STAT_HEIGHT])
        area = int(stats[index, cv2.CC_STAT_AREA])
        touches_edge = (
            left == 0
            or top == 0
            or left + component_width >= width
            or top + component_height >= height
        )
        if touches_edge or area > max_hole_area:
            continue
        filled[labels == index] = 255
    return filled


def smooth_object_mask(mask_u8):
    height, width = mask_u8.shape[:2]
    scale = 4
    upsampled = cv2.resize(mask_u8, (width * scale, height * scale), interpolation=cv2.INTER_LINEAR)
    kernel_size = max(3, (max(1, min(width, height) // 42) * 2) + 1)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    refined = cv2.morphologyEx(upsampled, cv2.MORPH_CLOSE, kernel, iterations=1)
    refined = cv2.morphologyEx(refined, cv2.MORPH_OPEN, kernel, iterations=1)
    refined = cv2.GaussianBlur(refined, (0, 0), sigmaX=1.0, sigmaY=1.0)
    downsampled = cv2.resize(refined, (width, height), interpolation=cv2.INTER_AREA)
    downsampled[mask_u8 == 0] = np.minimum(downsampled[mask_u8 == 0], 10)
    downsampled[mask_u8 == 255] = np.maximum(downsampled[mask_u8 == 255], 245)
    return downsampled.astype(np.uint8)


def decontaminate_edge_colors(image_bgra, alpha_u8):
    color = image_bgra[:, :, :3].copy()
    core_mask = (alpha_u8 >= 245).astype(np.uint8)
    if int(np.count_nonzero(core_mask)) == 0:
        return color
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    propagated = np.zeros_like(color)
    propagated[core_mask > 0] = color[core_mask > 0]
    filled_mask = (core_mask * 255).astype(np.uint8)
    for _ in range(6):
        expanded_color = cv2.dilate(propagated, kernel, iterations=1)
        expanded_mask = cv2.dilate(filled_mask, kernel, iterations=1)
        new_pixels = np.logical_and(expanded_mask > 0, filled_mask == 0)
        propagated[new_pixels] = expanded_color[new_pixels]
        filled_mask = expanded_mask
    edge_band = np.logical_and(alpha_u8 > 0, alpha_u8 < 245)
    propagated_ready = np.logical_and(edge_band, filled_mask > 0)
    color[propagated_ready] = propagated[propagated_ready]
    return color


def local_high_refine_object_crop(source_crop_data_url, layer_crop_data_url):
    _ = source_crop_data_url  # Reserved for future source-guided refinement.
    layer_image_bgra = decode_rgba_image_from_data_url(layer_crop_data_url)
    mask_u8, _distance_map = build_local_object_mask(layer_image_bgra)
    mask_u8 = keep_meaningful_components(mask_u8)
    mask_u8 = fill_small_holes(mask_u8)
    alpha_u8 = smooth_object_mask(mask_u8)
    refined_color = decontaminate_edge_colors(layer_image_bgra, alpha_u8)

    output = np.zeros_like(layer_image_bgra)
    output[:, :, :3] = refined_color
    output[:, :, 3] = alpha_u8
    output[alpha_u8 == 0] = 0
    return encode_rgba_png_data_url(output)


def compact_reference_error(error):
    text = str(error or "").replace("\r", " ").replace("\n", " ").strip()
    return (text[:180] or "unknown reference error")


def prepare_reference_images_for_babylon(
    images,
    timeout_seconds,
    token,
    *,
    convert_trusted_urls=False,
    request_id="",
):
    result = []
    warnings = []
    source_images = images or []
    if convert_trusted_urls:
        record_design_request_stage(
            request_id,
            "references_converting",
            "正在转换参考图",
            sourceCount=len(source_images),
            referenceCount=0,
        )
    for index, item in enumerate(source_images):
        if not isinstance(item, str):
            continue
        if item.startswith("data:image/"):
            result.append(item)
        elif is_trusted_babylon_resource_url(item):
            if convert_trusted_urls:
                try:
                    result.append(download_image_as_data_url(item, timeout_seconds, token))
                    record_design_request_stage(
                        request_id,
                        "reference_ready",
                        "参考图已转换",
                        referenceIndex=index + 1,
                        referenceType="babylon-resource-url",
                        usableCount=len(result),
                    )
                except Exception as error:
                    message = compact_reference_error(error)
                    warnings.append(f"参考图 {index + 1} 转换失败：{message}")
                    record_design_request_stage(
                        request_id,
                        "reference_failed",
                        "参考图转换失败",
                        referenceIndex=index + 1,
                        referenceType="babylon-resource-url",
                        error=message,
                    )
            else:
                result.append(item)
        if len(result) >= REFERENCE_IMAGE_LIMIT:
            break
    if convert_trusted_urls:
        if source_images and not result:
            warning = "全部参考图转换失败，本次将不带参考图请求 Babylon。"
            warnings.append(warning)
            record_design_request_stage(
                request_id,
                "references_ready",
                "参考图转换失败，继续无参考图生成",
                sourceCount=len(source_images),
                usableCount=0,
                referenceCount=0,
                warning=warning,
            )
            return result, warnings
        record_design_request_stage(
            request_id,
            "references_ready",
            "参考图已整理",
            sourceCount=len(source_images),
            usableCount=len(result),
            referenceCount=len(result),
        )
        return result, warnings
    return result


def format_babylon_network_error(scope, error):
    reason = getattr(error, "reason", error)
    reason_text = str(reason)
    proxy_hint = (
        " 检测到本地代理环境可能异常，服务已尝试绕过 HTTP_PROXY / HTTPS_PROXY / ALL_PROXY；"
        "如果仍失败，请确认没有外部工具再次注入代理或拦截 https://babylon.garenanow.com。"
    )
    if "10061" in reason_text or "127.0.0.1:9" in reason_text or "Connection refused" in reason_text:
        return f"Babylon {scope} request failed: {reason_text}.{proxy_hint}"
    return f"Babylon {scope} request failed: {reason_text}"


class BabylonDesignError(RuntimeError):
    def __init__(self, message, code="BABYLON_IMAGE_ERROR", model="", duration_ms=0, raw_status="", reference_warnings=None):
        super().__init__(message)
        self.payload = {
            "error": message,
            "code": code,
            "message": message,
            "model": model,
            "durationMs": duration_ms,
            "rawStatus": raw_status,
        }
        if reference_warnings:
            self.payload["referenceWarnings"] = reference_warnings


def format_babylon_text_http_error(status_code, details):
    parsed = None
    try:
        parsed = json.loads(details) if details else None
    except json.JSONDecodeError:
        parsed = None

    root = parsed if isinstance(parsed, dict) else {}
    nested_error = root.get("error") if isinstance(root.get("error"), dict) else {}
    code = root.get("code") or nested_error.get("code") or root.get("error_code") or ""
    message = root.get("message") or nested_error.get("message") or ""
    if not message and isinstance(root.get("error"), str):
        message = root.get("error")
    retryable = root.get("retryable", nested_error.get("retryable"))

    parts = [f"Babylon text request failed: {status_code}"]
    if code:
        parts.append(f"code: {code}")
    if message and message != code:
        parts.append(f"message: {message}")
    if retryable is not None:
        parts.append(f"retryable: {str(bool(retryable)).lower()}")
    if not code and not message and details:
        parts.append(f"detail: {details[:500]}")
    return "; ".join(parts)


def normalize_canvas_spec(body):
    aspect = str(body.get("aspectRatio") or body.get("aspect_ratio") or "")
    platform = str(body.get("platform") or "")
    portrait = (
        "9:16" in aspect
        or "9:16" in platform
        or "竖" in platform
        or "portrait" in platform.lower()
    )
    safe_size = "1008x1792" if portrait else "1792x1008"
    size = normalize_image_generation_size(body.get("size"), safe_size)
    return {
        "aspect_ratio": "9:16" if portrait else "16:9",
        "figma_size": "1080x1920" if portrait else "1920x1080",
        "size": size,
    }


def normalize_image_generation_size(raw_size, fallback_size):
    value = str(raw_size or "").strip().lower()
    if "x" not in value:
        return fallback_size

    parts = value.split("x", 1)
    try:
        width = int(parts[0])
        height = int(parts[1])
    except (TypeError, ValueError):
        return fallback_size

    if width <= 0 or height <= 0:
        return fallback_size
    if width % 16 != 0 or height % 16 != 0:
        return fallback_size
    return f"{width}x{height}"


def format_design_composition_for_backend(analysis):
    if not isinstance(analysis, dict):
        return ""
    picked = {
        "screenGoal": analysis.get("screenGoal") or analysis.get("goal") or "",
        "requiredComponents": analysis.get("requiredComponents") or analysis.get("required") or [],
        "optionalComponents": analysis.get("optionalComponents") or analysis.get("optional") or [],
        "forbiddenComponents": analysis.get("forbiddenComponents") or analysis.get("forbidden") or [],
        "layoutSlots": analysis.get("layoutSlots") or analysis.get("regions") or analysis.get("layout") or [],
        "primaryActions": analysis.get("primaryActions") or analysis.get("actions") or [],
        "stateWidgets": analysis.get("stateWidgets") or analysis.get("states") or [],
        "systemEntrances": analysis.get("systemEntrances") or analysis.get("entryPoints") or [],
        "persistentAnchors": analysis.get("persistentAnchors") or analysis.get("anchorComponents") or analysis.get("fixedAnchors") or [],
        "titlePolicy": analysis.get("titlePolicy") or analysis.get("headerPolicy") or analysis.get("titleRule") or "",
        "anchorExceptions": analysis.get("anchorExceptions") or analysis.get("specialCases") or analysis.get("exceptionRules") or [],
        "resourceBarPolicy": analysis.get("resourceBarPolicy") or analysis.get("resourcePolicy") or "",
        "negativePromptRules": analysis.get("negativePromptRules") or analysis.get("negativeRules") or [],
    }
    return json.dumps(picked, ensure_ascii=False, indent=2)[:5000]


STYLE_MIGRATION_NEGATIVE_PROMPTS = [
    "modern flat app UI",
    "generic mobile app style",
    "photorealistic background",
    "inconsistent lighting",
    "mismatched color palette",
    "copied logo",
    "copied character",
    "unreadable text",
    "random letters",
    "excessive decoration in text area",
    "wrong material style",
    "overly realistic rendering",
    "overly simple flat design",
    "unrelated cultural symbols",
    "inconsistent icon style",
    "inconsistent border thickness",
    "changed gameplay layout",
    "changed interaction structure",
    "style suggestions from design document that conflict with reference images",
]


def build_art_style_schema(include_asset_requirements=False):
    schema = {
        "analysisStatus": "complete 或 insufficient",
        "missingEvidence": ["如果不足，列出缺少哪些参考图证据；充分时为空数组"],
        "referenceImageCount": 0,
        "referenceEvidenceSet": ["逐图取证结果，必须原样保留并可压缩摘要"],
        "mergedStyleEvidence": {
            "paletteAndRatio": ["综合全部参考图后的色彩 HEX、比例、冷暖和用途"],
            "materialAndStroke": ["综合全部参考图后的材质厚度、描边/边框层数、纹理、高光"],
            "shapeAndOrnament": ["综合全部参考图后的圆角比例、切角/缺口、角饰节奏、点线面比例"],
            "lightingAndRendering": ["综合全部参考图后的光源方向、阴影、发光、渲染方式"],
            "uiEvidence": ["只来自 uiEvidence 的 UI 控件资产可迁移证据"],
            "backgroundEvidence": ["只来自 backgroundEvidence 的背景设定图可迁移证据"],
            "characterEvidence": ["只来自 characterEvidence 的角色设定图可迁移证据"],
            "transferableRules": ["仅限三张总资产共享的低层视觉 token，不得包含人物、背景物体、场景题材、道具或 UI 组件语义"],
        },
        "evidenceConflicts": ["多张参考图之间的风格冲突和处理规则"],
        "styleExtrapolationRules": [
            {"target": "需要补全的资产/控件类型", "directEvidence": "来自逐图证据的真实依据", "extrapolationRule": "如何按证据外推，不能写默认风格"}
        ],
        "directTransferTargets": ["参考图中可直接迁移的视觉项"],
        "extrapolatedTargets": ["参考图未直接出现但可按证据补全的目标项"],
        "missingVisualDNA": ["基础视觉 DNA 缺失项；只有这些缺失才应阻止生成"],
        "missingExactComponentReference": ["具体控件/角色/背景样例未直接出现但可外推的项"],
        "referenceEvidence": {
            "paletteAndRatio": ["从参考图直接观察到的 HEX、色彩比例、冷暖关系"],
            "materialAndStroke": ["从参考图直接观察到的材质厚度、描边/边框层数、纹理、高光"],
            "shapeAndOrnament": ["从参考图直接观察到的圆角比例、切角/缺口、角饰节奏、点线面比例"],
            "lightingAndRendering": ["从参考图直接观察到的光源方向、阴影、发光、渲染方式"],
            "uiBackgroundCharacter": ["仅限主色/辅色、高光色、光源方向、材质厚度、描边宽度、颗粒纹理、渲染方式等低层视觉 token"],
        },
        "styleKeywords": ["10-20 个参考图风格关键词"],
        "styleDNA": {
            "worldStyle": "",
            "mood": "",
            "renderingMethod": "",
            "complexity": "",
            "visualSymbols": [],
            "coreDescription": "",
            "keyVisualFeatures": [],
            "easyToDrift": [],
        },
        "pointLinePlane": {
            "pointElements": [{"type": "", "sizeRatio": "", "positions": [], "roles": []}],
            "lineElements": [{"type": "", "thicknessRatio": "", "shape": "", "effect": ""}],
            "planeElements": [{"shape": "", "material": "", "layer": "", "treatment": ""}],
            "summary": {"pointRole": "", "lineRole": "", "planeRole": "", "decorationVsInformation": ""},
        },
        "shapeLanguage": {
            "contour": "",
            "cornerRules": [],
            "cutRules": [],
            "symmetry": "",
            "ornaments": [],
            "attachmentPositions": [],
            "ratioNotes": [],
        },
        "colorSystem": {
            "primary": [{"hex": "#RRGGBB", "usage": ""}],
            "secondary": [{"hex": "#RRGGBB", "usage": ""}],
            "background": [{"hex": "#RRGGBB", "usage": ""}],
            "highlight": [{"hex": "#RRGGBB", "usage": ""}],
            "shadow": [{"hex": "#RRGGBB", "usage": ""}],
            "functional": [{"name": "success/warning/danger/disabled/locked", "hex": "#RRGGBB", "usage": ""}],
            "rarity": [{"name": "common/rare/epic/legendary", "hex": "#RRGGBB", "usage": ""}],
            "colorMood": "",
        },
        "materialRules": {"ui": [], "background": [], "character": []},
        "lightingHierarchy": {
            "mainLightDirection": "",
            "shadowStrength": "",
            "glowRules": [],
            "contrast": "",
            "layerRelationship": [],
            "sharedLightRule": "",
        },
        "buttonSpec": {
            "primary": {},
            "secondary": {},
            "danger": {},
            "small": {},
            "icon": {},
            "close": {},
            "tab": {},
            "stateRules": {
                "default": "",
                "hover": "",
                "pressed": "",
                "selected": "",
                "disabled": "",
                "locked": "",
                "reward": "",
            },
        },
        "panelModalSpec": {
            "panel": {},
            "modal": {},
            "card": {},
            "infoBox": {},
            "nineSliceRules": [],
            "decorationVsInformation": "",
        },
        "iconItemResourceSpec": {"icons": {}, "itemSlots": {}, "resourceBars": {}},
        "typographySpec": {
            "title": "",
            "body": "",
            "number": "",
            "buttonText": "",
            "textSafety": "生成无文字 UI 资产，保留文字区域，禁止乱码文字",
        },
        "backgroundSpec": {
            "space": "",
            "perspective": "",
            "depth": [],
            "uiSafeAreas": [],
            "material": [],
            "focusControl": "",
            "sceneReplacementRule": "",
        },
        "characterSpec": {
            "proportions": "",
            "face": "",
            "contour": "",
            "costume": "",
            "materials": [],
            "line": "",
            "renderStyle": "",
            "pose": "",
            "copyAvoidance": "",
        },
        "unityRules": [],
        "designTokens": {
            "colors": {},
            "corner": {},
            "border": {},
            "shadow": {},
            "glow": {},
            "material": {},
            "font": {},
            "spacing": {},
        },
        "imagePrompts": {
            "ui": "English prompt for a transparent-background text-free game UI asset sheet",
            "background": "English prompt for a no-UI background style board",
            "character": "English prompt for a transparent-background character style board",
        },
        "negativePrompts": STYLE_MIGRATION_NEGATIVE_PROMPTS,
    }
    if include_asset_requirements:
        schema["assetRequirements"] = {
            "ui": ["必须覆盖的 UI 控件和状态，来自策划案/交互案"],
            "uiRequiredComponents": [
                {"type": "back_button/resource_token/tab_selected/...", "label": "组件中文名", "sourceScreen": "来自哪个界面", "evidence": "交互案原文证据"}
            ],
            "background": ["必须覆盖的背景/场景需求，来自策划案/交互案"],
            "character": ["必须覆盖的角色/宠物/NPC/头像/立绘需求，来自策划案/交互案"],
        }
        schema["uiAnalysis"] = {}
        schema["backgroundAnalysis"] = {}
        schema["characterAnalysis"] = {}
    return schema


def build_style_analysis_text_request(body, project_name):
    system = (
        "你是资深游戏美术风格迁移分析师。只返回严格 JSON，不要 Markdown、代码块或解释。"
        "策划案和交互案只决定功能、玩法、界面结构和资产需求；参考图只决定画风、材质、颜色、光影、角色风格和背景风格。"
        "如果无法从参考图确认某项，只能写缺失原因或空字段，不能把默认结论包装成参考图观察。"
    )
    summaries = body.get("imageSummaries") if isinstance(body.get("imageSummaries"), list) else []
    current_screen = body.get("currentScreen") if isinstance(body.get("currentScreen"), dict) else {}
    project_keywords = body.get("projectKeywords") if isinstance(body.get("projectKeywords"), list) else []
    image_count = len(body.get("referenceImages") or []) if isinstance(body.get("referenceImages"), list) else 0
    schema = json.dumps(build_art_style_schema(False), ensure_ascii=False, indent=2)
    prompt = f"""请按《游戏美术风格迁移分析与生成规范》分析参考图，输出能指导 UI、背景、角色资产生成的风格规则。必须严格返回 JSON 对象。

目标 JSON schema：
{schema}

硬规则：
1. 策划案和交互案决定“做什么”和“怎么用”；参考图和本规范决定“长什么样”。
2. 不要根据参考图自行判断界面类型、改变玩法逻辑、改变信息层级或新增功能。
3. 不要复制参考图中的 Logo、文字、角色、专有图案、独特符号、活动名、资源图标或原始布局。
4. 必须输出画风 DNA、点线面、形状语言、色彩系统、材质、光影层级、按钮、面板弹窗、图标道具格资源栏、字体、背景、角色、统一性、设计 token、英文生图 prompt 和 Negative Prompt。
5. 输出尽量包含比例、层数、位置、用途、状态变化、HEX 近似色值、材质厚度、描边比例、光源方向等可执行参数。
6. 每个对象字段都必须填入具体观察值或明确缺失原因；不要只返回 schema key、字段名列表、空对象集合，不能把 primary/secondary/background 等键名当作分析内容。
6. buttonSpec 必须分别覆盖主按钮、次按钮、危险按钮、小按钮、图标按钮、关闭按钮、标签页按钮，并包含 default/hover/pressed/selected/disabled/locked/reward 状态规则。
7. UI 资产规则必须强调透明背景、无文字、多状态、9-slice、同类资产一致尺寸比例和边框厚度。
8. 背景规则必须强调不带 UI、根据策划案指定场景生成新背景、保留 UI 安全区和角色站位、背景不能抢 UI。
9. 角色规则必须强调透明背景、全新角色/宠物/NPC 风格、不得复制参考图具体角色设计。
10. imagePrompts 必须是英文，分别用于 UI asset、Background、Character 三张图。
11. negativePrompts 必须包含这些禁止项：{", ".join(STYLE_MIGRATION_NEGATIVE_PROMPTS)}。
12. 如果图片无法读取，请在 styleDNA.easyToDrift 或 negativePrompts 中说明无法读取原因；不要编造低饱和、写实、自然背景等结论。
13. 如果某项无法从参考图确认，对应字段返回空数组、空对象或空字符串，并在 easyToDrift 或对应 spec 中说明缺失；不要用默认规则冒充真实观察。

项目名称：{project_name}
目标平台：{body.get("platform") or "横版 16:9"}
当前界面：{current_screen.get("name") or "未指定"} / {current_screen.get("kind") or "generic"}
当前界面目标：{current_screen.get("goal") or "未提供"}
参考图数量：{image_count}
用户输入画风关键词：{body.get("styleKeywords") or "未填写"}
本地图像指标（仅供校验，不能作为风格结论）：{body.get("localKeywords") or "无"}
项目关键词：{"、".join(project_keywords) if project_keywords else "无"}

当前界面交互段落：
{body.get("currentScreenPlan") or "无"}

当前界面 SVG/结构摘要：
{body.get("visualStructure") or "无"}

完整策划案：
{body.get("gameDesign") or "无"}

完整交互设计案：
{body.get("interactionPlan") or "无"}

参考图特征摘要：
{json.dumps(summaries, ensure_ascii=False, indent=2)}"""
    return "style-analysis", system, prompt


def build_style_analysis_json_repair_text_request(body, project_name):
    system = (
        "你是严格 JSON 修复器，只负责把参考图风格分析模型输出修复为指定 schema 的合法 JSON。"
        "只返回一个 JSON 对象，不要 Markdown、代码块或解释。"
        "只能保留原始返回中已经表达的参考图风格结论；缺失项用空字段或缺失原因，不要编造。"
    )
    schema = json.dumps(build_art_style_schema(False), ensure_ascii=False, indent=2)
    prompt = f"""请把下面“原始返回内容”修复为合法 JSON 对象，只返回 JSON。

目标 JSON schema：
{schema}

修复规则：
1. 只修复结构和字段归位，不重新分析参考图，不新增原始返回没有表达的结论。
2. 可把旧字段归位：palette/color → colorSystem；buttonMorphology/buttonShape → buttonSpec；backgroundStyle/backgroundRules → backgroundSpec；negativeKeywords → negativePrompts。
3. 如果原始返回没有某类内容，对应对象保留空字段或空数组，不要填默认规则。
4. imagePrompts 必须保留原文中已经出现的 UI、背景、角色英文 prompt；没有就返回空字符串，不要编造。
5. negativePrompts 只保留原文已表达的禁止项，并可保留规范要求的明确禁止词。
6. 不要保留 Markdown 标题、代码块标记、解释性前后文。

项目名称：{project_name}
目标平台：{body.get("platform") or "横版 16:9"}
用户生图关键词：{body.get("styleKeywords") or "未填写"}

原始返回内容：
{body.get("rawContent") or ""}"""
    return "style-analysis-json-repair", system, prompt


def build_reference_evidence_analysis_text_request(body, project_name):
    system = (
        "你是资深游戏美术参考图取证分析师，只分析当前消息附带的单张参考图。"
        "只返回严格 JSON，不要 Markdown、代码块或解释。"
        "只能描述参考图中可见的真实视觉现象；看不清或无法确认就写 missingEvidence，不要用默认规则或策划案美术建议补齐。"
    )
    image_summary = body.get("imageSummary") if isinstance(body.get("imageSummary"), dict) else {}
    reference_index = body.get("referenceIndex") or 1
    reference_label = body.get("referenceLabel") or f"图{reference_index}"
    source_reference_label = body.get("sourceReferenceLabel") or reference_label
    crop_label = body.get("cropLabel") or ""
    crop_metadata = body.get("cropMetadata") if isinstance(body.get("cropMetadata"), dict) else {}
    prompt = f"""请只分析当前附带的单张参考图，提取可验证的视觉证据。必须严格返回 JSON 对象，不要 Markdown。

目标 JSON：
{{
  "label": "{reference_label}",
  "index": {reference_index},
  "sourceReferenceLabel": "{source_reference_label}",
  "cropLabel": "{crop_label}",
  "cropMetadata": {json.dumps(crop_metadata, ensure_ascii=False, indent=2)},
  "analysisStatus": "complete 或 insufficient",
  "missingEvidence": [],
  "styleKeywords": [],
  "paletteAndRatio": [{{"hex": "#RRGGBB", "approxRatio": "约占画面/组件多少", "usage": "用在什么区域", "visibleEvidence": "从图中哪里观察到"}}],
  "materialAndStroke": ["材质厚度、边框/描边层数、纹理、高光、阴影的可见证据"],
  "shapeAndOrnament": ["圆角比例、切角/缺口、角饰节奏、点线面比例、装饰位置的可见证据"],
  "lightingAndRendering": ["主光方向、阴影、发光、渲染方式、复杂度的可见证据"],
  "uiEvidence": ["只写按钮、面板、Tab、资源条、图标底板、控件状态、文字承载等 UI 规则；没有则写缺失原因"],
  "backgroundEvidence": ["只写背景空间、景深、透视、光源、背景材质、UI 安全区、焦点控制；没有则写缺失原因"],
  "characterEvidence": ["只写角色/宠物/NPC 的轮廓比例、脸部、服装材质、线条、姿态、渲染方式；没有则写缺失原因"],
  "transferableRules": ["仅可共享低层视觉 token，例如主色/辅色、高光色、光源方向、材质厚度、描边宽度、颗粒纹理、渲染方式"],
  "copyAvoidance": ["不得复制的参考图专有内容"]
}}

硬规则：
1. 只取证，不生成资产，不改玩法，不新增组件。
2. 必须基于图像可见事实；本地图像指标只用于校验基础色彩，不得替代视觉观察。
3. paletteAndRatio 至少给出 3 个真实 HEX 或在 missingEvidence 说明为什么无法确认。
4. materialAndStroke、shapeAndOrnament、lightingAndRendering 必须包含具体比例、层数、位置或用途，不要写“精致”“高级”“按参考图”。
5. uiEvidence、backgroundEvidence、characterEvidence 允许某项缺失，但必须明确缺失原因；不得用通用默认风格补齐。
5.1 三类证据必须隔离：不要把人物/服装/脸部/姿态写进 uiEvidence；不要把按钮/面板/Tab/资源条写进 backgroundEvidence 或 characterEvidence；不要把背景空间/建筑/场景物写进 uiEvidence。
5.2 不要写笼统“画面气质/整体气质/世界观气质”。必须分别描述 UI气质、背景气质、角色气质；配色、材质和光影也必须按 UI/背景/角色分别说明，不得只写一份整体配色套给三类资产。
6. 如果当前图是自动裁切区域，请把它当作原参考图的局部证据，只提取局部中可见的圆角、描边、角饰、材质、光影和 UI 结构，不要把局部当成完整界面。
7. 如果图像无法读取或基础视觉 DNA 证据不足，analysisStatus 返回 insufficient，missingEvidence 列缺失项，其余字段不要编造。
8. 不要复制参考图中的 Logo、文字、角色、专有图案、独特符号、活动名、资源图标或原始布局。

当前参考图：{reference_label}
原始参考图：{source_reference_label}
自动裁切标签：{crop_label or "非裁切原图"}
裁切元数据：{json.dumps(crop_metadata, ensure_ascii=False, indent=2)}
本地图像指标（仅用于校验色彩，不得单独作为风格结论）：
{json.dumps(image_summary, ensure_ascii=False, indent=2)}"""
    return "reference-evidence-analysis", system, prompt


def build_total_asset_analysis_text_request(body, project_name):
    system = (
        "你是资深游戏美术风格迁移总资产设计负责人，负责把参考图风格迁移到当前项目的 UI控件资产图、背景设定图、角色设定图。"
        "只返回严格 JSON，不要 Markdown、代码块或解释。"
        "本阶段不再接收原始参考图；必须只基于 referenceEvidenceSet 和 imageSummaries 中的逐图取证结果综合具体视觉指纹。"
        "如果基础视觉 DNA 证据不足，返回 analysisStatus=insufficient 和 missingEvidence，不要编造、不要兜底、不要继续写可执行生图 prompt。"
        "参考图不必直接出现每一种目标控件；具体控件缺失但同类视觉证据充分时，必须用 styleExtrapolationRules 说明证据驱动补全方式。"
        "策划案和交互案决定资产清单、组件下限、场景需求、角色需求、玩法结构和信息层级；参考图只决定视觉风格。"
    )
    summaries = body.get("imageSummaries") if isinstance(body.get("imageSummaries"), list) else []
    current_screen = body.get("currentScreen") if isinstance(body.get("currentScreen"), dict) else {}
    target_screens = body.get("targetScreens") if isinstance(body.get("targetScreens"), list) else []
    screen_interaction_sections = body.get("screenInteractionSections") if isinstance(body.get("screenInteractionSections"), list) else []
    reference_evidence_set = body.get("referenceEvidenceSet") if isinstance(body.get("referenceEvidenceSet"), list) else []
    skipped_evidence_set = body.get("skippedEvidenceSet") if isinstance(body.get("skippedEvidenceSet"), list) else []
    asset_demand_summary = body.get("assetDemandSummary") if isinstance(body.get("assetDemandSummary"), dict) else {}
    screen_lines = body.get("targetScreenList") or "\n".join(
        (
            f"{index + 1}. {item.get('name') or '目标界面'}：{item.get('goal') or item.get('coreAction') or ''}"
            + (f"；关闭方式={item.get('closeBehavior') or item.get('close_behavior')}" if item.get("closeBehavior") or item.get("close_behavior") else "")
        )
        for index, item in enumerate(target_screens)
        if isinstance(item, dict)
    )
    interaction_lines = "\n\n".join(
        (
            f"{index + 1}. {item.get('name') or '目标界面'}{'（缺少对应交互章节）' if item.get('missing') else ''}"
            + (f"\n{str(item.get('section') or '')[:1800]}" if item.get("section") else "")
        )
        for index, item in enumerate(screen_interaction_sections)
        if isinstance(item, dict)
    )
    image_count = int(body.get("referenceImageCount") or len(reference_evidence_set) or len(summaries) or 0)
    schema = json.dumps(build_art_style_schema(True), ensure_ascii=False, indent=2)
    prompt = f"""请基于逐图参考图取证结果、策划案主要界面清单和对应交互章节，生成“项目级总资产”的结构化分析。必须严格返回 JSON 对象。

注意：本阶段不会再接收原始参考图。referenceEvidenceSet 只包含前端筛选后的有效逐图证据；skippedEvidenceSet/ignored references 只作诊断提示，不得参与风格综合。所有视觉判断只能来自有效 referenceEvidenceSet 和参考图特征摘要；不得自行想象参考图内容，不得使用默认风格补齐。

目标 JSON schema：
{schema}

硬规则：
1. 参考图只决定画风；背景和角色资产的题材需求仍可来自策划案主要界面清单和对应交互章节。
2. 总资产 UI 阶段不再读取交互案控件清单，也不再输出全项目 uiRequiredComponents hard minimum。UI控件资产图固定生成通用游戏 UI 控件族风格库。
3. UI控件资产图固定覆盖 A-H 通用控件族：导航与关闭、按钮控件、容器与面板、标签与导航组、资源与状态、物品与角色信息、输入与提示、图标基础件。
3.1 UI控件资产图应覆盖通用状态：default/pressed/selected/disabled/locked/reward；透明背景、控件留足切图空间、每个控件带小号英文识别标签，标签格式为 `Control Name - function label`，例如 `Back Button - go back`、`Resource Token - show currency`、`Item Card - display item reward`；可 9-slice。
3.2 若参考图没有某类通用控件直接样例，也必须按参考图已有按钮、图标底板、面板边框、圆角、材质、描边、光影和装饰节奏外推生成，并写入 styleExtrapolationRules；不得因为缺少直接样例而退回默认模板。
4. 背景设定图必须不带 UI；根据策划案/交互案的新场景生成，不复制参考图场景；保留 UI 安全区和角色站位，背景不能抢 UI。
5. 角色设定图必须透明背景；按策划案主题生成全新角色/宠物/NPC 风格，不复制参考图具体角色。
6. 三类资产不能直接共享一整套配色/材质/光影结论；必须分别说明 UI配色、背景配色、角色配色，以及各自材质和光影用法。只允许在三者之间共享少量低层 token 作为统一性约束，例如共同主色族、高光色族、光源方向、渲染颗粒；不得共享人物、背景物体、场景题材、具体道具、UI 组件语义或世界观元素。
6.1 buttonSpec、panelModalSpec、iconItemResourceSpec、typographySpec 只能从 uiEvidence 推导；backgroundSpec 只能从 backgroundEvidence 推导；characterSpec 只能从 characterEvidence 推导。某类证据缺失时写缺失或外推规则，不得借用其他类别证据冒充。
7. imagePrompts 必须是英文，并分别能直接用于生成 UI asset sheet、background style board、character style board。三个 prompt 必须分别描述 UI temperament、background temperament、character temperament，不得写泛化的 overall visual mood。
7.1 每个对象字段都必须填入具体观察值或明确缺失原因；不要只返回 schema key、字段名列表、空对象集合，不能把 primary/secondary/background、pointElements/lineElements/planeElements、primary/secondary/danger 等键名当作分析内容。
7.2 必须先消费 referenceEvidenceSet，把全部参考图合成为 mergedStyleEvidence，再按 UI/背景/角色三条通道分别填写 styleDNA、colorSystem、materialRules、lightingHierarchy、buttonSpec、backgroundSpec、characterSpec。每条综合证据必须能追溯到对应通道的逐图证据，例如 UI 规则追溯 uiEvidence、背景规则追溯 backgroundEvidence、角色规则追溯 characterEvidence；共享字段只可追溯低层视觉 token。不要写“按参考图风格”“高级 UI”“精致卡通”“整体画面气质”这类空话。
7.3 如果 referenceEvidenceSet 或 mergedStyleEvidence 无法覆盖色彩比例、材质厚度、描边/边框层数、圆角比例、角饰节奏、光源方向、渲染方式、复杂度、按钮/面板/图标规则，analysisStatus 必须为 insufficient，missingVisualDNA/missingEvidence 列缺失项，imagePrompts 返回空字符串；不要继续生成可执行 prompt。
7.3.1 参考图不必直接出现每一种目标控件。若关闭/返回/确认/领取/Tab/图标按钮等具体控件缺失，但已有同类按钮、图标底板、面板边框、角标、圆角、材质、描边和光影证据，analysisStatus 仍可为 complete，并必须在 styleExtrapolationRules 写清“直接观察依据”和“如何外推补全”。不得把外推项写成参考图直接出现。
7.3.2 背景和角色也可按真实色彩、材质、光影、轮廓/渲染复杂度外推到当前项目新题材；不得复制参考图场景或角色。只有基础视觉 DNA 不足时才停止。
7.4 未指定图号时仍必须综合全部参考图；不得自动选择主图、不得丢弃风格冲突图片。冲突必须写入 evidenceConflicts，并给出统一处理规则。
8. negativePrompts 必须包含这些禁止项：{", ".join(STYLE_MIGRATION_NEGATIVE_PROMPTS)}。
9. 不要复制参考图 Logo、文字、角色、专有图案、独特符号、原资源图标、活动名或布局。
10. 如果参考图分析无法确认某项，返回空字段并在 negativePrompts 或对应 spec 中说明缺失，不要用默认规则冒充真实观察。
11. 禁止跨通道污染：人物服装/脸部/姿态不得进入 UI 分析；按钮/面板/资源条/Tab 不得进入背景或角色分析；背景空间/场景物/建筑不得进入 UI 分析。

项目名称：{project_name}
目标平台：{body.get("platform") or "横版 16:9"}
当前选中界面：{current_screen.get("name") or "未指定"} / {current_screen.get("kind") or "generic"}
当前界面目标：{current_screen.get("goal") or "未提供"}
当前界面关闭方式：{current_screen.get("closeBehavior") or current_screen.get("close_behavior") or "未提供"}
参考图数量：{image_count}
用户生图关键词：{body.get("styleKeywords") or "未填写"}
已有画风迁移关键词：{body.get("styleTransferKeywords") or "无"}

目标界面清单（仅来自策划案主要界面清单）：
{screen_lines or "无"}

对应交互章节（仅这些章节可用于组件、状态、背景和角色需求）：
{interaction_lines or "无"}

资产需求摘要（仅供背景/角色需求参考；UI资产不从这里抽取 hard minimum）：
{json.dumps(asset_demand_summary, ensure_ascii=False, indent=2)}

参考图特征摘要：
{json.dumps(summaries, ensure_ascii=False, indent=2)}

有效逐图参考图取证结果（必须全部纳入综合）：
{json.dumps(reference_evidence_set, ensure_ascii=False, indent=2)}

已跳过参考图取证结果（仅诊断，不参与风格综合）：
{json.dumps(skipped_evidence_set, ensure_ascii=False, indent=2)}"""
    return "total-asset-analysis", system, prompt


def build_total_asset_json_repair_text_request(body, project_name):
    system = (
        "你是严格 JSON 修复器，只负责把总资产分析模型输出修复为指定 schema 的合法 JSON。"
        "只返回一个 JSON 对象，不要 Markdown、代码块或解释。"
        "不得新增与输入项目无关的玩法、资源、角色、UI 系统或参考图 IP 内容。"
    )
    schema = json.dumps(build_art_style_schema(True), ensure_ascii=False, indent=2)
    prompt = f"""请把下面“原始返回内容”修复为合法 JSON 对象，只返回 JSON。

目标 JSON schema：
{schema}

修复规则：
1. 只做结构修复和字段归位，不新增原始返回没有表达的参考图观察。
2. 旧 UI资产分析字段可归入 uiAnalysis、buttonSpec、panelModalSpec、iconItemResourceSpec 和 imagePrompts.ui。
3. 背景、角色、统一性、token、negative prompt 如果原文没有就返回空对象或空数组。
4. 不要新增玩法、界面结构、业务入口、资源、角色或参考图 IP 内容。
5. 如果原始返回包含 uiRequiredComponents、requiredUiAssetComponents、UI资产必需组件或 hard minimum，不要把它们作为总资产 UI 的阻断条件；assetRequirements.uiRequiredComponents 返回空数组或仅保留固定通用控件族摘要。

项目名称：{project_name}
目标平台：{body.get("platform") or "横版 16:9"}
用户生图关键词：{body.get("styleKeywords") or "未填写"}

原始返回内容：
{body.get("rawContent") or ""}"""
    return "total-asset-json-repair", system, prompt


def build_ui_asset_style_fidelity_check_text_request(body, project_name):
    system = "\n".join([
        "你是资深游戏 UI 美术总监，负责判断 UI控件资产图是否贴合参考图画风。",
        "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。",
        "附带图片顺序：第 1 张是生成后的 UI控件资产图；后续图片是原始参考图。",
        "只判断画风贴合，不判断控件清单。重点比较主色比例、色温、面板轮廓、线条粗细、描边层数、材质噪点、发光/阴影、图标语言、信息密度、装饰节奏和点线面比例。",
        "如果 UI资产图退化成通用蓝色科幻、通用金属奇幻、默认圆角网页卡片、奶油宠物 UI，或与参考图主体画风明显不一致，必须 ok=false。",
        "如果无法判断，也必须返回 JSON 且 status=needs_review，不要输出普通文字或 Markdown。",
        "不要因为组件种类不同而判失败；组件种类由交互案决定。只看这些新组件是否用参考图视觉 DNA 外推。",
    ])
    style_context = json.dumps({
        "referenceEvidenceSet": body.get("referenceEvidenceSet") or [],
        "mergedStyleEvidence": body.get("mergedStyleEvidence") or {},
        "styleDNA": body.get("styleDNA") or {},
        "colorSystem": body.get("colorSystem") or {},
        "designTokens": body.get("designTokens") or {},
        "styleFidelityDigest": body.get("styleFidelityDigest") or "",
    }, ensure_ascii=False, indent=2)[:11000]
    prompt = f"""请判断生成后的 UI控件资产图是否严格贴合原始参考图画风。

附带图片顺序：
1. 图1 = 生成后的 UI控件资产图
2. 图2 = 原始参考图

输出严格 JSON：
{{
  "ok": true,
  "status": "passed",
  "score": 0.86,
  "issues": [],
  "styleDistanceWarnings": [],
  "mustKeep": ["必须继续保持的参考图风格锚点"],
  "mustAvoid": ["必须避免的通用化偏差"]
}}

判定规则：
1. 只判断画风贴合，不判断组件清单是否完整。
2. 必须比较：主色比例、色温、明暗对比、面板轮廓、线条粗细、描边层数、材质噪点、发光/阴影、图标绘制语言、信息密度、装饰节奏、点线面比例。
3. 允许组件类型来自交互案，不要求参考图直接出现同组件；但新组件必须像是从参考图视觉 DNA 外推出来的。
4. 如果 UI资产图明显退化成通用蓝色科幻、通用金属奇幻、默认圆角网页卡片、奶油宠物 UI 或其他参考图未呈现的资产板风格，必须 ok=false，并在 issues 说明。
5. score 低于 0.72 时 ok=false。
6. 只返回 JSON，不要 Markdown。
7. 如果无法判断、证据不足、图片读取不稳定或不能完成比较，也必须返回 JSON：{{"ok": null, "status": "needs_review", "score": 0, "issues": ["写清待确认原因"], "styleDistanceWarnings": []}}；不要返回普通文字、空内容或 Markdown。
8. 只有明确观察到画风偏离时才返回 ok=false；不要因为组件种类来自通用控件族、A-H 分区编号或缺少中文标签而判失败。

项目：{project_name}
平台：{body.get("platform") or "界面：横版（16:9）"}

参考图和综合风格证据：
{style_context}"""
    return "ui-asset-style-fidelity-check", system, prompt


def call_babylon_design(body):
    started_at = time.time()
    request_id = sanitize_request_id(body.get("requestId"))
    env = read_env_file()
    token = env.get("BABYLON_JWT_TOKEN") or os.environ.get("BABYLON_JWT_TOKEN")
    if not token:
        raise RuntimeError("BABYLON_JWT_TOKEN is not configured in .env")

    model = body.get("model") or env.get("BABYLON_IMAGE_MODEL") or "gpt-image-2"
    timeout_seconds = bounded_int(
        body.get("timeoutSeconds"),
        env_int(env, "BABYLON_IMAGE_TIMEOUT_SECONDS", DEFAULT_IMAGE_TIMEOUT_SECONDS),
        60,
        900,
    )
    prompt = str(body.get("prompt") or "")
    mode = body.get("mode")
    if mode == "ui-asset-sheet":
        mode = "total-asset-ui"
    ui_required_components = body.get("uiRequiredComponents") if isinstance(body.get("uiRequiredComponents"), list) else []
    project_anchor_policy = body.get("projectAnchorPolicy") if isinstance(body.get("projectAnchorPolicy"), list) else []
    ui_asset_board_section_spec = str(body.get("uiAssetBoardSectionSpec") or "").strip()
    design_composition = format_design_composition_for_backend(body.get("designComposition"))
    if design_composition:
        prompt = "\n".join([
            prompt,
            "后端强制组件裁剪约束（必须优先遵守）：",
            design_composition,
            "只绘制 requiredComponents 和必要 optionalComponents；forbiddenComponents、negativePromptRules、resourceBarPolicy 禁止的按钮、入口、资源栏、图标和系统功能不得出现。",
            "总资产里的 UI控件资产图只提供控件风格，不是组件清单；不要复制 UI控件资产图里的全部按钮、导航图标和入口图标。"
        ])
    if mode == "component-addition":
        prompt = "\n".join([
            "You are editing an existing game UI design draft by regenerating it with minimal visual changes.",
            f"Project: {body.get('projectName') or '未命名小游戏'}",
            f"Screen: {(body.get('screen') or {}).get('name') or '目标界面'}",
            f"Screen type: {(body.get('screen') or {}).get('kind') or 'generic'}",
            "Reference image order: image 1 is the current complete interface draft; image 2 is the project UI control asset sheet. Additional images, if any, are only background or character style references.",
            prompt,
            "Hard constraints:",
            "1. Preserve the original interface composition, background, character art, panels, lists, ranking content, task content, title treatment, color balance and existing text as much as possible.",
            "2. Add only the user-specified missing component or components. Do not add unrelated navigation, resources, popups, characters, rewards, tasks or business entries.",
            "3. Derive the new component's visual language from the UI control asset sheet: material, stroke width, border layers, corner radius, icon rendering, shadow, highlight and state language.",
            "3a. If the exact requested component is absent from the UI asset sheet, extrapolate it only from observed similar buttons, icon plates, badges, panel borders, corner treatment and lighting in the UI asset sheet. Do not fall back to generic controls.",
            "4. Place the component in the most conventional safe area for its function, for example close/back in a top corner and confirm/claim near the related action region.",
            "5. Do not use generic web buttons, modern flat app controls, unreadable random text, copied reference logos, copied characters, or changed gameplay layout.",
        ])
    if mode == "screen-draft-edit":
        screen = body.get("screen") if isinstance(body.get("screen"), dict) else {}
        reference_count = len(body.get("referenceImages") or []) if isinstance(body.get("referenceImages"), list) else 0
        operation_count = len(body.get("operations") or []) if isinstance(body.get("operations"), list) else 0
        prompt = "\n".join([
            "You are editing an existing game UI design draft by regenerating it with minimal visual changes.",
            f"Project: {body.get('projectName') or '未命名小游戏'}",
            f"Screen: {screen.get('name') or '目标界面'}",
            f"Screen type: {screen.get('kind') or 'generic'}",
            "Reference image order: image 1 is the current complete interface draft; image 2 is the project UI control asset sheet." if reference_count > 1 else "Reference image order: image 1 is the current complete interface draft.",
            f"Composite edit count: {operation_count}. Treat every listed operation as required in a single result." if operation_count else "",
            prompt,
            "Hard constraints:",
            "1. Preserve the original interface composition, background, character art, panels, lists, title treatment, color balance, resource bars and existing text as much as possible.",
            "2. Modify only the listed target rectangles and the smallest necessary feathered edge area around each of them.",
            "3. For deletion, remove only one independent UI control inside the target rectangle: the centered, largest, or most visually prominent control. If the rectangle contains multiple controls, do not remove adjacent buttons, titles, borders, characters, resource bars, primary action buttons, or anything outside the target.",
            "3a. For deletion, reconstruct only the pixels originally covered by the removed control. Do not expand the repaint area, do not redesign the corner, and do not change nearby layout or text.",
            "4. For repair, only fill the local gap or damaged edge by extending surrounding panel, border, backing, stroke, material and lighting. Do not invent new controls, text or decorations.",
            "5. For replacement or addition, use the selected source rectangle from the UI asset sheet only as the component style reference: material, stroke width, border layers, corner radius, icon rendering, shadow, highlight and state language.",
            "6. The edited result must be one complete game UI screen with seamless integration: no sticker edges, mask seams, smudges, duplicate controls, random text, copied asset-sheet labels or unrelated new entries.",
        ])
    if mode == "screen-draft-direct":
        screen = body.get("screen") if isinstance(body.get("screen"), dict) else {}
        prompt = "\n".join([
            prompt,
            "Backend guardrail: generate one complete polished game UI screen draft, not an asset sheet, not a wireframe, not documentation.",
            f"Screen: {screen.get('name') or '目标界面'}; type: {screen.get('kind') or 'generic'}.",
            "Use attached images as visual references. If total asset images are attached, use the UI asset sheet only for reusable controls, the background board only for scene language, and the character board only when the screen needs character content.",
            "Do not copy asset-sheet labels, reference logos, unrelated buttons, unrelated navigation, or full layouts from any reference image.",
        ])
    if mode == "total-asset-ui":
        prompt = "\n".join([
            prompt,
            "Backend guardrail: use attached reference images and the prompt's detailed style analysis; do not add duplicated backend reference JSON.",
            "Generate only reusable transparent-background UI controls, not a complete screen.",
            "Keep the fixed A-H asset-board grouping and tiny English labels from the prompt.",
            "Do not copy reference logos, words, exact characters, original scene layout, or proprietary symbols.",
        ])
        mode = "total-asset-ui-short"

    if mode == "total-asset-background":
        prompt = "\n".join([
            prompt,
            "Backend guardrail: use attached reference images and the prompt's detailed style analysis; do not add duplicated backend reference JSON.",
            "Generate only a project-level background style board, not a UI screen.",
            "No buttons, menus, UI widgets, text, logos, or full gameplay layout.",
            "Do not copy the reference scene composition, exact characters, words, logos, or proprietary symbols.",
        ])
        mode = "total-asset-background-short"

    if mode == "total-asset-character":
        prompt = "\n".join([
            prompt,
            "Backend guardrail: use attached reference images and the prompt's detailed style analysis; do not add duplicated backend reference JSON.",
            "Generate only a transparent-background character / pet / NPC style board, not a complete screen.",
            "No UI menus, buttons, background scene, text, logos, or Figma/workspace elements.",
            "Do not copy the reference character, exact outfit, pose composition, IP marks, weapons, badges, or proprietary symbols.",
        ])
        mode = "total-asset-character-short"

    if mode == "total-asset-ui":
        required_components_text = json.dumps(ui_required_components, ensure_ascii=False, indent=2) if ui_required_components else "[]"
        project_anchor_text = json.dumps(project_anchor_policy, ensure_ascii=False, indent=2) if project_anchor_policy else "[]"
        prompt = "\n".join([
            prompt,
            "后端强制 UI控件资产图约束（必须优先遵守）：",
            "总资产 UI 使用固定通用游戏 UI 控件族；不要把交互案抽取控件当作 hard minimum，也不要因为覆盖缺失阻断资产图。",
            f"通用控件族别名仅供后续识别，不是交互案 hard minimum：{required_components_text}",
            f"项目级固定锚点仅供后续普通界面参考，不要求总资产逐项覆盖：{project_anchor_text}",
            f"UI控件资产图必须使用 A-H 固定分区通用资产板布局：\n{ui_asset_board_section_spec}" if ui_asset_board_section_spec else "",
            "透明背景；每个控件带小号英文资产识别标签，固定格式为 `Control Name - function label`，例如 `Back Button - go back`、`Close Button - dismiss modal`、`Primary Button - main action`、`Claim Button - collect reward`、`Resource Token - show currency`、`Progress Bar - show progress`、`Item Slot - hold item icon`、`Toast - temporary feedback`；后续普通界面不得复制这些标签文字。",
            "Style fidelity is the first priority: match the attached reference images' dominant palette ratio, color temperature, panel silhouette, line weight, stroke layering, material/noise texture, glow/shadow system, icon language, information density, ornament rhythm, and point-line-plane balance before applying project theme.",
            "UI资产图只定义可复用控件的材质、描边、圆角、阴影、高光、图标渲染和状态语言；具体界面功能稍后由普通界面生图读取当前交互案后再映射。",
            "生成透明背景 PNG 风格资产板，不是完整游戏界面；覆盖导航与关闭、按钮控件、容器与面板、标签与导航组、资源与状态、物品与角色信息、输入与提示、图标基础件，以及 default、pressed、selected、disabled、locked、reward 状态。",
            "如果某类通用控件在参考图中没有直接样例，也必须从参考图已有按钮、图标底板、面板边框、圆角、材质、描边、光影和装饰节奏外推生成。",
            "参考图贴合硬约束：必须优先匹配参考图的视觉 DNA，包括色彩比例、面板轮廓、按钮材质、按钮圆角比例、角部结构、描边厚度、字体气质、装饰节奏、光影和点线面比例。",
            "按钮、面板、道具格必须无文字，保留文字区域和数字区域；面板需要适合 9-slice 拉伸；同类资产保持一致尺寸比例和边框厚度。",
            "不要复制参考图 Logo、文字、角色、IP 符号、原资源图标、原主题道具、业务入口或原始布局；不要退化成通用金色 UI、通用蓝色科幻 UI、通用金属奇幻 UI、默认圆角网页卡片、现代扁平 App UI 或与参考图无关的奶油宠物模拟器风格。"
        ])
    elif mode == "total-asset-background":
        prompt = "\n".join([
            prompt,
            "后端强制背景设定图约束（必须优先遵守）：",
            "生成不带 UI 的项目级背景风格板，不是完整游戏界面；根据策划案和交互案指定的新场景生成，不复制参考图场景。",
            "必须体现前景、中景、远景、透视、材质、光源、虚实关系、UI 安全区和角色站位；背景饱和度、对比和光效不得抢 UI 或角色焦点。",
            "参考图贴合硬约束：只迁移参考图的画风、材质、色彩、光影、装饰符号和复杂度；不得迁移参考图原场景、文字、Logo、角色或专有符号。",
            "不要生成按钮、菜单、资源栏、文字、乱码、完整界面结构或玩法截图；不要生成照片感背景、通用素材库背景或与参考图光源/色彩不一致的场景。"
        ])
    elif mode == "total-asset-character":
        prompt = "\n".join([
            prompt,
            "后端强制角色设定图约束（必须优先遵守）：",
            "生成透明背景角色/宠物/NPC 风格板，不是完整游戏界面；按策划案主题生成全新角色资产方向，可包含头像、半身、全身、表情或姿态变体。",
            "比例、脸部、轮廓、发型/毛发、服装/外观结构、材质、描边、渲染方式、姿态和特效必须与 UI 和背景共享同一套色彩、光源、材质和装饰符号。",
            "参考图贴合硬约束：只迁移参考图的角色画风和渲染语言，不复制参考图具体角色、服装、IP 符号、武器、徽章或独特剪影。",
            "不要生成写实风偏移、照片感角色、随机文字、Logo、UI 菜单、背景场景或完整玩法截图。"
        ])
    reference_warnings = []
    if mode == "screen-draft-direct":
        reference_images, reference_warnings = prepare_reference_images_for_babylon(
            body.get("referenceImages", []),
            timeout_seconds,
            token,
            convert_trusted_urls=True,
            request_id=request_id,
        )
    else:
        reference_images = prepare_reference_images_for_babylon(body.get("referenceImages", []), timeout_seconds, token)
        record_design_request_stage(
            request_id,
            "references_ready",
            "参考图已整理",
            model=model,
            referenceCount=len(reference_images),
            promptLength=len(prompt),
        )
    canvas_spec = normalize_canvas_spec(body)

    payload = {
        "prompt": prompt,
        "n": 1,
        "chat_id": f"game_ux_board_local_design_{int(time.time() * 1000)}",
        "extra_metadata": {
            "prompt": prompt,
            "source": "game_ux_board_local_design",
        },
    }

    if reference_images:
        payload["images"] = reference_images

    if model.startswith("gpt-image"):
        payload["size"] = canvas_spec["size"]
        payload["quality"] = "high"
    else:
        payload["aspect_ratio"] = canvas_spec["aspect_ratio"]
        payload["resolution"] = "2K"

    request_body = json_bytes({
        "model": model,
        "payload": payload,
    })

    request = urllib.request.Request(
        BABYLON_URL,
        data=request_body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
            "X-Client-Type": "game_ux_board",
        },
        method="POST",
    )

    try:
        record_design_request_stage(
            request_id,
            "posting_babylon",
            "正在请求 Babylon",
            model=model,
            referenceCount=len(reference_images),
            promptLength=len(prompt),
        )
        with open_babylon_request(request, timeout_seconds) as response:
            data = json.loads(response.read().decode("utf-8"))
        record_design_request_stage(
            request_id,
            "babylon_response",
            "Babylon 已返回",
            model=model,
            referenceCount=len(reference_images),
            promptLength=len(prompt),
            durationMs=int((time.time() - started_at) * 1000),
            rawStatus=getattr(response, "status", 200),
        )
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        duration_ms = int((time.time() - started_at) * 1000)
        record_design_request_stage(request_id, "failed", "Babylon HTTP 失败", model=model, durationMs=duration_ms, rawStatus=str(error.code), code="BABYLON_HTTP_ERROR", error=details)
        raise BabylonDesignError(f"Babylon image request failed: {error.code} {details}", "BABYLON_HTTP_ERROR", model, duration_ms, str(error.code), reference_warnings) from error
    except (TimeoutError, socket.timeout) as error:
        duration_ms = int((time.time() - started_at) * 1000)
        record_design_request_stage(request_id, "failed", "Babylon 请求超时", model=model, durationMs=duration_ms, rawStatus="timeout", code="BABYLON_IMAGE_TIMEOUT", error=str(error))
        raise BabylonDesignError(f"Babylon image request timed out after {timeout_seconds} seconds.", "BABYLON_IMAGE_TIMEOUT", model, duration_ms, "timeout", reference_warnings) from error
    except urllib.error.URLError as error:
        duration_ms = int((time.time() - started_at) * 1000)
        record_design_request_stage(request_id, "failed", "Babylon 网络失败", model=model, durationMs=duration_ms, rawStatus="network", code="BABYLON_NETWORK_ERROR", error=str(getattr(error, "reason", error)))
        raise BabylonDesignError(format_babylon_network_error("image", error), "BABYLON_NETWORK_ERROR", model, duration_ms, "network", reference_warnings) from error

    files = []
    images = []
    for file_item in data.get("files") or []:
        url = absolute_babylon_url(file_item.get("url") or "")
        if not url:
            continue
        files.append({
            "filename": file_item.get("filename") or "",
            "url": url,
            "mime_type": file_item.get("mime_type") or "",
        })
        images.append(url)

    if not images:
        duration_ms = int((time.time() - started_at) * 1000)
        record_design_request_stage(request_id, "failed", "Babylon 未返回图片", model=model, durationMs=duration_ms, rawStatus="no_image", code="BABYLON_NO_IMAGE")
        raise BabylonDesignError("Babylon returned no image file.", "BABYLON_NO_IMAGE", model, duration_ms, "no_image", reference_warnings)

    duration_ms = int((time.time() - started_at) * 1000)
    record_design_request_stage(
        request_id,
        "completed",
        "图片结果已返回前端",
        model=model,
        referenceCount=len(reference_images),
        promptLength=len(prompt),
        durationMs=duration_ms,
        imageUrl=images[0],
        images=images,
        files=files,
        referenceWarnings=reference_warnings,
    )
    return {
        "provider": "babylon-local",
        "requestId": request_id,
        "model": model,
        "prompt": prompt,
        "imageUrl": images[0],
        "images": images,
        "files": files,
        "durationMs": duration_ms,
        "referenceCount": len(reference_images),
        "referenceWarnings": reference_warnings,
    }


UI_CHAITU_LAYER_LABELS = {
    "background": "背景",
    "background_base": "背景底图",
    "background_elements": "背景元素",
    "character": "角色 / 宠物",
    "icon": "icon",
    "icon_plate": "icon底板",
}

UI_CHAITU_LAYER_FILENAME_PARTS = {
    "background": "background",
    "background_base": "background-base",
    "background_elements": "background-elements",
    "character": "character",
    "icon": "icon",
    "icon_plate": "icon-plate",
}


def normalize_ui_chaitu_targets(body):
    requested = body.get("targets") if isinstance(body.get("targets"), list) else []
    safe = []
    for item in requested:
        text = str(item or "").strip().lower()
        if text in UI_CHAITU_LAYER_LABELS and text not in safe:
            safe.append(text)
    resolved = safe or ["background", "character", "icon", "icon_plate"]
    if "background_base" in resolved and "background_elements" in resolved:
        ordered = []
        for item in resolved:
            if item == "background_base":
                continue
            ordered.append(item)
            if item == "background_elements":
                ordered.append("background_base")
        resolved = []
        for item in ordered:
            if item not in resolved:
                resolved.append(item)
    return resolved


def build_ui_chaitu_prompt(layer_id, body):
    image_name = str(body.get("imageName") or "source.png").strip() or "source.png"
    scene_hint = str(body.get("sceneHint") or "").strip()
    character_hint = str(body.get("characterHint") or "").strip()
    icon_hint = str(body.get("iconHint") or "").strip()
    scene_profile = str(body.get("sceneProfile") or "auto").strip().lower()
    layer_label = UI_CHAITU_LAYER_LABELS.get(layer_id, layer_id)

    common_lines = [
        "You are separating a single game UI screenshot into semantic layers.",
        f"Target layer: {layer_label}.",
        f"Source image name: {image_name}.",
        f"Scene profile: {scene_profile or 'auto'}.",
        "Use the attached source image as the only truth.",
        "Rebuild the output at the same overall composition, pixel placement and camera framing as the source image.",
        "Return one PNG with transparent background and alpha channel.",
        "Keep only the requested layer. Everything else must become fully transparent.",
        "Do not redesign, beautify, relayout, restyle, repaint the whole image, or invent any new object.",
        "Classify by scene meaning, not by shape alone. Furniture, room decor, stage props, architectural trim, rugs, curtains, sofas, beds, tables, shelves, lamps, thrones and other environmental set dressing belong to the background system even if they look like panels, cards or UI containers.",
        "If the requested layer does not exist, return an empty transparent canvas instead of hallucinating content.",
        "Do not add text, labels, watermarks, guides, shadows of removed objects, or background fill behind transparent areas.",
        layer_id == "icon_plate" and "If a second reference image is attached, image 1 is the original full screenshot and image 2 is the icon-only extraction. Use image 2 only to locate which icon carriers belong to UI icons.",
        layer_id == "background_base" and "If a second reference image is attached, image 1 is the original full screenshot and image 2 is the extracted background-elements layer. Remove every object shown in image 2, then reconstruct and fully inpaint the missing backdrop so the final background plate looks complete and continuous.",
        scene_hint and f"Scene hint from user: {scene_hint}",
        character_hint and f"Character hint from user: {character_hint}",
        icon_hint and f"Icon hint from user: {icon_hint}",
    ]

    profile_lines = []
    if scene_profile == "indoor_furniture":
        profile_lines.extend([
            "Indoor furniture scene policy: distinguish environment art from UI very strictly.",
            "Walls, floor, ceiling, windows, distant exterior seen through windows, fixed architecture, room lighting wash and broad wall/floor color masses belong to background base.",
            "Furniture and room props such as sofas, couches, chairs, tables, beds, cabinets, shelves, lamps, chandeliers, rugs, curtains, screens, picture frames, counters, thrones and decorative ornaments belong to background elements when they are removable scene objects.",
            "Do not treat furniture, furnishings or room decor as UI panels, cards, dialog boxes, inventory slots or icon plates just because they are rectangular, framed, glossy or centered on screen.",
            "If a furniture object overlaps characters or UI, preserve the original object silhouette as part of the environment system rather than erasing it.",
        ])
    elif scene_profile == "outdoor_architecture":
        profile_lines.extend([
            "Outdoor architecture scene policy: separate broad landscape foundation from removable props and structures.",
            "Sky, ground, haze, large terrain masses and broad architectural shells belong to background base.",
            "Trees, rocks, banners, lanterns, wagons, statues, signs, stalls and detachable structure details belong to background elements.",
        ])
    else:
        profile_lines.extend([
            "Auto scene policy: infer semantic ownership carefully and prefer environment classification for scene set dressing over UI classification.",
        ])

    layer_rules = {
        "background": [
            "Keep only environment and backdrop pixels: scene painting, sky, floor, walls, decorative world objects, atmospheric light and non-interactive environment surfaces.",
            "This includes large foreground or midground scene furniture and set dressing such as sofas, chairs, tables, carpets, curtains, chandeliers, counters, beds, cabinets, stairs, arches and stage props when they belong to the scene rather than the UI.",
            "Remove all characters, pets, NPCs, portraits, avatars, UI widgets, buttons, text, icons, icon carriers, item slots, currency bars, badges and overlays.",
            "The output may still be mostly opaque, but must remain a transparent PNG file.",
        ],
        "background_base": [
            "Keep only the broad background foundation: sky, horizon haze, far scenery masses, floor, wall, large terrain color fields, distant mountains, large water or atmosphere layers, and other continuous backdrop surfaces.",
            "Large scene furniture or props that clearly occlude or sit in front of the backdrop, such as sofas, chairs, tables, curtains, lamps, shelves, statues or room decor, should be treated as removable background elements instead of UI.",
            "Remove detachable scene props or object-like background elements such as trees, rocks, fences, lanterns, banners, houses, columns, floating decorations and similar independent environment objects.",
            "Remove all characters, pets, NPCs, UI widgets, buttons, text, icons, icon carriers, panels, item slots, currency bars, badges and overlays.",
            "After removing the background elements, fully reconstruct the hidden backdrop behind them. Fill gaps seamlessly using nearby color, lighting, texture, perspective and depth cues from the original scene.",
            "The goal is a clean, complete backdrop plate that can sit behind separated background elements, without holes, cutouts, transparent missing patches or traces of removed objects.",
        ],
        "background_elements": [
            "Keep only detachable environmental objects that belong to the background layer: trees, rocks, fences, buildings, lanterns, banners, crystals, statues, clouds when they read as isolated objects, floating ornaments and similar scene props.",
            "Also keep furniture-like or decor-like scene objects such as sofas, chairs, tables, curtains, rugs, lamps, cabinets, thrones, counters, shelves, wall decor and room props when they are part of the environment art.",
            "Remove the flat or continuous backdrop foundation such as sky gradients, distant haze, floor color fields, wall color fields and broad background washes.",
            "Remove all characters, pets, NPCs, UI widgets, buttons, text, icons, icon carriers, panels, item slots, currency bars, badges and overlays.",
            "Keep these objects as isolated transparent-background cutouts only. Do not keep the broad backdrop behind them.",
            "The goal is to separate object-like background elements from the clean backdrop plate.",
        ],
        "character": [
            "Keep only character-like subjects: playable characters, pets, summons, mascots, NPC busts, full-body figures or creature companions.",
            "Remove all background scene pixels, all UI widgets, text, icons, icon carriers, panel frames and decorative screen overlays.",
            "Preserve the original silhouette, pose and placement of the retained character subject only.",
        ],
        "icon": [
            "Keep only icon glyphs or symbolic marks used by the UI: arrows, currency symbols, gears, chest marks, plus signs, badges, small semantic pictograms and similar icon content.",
            "Remove icon carrier plates, button backings, slots, circular pads, panel frames, texts, characters and the scene background.",
            "If an icon is fused with a backing shape, keep only the readable icon glyph and make the rest transparent as much as possible.",
        ],
        "icon_plate": [
            "Keep only icon carrier or backing shapes that directly belong to UI icons: circular pads, icon plates, slots, chips, capsules, tiny button bases or small decorative holders immediately behind icons.",
            "Do not keep large scene objects, decorative environment props, wall ornaments, background cards, full panels, full buttons, large containers, or any shape that belongs to the scene background instead of the icon.",
            "Scene furniture or decor such as sofas, tables, shelves, signs, curtains, wall trims or stage props are never icon plates even if they frame an icon spatially.",
            "Remove icon glyphs themselves, remove text, remove numbers, remove characters and remove the scene background.",
            "If an icon sits on a large button or large panel, keep only the local icon carrier area around the icon, not the whole button or whole panel.",
            "Preserve the original placement and silhouette of each retained backing shape, but never merge them into a full-screen background region.",
        ],
    }
    return "\n".join([item for item in [*common_lines, *profile_lines, *(layer_rules.get(layer_id) or [])] if item])


def build_ui_chaitu_filename(image_name, layer_id):
    source_stem = Path(str(image_name or "source.png")).stem
    safe_stem = safe_download_filename(source_stem, "source")
    layer_part = UI_CHAITU_LAYER_FILENAME_PARTS.get(layer_id, safe_download_filename(layer_id, "layer"))
    return f"{safe_stem}-{layer_part}.png"


def should_refine_ui_chaitu_layer(layer_id):
    return layer_id in {"background_elements", "character", "icon", "icon_plate"}


def get_ui_chaitu_refine_passes(layer_id):
    if layer_id in {"background_elements", "character", "icon", "icon_plate"}:
        return UI_CHAITU_REFINE_PASSES
    return 0


def build_ui_chaitu_refine_prompt(layer_id, body, pass_index=1):
    image_name = str(body.get("imageName") or "source.png").strip() or "source.png"
    layer_label = UI_CHAITU_LAYER_LABELS.get(layer_id, layer_id)
    scene_hint = str(body.get("sceneHint") or "").strip()
    character_hint = str(body.get("characterHint") or "").strip()
    icon_hint = str(body.get("iconHint") or "").strip()
    return "\n".join(
        item
        for item in [
            "You are refining an already extracted transparent PNG layer from a game UI screenshot.",
            f"Target layer: {layer_label}.",
            f"Source image name: {image_name}.",
            f"Refine pass: {pass_index}.",
            "Image 1 is the original full screenshot.",
            "Image 2 is the current extracted layer candidate.",
            "Keep the same canvas size, composition and placement as image 2.",
            "Return one PNG with transparent background and alpha channel.",
            "Preserve only the true target object pixels.",
            "Remove every leftover background pixel, fake transparent background texture, checkerboard residue, contour halo, spill color, fringe, seam residue and internal gap residue.",
            "Clean both the outer silhouette and the internal holes or cutouts.",
            "Do not erode the real object shape too aggressively.",
            "Do not cut away valid white highlights, pale fills, inner strokes or real edge details that belong to the object itself.",
            "Do not invent new shapes, repaint the object, relayout anything, add shadows, or add any backdrop behind transparent areas.",
            pass_index >= 2 and "This pass is stricter than the previous one. Delete any tiny leftover residue, edge crumbs, halo pixels, interior specks and false-positive scraps that are not clearly part of the real target.",
            pass_index >= 2 and "If a pixel is ambiguous between true object and residual contamination, prefer transparency unless it is clearly required for the real silhouette, fill, highlight, stroke or icon/plate structure.",
            pass_index >= 3 and "This pass is the final cleanup pass. Focus on precision cleanup only.",
            pass_index >= 3 and "Actively remove remaining dirty edge pixels, faint background tint, thin residue lines, semi-transparent contamination, tiny leftover islands, and background fragments trapped inside holes or gaps.",
            pass_index >= 3 and "Empty areas must be truly empty transparent pixels with no fake texture, haze, soft residue, or low-contrast background remnants.",
            layer_id == "icon" and "For icon extraction, keep only the icon glyphs and symbolic marks. Remove any remaining carrier plate or backing pixels.",
            layer_id == "icon_plate" and "For icon plate extraction, keep only the local icon carrier or backing shapes. Remove any remaining icon glyph pixels and any leftover scene or UI background.",
            layer_id == "character" and "For character extraction, keep only the true character or pet subject. Remove all scene, UI and residual matte pixels.",
            layer_id == "background_elements" and "For background elements extraction, keep only the removable environment objects. Remove any broad backdrop residue between or inside them.",
            scene_hint and f"Scene hint from user: {scene_hint}",
            character_hint and f"Character hint from user: {character_hint}",
            icon_hint and f"Icon hint from user: {icon_hint}",
        ]
        if item
    )


def build_ui_chaitu_object_refine_prompt(layer_id, body):
    layer_label = UI_CHAITU_LAYER_LABELS.get(layer_id, layer_id)
    scene_hint = str(body.get("sceneHint") or "").strip()
    character_hint = str(body.get("characterHint") or "").strip()
    icon_hint = str(body.get("iconHint") or "").strip()
    return "\n".join(
        item
        for item in [
            "You are doing high-precision local cleanup for a small cropped region from a game UI screenshot.",
            f"Target layer: {layer_label}.",
            "Image 1 is the cropped source region from the original screenshot.",
            "Image 2 is the current cropped extraction result for the same region.",
            "Keep the exact crop size, object placement and composition of image 2.",
            "Return one PNG with transparent background and alpha channel.",
            "Preserve only the true target pixels inside this crop.",
            "Remove all remaining background contamination, matte fringe, fake transparent texture, edge residue, internal seam residue, tiny scraps and dirty pixels.",
            "Be precise on both outer edges and enclosed holes or cutouts.",
            "Do not add any background fill behind transparent regions.",
            "Do not repaint or redesign the object.",
            "Protect real strokes, highlights, pale fills and valid internal details that belong to the target object.",
            layer_id == "icon" and "For icon crops, keep only the icon glyph or symbolic mark.",
            layer_id == "icon_plate" and "For icon plate crops, keep only the icon carrier or backing shape and remove any leftover icon glyph pixels.",
            layer_id == "character" and "For character crops, keep only the true character or pet pixels and remove all other residue.",
            layer_id == "background_elements" and "For background-element crops, keep only the true environment object pixels and remove residual backdrop fragments.",
            scene_hint and f"Scene hint from user: {scene_hint}",
            character_hint and f"Character hint from user: {character_hint}",
            icon_hint and f"Icon hint from user: {icon_hint}",
        ]
        if item
    )


def request_ui_chaitu_images(model, payload, timeout_seconds, token, target):
    request_body = json_bytes({
        "model": model,
        "payload": payload,
    })
    request = urllib.request.Request(
        BABYLON_URL,
        data=request_body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
            "X-Client-Type": "game_ux_board",
        },
        method="POST",
    )

    try:
        with open_babylon_request(request, timeout_seconds) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{UI_CHAITU_LAYER_LABELS.get(target, target)} 生成失败：Babylon {error.code} {details}") from error
    except (TimeoutError, socket.timeout) as error:
        raise RuntimeError(f"{UI_CHAITU_LAYER_LABELS.get(target, target)} 生成超时。") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"{UI_CHAITU_LAYER_LABELS.get(target, target)} 网络请求失败：{format_babylon_network_error('image', error)}") from error

    files = []
    images = []
    for file_item in data.get("files") or []:
        url = absolute_babylon_url(file_item.get("url") or "")
        if not url:
            continue
        files.append({
            "filename": file_item.get("filename") or "",
            "url": url,
            "mime_type": file_item.get("mime_type") or "",
        })
        images.append(url)

    if not images:
        raise RuntimeError(f"{UI_CHAITU_LAYER_LABELS.get(target, target)} 未返回图片结果。")

    return {
        "data": data,
        "files": files,
        "images": images,
    }


def call_ui_chaitu_object_refine(body):
    source_crop_data_url = str(body.get("sourceCropDataUrl") or "").strip()
    layer_crop_data_url = str(body.get("layerCropDataUrl") or "").strip()
    if not source_crop_data_url.startswith("data:image/"):
        raise RuntimeError("缺少可用的源图裁切 data URL。")
    if not layer_crop_data_url.startswith("data:image/"):
        raise RuntimeError("缺少可用的图层裁切 data URL。")
    return {
        "ok": True,
        "dataUrl": local_high_refine_object_crop(source_crop_data_url, layer_crop_data_url),
        "mode": "local-mask-refine",
    }


def call_ui_chaitu(body):
    started_at = time.time()
    env = read_env_file()
    token = env.get("BABYLON_JWT_TOKEN") or os.environ.get("BABYLON_JWT_TOKEN")
    if not token:
        raise RuntimeError("BABYLON_JWT_TOKEN is not configured in .env")

    image_data_url = str(body.get("imageDataUrl") or body.get("image_url") or "").strip()
    if not image_data_url.startswith("data:image/"):
        raise RuntimeError("缺少可用的源图 data URL。请从前端上传图片后重试。")

    model = str(body.get("model") or env.get("BABYLON_IMAGE_MODEL") or "gpt-image-2").strip() or "gpt-image-2"
    timeout_seconds = bounded_int(
        body.get("timeoutSeconds"),
        env_int(env, "BABYLON_IMAGE_TIMEOUT_SECONDS", DEFAULT_IMAGE_TIMEOUT_SECONDS),
        60,
        900,
    )
    canvas_spec = normalize_canvas_spec(body)
    targets = normalize_ui_chaitu_targets(body)
    image_name = str(body.get("imageName") or "source.png")
    layers = []
    reference_data_urls = {
        "source": image_data_url,
    }

    for target in targets:
        layer_started_at = time.time()
        prompt = build_ui_chaitu_prompt(target, body)
        request_images = [reference_data_urls["source"]]
        if target == "icon_plate":
            icon_reference = reference_data_urls.get("icon")
            if icon_reference:
                request_images.append(icon_reference)
        if target == "background_base":
            background_elements_reference = reference_data_urls.get("background_elements")
            if background_elements_reference:
                request_images.append(background_elements_reference)
        payload = {
            "prompt": prompt,
            "n": 1,
            "chat_id": f"ui_chaitu_{target}_{int(time.time() * 1000)}",
            "extra_metadata": {
                "prompt": prompt,
                "source": "ui_chaitu_layer_extract",
                "layer": target,
            },
            "images": request_images,
        }

        if model.startswith("gpt-image"):
            payload["size"] = canvas_spec["size"]
            payload["quality"] = "high"
        else:
            payload["aspect_ratio"] = canvas_spec["aspect_ratio"]
            payload["resolution"] = "2K"
        initial_result = request_ui_chaitu_images(model, payload, timeout_seconds, token, target)
        files = initial_result["files"]
        images = initial_result["images"]

        candidate_data_url = ""
        try:
            candidate_data_url = download_image_as_data_url(images[0], timeout_seconds, token)
        except Exception:
            candidate_data_url = ""

        refine_passes = get_ui_chaitu_refine_passes(target)
        if should_refine_ui_chaitu_layer(target) and candidate_data_url and refine_passes > 0:
            for pass_index in range(1, refine_passes + 1):
                refine_payload = {
                    "prompt": build_ui_chaitu_refine_prompt(target, body, pass_index),
                    "n": 1,
                    "chat_id": f"ui_chaitu_refine_{target}_{pass_index}_{int(time.time() * 1000)}",
                    "extra_metadata": {
                        "source": "ui_chaitu_layer_refine",
                        "layer": target,
                        "refine_pass": pass_index,
                    },
                    "images": [reference_data_urls["source"], candidate_data_url],
                }
                if model.startswith("gpt-image"):
                    refine_payload["size"] = canvas_spec["size"]
                    refine_payload["quality"] = "high"
                else:
                    refine_payload["aspect_ratio"] = canvas_spec["aspect_ratio"]
                    refine_payload["resolution"] = "2K"

                try:
                    refined_result = request_ui_chaitu_images(model, refine_payload, timeout_seconds, token, target)
                    files = refined_result["files"]
                    images = refined_result["images"]
                    candidate_data_url = download_image_as_data_url(images[0], timeout_seconds, token)
                except Exception:
                    break

        layers.append({
            "id": target,
            "label": UI_CHAITU_LAYER_LABELS.get(target, target),
            "prompt": prompt,
            "imageUrl": images[0],
            "images": images,
            "files": files,
            "filename": build_ui_chaitu_filename(image_name, target),
            "durationMs": int((time.time() - layer_started_at) * 1000),
        })
        try:
            reference_data_urls[target] = candidate_data_url or download_image_as_data_url(images[0], timeout_seconds, token)
        except Exception:
            reference_data_urls[target] = images[0]

    return {
        "ok": True,
        "provider": "babylon-local",
        "model": model,
        "layers": layers,
        "totalDurationMs": int((time.time() - started_at) * 1000),
    }


def normalize_text_model(model):
    value = str(model or "").strip()
    return value if value in ALLOWED_TEXT_MODELS else "kimi-k2-thinking"


def extract_babylon_text(value):
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "\n".join(filter(None, (extract_babylon_text(item) for item in value)))
    if not isinstance(value, dict):
        return ""

    for key in ("output_text", "text", "content", "message", "response", "result"):
        item = value.get(key)
        if isinstance(item, str) and item.strip():
            return item

    nested = value.get("data")
    if nested:
        text = extract_babylon_text(nested)
        if text:
            return text

    choices = value.get("choices")
    if isinstance(choices, list):
        parts = []
        for choice in choices:
            if isinstance(choice, dict):
                message = choice.get("message") or {}
                delta = choice.get("delta") or {}
                parts.append(message.get("content") or delta.get("content") or choice.get("text") or "")
        text = "\n".join(part for part in parts if part)
        if text:
            return text

    output = value.get("output")
    if isinstance(output, list):
        text = "\n".join(filter(None, (extract_babylon_text(item) for item in output)))
        if text:
            return text

    return ""


def build_text_request(body):
    task_value = body.get("task")
    if task_value == "outline-normalization":
        task = "outline-normalization"
    elif task_value == "outline-normalization-json-repair":
        task = "outline-normalization-json-repair"
    elif task_value == "game-design":
        task = "game-design"
    elif task_value == "visual-analysis":
        task = "visual-analysis"
    elif task_value == "style-analysis":
        task = "style-analysis"
    elif task_value == "style-analysis-json-repair":
        task = "style-analysis-json-repair"
    elif task_value == "reference-evidence-analysis":
        task = "reference-evidence-analysis"
    elif task_value == "total-asset-analysis":
        task = "total-asset-analysis"
    elif task_value == "total-asset-json-repair":
        task = "total-asset-json-repair"
    elif task_value == "ui-asset-analysis":
        task = "ui-asset-analysis"
    elif task_value == "ui-asset-json-repair":
        task = "ui-asset-json-repair"
    elif task_value == "component-baseline-analysis":
        task = "component-baseline-analysis"
    elif task_value == "ui-asset-style-fidelity-check":
        task = "ui-asset-style-fidelity-check"
    elif task_value == "design-composition-analysis":
        task = "design-composition-analysis"
    elif task_value == "design-composition-json-repair":
        task = "design-composition-json-repair"
    else:
        task = "interaction-design"
    project_name = body.get("projectName") or "未命名小游戏"

    if task == "style-analysis":
        return build_style_analysis_text_request(body, project_name)
    if task == "style-analysis-json-repair":
        return build_style_analysis_json_repair_text_request(body, project_name)
    if task == "reference-evidence-analysis":
        return build_reference_evidence_analysis_text_request(body, project_name)
    if task == "total-asset-analysis":
        return build_total_asset_analysis_text_request(body, project_name)
    if task == "total-asset-json-repair":
        return build_total_asset_json_repair_text_request(body, project_name)
    if task == "ui-asset-style-fidelity-check":
        return build_ui_asset_style_fidelity_check_text_request(body, project_name)

    if task == "outline-normalization":
        system = (
            "You normalize a raw gameplay outline into a fixed 9-field table for a game brief form. "
            "Return strict JSON only. No markdown, no code fences, no explanations, no page lists, "
            "no interaction tables, no ASCII diagrams, and no planning document sections. "
            "Output must be a JSON object with a single key named rows. "
            "rows must contain exactly 9 items in this exact order. "
            "Each item must be an object with keys field and content. "
            "Allowed field values are exactly: 游戏名称, 游戏类型, 一句话概述, 玩家目标, 核心玩法, 核心循环, 成长与关卡, 美术风格, 特色亮点. "
            "Prefer directly extracting explicit user input. "
            "If a field is missing but inferable, prefix the content with 建议设定：. "
            "Do not return empty strings or placeholders such as 待补充 or 按需调整."
        )
        raw_outline = body.get("rawOutline") or body.get("outline") or body.get("brief") or ""
        prompt = f"""Normalize the raw outline into strict JSON.

Target schema:
{{
  "rows": [
    {{"field": "游戏名称", "content": "..."}},
    {{"field": "游戏类型", "content": "..."}},
    {{"field": "一句话概述", "content": "..."}},
    {{"field": "玩家目标", "content": "..."}},
    {{"field": "核心玩法", "content": "..."}},
    {{"field": "核心循环", "content": "..."}},
    {{"field": "成长与关卡", "content": "..."}},
    {{"field": "美术风格", "content": "..."}},
    {{"field": "特色亮点", "content": "..."}}
  ]
}}

Rules:
- field must be one of the nine allowed values and appear in the exact order above
- only return JSON, with no markdown or extra explanation
- only fill the content values; do not invent extra sections
- if information is missing but inferable, prefix that content with 建议设定：
- do not output empty content

Project name:
{project_name}

Raw outline:
{raw_outline or "-"}

Platform:
{body.get("platform") or "界面：横版（16:9）"}

Extra needs:
{body.get("extraNeeds") or "-"}"""

    elif task == "outline-normalization-json-repair":
        system = (
            "You repair malformed outline-normalization output into strict JSON. "
            "Return strict JSON only. No markdown, no code fences, and no explanations. "
            "Output must be a JSON object with a single key named rows. "
            "rows must contain exactly 9 items in this exact order: 游戏名称, 游戏类型, 一句话概述, 玩家目标, 核心玩法, 核心循环, 成长与关卡, 美术风格, 特色亮点. "
            "Each item must be an object with keys field and content. "
            "Only repair structure and recover the intended content. "
            "If a field is missing but inferable from the raw outline, fill it and prefix the content with 建议设定：."
        )
        raw_outline = body.get("rawOutline") or body.get("outline") or body.get("brief") or ""
        raw_response = body.get("rawResponse") or body.get("content") or ""
        prompt = f"""Repair the following model output into strict JSON.

Target schema:
{{
  "rows": [
    {{"field": "游戏名称", "content": "..."}},
    {{"field": "游戏类型", "content": "..."}},
    {{"field": "一句话概述", "content": "..."}},
    {{"field": "玩家目标", "content": "..."}},
    {{"field": "核心玩法", "content": "..."}},
    {{"field": "核心循环", "content": "..."}},
    {{"field": "成长与关卡", "content": "..."}},
    {{"field": "美术风格", "content": "..."}},
    {{"field": "特色亮点", "content": "..."}}
  ]
}}

Rules:
- field must be one of the nine allowed values and appear in the exact order above
- do not add any explanation outside the JSON object
- do not output markdown, code fences, or extra sections
- if content is missing but inferable from the raw outline, fill it and prefix with 建议设定：

Raw outline:
{raw_outline or "-"}

Broken model output:
{raw_response or "-"}"""

    elif task == "game-design":
        system = (
            "你是资深游戏主策、系统策划和 UI/UX 协作策划。"
            "请把用户提供的游戏名字和玩法大纲扩写为可用于立项评审、交互设计、SVG 线框图和视觉设计稿生成的正式中文游戏策划案。"
            "必须严格覆盖指定的 14 个一级章节和所有二级章节，不得遗漏、合并或改编号。"
            "每个二级章节都必须结合玩法大纲定制，不得使用空泛模板句。"
            "系统、资源、任务、UI、商业化、版本计划、数据指标和风险评估等结构化内容优先使用 Markdown 表格。"
        )
        prompt = f"""请基于“游戏名字 + 玩法大纲”生成一份专业、详细、可继续用于 UI/UX 设计和程序拆解的游戏策划案。

输出硬性要求：
- 标题必须是：# 《{project_name}》游戏策划案
- 必须严格使用下面 14 个一级章节和全部二级章节编号。
- 每个二级章节都要结合玩法大纲定制内容，不能只写通用模板。
- 每个二级章节必须写正文内容，不允许只保留标题；正文需要包含机制说明、玩家行为、系统入口、状态反馈或落地建议中的至少两类信息。
- 适合结构化的内容必须使用 Markdown 表格。
- 8. UI/UX 设计 必须包含“主要界面清单”表格，字段固定为：界面名称、界面目标、入口来源、核心操作、关键状态、界面关闭方式。
- 8.7“主要界面清单”必须原样使用以下 6 列 Markdown 表头，不得输出旧 5 列版本：
| 界面名称 | 界面目标 | 入口来源 | 核心操作 | 关键状态 | 界面关闭方式 |
| --- | --- | --- | --- | --- | --- |
- 8.7 不能只输出标题，标题下方必须紧跟上面的 Markdown 表格；8.7 必须放在 8.6 新手引导之后、9. 美术与音频方向之前，不能跳过、合并或挪到别的章节。
- 主要界面清单至少 6 行；第 1 行必须是默认落点（主界面/主场景界面/大厅/HUD），入口写启动游戏默认进入，界面关闭方式写“无关闭入口；作为默认根界面”。
- 主要界面清单每一行都必须补齐第 6 列“界面关闭方式”。
- “界面关闭方式”必须由信息架构推理得出，明确写出无关闭入口、返回上一层、关闭弹窗、返回主界面、跳转结算/下一关/关卡选择等具体语义和目标界面；不能写“待定”“按需调整”。
- 入口来源为“游戏启动默认/启动游戏默认/默认进入/首次进入”的主界面、家园、首页、大厅、主场景或 HUD 是根界面，不存在“返回主界面”，因为它本身就是主界面/根界面；关闭方式必须写“无关闭入口；作为默认根界面”。
- “返回主界面”只用于从主界面进入的二级功能页，例如图鉴、仓库、任务、好友、商店、背包、活动、排行等。
- 只有默认落点、根 HUD、首页、大厅等真正根界面可以写“无关闭入口”；从主界面进入的图鉴、仓库、任务、好友、商店、背包、活动等二级功能页必须写“返回主界面”或“返回来源界面”，不能因为入口来源是主界面就写“无关闭入口”。
- 5. 系统设计、6. 数值与经济、12. 版本计划、13. 数据指标、14. 风险评估 必须优先用表格呈现。
- 页面、系统、资源、任务、状态、按钮、弹窗等命名必须尽量来自游戏名字和玩法大纲；没有明确输入时用“建议设定：”标注。
- 竞品与差异化可以写“同类产品方向/参考类型”，但不要编造未经输入确认的真实商业数据。
- 禁止输出“待补充”“按需调整”“视情况而定”“后续再定”“根据项目情况”等空泛占位语。
- 最后不要输出额外解释，不要输出代码块，只输出完整 Markdown 策划案正文。

项目名称：{project_name}
目标平台：{body.get("platform") or "PC 横屏 16:9"}
输出深度：{body.get("depth") or "标准方案"}
方案语气：{body.get("tone") or "专业评审风格"}
补充要求：{body.get("extraNeeds") or "暂无"}

必须包含章节：
## 1. 项目概述
### 1.1 游戏名称
### 1.2 游戏类型
### 1.3 平台定位
### 1.4 目标用户
### 1.5 核心卖点
### 1.6 竞品与差异化

## 2. 核心体验
### 2.1 玩家扮演身份
### 2.2 核心乐趣
### 2.3 核心玩法循环
### 2.4 短中长期目标

## 3. 世界观与题材
### 3.1 世界背景
### 3.2 主角设定
### 3.3 主要角色
### 3.4 阵营与冲突
### 3.5 玩法包装

## 4. 核心玩法设计
### 4.1 基础操作
### 4.2 单局流程
### 4.3 胜负条件
### 4.4 奖励反馈
### 4.5 失败惩罚

## 5. 系统设计
### 5.1 角色系统
### 5.2 养成系统
### 5.3 关卡系统
### 5.4 任务系统
### 5.5 资源系统
### 5.6 商店系统
### 5.7 活动系统
### 5.8 社交系统

## 6. 数值与经济
### 6.1 资源产出
### 6.2 资源消耗
### 6.3 成长曲线
### 6.4 付费点设计
### 6.5 平衡性原则

## 7. 内容规划
### 7.1 首发内容
### 7.2 剧情章节
### 7.3 角色数量
### 7.4 关卡数量
### 7.5 活动规划
### 7.6 长线更新计划

## 8. UI/UX 设计
### 8.1 主界面结构
### 8.2 功能入口
### 8.3 操作流程
### 8.4 弹窗规则
### 8.5 红点规则
### 8.6 新手引导
### 8.7 主要界面清单

## 9. 美术与音频方向
### 9.1 美术风格
### 9.2 角色风格
### 9.3 场景风格
### 9.4 UI 风格
### 9.5 特效风格
### 9.6 音乐音效

## 10. 商业化设计
### 10.1 商业模式
### 10.2 付费内容
### 10.3 广告设计
### 10.4 礼包设计
### 10.5 付费节奏

## 11. 技术需求
### 11.1 引擎与平台
### 11.2 网络需求
### 11.3 数据存储
### 11.4 性能目标
### 11.5 风险功能

## 12. 版本计划
### 12.1 Demo 版本
### 12.2 Alpha 版本
### 12.3 Beta 版本
### 12.4 上线版本
### 12.5 后续运营版本

## 13. 数据指标
### 13.1 新手完成率
### 13.2 留存指标
### 13.3 关卡数据
### 13.4 付费数据
### 13.5 活动数据

## 14. 风险评估
### 14.1 玩法风险
### 14.2 内容风险
### 14.3 技术风险
### 14.4 美术风险
### 14.5 商业化风险
### 14.6 解决方案

玩法大纲：
{body.get("normalizedOutline") or body.get("outline") or body.get("brief") or ""}"""
    elif task == "visual-analysis":
        system = (
            "你是资深游戏 UX 交互设计师，负责把游戏策划案和交互设计案转成可编辑 SVG 线框标注所需的结构化内容。"
            "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。"
            "所有界面元素、文案、道具、角色和状态必须来自输入文本或使用中性专业占位，不得编造与策划案无关的内容。"
            "必须优先分析当前界面的交互段落，输出可直接驱动 SVG 线框结构的区域、组件、状态、流程和交付字段。"
        )
        screen = body.get("screen") if isinstance(body.get("screen"), dict) else {}
        screens = body.get("screens") if isinstance(body.get("screens"), list) else []
        screen_lines = []
        for index, item in enumerate(screens, start=1):
            if isinstance(item, dict):
                close_behavior = item.get("closeBehavior") or item.get("close_behavior") or ""
                close_text = f"；关闭方式={close_behavior}" if close_behavior else ""
                screen_lines.append(f'{index}. {item.get("name", "目标界面")}（{item.get("kind", "generic")}）：{item.get("goal", "")}{close_text}')
        current_close_behavior = screen.get("closeBehavior") or screen.get("close_behavior") or "未在目标界面清单中明确；从当前交互段落推断。"

        prompt = f"""请为指定界面补全可编辑交互 SVG 所需的结构化分析。
输出必须是一个 JSON 对象，格式如下：
{{
  "goal": "一句话页面目标",
  "closeBehavior": "当前界面关闭/返回方式、触发条件和目标界面",
  "annotations": [
    {{"title": "布局结构", "body": "70字以内，说明主要区域和信息层级"}},
    {{"title": "关键交互", "body": "70字以内，说明主操作路径和跳转"}},
    {{"title": "状态与异常", "body": "70字以内，覆盖默认、空、加载、禁用、资源不足、成功、失败等适用状态"}},
    {{"title": "交付关注", "body": "70字以内，说明按钮状态、字段、埋点或程序关注点"}}
  ],
  "layoutRegions": [
    {{"name": "区域名称", "role": "区域职责", "elements": ["区域内真实元素"], "state": "默认/空/加载/异常等"}}
  ],
  "components": [
    {{"name": "组件名称", "type": "button/tab/card/panel/input/resource/nav/modal/badge", "purpose": "组件用途", "states": ["default", "disabled"]}}
  ],
  "flows": ["用户从入口到完成目标的操作路径"],
  "handoffNotes": ["action_id、字段、埋点、边界条件、程序关注点"],
  "terms": ["用于界面结构稿的真实内容词1", "真实内容词2", "真实内容词3", "真实内容词4", "真实内容词5", "真实内容词6"],
  "states": ["default", "loading", "empty", "disabled", "locked", "insufficient", "success", "error"],
  "fieldIds": ["action_xxx", "state_xxx", "resource_xxx"]
}}

要求：
1. annotations 必须正好 4 条，且标题尽量短。
2. layoutRegions 输出 3-6 条；components 输出 4-10 条；flows 输出 2-5 条；handoffNotes 输出 3-6 条。
3. 所有内容必须来自完整策划案、交互设计案、当前界面交互段落或当前 SVG 结构摘要。
4. 如果没有明确对象，只能使用“内容A/功能入口A/资源A”等中性占位；不要出现输入中没有的小鱼干、宠物、金币等具体词。
5. 当前界面名称必须优先使用“当前界面”的中文显示名，不要把 id 或 kind 当作页面名称。
6. closeBehavior 必须继承当前界面关闭方式；若未明确，只能根据当前界面段落推断，不能默认加返回/关闭。
7. 不要输出同类游戏参考、视觉风格、生图建议或无关默认模板。
8. 输出仅 JSON。

项目名称：{project_name}
目标平台：{body.get("platform") or "界面：横版（16:9）"}
当前界面：{screen.get("name", "目标界面")}（{screen.get("kind", "generic")}）
当前界面目标：{screen.get("goal", "")}
当前界面关闭方式：{current_close_behavior}
全部目标界面：
{chr(10).join(screen_lines) if screen_lines else "暂无"}

完整策划案：
{body.get("brief") or ""}

交互设计案：
{body.get("interactionPlan") or ""}

当前界面交互段落：
{body.get("currentScreenPlan") or ""}

当前本地 SVG 初稿信息，仅作兜底参考：
{json.dumps(body.get("visualStructure") or body.get("localVisual") or {}, ensure_ascii=False)}
"""
    elif task == "design-composition-analysis":
        system = (
            "你是资深游戏 UE/UI 交互架构师，负责在生成视觉设计稿前裁剪当前界面的组件清单。"
            "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。"
            "完整策划案、交互设计案、当前界面段落、当前界面 SVG/visual-analysis 决定控件需求下限；可补充服务当前页面目标的状态变体和辅助控件，但不允许添加无关系统入口。"
            "UI资产图只决定控件视觉风格，不决定当前界面应该出现哪些按钮或入口。"
            "必须明确 requiredComponents、optionalComponents、forbiddenComponents；禁止把返回、关闭、主页、设置、帮助、邮件、公告、收藏等通用按钮自动放到每个界面。"
        )
        screen = body.get("screen") if isinstance(body.get("screen"), dict) else {}
        screens = body.get("screens") if isinstance(body.get("screens"), list) else []
        screen_lines = []
        for index, item in enumerate(screens, start=1):
            if isinstance(item, dict):
                close_behavior = item.get("closeBehavior") or item.get("close_behavior") or ""
                close_text = f"；关闭方式={close_behavior}" if close_behavior else ""
                screen_lines.append(f'{index}. {item.get("name", "目标界面")}（{item.get("kind", "generic")}）：{item.get("goal", "")}{close_text}')
        current_close_behavior = screen.get("closeBehavior") or screen.get("close_behavior") or "未在目标界面清单中明确；必须从当前交互段落推断，不能默认加返回/关闭/主页控件。"

        prompt = f"""请为当前界面做“视觉设计稿生成前的组件裁剪分析”。输出必须是一个严格 JSON 对象，不要 Markdown、代码块或解释。

JSON schema：
{{
  "screenGoal": "当前界面一句话目标",
  "requiredComponents": [
    {{"name": "必须出现的组件名", "type": "title/resource/tab/list/card/button/panel/modal/state/nav/input/icon/other", "reason": "为什么必须出现", "source": "来自策划案/交互案/SVG 的证据", "priority": "must"}}
  ],
  "optionalComponents": [
    {{"name": "可选组件名", "type": "组件类型", "reason": "只有满足什么条件才出现", "source": "证据", "priority": "optional"}}
  ],
  "forbiddenComponents": [
    {{"name": "禁止出现的组件或入口", "type": "nav/button/resource/system/icon/other", "reason": "为什么当前界面不应出现", "source": "未被当前界面文档支持"}}
  ],
  "layoutSlots": [
    {{"name": "布局区域名", "type": "top/left/center/right/bottom/modal", "reason": "区域承载内容", "source": "证据"}}
  ],
  "primaryActions": [
    {{"name": "主操作按钮/动作", "type": "button/action", "reason": "主流程用途", "source": "证据"}}
  ],
  "stateWidgets": [
    {{"name": "状态/反馈组件", "type": "progress/badge/empty/loading/locked/reward/error", "reason": "状态用途", "source": "证据"}}
  ],
  "systemEntrances": [
    {{"name": "系统入口", "type": "nav/entry", "reason": "是否显示及依据", "source": "证据", "priority": "show/hide"}}
  ],
  "persistentAnchors": [
    {{"name": "跨界面固定锚点控件", "type": "back/close/settings/home/resource/title/other", "reason": "为什么需要固定位置", "source": "来自策划案/交互案/SVG 的证据；UI资产图只能作为样式参考", "priority": "fixed"}}
  ],
  "titlePolicy": "说明当前页面标题是沿用统一标题区，还是允许特殊标题构图",
  "anchorExceptions": ["只有哪些特殊页面允许偏离项目级固定锚点"],
  "resourceBarPolicy": "none/minimal/full，并说明当前界面是否需要资源栏、需要哪些资源、证据是什么",
  "negativePromptRules": ["给生图模型的负向规则，例如不要出现设置/邮件/主页/公告等无关入口"]
}}

分析硬规则：
1. 完整策划案、交互设计案、当前界面交互段落、当前界面可编辑 SVG/visual-analysis 决定控件需求下限；requiredComponents 不能少于这些资料中当前页面必需的控件。
2. UI资产图只决定控件视觉风格，不决定当前界面应该出现哪些按钮、图标、资源栏或系统入口。
3. requiredComponents 必须是当前界面完成目标不可缺少的组件；optionalComponents 可以补充服务同一目标的状态变体、辅助控件和合理扩展，但不要为了画面丰富而添加无关导航按钮。
4. forbiddenComponents 必须明确列出当前界面不该出现的常见误加组件。除非当前界面文档或“当前界面关闭方式”明确要求，否则默认禁止：返回、关闭、主页、设置、帮助、邮件、公告、收藏、一排通用导航图标、无关活动入口、无关商店入口。
5. 每日任务界面通常可以有任务页标题、任务分类、任务列表、任务进度、活跃奖励、领取/前往按钮；不应自动出现返回、关闭、主页、设置、帮助、邮件、公告、收藏等。
6. 商店界面通常可以有分类 Tab、商品卡、详情区、价格、购买/取消/资源不足状态；不应出现任务、邮件、公告、收藏等无关入口。
7. 主界面 HUD 可以有资源栏和核心系统入口，但入口数量和名称必须来自策划案/交互案，不能复制 UI资产里的全部图标。
8. 如果当前资料不足，只能输出保守的必要组件和明确负向规则，不要用默认手游模板补齐。
9. 必须根据“当前界面关闭方式”判断跨界面通用锚点：返回、关闭、设置、主页、顶部资源栏、主要界面标题。若关闭方式写明无关闭入口/无返回，必须把返回、关闭、主页列入 forbiddenComponents 或 negativePromptRules。
10. titlePolicy 必须明确说明：当前页面标题是沿用统一标题区，还是属于活动主视觉页、剧情页、登录页、封面页等特殊构图。
11. anchorExceptions 只列真正允许打破通用锚点的特殊界面类型；普通列表、详情、任务、商店、设置等功能页默认不允许随意漂移返回按钮、设置按钮、资源栏和主标题。

项目名称：{project_name}
目标平台：{body.get("platform") or "界面：横版（16:9）"}
当前界面：{screen.get("name", "目标界面")}（{screen.get("kind", "generic")}）
当前界面目标：{screen.get("goal", "")}
当前界面关闭方式：{current_close_behavior}
全部目标界面：
{chr(10).join(screen_lines) if screen_lines else "暂无"}

完整策划案：
{body.get("brief") or ""}

交互设计案：
{body.get("interactionPlan") or ""}

当前界面交互段落：
{body.get("currentScreenPlan") or ""}

当前界面可编辑 SVG / visual-analysis 结构：
{json.dumps(body.get("visualStructure") or body.get("localVisual") or {}, ensure_ascii=False, indent=2)}
"""
    elif task == "design-composition-json-repair":
        system = (
            "You are a strict JSON repair service for game UI composition analysis. "
            "Return exactly one valid JSON object. Do not return Markdown, code fences, prose, comments, or explanations. "
            "Keep the minimum component requirements supported by the current screen plan, interaction plan, editable SVG/visual analysis, or game design document. "
            "Reasonable state variants or helper controls may be kept only when they serve those requirements. "
            "Do not invent unrelated navigation icons, system entrances, resource bars, buttons, or decorative controls."
        )
        screen = body.get("screen") if isinstance(body.get("screen"), dict) else {}
        schema = {
            "screenGoal": "",
            "requiredComponents": [],
            "optionalComponents": [],
            "forbiddenComponents": [],
            "layoutSlots": [],
            "primaryActions": [],
            "stateWidgets": [],
            "systemEntrances": [],
            "persistentAnchors": [],
            "titlePolicy": "",
            "anchorExceptions": [],
            "resourceBarPolicy": "none",
            "negativePromptRules": [],
        }
        prompt = f"""Repair the original model output into a strict JSON object for current-screen UI composition analysis.

Output requirements:
- Return only one valid JSON object.
- Do not wrap it in Markdown or code fences.
- Preserve the minimum component requirements supported by the game design document, interaction plan, current screen section, editable SVG/visual-analysis, or local visual summary.
- You may preserve reasonable state variants or helper controls only when they serve those requirements; do not add generic navigation, mail, announcement, favorite, home, setting, close, back, resource bars, or buttons unless the current screen sources explicitly support them.
- UI asset images define visual style only; they are not a component inventory.
- Use this exact top-level schema and keep every key:
{json.dumps(schema, ensure_ascii=False, indent=2)}

Field rules:
- requiredComponents / optionalComponents / forbiddenComponents / layoutSlots / primaryActions / stateWidgets / systemEntrances / persistentAnchors must be arrays of objects where possible.
- Each component object should include at least name, type, reason, source, and priority when recoverable.
- titlePolicy must be a concise string describing whether the title follows the unified title zone or a special composition.
- anchorExceptions must be an array of special page types that are allowed to break persistent anchor rules; leave it empty for ordinary functional screens.
- negativePromptRules must be an array of concise strings for the image-generation prompt.
- If a field cannot be recovered, return an empty array or "none"; do not invent unrelated systems.

Project: {project_name}
Platform: {body.get("platform") or "16:9"}
Current screen: {screen.get("name", "Target screen")} ({screen.get("kind", "generic")})
Current screen goal: {screen.get("goal", "")}
Current screen close behavior: {screen.get("closeBehavior") or screen.get("close_behavior") or "not specified; infer only from current screen interaction section"}

Original invalid output:
{body.get("rawContent") or ""}

Game design document:
{body.get("brief") or ""}

Interaction design plan:
{body.get("interactionPlan") or ""}

Current screen interaction section:
{body.get("currentScreenPlan") or ""}

Editable SVG / visual-analysis / local visual summary:
{json.dumps(body.get("visualStructure") or body.get("localVisual") or {}, ensure_ascii=False, indent=2)}
"""
    elif task == "style-analysis":
        system = (
            "你是资深游戏 UI 美术风格分析师，负责把参考图特征转换成可直接用于生图模型的画风迁移关键词。"
            "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。"
            "你不能臆造参考图中不存在的具体角色、商品、场景或玩法，只能概括色彩、材质、光影、线条、按钮形态、图标质感、信息密度、背景设计方式和点线面语言。"
            "输出要服务于游戏 UI 设计稿生成，重点强调如何把参考图风格迁移到新的界面内容，并避免默认生成厚重卡片堆叠式 UI。"
        )
        summaries = body.get("imageSummaries") if isinstance(body.get("imageSummaries"), list) else []
        current_screen = body.get("currentScreen") if isinstance(body.get("currentScreen"), dict) else {}
        project_keywords = body.get("projectKeywords") if isinstance(body.get("projectKeywords"), list) else []
        image_count = len(body.get("referenceImages") or []) if isinstance(body.get("referenceImages"), list) else 0
        prompt = f"""请根据下面的参考图特征摘要，生成一组“画风迁移关键词”。输出必须是 JSON 对象，格式如下：
{{
  "styleKeywords": "一段可直接放进生图提示词的中文画风迁移关键词，120-220字",
  "styleAnalysis": {{
    "overallStyle": "一、整体画风定位：UI核心气质与风格类型",
    "colorAnalysis": "二、色彩分析：主色调、强调色、配色关键词",
    "materialTexture": "三、材质与质感分析：面板、按钮、卡片、边框、质感层级",
    "layoutComposition": "四、版式与构图分析：布局密度、视觉重心、分区方式、信息层级",
    "iconDesign": "五、图标设计分析：线条、体积、描边、材质、语义迁移规则",
    "buttonsComponents": "六、按钮与组件分析：按钮形态、状态、组件层级、交互反馈",
    "typography": "七、文字与字体风格分析：字体气质、字号层级、描边/阴影/对齐方式",
    "decorativeElements": "八、装饰元素分析：可迁移的装饰语言，以及不可迁移的主题符号",
    "lightingAtmosphere": "九、光影与氛围分析：光源、阴影、发光、景深、整体情绪"
  }},
  "palette": ["#RRGGBB", "#RRGGBB"],
  "styleRules": ["迁移规则1", "迁移规则2", "迁移规则3"],
  "themeBoundElements": ["参考图中和原游戏主题强绑定、不应迁移的元素"],
  "replacementThemeElements": ["从当前策划案、交互案或当前界面中提取的替换主题元素"],
  "elementReplacementRules": ["参考图主题元素A不要保留，替换为当前项目主题元素B；只保留其图标绘制风格"],
  "backgroundStyle": {{
    "sceneType": "背景整体类型与气质",
    "depthLayers": ["远景层规则", "中景层规则", "前景层规则"],
    "textureRules": ["背景材质、纹理、渐层或底色规则"],
    "decorativeMotifs": ["可用于背景边缘或远景的弱装饰元素"],
    "lightingMood": ["背景光影和氛围规则"],
    "avoidRules": ["背景禁止事项"],
    "uiSafetyRules": ["保证 UI 可读性与层级的规则"],
    "promptText": "可直接注入界面生图提示词的背景执行说明，80-180字"
  }},
  "shapeLanguage": {{
    "pointElements": ["参考图中点状元素的真实用途，例如星点、高光、角标、节点、微装饰"],
    "lineElements": ["参考图中线性元素的真实用途，例如描边、连接线、分隔线、轨道、细框"],
    "planeElements": ["参考图中面状元素的真实用途，例如主面板、半透信息层、局部承载面"],
    "proportionGuidance": ["必须直接说明参考图更偏点/更偏线/更偏面，哪一类主导，哪一类辅助"],
    "panelWeightRules": ["基于参考图说明面板是薄、透、轻，还是少量主面板可略实；不要泛泛而谈"],
    "transparencyRules": ["基于参考图说明透明度、浅面层、悬浮感如何使用"],
    "edgeTreatmentRules": ["基于参考图说明边缘、描边、分隔线、圆角、阴影的轻重关系"],
    "avoidRules": ["指出与该参考图不符的厚重块面做法"],
    "promptText": "可直接注入界面生图提示词的点线面执行说明，80-180字，必须明确参考图主次比例"
  }},
  "buttonMorphology": {{
    "silhouette": ["主按钮、Tab、入口按钮的整体外轮廓，例如复合页签、卡片按钮、胶囊、旗帜、切角或局部异形"],
    "cornerProfile": ["圆角大小、位置和对称性，必须使用 micro/small/medium/large/pill 相对等级，可描述混合圆角"],
    "segmentation": ["左图标腔、文字区、右角标、顶部凸起、底部阴影等分段结构"],
    "edgeProfile": ["描边厚度、斜切、弧形拼接、缺口、尖角、内外边等边缘结构"],
    "materialLayers": ["底色、纹理、描边、高光、内阴影、投影层等按钮材质层"],
    "ornamentSlots": ["红点、礼物、徽章、尖角、角花等可迁移的角标/装饰插槽"],
    "stateVariants": ["默认、选中、禁用、可领取、红点等状态差异"],
    "negativeSimplifications": ["禁止简化为普通圆角矩形、长圆角按钮、默认网页胶囊等低信息形态"],
    "promptText": "可直接注入界面和 UI资产图提示词的按钮形态执行说明，80-180字"
  }},
  "negativeKeywords": "需要避免的风格偏差"
}}

要求：
1. 必须先观察参考图本身，再输出风格结论；本地特征摘要只用于校正主色、明度、饱和度，不允许作为唯一依据。
2. 只描述可迁移的视觉风格，不描述具体图片内容，不复刻参考图原始页面。
3. styleAnalysis 必须完整填写 9 个字段，且每个字段必须是针对参考图的具体观察关键词 + 迁移说明；不要写空泛形容词。
4. 每个 styleAnalysis 字段必须包含能从参考图观察到的具体关键词，例如主色、材质、线条、按钮形态、图标质感、光影、信息密度、装饰节奏；不允许只写“参考图已上传”“本地图像指标读取基础色彩”“按参考图风格生成”等空泛句。
5. styleKeywords 必须是一组具体可用的 UI 生图关键词组合，覆盖色彩、材质、线条、按钮、图标、光影、信息密度和构图；不能只是项目名或用户输入关键词复述。
6. 必须强调 UI 面板材质、按钮质感、图标渲染、描边/投影、光影层级、色彩氛围、构图语言和信息密度。
7. 如果参考图呈现漫画/二次元/暗黑/科幻/手绘/Q版/写实/像素等明确风格，styleKeywords 必须明确对应风格；不要输出与参考图明显冲突的风格。
8. 如果图片无法读取，请在 styleKeywords 中写“参考图无法被模型读取”，styleAnalysis 只说明无法读取原因，不要编造自然背景、写实风格、低饱和等结论。
9. 如果用户输入了画风关键词，需要与参考图特征合并，不要互相冲突。
10. themeBoundElements 只列参考图里的原游戏主题符号、IP角色、角色头像、道具、徽章、货币图案、资源符号、装饰性主题元素；不要把通用 UI 形态、按钮形状、面板材质、配色、投影、描边写进去。
11. replacementThemeElements 只能来自当前项目上下文；没有明确元素时返回空数组，不要凭空创造新玩法或新资源。
12. elementReplacementRules 必须写成明确映射：参考图主题绑定元素 → 当前项目主题元素；如果当前项目没有对应元素，则写“替换为中性系统占位图标”，但不要保留原主题符号。
13. backgroundStyle 只描述背景如何体现参考图风格，不允许把参考图里的角色、商品、主题道具、文字、IP 标识直接搬进背景。
14. backgroundStyle 必须明确：背景不能只是纯色铺底，至少给出材质、层次、轻装饰或光影氛围中的一种以上做法。
15. backgroundStyle.uiSafetyRules 必须强调：背景服务 UI，不抢主按钮、主卡片、关键数值、资源栏和正文区。
16. shapeLanguage 不是通用建议集合，而是对当前参考图的观察结果；必须判断点状装饰是稀疏还是密集、线性分隔是否主导信息组织、面状容器是主导还是辅助。
17. shapeLanguage.proportionGuidance 必须直接回答“参考图更偏点 / 更偏线 / 更偏面”，并说明背景、容器、按钮三层中哪一层在主导视觉。
18. shapeLanguage 必须明确哪些面板在这张参考图里是薄面、透面、浅面，哪些才允许做成主面板；不要把所有图都统一压成“减少块面”。
19. shapeLanguage 必须限制“大片纯色矩形 + 厚描边 + 多层重阴影”的厚重块面倾向，并说明如何按该参考图的做法用线和点替代一部分大面块。
20. 如果参考图整体更轻、更透、更依赖细线和留白，不允许把这种风格翻译成多个厚重矩形卡片。
21. negativeKeywords 需要提醒不要复制参考图角色、商品、文字、原始布局、无关玩法和主题绑定元素，也不要生成厚重的默认卡片堆叠 UI。
22. buttonMorphology 必须专门分析主按钮、Tab、活动入口、导航按钮和弹窗按钮；不能只写“长圆角矩形”“圆角按钮”。
23. buttonMorphology.cornerProfile 必须使用 micro/small/medium/large/pill 相对圆角级别，并说明圆角位置、是否左右/上下不对称、是否有斜切、凸起、缺口、图标腔或角标插槽。
24. buttonMorphology.negativeSimplifications 必须明确禁止把参考图中的复合按钮、页签或入口按钮简化为普通圆角矩形、默认胶囊按钮或现代网页按钮。
25. backgroundStyle、shapeLanguage 和 buttonMorphology 必须作为根级 JSON 对象输出，不能写成普通段落、不能塞进 styleKeywords 或 styleAnalysis 的某个字符串里。
26. 如果某项分析无法从参考图确认，对应字段返回空数组或空字符串，并说明缺失；不要用默认规则冒充参考图真实观察。

项目名称：{project_name}
目标平台：{body.get("platform") or "横版 16:9"}
当前界面：{current_screen.get("name") or "未指定"} / {current_screen.get("kind") or "generic"}
当前界面目标：{current_screen.get("goal") or "未提供"}
参考图数量：{image_count}
用户输入画风关键词：{body.get("styleKeywords") or "未填写"}
本地初步关键词：{body.get("localKeywords") or "无"}
项目关键词：{'、'.join(project_keywords) if project_keywords else '无'}
当前界面交互段落：
{body.get("currentScreenPlan") or "无"}

当前界面 SVG/结构摘要：
{body.get("visualStructure") or "无"}

完整策划案：
{body.get("gameDesign") or "无"}

完整交互设计案：
{body.get("interactionPlan") or "无"}

参考图特征摘要：
{json.dumps(summaries, ensure_ascii=False, indent=2)}"""
    elif task == "style-analysis-json-repair":
        system = (
            "你是严格 JSON 修复器，只负责把参考图风格分析模型输出修复为指定 schema 的合法 JSON。"
            "只返回一个 JSON 对象，不要 Markdown，不要代码块，不要解释。"
            "只能保留原始返回中已经表达的参考图风格、背景规则、点线面观察、按钮形态和迁移边界；不能凭空编造新的参考图结论。"
            "缺失字段用空对象、空数组或空字符串补齐；如果原文没有背景或点线面内容，不要编造默认规则。"
        )
        summaries = body.get("imageSummaries") if isinstance(body.get("imageSummaries"), list) else []
        current_screen = body.get("currentScreen") if isinstance(body.get("currentScreen"), dict) else {}
        project_keywords = body.get("projectKeywords") if isinstance(body.get("projectKeywords"), list) else []
        prompt = f"""请把下面“原始返回内容”修复为合法 JSON 对象，只返回 JSON，不要 Markdown。

目标 JSON schema：
{{
  "styleKeywords": "",
  "styleAnalysis": {{
    "overallStyle": "",
    "colorAnalysis": "",
    "materialTexture": "",
    "layoutComposition": "",
    "iconDesign": "",
    "buttonsComponents": "",
    "typography": "",
    "decorativeElements": "",
    "lightingAtmosphere": ""
  }},
  "palette": [],
  "styleRules": [],
  "themeBoundElements": [],
  "replacementThemeElements": [],
  "elementReplacementRules": [],
  "backgroundStyle": {{
    "sceneType": "",
    "depthLayers": [],
    "textureRules": [],
    "decorativeMotifs": [],
    "lightingMood": [],
    "avoidRules": [],
    "uiSafetyRules": [],
    "promptText": ""
  }},
  "shapeLanguage": {{
    "pointElements": [],
    "lineElements": [],
    "planeElements": [],
    "proportionGuidance": [],
    "panelWeightRules": [],
    "transparencyRules": [],
    "edgeTreatmentRules": [],
    "avoidRules": [],
    "promptText": ""
  }},
  "buttonMorphology": {{
    "silhouette": [],
    "cornerProfile": [],
    "segmentation": [],
    "edgeProfile": [],
    "materialLayers": [],
    "ornamentSlots": [],
    "stateVariants": [],
    "negativeSimplifications": [],
    "promptText": ""
  }},
  "negativeKeywords": ""
}}

修复规则：
1. 只修复结构和字段归位，不重新分析参考图，不新增原始返回没有表达的结论。
2. 如果原始返回把背景规则写成 background、bgStyle、backgroundRules、背景风格、背景分析，请归入 backgroundStyle。
3. 如果原始返回把点线面写成 shape、shapeRules、pointLinePlane、点线面、点线面分析，请归入 shapeLanguage。
4. 如果原始返回把按钮形态写成 buttonShape、buttonCornerProfile、mainButtonMorphology、按钮形态、主按钮形态、按钮圆角，请归入 buttonMorphology。
5. 如果背景、点线面或按钮形态只是普通段落，保留到对应对象的 promptText，并尽量拆到相关数组字段。
6. 如果原始返回没有背景、点线面或按钮形态内容，对应对象保留空字段，不要填默认规则。
7. buttonMorphology 只修复原文已经表达的按钮轮廓、圆角等级、角部结构、分段、描边、材质、状态；不要凭空编造。
8. styleAnalysis 只保留参考图真实观察；不要把默认规则或“按参考图生成”这类空话填进去。
9. 不要保留 Markdown 标题、代码块标记、解释性前后文。

项目名称：{project_name}
目标平台：{body.get("platform") or "横版 16:9"}
当前界面：{current_screen.get("name") or "未指定"} / {current_screen.get("kind") or "generic"}
用户输入画风关键词：{body.get("styleKeywords") or "未填写"}
本地图像指标（仅供校验，不能作为风格结论）：{body.get("localKeywords") or "无"}
项目关键词：{'、'.join(project_keywords) if project_keywords else '无'}

当前界面交互段落：
{body.get("currentScreenPlan") or "无"}

参考图特征摘要：
{json.dumps(summaries, ensure_ascii=False, indent=2)}

原始返回内容：
{body.get("rawContent") or ""}"""
    elif task == "ui-asset-analysis":
        system = (
            "你是资深游戏 UI 设计系统美术指导，负责把参考图分析为可生成项目级 UI Asset Sheet 的结构化规则。"
            "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。"
            "必须按关键词、配色、元素、控件需求下限、参考图同类型控件风格库、按钮形态、风格贴合目标、风格锁定顺序分析。"
            "策划案和交互案决定控件需求下限；参考图只提供同类型控件画风迁移，不决定当前项目要出现哪些业务控件。"
            "参考图是 UI 控件视觉语言的强基准，必须提取具体可执行的色彩比例、面板轮廓、按钮材质、按钮圆角比例、角部结构、描边厚度、字体气质、装饰节奏、光影和点线面比例。"
            "不要输出通用 Q版、宠物模拟器奶油拟物、现代网页扁平卡片或泛化卡通资产板，除非参考图本身明确呈现这些特征。"
            "只迁移视觉语言，不迁移参考图原主题内容。"
        )
        summaries = body.get("imageSummaries") if isinstance(body.get("imageSummaries"), list) else []
        prompt = f"""请基于参考图、策划案和交互案，生成“项目级 UI资产图”的结构化分析。必须严格返回 JSON 对象：
{{
  "keywords": {{"visualKeywords": [], "uiKeywords": [], "projectThemeKeywords": []}},
  "palette": {{"primary": [], "accent": [], "background": [], "contrastRules": []}},
  "elements": {{"transferable": [], "themeBoundElements": [], "replacementThemeElements": [], "elementReplacementRules": [], "assetList": ["从策划案/交互案提取出的必须覆盖资产项"]}},
  "componentDemand": {{"requiredFromPlan": [], "extendableVariants": [], "forbiddenUnrelated": []}},
  "referenceComponentStyleLibrary": [
    {{"componentType": "button/card/panel/tab/nav/resource/progress/badge/icon/input/modal/list/other", "observedStyle": "参考图同类控件的具体视觉表现", "transferableRules": "可迁移到当前项目控件的形状、描边、材质、色彩、光影、字体规则", "replacementBoundary": "哪些原主题内容不能迁移，应该替换成当前项目语义"}}
  ],
  "buttonMorphology": {{
    "silhouette": ["主按钮、Tab、入口按钮的整体外轮廓"],
    "cornerProfile": ["圆角大小、位置和对称性，使用 micro/small/medium/large/pill 相对等级"],
    "segmentation": ["左图标腔、文字区、右角标、顶部凸起、底部阴影等分段结构"],
    "edgeProfile": ["描边厚度、斜切、弧形拼接、缺口、尖角、内外边等边缘结构"],
    "materialLayers": ["底色、纹理、描边、高光、内阴影、投影层"],
    "ornamentSlots": ["红点、礼物、徽章、尖角、角花等角标或装饰插槽"],
    "stateVariants": ["默认、选中、禁用、可领取、红点等状态差异"],
    "negativeSimplifications": ["禁止简化为普通圆角矩形、长圆角按钮或默认网页胶囊"],
    "promptText": "资产图生成时必须复用的按钮形态与圆角执行说明"
  }},
  "styleFidelityTargets": {{
    "colorRatio": ["主色/辅助色/强调色比例与使用位置"],
    "shapeLanguage": ["面板轮廓、圆角、斜切、裁切、卡片比例"],
    "materialTexture": ["纸质、金属、玻璃、磨砂、木纹、渐变、颗粒等材质证据"],
    "strokeShadow": ["描边厚度、内外阴影、高光、投影、发光规则"],
    "typography": ["标题/正文/数字字体气质、粗细、描边或阴影"],
    "decorativeRhythm": ["纹样、角花、红点、标签、点状节奏和装饰密度"],
    "pointLinePlane": ["点/线/面比例，线性分隔和面板重量"]
  }},
  "referenceStyleAnchors": [
    {{"target": "button/card/panel/tab/nav/resource/progress/badge/icon/input/modal/list/other", "referenceEvidence": "参考图里可观察到的同类或近似控件证据", "transferRule": "生成当前项目同类控件时必须迁移的视觉规则", "doNotChange": "不得迁移的原主题内容或不得泛化的方向"}}
  ],
  "antiGenericRules": ["防止资产图退化成通用风格的具体禁止项"],
  "assetSheetStyleLocks": {{"mustKeep": [], "mustAvoid": [], "styleDistanceWarnings": []}},
  "style": {{"material": "", "shapeRules": [], "iconRules": [], "buttonRules": [], "panelRules": [], "typographyRules": [], "lightingRules": [], "forbiddenShapes": [], "forbiddenContent": []}},
  "themeBoundElements": [],
  "replacementThemeElements": [],
  "elementReplacementRules": [],
  "assetSheetPrompt": "一段可直接指导生图模型生成 UI Asset Sheet 的中文提示词"
}}

分析顺序：关键词 → 配色 → 元素 → 控件需求下限 → 参考图同类型控件风格库 → 按钮形态 → 风格。
可迁移内容：配色比例、材质、描边、按钮形态、图标绘制语言、光影、字体气质、信息密度。
不可迁移内容：参考图原主题角色、IP、商标、原文字、特定道具、主题货币图案、原游戏符号。
替换原则：所有主题符号都必须替换为当前策划案/交互案里的游戏主题元素；没有明确元素时使用中性系统图标。
控件来源原则：策划案和交互案决定 UI 资产图的控件需求下限，生成结果不能少于这些需求；AI 可以补充服务当前项目的状态变体和辅助控件，但不得因为参考图里出现某业务入口、资源栏、导航或系统按钮就强行加入当前项目。
同类型迁移原则：参考图负责提供画风、材质、构图语言和同类型控件样式。每个资产项都要优先匹配参考图中的同类或近似控件进行迁移；找不到足够同类证据时，必须在分析结果中标记缺失并建议补充参考图，不要改用默认画风。
风格贴合原则：UI资产图的第一优先级是贴近参考图控件视觉语言。必须写清主色比例、辅助色、面板轮廓、按钮材质、描边、字体、装饰节奏、点线面比例和信息密度。
按钮形态原则：buttonMorphology 必须使用 micro/small/medium/large/pill 描述圆角相对比例，并说明圆角位置、混合圆角、斜切、凸起、缺口、图标腔、角标插槽、描边和材质层；禁止只写“长圆角矩形”。
反通用原则：除非参考图本身就是对应风格，否则禁止把资产图写成通用 Q版、宠物模拟器奶油拟物、现代网页扁平卡片、默认柔和圆角或泛化卡通 UI。

项目名称：{project_name}
目标平台：{body.get("platform") or "横版 16:9"}
用户生图关键词：{body.get("styleKeywords") or "未填写"}
已有画风迁移关键词：{body.get("styleTransferKeywords") or "无"}

完整策划案：
{body.get("gameDesign") or "无"}

完整交互设计案：
{body.get("interactionPlan") or "无"}

参考图特征摘要：
{json.dumps(summaries, ensure_ascii=False, indent=2)}"""
    elif task == "ui-asset-json-repair":
        system = (
            "你是严格 JSON 修复器，只负责把输入内容改写为指定 schema 的合法 JSON。"
            "只返回一个 JSON 对象，不要 Markdown，不要代码块，不要解释。"
            "不得新增与输入项目无关的玩法、资源、角色或 UI 系统。"
        )
        prompt = f"""请把下面“原始返回内容”修复为合法 JSON 对象，只返回 JSON，不要 Markdown。

目标 JSON schema：
{{
  "keywords": {{"visualKeywords": [], "uiKeywords": [], "projectThemeKeywords": []}},
  "palette": {{"primary": [], "accent": [], "background": [], "contrastRules": []}},
  "elements": {{"transferable": [], "themeBoundElements": [], "replacementThemeElements": [], "elementReplacementRules": [], "assetList": []}},
  "componentDemand": {{"requiredFromPlan": [], "extendableVariants": [], "forbiddenUnrelated": []}},
  "referenceComponentStyleLibrary": [
    {{"componentType": "", "observedStyle": "", "transferableRules": "", "replacementBoundary": ""}}
  ],
  "buttonMorphology": {{
    "silhouette": [],
    "cornerProfile": [],
    "segmentation": [],
    "edgeProfile": [],
    "materialLayers": [],
    "ornamentSlots": [],
    "stateVariants": [],
    "negativeSimplifications": [],
    "promptText": ""
  }},
  "styleFidelityTargets": {{"colorRatio": [], "shapeLanguage": [], "materialTexture": [], "strokeShadow": [], "typography": [], "decorativeRhythm": [], "pointLinePlane": []}},
  "referenceStyleAnchors": [
    {{"target": "", "referenceEvidence": "", "transferRule": "", "doNotChange": ""}}
  ],
  "antiGenericRules": [],
  "assetSheetStyleLocks": {{"mustKeep": [], "mustAvoid": [], "styleDistanceWarnings": []}},
  "style": {{"material": "", "shapeRules": [], "iconRules": [], "buttonRules": [], "panelRules": [], "typographyRules": [], "lightingRules": [], "forbiddenShapes": [], "forbiddenContent": []}},
  "themeBoundElements": [],
  "replacementThemeElements": [],
  "elementReplacementRules": [],
  "assetSheetPrompt": ""
}}

修复规则：
1. 保留原始返回中与 UI资产分析有关的信息。
2. 不要保留 Markdown 标题、代码块标记、解释性前后文。
3. 缺失字段用空数组或空字符串补齐。
4. componentDemand 必须体现策划案/交互案决定的控件需求下限，不能用参考图控件清单替代。
5. referenceComponentStyleLibrary 只记录参考图里的同类型控件风格样本，不把参考图业务入口当成当前项目控件需求。
6. 如果原始返回把按钮形态写成 buttonShape、buttonCornerProfile、mainButtonMorphology、按钮形态、主按钮形态、按钮圆角，请归入 buttonMorphology。
7. buttonMorphology 只保留原始返回中已经表达的按钮轮廓、圆角等级、角部结构、分段、描边、材质和状态；不要凭空编造。
8. styleFidelityTargets、referenceStyleAnchors、antiGenericRules、assetSheetStyleLocks 必须保留原始返回里关于参考图贴合度、同类控件证据和反通用偏差的内容；没有就用空数组或空字符串，不要编造。
9. assetSheetPrompt 必须是 180-320 字中文提示词，指导生图模型生成强贴参考图视觉语言的干净可复用 UI Asset Sheet。

项目名称：{project_name}
目标平台：{body.get("platform") or "横版 16:9"}
用户生图关键词：{body.get("styleKeywords") or "未填写"}

原始返回内容：
{body.get("rawContent") or ""}"""
    elif task == "component-baseline-analysis":
        system = (
            "你是资深游戏 UI 设计系统负责人，负责只从项目级 UI控件资产图中提取可复用的通用控件基准。"
            "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。"
            "附带图片应是 UI控件资产图；不要把普通界面设计稿、业务插画、角色、场景、道具当成跨界面控件基准。"
            "如果提供了 A-H 分区资产板规范，优先按分区位置识别通用控件族，并在 evidence 写清分区证据。"
            "如果某类控件没有出现在图片中，也没有对应分区视觉等价物，不要返回该类型。"
            "规则必须描述可复用的视觉语言：外轮廓、圆角/斜切、描边层数、材质、阴影、发光、高光、字体、图标承载、默认/选中/禁用状态差异。"
            "控件基准只约束通用 UI 语言，不复用具体业务内容、具体文字、IP 角色或原始图案。"
        )
        screen = body.get("screen") if isinstance(body.get("screen"), dict) else {}
        component_types = body.get("componentTypes") if isinstance(body.get("componentTypes"), list) else []
        existing_baselines = body.get("existingBaselines") if isinstance(body.get("existingBaselines"), list) else []
        required_ui_asset_components = body.get("requiredUiAssetComponents") if isinstance(body.get("requiredUiAssetComponents"), list) else []
        project_anchor_policy = body.get("projectAnchorPolicy") if isinstance(body.get("projectAnchorPolicy"), list) else []
        retry_missing_components = body.get("retryMissingComponents") if isinstance(body.get("retryMissingComponents"), list) else []
        ui_asset_board_section_spec = str(body.get("uiAssetBoardSectionSpec") or "").strip()
        component_type_lines = "\n".join(
            f'- {item.get("id")}: {item.get("label")}'
            for item in component_types
            if isinstance(item, dict)
        )
        existing_lines = "\n".join(
            f'- {item.get("type")}（{item.get("label") or item.get("type")}，来源：{item.get("sourceScreenName") or "未知"}）：{item.get("rules") or ""}'
            for item in existing_baselines
            if isinstance(item, dict)
        )
        required_lines = "\n".join(
            f'{index + 1}. {item.get("type") or item.get("id") or item.get("name")} / {item.get("label") or item.get("name") or ""}（来源：{item.get("sourceScreen") or item.get("screen") or "交互案"}；证据：{item.get("evidence") or item.get("reason") or item.get("source") or ""}）'
            for index, item in enumerate(required_ui_asset_components)
            if isinstance(item, dict)
        )
        anchor_lines = "\n".join(
            f'{index + 1}. {item.get("type") or item.get("id") or item.get("name")} / {item.get("label") or item.get("name") or ""}：{item.get("anchor") or item.get("position") or item.get("rule") or ""}；适用：{item.get("appliesTo") or item.get("scope") or ""}'
            for index, item in enumerate(project_anchor_policy)
            if isinstance(item, dict)
        )
        retry_lines = "\n".join(
            f'{index + 1}. {item.get("type") or item.get("id") or item.get("name")} / {item.get("label") or item.get("name") or ""}'
            for index, item in enumerate(retry_missing_components)
            if isinstance(item, dict)
        )
        prompt = f"""请观察附带的“UI控件资产图”，提取其中真实出现的项目级通用 UI 控件基准。
输出必须是严格 JSON 对象，格式如下：
{{
  "components": [
    {{
      "type": "resource_token",
      "present": true,
      "rules": ["外轮廓/圆角或斜切规则", "材质/描边/阴影/高光规则", "字体/图标承载/状态层级规则"],
      "shapeRules": ["外轮廓、比例、斜切/碎片边缘、圆角或尖角规则"],
      "colorRules": ["主色/辅色/禁用色/选中色关系"],
      "materialRules": ["材质、半调纹理、噪点、厚度、投影和高光"],
      "strokeRules": ["描边层数、黑白描边、内外框关系"],
      "iconCarrierRules": ["图标底板、图标留白、箭头/齿轮/资源图标承载规则"],
      "stateRules": ["默认态、选中态、禁用态、锁定态或红点态的视觉差异"],
      "usageRules": ["普通界面中什么场景必须复用该基准，什么场景只能外推"],
      "positionRules": ["普通界面中的稳定锚点、相对标题/资源栏/底部导航的位置关系"],
      "evidence": "该控件在图中的位置或表现证据",
      "confidence": 0.85
    }}
  ],
  "coverage": {{
    "covered": [{{"type": "back_button", "label": "返回按钮", "evidence": "图中左上区域有同类箭头返回按钮"}}],
    "missing": [{{"type": "screen_title", "label": "界面标题区", "evidence": "交互案要求但图中没有可复用标题底板"}}]
  }},
  "layoutAnchors": [
    {{"type": "back_button", "label": "返回按钮", "anchor": "左上安全区固定位置", "appliesTo": "需要返回的功能页", "evidence": "交互案固定锚点"}}
  ]
}}

可返回的 type 只能来自下列列表：
{component_type_lines or "- button_primary: 主按钮"}

分析规则：
1. requiredUiAssetComponents 只是固定通用控件族或前端传入的识别提示，不是交互案 hard minimum；不要因为 missing 阻断总资产。
1.1 如果提供了 A-H 分区资产板规范，必须先按分区位置检查：A 导航与关闭、B 按钮、C 容器面板、D 标签导航、E 资源状态、F 物品角色信息、G 输入提示、H 图标基础件。evidence 必须写出分区或相对位置。
1.2 components 只返回 UI控件资产图中明确出现或在对应 A-H 分区有可信视觉等价物的通用控件类型；不确定项可放入 coverage.unconfirmed，missing 仅作提示。
2. 只提取通用 UI 样式，不提取具体业务文字、角色、商品、道具、场景和 IP 元素。
3. rules 必须可用于后续界面复用，重点描述：外轮廓、圆角/斜切、材质、描边层数、阴影/发光、高光、字体气质、图标承载容器、图标线条、状态区分、按钮层级。
4. 必须尽量区分：screen_title、back_button、close_button、settings_button、resource_token、tab_default、tab_selected、bottom_nav_default、bottom_nav_selected、icon_button、progress_bar、panel_card、modal、list_item、item_slot、avatar_frame、tooltip、badge。
5. 如果 UI资产图中同时出现默认态和选中态，必须拆成 tab_default/tab_selected 或 bottom_nav_default/bottom_nav_selected，不要合并成一个笼统 tab/nav。
6. resource_token 必须描述资源图标、数值胶囊、加号/补充入口、底槽材质和描边/高光关系；不要只返回 resource_icon。
7. back_button 必须描述图标承载容器、箭头图形、粗黑白描边、红/白状态、斜切/碎片边缘、半调纹理、材质、高光和背景分离方式。看到红框那类箭头按钮时必须识别为 back_button。
8. item_slot、avatar_frame、tooltip、list_item 必须只有在图中真实出现对应格子/头像容器/提示气泡/列表项时才返回；不要把纯装饰框、角色插画或背景物件误判为通用控件。
9. 如果同类控件已有基准，仍可描述图片中的表现，但前端会以前者为准；不要建议覆盖已有基准。
10. layoutAnchors 必须把 projectAnchorPolicy 中的返回、关闭、设置、资源栏、底部导航和 screen_title 位置规则转成后续界面可复用的固定锚点。
11. 输出仅 JSON，不要 Markdown。

项目名称：{project_name}
目标平台：{body.get("platform") or "界面：横版（16:9）"}
分析对象：{screen.get("name", "UI控件资产图")}（{screen.get("kind", "ui_asset")}）
分析目标：{screen.get("goal", "从 UI资产图锁定跨界面组件基准")}
当前界面关闭方式：{screen.get("closeBehavior") or screen.get("close_behavior") or "未指定；以 requiredUiAssetComponents 和项目级固定锚点策略为准"}

已锁定控件基准（只作上下文，不要覆盖）：
{existing_lines or "暂无"}

通用 UI 控件族识别提示（非交互案 hard minimum，missing 不阻断）：
{required_lines or "暂无；只提取图中真实通用控件"}

项目级固定锚点策略：
{anchor_lines or "暂无；仍需保持同类控件位置一致"}

UI控件资产图 A-H 分区规范：
{ui_asset_board_section_spec or "未提供；按图中空间聚类识别，但仍需写清位置证据"}

本次重试需重点复核的缺失组件：
{retry_lines or "无"}

完整策划案摘要：
{body.get("gameDesign") or "无"}

交互设计案摘要：
{body.get("interactionPlan") or "无"}

当前界面交互段落：
{body.get("currentScreenPlan") or "无"}

当前界面 SVG/结构摘要：
{body.get("visualStructure") or "无"}"""
    else:
        system = (
            "你是资深游戏 UX 设计师和 UI 交互设计负责人。"
            "请根据完整策划案生成专业、可交付、中文的界面交互设计方案。不要输出 SVG、代码或视觉图。"
            "页面清单、按钮层级、状态规范、程序字段等内容优先用 Markdown 表格表达。"
            "每个页面都必须包含独立的关闭/返回方式小节，继承目标界面里的关闭方式，并写清关闭/返回控件、触发条件、返回目标和异常处理。"
        )
        screens = body.get("screens") if isinstance(body.get("screens"), list) else []
        screen_lines = []
        for index, screen in enumerate(screens, start=1):
            if isinstance(screen, dict):
                details = [
                    screen.get("goal") or "",
                    f'入口={screen.get("entrySource")}' if screen.get("entrySource") else "",
                    f'核心操作={screen.get("coreAction")}' if screen.get("coreAction") else "",
                    f'关键状态={screen.get("keyState")}' if screen.get("keyState") else "",
                    f'关闭方式={screen.get("closeBehavior") or screen.get("close_behavior")}' if screen.get("closeBehavior") or screen.get("close_behavior") else "",
                ]
                screen_lines.append(f'{index}. {screen.get("name", "目标界面")}（{screen.get("kind", "generic")}）：{"；".join(item for item in details if item)}')
        prompt = f"""请基于下面完整游戏策划案生成专业界面交互设计方案，使用中文 Markdown。

项目名称：{project_name}
目标平台：{body.get("platform") or "PC 横屏 16:9"}
输出深度：{body.get("depth") or "标准方案"}
方案语气：{body.get("tone") or "专业评审风格"}
目标界面：
{chr(10).join(screen_lines) if screen_lines else "请从策划案推导 5-8 个主要界面。"}

补充要求：
{body.get("extraNeeds") or "暂无"}

玩法大纲原文：
{body.get("outline") or ""}

完整策划案：
{body.get("brief") or ""}

本地规则初稿，仅作参考：
{body.get("localPlan") or ""}

每个页面必须包含：页面目标、入口来源、布局结构、关键交互、状态反馈、异常状态、按钮层级、关闭/返回方式、Figma 交付建议；关闭/返回逻辑必须继承目标界面里的关闭方式，不能给所有页面套用同一个返回/关闭按钮。

关闭/返回方式小节必须作为每个页面自己的 Markdown 小节输出，内容包括：
- 关闭方式：复述目标界面的“界面关闭方式”原文。
- 关闭/返回控件：写明返回按钮、关闭按钮、主页按钮或“不显示返回/关闭/主页控件”。
- 触发条件：写明点击哪个控件或完成哪个流程后触发。
- 返回目标：写明返回主界面、来源界面、上一层、下一关/下一流程或停留当前根界面。
- 异常处理：写明未保存、来源栈缺失、网络提交中、动画/奖励未完成等情况下如何拦截或兜底。
关闭方式为“无关闭入口/无返回/默认根界面”时，该页面必须明确禁止返回、关闭、主页控件；关闭方式为“关闭后返回来源界面/弹窗关闭”时，该页面必须明确关闭按钮。"""

    return task, system, prompt


def call_babylon_text(body):
    env = read_env_file()
    token = env.get("BABYLON_JWT_TOKEN") or os.environ.get("BABYLON_JWT_TOKEN")
    if not token:
        raise RuntimeError("BABYLON_JWT_TOKEN is not configured in .env")

    timeout_seconds = env_int(env, "BABYLON_TEXT_TIMEOUT_SECONDS", DEFAULT_TEXT_TIMEOUT_SECONDS)
    task, system, prompt = build_text_request(body)
    task_default_model = "gpt-5.2" if task in ("outline-normalization", "outline-normalization-json-repair", "style-analysis-json-repair", "reference-evidence-analysis", "total-asset-analysis", "total-asset-json-repair", "ui-asset-analysis", "ui-asset-json-repair", "ui-asset-style-fidelity-check", "design-composition-analysis", "design-composition-json-repair") else ""
    model = normalize_text_model(body.get("model") or task_default_model or env.get("BABYLON_MODEL") or "kimi-k2-thinking")
    reference_images = [
        item for item in body.get("referenceImages", [])
        if isinstance(item, str) and item.startswith(("data:image/", "http://", "https://"))
    ][:REFERENCE_IMAGE_LIMIT] if task in ("style-analysis", "reference-evidence-analysis", "ui-asset-analysis", "component-baseline-analysis", "ui-asset-style-fidelity-check") else []
    user_content = (
        [{"type": "text", "text": prompt}]
        + [{"type": "image_url", "image_url": {"url": item}} for item in reference_images]
    ) if reference_images else prompt
    payload = {
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        "stream": False,
        "max_completion_tokens": int(env.get("BABYLON_MAX_TOKENS") or "9000"),
        "client_type": "game_ux_board",
        "extra_metadata": {
            "prompt": {
                "game-design": "Generate game design document",
                "visual-analysis": "Analyze editable interaction SVG",
                "style-analysis": "Analyze style reference keywords",
                "style-analysis-json-repair": "Repair style analysis JSON",
                "reference-evidence-analysis": "Extract per-reference style evidence",
                "total-asset-analysis": "Analyze total asset visual system",
                "total-asset-json-repair": "Repair total asset analysis JSON",
                "outline-normalization": "Normalize gameplay outline into fixed 9-field JSON",
                "outline-normalization-json-repair": "Repair normalized outline JSON",
                "ui-asset-analysis": "Analyze UI asset sheet",
                "ui-asset-json-repair": "Repair UI asset analysis JSON",
                "component-baseline-analysis": "Analyze UI asset sheet component baselines",
                "ui-asset-style-fidelity-check": "Check UI asset style fidelity against references",
                "design-composition-analysis": "Analyze current screen design composition",
                "design-composition-json-repair": "Repair design composition JSON",
            }.get(task, "Generate game UX interaction plan"),
            "source": "game_ux_board_local_text",
        },
    }
    if model.startswith("gpt-"):
        payload["reasoning_effort"] = env.get("BABYLON_REASONING_EFFORT") or "high"

    request_body = json_bytes({
        "model": model,
        "payload": payload,
    })

    request = urllib.request.Request(
        BABYLON_URL,
        data=request_body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
            "X-Client-Type": "game_ux_board",
        },
        method="POST",
    )

    try:
        with open_babylon_request(request, timeout_seconds) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        suggestion = " This is retryable; switch to GPT 5.2 or Kimi K2 and retry." if model == "gpt-5.4" else ""
        raise RuntimeError(f"{format_babylon_text_http_error(error.code, details)}{suggestion}") from error
    except (TimeoutError, socket.timeout) as error:
        raise RuntimeError(f"Babylon text request timed out after {timeout_seconds} seconds.") from error
    except urllib.error.URLError as error:
        raise RuntimeError(format_babylon_network_error("text", error)) from error

    content = extract_babylon_text(data).strip()
    if not content:
        suggestion = " Please switch to GPT 5.2 or Kimi K2 and retry." if model == "gpt-5.4" else ""
        raise RuntimeError(f"Babylon returned empty content for {model}.{suggestion}")

    return {
        "provider": "babylon-local",
        "model": model,
        "task": task,
        "content": content,
        "plan": content,
    }


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        data = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_binary(self, status, data, content_type, filename=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        if filename:
            self.send_header("Content-Disposition", content_disposition_filename(filename))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/export-pdf":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length).decode("utf-8")
                body = json.loads(raw or "{}")
                filename, data = export_pdf_from_html(body)
                self.send_binary(200, data, "application/pdf", filename)
            except Exception as error:
                self.send_json(500, {"error": str(error)})
            return

        if parsed.path == "/api/generate-design":
            request_id = ""
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length).decode("utf-8")
                body = json.loads(raw or "{}")
                request_id = sanitize_request_id(body.get("requestId"))
                request_info = {
                    "model": body.get("model") or "",
                    "referenceCount": len(body.get("referenceImages") or []) if isinstance(body.get("referenceImages"), list) else 0,
                    "promptLength": len(str(body.get("prompt") or "")),
                }
                if request_id:
                    record_design_request_stage(request_id, "received", "本地服务已收到", **request_info)
                else:
                    log_design_request_without_id("received", **request_info)
                self.send_json(200, call_babylon_design(body))
            except BabylonDesignError as error:
                error_info = {
                    "model": error.payload.get("model") or "",
                    "durationMs": error.payload.get("durationMs") or 0,
                    "rawStatus": error.payload.get("rawStatus") or "",
                    "code": error.payload.get("code") or "",
                    "error": error.payload.get("error") or str(error),
                }
                if request_id:
                    record_design_request_stage(request_id, "failed", "生图请求失败", **error_info)
                else:
                    log_design_request_without_id("failed", **error_info)
                self.send_json(500, error.payload)
            except Exception as error:
                if request_id:
                    record_design_request_stage(request_id, "failed", "本地服务处理失败", error=str(error))
                else:
                    log_design_request_without_id("failed", error=str(error))
                self.send_json(500, {"error": str(error), "requestId": request_id})
            return

        if parsed.path == "/api/generate-plan":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length).decode("utf-8")
                body = json.loads(raw or "{}")
                self.send_json(200, call_babylon_text(body))
            except Exception as error:
                self.send_json(500, {"error": str(error)})
            return

        if parsed.path == "/api/ui-chaitu":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length).decode("utf-8")
                body = json.loads(raw or "{}")
                self.send_json(200, call_ui_chaitu(body))
            except Exception as error:
                self.send_json(500, {"error": str(error)})
            return

        if parsed.path == "/api/ui-chaitu-refine-object":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length).decode("utf-8")
                body = json.loads(raw or "{}")
                self.send_json(200, call_ui_chaitu_object_refine(body))
            except Exception as error:
                self.send_json(500, {"error": str(error)})
            return

        if parsed.path == "/api/resolve-image-reference":
            try:
                env = read_env_file()
                token = env.get("BABYLON_JWT_TOKEN") or os.environ.get("BABYLON_JWT_TOKEN")
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length).decode("utf-8")
                body = json.loads(raw or "{}")
                image_url = body.get("imageUrl") or body.get("url")
                timeout_seconds = env_int(env, "BABYLON_IMAGE_TIMEOUT_SECONDS", DEFAULT_IMAGE_TIMEOUT_SECONDS)
                self.send_json(200, {"dataUrl": download_image_as_data_url(image_url, timeout_seconds, token)})
            except Exception as error:
                self.send_json(500, {"error": str(error)})
            return

        self.send_json(404, {"error": "Not found"})

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if path in ("/api/health", "/api/status"):
            env = read_env_file()
            token = env.get("BABYLON_JWT_TOKEN") or os.environ.get("BABYLON_JWT_TOKEN")
            self.send_json(200, {
                "ok": True,
                "service": "python",
                "planApiEnabled": True,
                "designApiEnabled": True,
                "pdfExportEnabled": True,
                "tokenConfigured": bool(token),
            })
            return
        if path == "/api/design-request-status":
            query = parse_qs(parsed.query or "")
            request_id = (query.get("requestId") or [""])[0]
            self.send_json(200, get_design_request_status(request_id))
            return
        if path in ("", "/"):
            path = "/index.html"

        target = (ROOT / path.lstrip("/")).resolve()
        if not str(target).startswith(str(ROOT)) or not target.exists() or not target.is_file():
            self.send_json(404, {"error": "File not found"})
            return

        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        print("%s - %s" % (self.address_string(), format % args))


if __name__ == "__main__":
    server = ThreadingHTTPServer(("localhost", PORT), Handler)
    print(f"游戏设计工作台 / Game Design Workspace local server is running: http://localhost:{PORT}")
    if CLEARED_PROXY_ENV_KEYS:
        print(f"Ignored proxy environment variables: {', '.join(CLEARED_PROXY_ENV_KEYS)}")
    print("Press Ctrl+C to stop.")
    server.serve_forever()
