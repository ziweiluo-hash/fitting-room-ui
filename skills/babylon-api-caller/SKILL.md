---
name: babylon-api-caller
description: Construct, debug, and validate requests to the Babylon unified AI API, including `Babylon`, `bbl`, `/ai/babylon/dock`, `/ai/babylon/agent/dock`, `/ai/babylon/files/upload`, gateway-compatible chat endpoints, model selection, authentication, multipart or base64 file transfer, async task polling, and Babylon-specific error handling. Use when Codex needs to call Babylon on a user's behalf, convert a product requirement into a Babylon request, troubleshoot Babylon payloads or headers, choose Babylon-supported models, handle chat-attached images correctly, or explain how to use Babylon for chat, image, video, 3D, upload, and agent workflows.
---

# Babylon API Caller

## Overview

Use this skill to turn a user request into a correct Babylon API call with the right endpoint, model, payload shape, authentication method, upload path, and polling behavior.

Common triggers include requests mentioning `Babylon`, `bbl`, `dock`, `agent-dock`, `files/upload`, `chat/completions`, `task_id`, polling, multipart upload, image attachment handling, or Babylon model routing.

Read [references/babylon-service-api.md](references/babylon-service-api.md) when you need model tables, parameter details, endpoint coverage, or exact Babylon-specific behavior.

## Workflow

1. Identify the job type first: chat, image generation, image edit, video, 3D, upload, polling, or agent orchestration.
2. Choose the endpoint:
   - Use `/ai/babylon/dock` for direct model calls.
   - Use `/ai/babylon/agent/dock` when the user wants Babylon Agent planning, prompt optimization, or multi-step orchestration.
   - Use `/v1/chat/completions`, `/v1/messages`, or `/v1/models` only when the caller explicitly needs gateway-compatible routes.
3. Choose the model based on the task, not habit. Prefer the reference file for current Babylon-supported names and aliases.
4. Build auth correctly:
   - Prefer `Authorization: Bearer <token>`.
   - Accept `Cookie: jwt_token=<token>` when that is how the caller authenticates.
   - If operating inside a local Babylon or infohub flow, remember runtime may source JWT from `.taco_env`.
5. Decide how files must travel:
   - Use multipart when the runtime can read the file path directly.
   - Use base64 when bytes are already loaded.
   - Use `/ai/babylon/files/upload` when the flow needs a reusable Babylon-hosted URL.
6. Preserve Babylon-specific metadata when useful, especially `chat_id`, `user_timestamp`, and `X-Client-Type`.
7. If the chosen backend is asynchronous, return or implement the polling step instead of pretending the job is complete.

## Core Rules

- Treat "the assistant can see the image in chat" and "Babylon has the file" as different states. Upload or attach the file explicitly before referencing it in Babylon payloads.
- Never tell the user Babylon can read arbitrary local paths on their machine. If a local file must be sent, read it locally and pass it via multipart, base64, or the upload endpoint.
- Normalize model names when needed, but preserve the canonical model name in examples and final code.
- Pass `chat_id` whenever the request should persist history or attach to an ongoing conversation.
- Use `tool_calls`, `image_generation`, `web_search`, and `code_execution` payload conventions exactly as Babylon expects for the chosen backend.
- For real-time facts such as current prices, news, or weather, ensure the calling workflow uses Babylon's live web-search capability instead of relying on stale model knowledge.

## Task Patterns

### Chat

Build `payload.messages` carefully, choose a Babylon-supported chat model, and include optional capabilities such as tools, response format, reasoning effort, native web search, or code execution only when the target backend supports them.

### Image Generation Or Editing

Pick a supported image model, then decide whether the request is text-to-image, single-image edit, or multi-image edit. Use multipart or base64 for input images and check whether the job is synchronous or polling-based.

### Video Or 3D

Expect asynchronous submission. Return `task_id`, identify the correct `backend` for polling, and document sensible retry intervals and timeouts using the reference guide.

### File Uploads

Use `/ai/babylon/files/upload` when the request needs a Babylon URL, especially for repeated reuse or for fields such as `mesh` that require Babylon-hosted files.

### Agent Mode

Use `/ai/babylon/agent/dock` when the user wants Babylon to infer intent, optimize prompts, or run a multi-step pipeline. Read the reference guide before using `smart_level`, SSE event types, or agent personas.

## Reference Guide Map

- Read the model routing section and capability tables for model selection.
- Read the general request structure section for JSON vs multipart payload construction.
- Read the chat-image handling section before working with any chat-provided image.
- Read the async task section before implementing polling or timeout behavior.
- Read the relevant media section for backend-specific parameters: chat, image, video, 3D, enhance, or RMBG.

## Output Expectations

- Produce runnable request examples, not vague advice.
- Call out required headers, exact endpoints, and payload fields.
- Warn explicitly when a task requires upload, polling, or a permission the caller may not have.
- Keep answers implementation-oriented and Babylon-specific.
