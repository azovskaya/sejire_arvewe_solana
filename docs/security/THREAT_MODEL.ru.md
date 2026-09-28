# Threat Model (v0.2)

## Assets

| Asset | Sensitivity |
|-------|-------------|
| Family graph (names, dates, relations) | High (personal) |
| Media blobs | High |
| Owner keys | Critical |
| Commit history integrity | Critical |
| Process availability | Medium (gateways replaceable) |

## Trust boundaries

```
[User device] --sign--> [HyperBEAM/AO] --log--> [Arweave]
[User device] --upload--> [Arweave gateways]
```

SEJIRE operators MUST NOT hold user seeds.

## Threats & mitigations

| Threat | Mitigation |
|--------|------------|
| Operator deletes user data | Impossible for committed AO/Arweave data; no central DB of truth |
| Malicious gateway serves wrong bytes | Verify TX id / Wayfinder; compare across gateways |
| Stolen owner key | AddOwner multi-custody; future Shamir; educate user |
| Stale client overwrites | `StaleParent` reject |
| User impulse-deletes ancestors | Soft tombstone + immutable history |
| Spam commits by compromised owner | Future rate limit / quorum |
| Privacy leak (v1 public read) | ADR-0005; encrypt before personal mainnet use |
| UI supply-chain attack | Pin builds; prefer permaweb-hosted UI with hash |

## Non-goals (v0.2)

- Legal identity verification
- Court-admissible chain-of-custody certification
- Automatic DNA match privacy
