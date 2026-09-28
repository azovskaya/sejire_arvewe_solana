#!/usr/bin/env node
/**
 * Create the SEJIRE project treasury on THIS computer.
 * Do not run in a cloud agent: the key would vanish with the VM.
 *
 * Writes (gitignored):
 *   treasury.local.json  — JWK + public address + admin token
 *
 * Prints the public address and where to copy secrets. Never commit the JSON.
 */
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const outFile = resolve(root, "treasury.local.json");
const addrFile = resolve(root, "treasury.address.txt");

if (existsSync("/opt/cursor") && process.env.SEJIRE_ALLOW_CLOUD_TREASURY !== "1") {
  console.error(`
Казну нужно создать на своём Mac / ПК, не в облаке агента.

Ключ, который появится здесь, пропадёт вместе с машиной агента —
потом сейфы людей нельзя будет оплачивать из казны.

На своём компьютере, в папке репозитория:

  npm install --prefix apps/sponsor
  npm run treasury:init

Потом:
  1. Файл treasury.local.json — в 1Password / зашифрованный диск. В git не класть.
  2. Адрес из файла — можно записать на бумагу.
  3. JWK — во вкладку «Ключи» на /admin (не в чат и не в git).
`);
  process.exit(1);
}

if (existsSync(outFile) && process.argv[2] !== "--force") {
  console.error(`Уже есть ${outFile}
Не перезаписываю. Если точно нужна новая казна: npm run treasury:init -- --force`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
const Arweave = require("arweave");

const arweave = Arweave.init({ host: "arweave.net", port: 443, protocol: "https" });
const jwk = await arweave.wallets.generate();
const address = await arweave.wallets.jwkToAddress(jwk);
const adminToken = randomBytes(24).toString("hex");

const payload = {
  createdAt: new Date().toISOString(),
  address,
  adminToken,
  jwk,
};

writeFileSync(outFile, JSON.stringify(payload, null, 2), { mode: 0o600 });
writeFileSync(addrFile, `${address}\n`, { mode: 0o644 });

console.log(`
SEJIRE казна создана на этом компьютере.

Публичный адрес (можно на бумагу и в TREASURY_ADDRESS):
  ${address}

Файлы (не в git):
  ${outFile}
  ${addrFile}

Сохраните доступ в трёх местах, иначе казна потеряется:
  1. 1Password / Bitwarden — весь treasury.local.json
  2. Зашифрованная флешка или сейф — копия того же файла
  3. Бумага — только адрес казны (не JSON)

Дальше на своём компьютере:
  cd apps/sponsor
  npx wrangler deploy
  открыть https://<ваш-worker>.workers.dev/admin
      → вкладка «Ключи» → вставить поле jwk из этого файла
      → JSON с экрана больше не читается; копия — в 1Password

adminToken в файле больше не обязателен: пароль задаётся при первом входе в /admin.

Не присылайте этот JSON в чат агенту и не кладите в git.
`);
