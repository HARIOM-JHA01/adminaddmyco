import TelegramBot from "node-telegram-bot-api";
import User from "../Models/User.js";

// Exported start function will create the bot and register handlers.
export function start() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN is not set; Telegram bot will not start.");
    return;
  }

  // Respect environment flag to enable/disable the Telegram bot.
  // Set `TELEGRAM_BOT_ENABLED=false` or `0` to disable polling.
  const enabledEnv = process.env.TELEGRAM_BOT_ENABLED;
  if (typeof enabledEnv !== "undefined") {
    const normalized = String(enabledEnv).toLowerCase();
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      console.log("Telegram bot disabled via TELEGRAM_BOT_ENABLED flag.");
      return;
    }
  }

  const bot = new TelegramBot(token, { polling: true });

  // Helper function to handle the /start command and username parameter
  const handleStart = async (chatId, username) => {
    try {
      const user = await User.findOne({ username });
      if (user) {
        // Send a quick message and provide a web_app button to open the profile
        await bot.sendMessage(chatId, `Opening profile for ${username}...`);
        await bot.sendMessage(chatId, `View ${username}'s profile`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Open Mini App",
                  web_app: {
                    url: `https://addmy.co/${username}`,
                  },
                },
              ],
            ],
          },
        });
      } else {
        await bot.sendMessage(
          chatId,
          `Sorry, couldn't find a profile for ${username}.`
        );
      }
    } catch (err) {
      console.error("Error handling profile request:", err);
      await bot.sendMessage(
        chatId,
        "Sorry, something went wrong while retrieving the profile."
      );
    }
  };

  // Helper to send a 225-prefixed start link button
  const sendStartLink = async (chatId, startValue) => {
    try {
      const url = `https://addmy.co/225${startValue}`;
      await bot.sendMessage(chatId, `Open this profile:`, {
        reply_markup: {
          inline_keyboard: [[{ text: "View Profile", url }]],
        },
      });
    } catch (err) {
      console.error("Error sending start link:", err);
      await bot.sendMessage(
        chatId,
        "Sorry, something went wrong while sending the link."
      );
    }
  };

  // Handle regular /start command
  bot.onText(/^\/start$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      "Welcome to AddMyCo! Use our mini app to create your Dynamic NameCard and share Profiles to your Friends."
    );
  });

  // Handle /start with username parameter (regular format)
  bot.onText(/\/start ([a-zA-Z0-9_]+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1];
    await handleStart(chatId, username);
  });

  // Handle /start with addmy_ prefix format
  bot.onText(/\/start addmy_([a-zA-Z0-9_]+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1];
    await handleStart(chatId, username);
  });

  // Handle the startapp parameter from Mini App deep links (web_app_data)
  bot.on("message", async (msg) => {
    if (msg.web_app_data && msg.web_app_data.data) {
      try {
        const chatId = msg.chat.id;
        const data = JSON.parse(msg.web_app_data.data);
        if (data.start) {
          // For startapp payloads we send the 225-prefixed link
          await sendStartLink(chatId, data.start);
        }
      } catch (err) {
        console.error("Error processing web app data:", err);
      }
    }
  });

  // Handle /start with URL-encoded JSON payloads like %7B%22start%22%3A%225cf2a7fb%22%7D
  bot.onText(/^\/start (.+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const raw = match[1];
    try {
      const decoded = decodeURIComponent(raw);
      let data;
      try {
        data = JSON.parse(decoded);
      } catch (e) {
        // Not JSON after decode; nothing to do here
        return;
      }
      if (data && data.start) {
        await sendStartLink(chatId, data.start);
      }
    } catch (err) {
      // If decodeURIComponent fails, ignore
      return;
    }
  });

  console.log("Telegram bot is running...");
  bot.on("polling_error", (error) => {
    console.error("Polling error:", error);
  });
}
