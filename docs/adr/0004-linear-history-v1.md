# ADR-0004: Linear history only (protocol v1)

## Status

Accepted (v1)

## Context

Git branches are powerful but complex for non-technical family users. Concurrent owners can create conflicts.

## Decision

v1 enforces **linear history**: `parent_commit_id` MUST equal current HEAD or commit is rejected (`StaleParent`).  
Manual merge in the client, then new commit.

Branching / PRs for trees deferred to a later ADR.

## Consequences

+ Simple mental model  
+ Clear conflict signal  
− Concurrent editors need coordination  
