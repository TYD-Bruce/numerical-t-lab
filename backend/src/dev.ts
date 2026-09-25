/**
 * Local dev API server — Vite proxies /api/chat to literal loopback.
 * Production: Vercel serves api/chat.ts as serverless.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createLocalApiServer, LOCAL_API_HOST } from "./localApiServer.js";
import { createLocalTutorSessions } from "./localTutorSession.js";

function loadEnvFile(filename: string): void {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");
const PORT = Number(process.env.API_PORT ?? 3001);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("API_PORT must be an integer from 1 to 65535.");
}
const personalSetting = process.env.T_LAB_PERSONAL_TUTOR;
if (personalSetting !== undefined && personalSetting !== "true" && personalSetting !== "false") {
  throw new Error("T_LAB_PERSONAL_TUTOR must be true or false.");
}
const personalTutor = personalSetting === "true" ? createLocalTutorSessions() : undefined;
const server = createLocalApiServer({
  frontendOrigins: process.env.T_LAB_LOCAL_ORIGINS?.split(",").map((origin) => origin.trim()),
  personalTutor,
});

function shutdown(): void {
  personalTutor?.dispose();
  server.close(() => process.exit(0));
  server.closeAllConnections();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[ode-lab-api] Port ${PORT} is already in use.\n` +
        `  • Another "npm run dev:api" may still be running — close that terminal or stop the process.\n` +
        `  • Windows: netstat -ano | findstr :${PORT}   then   taskkill /PID <pid> /F\n` +
        `  • Or set API_PORT=3002 in .env.local and update the loopback proxy target in frontend/vite.config.ts`
    );
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, LOCAL_API_HOST, () => {
  const mock = process.env.AI_TUTOR_MOCK?.trim().toLowerCase();
  const mockOn =
    mock === "true" || mock === "1" || mock === "yes";
  console.log(`[ode-lab-api] POST http://${LOCAL_API_HOST}:${PORT}/api/chat`);
  if (mockOn) {
    console.log("[ode-lab-api] AI_TUTOR_MOCK=true — OpenAI not required");
  }
});
