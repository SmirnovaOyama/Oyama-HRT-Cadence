import type { DoseEvent } from '../../logic';

type SourceDose = Pick<DoseEvent, 'route' | 'ester' | 'scheduleOccurrence'>;

/** Only a dose still using the source reminder's medicine and route can
 *  complete that reminder. Ordinary log entries never invent an association. */
export function retainedScheduleOccurrence(
    source: SourceDose | null | undefined,
    route: DoseEvent['route'],
    ester: DoseEvent['ester'],
): DoseEvent['scheduleOccurrence'] | undefined {
    if (!source?.scheduleOccurrence || source.route !== route || source.ester !== ester) return undefined;
    return { ...source.scheduleOccurrence };
}
