# Process: Factory

**Code:** [`ao/processes/factory.lua`](../../ao/processes/factory.lua)  
**Role:** Реестр и порождение Tree Processes.

---

## 1. Назначение

1. Spawn нового Tree Process по запросу owner.
2. Вести каталог `{ tree_process_id → meta }` для discoverability.
3. Не хранить графы — только указатели на Tree Processes.

Почему отдельно от Tree:

- Один Factory на протокол / организацию.
- Деревья живут независимо (если Factory недоступен UX-ом, деревья продолжают работать).
- Проще выдавать `ListTrees` для кошелька.

---

## 2. Состояние

```lua
Factory = {
  protocol = "sejire/factory/v1",
  trees = {
    [process_id] = {
      process_id = string,
      title = string,
      owner = string,
      created_at = string,
      spawn_msg = string | nil
    }
  },
  by_owner = {
    [address] = { process_id, ... }  -- array
  }
}
```

---

## 3. Handlers

### 3.1 `Info`

Возвращает `{ protocol, release, tree_count, process = ao.id }`.

### 3.2 `SpawnTree`

**Tags:** `Action=SpawnTree`, optional `Title`  
**Auth:** любой подписанный адрес (caller становится owner записи Factory; Tree `Init` делает его owner процесса)

**Алгоритм:**

1. `title ← Tags.Title or "Untitled Family Tree"`
2. `ao.spawn(module, Tags{ App-Name=SEJIRE, Role=Tree, ... })`
3. Записать meta в `Factory.trees` и `by_owner[msg.From]`
4. Ответить `SpawnTree-Response` с `process_id`, `title`
5. Клиент MUST затем отправить `Init` + первый `Commit` в новый Tree Process

### 3.3 `RegisterTree`

Ручная регистрация уже созданного Tree Process (`Process-Id` + optional `Title`), если spawn шёл вне Factory.

### 3.4 `ListTrees`

**Tags:** `Action=ListTrees`, optional `Owner`  
Если `Owner` не задан — список деревьев `msg.From`.  
Ответ: массив meta.

### 3.5 `Ping`

`Pong` / `sejire-factory-ok`.

---

## 4. Границы ответственности

| Делает Factory | Не делает Factory |
|----------------|-------------------|
| spawn + реестр указателей | хранение persons |
| list by owner | kinship queries |
| | media upload |

---

## 5. Отказоустойчивость

- Потеря записи в Factory ≠ потеря Tree Process (process id можно хранить у пользователя / в ArNS).
- Factory SHOULD быть восстанавливаем из holographic log.
- Клиент SHOULD сохранять `tree_id` локально после spawn.
