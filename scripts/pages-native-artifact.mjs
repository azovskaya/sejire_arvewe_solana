// Publishes only the accepted static artifact, never a local working directory.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const repo='azovskaya/sejire_arweave_solana', run=Number(process.env.CHECKED_RUN), sha=process.env.GITHUB_SHA;
if (!Number.isSafeInteger(run)||run<1||!sha||!/^[a-f0-9]{40}$/.test(sha)) throw Error('An explicit checked run and source commit are required');
if (!process.env.GH_TOKEN) throw Error('GitHub Actions token required; do not pass secrets as command arguments');
const headers={Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json'};
async function api(path){const r=await fetch(`https://api.github.com/repos/${repo}/${path}`,{headers});if(!r.ok)throw Error(`GitHub HTTP ${r.status}`);return r.json();}
const workflow=await api(`actions/runs/${run}`);
if(workflow.head_sha!==sha||workflow.name!=='SEJIRE checks'||workflow.conclusion!=='success')throw Error('The current source commit must have successful SEJIRE checks');
const artifacts=await api(`actions/runs/${run}/artifacts`);
const matches=artifacts.artifacts.filter(a=>a.name==='native-admin-build'&&!a.expired);
if(matches.length!==1)throw Error('Exactly one accepted native build is required');
const metadata=matches[0],id=metadata.id,digest=metadata.digest?.replace(/^sha256:/,'');
if(metadata.workflow_run.id!==run||metadata.workflow_run.head_sha!==sha||!/^[a-f0-9]{64}$/.test(digest??''))throw Error('Artifact provenance or digest mismatch');
// Fetch the redirect with auth, then download from the signed storage URL without forwarding auth.
const redirect=await fetch(`https://api.github.com/repos/${repo}/actions/artifacts/${id}/zip`,{headers,redirect:'manual'});
if(redirect.status!==302)throw Error(`Artifact redirect HTTP ${redirect.status}`);
const downloaded=await fetch(redirect.headers.get('location'));
if(!downloaded.ok)throw Error(`Artifact download HTTP ${downloaded.status}`);
const zip=Buffer.from(await downloaded.arrayBuffer());
if(createHash('sha256').update(zip).digest('hex')!==digest)throw Error('Artifact ZIP digest mismatch');
mkdirSync('.pages-download');writeFileSync('.pages-download/native.zip',zip);
execFileSync('git',['fetch','origin','gh-pages'],{stdio:'inherit'});
execFileSync('git',['worktree','add','--detach','.pages-site','origin/gh-pages'],{stdio:'inherit'});
// Validate paths, links and extraction limits before creating only the native-admin subtree.
execFileSync('python3',['-c',`import zipfile,pathlib,shutil
root=pathlib.Path('.pages-site/native-admin')
with zipfile.ZipFile('.pages-download/native.zip') as z:
 for f in z.infolist():
  p=pathlib.PurePosixPath(f.filename)
  if p.is_absolute() or '..' in p.parts or ((f.external_attr>>16)&0o170000)==0o120000: raise RuntimeError('Unsafe artifact path')
 if sum(f.file_size for f in z.infolist())>30000000: raise RuntimeError('Oversized artifact')
 if root.exists(): shutil.rmtree(root)
 root.mkdir()
 z.extractall(root)
`],{stdio:'inherit'});
const html=readFileSync('.pages-site/native-admin/index.html','utf8');
if(!html.includes('./assets/'))throw Error('Expected relocatable build');
const provenance={artifact:'native-admin-build',run,artifactId:id,sourceCommit:sha,zipSha256:digest,publishedByCommit:process.env.GITHUB_SHA};
writeFileSync('.pages-site/native-admin/build-provenance.json',JSON.stringify(provenance,null,2)+'\n');
console.log('Verified source commit, successful checks, ZIP digest and relative asset paths. Existing Pages root preserved.');
