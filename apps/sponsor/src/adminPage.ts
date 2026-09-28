/** Quiet SEJIRE ops desk — counts, times, and owner-entered keys. Served by the cashier Worker. */

const ADMIN_JS = String.raw`
const TOKEN_KEY = "sejire_admin";
const setupEl = document.getElementById("setup");
const loginEl = document.getElementById("login");
const deskEl = document.getElementById("desk");
const errEl = document.getElementById("err");
const persistEl = document.getElementById("persist-warn");

function showErr(msg) {
  errEl.textContent = msg || "";
  errEl.hidden = !msg;
}

function token() {
  return (sessionStorage.getItem(TOKEN_KEY) || "").trim();
}

function setToken(value) {
  sessionStorage.setItem(TOKEN_KEY, value);
}

async function api(path, opts) {
  const headers = Object.assign({ "Content-Type": "application/json" }, (opts && opts.headers) || {});
  const t = token();
  if (t) headers.Authorization = "Bearer " + t;
  const res = await fetch(path, Object.assign({}, opts, { headers }));
  const body = await res.json().catch(function () { return {}; });
  return { res: res, body: body };
}

function tenge(n) {
  return new Intl.NumberFormat("ru-KZ").format(n) + " ₸";
}

function when(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-KZ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function show(which) {
  setupEl.hidden = which !== "setup";
  loginEl.hidden = which !== "login";
  deskEl.hidden = which !== "desk";
}

function switchTab(name) {
  document.querySelectorAll("[data-tab]").forEach(function (btn) {
    btn.classList.toggle("on", btn.getAttribute("data-tab") === name);
  });
  document.querySelectorAll("[data-panel]").forEach(function (panel) {
    panel.hidden = panel.getAttribute("data-panel") !== name;
  });
}

async function boot() {
  showErr("");
  const status = await api("/v1/admin/status", { method: "GET" });
  const pinRow = document.getElementById("pin-row");
  pinRow.hidden = !status.body.pinRequired;
  persistEl.hidden = Boolean(status.body.kvBound);
  if (status.body.needsSetup) {
    show("setup");
    return;
  }
  if (token()) {
    const probe = await api("/v1/admin/overview", { method: "GET" });
    if (probe.res.ok) {
      show("desk");
      renderOverview(probe.body);
      await loadKeys();
      return;
    }
    sessionStorage.removeItem(TOKEN_KEY);
  }
  show("login");
}

document.getElementById("setup-go").addEventListener("click", async function () {
  showErr("");
  const password = document.getElementById("setup-pass").value;
  const again = document.getElementById("setup-pass2").value;
  const pin = document.getElementById("setup-pin").value;
  if (password !== again) { showErr("Пароли не совпали."); return; }
  const { res, body } = await api("/v1/admin/setup", {
    method: "POST",
    body: JSON.stringify({ password: password, pin: pin })
  });
  if (!res.ok) {
    showErr(body.error === "password_too_short" ? "Пароль — минимум 12 символов." :
      body.error === "bad_pin" ? "Неверный PIN первого входа." :
      body.error === "already_setup" ? "Пароль уже задан — войдите." :
      (body.error || "Не вышло."));
    return;
  }
  setToken(password);
  persistEl.hidden = Boolean(body.persisted);
  show("desk");
  await refreshDesk();
});

document.getElementById("login-go").addEventListener("click", login);
document.getElementById("login-pass").addEventListener("keydown", function (e) {
  if (e.key === "Enter") login();
});

async function login() {
  showErr("");
  const password = document.getElementById("login-pass").value.trim();
  if (!password) { showErr("Введите пароль."); return; }
  setToken(password);
  const { res, body } = await api("/v1/admin/overview", { method: "GET" });
  if (!res.ok) {
    sessionStorage.removeItem(TOKEN_KEY);
    showErr(body.error === "unauthorized" ? "Неверный пароль." : (body.error || "Не открылось."));
    return;
  }
  show("desk");
  renderOverview(body);
  await loadKeys();
}

document.querySelectorAll("[data-tab]").forEach(function (btn) {
  btn.addEventListener("click", function () { switchTab(btn.getAttribute("data-tab")); });
});

document.getElementById("out").addEventListener("click", function () {
  sessionStorage.removeItem(TOKEN_KEY);
  location.reload();
});

async function refreshDesk() {
  const over = await api("/v1/admin/overview", { method: "GET" });
  if (over.res.ok) renderOverview(over.body);
  await loadKeys();
}

function renderOverview(body) {
  const createdRows = (body.created || []).map(function (r) {
    return "<tr><td>" + when(r.at) + "</td></tr>";
  }).join("") || "<tr><td class='empty'>Пока ни одного сейфа</td></tr>";
  const payRows = (body.payments || []).map(function (p) {
    return "<tr><td>" + when(p.at) + "</td><td>" + tenge(p.amountMinor) + "</td><td>" + p.provider + "</td><td>" + (p.status === "saved" ? "сейф в сети" : "оплачено") + "</td></tr>";
  }).join("") || "<tr><td colspan='4' class='empty'>Оплат пока нет</td></tr>";
  document.getElementById("overview").innerHTML =
    "<div class='flags'>Казна: " + (body.treasuryReady ? "есть" : "ещё нет") +
    " · Kaspi: " + (body.kaspiReady ? "подключен" : "ещё нет") +
    (body.treasuryAddress ? " · адрес " + body.treasuryAddress.slice(0, 6) + "…" + body.treasuryAddress.slice(-4) : "") +
    "</div>" +
    "<div class='cards'>" +
    "<div class='card'><em>Деревьев</em><strong>" + body.trees + "</strong></div>" +
    "<div class='card'><em>Сохранений</em><strong>" + body.saves + "</strong></div>" +
    "<div class='card'><em>Оплат</em><strong>" + body.paidCount + "</strong></div>" +
    "<div class='card'><em>Сумма</em><strong>" + tenge(body.paidMinor || 0) + "</strong></div>" +
    "</div>" +
    "<section><h2>Когда появились деревья</h2><table><thead><tr><th>Время</th></tr></thead><tbody>" + createdRows + "</tbody></table></section>" +
    "<section><h2>Оплаты</h2><table><thead><tr><th>Время</th><th>Сумма</th><th>Путь</th><th>Статус</th></tr></thead><tbody>" + payRows + "</tbody></table></section>";
}

function setHint(id, on) {
  document.getElementById(id).hidden = !on;
}

async function loadKeys() {
  const { res, body } = await api("/v1/admin/keys", { method: "GET" });
  if (!res.ok) return;
  persistEl.hidden = Boolean(body.persisted);
  document.getElementById("treasury-state").textContent = body.treasuryConfigured
    ? (body.treasuryAddress || "сохранена")
    : "ещё нет";
  setHint("treasury-set", body.treasuryConfigured);
  setHint("site-set", body.siteKeyConfigured);
  setHint("kaspi-set", body.kaspiTokenConfigured);
  document.getElementById("kaspi-point").value = body.kaspiTradePointId || "";
  document.getElementById("kaspi-base").value = body.kaspiApiBase || "";
  document.getElementById("pay-provider").value = body.paymentProvider || "mock";
  document.getElementById("price").value = body.publishPriceMinor || "";
  document.getElementById("currency").value = body.publishCurrency || "KZT";
  document.getElementById("app-origin").value = body.appOrigin || "";
  document.getElementById("turbo-jwk").value = "";
  document.getElementById("site-jwk").value = "";
  document.getElementById("kaspi-token").value = "";
  warnMockTreasury();
}

function warnMockTreasury() {
  const mock = document.getElementById("pay-provider").value === "mock";
  const hasTreasury = document.getElementById("treasury-state").textContent !== "ещё нет";
  document.getElementById("mock-warn").hidden = !(mock && hasTreasury);
}

document.getElementById("pay-provider").addEventListener("change", warnMockTreasury);

document.getElementById("keys-save").addEventListener("click", async function () {
  showErr("");
  const patch = {
    kaspiTradePointId: document.getElementById("kaspi-point").value,
    kaspiApiBase: document.getElementById("kaspi-base").value,
    paymentProvider: document.getElementById("pay-provider").value,
    publishPriceMinor: document.getElementById("price").value,
    publishCurrency: document.getElementById("currency").value,
    appOrigin: document.getElementById("app-origin").value,
    turboJwk: document.getElementById("turbo-jwk").value,
    siteJwk: document.getElementById("site-jwk").value,
    kaspiMerchantToken: document.getElementById("kaspi-token").value,
    clearTreasury: document.getElementById("clear-treasury").checked,
    clearSiteKey: document.getElementById("clear-site").checked,
    clearKaspiToken: document.getElementById("clear-kaspi").checked
  };
  const { res, body } = await api("/v1/admin/keys", { method: "PUT", body: JSON.stringify(patch) });
  if (!res.ok) {
    showErr(body.error === "turbo_jwk_invalid" ? "Казна: это не JWK." :
      body.error === "site_jwk_invalid" ? "Ключ сайта: это не JWK." :
      (body.error || "Не сохранилось."));
    return;
  }
  document.getElementById("clear-treasury").checked = false;
  document.getElementById("clear-site").checked = false;
  document.getElementById("clear-kaspi").checked = false;
  await loadKeys();
  const over = await api("/v1/admin/overview", { method: "GET" });
  if (over.res.ok) renderOverview(over.body);
});

document.getElementById("treasury-gen").addEventListener("click", async function () {
  showErr("");
  const has = document.getElementById("treasury-state").textContent !== "ещё нет";
  if (has && !confirm("Казна уже есть. Создать новую и заменить сохранённую?")) return;
  const { res, body } = await api("/v1/admin/treasury/generate", {
    method: "POST",
    body: JSON.stringify({ replace: has })
  });
  if (!res.ok) {
    showErr(body.error === "treasury_exists" ? "Казна уже есть. Подтвердите замену." : (body.error || "Не создалась."));
    return;
  }
  const box = document.getElementById("once");
  box.hidden = false;
  document.getElementById("once-addr").textContent = body.address || "";
  document.getElementById("once-jwk").value = body.jwk || "";
  await loadKeys();
});

document.getElementById("once-copy").addEventListener("click", async function () {
  const text = document.getElementById("once-jwk").value;
  try { await navigator.clipboard.writeText(text); } catch (e) { /* ignore */ }
});

document.getElementById("pass-save").addEventListener("click", async function () {
  showErr("");
  const password = document.getElementById("new-pass").value;
  const again = document.getElementById("new-pass2").value;
  if (password !== again) { showErr("Пароли не совпали."); return; }
  const { res, body } = await api("/v1/admin/password", {
    method: "POST",
    body: JSON.stringify({ password: password })
  });
  if (!res.ok) {
    showErr(body.error === "password_too_short" ? "Пароль — минимум 12 символов." : (body.error || "Не сменился."));
    return;
  }
  setToken(password);
  document.getElementById("new-pass").value = "";
  document.getElementById("new-pass2").value = "";
  showErr("");
  document.getElementById("pass-ok").hidden = false;
});

boot();
`;

