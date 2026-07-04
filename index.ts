import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { Telegraf } from "telegraf";
import * as fs from "fs";

import { message } from "telegraf/filters";
import { getTotal, updateTotal } from "./utils";
import { BOT_TOKEN, FILE_PATH, USER_ID_1, USER_ID_2 } from "./constants";

if (!BOT_TOKEN) {
  throw new Error("Invalid BOT_TOKEN");
}

const bot = new Telegraf(BOT_TOKEN);

bot.use(async (ctx, next) => {
  const userId = ctx.from?.id?.toString() ?? "unknown";
  const chatId = ctx.chat?.id?.toString() ?? "unknown";
  const rawText = (ctx.message as { text?: string } | undefined)?.text;
  const text = typeof rawText === "string" ? rawText : "";
  const command = text.startsWith("/") ? text.split(/\s+/)[0] : "-";
  console.log(`[update] user=${userId} chat=${chatId} command=${command} text=${text || "-"}`);

  await next();
});

bot.use(async (ctx, next) => {
  const userId = ctx.from?.id.toString();
  console.log(`[auth] user=${userId ?? "unknown"}`);

  if (userId && [USER_ID_1, USER_ID_2].includes(userId)) {
    return next();
  }

  if (ctx.chat?.type === "private") {
    await ctx.reply("No access");
  }
});

bot.command("total", async (ctx) => {
  console.log(`[command:total] user=${ctx.from?.id?.toString() ?? "unknown"}`);
  const totalResult = getTotal(FILE_PATH).message;
  await ctx.reply(`${totalResult}`);
});

bot.command("reset", async (ctx) => {
  console.log(`[command:reset] user=${ctx.from?.id?.toString() ?? "unknown"}`);
  fs.writeFileSync(FILE_PATH, "0", "utf-8");
  await ctx.reply("🧹 Счетчик сброшен.");
});

bot.on(message("text"), async (ctx) => {
  console.log(`[message:text] user=${ctx.from?.id?.toString() ?? "unknown"} text=${ctx.message.text}`);

  if (ctx.message.text.startsWith("/")) {
    return;
  }

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

app.http("convertik-bot", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    context.log("Processing Telegram webhook request...");

    try {
      const body = await request.json();
      await bot.handleUpdate(body as any);

      return { status: 200, body: "OK" };
    } catch (error) {
      return { status: 500, body: "Internal Server Error" };
    }
  },
});
