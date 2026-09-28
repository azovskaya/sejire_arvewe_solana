# SEJIRE → Arweave / ArNS: подробный план реализации

> Инструкция для агента и команды. Не оценка сроков — только **что**, **на каком языке**, **в каком порядке**, **как не взломать**.
>
> Связанные документы: [ADR-0006](./adr/0006-sponsored-fiat-publish.md), [SPONSOR_AND_PERMAWEB.ru.md](./SPONSOR_AND_PERMAWEB.ru.md), [SEED_ACCESS.md](./security/SEED_ACCESS.md), [THREAT_MODEL.ru.md](./security/THREAT_MODEL.ru.md).

---

## 0. Цель (одним абзацем)

1. Сайт SEJIRE живёт на **permaweb** под именем **`sejire.ar.io`** (GitHub Pages = зеркало).
2. Любой человек **бесплатно** собирает древо, сохраняет в браузере, качает PDF, шлёт на почту / печатает.
3. По желанию: **$3 картой** → зашифрованный сейф навсегда в Arweave. Пользователь **не покупает AR**.
4. **12 слов никогда не уходят** с устройства. Сервер видит только уже зашифрованный конверт.

Казна проекта (ваши ~112 AR → Turbo + ARIO) платит сеть. Пользователь платит картой продукту.

---

## 1. Языки и роли (что «поймёт» экосистема)

Arweave / ar.io — это не один язык. Важно писать **правильный слой правильным стеком**:

| Слой | Язык / стек | Зачем | Что «понимает» сеть |
|------|-------------|-------|---------------------|
| UI (SPA) | **TypeScript + React + Vite** (`apps/web`) | Интерфейс, дерево, PDF, шифрование, restore | Браузер; статический бандл → Arweave TX |
| Крипто на клиенте | **TypeScript** (Web Crypto, BIP-39) | Seed → ключи → AES-GCM | Ничего on-chain; только ciphertext |
| Публикация vault | **TypeScript** + Turbo SDK | Data Item / TX + **теги** | Arweave GraphQL по тегам `App-Name`, `Vault-Id` |
| Sponsor edge | **TypeScript** (Cloudflare Worker) | Stripe $3 → проверка → Turbo upload | HTTP API; не AO |
| Деплой сайта | **Node/CLI** (`permaweb-deploy` / Turbo) | `dist/` → манифест → TX | Path Manifest на Arweave |
| Имя `sejire` | **ARIO + Solana wallet** (UI arns.ar.io) | Купить имя, указать TX сайта | ArNS registry (ARIO), не «скрипт на AR» |
| AO Tree/Factory (фаза позже) | **Lua** (AO processes) | On-chain commits рода | AO / HyperBEAM messages |

**Важно:** для MVP «сайт + вечный сейф за $3» **Lua/AO не обязателен**. Сейчас работает путь: локальный draft → envelope → Arweave tags. AO — Phase 3+, после стабильного permaweb + sponsor.

### Что сеть реально «читает»

Не «наш код на сервере Arweave», а:

1. **Байты** (HTML/JS/CSS или JSON-конверт).
2. **Теги** на TX / Data Item (`App-Name=SEJIRE`, `Type=vault-envelope`, `Vault-Id=…`, `Content-Type=…`).
3. **Path Manifest** для SPA (маршруты → TX файлов).
4. **ArNS record** `sejire` → TX манифеста (или ANT pointer).

Пока теги и схема `sejire/envelope/v1` соблюдены — restore по 12 словам работает с любого gateway.

---

## 2. Архитектура целевого состояния

```
Пользователь
  │
  ├─ бесплатно ──► SPA (sejire.ar.io / Pages mirror)
  │                 draft в localStorage
  │                 PDF / почта / печать
  │
  └─ «В Arweave» ─► 1) seal на устройстве (AES-GCM)
                    2) Stripe Checkout $3
                    3) POST ciphertext → Sponsor Worker
                    4) Worker: verify payment → Turbo upload (казна)
                    5) вернуть txId → клиент показывает «навсегда»

Казна (проект)
  ├─ AR / Turbo credits  → деплой SPA + sponsor uploads
  └─ ARIO (+ SOL fee)    → ArNS имя sejire + обновление record
```

### Два кошелька (строго разделены)

| Кошелёк | Хранит | Делает | Не делает |
|---------|--------|--------|-----------|
| **Treasury** | JWK / Turbo в CI + Worker secrets | Платит upload сайта и чужих envelope | Не видит seed / plaintext |
| **User seed** | Только у пользователя (12 слов) | Шифрует / расшифровывает / восстанавливает | Не обязан иметь AR |

