#!/usr/bin/env node
// Pre-commit hook: bloquea el commit si hay secrets en los archivos staged.
import { execSync } from "node:child_process";

const PATTERNS = [
  { name: "Supabase JWT (anon/service_role)", regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
  { name: "Clave privada RSA/EC", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "AWS access key", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub token", regex: /ghp_[A-Za-z0-9]{36}/ },
  { name: "Slack token", regex: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "Stripe secret key", regex: /sk_live_[0-9a-zA-Z]{24,}/ },
];

const staged = execSync("git diff --cached --name-only --diff-filter=ACM", {
  encoding: "utf8",
})
  .split("\n")
  .map((f) => f.trim())
  .filter(Boolean);

const problemas = [];

for (const file of staged) {
  let content;
  try {
    content = execSync(`git show :${file}`, { encoding: "utf8" });
  } catch {
    continue;
  }
  for (const p of PATTERNS) {
    if (p.regex.test(content)) {
      problemas.push(`  ${file} -> ${p.name}`);
    }
  }
  // Variables de entorno con valor: solo en archivos .env* (evita falsos positivos en docs con placeholders)
  if (/\.env[^/]*$/.test(file) && /^[A-Z][A-Z0-9_]*=\S+$/m.test(content)) {
    problemas.push(`  ${file} -> Variable de entorno con valor (posible secret)`);
  }
}

if (problemas.length > 0) {
  console.error("SECRETS DETECTADOS en el commit:\n" + problemas.join("\n"));
  console.error("\nCommit cancelado. Revisá esos archivos: si son de entorno, agregalos al .gitignore.");
  process.exit(1);
}

