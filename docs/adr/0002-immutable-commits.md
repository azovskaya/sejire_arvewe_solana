# ADR-0002: Immutable full-snapshot commits

## Status

Accepted

## Context

We need git-like auditability: descendants must see how the tree was built, not only the latest result.

Deltas are compact but make random historical reads O(n) and error-prone.

Genealogical JSON is small (names/dates/links).

## Decision

Each `Commit` stores a **full snapshot** of `persons`.  
Commits are immutable. Soft-delete uses `tombstone`.

## Consequences

+ O(1) historical read  
+ Simpler verification  
− Larger messages than deltas (acceptable for text graphs)  
