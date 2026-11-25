// Dagligt job (GitHub Actions): sender en notifikation dagen før en post trækkes,
// hvis den ikke er krydset af i tjeklisten.
// Egne poster (emilie/leon) går til ejeren, fælles poster (bolig/forbrug) til begge.
// Logikken svarer til reminders() i index.html.
//
// Kræver miljøvariablen FIREBASE_SERVICE_ACCOUNT (JSON-nøglen, gemt som GitHub-hemmelighed).
// TEST=1 sender en testnotifikation til alle forbundne telefoner.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const START = { y: 2026, m: 8 }, TRIAL_END = { y: 2026, m: 10 };
const SHARED = new Set(['bolig', 'forbrug']);
const idx = (Y, m) => Y * 12 + m;
const active = (Y, m) => idx(Y, m) >= idx(START.y, START.m);
const isTrial = (Y, m) => active(Y, m) && idx(Y, m) <= idx(TRIAL_END.y, TRIAL_END.m);
const mKey = (Y, m) => `${Y}-${m + 1}`;
const M3 = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const kr = v => new Intl.NumberFormat('da-DK', { minimumFractionDigits: Math.round(v * 100) % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(v) + ' kr.';

function fixedArr(x, Y) {
  const ys = Object.keys(x.years || {}).map(Number).sort((a, b) => a - b);
  let best = ys[0]; for (const y of ys) if (y <= Y) best = y;
  return x.years?.[best] || [];
}
function val(x, Y, m) {
  if (!active(Y, m)) return 0;
  if (x.v) return +(x.years?.[Y]?.[m] ?? 0) || 0;
  return +fixedArr(x, Y)[m] || 0;
}
function easter(Y) { const a = Y % 19, b = Math.floor(Y / 100), c = Y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return new Date(Y, mo - 1, da); }
function isBankDay(d) {
  if (d.getDay() === 0 || d.getDay() === 6) return false;
  const md = (d.getMonth() + 1) + '-' + d.getDate();
  if (['1-1', '6-5', '12-24', '12-25', '12-26', '12-31'].includes(md)) return false;
  const e = easter(d.getFullYear()), diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - e) / 864e5);
  return ![-3, -2, 1, 39, 40, 50].includes(diff);
}
function lastBankDate(Y, m) { const d = new Date(Y, m + 1, 0); while (!isBankDay(d)) d.setDate(d.getDate() - 1); return d; }
function drawDate(x, Y, m) {
  if (x.day === 'last') return lastBankDate(Y, m);
  return new Date(Y, m, Math.min(+x.day, new Date(Y, m + 1, 0).getDate()));
}

// Dagens dato i Danmark (jobbet kører i UTC)
const [ty, tm, td] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen' }).format(new Date()).split('-').map(Number);
const tomorrow = new Date(ty, tm - 1, td + 1);

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore(), fcm = getMessaging();

const [itemsSnap, tokensSnap] = await Promise.all([db.collection('items').get(), db.collection('tokens').get()]);
const tokens = tokensSnap.docs.map(d => ({ token: d.id, who: d.data().who }));
console.log(`${tokens.length} telefon(er) forbundet`);

const msgs = { Emilie: [], Leon: [] };
if (process.env.TEST === '1') {
  for (const p in msgs) msgs[p].push({ test: true });
} else {
  const Y = tomorrow.getFullYear(), m = tomorrow.getMonth();
  if (active(Y, m) && !isTrial(Y, m)) {
    const checks = (await db.collection('checks').doc(mKey(Y, m)).get()).data()?.v || {};
    for (const d of itemsSnap.docs) {
      const x = { id: d.id, ...d.data() };
      if (!x.day || checks[x.id]) continue;
      const amt = val(x, Y, m);
      if (!(amt > 0) || +drawDate(x, Y, m) !== +tomorrow) continue;
      const line = `${x.name} · ${kr(amt)}${SHARED.has(x.g) ? ' (fælles)' : ''}`;
      if (x.g === 'emilie' || SHARED.has(x.g)) msgs.Emilie.push(line);
      if (x.g === 'leon' || SHARED.has(x.g)) msgs.Leon.push(line);
    }
  }
}

const dateTxt = `${tomorrow.getDate()}. ${M3[tomorrow.getMonth()]}`;
const sends = [];
for (const [who, lines] of Object.entries(msgs)) {
  if (!lines.length) continue;
  const data = lines[0].test
    ? { title: 'Fællesbudget', body: 'Testnotifikation: notifikationer virker på denne telefon.', url: './#check', tag: 'test' }
    : { title: lines.length === 1 ? 'Husk at betale i morgen' : `Husk at betale ${lines.length} poster i morgen`,
        body: lines.join('\n') + `\nTrækkes ${dateTxt}. Kryds af i tjeklisten, når det er betalt.`, url: './#check', tag: 'paamindelse-' + dateTxt };
  for (const t of tokens.filter(t => t.who === who)) sends.push({ who, t, data });
}
console.log(`I morgen er ${dateTxt}. Sender ${sends.length} notifikation(er).`);

for (const { who, t, data } of sends) {
  try {
    await fcm.send({ token: t.token, data, webpush: { headers: { Urgency: 'high', TTL: '86400' } } });
    console.log(`Sendt til ${who}`);
  } catch (e) {
    console.warn(`Fejl for ${who}: ${e.code || e.message}`);
    if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(e.code)) {
      await db.collection('tokens').doc(t.token).delete();
      console.log('Fjernede en telefon, der ikke længere er forbundet');
    }
  }
}
