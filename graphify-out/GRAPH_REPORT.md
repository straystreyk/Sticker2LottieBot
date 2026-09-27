# Graph Report - Sticker2LottieBot  (2026-09-27)

## Corpus Check
- 61 files · ~27,764 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 437 nodes · 1130 edges · 18 communities (16 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `38adea4d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- database.ts
- studioCBQ.ts
- stickerToFile.ts
- index.ts
- starsPaymentHandler.ts
- publishStickerPack.ts
- users.ts
- Q: Какие новые продуктовые функции лучше всего повысят конверсию, вовлечённость и удержание Sticker2LottieBot?
- svgFileToTgsSticker.ts
- broadcast.ts
- stats.ts
- logProductEvent
- package.json
- /graphify
- 🚀 How to Use
- compilerOptions
- convertSvgFile.ts
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `tr()` - 79 edges
2. `logProductEvent()` - 61 edges
3. `startServer()` - 55 edges
4. `svgToLottie()` - 22 edges
5. `downloadStickerSet()` - 16 edges
6. `lottieFileToTgsSticker()` - 16 edges
7. `svgFileToTgsSticker()` - 16 edges
8. `stickerToFile()` - 14 edges
9. `/graphify` - 14 edges
10. `What You Must Do When Invoked` - 14 edges

## Surprising Connections (you probably didn't know these)
- `startServer()` --indirect_call--> `autoFixCBQ()`  [INFERRED]
  src/index.ts → src/cbq/autoFixCBQ.ts
- `startServer()` --indirect_call--> `formatCBQ()`  [INFERRED]
  src/index.ts → src/cbq/formatCBQ.ts
- `startServer()` --indirect_call--> `onboardingCBQ()`  [INFERRED]
  src/index.ts → src/cbq/onboardingCBQ.ts
- `startServer()` --indirect_call--> `starsSupportCBQ()`  [INFERRED]
  src/index.ts → src/cbq/starsSupportCBQ.ts
- `startServer()` --indirect_call--> `studioViewCBQ()`  [INFERRED]
  src/index.ts → src/cbq/studioCBQ.ts

## Import Cycles
- None detected.

## Communities (18 total, 2 thin omitted)

### Community 0 - "database.ts"
Cohesion: 0.05
Nodes (41): addBuilderItemStmt, allUserIdsStmt, builderItemsStmt, builderItemStmt, clearBuilderStmt, ConversionLogInput, ConversionResultInput, conversionResultsCountStmt (+33 more)

### Community 1 - "studioCBQ.ts"
Cohesion: 0.24
Nodes (13): itemKeyboard(), itemText(), studioFavoriteCBQ(), studioViewCBQ(), startCommand(), buildStudioPage(), resultLabel(), STUDIO_PAGE_SIZE (+5 more)

### Community 2 - "stickerToFile.ts"
Cohesion: 0.10
Nodes (13): formatCBQ(), setUserDefaultOutputFormat(), buildCaption(), stickerToFile(), ConvertFlowStore, ConvertMode, ConvertState, Tgs2LottieFormat (+5 more)

### Community 3 - "index.ts"
Cohesion: 0.09
Nodes (53): doctorCancelCBQ(), doctorStartCBQ(), downloadPackChooseCBQ(), downloadPackFormatCBQ(), modeCBQ(), settingsFormatCBQ(), settingsLanguageCBQ(), settingsNotificationsCBQ() (+45 more)

### Community 4 - "starsPaymentHandler.ts"
Cohesion: 0.15
Nodes (22): bot, botToken, setBotCommands(), starsSupportCBQ(), adminUserIds, CONFIG, configuredStartupTimeout, recordSupportPayment() (+14 more)

### Community 5 - "publishStickerPack.ts"
Cohesion: 0.24
Nodes (7): clearStickerPackBuilder(), updateStickerPackBuilderEmoji(), buildStickerSetName(), firstEmoji(), handleStickerPackBuilderText(), StickerPackBuilderPendingInput, StickerPackBuilderStore

### Community 6 - "users.ts"
Cohesion: 0.38
Nodes (8): isAdmin(), usersCBQ(), buildUsersKeyboard(), buildUsersPageText(), formatUserLabel(), usersCommand(), getUsersPage(), StoredUser

### Community 7 - "Q: Какие новые продуктовые функции лучше всего повысят конверсию, вовлечённость и удержание Sticker2LottieBot?"
Cohesion: 0.50
Nodes (3): Answer, Q: Какие новые продуктовые функции лучше всего повысят конверсию, вовлечённость и удержание Sticker2LottieBot?, Source Nodes

### Community 8 - "svgFileToTgsSticker.ts"
Cohesion: 0.10
Nodes (45): addCubic(), addLine(), applyMatrix(), arcToCubics(), attrsWithClasses(), buildBinaryCaption(), buildCaption(), collectShapeDefinitions() (+37 more)

### Community 9 - "broadcast.ts"
Cohesion: 0.83
Nodes (3): broadcastCommand(), sleep(), getAllTelegramUserIds()

### Community 12 - "logProductEvent"
Cohesion: 0.09
Nodes (44): autoFixCBQ(), demoLottie, onboardingCBQ(), logConversion(), logProductEvent(), recordConversionResult(), stickerHandler(), recordSentResult() (+36 more)

### Community 13 - "package.json"
Cohesion: 0.06
Nodes (34): abort-controller, axios, dotenv, file-type, grammy, jszip, author, dependencies (+26 more)

### Community 14 - "/graphify"
Cohesion: 0.06
Nodes (30): For --cluster-only, For git commit hook, For /graphify add, For /graphify explain, For /graphify path, For /graphify query, For native CLAUDE.md integration, For --update (incremental re-extraction) (+22 more)

### Community 15 - "🚀 How to Use"
Cohesion: 0.09
Nodes (22): 1. Clone the repository, 1. Create a `.compose.env` file, 2. Install dependencies, 2. Run container, 3. Create a `.env` file, 4. Run the bot, 📫 Author, 🐳 Docker Setup (+14 more)

### Community 16 - "compilerOptions"
Cohesion: 0.14
Nodes (13): src/**/*, compilerOptions, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir (+5 more)

### Community 17 - "convertSvgFile.ts"
Cohesion: 0.70
Nodes (4): execFileAsync, fileExists(), findOnPath(), resolveLottieConvertBin()

## Knowledge Gaps
- **147 isolated node(s):** `name`, `version`, `type`, `description`, `author` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `tr()` connect `index.ts` to `studioCBQ.ts`, `stickerToFile.ts`, `starsPaymentHandler.ts`, `publishStickerPack.ts`, `svgFileToTgsSticker.ts`, `logProductEvent`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `logProductEvent()` connect `logProductEvent` to `database.ts`, `studioCBQ.ts`, `stickerToFile.ts`, `index.ts`, `starsPaymentHandler.ts`, `publishStickerPack.ts`, `svgFileToTgsSticker.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `ConvertFlowStore` connect `stickerToFile.ts` to `index.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 47 inferred relationships involving `startServer()` (e.g. with `autoFixCBQ()` and `doctorCancelCBQ()`) actually correct?**
  _`startServer()` has 47 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `type` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `database.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `stickerToFile.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0989247311827957 - nodes in this community are weakly interconnected._