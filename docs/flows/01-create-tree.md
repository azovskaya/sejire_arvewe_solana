# Flow 01 — Создать древо

## Цель

Пользователь получает автономный Tree Process и genesis-commit.

## Участники

Client UI, Wallet (Wander/ArConnect), Factory Process, Tree Process, HyperBEAM.

## Шаги

```mermaid
sequenceDiagram
  participant U as User
  participant C as Client
  participant W as Wallet
  participant F as Factory
  participant T as Tree

  U->>C: «Создать древо» + title
  C->>W: request sign SpawnTree
  W->>F: SpawnTree(Title)
  F-->>C: process_id
  C->>W: sign Init
  W->>T: Init(Title)
  T-->>C: Init-Response
  C->>C: local draft empty snapshot
  Note over C: Пользователь добавляет людей в draft
  C->>W: sign Commit v1
  W->>T: Commit(snapshot)
  T-->>C: Commit-Response (HEAD)
  C->>C: persist tree_id locally
```

## Локальный MVP (Phase 1)

Без Factory/Wallet: `createTree(title)` в `treeEngine.ts` создаёт local store.  
Genesis происходит при первом `commitDraft`.

## Ошибки

| Ситуация | Поведение |
|----------|-----------|
| Пользователь отклонил подпись | Abort, без process |
| Init уже был | `AlreadyInitialized` — продолжить с Info |
| Потеря process_id | восстановить через ListTrees / локальный backup |

## Артефакты после успеха

- `tree_id` (= process id)
- `head` commit v1
- local pointer в client storage
