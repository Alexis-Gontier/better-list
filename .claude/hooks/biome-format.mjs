#!/usr/bin/env node
/**
 * PostToolUse hook — formate et corrige le fichier que Claude vient d'écrire.
 *
 * Reçoit le payload du hook sur stdin, en extrait le chemin, et lance
 * `biome check --write` dessus. Sort toujours en 0 : une erreur de lint non
 * corrigeable ne doit pas bloquer l'édition.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BIOME = resolve(PROJECT_ROOT, "node_modules/@biomejs/biome/bin/biome");
const FORMATTABLE = /\.(m?[jt]sx?|css|jsonc?)$/;

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  let file;
  try {
    const payload = JSON.parse(raw);
    file = payload.tool_response?.filePath ?? payload.tool_input?.file_path;
  } catch {
    process.exit(0);
  }

  if (
    !file ||
    !FORMATTABLE.test(file) ||
    !existsSync(file) ||
    !existsSync(BIOME)
  ) {
    process.exit(0);
  }

  try {
    execFileSync(process.execPath, [BIOME, "check", "--write", file], {
      cwd: PROJECT_ROOT,
      stdio: "ignore",
    });
  } catch {
    // biome sort non-zéro sur une règle non auto-corrigeable — on laisse passer.
  }
  process.exit(0);
});
