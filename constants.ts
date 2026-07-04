require("dotenv").config();
import * as path from "path";

export const MONTH_LIMIT = 2800 as const;
export const FILE_PATH = path.join(__dirname, "total.txt");
export const BOT_TOKEN = process.env.BOT_TOKEN;
export const USER_ID_2 = process.env.USER_ID_2;
export const USER_ID_1 = process.env.USER_ID_1;