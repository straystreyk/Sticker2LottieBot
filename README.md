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
```

### 2. Run container

```bash
docker-compose up -d
```

---

## 📫 Author

Made with ❤️  
Author: [@MasterSaya](https://t.me/MasterSaya)
