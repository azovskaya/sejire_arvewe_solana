# Flow 04 — Прикрепить медиа

## Цель

Сохранить фото/скан вечно, не раздувая AO state.

## Двухуровневое хранение

```
[Upload blob] → Arweave data item → txid
[Commit] → person.media[] += { tx: txid, kind, caption }
```

## Шаги

1. Пользователь выбирает файл в UI
2. Client загружает на Arweave (Irys/Turbo/HyperBEAM path) → `txid`
3. Draft: добавить media ref к person
4. `Commit` с обновлённым snapshot
5. UI рендерит медиа через gateway: `https://<gateway>/<txid>` или `ar://txid`

## Правила

- В AO MUST NOT класть base64 файла
- `kind` ∈ { image, document, audio, other }
- Потеря gateway ≠ потеря файла (другие gateways / Wayfinder)

## Phase 1 MVP

Поле «Media TX» вручную (пользователь вставляет txid). Upload automation — Phase 2.
