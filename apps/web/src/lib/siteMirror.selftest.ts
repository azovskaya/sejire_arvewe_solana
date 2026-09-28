import { isPagesTestMirrorHost } from "./siteMirror";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(isPagesTestMirrorHost("azovskaya.github.io", false), "github.io is a mirror");
assert(isPagesTestMirrorHost("localhost", false), "localhost is a mirror");
assert(isPagesTestMirrorHost("127.0.0.1", true), "loopback + QA tools");
assert(isPagesTestMirrorHost("preview.example.com", true), "QA tools force mirror");
assert(!isPagesTestMirrorHost("sejire.ar.io", true), "ar.io stays canon even with QA flag");
assert(!isPagesTestMirrorHost("foo.ar.io", false), "other ar.io is not Pages");
assert(!isPagesTestMirrorHost("example.com", false), "plain host is not a mirror");

console.log("siteMirror.selftest: OK");
