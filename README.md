# 🌀 Sticker Converter Telegram Bot (TGS ↔ Lottie)

This Telegram bot converts **Telegram animated stickers (.tgs)**, **Lottie animations (.json / .lottie)**, and simple **SVG files**:

- **TGS → Lottie** (`.lottie` v2)
- **TGS → JSON** (Lottie JSON)
- **Lottie / JSON → TGS** (Telegram animated sticker)
- **SVG → TGS** (simple vector shapes)

Perfect for designers, animators, and developers working with Lottie animations.

Working bot: https://t.me/Sticker2LottieBot

---

## 📦 Features

- ✅ Convert **TGS → `.lottie` (v2)**
- ✅ Convert **TGS → `.json` (Lottie JSON)**
- ✅ Convert **`.lottie` / `.json` → TGS**
- ✅ Convert simple **`.svg` → TGS**
- ✅ Auto-detect the conversion direction without a mode-selection step
- ✅ Remember the selected TGS output format across restarts
- ✅ Offer one-tap auto-fix for canvas size, duration, FPS, and JSON size
- ✅ Create a personal sticker pack and add generated stickers to it
- ✅ Download a full sticker pack as originals, JSON, or Lottie files
- ✅ Russian and English interface
- ✅ Referral deep links and post-conversion share actions
- ✅ Voluntary support through Telegram Stars or a permanently visible TON wallet
- ✅ Persistent **My Studio** history with favorites and one-tap re-downloads
- ✅ Personal inline gallery for sending recent results to any chat
- ✅ Sticker Doctor for TGS/Lottie/SVG files and full sticker packs
- ✅ Animated sticker pack builder with ordering, emoji editing, cover selection, and publishing
- ✅ Return unsupported sticker formats like `.webm` / `.webp` without conversion
- ✅ Product-funnel events, conversion outcomes, users, and settings in SQLite
- ✅ Admin stats via `/stats`
- ✅ Admin user list via `/users`
- ✅ Batched broadcast via `/broadcast` as reply

---

## 🚀 How to Use

Send an animated sticker, `.json`, `.lottie`, or `.svg` file right away. The bot detects the direction automatically.

Use `/convert` or `/settings` to choose how animated `.tgs` stickers should be exported:

- **TGS → Lottie**
- **TGS → JSON**

### ✅ Mode: TGS → Lottie / JSON

1. Send an animated sticker
2. On first use, choose `.lottie` or `.json`
3. Get the result as a file 🎉

The selected export format is persisted in SQLite, so it survives bot restarts.

If you send a video or static sticker (`.webm` / `.webp`), the bot will return the original file without trying to convert it to Lottie.

### ✅ Mode: Lottie / JSON → TGS

1. Send a **Lottie file** (`.json` or `.lottie`)
2. Get the **`.tgs` sticker file** 🎉

No pre-selection is required for `.json` / `.lottie` files.

After a successful conversion, tap **Add to my sticker pack**. The bot creates and manages a personal animated sticker pack for the user.

The post-conversion support card and `/support` command offer 50, 100, or 250 Telegram Stars and keep the TON wallet visible. A Stars payment is recorded only after Telegram sends a successful payment confirmation. Use `/paysupport` if a payment needs assistance.

If the animation violates Telegram limits, the bot sends the generated TGS as a file and offers **Fix automatically**. Auto-fix can resize the canvas, reduce FPS, shorten the animation to three seconds, and compact JSON. Raster image assets still require manual vectorization.

### ✅ Mode: SVG → TGS

1. Send a simple **SVG file** (`.svg`)
2. Get a generated **`.tgs` sticker file** 🎉

Supported SVG elements: `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, and `polygon`.
Advanced SVG features like text, filters, masks, embedded images, gradients, and transforms are not fully supported.

### ✅ My Studio and inline gallery

- `/my` opens saved conversion results. New results are persisted in SQLite and can be favorited or sent again without re-uploading.
- Tap **Send to this chat** or type `@YourBotUsername` in any chat to open the personal inline gallery.
- Enable inline mode once in `@BotFather` with `/setinline`. Enable chosen-result feedback with `/setinlinefeedback` to measure actual sends.

### ✅ Sticker Doctor

1. Send `/doctor`.
2. Send an animated sticker, `.tgs`, `.json`, `.lottie`, `.svg`, or a sticker pack link.
3. Receive a compatibility score, file metrics, limit violations, and an auto-fix button when applicable.

### ✅ Sticker pack builder

1. Convert files into Telegram-ready animated stickers.
2. Open `/my` and add results to the builder.
3. Open `/pack_builder` to reorder stickers, edit emoji, and choose the cover by moving a sticker to the first position.
4. Publish the pack after entering a title. Builder contents remain in SQLite until publication or manual clearing.

### ✅ Download sticker pack

1. Send:
   ```
   /download_pack
   ```
2. Choose originals, JSON, or Lottie output
3. Send the sticker pack short name or link:
   - `TelegramAnimals`
   - `https://t.me/addstickers/TelegramAnimals`
