import { test, expect } from '@playwright/test';
const genesis='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
async function fixtures(page) {
 const forbidden=[],network={tx:null,sends:0,loseResponse:false};
 await page.route('**/*',async route=>{
 const url=route.request().url();
 if(/ardrive|turbo|workers\.dev|\/api\/checkout\//.test(url)){forbidden.push(url);await route.abort();return;}
 if(url.endsWith('/graphql'))return route.fulfill({json:{data:{transactions:{edges:[]}}}});
 if(url.startsWith('https://arweave.net/')){
 const path=new URL(url).pathname;
 if(path==='/info')return route.fulfill({json:{network:'arweave.N.1',height:100,version:5}});
 if(path.startsWith('/price/'))return route.fulfill({contentType:'text/plain',body:'1000'});
 if(path.endsWith('/balance'))return route.fulfill({contentType:'text/plain',body:'100000'});
 throw Error('unexpected AR fixture '+path);
 }
 if(url.startsWith('https://api.devnet.solana.com')) {
 const p=route.request().postDataJSON();let result;
 if(p.method==='getGenesisHash')result=genesis;
 else if(p.method==='getLatestBlockhash')result={context:{slot:100},value:{blockhash:'11111111111111111111111111111111',lastValidBlockHeight:200}};
 else if(p.method==='getFeeForMessage')result={context:{slot:100},value:5000};
 else if(p.method==='getBalance')result={context:{slot:100},value:1000000000};
 else if(p.method==='getSignaturesForAddress')result=[];
 else if(p.method==='getSignatureStatuses')result={context:{slot:100},value:network.tx?[{slot:100,err:null,confirmations:null,confirmationStatus:'finalized'}]:[null]};
 else if(p.method==='getTransaction')result=network.tx;
 else if(p.method==='sendTransaction'){network.sends++;network.tx=await page.evaluate(async raw=>(await import('/tests/native-fixture.ts')).decodeBroadcast(raw),p.params[0]);if(network.loseResponse){network.loseResponse=false;await route.abort('failed');return;}result=network.tx.transaction.signatures[0];}
 else throw Error('unexpected RPC fixture '+p.method);
 return route.fulfill({json:{jsonrpc:'2.0',id:p.id,result}});
 }
 if(new URL(url).hostname!=='127.0.0.1'&&new URL(url).hostname!=='localhost'){forbidden.push(url);await route.abort();return;}
 await route.continue();
 });
 await page.addInitScript(()=>localStorage.setItem('sejire.locale','ru'));
 return {forbidden,network};
}
async function setup(page){await page.goto('/#/admin');return page.evaluate(async()=> (await import('/tests/native-fixture.ts')).setup());}
async function importConfig(page,value){await page.getByLabel('Доверенный genesis SHA-256',{exact:true}).fill(value.anchor);await page.getByLabel('Импорт конфигурации или задания').setInputFiles({name:'config.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value.chain))});await expect(page.getByRole('status')).toContainText('Подписи и цепочка проверены');}
test('signed three-role configuration, no password, live-format balances, default spending disabled',async({page})=>{
 const f=await fixtures(page),value=await setup(page);await importConfig(page,value);
 await page.getByRole('button',{name:'Кошельки',exact:true}).click();await page.getByRole('button',{name:'Черновик следующей версии'}).click();
 await expect(page.getByLabel('Основная казна SEJIRE',{exact:true})).toHaveValue(value.config.wallets.service);await expect(page.getByLabel('Фонд памяти поколений SEJIRE',{exact:true})).toHaveValue(value.config.wallets.fund);await expect(page.getByLabel('AR-резерв основной казны SEJIRE',{exact:true})).toHaveValue(value.config.wallets.arReserve);
 await page.getByRole('button',{name:'Проверить сети и балансы'}).click();await expect(page.locator('pre').filter({hasText:'balanceLamports'})).toContainText('1000000000');
 await expect(page.getByRole('button',{name:'Опубликовать конфигурацию в Arweave (сейчас отключено)'})).toBeDisabled();expect(f.forbidden).toEqual([]);
});
test('tampered configuration rejected and cannot become active',async({page})=>{
 await fixtures(page);const v=await setup(page);v.chain.versions[0].config.serviceLamports='1';await page.getByLabel('Доверенный genesis SHA-256',{exact:true}).fill(v.anchor);await page.getByLabel('Импорт конфигурации или задания').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(v.chain))});await expect(page.getByRole('alert')).toContainText('untrusted_genesis');
});
test('configuration recovery in clean browser without previous cache or account',async({page,browser})=>{
 await fixtures(page);const v=await setup(page);await importConfig(page,v);const ctx=await browser.newContext();const clean=await ctx.newPage();await fixtures(clean);await clean.goto('/#/admin');await importConfig(clean,v);await expect(clean.getByText(/Подписи проверены · версия 1/)).toBeVisible();await ctx.close();
});
for(const mode of ['plain','fund','donation'])test('portable '+mode+' order: RPC finality, reload reconciliation, no false archive success',async({page})=>{
 const f=await fixtures(page);await page.goto('/#/admin');const v=await page.evaluate(async mode=>(await import('/tests/native-fixture.ts')).jobFixture(mode==='fund',mode==='donation'),mode);f.network.tx=v.tx;
 await page.getByLabel('Доверенный genesis SHA-256',{exact:true}).fill(v.anchor);await page.getByLabel('Импорт конфигурации или задания').setInputFiles({name:'job.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(v.package))});await expect(page.getByRole('status')).toContainText('Задание проверено');
 await page.getByRole('button',{name:'Сверить оплату через RPC'}).click();await expect(page.locator('pre').filter({hasText:'Solana finalized'})).toContainText('Архив ещё не считается сохранённым');
 await page.getByRole('button',{name:'Сверить оплату через RPC'}).click();await expect(page.locator('pre').filter({hasText:'Solana finalized'})).toContainText(mode==='donation'?'fundContribution':'servicePayment');
 if(mode==='fund')await expect(page.locator('pre').filter({hasText:'Solana finalized'})).toContainText('fundContribution');
 await page.reload();await importConfig(page,v);await page.getByLabel('Выбранный заказ').selectOption(v.job.order.id);await page.getByRole('button',{name:'Сверить оплату через RPC'}).click();await expect(page.locator('pre').filter({hasText:'Solana finalized'})).toBeVisible();expect(f.forbidden).toEqual([]);
});
async function checkoutConfig(page,v) {
 await page.getByLabel('Доверенный genesis SHA-256',{exact:true}).fill(v.anchor);
 await page.getByLabel('Подписанная конфигурация',{exact:true}).setInputFiles({name:'config.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(v.chain))});
 await page.getByRole('button',{name:'Проверить конфигурацию',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Конфигурация проверена');
}
async function openPreservation(page,family) {
 await page.getByRole('button',{name:'Открыть по 12 словам',exact:true}).click();await page.getByRole('button',{name:'Открыть из файла',exact:true}).click();
 await page.locator('input[type=file]').setInputFiles({name:'archive.json',mimeType:'application/json',buffer:Buffer.from(family.serialized)});await page.getByRole('textbox',{name:'12 слов восстановления SEJIRE'}).fill(family.words);await page.getByRole('button',{name:'Восстановить архив',exact:true}).click();
 await page.getByRole('button',{name:'Сохранить',exact:true}).first().click();await page.getByRole('button',{name:'Сохранить через Solana',exact:true}).click();
}
for(const mode of ['plain','fund','donation'])test('native user UI '+mode+' payment and portable handoff without Turbo or cloud',async({page})=>{
 const f=await fixtures(page);await page.goto('/');const v=await page.evaluate(async()=>(await import('/tests/native-fixture.ts')).setup());
 if(mode==='donation')await page.getByRole('button',{name:'Поддержать сохранение других семей'}).click();else await openPreservation(page,v.family);
 await checkoutConfig(page,v);await page.getByLabel('Добровольный вклад SOL').fill(mode==='plain'?'0':'0.005');await page.getByRole('button',{name:'Подключить Phantom и подписать заказ'}).click();
 await expect(page.getByRole('status')).toContainText('Заказ подписан');await expect(page.locator('dd').filter({hasText:mode==='donation'?/^0 SOL →/:/^0.03 SOL →/})).toBeVisible();
 await page.getByRole('checkbox',{name:'Подтверждаю показанные суммы, сеть и адреса'}).check();await page.getByRole('button',{name:/^Оплатить /}).click();await expect(page.getByRole('status')).toContainText('Не оплачивайте повторно');
 await page.getByRole('button',{name:'Сверить прежний платёж'}).click();await expect(page.getByRole('status')).toContainText('Solana finalized');expect(f.network.sends).toBe(1);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Экспорт задания для админки'}).click();expect((await download).suggestedFilename()).toMatch(/^sejire-job-/);expect(f.forbidden).toEqual([]);
});
test('native user wallet rejection, retry, lost reply and browser reload do not make a second payment',async({page})=>{
 const f=await fixtures(page);await page.goto('/');const v=await page.evaluate(async()=>(await import('/tests/native-fixture.ts')).setup());await page.getByRole('button',{name:'Поддержать сохранение других семей'}).click();await checkoutConfig(page,v);await page.getByLabel('Добровольный вклад SOL').fill('0.005');await page.getByRole('button',{name:'Подключить Phantom и подписать заказ'}).click();await expect(page.getByRole('status')).toContainText('Заказ подписан');
 await page.evaluate(()=>window.fixtureWallet.reject=true);await page.getByRole('checkbox',{name:'Подтверждаю показанные суммы, сеть и адреса'}).check();await page.getByRole('button',{name:/^Оплатить /}).click();await expect(page.getByRole('alert')).toContainText('synthetic_wallet_rejection');expect(f.network.sends).toBe(0);
 await page.evaluate(()=>window.fixtureWallet.reject=false);f.network.loseResponse=true;await page.getByRole('button',{name:/^Оплатить /}).click();await expect(page.getByRole('alert')).toBeVisible();expect(f.network.sends).toBe(1);
 await page.reload();await page.evaluate(async()=>(await import('/tests/native-fixture.ts')).setup());await page.getByRole('button',{name:'Поддержать сохранение других семей'}).click();await checkoutConfig(page,v);const options=page.getByLabel('Продолжить прежний заказ').locator('option');const id=await options.last().getAttribute('value');await page.getByLabel('Продолжить прежний заказ').selectOption(id);await page.getByRole('button',{name:'Сверить прежний платёж'}).click();await expect(page.getByRole('status')).toContainText('Solana finalized');expect(f.network.sends).toBe(1);expect(f.forbidden).toEqual([]);
});
