# Flow 05 — Добавить совладельца

## Цель

Семейный доступ: несколько адресов могут делать Commit.

## Шаги

1. Owner открывает ACL UI
2. Вводит Arweave address родственника
3. `AddOwner` + Tag `Address`
4. Новый owner может `Commit`
5. `RemoveOwner` — нельзя удалить последнего (`LastOwner`)

## Риски

- Скомпрометированный owner может спамить commits (не стереть историю, но засорить)
- Mitigation Phase 2: quorum N-of-M, rate limits, social recovery

## Рекомендация UX

Показывать предупреждение: совладелец получает полные права Commit навсегда в рамках ACL v1.
