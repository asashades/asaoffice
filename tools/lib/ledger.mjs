// The office's cash book (~/.pixel-agents/asaoffice-ledger.json), shared by every view of the office:
//   kas          the money in the office's till, in gold
//   paidThrough  the last day (YYYY-MM-DD) whose income has been paid out. Like Stardew's shipping bin, a day's work is paid
//                the next morning, once: collecting is idempotent, so a second tab or a phone can't pay the same day twice.
//   log          the last payouts: { day, income, salary, upkeep, freelance, net, at } (net = what actually changed the Kas: it never
//                goes below 0; salary is payroll, upkeep is the décor upkeep bill — kept apart so a replay never shows
//                upkeep as if it were someone's pay, see dayend.js)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const file = () => path.join(os.homedir(), '.pixel-agents', 'asaoffice-ledger.json');
const MAX_PAYOUT = 1_000_000;
const MAX_SALARY = 100_000;
const MAX_UPKEEP = 100_000;
const MAX_FREELANCE = 100_000;
const KEEP_LOG = 60;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function loadLedger() {
  try {
    const j = JSON.parse(fs.readFileSync(file(), 'utf8'));
    return {
      kas: Number.isFinite(j.kas) ? Math.max(0, Math.round(j.kas)) : 0,
      paidThrough: typeof j.paidThrough === 'string' && DAY.test(j.paidThrough) ? j.paidThrough : null,
      log: Array.isArray(j.log) ? j.log.slice(-KEEP_LOG) : [],
    };
  } catch {
    return { kas: 0, paidThrough: null, log: [] };
  }
}

const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Settles every day up to and including `through` (which must be before today), once: `income` comes in, `salary`, `upkeep` and `freelance`
 * `upkeep` go out (kept as separate numbers so a replay can tell payroll from décor upkeep), and the Kas never drops
 * below 0 (a bad day can empty the till but not put it in debt — everything that goes out is cut from the same pool, so on a
 * very poor day it may be paid out only partially; the log still records what was *billed*, not just what landed).
 * Returns { ledger, paid } where paid is false when that day (or a later one) was already settled, or null when the request is invalid.
 */
export function collect(through, income, salary = 0, upkeep = 0, freelance = 0, now = new Date()) {
  const inc = Number(income);
  const pay = Number(salary);
  const up = Number(upkeep);
  const fl = Number(freelance);
  if (typeof through !== 'string' || !DAY.test(through) || through >= localDay(now)) return null;
  if (!Number.isInteger(inc) || inc < 0 || inc > MAX_PAYOUT) return null;
  if (!Number.isInteger(pay) || pay < 0 || pay > MAX_SALARY) return null;
  if (!Number.isInteger(up) || up < 0 || up > MAX_UPKEEP) return null;
  if (!Number.isInteger(fl) || fl < 0 || fl > MAX_FREELANCE) return null;
  const ledger = loadLedger();
  if (ledger.paidThrough && through <= ledger.paidThrough) return { ledger, paid: false };
  const before = ledger.kas;
  ledger.kas = Math.max(0, before + inc - pay - up - fl);
  ledger.paidThrough = through;
  ledger.log.push({ day: through, income: inc, salary: pay, upkeep: up, freelance: fl, net: ledger.kas - before, at: now.toISOString() });
  ledger.log = ledger.log.slice(-KEEP_LOG);
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(`${file()}.tmp`, JSON.stringify(ledger, null, 2));
  fs.renameSync(`${file()}.tmp`, file());
  return { ledger, paid: true, before };
}

/** Takes `amount` gold out of the Kas for a purchase. Returns { kas } or null when there isn't enough (or the amount is invalid). */
export function spend(amount) {
  const n = Number(amount);
  if (!Number.isInteger(n) || n <= 0 || n > MAX_PAYOUT) return null;
  const ledger = loadLedger();
  if (ledger.kas < n) return null;
  ledger.kas -= n;
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(`${file()}.tmp`, JSON.stringify(ledger, null, 2));
  fs.renameSync(`${file()}.tmp`, file());
  return { kas: ledger.kas };
}
