// Reads events from macOS Calendar (EventKit) for the office calendar panel.
//   osascript -l JavaScript tools/lib/mac-calendar.js <startEpochSeconds> <endEpochSeconds> <mayRequestAccess 0|1>
// (Epoch seconds, not ISO strings: NSISO8601DateFormatter returns nil for JS's "…T00:00:00.000Z".)
// Prints { status, events: [{ title, start, end, allDay, calendar, color }] }. With mayRequestAccess=1
// and no decision yet, macOS asks once for Calendar access on behalf of the app that ran
// `npm run office` (usually Terminal).
ObjC.import('EventKit');
ObjC.import('AppKit');

const STATUS = { 0: 'notDetermined', 1: 'restricted', 2: 'denied', 3: 'ok', 4: 'writeOnly' };

function authStatus() {
  return STATUS[Number($.EKEventStore.authorizationStatusForEntityType($.EKEntityTypeEvent))] || 'error';
}

function hex(color) {
  try {
    const c = color.colorUsingColorSpace($.NSColorSpace.sRGBColorSpace);
    const to = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
    return `#${to(c.redComponent)}${to(c.greenComponent)}${to(c.blueComponent)}`;
  } catch (e) {
    return null;
  }
}

function run(argv) {
  const [startSec, endSec, mayRequest] = argv;
  const store = $.EKEventStore.alloc.init;
  let status = authStatus();

  if (status === 'notDetermined' && mayRequest === '1') {
    let done = false;
    try {
      store.requestFullAccessToEventsWithCompletion(() => { done = true; });
      const until = $.NSDate.dateWithTimeIntervalSinceNow(120);
      while (!done && $.NSDate.date.compare(until) < 0) {
        $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.25));
      }
    } catch (e) {
      return JSON.stringify({ status: 'error', message: `access request failed: ${e}` });
    }
    status = authStatus();
  }
  if (status !== 'ok') return JSON.stringify({ status, events: [] });

  const fmt = $.NSISO8601DateFormatter.alloc.init;
  const predicate = store.predicateForEventsWithStartDateEndDateCalendars(
    $.NSDate.dateWithTimeIntervalSince1970(Number(startSec)),
    $.NSDate.dateWithTimeIntervalSince1970(Number(endSec)),
    $(), // nil = all calendars
  );
  const found = store.eventsMatchingPredicate(predicate);
  const events = [];
  for (let i = 0; i < found.count; i++) {
    const e = found.objectAtIndex(i);
    events.push({
      title: ObjC.unwrap(e.title) || '',
      start: ObjC.unwrap(fmt.stringFromDate(e.startDate)),
      end: ObjC.unwrap(fmt.stringFromDate(e.endDate)),
      allDay: !!e.allDay,
      calendar: ObjC.unwrap(e.calendar.title) || '',
      color: hex(e.calendar.color),
    });
  }
  events.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return JSON.stringify({ status, events });
}
