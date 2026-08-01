import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import pino from "pino";
import { bot } from "./bot";

export const logger = pino({
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

app.http("webhook", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await request.json();
      logger.info({ body }, "Processing Telegram webhook request");

      await bot.handleUpdate(body as any);

      return { status: 200, body: "OK" };
    } catch (error) {
      logger.error({ error }, "Error processing Telegram webhook request");
      return { status: 500, body: "Internal Server Error" };
    }
  },
});
