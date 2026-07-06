# Graph Report - Sticker2LottieBot  (2026-07-06)

## Corpus Check
- 31 files · ~16,524 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 240 nodes · 433 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b4e4034`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `svgToLottie()` - 22 edges
2. `/graphify` - 14 edges
3. `What You Must Do When Invoked` - 14 edges
4. `lottieFileToTgsSticker()` - 12 edges
5. `svgFileToTgsSticker()` - 12 edges
6. `ConvertFlowStore` - 12 edges
7. `compilerOptions` - 11 edges
8. `sendDonationPrompt()` - 11 edges
9. `downloadStickerSet()` - 10 edges
10. `isAdmin()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `lottieFileToTgsSticker()` --calls--> `sendDonationPrompt()`  [EXTRACTED]
  src/logic/lottieFileToTgsSticker.ts → src/logic/sendDonationPrompt.ts
- `svgFileToTgsSticker()` --calls--> `sendDonationPrompt()`  [EXTRACTED]
  src/logic/svgFileToTgsSticker.ts → src/logic/sendDonationPrompt.ts
- `lottieFileToTgsSticker()` --calls--> `logConversion()`  [EXTRACTED]
  src/logic/lottieFileToTgsSticker.ts → src/db/database.ts
- `documentHandler()` --calls--> `svgFileToTgsSticker()`  [EXTRACTED]
  src/handlers/documentHandler.ts → src/logic/svgFileToTgsSticker.ts
- `svgFileToTgsSticker()` --calls--> `logConversion()`  [EXTRACTED]
  src/logic/svgFileToTgsSticker.ts → src/db/database.ts

## Communities (13 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (29): usersCBQ(), broadcastCommand(), sleep(), statsCommand(), buildUsersKeyboard(), buildUsersPageText(), usersCommand(), allUserIdsStmt (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (20): downloadPackCommand(), getUserConversionPreferences(), logConversion(), stickerHandler(), textHandler(), downloadStickerSet(), extractSetName(), getStickerExtension() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (22): author, dependencies, axios, dotenv, file-type, grammy, jszip, tsx (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (9): formatCBQ(), modeCBQ(), convertCommand(), setUserDefaultOutputFormat(), setUserMode(), ConvertFlowStore, ConvertMode, ConvertState (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (18): 1. Clone the repository, 1. Create a `.compose.env` file, 2. Install dependencies, 2. Run container, 3. Create a `.env` file, 4. Run the bot, 📫 Author, 🐳 Docker Setup (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (17): Part A - Structural extraction for code files, Part B - Semantic extraction (parallel subagents), Part C - Merge AST + semantic into final extraction, Step 1 - Ensure graphify is installed, Step 2.5 - Transcribe video / audio files (only if video files detected), Step 2 - Detect files, Step 3 - Extract entities and relationships, Step 4 - Build graph, cluster, analyze, generate outputs (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (44): addCubic(), addLine(), arcToCubics(), attrsWithClasses(), buildBinaryCaption(), buildCaption(), collectShapeDefinitions(), convertSvgWithBinary() (+36 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (12): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, skipLibCheck (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.27
Nodes (11): documentHandler(), buildCaption(), CompatibilityCheck, downloadAsBuffer(), extractLottieJson(), getTelegramFileUrl(), inspectTelegramCompatibility(), lottieFileToTgsSticker() (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.70
Nodes (4): execFileAsync, fileExists(), findOnPath(), resolveLottieConvertBin()

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (13): For --cluster-only, For git commit hook, For /graphify add, For /graphify explain, For /graphify path, For /graphify query, For native CLAUDE.md integration, For --update (incremental re-extraction) (+5 more)

## Knowledge Gaps
- **99 isolated node(s):** `name`, `version`, `type`, `description`, `author` (+94 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ConvertFlowStore` connect `Community 3` to `Community 8`, `Community 1`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `sendDonationPrompt()` connect `Community 1` to `Community 8`, `Community 6`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `logConversion()` connect `Community 1` to `Community 8`, `Community 0`, `Community 6`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `name`, `version`, `type` to the rest of the system?**
  _99 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10099573257467995 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._