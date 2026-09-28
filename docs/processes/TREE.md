# Process: Tree

**Code:** [`ao/processes/tree.lua`](../../ao/processes/tree.lua)  
**Schema:** `sejire/commit/v1`  
**Role:** Автономный actor одного семейного древа.

---

## 1. Назначение

Хранит:

- метаданные древа (`title`, `owners`, `created_at`)
- линейную цепочку immutable commits
- указатель `head`
- индекс `versions[n] → commit_id`

Вычисляет:

- историю фиксаций
- любое прошлое состояние графа
- queries родства v0.3: `GetAncestors`, `GetJetiAta`, `Relate` (по HEAD или `Commit-Id`)

---

## 2. Состояние (in-memory / holographic)

```lua
Tree = {
  id = ao.id,
  title = string,
  owners = { [address] = true },
  head = commit_id | nil,
  commits = { [commit_id] = Commit },
  versions = { [version_number] = commit_id },
  next_version = number,  -- next free version (starts at 1)
  created_at = string | nil
}
```

Состояние восстанавливается из лога AO-сообщений (holographic state).  
Потеря UI / «серверов SEJIRE» не уничтожает Tree Process.

---

## 3. Жизненный цикл

```
spawn (Factory или вручную)
   │
   ▼
Init (title, bootstrap owner)
   │
   ▼
Commit v1 (genesis snapshot)
   │
   ▼
Commit v2..n  ◄── каждое дополнение / tombstone / правка
   │
   ├── GetHead / GetCommit / History  (чтение)
   └── AddOwner / RemoveOwner         (ACL)
```

---

## 4. Handlers — логика

### 4.1 `Ping`

- **Вход:** `Action=Ping`
- **Логика:** healthcheck
- **Выход:** `Action=Pong`, Data=`sejire-ok`

### 4.2 `Info`

- **Вход:** `Action=Info`
- **Логика:** отдать метаданные без полного snapshot
- **Выход:** JSON `{ protocol, process, title, head, version_count, owners, created_at }`

### 4.3 `Init`

- **Предусловие:** `Tree.created_at == nil`, иначе `AlreadyInitialized`
- **Логика:**
  1. Установить `title` из `Tags.Title` (или default)
  2. `created_at ← msg.Timestamp`
  3. `owners[msg.From] = true`
  4. `patch_http()`
- **Выход:** `Init-Response`

### 4.4 `Commit`  ★ критический

- **Предусловие:** `is_owner(msg.From)` (с bootstrap, если owners пуст)
- **Data JSON:**
  ```json
  {
    "message": "string",
    "parent_commit_id": "c_… | null",
    "title": "optional rename",
    "snapshot": { "persons": { } }
  }
  ```
- **Алгоритм:**
  1. Decode JSON; иначе `BadPayload`
  2. Validate `snapshot.persons` table; иначе `BadSnapshot`
  3. If `parent_commit_id` provided and ≠ `Tree.head` → `StaleParent`
  4. `version ← next_version`
  5. `commit_id ← "c_" .. version .. "_" .. msg.Id|Timestamp`
  6. Persist commit immutably into `commits` + `versions`
  7. `head ← commit_id`; `next_version += 1`
  8. Optional title update
  9. `patch_http()`
  10. Reply `Commit-Response` with full commit JSON
- **Инвариант:** существующие `commits[*]` не изменяются

### 4.5 `GetHead`

- Если `head == nil` → `{ head: null, commit: null }`
- Иначе вернуть commit по `head`

### 4.6 `GetCommit`

- Tag `Commit-Id` обязателен
- Если нет → `NotFound`
- Иначе полный commit JSON

### 4.7 `History`

- Вернуть список summary по `versions[1..n-1]` (ascending в ответе процесса; UI может reverse)
- Summary: `commit_id, version, parent_commit_id, author, created_at, message, person_count`

### 4.8 `AddOwner`

- Только owner
- Tag `Address` обязателен
- `owners[Address] = true`

### 4.9 `RemoveOwner`

- Только owner
- Нельзя удалить последнего owner → `LastOwner`
- `owners[Address] = nil`

### 4.10 `GetAncestors`

- Snapshot: HEAD, либо `Tags["Commit-Id"]`
- `Person-Id` обязателен
- BFS вверх по `parents[]`, включая self на distance 0 (tombstone не раскрывает родителей)
- Optional `Max-Depth` (число) отфильтровывает более дальних
- Ответ: `sejire/ancestors/v1`, список отсортирован по distance, затем id

### 4.11 `GetJetiAta`

- Та же резолюция snapshot, что у GetAncestors
- Мужская линия: отец как в SPA `splitParents` (`sex=M`, иначе первый оставшийся родитель)
- generation 0 = focus, максимум 7 человек
- `complete=true` если линия заполнена до 7
- tombstone / отсутствие focus → `NotFound`

### 4.12 `Relate`

- Tags `Person-A`, `Person-B` обязательны
- LCA по сумме шагов `da+db`; `code` — A относительно B
- `unrelated` если нет общего предка в снимке
- Не мутирует состояние

---

## 5. Коды ошибок

| Error-Code | Когда |
|------------|-------|
| `AlreadyInitialized` | повторный Init |
| `Unauthorized` | не owner |
| `BadPayload` | Data не JSON-object |
| `BadSnapshot` | нет `snapshot.persons` |
| `StaleParent` | строковый parent ≠ HEAD |
| `NotFound` | неизвестный Commit-Id / Person-Id |
| `BadAddress` | пустой Address |
| `LastOwner` | попытка удалить единственного owner |
| `EmptyTree` | kinship-запрос до первого Commit |
| `BadPersonId` | нет Person-Id / Person-A+Person-B |

---

## 6. HyperBEAM patch

После Init/Commit/AddOwner/RemoveOwner процесс SHOULD публиковать:

```lua
Send({ device = "patch@1.0", sejire = { title, head, version_count, owners } })
```

HTTP (пример):

```
https://push.forward.computer/<pid>~process@1.0/compute/sejire
```

---

## 7. Соответствие клиенту

Локальный engine `apps/web/src/lib/treeEngine.ts` MUST зеркалить правила commit/history.  
Тестовый двойник процесса: `apps/web/src/lib/ao/treeProcess.ts` (selftest `npm run test:protocol`).

- linear parent check (string parent only)
- full snapshot commits
- tombstone soft-delete
- history enumeration
- GetAncestors / GetJetiAta / Relate

При расхождении — **норматив = этот документ + Lua**.
