import { Context, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { BOT_TOKEN, USER_ID_1, USER_ID_2 } from "./constants";
import { BudgetRepository } from "./storage/BudgetRepository";
import { getInitializedRepository } from "./storage/db";
import { InvocationContext } from "@azure/functions";
import { activeInvocationContext } from "./index";
import { getDetailsMessage, handleTransactionMessage, removeLastTransaction } from "./EventsHandler";

const currentTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log(`Current Timezone: ${currentTZ}`);

export interface BotContext extends Context {
  db: BudgetRepository;
  functionContext: InvocationContext;
}

if (!BOT_TOKEN) {
  throw new Error("Invalid BOT_TOKEN");
}

export const bot = new Telegraf<BotContext>(BOT_TOKEN);

bot.use(async (ctx, next) => {
  ctx.db = await getInitializedRepository();
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

bot.command("remove_last", async (ctx) => {
  await removeLastTransaction(ctx.db);

  const message = 'Last transaction removed';

  ctx.functionContext.log(message);

  await ctx.reply(message);
});

bot.command("details", async (ctx) => {
  const formattedMessage = await getDetailsMessage(ctx.db);

  ctx.functionContext.log(formattedMessage.text);

  await ctx.reply(formattedMessage);
});

bot.command("clear", async (ctx) => {
  await ctx.db.clearCurrentMonthHistory();

  ctx.functionContext.log("History was cleared");

  await ctx.reply("History was cleared");
});

bot.on(message("text"), async (ctx) => {
  const result = await handleTransactionMessage(ctx.db, {
    userId: ctx.from?.id.toString(),
    userName: ctx.from?.first_name,
    text: ctx.message.text,
  });

  ctx.functionContext.log(result.message);

  await ctx.reply(result.message);
});
