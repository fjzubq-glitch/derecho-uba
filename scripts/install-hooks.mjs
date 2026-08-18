#!/usr/bin/env node
// Instala los hooks de git del proyecto (pre-commit).
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const hooksDir = join(root, ".git", "hooks");
const preCommitPath = join(hooksDir, "pre-commit");

if (!existsSync(hooksDir)) {
  console.log("No hay repo .git; se omite la instalación de hooks.");
  process.exit(0);
}

const hook = `#!/bin/sh
# Bloquea commits que contengan secrets. Instalado por scripts/install-hooks.mjs.
exec node "${root.replace(/\\/g, "/")}/scripts/check-secrets.mjs"
`;

writeFileSync(preCommitPath, hook, "utf8");
console.log("Hook pre-commit instalado.");

