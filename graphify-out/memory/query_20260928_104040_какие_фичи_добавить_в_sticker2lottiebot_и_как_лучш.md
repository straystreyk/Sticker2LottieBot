---
type: "analysis"
date: "2026-09-28T10:40:40.700988+00:00"
question: "Какие фичи добавить в Sticker2LottieBot и как лучше продвигать бот с учетом текущей статистики?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["startCommand", "sendResultActions", "inlineQueryHandler", "studioCommand", "diagnoseStickerPack", "publishStickerPack", "setUserStartAttribution"]
---

# Q: Какие фичи добавить в Sticker2LottieBot и как лучше продвигать бот с учетом текущей статистики?

## Answer

The product already has useful retention features and strong repeat behavior: 5748 conversions/478 users is about 12 conversions per user and 159 repeat users is about 33%. The primary bottleneck is distribution and activation measurement, not lack of features. Priorities: fix metrics and failure outcome separation; place a Telegram-native Send to chat inline button directly after every successful conversion; add a deep-linked shareable result so recipients can reopen/copy a result; make Sticker Doctor a one-tap repair flow; then add batch pack conversion and custom emoji pack creation. Promote through targeted Telegram designer, After Effects, Lottie, SVG and sticker-maker communities using unique start source links; publish short before/after demos; build SEO landing pages for SVG to TGS and TGS to JSON; test Telegram Ads only after organic activation is measured. Do not build many more dashboard-like features before current Studio, inline gallery and pack builder adoption is understood.

## Outcome

- Signal: useful

## Source Nodes

- startCommand
- sendResultActions
- inlineQueryHandler
- studioCommand
- diagnoseStickerPack
- publishStickerPack
- setUserStartAttribution