4. The bot will send a ZIP archive. JSON/Lottie modes convert animated TGS stickers and report skipped static/video stickers.

---

## 🛠️ Installation & Setup

> ⚠️ Only one parameter is required: `BOT_TOKEN`

### 1. Clone the repository

```bash
git clone https://github.com/straystreyk/Sticker2LottieBot
cd Sticker2LottieBot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a `.env` file

```env
BOT_TOKEN=your_bot_token_here
DB_PATH=./data/sticker2lottie.sqlite
ADMIN_USER_IDS=123456789
DONATION_TON_ADDRESS=your_ton_address
BOT_STARTUP_TIMEOUT_MS=15000
```

### 4. Run the bot

```bash
npm run start
```

### Startup diagnostics

A healthy long-polling startup prints these events:

```text
startup.begin
telegram.authenticated  # includes the bot ID and @username
commands.registered
telegram.webhook_status
bot.started
```

Every incoming update then prints `update.received` and `update.processed` without logging message text or file contents. Handler failures are printed as `update.failed` and do not silently stop polling.

- `BOT_TOKEN is empty` means the variable was not loaded.
- `401 Unauthorized` means the token is invalid or was revoked.
- `409 Conflict` usually means another process is polling with the same token.
- `Telegram getMe timed out` means DNS/HTTPS access to `api.telegram.org:443` is blocked or unavailable.
- `npm start` reads `.env`; Docker Compose reads `.compose.env` from `docker-compose.yml`.

---

## 🐳 Docker Setup

### 1. Create a `.compose.env` file

```env
BOT_TOKEN=your_bot_token_here
DB_PATH=/data/sticker2lottie.sqlite
ADMIN_USER_IDS=123456789
DONATION_TON_ADDRESS=your_ton_address
BOT_STARTUP_TIMEOUT_MS=15000
```

### 2. Run container

```bash
docker-compose up -d
```

SQLite database will be stored on the host in `./data`, because Docker mounts it into `/data` inside the container.

The Docker image installs `python-lottie` for SVG → TGS conversion. To test SVG conversion inside the built image without Telegram:

```bash
docker run --rm \
  -v "$PWD":/work \
  sticker2lottiebot:latest \
  node dist/scripts/convertSvgFile.js /work/example.svg /tmp/example.tgs
```

## 📊 Stats and SQLite

- `/stats` is available only to Telegram user IDs listed in `ADMIN_USER_IDS`
- `/users` shows users 20 at a time with inline pagination
- `/broadcast` works when admin replies to a message and sends it to opted-in users in batches of 50
- users are upserted automatically on every incoming update
- every conversion is logged with source format, target format, outcome, and timestamp
- `product_events` stores onboarding, file, conversion, auto-fix, referral, and sticker-pack funnel events
- public command menus do not expose admin-only commands

### Inspect SQLite on a VPS

If the bot runs with Docker Compose, the database file will usually be here on the host:

```bash
./data/sticker2lottie.sqlite
```

Useful commands:

```bash
sqlite3 ./data/sticker2lottie.sqlite "select count(*) from users;"
sqlite3 ./data/sticker2lottie.sqlite "select count(*) from conversion_logs;"
sqlite3 ./data/sticker2lottie.sqlite "select telegram_user_id, username, conversions_count from users order by conversions_count desc limit 10;"
sqlite3 ./data/sticker2lottie.sqlite "select source_type, target_type, success, created_at from conversion_logs order by id desc limit 20;"
```

If `sqlite3` is not installed on the VPS:

```bash
apk add sqlite
sqlite3 ./data/sticker2lottie.sqlite
```

or install `sqlite3` on the host once and query the mounted file directly. The runtime container itself does not include the `sqlite3` CLI by default.

---

## 📫 Author

Made with ❤️  
Author: [@MasterSaya](https://t.me/MasterSaya)
