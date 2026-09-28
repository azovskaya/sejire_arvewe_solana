# ADR-0005: Public read, owner write (v1)

## Status

Accepted (bootstrap)

## Context

Encryption + private trees are a product goal, but block correct protocol wiring and public verifiability during MVP.

## Decision

v1:

- Read handlers (`Info`, `History`, `Get*`) are public  
- Mutations require owner  

Production SHOULD add client-side encryption before mainnet family data (see security docs).  
Public read remains useful for opt-in open archives / cultural heritage trees.

## Consequences

+ Faster MVP, auditable  
− Names/dates visible on-chain until encryption ships  
→ Must document clearly in UX before mainnet personal data  
