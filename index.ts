import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { bot } from "./bot";

export let activeInvocationContext: InvocationContext;

app.http("webhook", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    activeInvocationContext = context;

    try {
      const body = await request.json();
      context.log("Processing Telegram webhook request body", body);

      await bot.handleUpdate(body as any);

      return { status: 200, body: "OK" };
    } catch (error) {
      context.error(`Error processing Telegram webhook request ${error}`);
      return { status: 500, body: "Internal Server Error" };
    }
  },
});
