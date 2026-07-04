import { Telegraf } from "telegraf";
import * as fs from "fs";

import { message } from "telegraf/filters";
import { getTotal, updateTotal } from "./utils";
import { BOT_TOKEN, FILE_PATH, USER_ID_1, USER_ID_2 } from "./constants";

if (!BOT_TOKEN) {
  console.error("Invalid BOT_TOKEN");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.use(async (ctx, next) => {
  const userId = ctx.from?.id.toString();

  if (userId && [USER_ID_1, USER_ID_2].includes(userId)) {
    return next();
  }

  if (ctx.chat?.type === "private") {
    await ctx.reply("No access");
  }
});

bot.command("total", async (ctx) => {
  const totalResult = getTotal(FILE_PATH).message;
  await ctx.reply(`${totalResult}`);
});

bot.command("reset", async (ctx) => {
  fs.writeFileSync(FILE_PATH, "0", "utf-8");
  await ctx.reply("🧹 Счетчик сброшен.");
});

bot.on(message("text"), async (ctx) => {
  const cleanText = ctx.message.text.replace(/\s+/g, "").replace(",", ".");
  const amount = parseFloat(cleanText);

  if (!isNaN(amount) && isFinite(amount)) {
    const newTotalResult = updateTotal(amount, FILE_PATH).message;

    if (amount < 0) {
      await ctx.reply(`➖ Вычтено: ${Math.abs(amount)}\n${newTotalResult}`);
    } else {
      await ctx.reply(`➕ Добавлено: ${amount}\n${newTotalResult}`);
    }
  }
});

bot.launch().then(() => {
  console.log("🚀 Bot works!");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
