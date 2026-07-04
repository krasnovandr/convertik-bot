import * as fs from "fs";
import { MONTH_LIMIT } from "./constants";

export function getTotal(filePath: string): {
  amount: number;
  message: string;
} {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8").trim();
      const total = parseFloat(data);
      const range = Math.round((MONTH_LIMIT - total) * 100) / 100;
      return {
        amount: total,
        message: `📊 Всего в конвертике: ${total}\n⏳ Осталось до конца месяца: ${range}`,
      };
    }
  } catch (error) {
    console.error("File Error:", error);
  }
  return { amount: 0, message: `📊 Всего в конвертике: 0` };
}

export function updateTotal(
  amount: number,
  filePath: string,
): { amount: number; message: string } {
  const rawTotal = getTotal(filePath).amount + amount;
  const newTotal = Math.round(rawTotal * 100) / 100;
  fs.writeFileSync(filePath, newTotal.toString(), "utf-8");
  return getTotal(filePath);
}
