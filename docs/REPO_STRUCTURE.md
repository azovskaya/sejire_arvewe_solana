# Структура репозитория

```
Sejire_arweave/
├── README.md
├── index.html                 # Навигация по артефактам
├── presentation/              # Слайды
├── docs/                      # Техдокументация
│   ├── README.md              # Индекс
│   ├── PROTOCOL.md            # Норматив
│   ├── ARCHITECTURE.ru.md
│   ├── GLOSSARY.ru.md
│   ├── VERIFICATION.ru.md
│   ├── CHECKLIST.md           # Синхронизация code↔docs
│   ├── processes/             # Логика каждого AO process
│   ├── flows/                 # Сценарии
│   ├── adr/                   # Решения
│   ├── security/
│   └── roadmap/
├── ao/
│   ├── README.md
│   └── processes/
│       ├── tree.lua
│       └── factory.lua
├── apps/
│   └── web/                   # React MVP
└── packages/
    └── schema/                # JSON Schema + catalog
```

Правило: изменение поведения процесса без обновления `docs/processes/` + catalog = незавершённый PR.
