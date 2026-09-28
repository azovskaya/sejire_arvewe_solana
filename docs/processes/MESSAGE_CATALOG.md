# Message Catalog (normative)

Все сообщения SEJIRE используют AO Tags.  
Общие Tags: `Action` (required), опционально `Data` (JSON string).

Ответы: `Action=<Name>-Response` или `Action=Error` + `Error-Code`.

---

## Tree Process

### `Ping`

| | |
|--|--|
| Tags | `Action=Ping` |
| Data | — |
| Response | `Action=Pong`, Data=`sejire-ok` |

### `Info`

| | |
|--|--|
| Tags | `Action=Info` |
| Response Data | `{ protocol, release, process, title, head, version_count, owners, created_at, queries }` |

### `Init`

| | |
|--|--|
| Tags | `Action=Init`, `Title?` |
| Auth | bootstrap owner = `msg.From` |
| Errors | `AlreadyInitialized` |

### `Commit`

| | |
|--|--|
| Tags | `Action=Commit` |
| Auth | owner (or bootstrap) |
| Data | `{ message?, parent_commit_id?, title?, snapshot: { persons } }` |
| Response Tags | `Commit-Id`, `Version` |
| Errors | `Unauthorized`, `BadPayload`, `BadSnapshot`, `StaleParent` |

`parent_commit_id`: only a **string** is checked against HEAD. Omit / JSON `null` = use HEAD.

### `GetHead`

| | |
|--|--|
| Tags | `Action=GetHead` |
| Response Data | `{ head, commit }` |

### `GetCommit`

| | |
|--|--|
| Tags | `Action=GetCommit`, `Commit-Id` |
| Errors | `NotFound` |

### `History`

| | |
|--|--|
| Tags | `Action=History` |
| Response Data | `{ head, commits: HistoryItem[] }` |

### `AddOwner`

| | |
|--|--|
| Tags | `Action=AddOwner`, `Address` |
| Auth | owner |
| Errors | `Unauthorized`, `BadAddress` |

### `RemoveOwner`

| | |
|--|--|
| Tags | `Action=RemoveOwner`, `Address` |
| Auth | owner |
| Errors | `Unauthorized`, `BadAddress`, `LastOwner` |

### `GetAncestors`

| | |
|--|--|
| Tags | `Action=GetAncestors`, `Person-Id`, `Max-Depth?`, `Commit-Id?` |
| Auth | public |
| Response schema | `sejire/ancestors/v1` |
| Errors | `EmptyTree`, `BadPersonId`, `NotFound` |

### `GetJetiAta`

| | |
|--|--|
| Tags | `Action=GetJetiAta`, `Person-Id`, `Commit-Id?` |
| Auth | public |
| Response schema | `sejire/jeti-ata/v1` |
| Errors | `EmptyTree`, `BadPersonId`, `NotFound` |

Paternal line, generation 0 = focus, max 7 people.

### `Relate`

| | |
|--|--|
| Tags | `Action=Relate`, `Person-A`, `Person-B`, `Commit-Id?` |
| Auth | public |
| Response schema | `sejire/relate/v1` |
| Errors | `EmptyTree`, `BadPersonId`, `NotFound` |

`code` describes A relative to B. See `packages/schema/kinship-codes.json`.

---

## Factory Process

### `Ping`

Response Data: `sejire-factory-ok`

### `Info`

`{ protocol, release, process, tree_count }`

### `SpawnTree`

| | |
|--|--|
| Tags | `Action=SpawnTree`, `Title?` |
| Response Data | `{ process_id, title, owner, created_at }` |

### `RegisterTree`

| | |
|--|--|
| Tags | `Action=RegisterTree`, `Process-Id`, `Title?` |
| Errors | `BadProcessId` |

### `ListTrees`

| | |
|--|--|
| Tags | `Action=ListTrees`, `Owner?` |
| Response Data | `{ owner, trees: TreeMeta[] }` |

---

## App Tags (рекомендуемые на всех исходящих)

Клиент SHOULD добавлять:

| Tag | Value |
|-----|-------|
| `App-Name` | `SEJIRE` |
| `Protocol` | `sejire/v0.3` |
| `Content-Type` | `application/json` (если Data JSON) |

Это упрощает GraphQL/индексацию на gateway.
