const MS_H = 3_600_000;

/** The local minute shown by the dose editor's date/time controls. */
export function toLocalMinuteString(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** Keep the precise original instant when the editor's minute did not change.
 *  Rounding an unchanged record back can move it before a same-minute refill. */
export function doseTimeForSave(
    whenMode: 'now' | 'earlier', dateText: string, originalTimeH?: number, nowMs = Date.now(),
): number {
    if (whenMode === 'now') return nowMs / MS_H;
    if (originalTimeH !== undefined && Number.isFinite(originalTimeH)) {
        const originalDate = new Date(originalTimeH * MS_H);
        if (Number.isFinite(originalDate.getTime()) && dateText === toLocalMinuteString(originalDate)) {
            return originalTimeH;
        }
    }
    const selectedMs = new Date(dateText).getTime();
    return (Number.isFinite(selectedMs) ? selectedMs : nowMs) / MS_H;
}
