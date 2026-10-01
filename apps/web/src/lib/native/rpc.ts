/** Replaceable PUBLIC RPC observer. This is RPC trust, not a trustless cross-chain proof. */
import { SolanaRpcReader } from '../../../../../apps/sponsor/src/checkout/rpcReader';
import { decodeTransaction, object } from '../../../../../apps/sponsor/src/checkout/rpcDecoder';
import { validatePayment } from '../../../../../apps/sponsor/src/checkout/paymentValidator';
import type { Order } from '../../../../../packages/checkout/order';
import { assertBase58 } from '../../../../../packages/checkout/order';
import { endpoint, GENESIS, type Config } from './config';
export async function rpc<T>(url:string,method:string,params:unknown[]=[],transport:typeof fetch=fetch):Promise<T> {
 // Reuse existing bounded JSON/timeout/status validation; only routing differs in this optional public adapter.
 const reader = new SolanaRpcReader({network:'devnet'},(_ignored,init)=>transport(endpoint(url),init));
 return await reader.rpc(method,params) as T;
}
export async function onRpc<T>(c:Config,action:(url:string)=>Promise<T>):Promise<T> {
 let last:unknown = Error('rpc_unavailable');
 for(const url of c.solanaRpcs) try { if(await rpc(url,'getGenesisHash') !== GENESIS[c.environment]) throw Error('wrong_network'); return await action(url); } catch(e){last=e;}
 throw last;
}
export async function verifyPaymentRpc(c:Config,order:Order,signature:string) {
 assertBase58(signature,64);
 if(order.network !== c.environment) throw Error('order_network');
 return onRpc(c,async url=>{
  const statusResult=object(await rpc(url,'getSignatureStatuses',[[signature],{searchTransactionHistory:true}]));
  if(!Array.isArray(statusResult.value)||statusResult.value.length!==1) throw Error('missing_metadata');
  if(statusResult.value[0]===null)throw Error('requires_reconciliation');
  const status=object(statusResult.value[0]),context=object(statusResult.context);
  if(status.confirmationStatus!=='finalized')throw Error('requires_reconciliation');
  if(status.err!==null)throw Error('transaction_failed');
  if(status.confirmations!==null||!Number.isSafeInteger(status.slot)||typeof context.slot!=='number'||context.slot<(status.slot as number))throw Error('missing_metadata');
  const result=await rpc(url,'getTransaction',[signature,{commitment:'finalized',encoding:'json',maxSupportedTransactionVersion:0}]);
  if(result===null)throw Error('requires_reconciliation');
  const chain={network:c.environment,genesisHash:GENESIS[c.environment]};
  const evidence=decodeTransaction(result,signature,chain);
  if(evidence.slot!==status.slot)throw Error('missing_metadata');
  return {evidence,payment:validatePayment(order,evidence,chain),rpc:url,checkedAt:new Date().toISOString()};
 });
}
export async function walletHistory(c:Config,address:string) {
 assertBase58(address,32);
 return onRpc(c,async url=>{
 const balance=await rpc<{value:number}>(url,'getBalance',[address,{commitment:'finalized'}]);
 if(!Number.isSafeInteger(balance.value))throw Error('unsafe_rpc_balance');
 const signatures=await rpc<{signature:string;err:unknown}[]>(url,'getSignaturesForAddress',[address,{limit:10,commitment:'finalized'}]);
 if(!Array.isArray(signatures)||signatures.length>10)throw Error('invalid_history');
 const movements=await Promise.all(signatures.map(async item=>{
 try{assertBase58(item.signature,64);const tx=object(await rpc(url,'getTransaction',[item.signature,{commitment:'finalized',encoding:'json',maxSupportedTransactionVersion:0}]));
 const meta=object(tx.meta),message=object(object(tx.transaction).message);
 if(!Array.isArray(message.accountKeys)||!Array.isArray(meta.preBalances)||!Array.isArray(meta.postBalances))throw Error('missing_balance_metadata');
 const keys=[...message.accountKeys,...((meta.loadedAddresses as {writable?:unknown[]})?.writable??[]),...((meta.loadedAddresses as {readonly?:unknown[]})?.readonly??[])];
 const index=keys.indexOf(address),before=meta.preBalances[index],after=meta.postBalances[index];
 if(index<0||!Number.isSafeInteger(before)||!Number.isSafeInteger(after)||!Number.isSafeInteger(meta.fee))throw Error('unsafe_balance_metadata');
 return {signature:item.signature,success:meta.err===null,balanceDeltaLamports:(BigInt(after)-BigInt(before)).toString(),networkFeeLamports:String(meta.fee),note:'Изменение баланса включает комиссию плательщика; это не service/fund credit.'};
 }catch{return {signature:item.signature,status:'requires_reconciliation'};}
 }));
 return {balance,signatures,movements,rpc:url};
 });
}
