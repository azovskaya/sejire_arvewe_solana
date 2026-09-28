# Верификация тезисов: Arweave + AO для SEJIRE (июль 2026)

Сверка маркетинговых/архитектурных утверждений с актуальным состоянием экосистемы.

| Тезис | Вердикт | Как есть в мире сейчас |
|-------|---------|------------------------|
| HyperBEAM = прод-сеть AO с быстрым HTTP к состоянию процессов | **Верно** | [HyperBEAM](https://github.com/permaweb/hyperbeam) — реализация AO-Core (Forward Research). Cookbook рекомендует `aos --node https://push.forward.computer` и чтение state через HTTP (`…/<pid>~process@1.0/compute/…`). |
| Децентрализованные бандлеры / меньше зависимости от центральных упаковщиков | **В основном верно** | Идёт переход к cacheless / trust-minimized потоку через HyperBEAM и сеть шлюзов. Мелкие записи через AO messages дешевле и удобнее, чем «сырой» AR TX на каждое имя. Полная независимость от любых посредников — цель сети, не мгновенный «ноль инфраструктуры». |
| Логику древа (граф, родство) можно держать в AO process без Node.js/Postgres | **Верно** | Actor model: процесс + handlers (Lua), holographic state на Arweave. Процесс переживает смерть UI/команды. |
| Permaweb Names / семейные домены | **Верно, с уточнением** | Это **ArNS (ar.io)**: человекочитаемые имена → TX ID. Резолв: `https://<name>.ar.io` (и другие ar.io gateways). Реестр сейчас на **Solana** (`ario-arns` + ANT NFT), не «чистый» on-Arweave DNS. Формат `sultanov.ar` — упрощение; практично: `sultanov.ar.io` / undername под `sejire`. Wayfinder (`ar://`) даёт multi-gateway failover. |
| Медиа на Arweave, в AO — только ссылки | **Верно и рекомендуется** | Стандартный паттерн permaweb. Тяжёлые блобы не раздувают state процесса. |
| 100% автономный application-протокол без Web2-бэкенда | **Достижимо для ядра** | Ядро (граф + история коммитов + ACL по кошельку) — да. UX-обвязка (кэш, CDN шлюзов, индекс поиска по тегам) всё ещё использует публичные gateways — но они **сменны**, не ваш SPOF. |
| Добавление данных «мгновенно и дёшево» | **Верно относительно L1 AR** | AO message + bundling/HyperBEAM ≪ отдельный L1 TX. Точная цена зависит от размера payload и тарифов сети. |

## Важные коррекции к старому брифу SEJIRE

1. **«Только текст, без медиа»** → уточняем: *граф и факты* — «цифровой гранит» (UTF-8); *медиа* — опциональные Arweave TX-ссылки, не внутри логики протокола.
2. **«Gologram State»** → корректный термин: **holographic state** (состояние восстанавливается из лога сообщений на Arweave).
3. **Авторизация** → ArConnect / Wander (Arweave wallets), не email/password. BIP-39 seed остаётся валидным путём суверенитета; кошелёк = тот же класс ключей.
4. **Каждое дополнение = новое дерево (версия)** → это не баг UX, а **протокольный инвариант** (git-логика): immutable commits + `parent_commit` + просмотр HEAD и любой прошлой ревизии.

## Итог для продукта

Тезисы про AO/HyperBEAM/двухуровневое хранение — **правильная стратегическая база**.  
SEJIRE должен строиться как **AO application-протокол** с версионным графом, а не как Web2-сайт с «бэкапом на Arweave».

Источники: [AO Cookbook](https://cookbook_ao.arweave.net/welcome/index.html), [HyperBEAM docs](https://hyperbeam.arweave.net/build/introduction/what-is-ao-core.html), [ArNS docs](https://docs.ar.io/learn/arns/), [ar.io Wayfinder](https://docs.ar.io/learn/wayfinder/), [Arweave Weekly on HyperBEAM](https://arweavehub.com/weekly/AO-updates-and-Arweave).
