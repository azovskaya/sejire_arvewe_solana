# SEJIRE Web MVP

Локальный версионный редактор родового древа.

Протокол совпадает с AO Tree Process:

- код: `ao/processes/tree.lua`
- спецификация: `docs/processes/TREE.md`
- engine: `src/lib/` ([README](./src/lib/README.md))

```bash
npm install
npm run dev
npm run test:engine
npm run build
```

Каждое «Зафиксировать новую версию» создаёт immutable commit.  
Просмотр истории — read-only; продолжение от старой версии = основа для *нового* commit.
