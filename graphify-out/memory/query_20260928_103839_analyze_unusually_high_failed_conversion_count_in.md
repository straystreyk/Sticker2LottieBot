---
type: "analysis"
date: "2026-09-28T10:38:39.546741+00:00"
question: "Analyze unusually high failed conversion count in bot statistics"
contributor: "graphify"
outcome: "useful"
source_nodes: ["getAdminStats", "logConversion", "svgFileToTgsSticker", "lottieFileToTgsSticker"]
---

# Q: Analyze unusually high failed conversion count in bot statistics

## Answer

The Failed metric is inflated: stats count every success=0 row, while conversion flows store success=false for completed_with_warnings and rejected_by_telegram even after delivering the converted TGS as a document. Production outcome and error breakdown is needed to measure hard failures. Report completed sticker, delivered fallback, Telegram rejection, and hard processing failure separately.

## Outcome

- Signal: useful

## Source Nodes

- getAdminStats
- logConversion
- svgFileToTgsSticker
- lottieFileToTgsSticker