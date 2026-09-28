# Flow 06 — Восстановить древо

## Цель

На новом устройстве получить доступ к тому же Tree Process.

## Источники истины (по приоритету)

1. `tree_id` (AO process id), сохранённый пользователем
2. Factory `ListTrees` для кошелька
3. ArNS name → указатель на app/process
4. Локальный backup export JSON (client)

## Шаги

1. Подключить тот же wallet
2. `ListTrees` или ввести `tree_id`
3. `Info` + `GetHead` + `History`
4. Отрисовать HEAD; история доступна

## Потеря seed/ключа

Без ключа owner:

- чтение публичной истории — возможно (v1 public read)
- новые commits — невозможны
- Mitigation: заранее `AddOwner` доверенным адресам / Shamir (Phase 3)

## Export

Client SHOULD уметь экспортировать:

```json
{ "tree_id", "head", "commits": [ /* optional cache */ ] }
```

Export — удобство; канон остаётся в AO/Arweave.
