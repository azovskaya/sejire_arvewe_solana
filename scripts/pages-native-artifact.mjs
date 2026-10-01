// Publishes only the accepted static artifact, never a local working directory.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const repo='azovskaya/sejire_arweave_solana', run=36843721858, id=11152846509;
const sha='1fe27a904f9307ae87b8ba1667b64e06fc9bee8f';
const digest='10b47fd3e7223822cc93addc49812050a1633c1da0cdb7c5f28afa4495dc7bf1';
if (!process.env.GH_TOKEN) throw Error('GitHub Actions token required; do not pass secrets as command arguments');
const headers={Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json'};
async function api(path){const r=await fetch(`https://api.github.com/repos/${repo}/${path}`,{headers});if(!r.ok)throw Error(`GitHub HTTP ${r.status}`);return r.json();}
const metadata=await api(`actions/artifacts/${id}`), workflow=await api(`actions/runs/${run}`);
if(metadata.name!=='native-admin-build'||metadata.expired||metadata.workflow_run.id!==run||metadata.workflow_run.head_sha!==sha||metadata.digest!==`sha256:${digest}`||workflow.head_sha!==sha||workflow.conclusion!=='success')throw Error('Accepted artifact provenance mismatch or expired artifact');
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
