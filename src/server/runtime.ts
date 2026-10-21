import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DemoRepository } from "./repository";
import { assertDemoEnabled } from "./access";
const globalDb = globalThis as unknown as { scoutDemo?: DemoRepository };
export function repository() {
  assertDemoEnabled();
  if (!globalDb.scoutDemo) {
    const dir = path.join(process.cwd(), "local-data");
    mkdirSync(dir, { recursive: true });
    globalDb.scoutDemo = new DemoRepository(
      path.join(dir, "scout-demo.sqlite"),
    );
  }
  return globalDb.scoutDemo;
}
