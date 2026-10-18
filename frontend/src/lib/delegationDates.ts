// Dean delegations are chosen in whole days (local time). The period runs from
// the start of the start date to the end of the end date — stored as the next
// day's midnight, so an end date of 20 Oct stops at 21 Oct 00:00.

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const midnight = (value: string) => new Date(`${value}T00:00:00`);

export const todayYmd = () => ymd(new Date());

/** Start of the chosen day — or right now when that day is today, so it takes effect at once. */
export function delegationStart(value: string): Date {
  return value === todayYmd() ? new Date() : midnight(value);
}

/** Midnight after the chosen day: the delegation lasts through the whole end date. */
export function delegationEnd(value: string): Date {
  const d = midnight(value);
  d.setDate(d.getDate() + 1);
  return d;
}

export const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** The last day a delegation covers (its end is the following midnight). */
export const fmtUntil = (iso: string) => fmtDay(new Date(new Date(iso).getTime() - 1).toISOString());
