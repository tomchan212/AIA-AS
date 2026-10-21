import { cp, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(appRoot, "out");
const destination = resolve(appRoot, "../../pyramid");

await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
