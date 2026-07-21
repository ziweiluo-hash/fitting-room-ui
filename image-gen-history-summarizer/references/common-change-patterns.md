# Common Change Patterns

Use these patterns to explain likely iteration logic when marked as `推断`.

## 1. 主体明确化

Typical signs:

- Added role, age, clothing, hairstyle, or object details
- The later image has a clearer focal subject

Likely intent:

- Reduce ambiguity in the first pass
- Prevent the model from averaging multiple concepts

## 2. 风格收敛

Typical signs:

- Added words such as cinematic, editorial, anime, watercolor, hyperrealistic
- Later images feel more stylistically consistent

Likely intent:

- Stop the output from looking generic
- Align rendering quality with a target reference taste

## 3. 构图修正

Typical signs:

- Subject becomes more centered, cleaner, or better framed
- Background clutter is reduced
- Camera distance or angle changes

Likely intent:

- Improve readability and focal hierarchy
- Make the output more usable as a cover, poster, avatar, or key visual

## 4. 细节增强

Typical signs:

- Clothing, props, texture, material, and environment become richer
- The image gains polish without changing concept

Likely intent:

- Move from concept validation to production polish

## 5. 文字与符号修补

Typical signs:

- Added requests around typography, label cleanup, or readable signage
- Text regions become simpler or more controlled

Likely intent:

- Reduce garbled AI-generated text
- Focus the model on fewer text-bearing regions

## 6. 负面词补充

Typical signs:

- New negative prompts appear
- Extra limbs, clutter, blur, watermark, bad hands, or deformation decrease

Likely intent:

- Remove recurring failure modes after the first drafts

## 7. 氛围与光影调整

Typical signs:

- Palette becomes warmer, colder, moodier, cleaner, or more dramatic
- Contrast and lighting become more intentional

Likely intent:

- Strengthen emotional tone and visual identity
