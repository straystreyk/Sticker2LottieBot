# 🌀 TGS to LOTTIE/JSON Telegram Bot

This Telegram bot converts **animated Telegram stickers (.tgs)** into:
- `.lottie` (v2)
- `.json` (Lottie JSON)

Perfect for designers, animators, and developers working with Lottie animations.
Working bot here https://t.me/Sticker2LottieBot

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

📌 Example:

```env
BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

### 4. Run the bot

```bash
npm run start
```
---

## 🐳 Docker Setup

You can also run the bot inside a Docker container using docker-compose.

### 1. Create a .compose.env file with your bot token:

```env
BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```
Make sure .compose.env is in the same directory as your docker-compose.yml.

### 2. To build and run the container:

```
docker-compose up -d
```

---

## 📫 Author

Made with ❤️  
Author: [@MasterSaya](https://t.me/MasterSaya)
