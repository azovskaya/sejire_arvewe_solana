# SEJIRE Schemas

JSON Schema (Draft 2020-12) for protocol payloads.

| File | Used by |
|------|---------|
| `person-v1.schema.json` | Person node inside snapshot |
| `commit-v1.schema.json` | Immutable commit / `Action=Commit` Data |
| `envelope-v1.schema.json` | Encrypted vault published to Arweave |
| `tree-v1.schema.json` | Legacy aggregate (prefer commit stream) |
| `ancestors-v1.schema.json` | `Action=GetAncestors` response |
| `jeti-ata-v1.schema.json` | `Action=GetJetiAta` response |
| `relate-v1.schema.json` | `Action=Relate` response |
| `kinship-codes.json` | Language-neutral Relate codes |
| `messages.catalog.json` | Machine-readable message catalog |

Normative prose: [`docs/PROTOCOL.md`](../../docs/PROTOCOL.md).
