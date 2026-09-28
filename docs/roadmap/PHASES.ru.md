# Фазы внедрения SEJIRE

## Phase 0 — Документация и презентация ✅

- Investor deck (`presentation/`)
- Protocol + ADR + flows + process docs
- Verification vs ecosystem

## Phase 1 — Local versioned engine ✅

- `apps/web` editor with commit history
- `treeEngine` mirrors protocol rules
- Schemas + Lua Tree/Factory blueprints
- Tests: `npm run test:engine`

## Phase 2 — Seed access + eternal envelope ✅ (product path)

- BIP-39 create / restore (12 words)
- AES-GCM vault encryption on device
- Deterministic `vaultId` recovery
- Local encrypted cache
- Arweave publish/fetch by `Vault-Id` tag
- Export/import envelope file (works offline / without AR)
- Docs: `SEED_ACCESS.md`, flow 07
- Tests: `npm run test:crypto`

## Phase 3 — Product hardening

- [ ] Live AO Tree/Factory via aos + `VITE_SEJIRE_FACTORY_ID` (aoconnect signer)
- [x] Local Tree/Factory process double + `SejireAoClient` (`npm run test:protocol`)
- [x] Kinship query handlers in AO (`GetAncestors`, `GetJetiAta`, `Relate`)
- [x] Permaweb deploy script for UI (`npm run deploy:permaweb`)
- [ ] Media upload helper (Turbo/Irys)
- [ ] ArNS family names
- [ ] Multi-owner UX + Shamir recovery

## Phase 3.4 — Product UX hardening ✅ (checkpoint v0.4)

Зафиксировано в [`CHECKPOINT.ru.md`](../CHECKPOINT.ru.md).

- [x] Схема до 7 поколений; «К себе» после двойного клика
- [x] Текстовые даты (без поломки года в `type=date`)
- [x] Classic PDF: без пересечений линий; ФИО + даты
- [x] Жеті ата PDF: орнаментальный шежіре
- [x] Выгрузить / Загрузить JSON (полный бэкап)
- [x] Investor deck Arweave-style + PDF
- [x] LOCKED_DECISIONS + PERMAWEB_ROLLOUT

## Phase 3.5 — Fiat sponsor + permaweb site (следующий блок)

**Полный пошаговый план:** [`PERMAWEB_ROLLOUT.ru.md`](../PERMAWEB_ROLLOUT.ru.md).  
**Решения владельца:** [`LOCKED_DECISIONS.ru.md`](../LOCKED_DECISIONS.ru.md).  
**Старт отсюда:** [`CHECKPOINT.ru.md`](../CHECKPOINT.ru.md).

Также: [`SPONSOR_AND_PERMAWEB.ru.md`](../SPONSOR_AND_PERMAWEB.ru.md), [ADR-0006](../adr/0006-sponsored-fiat-publish.md).

- [x] Permaweb deploy SPA (скрипт upload; ArNS Target ID — владелец)
- [x] Кассир API mock + Kaspi-ready + wire PublishSeedModal (`VITE_PUBLISH_MODE=sponsor`)
- [x] Kinship query handlers in AO (`GetAncestors`, `GetJetiAta`, `Relate`) + local process double
- [ ] Live aos Factory/Tree process IDs (`VITE_SEJIRE_FACTORY_ID`)
- [ ] Dual-base + привязка `sejire.ar.io` → TX манифеста
- [x] Kaspi Merchant API v2 в кассире (invoice / poll / webhook); live после секретов ИП
- [x] `TURBO_JWK` treasury → реальный upload (если секрет задан; иначе mock)
- [x] Keep GitHub Pages as mirror
- [x] Stripe **не** используем (см. LOCKED_DECISIONS)

## Phase 4 — Ecosystem

- Import from GEDCOM
- Public heritage trees (opt-in)
- Indexer for discovery
- Mobile wallet deep links

Критерий «готово для пользователя с 12 словами»:
1. Создать сейф и записать фразу
2. Добавить людей, зафиксировать версии
3. Опубликовать / экспортировать
4. На другом устройстве открыть **только** фразой (или фраза + envelope файл)
