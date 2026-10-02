// The office's cash book (~/.pixel-agents/asaoffice-ledger.json), shared by every view of the office:
//   kas          the money in the office's till, in gold
//   paidThrough  the last day (YYYY-MM-DD) whose income has been paid out. Like Stardew's shipping bin, a day's work is paid
//                the next morning, once: collecting is idempotent, so a second tab or a phone can't pay the same day twice.
//   log          the last payouts: { day, amount, at }
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const file = () => path.join(os.homedir(), '.pixel-agents', 'asaoffice-ledger.json');
const MAX_PAYOUT = 1_000_000;
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
 * Pays out the income of every day up to and including `through` (which must be before today), once.
 * Returns { ledger, paid } where paid is false when that day (or a later one) was already paid, or null when the request is invalid.
 */
export function collect(through, amount, now = new Date()) {
  const sum = Number(amount);
  if (typeof through !== 'string' || !DAY.test(through) || through >= localDay(now)) return null;
  if (!Number.isInteger(sum) || sum < 0 || sum > MAX_PAYOUT) return null;
  const ledger = loadLedger();
  if (ledger.paidThrough && through <= ledger.paidThrough) return { ledger, paid: false };
  ledger.kas += sum;
  ledger.paidThrough = through;
  ledger.log.push({ day: through, amount: sum, at: now.toISOString() });
  ledger.log = ledger.log.slice(-KEEP_LOG);
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(`${file()}.tmp`, JSON.stringify(ledger, null, 2));
  fs.renameSync(`${file()}.tmp`, file());
  return { ledger, paid: true };
}
