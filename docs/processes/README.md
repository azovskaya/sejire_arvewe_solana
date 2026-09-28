# AO Processes — Index

Каждый процесс описан в паре: **Markdown (логика)** + **Lua (исполнение)**.

| Process | Doc | Code | Responsibility |
|---------|-----|------|----------------|
| Tree | [TREE.md](./TREE.md) | `ao/processes/tree.lua` | Версии древа, ACL, history, kinship queries |
| Factory | [FACTORY.md](./FACTORY.md) | `ao/processes/factory.lua` | Spawn деревьев, реестр process id |
| Messages | [MESSAGE_CATALOG.md](./MESSAGE_CATALOG.md) | — | Нормативный каталог Action/Tags/Data |

## Инварианты всех процессов SEJIRE

1. Сообщения с мутацией проверяют подпись отправителя (`msg.From`).
2. Мутации графа только через новые commits (Tree).
3. Ошибки возвращают `Action=Error` + `Error-Code`.
4. Публичное чтение (Info/History/Get*/Relate) не требует owner (v1).
5. После успешной мутации SHOULD вызываться `patch@1.0` для HyperBEAM HTTP.
