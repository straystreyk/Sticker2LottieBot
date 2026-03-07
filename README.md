# 🌀 Sticker Converter Telegram Bot (TGS ↔ Lottie)

This Telegram bot converts **Telegram animated stickers (.tgs)** and **Lottie animations (.json / .lottie)** both ways:

- **TGS → Lottie** (`.lottie` v2)
- **TGS → JSON** (Lottie JSON)
- **Lottie / JSON → TGS** (Telegram animated sticker)

Perfect for designers, animators, and developers working with Lottie animations.

Working bot: https://t.me/Sticker2LottieBot

---

## 📦 Features

- ✅ Convert **TGS → `.lottie` (v2)**
- ✅ Convert **TGS → `.json` (Lottie JSON)**
- ✅ Convert **`.lottie` / `.json` → TGS**
- ✅ Interactive flow via buttons (`/convert`)
- ✅ Persist users and conversion logs in SQLite
- ✅ Admin stats via `/stats`
- ✅ Admin user list via `/users`
- ✅ Batched broadcast via `/broadcast` as reply

---

## 🚀 How to Use

1. Send the command:
   ```
   /convert
   ```

2. Choose what you want to convert:
   - **TGS → Lottie**
   - **Lottie → TGS**

### ✅ Mode: TGS → Lottie / JSON

1. Select **TGS → Lottie**
2. Choose the desired export format (`.lottie` or `.json`)
3. Send an **animated sticker** (`.tgs`)
4. Get the result as a file 🎉

### ✅ Mode: Lottie / JSON → TGS

1. Select **Lottie → TGS**
2. Send a **Lottie file** (`.json` or `.lottie`)
3. Get the **`.tgs` sticker file** 🎉

> Tip: you can add the resulting `.tgs` to a sticker pack using @Stickers.

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
```

### 4. Run the bot

```bash
npm run start
```

---

## 🐳 Docker Setup

### 1. Create a `.compose.env` file

```env
BOT_TOKEN=your_bot_token_here
DB_PATH=/data/sticker2lottie.sqlite
ADMIN_USER_IDS=123456789
```

### 2. Run container

```bash
docker-compose up -d
```

SQLite database will be stored on the host in `./data`, because Docker mounts it into `/data` inside the container.

## 📊 Stats and SQLite

- `/stats` is available only to Telegram user IDs listed in `ADMIN_USER_IDS`
- `/users` shows users 20 at a time with inline pagination
- `/broadcast` works when admin replies to a message and sends it to users in batches of 50
- users are upserted automatically on every incoming update
- every conversion is logged with source format, target format, success/failure, and timestamp

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
