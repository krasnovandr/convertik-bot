require("dotenv").config();

export const MONTH_LIMIT = parseInt(process.env.MONTH_LIMIT || "3000");
export const DEFAULT_MONTH_LIMIT = MONTH_LIMIT;
export const BOT_TOKEN = process.env.BOT_TOKEN;
export const USER_ID_2 = process.env.USER_ID_2;
export const USER_ID_1 = process.env.USER_ID_1;