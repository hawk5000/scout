import { spawn } from "node:child_process";
if (process.env.VERCEL)
  throw new Error("The local demo launcher cannot run on Vercel.");
const mode = process.argv[2] === "start" ? "start" : "dev";
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    mode,
    "--hostname",
    "127.0.0.1",
    ...process.argv.slice(3),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      SCOUT_DEMO_ENABLED: "true",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);
child.on("exit", (code) => process.exit(code ?? 1));
