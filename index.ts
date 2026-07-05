import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { Context, Telegraf } from "telegraf";

import { message } from "telegraf/filters";
import { formatTransactionsForTelegram, parseBotCommand } from "./utils";
import { BOT_TOKEN, MONTH_LIMIT, USER_ID_1, USER_ID_2 } from "./constants";
import { BudgetRepository } from "./BudgetRepository";
import { getInitializedRepository } from "./db";

export interface BotContext extends Context {
  repo: BudgetRepository;
  functionContext: InvocationContext;
}

let activeInvocationContext: InvocationContext;

if (!BOT_TOKEN) {
  throw new Error("Invalid BOT_TOKEN");
}

const bot = new Telegraf<BotContext>(BOT_TOKEN);

bot.use(async (ctx, next) => {
  ctx.repo = await getInitializedRepository(activeInvocationContext);
  ctx.functionContext = activeInvocationContext!;
  return await next();
});

bot.use(async (ctx, next) => {
  const userId = ctx.from?.id.toString();

  if (userId && [USER_ID_1, USER_ID_2].includes(userId)) {
    return await next();
  }

  if (ctx.chat?.type === "private") {
    await ctx.reply("No access");
  }
});

bot.command("total", async (ctx) => {
  const totalSpends = await ctx.repo.getTotalCostForCurrentMonth();
  const available = (MONTH_LIMIT - totalSpends).toFixed(2);
  ctx.functionContext.log("Total for current month and available:", totalSpends, available);

  await ctx.reply(`Total for current month: ${totalSpends}\nAvailable: ${available}`);
});

bot.command("reset", async (ctx) => {
  await ctx.repo.clearHistory();

  ctx.functionContext.log("History was cleared");

  await ctx.reply("History was cleared");
});

bot.on(message("text"), async (ctx) => {
  const result = parseBotCommand(ctx.message.text);
  if (!result) {
    const message = `Invalid command format Please use format: amount description (-5.5 xyz123)`;
    ctx.functionContext.log(message);
    await ctx.reply(message);
    return;
  }
  const userId = ctx.from?.id.toString() ?? "unknown";

  const { amount , description } = result;
  await ctx.repo.addTransaction({
    userId: userId,
    description: description ?? "Unknown",
    amount: amount,
  });

  const transactions = await ctx.repo.getTransactionsForToday(userId);

  const totalSpends = await ctx.repo.getTotalCostForCurrentMonth();
  const available = MONTH_LIMIT - totalSpends;

  const formattedMessage = formatTransactionsForTelegram(transactions, available);
  ctx.functionContext.log(formattedMessage);

  await ctx.reply(`${formattedMessage}`, { parse_mode: "MarkdownV2" });
});

app.http("webhook", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    activeInvocationContext = context;

    try {
      const body = await request.json();
      context.log("Processing Telegram webhook request body", JSON.stringify(body));
      await bot.handleUpdate(body as any);

      return { status: 200, body: "OK" };
    } catch (error) {
      context.error(`Error processing Telegram webhook request ${error}`);
      return { status: 500, body: "Internal Server Error" };
    }
  },
});
