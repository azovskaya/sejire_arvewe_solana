import type { ConfigChain, Config } from './config';
import { verifyChain, extendChain } from './config';
import { writeCache } from './cache';
let session:{chain:ConfigChain;config:Config;trusted:string}|undefined;
export const nativeSession=()=>session;
export async function trustChain(chain:ConfigChain,trusted:string) {
 const config=await verifyChain(chain,trusted);
 if(session){if(session.trusted!==trusted)throw Error('different_trust_anchor');await extendChain(session.chain,chain,trusted);}
 session={chain:structuredClone(chain),config,trusted};await writeCache('chain',chain);return session;
}
