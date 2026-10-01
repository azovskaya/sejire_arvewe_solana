import { useEffect, useState, useRef } from 'react';
import { LanguageSwitch } from './LanguageSwitch';
import { downloadJson } from '../lib/download';
import { CONFIG_DOMAIN, configHash, validateConfig, verifyChain, walletSignature, acceptancePayload, exactKeys, type Config, type ConfigChain, type SignedConfig } from '../lib/native/config';
import { cachedChain, cachedJobs, saveJob, writeCache, readCache } from '../lib/native/cache';
import { nativeSession, trustChain } from '../lib/native/session';
import { solWallet } from '../lib/native/payment';
import { configForJob, validateJob, parsePackage, archiveTags, reconcileJob, type NativeJob, type JobPackage } from '../lib/native/jobs';
import { arQuote, winston, signNative, uploadNative, validateArPlan, nativeStatus, retrieveNative, discoverConfig, type ArPlan, type ArWallet } from '../lib/native/arweave';
import { walletHistory } from '../lib/native/rpc';
import { formatAmount, parseAmount } from '../../../../packages/checkout/amounts';
import { canonical } from '../../../../packages/protocol/wire';
import { parseEnvelope } from '../lib/crypto/envelope';
import { verifyAudit, observePayment, type SignedAudit } from '../lib/native/audit';
import { nativeReceipt } from '../lib/native/receipt';
const tabs=['Обзор','Кошельки','Заказы и транзакции','Архивы','Фонд памяти поколений','Настройки и история','Релиз'] as const;
function arWallet():ArWallet {const w=(window as unknown as {arweaveWallet?:ArWallet}).arweaveWallet;if(!w)throw Error('arweave_extension_not_found');return w;}
function blankConfig():Config {return {domain:CONFIG_DOMAIN,project:'SEJIRE',version:1,previous:null,environment:'devnet',createdAt:Date.now(),nonce:crypto.randomUUID().replace(/-/g,''),serviceLamports:'30000000',wallets:{service:'ETWcxNPF3Qcwvo4NHYw6JhMiKnGwrvH1U9YEAQ3rZSWd',fund:'Gy3SSxP7spgDcserSfMckPd73LeSoxdrvXeNap7huLQN',arReserve:''},managers:[],threshold:1,solanaRpcs:['https://api.devnet.solana.com'],arweaveNodes:['https://arweave.net','https://ar-io.net','https://g8way.io'],arweaveNetwork:'arweave.N.1',upload:{maxBytes:1024*1024,maxRewardWinston:'0',acceptingUntil:0},identifiers:{protocol:null,release:null}};}
export function NativeAdminDesk({onHome}:{onHome:()=>void}) {
 const [tab,setTab]=useState<typeof tabs[number]>('Обзор'),[chain,setChain]=useState<ConfigChain|undefined>(nativeSession()?.chain),[trusted,setTrusted]=useState(nativeSession()?.trusted??'');
 const [draft,setDraft]=useState<SignedConfig>(()=>({config:blankConfig(),signatures:[],acceptance:[]})),[json,setJson]=useState(''),[info,setInfo]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [jobs,setJobs]=useState<NativeJob[]>([]),[selected,setSelected]=useState<string>(''),[search,setSearch]=useState(''),[publicState,setPublicState]=useState<unknown>(),[result,setResult]=useState<unknown>(),[cfgId,setCfgId]=useState(''),[gateway,setGateway]=useState('https://arweave.net');
 const [priceInput,setPriceInput]=useState('0.03');
 const [audit,setAudit]=useState<SignedAudit[]>([]);
 const [draftHash,setDraftHash]=useState(''),[configPlan,setConfigPlan]=useState<ArPlan|undefined>();
 const current=nativeSession()?.config,job=jobs.find(j=>j.order.id===selected);
 useEffect(()=>{cachedJobs().then(setJobs).catch(()=>{});readCache<SignedAudit[]>('audit').then(a=>setAudit(a??[])).catch(()=>{});cachedChain().then(value=>{if(value&&!nativeSession())setJson(JSON.stringify(value,null,2));}).catch(()=>{});},[]);
 useEffect(()=>{setPriceInput(formatAmount(draft.config.serviceLamports,9));configHash(draft.config).then(setDraftHash).catch(()=>setDraftHash(''));},[draft]);
 const lock=useRef(false);
 async function run(action:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');setInfo('');try{await action();}catch(e){setError(e instanceof Error?e.message:'operation_failed');}finally{lock.current=false;setBusy(false);}}
 function patch(update:Partial<Config>){setDraft({config:{...draft.config,...update},signatures:[],acceptance:[]});}
 async function active(){if(!chain)throw Error('trusted_configuration_required');return verifyChain(chain,trusted);}
 async function loadChain(value:ConfigChain){const s=await trustChain(value,trusted);setChain(s.chain);setInfo('Подписи и цепочка проверены. Публикация Arweave отдельно; кеш не является полномочием.');}
 async function refresh(){const c=await active();const sol=await Promise.all([walletHistory(c,c.wallets.service),walletHistory(c,c.wallets.fund)]);for(const v of sol)if(!Number.isSafeInteger(v.balance.value))throw Error('unsafe_rpc_balance');
 const ar=await arQuote(c.arweaveNodes,c.wallets.arReserve,1);const accounting=await verifyAudit(chain!,trusted,jobs,audit);setPublicState({signedPilotAccounting:accounting,network:c.environment,service:{address:c.wallets.service,balanceLamports:String(sol[0].balance.value),recentSignatures:sol[0].signatures,movements:sol[0].movements},fund:{address:c.wallets.fund,balanceLamports:String(sol[1].balance.value),recentSignatures:sol[1].signatures,movements:sol[1].movements},arReserve:ar,historyNote:'Последние 10 signatures; не полный бухгалтерский журнал. Статусы и суммы переводов сверяются отдельно.'});}
 async function importJob(text:string){const p=parsePackage(text);const c=await configForJob(p.chain,p.job,trusted);await validateJob(p.job,c);if(p.job.arPlan)await validateArPlan(p.job.arPlan,p.job.ciphertext!,archiveTags(p.job));await loadChain(p.chain);await saveJob(p.job);setJobs(await cachedJobs());setSelected(p.job.order.id);setInfo('Задание проверено и импортировано. Оплата пока требует RPC-сверки.');}
 async function verifySelected(){if(!job||!chain)throw Error('select_job');const c=await configForJob(chain,job,trusted);const verified=await reconcileJob(job,c,jobs);setResult({status:'Solana finalized / платёж проверен через выбранный RPC',...verified,execution:'Архив ещё не считается сохранённым'});}
 async function prepareUpload(){if(!job||!chain)throw Error('select_job');const c=await configForJob(chain,job,trusted);await reconcileJob(job,c,jobs);if((await verifyAudit(chain,trusted,jobs,audit)).conflicts.includes(job.order.id))throw Error('observer_evidence_conflict');if(!job.ciphertext)throw Error('donation_has_no_upload');if(job.arPlan)throw Error('existing_attempt_resume_only');
 const wallet=arWallet();await wallet.connect(['ACCESS_ADDRESS','ACCESS_PUBLIC_KEY','SIGN_TRANSACTION']);const quote=await arQuote(c.arweaveNodes,c.wallets.arReserve,job.order.archive!.bytes);setResult(quote);
 if(winston(quote.rewardWinston)>winston(c.upload.maxRewardWinston)||winston(quote.balanceWinston)<winston(quote.rewardWinston))throw Error('insufficient_ar_or_operational_budget');
 if(!window.confirm(`Arweave mainnet: подпись без отправки.\nПодписант: ${c.wallets.arReserve}\nРазмер: ${job.order.archive!.bytes}\nSHA-256: ${job.order.archive!.digest}\nМаксимум: ${quote.rewardWinston} winston.\nПубличны ciphertext и tags; ключ расшифровки не передаётся.`))return;
 if(!navigator.locks)throw Error('exclusive_browser_lock_unavailable');
 await navigator.locks.request('sejire-native-upload-'+job.order.id,async()=>{const old=(await cachedJobs()).find(j=>j.order.id===job.order.id);if(old?.arPlan)throw Error('existing_attempt_resume_only');job.arPlan=await signNative(c.arweaveNodes,wallet,c.wallets.arReserve,job.ciphertext!,archiveTags(job),quote.rewardWinston);await saveJob(job);});
 setJobs(await cachedJobs());downloadJson({schema:'sejire/native-job-package/v1',chain,job},`sejire-signed-upload-${job.order.id}.json`);setInfo('Подписанная транзакция сохранена до отправки. Сохраните переносимый файл на другом носителе.');}
 async function upload(){if(!job?.arPlan||!job.ciphertext||!chain)throw Error('signed_upload_required');const c=await configForJob(chain,job,trusted);await reconcileJob(job,c,jobs);if((await verifyAudit(chain,trusted,jobs,audit)).conflicts.includes(job.order.id))throw Error('observer_evidence_conflict');
 if(import.meta.env.VITE_NATIVE_AR_BROADCAST!=='1')throw Error('mainnet_broadcast_disabled_pending_owner_approval');
 if(!window.confirm(`Отправить ранее подписанную Arweave-транзакцию ${job.arPlan.id}?\nМаксимальный расход ${job.arPlan.rewardWinston} winston. Повтор отправляет те же байты.`))return;
 await navigator.locks.request('sejire-native-upload-'+job.order.id,async()=>{await uploadNative([gateway,...c.arweaveNodes],job.arPlan!,job.ciphertext!,archiveTags(job),async plan=>{job.arPlan=plan;await saveJob(job);},true);});setJobs(await cachedJobs());setInfo('Отправка завершена. Включение в сеть и получение данных проверяются отдельно.');}
 async function inspectArchive(){if(!job?.arPlan||!chain)throw Error('signed_upload_required');const c=await configForJob(chain,job,trusted);await validateArPlan(job.arPlan,job.ciphertext!,archiveTags(job));const status=await nativeStatus([gateway,...c.arweaveNodes],job.arPlan.id);let retrieval:unknown='NOT RUN';try{const fetched=await retrieveNative([gateway,...c.arweaveNodes],job.arPlan.id,job.order.archive!.digest,job.order.archive!.bytes);parseEnvelope(JSON.parse(fetched.text));retrieval={hash:'PASS',node:fetched.node,bytes:fetched.bytes.length};downloadJson(nativeReceipt(job),`sejire-native-receipt-${job.order.id}.json`);}catch(e){retrieval=e instanceof Error?e.message:'unavailable';}setResult({status,retrieval,decryption:'Восстановление выполняет пользователь со своими словами; админ ключ не получает.'});}
 async function signObservation(){if(!job||!chain)throw Error('select_job');const c=await configForJob(chain,job,trusted);const verified=await reconcileJob(job,c,jobs);const wallet=solWallet();await wallet.connect();if(!navigator.locks)throw Error('exclusive_browser_lock_unavailable');await navigator.locks.request('sejire-native-audit',async()=>{const old=await readCache<SignedAudit[]>('audit')??[];await verifyAudit(chain,trusted,jobs,old);const next=await observePayment(chain,trusted,jobs,old,job,verified.evidence,wallet);await writeCache('audit',next);setAudit(next);});setInfo('Подписанное наблюдение записано. Повтор не создаёт второй зачёт; это доверенный manager observer, не trustless proof.');}
 async function signConfiguration(accept=false){validateConfig(draft.config);if(chain){const c=await active();if(draft.config.previous!==await configHash(c)||draft.config.version!==c.version+1)throw Error('draft_not_successor');}
 const wallet=solWallet();await wallet.connect();const allowed=accept?draft.config.managers:(current??draft.config).managers;if(!wallet.publicKey||!allowed.includes(wallet.publicKey.toString()))throw Error('manager_not_authorized');
 const signature=await walletSignature(accept?acceptancePayload(draft.config):draft.config,wallet);
 setDraft({...draft,[accept?'acceptance':'signatures']:[...(accept?draft.acceptance:draft.signatures).filter(s=>s.publicKey!==signature.publicKey),signature]});setInfo('Подпись добавлена. Для применения нужны порог и отдельно доверенный genesis hash.');}
 async function publishConfiguration(){const c=await active();if(import.meta.env.VITE_NATIVE_AR_BROADCAST!=='1')throw Error('configuration_publication_disabled_pending_owner_approval');
 const value=canonical(chain);const tags=[{name:'Content-Type',value:'application/json'},{name:'App-Name',value:'SEJIRE'},{name:'Type',value:'signed-configuration-chain'}];const key='configuration-plan-'+await configHash(c);
 const old=await readCache<ArPlan>(key);let plan=old;
 if(!plan){const quote=await arQuote(c.arweaveNodes,c.wallets.arReserve,new TextEncoder().encode(value).length);setResult(quote);if(!window.confirm(`Публичная конфигурация Arweave mainnet. Максимум ${quote.rewardWinston} winston; без секретов. Подписать и отправить?`))return;const wallet=arWallet();await wallet.connect(['ACCESS_ADDRESS','ACCESS_PUBLIC_KEY','SIGN_TRANSACTION']);plan=await signNative(c.arweaveNodes,wallet,c.wallets.arReserve,value,tags,c.upload.maxRewardWinston);await writeCache(key,plan);downloadJson({chain,plan},'sejire-config-publication-attempt.json');}
 setConfigPlan(plan);await uploadNative(c.arweaveNodes,plan,value,tags,p=>writeCache(key,p),true);setInfo('Конфигурация отправлена; подтверждение включения проверьте по ID.');}
 return <main className="landing native-admin">
 <header><h1>SEJIRE · Админка протокола</h1><LanguageSwitch placement="welcome"/><button className="btn ghost" onClick={onHome}>На главную</button></header>
 <p>Ручной переносимый пилот · без обязательного облака и Turbo. AO live BLOCKED. Публикация сайта и ArNS отключены.</p>
 <nav aria-label="Разделы админки" className="actions">{tabs.map(t=><button className="btn ghost" aria-pressed={tab===t} key={t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
 {error&&<p role="alert">{error}</p>}{info&&<p role="status">{info}</p>}
 <section><h2>Доверенная конфигурация</h2><p>Первый посетитель не владелец. Genesis SHA-256 получите независимо от импортируемого файла, у уполномоченного владельца. Публичный адрес не разрешает расходование.</p>
 <label>Доверенный genesis SHA-256<input aria-label="Доверенный genesis SHA-256" value={trusted} onChange={e=>setTrusted(e.target.value.trim())}/></label>
 <label>Конфигурация или подписанное задание<input type="file" aria-label="Импорт конфигурации или задания" accept=".json" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void run(async()=>{if(f.size>30*1024*1024)throw Error('file_too_large');const text=await f.text(),p=JSON.parse(text);if(p.schema==='sejire/native-job-package/v1')await importJob(text);else if(p.schema==='sejire/native-workspace/v1'){exactKeys(p,['schema','chain','jobs','audit']);await loadChain(p.chain);for(const j of p.jobs){const c=await configForJob(p.chain,j,trusted);await validateJob(j,c);if(j.arPlan)await validateArPlan(j.arPlan,j.ciphertext!,archiveTags(j));}await verifyAudit(p.chain,trusted,p.jobs,p.audit);if(audit.length>p.audit.length||audit.some((a,i)=>canonical(a)!==canonical(p.audit[i])))throw Error('audit_conflict_or_rollback');for(const j of p.jobs)await saveJob(j);await writeCache('audit',p.audit);setAudit(p.audit);setJobs(await cachedJobs());setInfo('Подписанный workspace восстановлен. Полнота требует независимого head/checkpoint; это не AO.');}else await loadChain(p);});}}/></label>
 <label>Публичный JSON конфигурации<textarea aria-label="JSON конфигурации" rows={5} value={json} onChange={e=>setJson(e.target.value)}/></label>
 <button className="btn" disabled={busy} onClick={()=>void run(()=>loadChain(JSON.parse(json)))}>Проверить и восстановить конфигурацию</button>
 <label>Arweave transaction ID конфигурации<input value={cfgId} onChange={e=>setCfgId(e.target.value)}/></label><button className="btn ghost" disabled={busy} onClick={()=>void run(async()=>{const r=await discoverConfig([gateway],cfgId);await loadChain(r.chain);})}>Получить конфигурацию по ID</button>
 <p>{current?`Подписи проверены · версия ${current.version} · ${current.environment} · цена ${formatAmount(current.serviceLamports,9)} SOL. Наличие на Arweave отдельно проверяется по ID.`:'Черновик / доверенная конфигурация не загружена'}</p>
 </section>
 {(tab==='Кошельки'||tab==='Настройки и история')&&<section><h2>Новая версия настроек · Черновик</h2>
 <button className="btn ghost" disabled={busy} onClick={()=>void run(async()=>{if(!chain)return;const c=await active();setDraft({config:{...c,version:c.version+1,previous:await configHash(c),createdAt:Date.now(),nonce:crypto.randomUUID().replace(/-/g,'')},signatures:[],acceptance:[]});})}>Черновик следующей версии</button>
 <label>Сеть SOL<select value={draft.config.environment} onChange={e=>patch({environment:e.target.value as Config['environment']})}><option>devnet</option><option>mainnet-beta</option></select></label>
 {([['service','Основная казна SEJIRE'],['fund','Фонд памяти поколений SEJIRE'],['arReserve','AR-резерв основной казны SEJIRE']] as const).map(([key,title])=><label key={key}>{title}<input aria-label={title} value={draft.config.wallets[key]} onChange={e=>patch({wallets:{...draft.config.wallets,[key]:e.target.value.trim()}})}/></label>)}
 <p>Devnet-адреса предназначены только для devnet. Mainnet-казны задаются отдельно. AR-резерв пополняется владельцем в AR; автоматического SOL→AR нет.</p>
 <label>Цена SOL<input aria-label="Цена SOL" value={priceInput} onChange={e=>setPriceInput(e.target.value)} onBlur={()=>{try{patch({serviceLamports:parseAmount(priceInput,9)});}catch{setError('invalid_amount');}}}/></label>
 <label>Управляющие Solana public keys (по одному в строке)<textarea aria-label="Управляющие ключи" value={draft.config.managers.join('\n')} onChange={e=>patch({managers:e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)})}/></label>
 <label>Порог подписей конфигурации<input type="number" min={1} value={draft.config.threshold} onChange={e=>patch({threshold:Number(e.target.value)})}/></label><p>Это порог изменений конфигурации, не multisig Solana-казны.</p>
 <label>Solana RPC<textarea aria-label="Solana RPC" value={draft.config.solanaRpcs.join('\n')} onChange={e=>patch({solanaRpcs:e.target.value.split('\n').filter(Boolean)})}/></label>
 <label>Arweave узлы<textarea aria-label="Arweave узлы" value={draft.config.arweaveNodes.join('\n')} onChange={e=>patch({arweaveNodes:e.target.value.split('\n').filter(Boolean)})}/></label>
 <label>Технический предел архива (байт)<input type="number" value={draft.config.upload.maxBytes} onChange={e=>patch({upload:{...draft.config.upload,maxBytes:Number(e.target.value)}})}/></label>
 <label>Максимальный расход одной загрузки (winston)<input value={draft.config.upload.maxRewardWinston} onChange={e=>patch({upload:{...draft.config.upload,maxRewardWinston:e.target.value}})}/></label>
 <button className="btn ghost" onClick={()=>patch({upload:{...draft.config.upload,acceptingUntil:Date.now()+30*60*1000}})}>Объявить ручного исполнителя доступным на 30 минут</button><button className="btn ghost" onClick={()=>patch({upload:{...draft.config.upload,acceptingUntil:0}})}>Остановить новые сохранения</button>
 <p>Это подписываемое обещание ручного исполнителя; доступность не гарантируется балансом. Лимит расходов не ограничивает входящие взносы.</p>
 <button className="btn" disabled={busy} onClick={()=>void run(()=>signConfiguration())}>Подписать настройки через Phantom</button>
 <button className="btn" disabled={busy} onClick={()=>void run(()=>signConfiguration(true))}>Подтвердить принятие полномочий новым ключом</button>
 <p>Подписи: {draft.signatures.length}; принятие: {draft.acceptance.length}. Genesis hash: <code style={{overflowWrap:'anywhere'}}>{draftHash}</code></p>
 <button className="btn ghost" onClick={()=>downloadJson(draft,'sejire-config-draft.json')}>Экспорт подписываемого черновика</button>
 <label>Импорт черновика с дополнительными подписями<input type="file" accept=".json" onChange={e=>{const f=e.target.files?.[0];if(f)void run(async()=>{if(f.size>100000)throw Error('file_too_large');const p=JSON.parse(await f.text());exactKeys(p,['config','signatures','acceptance']);validateConfig(p.config);setDraft(p);});}}/></label>
 <button className="btn" disabled={busy} onClick={()=>void run(async()=>{await loadChain({schema:'sejire/config-chain/v1',versions:[...(chain?.versions??[]),draft]});})}>Проверить и применить подписанную версию</button>
 <button className="btn ghost" disabled={!chain} onClick={()=>downloadJson(chain,'sejire-config-chain.json')}>Экспорт цепочки конфигурации</button>
 <button className="btn ghost" disabled={busy||!chain||import.meta.env.VITE_NATIVE_AR_BROADCAST!=='1'} title="Mainnet публикация требует отдельного разрешения и сборки" onClick={()=>void run(publishConfiguration)}>Опубликовать конфигурацию в Arweave (сейчас отключено)</button>
 {configPlan&&<p>Publication attempt: {configPlan.id}</p>}
 <button className="btn ghost" disabled={!chain} onClick={()=>void run(async()=>{await verifyAudit(chain!,trusted,jobs,audit);downloadJson({schema:'sejire/native-workspace/v1',chain,jobs,audit},'sejire-native-workspace.json');})}>Экспорт настроек, заданий и подписанной истории</button>
 <h3>Подписанные наблюдения администратора</h3><pre>{JSON.stringify(audit,null,2)}</pre>
 <h3>Подписанная история версий</h3><pre>{JSON.stringify(chain?.versions.map(v=>({version:v.config.version,previous:v.config.previous,price:v.config.serviceLamports,wallets:v.config.wallets,signers:v.signatures.map(s=>s.publicKey)})),null,2)}</pre>
 </section>}
 {(tab==='Обзор'||tab==='Кошельки'||tab==='Фонд памяти поколений')&&<section><h2>Публичные балансы и транзакции</h2><button className="btn" disabled={busy||!chain} onClick={()=>void run(refresh)}>Проверить сети и балансы</button><pre>{publicState?JSON.stringify(publicState,null,2):'NOT RUN · баланс неизвестен до запроса сети'}</pre>
 <p>Поступления/расходы смотрите по signatures с независимой сверкой. Эти последние 10 записей не являются полным учётом. AO-журнал пока недоступен; программы помощи не запущены.</p>
 {tab==='Фонд памяти поколений'&&<><p>Переводы фонда требуют его кошелька/настоящего multisig. Расходы фонда в этом пилоте недоступны; автоматического использования для хранения нет.</p><button disabled>Расход фонда: механизм управления казной не настроен</button></>}
 </section>}
 {(tab==='Заказы и транзакции'||tab==='Архивы'||tab==='Обзор')&&<section><h2>Переносимые заказы</h2><label>Поиск заказа<input aria-label="Поиск заказа" value={search} onChange={e=>setSearch(e.target.value)}/></label>
 <select aria-label="Выбранный заказ" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Выберите заказ</option>{jobs.filter(j=>canonical(j.order).includes(search)).map(j=><option key={j.order.id} value={j.order.id}>{j.order.id} · {j.order.kind} · {formatAmount(j.order.total,9)} SOL</option>)}</select>
 <p>Импорт через поле выше — реальная передача задания. Кеш браузера не общедоступная очередь. Сохраняйте переносимые файлы между машинами.</p>
 {job&&<><pre>{JSON.stringify({order:job.order,signature:job.paymentSignature??'NOT PROVIDED',arId:job.arPlan?.id??'NOT PREPARED'},null,2)}</pre>
 <button className="btn" disabled={busy} onClick={()=>void run(verifySelected)}>Сверить оплату через RPC</button>
 <button className="btn ghost" disabled={busy} onClick={()=>void run(signObservation)}>Подписать проверенное наблюдение оплаты</button>
 <button className="btn ghost" onClick={()=>downloadJson({schema:'sejire/native-job-package/v1',chain:chain!,job} satisfies JobPackage,`sejire-job-${job.order.id}.json`)}>Экспорт задания и попытки загрузки</button>
 <button className="btn" disabled={busy||!job.ciphertext||Boolean(job.arPlan)} onClick={()=>void run(prepareUpload)}>Проверить quote и подписать нативную Arweave-транзакцию</button>
 <button className="btn" disabled={busy||!job.arPlan||import.meta.env.VITE_NATIVE_AR_BROADCAST!=='1'} title="Mainnet расход требует отдельного разрешения" onClick={()=>void run(upload)}>Отправить / продолжить те же чанки (сейчас отключено)</button>
 <label>Другой Arweave gateway<input aria-label="Другой Arweave gateway" value={gateway} onChange={e=>setGateway(e.target.value)}/></label>
 <button className="btn ghost" disabled={busy||!job.arPlan} onClick={()=>void run(inspectArchive)}>Проверить включение, получить и сверить SHA-256</button>
 <button className="btn ghost" disabled={!job.ciphertext} onClick={()=>downloadJson(JSON.parse(job.ciphertext!),`encrypted-backup-${job.order.id}.json`)}>Скачать ciphertext для восстановления</button>
 </>}
 <pre>{result?JSON.stringify(result,null,2):'Оплата, отправка, включение и получение — отдельные проверки, NOT RUN'}</pre>
 </section>}
 {tab==='Релиз'&&<section><h2>Самодостаточный релиз</h2><p>Сборка содержит локальные JS/CSS/assets. Continuation package уже существует. Полная проверка «исчезло всё наше» и permanent release ещё не выполнены.</p><button disabled>Публикация сайта и ArNS отключена</button></section>}
 </main>;
}
