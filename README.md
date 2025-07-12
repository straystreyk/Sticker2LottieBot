# 🌀 TGS to LOTTIE/JSON Telegram Bot

This Telegram bot converts **animated Telegram stickers (.tgs)** into:
- `.lottie` (v2)
- `.json` (Lottie JSON)

Perfect for designers, animators, and developers working with Lottie animations.

---

## 📦 Features

- ✅ Choose export format: `.lottie` or `.json`
---

## 🚀 How to Use

1. Send the command:
   ```
   /convert
   ```

2. Choose the desired format (`.lottie` or `.json`) via buttons.

3. Send an **animated sticker** (in `.tgs` format).

4. Get the result as a file 🎉

---

## 🛠️ Installation & Setup

> ⚠️ Only one parameter is required: `BOT_TOKEN`

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/tgs-converter-bot.git
cd tgs-converter-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a `.env` file

```env
BOT_TOKEN=your_bot_token_here
```

📌 Example:

```env
BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

### 4. Run the bot

```bash
npm run start
```

---

## 📄 Dependencies

- [`grammy`](https://grammy.dev) — Telegram Bot API library
- [`file-type`](https://www.npmjs.com/package/file-type) — file type detection
- [`axios`](https://axios-http.com) — for downloading files from Telegram
- [`jszip`](https://stuk.github.io/jszip/) — to generate `.lottie` ZIP files
- `zlib` (built-in in Node.js) — for unpacking `.tgs` files

---

## 📫 Author

Made with ❤️  
Author: [@MasterSaya](https://t.me/MasterSaya)