export function adminPageHtml(): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SEJIRE — касса</title>
  <style>
    :root { --ink:#222326; --dim:rgba(34,35,38,.58); --accent:#ff6700; --bg:#f6f5f2; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: system-ui, sans-serif; background:var(--bg); color:var(--ink); }
    main { max-width: 44rem; margin: 0 auto; padding: 2.2rem 1.2rem 4rem; }
    .mark { font-weight:700; letter-spacing:.12em; font-size:.78rem; }
    .mark i { display:inline-block; width:.55rem; height:.55rem; border-radius:50%; background:var(--accent); margin-right:.4rem; }
    h1 { font-size:1.35rem; font-weight:650; margin:.8rem 0 .35rem; }
    p.sub { color:var(--dim); margin:0 0 1.4rem; line-height:1.45; }
    .cards { display:grid; grid-template-columns: repeat(2, 1fr); gap:.7rem; margin: 1.2rem 0 1.6rem; }
    .card { background:#fff; border-radius:12px; padding:1rem 1.05rem; }
    .card em { display:block; font-style:normal; color:var(--dim); font-size:.72rem; letter-spacing:.04em; text-transform:uppercase; margin-bottom:.35rem; }
    .card strong { font-size:1.45rem; font-weight:650; }
    table { width:100%; border-collapse:collapse; background:#fff; border-radius:12px; overflow:hidden; }
    th, td { text-align:left; padding:.65rem .85rem; font-size:.88rem; border-bottom:1px solid rgba(34,35,38,.06); }
    th { color:var(--dim); font-weight:550; font-size:.72rem; text-transform:uppercase; letter-spacing:.04em; }
    .row { display:flex; gap:.55rem; margin: 1rem 0; flex-wrap:wrap; }
    label.field { display:block; margin: .85rem 0; }
    label.field span { display:block; font-size:.78rem; color:var(--dim); margin-bottom:.3rem; }
    input, textarea, select { width:100%; min-height:2.7rem; border:1px solid rgba(34,35,38,.14); border-radius:8px; padding:.55rem .8rem; font: inherit; background:#fff; }
    textarea { min-height:7rem; font-family: ui-monospace, monospace; font-size:.8rem; }
    button { appearance:none; border:0; background:var(--accent); color:#fff; font:inherit; font-weight:650; min-height:2.7rem; padding:0 1rem; border-radius:8px; cursor:pointer; }
    button.ghost { background:transparent; color:var(--ink); border:1px solid rgba(34,35,38,.16); }
    button.danger { background:transparent; color:#b42318; border:1px solid rgba(180,35,24,.28); }
    .flags { color:var(--dim); font-size:.88rem; margin-bottom:1.2rem; }
    .err { color:#b42318; }
    .ok { color:#17663a; }
    .hint { color:var(--dim); font-size:.82rem; margin:.25rem 0 .6rem; }
    .warn { background:#fff6e8; border-radius:10px; padding:.75rem .9rem; font-size:.88rem; margin: .8rem 0; }
    .once { background:#fff; border-radius:12px; padding:1rem; margin:1rem 0; }
    .tabs { display:flex; gap:.35rem; margin: 0 0 1.1rem; }
    .tabs button { background:#fff; color:var(--ink); border:1px solid rgba(34,35,38,.12); font-weight:550; }
    .tabs button.on { background:var(--accent); color:#fff; border-color:var(--accent); }
    .check { display:flex; align-items:center; gap:.45rem; font-size:.88rem; color:var(--dim); margin:.4rem 0; }
    .check input { width:auto; min-height:0; }
    section h2 { font-size:.95rem; margin:1.6rem 0 .55rem; }
    .empty { color:var(--dim); padding: .9rem; }
    code { font-size:.86em; }
  </style>
</head>
<body>
  <main>
    <div class="mark"><i></i>SEJIRE</div>
    <h1>Касса</h1>
    <p class="sub">Ключи и числа. Имена, 12 слов и содержимое древ сюда не попадают.</p>
    <p class="err" id="err" hidden></p>
    <p class="warn" id="persist-warn" hidden>KV ещё не подключено — после перезапуска кассира пароль и ключи пропадут. В wrangler.toml нужен namespace <code>IDEMPOTENCY</code>.</p>

    <div id="setup" hidden>
      <p class="hint">Первый вход: задайте пароль админки. Его нет в чате и в git — только у вас.</p>
      <label class="field"><span>Пароль (от 12 символов)</span><input id="setup-pass" type="password" autocomplete="new-password" /></label>
      <label class="field"><span>Ещё раз</span><input id="setup-pass2" type="password" autocomplete="new-password" /></label>
      <label class="field" id="pin-row" hidden><span>PIN первого входа</span><input id="setup-pin" type="password" autocomplete="off" /></label>
      <div class="row"><button type="button" id="setup-go">Создать админку</button></div>
    </div>

    <div id="login" hidden>
      <div class="row">
        <input id="login-pass" type="password" autocomplete="current-password" placeholder="Пароль админки" />
        <button type="button" id="login-go">Войти</button>
      </div>
    </div>

    <div id="desk" hidden>
      <div class="tabs">
        <button type="button" class="on" data-tab="overview">Обзор</button>
        <button type="button" data-tab="keys">Ключи</button>
        <button type="button" data-tab="password">Пароль</button>
      </div>
      <div data-panel="overview" id="overview"></div>
      <div data-panel="keys" hidden>
        <p class="hint">Секреты с экрана больше не читаются: пустое поле = не менять. После создания казны скопируйте JSON в 1Password — второй раз его не покажем.</p>
        <p class="warn" id="mock-warn" hidden>Казна сохранена, а путь оплаты ещё mock. Так кассир не работает: либо Kaspi, либо уберите казну, пока тестируете без сети.</p>
        <p>Казна: <strong id="treasury-state">…</strong></p>
        <div class="row">
          <button type="button" id="treasury-gen">Создать казну здесь</button>
        </div>
        <div class="once" id="once" hidden>
          <p><strong>Покажите один раз.</strong> Адрес: <code id="once-addr"></code></p>
          <p class="hint">Весь JSON — в 1Password и на флешку. На бумагу — только адрес. В чат агенту не слать.</p>
          <textarea id="once-jwk" readonly></textarea>
          <div class="row"><button type="button" class="ghost" id="once-copy">Скопировать JSON</button></div>
        </div>
        <label class="field"><span>Вставить JWK казны (если уже есть файл)</span><textarea id="turbo-jwk" placeholder="оставьте пустым, чтобы не менять"></textarea></label>
        <p class="hint" id="treasury-set" hidden>Казна уже сохранена на кассире.</p>
        <label class="check"><input id="clear-treasury" type="checkbox" /> Удалить казну с кассира</label>
        <label class="field"><span>JWK сайта / permaweb (по желанию)</span><textarea id="site-jwk" placeholder="оставьте пустым, чтобы не менять"></textarea></label>
        <p class="hint" id="site-set" hidden>Ключ сайта уже сохранён.</p>
        <label class="check"><input id="clear-site" type="checkbox" /> Удалить ключ сайта</label>
        <label class="field"><span>Токен Kaspi</span><input id="kaspi-token" type="password" autocomplete="off" placeholder="оставьте пустым, чтобы не менять" /></label>
        <p class="hint" id="kaspi-set" hidden>Токен Kaspi уже сохранён.</p>
        <label class="check"><input id="clear-kaspi" type="checkbox" /> Удалить токен Kaspi</label>
        <label class="field"><span>Trade Point Id</span><input id="kaspi-point" /></label>
        <label class="field"><span>Kaspi API</span><input id="kaspi-base" placeholder="https://pay.kaspi.kz/api/v2" /></label>
        <label class="field"><span>Путь оплаты</span>
          <select id="pay-provider">
            <option value="mock">mock — пока нет ИП</option>
            <option value="kaspi">kaspi</option>
          </select>
        </label>
        <label class="field"><span>Цена (тиын)</span><input id="price" inputmode="numeric" /></label>
        <label class="field"><span>Валюта</span><input id="currency" /></label>
        <label class="field"><span>Откуда открывают сайт (через запятую)</span><input id="app-origin" /></label>
        <div class="row"><button type="button" id="keys-save">Сохранить</button></div>
      </div>
      <div data-panel="password" hidden>
        <label class="field"><span>Новый пароль</span><input id="new-pass" type="password" autocomplete="new-password" /></label>
        <label class="field"><span>Ещё раз</span><input id="new-pass2" type="password" autocomplete="new-password" /></label>
        <p class="ok" id="pass-ok" hidden>Пароль сменён. Дальше входите новым.</p>
        <div class="row"><button type="button" id="pass-save">Сменить пароль</button></div>
      </div>
      <div class="row"><button class="ghost" type="button" id="out">Выйти</button></div>
    </div>
  </main>
  <script>${ADMIN_JS}</script>
</body>
</html>`;
}
