/**
 * FlowSpace PM Engine — working calendar (Phase 3)
 *
 * Phase 2 shipped continuous-day math deliberately (per the pre-flight
 * decision) so the CPM engine could be verified against a simple worked
 * example without a calendar in the way. This is that calendar: it only
 * changes how a day-OFFSET (already computed by cpm.ts) becomes a real
 * DATE - weekends are skipped, so "5 working days from a Friday" lands on
 * the following Thursday, not Wednesday.
 *
 * Durations themselves are still expressed in working days (an activity
 * with duration_days=5 takes 5 working days, however many calendar days
 * that spans) - this file doesn't change what a duration means, only how
 * offsets map onto the calendar.
 *
 * No holiday calendar yet - that's a further increment, not required by
 * the Phase 3 pre-flight decision (which only called out weekends).
 */

const isWeekend = (d: Date): boolean => d.getDay() === 0 || d.getDay() === 6;

/** Advance `date` by one working day (skipping Sat/Sun), in place. */
function stepOneWorkingDay(date: Date): void {
  date.setDate(date.getDate() + 1);
  while (isWeekend(date)) date.setDate(date.getDate() + 1);
}

/**
 * Add N working-day offsets to a base date. An offset of 0 returns the base
 * date itself (rolled forward to the next working day if it lands on a
 * weekend) - this matches how cpm.ts uses offset 0 as "project start."
 */
export function addWorkingDays(base: Date, offsetDays: number): string {
  const d = new Date(base);
  while (isWeekend(d)) d.setDate(d.getDate() + 1);

  const wholeDays = Math.floor(offsetDays);
  const remainder = offsetDays - wholeDays;

  for (let i = 0; i < wholeDays; i++) stepOneWorkingDay(d);

  if (remainder > 0) {
    // Fractional day (e.g. a PERT estimate like 2.5 days) - keep the
    // fraction, just don't let it push the date past a weekend on its own.
    return `${d.toISOString().split('T')[0]}`;
  }

  return d.toISOString().split('T')[0];
}
