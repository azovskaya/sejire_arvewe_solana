# Documentation sync checklist

При изменении логики **обязательно** обновить связанные артефакты в том же PR:

## AO handler change

- [ ] `ao/processes/<name>.lua`
- [ ] `docs/processes/<NAME>.md` (алгоритм + ошибки)
- [ ] `docs/processes/MESSAGE_CATALOG.md`
- [ ] `packages/schema/messages.catalog.json`
- [ ] Flow docs in `docs/flows/` if UX path changed
- [ ] ADR if decision changed

## Schema / payload change

- [ ] `packages/schema/*.schema.json`
- [ ] `docs/PROTOCOL.md` section
- [ ] `apps/web/src/lib/types.ts` + `treeEngine.ts`
- [ ] `apps/web` selftest

## New process

- [ ] Lua + process markdown
- [ ] Index rows in `docs/processes/README.md` and `ao/README.md`
- [ ] Catalog entries

Норматив при конфликте: `docs/PROTOCOL.md` > process markdown > code comments.