---

## 3. Пошаговый rollout (порядок работ)

### Шаг A — Казна и имя (человек, не код)

**Делает владелец ключей (ты), не агент.**

1. Вывести AR с Binance на **свой** ArConnect (не на чужой адрес, не агенту).
2. Открыть [arns.ar.io](https://arns.ar.io) → проверить `sejire`.
3. Часть AR → **ARIO** (имя платится ARIO; чуть **SOL** на комиссию Solana).
4. Купить:
   - **Lease 1 год** — дешевле, продлевать; или
   - **Permabuy** — дороже, без срока.
5. Остаток AR / Turbo credits оставить на казну (деплой + спонсор uploads).
6. Зафиксировать в парольном менеджере: seed/JWK казны, Stripe later — **отдельно** от личных 12 слов пользователя продукта.

**Критерий готовности:** имя `sejire` в кошельке команды; хватает Turbo на ≥1 деплой SPA + запас на тестовые vault.

---

### Шаг B — Сборка и деплой SPA на permaweb (код + CI)

**Язык:** TypeScript/Vite build + Node CLI.

1. `apps/web`: `npm ci && npm run build` → `dist/`.
2. Проверить, что base path / absolute asset paths совместимы с Path Manifest (не сломать `sejire.ar.io/` vs GitHub Pages `/Sejire_arweave/`).
   - Решение: **два билда** или `BASE_URL` env:
     - Pages: `/Sejire_arweave/`
     - ArNS: `/`
3. Деплой: `permaweb-deploy` (или Turbo upload + manifest) подписан **treasury JWK** из GitHub Actions secret.
4. Получить **manifest TX id**.
5. В ArNS UI: `@` / root record `sejire` → этот TX.
6. Проверка: `https://sejire.ar.io` открывается; критические экраны (welcome, дерево, PDF, restore) работают.
7. GitHub Pages остаётся зеркалом того же релиза.

**Дописать в репо:**

| Файл / зона | Что |
|-------------|-----|
| `.github/workflows/permaweb-deploy.yml` | build + deploy on tag/main |
| `apps/web` vite `base` | dual deploy config |
| `docs/LIVE.md` | канонический URL `sejire.ar.io` |
| secret `TURBO_JWK` / `DEPLOY_JWK` | только в CI, не в git |

**Критерий:** `sejire.ar.io` = актуальный билд; Pages не расходится по версии >1 релиза.

---

### Шаг C — Sponsor edge live (код)

**Язык:** TypeScript, Cloudflare Worker (`apps/sponsor`).

Сейчас — скелет. Дописать до продакшена:

| Endpoint | Логика |
|----------|--------|
| `POST /v1/checkout` | Создать Stripe Checkout Session на **$3.00**, `client_reference_id` / metadata = `vaultId` (публичный), success/cancel URL на SPA |
| `POST /v1/publish` | Принять **только** sealed envelope JSON + `session_id`. Проверить оплату в Stripe. Идемпотентность: `session_id → txId` в KV. Upload через Turbo (treasury). Вернуть `txId` |
| `POST /v1/stripe/webhook` | Подпись webhook; пометить session paid (доп. защита) |
| Health | `GET /v1/health` без секретов |

**Жёсткие правила Worker:**

- Отклонять body с полями `mnemonic`, `seed`, `plaintext`, `trees` без cipher.
- `MAX_ENVELOPE_BYTES` (например 512 KiB) — отказ + не upload.
- Один successful payment = один upload (KV idempotency).
- CORS только на `APP_ORIGIN` (Pages + `https://sejire.ar.io`).
- Rate limit по IP / Stripe customer.
- Если upload упал после оплаты → retry N раз → Stripe refund.
- Логи без ciphertext (или truncate); **никогда** не логировать seed.

**Секреты (Wrangler):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TURBO_JWK`.

**Критерий:** test mode: оплата → tx на Arweave → restore по 12 словам с другого браузера.

---

### Шаг D — Проводка клиента «В Arweave» (код)

**Язык:** TypeScript/React (`PublishSeedModal`, `publish.ts`).

Текущий путь (user fund derived address) оставить как **fallback** за флагом.

Новый путь (default):

1. Пользователь вводит/создаёт 12 слов **локально**.
2. Клиент: derive keys → encrypt vault → envelope.
3. `POST /v1/checkout` → redirect Stripe.
4. Return URL: `POST /v1/publish` с envelope + `session_id`.
5. Показать txId + инструкцию «сохрани 12 слов».
6. Feature flag: `VITE_SPONSOR_URL`, `VITE_PUBLISH_MODE=sponsor|self`.

**Не менять:** схема envelope, теги, `vaultId` derivation — иначе старые сейфы не откроются.

**Критерий:** E2E без покупки AR пользователем.

---

### Шаг E — Безопасность и антиабьюз (обязательный чеклист)

См. также threat model. Для этого rollout:

| Угроза | Мера |
|--------|------|
| Утечка 12 слов на сервер | Архитектура: Worker принимает только envelope; код-ревью + тесты «reject mnemonic» |
| Подмена UI (фишинг) | Канон `sejire.ar.io`; предупреждать о поддельных доменах; pin hash релиза в docs |
| Украли treasury JWK | Отдельный hot wallet с лимитом Turbo; cold отдельно; ротация; CI secrets only |
| Двойной publish за $3 | KV idempotency по `session_id` |
| Спам огромными body | Size cap + Stripe paid-only |
| Replay чужого session | Verify session belongs to unpaid→paid; bind `vaultId` in metadata |
| XSS в SPA крадёт seed из DOM | Не хранить mnemonic в `localStorage` plaintext дольше сессии publish; очищать state; CSP на Pages/Headers Worker |
| Supply-chain npm | Lockfile, CI audit, минимальные deps на crypto path |
| Злой gateway отдал другой JS | Сверять TX id манифеста; Wayfinder / несколько gateway |
| Insider SEJIRE читает семьи | Невозможно: нет plaintext на сервере; ciphertext бесполезен без слов |

**Тесты, которые надо дописать:**

- crypto selftest (уже есть) — не ломать.
- Worker unit: reject mnemonic, idempotent publish, size limit.
- Client: sponsor mode не вызывает self-fund path.
- Restore: GraphQL by `Vault-Id` + decrypt.

---

### Шаг F — Операции после запуска

1. Мониторинг Stripe (успехи / dispute) + Turbo баланс казны.
2. Алерт: баланс Turbo < порога.
3. Процедура редеплоя SPA (tag → CI → обновить ArNS root).
4. Runbook: «оплата прошла, tx нет» → найти session в KV / Stripe → retry / refund.
5. Юридическое: оферта $3 = вечная копия зашифрованных данных, не «мы храним ваш род открытым».

---

## 4. Что дописывать по файлам (карта работ агента)

### Уже есть (не ломать без ADR)

- `apps/web` — дерево, PDF, BIP-39, envelope, publish/fetch
- `apps/sponsor` — скелет Worker
- Docs ADR-0006, SEED_ACCESS, sponsor plan

### Дописать / создать

| Приоритет | Артефакт | Язык |
|-----------|----------|------|
| P0 | Dual `base` + permaweb workflow | TS / YAML |
| P0 | Worker: Stripe verify + Turbo upload + KV | TS |
| P0 | Wire `PublishSeedModal` → sponsor | TS/TSX |
| P0 | Env templates (`.env.example`, wrangler.toml) | — |
| P1 | Idempotency + refund path | TS |
| P1 | CSP / headers для SPA | — |
| P1 | Update `LIVE.md` + presentation links → `sejire.ar.io` | MD |
| P2 | Credit Share (user-signed data items) | TS |
| P2 | AO Lua Tree live wiring | Lua + TS |
| P2 | ArNS undernames для семей (`family_sejire`) | ops |

---

## 5. Порядок исполнения для агента (когда скажут «делай код»)

1. Не трогать казну и не просить seed пользователя / Binance.
2. Сначала **конфиг dual-base + script деплоя** (можно dry-run без секретов).
3. Затем **дописать Worker** с моками Stripe/Turbo в тестах.
4. Затем **флаг sponsor в клиенте** + UI статусов оплаты.
5. Документация LIVE + runbook.
6. Когда человек купит `sejire` и положит secrets — один supervised деплой + smoke test.
7. Только потом — выключать self-fund path по умолчанию.

---

## 6. Критерии «всё чётко работает»

- [ ] `https://sejire.ar.io` открывает актуальный SEJIRE
- [ ] Бесплатно: создать → автосохранение → PDF → «скачал / отправил / распечатал»
- [ ] «В Arweave»: 12 слов локально → $3 → txId → с другого устройства restore по словам
- [ ] В логах Worker нет mnemonic / plaintext tree
- [ ] Повторный POST того же `session_id` возвращает тот же `txId`
- [ ] Pages mirror совпадает с permaweb релизом
- [ ] Казна: хватает Turbo; ArNS record указывает на последний manifest

---

## 7. Явно вне скоупа сейчас

- Пользователь покупает AR на Binance для publish
- Сервер хранит или восстанавливает 12 слов
- «Умный контракт на AR», который сам рисует дерево (логика UI — в SPA)
- Судебная сертификация родства
- Покупка ArNS агентом с чужих ключей

---

## 8. Решения владельца

> **Канон для агента:** все закрытые решения перенесены в [`LOCKED_DECISIONS.ru.md`](./LOCKED_DECISIONS.ru.md). Ниже — краткая отсылка; при конфликте побеждает LOCKED_DECISIONS.

| Вопрос | Решение | Дата |
|--------|---------|------|
| Имя `sejire` | **Навсегда** → `sejire.ar.io` | 2026-07-27 |
| Оплата | **Kaspi** (не Stripe); нужен ИП/ТОО + мерчант | 2026-07-27 |
| Хостинг продукта | **Arweave**, не «обычный сайт» как основа | 2026-07-27 |
| Кассир оплаты | Только тонкий слой «оплачено?» → ciphertext; не видит 12 слов | 2026-07-27 |
| Открыть уже сохранённое | **Без** банка и кассира — только 12 слов + Arweave | 2026-07-27 |
| Казна проекта | Ещё не готова | 2026-07-27 |

Подробности, таблицы и сценарий restore — в LOCKED_DECISIONS. Раздел 8.1 ниже сохранён как пояснение.

### 8.1. Децентрализация vs оплата тенге/картой (важно понять)

| Что | Где живёт | Централизация |
|-----|-----------|----------------|
| Сайт SEJIRE (кнопки, дерево, PDF) | **Arweave + имя `sejire.ar.io`** | Нет — это и есть цель |
| Черновик древа | Браузер пользователя | Нет |
| Зашифрованный сейф навсегда | **Arweave** | Нет |
| 12 слов | Только у пользователя | Нет |
| Приём **тенге / Kaspi / карты** | Банк + короткая проверка «оплачено?» | **Да, неизбежно** — банк всегда центральный |

**Вывод:** продукт может быть децентрализованным по данным и сайту.  
**Полностью** убрать банк из оплаты фиатом нельзя: Kaspi и карта — это банк.

Варианты без «обычного хостинга сайта»:

1. **Рекомендуемый гибрид:** сайт на Arweave; отдельно крошечный «кассир» (Cloudflare Worker или аналог) **только** проверяет оплату Kaspi/карты и заливает уже зашифрованный файл. Он не хранит род и не видит 12 слов.
2. **Без кассира (максимум Web3):** пользователь сам платит сетью (AR/Turbo) — плохо для массового KZ-рынка.
3. **Ручная схема:** человек кидает 1500 ₸ на Kaspi → вы вручную подтверждаете — плохо масштабируется, риск ошибок.

Kaspi Pay для сайта ≠ «просто есть Kaspi и Kaspi Pay в телефоне»:
- нужно **ИП или ТОО** + заявка в **Kaspi для бизнеса** / договор мерчанта;
- API ключи и уведомления «оплата прошла»;
- личный счёт физлица без мерчанта обычно **нельзя** честно воткнуть в автооплату сайта.

### Как купить имя навсегда (делает владелец ключей)

1. Вывести AR с Binance на **свой** кошелёк ArConnect.
2. Часть средств обменять на **ARIO** (имя платится им, не «голым» AR).
3. Чуть **SOL** на комиссию сети Solana (мелочь), если кошелёк попросит.
4. Открыть [arns.ar.io](https://arns.ar.io) → имя `sejire` → тип **Permanent / навсегда**.
5. Подтвердить покупку **только со своего** кошелька.
6. Позже (после деплоя сайта) в настройках имени указать TX сайта — тогда откроется `https://sejire.ar.io`.

### Как завести казну проекта (когда будете готовы)

1. В ArConnect создать **новый** кошелёк (не смешивать с личным).
2. Перевести туда часть AR с Binance (на деплой сайта и оплату чужих сейфов).
3. Ключ казны хранить в парольном менеджере / сейфе команды — **не** в git и **не** в чате.
