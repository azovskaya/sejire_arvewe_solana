# SEJIRE Architecture v2 — Overview

> Полный норматив: [`PROTOCOL.md`](./PROTOCOL.md)  
> Индекс документации: [`README.md`](./README.md)

## Одна картинка

```
┌─────────────────────────────────────────────────────────┐
│ Client (apps/web)                                       │
│  draft (local) → sign → Commit                          │
│  History UI ← GetCommit / GetHead                       │
└───────────────┬──────────────────────────▲──────────────┘
                │                          │
                ▼                          │
┌──────────────────────────┐    ┌──────────┴──────────────┐
│ Factory Process (AO)     │    │ Tree Process (AO)       │
│ SpawnTree / ListTrees    │───►│ commits[], head, owners │
└──────────────────────────┘    │ Init/Commit/History/... │
                                └──────────┬──────────────┘
                                           │ media.tx
                                           ▼
                                ┌─────────────────────────┐
                                │ Arweave Permaweb blobs  │
                                └─────────────────────────┘
```

## Инвариант

Каждое дополнение = **новый immutable commit** (полный snapshot).  
Прошлые версии всегда читаемы. См. [ADR-0002](./adr/0002-immutable-commits.md).

## Стек

| Слой | Технология | Doc |
|------|------------|-----|
| Логика древа | AO Tree Process (Lua) | [processes/TREE.md](./processes/TREE.md) |
| Реестр деревьев | AO Factory | [processes/FACTORY.md](./processes/FACTORY.md) |
| Сообщения | HyperBEAM | [VERIFICATION.ru.md](./VERIFICATION.ru.md) |
| Медиа / vault blobs | Arweave via Turbo | [flows/04-attach-media.md](./flows/04-attach-media.md), [ADR-0006](./adr/0006-sponsored-fiat-publish.md) |
| Fiat publish sponsor | Thin edge (Stripe + Turbo) | [SPONSOR_AND_PERMAWEB.ru.md](./SPONSOR_AND_PERMAWEB.ru.md) |
| Имена | ArNS | verification + roadmap |
| UI | React Vite (Pages mirror + permaweb) | `apps/web` |

## Фазы

См. [`roadmap/PHASES.ru.md`](./roadmap/PHASES.ru.md).

## Безопасность

- [`security/THREAT_MODEL.ru.md`](./security/THREAT_MODEL.ru.md)
- [`security/KEY_MANAGEMENT.ru.md`](./security/KEY_MANAGEMENT.ru.md)
- v1 public read — [ADR-0005](./adr/0005-public-read-v1.md); encryption before personal mainnet data.
