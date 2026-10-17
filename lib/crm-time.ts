export const stages = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"] as const;
export function validZone(zone: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: zone }).format(); return true; } catch { return false; }
}
function wallTime(timestamp: number, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone: zone, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23"}).formatToParts(timestamp);
  const p = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
// Resolve wall-clock input using offsets on both sides of a possible DST transition.
// Reject skipped and repeated times rather than silently scheduling the wrong instant.
export function resolveCallTime(local: string, zone: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) || !validZone(zone)) throw new Error("Choose a valid date and timezone.");
  const base = Date.parse(local + ":00Z");
  if (!Number.isFinite(base)) throw new Error("Invalid date.");
  const offsets = new Set<number>();
  for (const hours of [-36, -12, 0, 12, 36]) {
    const sample = base + hours * 3600000;
    offsets.add(Date.parse(wallTime(sample, zone) + ":00Z") - sample);
  }
  const matches = [...offsets].map(offset => base - offset).filter(t => wallTime(t, zone) === local);
  if (matches.length !== 1) throw new Error("This time is skipped or repeated by daylight saving. Choose another time.");
  return matches[0];
}
