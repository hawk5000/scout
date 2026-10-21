import { readFileSync, writeFileSync } from "node:fs";
import { prepareAccess } from "../src/customer/provision";
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw Error(
    "Usage: npm run customer:prepare-access -- <approved-input.json> <new-output.sql>",
  );
try {
  writeFileSync(
    output,
    prepareAccess(JSON.parse(readFileSync(input, "utf8"))),
    { flag: "wx" },
  );
  console.log(
    "Prepared access SQL for operator review. No database or SIL changes were made.",
  );
} catch {
  console.error(
    "Preparation failed. Check the input shape and choose a new output file.",
  );
  process.exitCode = 1;
}
