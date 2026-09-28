# SEJIRE

**Создание неизменяемой ткани человеческой истории.**

Протокол вечного версионного хранения родовых деревьев.  
Сначала собираете древо (я → мама/папа → бабушки/дедушки).  
**12 слов — только при отправке в Arweave.**

## Продолжить разработку отсюда

См. **[`docs/CHECKPOINT.ru.md`](./docs/CHECKPOINT.ru.md)** — что готово, решения, очередь задач.  
Ветка: `cursor/ao-protocol-v03-82e4` · протокол: `sejire/v0.3`

## Открыть приложение

**https://azovskaya.github.io/Sejire_arweave/** — тестовое зеркало (Arweave пока не трогаем).

Репозиторий: https://github.com/azovskaya/Sejire_arweave

## Локально

```bash
git checkout cursor/ao-protocol-v03-82e4
cd apps/web && npm install && npm test && npm run dev
```

Обновить GitHub Pages из этого репо:

```bash
npm run deploy:pages
```

## Структура

| Путь | Содержание |
|------|------------|
| `apps/web` | Клиент (сбор древа + PDF + JSON + публикация) |
| `apps/sponsor` | Кассир: mock + Kaspi Merchant API v2 + Turbo treasury |
| `docs/` | Протокол, чекпоинт, locked decisions, rollout |
| `ao/processes` | Lua Tree / Factory (`sejire/v0.3`) |
| `packages/schema` | JSON Schema |
| `presentation/` | Investor deck + PDF |
| ветка `gh-pages` | Собранный сайт для Pages |

Подробнее: [`docs/LIVE.md`](./docs/LIVE.md) · [`docs/README.md`](./docs/README.md) · [`docs/LOCKED_DECISIONS.ru.md`](./docs/LOCKED_DECISIONS.ru.md)

