# Graph Report - Sticker2LottieBot  (2026-09-27)

## Corpus Check
- 48 files · ~22,815 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 343 nodes · 821 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `38adea4d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- database.ts
- downloadStickerSet.ts
- ConvertFlowStore
- index.ts
- starsPaymentHandler.ts
- svgFileToTgsSticker.ts
- lottieFileToTgsSticker.ts
- package.json
- /graphify
- 🌀 Sticker Converter Telegram Bot (TGS ↔ Lottie)
- compilerOptions
- convertSvgFile.ts
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `tr()` - 53 edges
2. `logProductEvent()` - 40 edges
3. `startServer()` - 36 edges
4. `svgToLottie()` - 22 edges
5. `downloadStickerSet()` - 15 edges
6. `lottieFileToTgsSticker()` - 15 edges
7. `svgFileToTgsSticker()` - 15 edges
8. `/graphify` - 14 edges
9. `What You Must Do When Invoked` - 14 edges
10. `sendDonationPromptSafely()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `startServer()` --indirect_call--> `autoFixCBQ()`  [INFERRED]
  src/index.ts → src/cbq/autoFixCBQ.ts
- `startServer()` --indirect_call--> `starsSupportCBQ()`  [INFERRED]
  src/index.ts → src/cbq/starsSupportCBQ.ts
- `startServer()` --indirect_call--> `usersCBQ()`  [INFERRED]
  src/index.ts → src/cbq/usersCBQ.ts
- `startServer()` --indirect_call--> `broadcastCommand()`  [INFERRED]
  src/index.ts → src/commands/broadcast.ts
- `startServer()` --indirect_call--> `statsCommand()`  [INFERRED]
  src/index.ts → src/commands/stats.ts

## Import Cycles
- None detected.

## Communities (13 total, 2 thin omitted)

### Community 0 - "database.ts"
Cohesion: 0.07
Nodes (38): isAdmin(), usersCBQ(), broadcastCommand(), sleep(), statsCommand(), buildUsersKeyboard(), buildUsersPageText(), formatUserLabel() (+30 more)

### Community 1 - "downloadStickerSet.ts"
Cohesion: 0.24
Nodes (14): logConversion(), downloadStickerSet(), extractSetName(), getStickerExtension(), jsonToLottieBuffer(), shouldReportProgress(), downloadTelegramFile(), getTelegramFileBuffer() (+6 more)

### Community 3 - "index.ts"
Cohesion: 0.12
Nodes (42): downloadPackChooseCBQ(), downloadPackFormatCBQ(), formatCBQ(), modeCBQ(), onboardingCBQ(), settingsFormatCBQ(), settingsLanguageCBQ(), settingsNotificationsCBQ() (+34 more)

### Community 4 - "starsPaymentHandler.ts"
Cohesion: 0.15
Nodes (22): bot, botToken, setBotCommands(), starsSupportCBQ(), adminUserIds, CONFIG, configuredStartupTimeout, recordSupportPayment() (+14 more)

### Community 8 - "svgFileToTgsSticker.ts"
Cohesion: 0.10
Nodes (45): addCubic(), addLine(), applyMatrix(), arcToCubics(), attrsWithClasses(), buildBinaryCaption(), buildCaption(), collectShapeDefinitions() (+37 more)

### Community 12 - "lottieFileToTgsSticker.ts"
Cohesion: 0.12
Nodes (21): autoFixCBQ(), demoLottie, autoFixLottieJson(), buildCaption(), CompatibilityCheck, downloadAsBuffer(), extractLottieJson(), getTelegramFileUrl() (+13 more)

### Community 13 - "package.json"
Cohesion: 0.06
Nodes (34): abort-controller, axios, dotenv, file-type, grammy, jszip, author, dependencies (+26 more)

### Community 14 - "/graphify"
Cohesion: 0.06
Nodes (30): For --cluster-only, For git commit hook, For /graphify add, For /graphify explain, For /graphify path, For /graphify query, For native CLAUDE.md integration, For --update (incremental re-extraction) (+22 more)

### Community 15 - "🌀 Sticker Converter Telegram Bot (TGS ↔ Lottie)"
Cohesion: 0.10
Nodes (19): 1. Clone the repository, 1. Create a `.compose.env` file, 2. Install dependencies, 2. Run container, 3. Create a `.env` file, 4. Run the bot, 📫 Author, 🐳 Docker Setup (+11 more)

### Community 16 - "compilerOptions"
Cohesion: 0.14
Nodes (13): src/**/*, compilerOptions, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir (+5 more)

### Community 17 - "convertSvgFile.ts"
Cohesion: 0.70
Nodes (4): execFileAsync, fileExists(), findOnPath(), resolveLottieConvertBin()

## Knowledge Gaps
- **122 isolated node(s):** `name`, `version`, `type`, `description`, `author` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `tr()` connect `index.ts` to `svgFileToTgsSticker.ts`, `downloadStickerSet.ts`, `lottieFileToTgsSticker.ts`, `starsPaymentHandler.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `logProductEvent()` connect `index.ts` to `database.ts`, `downloadStickerSet.ts`, `starsPaymentHandler.ts`, `svgFileToTgsSticker.ts`, `lottieFileToTgsSticker.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `ConvertFlowStore` connect `ConvertFlowStore` to `index.ts`, `lottieFileToTgsSticker.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `startServer()` (e.g. with `autoFixCBQ()` and `downloadPackChooseCBQ()`) actually correct?**
  _`startServer()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `type` to the rest of the system?**
  _122 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `database.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06868686868686869 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11736237144585603 - nodes in this community are weakly interconnected._