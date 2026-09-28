# Flow 02 — Зафиксировать версию (Commit)

## Цель

Превратить локальный draft в новый immutable commit.  
**Инвариант:** прошлое не переписывается.

## Предусловия

- Есть Tree Process + owner wallet
- Client знает текущий `head` (через GetHead или кэш)
- Draft содержит валидный `snapshot.persons`

## Шаги

1. Client читает `GetHead` → `parent_commit_id = head`
2. Собирает payload:
   ```json
   {
     "message": "Добавлен Аян Бекмуратов",
     "parent_commit_id": "<head>",
     "snapshot": { "persons": { /* full */ } }
   }
   ```
3. Wallet подписывает `Action=Commit`
4. Tree валидирует owner + parent + snapshot
5. Создаёт `commit_id`, обновляет `head`, отвечает `Commit-Response`
6. Client:
   - ставит dirty=false
   - обновляет history UI
   - показывает новую версию как HEAD

## Конфликт (StaleParent)

Если другой owner успел закоммитить:

1. Client получает `StaleParent`
2. Client MUST `GetHead`, показать diff
3. Пользователь мержит вручную в draft
4. Повторный Commit с новым parent

Авто-merge в v1 **запрещён** (ADR-0004).

## Soft-delete

Удаление в UI → `person.tombstone = true` в draft → обычный Commit.  
Старые версии всё ещё показывают персону без tombstone.

## Локальный MVP

`commitDraft(store, message)` в `treeEngine.ts`.
