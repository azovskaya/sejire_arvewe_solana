# ADR-0003: Two-tier storage (graph vs media)

## Status

Accepted

## Context

Photos/scans are large and format-fragile. Putting binaries into AO process state is expensive and harms longevity of the *logical* tree.

## Decision

- **AO / commits:** facts + relationships + `media[]` refs  
- **Arweave data items:** actual media bytes  
- UI resolves `tx` via gateways / Wayfinder

## Consequences

+ Cheap commits, durable graph  
+ Media still permanent  
− Two upload steps in UX  
− Gateway choice affects preview speed, not permanence  
