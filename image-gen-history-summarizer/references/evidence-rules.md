# Evidence Rules

## Mark As `明确`

Use `明确` only when at least one of the following is true:

- The chat history explicitly states the change
- The screenshot text is readable and clearly shows the prompt or parameter
- The text inside a folder-contained image is readable and clearly shows the prompt or parameter
- The before/after visual difference is direct and unambiguous
- The user explicitly describes the reason for the iteration

## Mark As `推断`

Use `推断` when:

- You are filling a missing round
- Screenshot text is blurred, cropped, or partial
- The motivation for a change is inferred from the visual result
- Several possible iteration orders exist
- You are inferring a likely prompting strategy from the final image alone

## Conflict Handling

When text and image disagree:

1. Report the textual claim
2. Report the visual evidence
3. State the conflict briefly
4. Prefer the more observable claim for image-change descriptions
5. Keep the confidence conservative

## Never Do

- Never claim a hidden parameter was definitely used unless shown
- Never invent exact wording for unreadable prompt text
- Never fabricate missing images, timestamps, or seeds
- Never collapse multiple candidate branches into one path without saying so
