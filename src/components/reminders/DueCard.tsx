import React from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useHRTMode } from '../../contexts/HRTModeContext';
import type { DueItem } from '../../utils/reminders';
import type { LogDosePrefill } from '../today/ComingUp';
import { Button } from '../ui';
import { Log, Skip, Snooze } from '../icons';
import { fmt, formatTime, relativeTime } from '../today/format';
import { ScheduleTile, scheduleTitle } from './format';

export interface DueCardProps {
    item: DueItem;
    /** Now, epoch ms, for "4 minutes ago". */
    nowMs: number;
    /** Opens the Log sheet prefilled with this dose, timed now. */
    onLog: (prefill: LogDosePrefill) => void;
    /** Snooze by this many minutes (the card offers 60). */
    onSnooze: (item: DueItem, minutes: number) => void;
    onSkip: (item: DueItem) => void;
    className?: string;
}

/** The reminder card on Today while a scheduled dose is due: tile, "Cyproterone
 *  acetate 12.5 mg is due now", "Due at 21:00, 4 minutes ago", then "Log it
 *  now" and "Snooze 1 hour" side by side and "Skip this one" under them (one
 *  row from md). */
export const DueCard: React.FC<DueCardProps> = ({ item, nowMs, onLog, onSnooze, onSkip, className }) => {
    const { t, lang } = useTranslation();
    const { isTransmasc } = useHRTMode();
    const s = item.schedule;
    const title = fmt(t('reminders.due.title'), { dose: scheduleTitle(s, t) });
    const sub = fmt(t('reminders.due.sub'), {
        time: formatTime(item.occurrenceMs, lang),
        rel: relativeTime(item.occurrenceMs, nowMs, lang),
    });

    const log = () =>
        onLog({
            route: s.route,
            ester: s.ester,
            doseMG: s.doseMG,
            timeH: Math.max(item.occurrenceMs, Date.now()) / 3_600_000,
            extras: { ...s.extras },
            scheduleOccurrence: { scheduleId: s.id, occurrenceMs: item.occurrenceMs },
        });

    return (
        <section
            aria-label={title}
            className={`rounded-2xl border border-[var(--c-hairline)] bg-[var(--c-surface)] p-4 md:flex md:items-center md:gap-6 ${className ?? ''}`}
        >
            <div className="flex min-w-0 items-center gap-3 md:flex-1">
                <ScheduleTile schedule={s} isTransmasc={isTransmasc} />
                <div className="min-w-0 flex-1">
                    <p className="m-0 text-base font-semibold text-[var(--c-ink)]">{title}</p>
                    <p className="m-0 truncate text-sm text-[var(--c-attention)]">{sub}</p>
                </div>
            </div>
            {/* Phone: the two buttons share the width, Skip sits under them.
                From md: one row, buttons at their natural width on the right. */}
            <div className="mt-4 flex gap-3 md:mt-0 md:flex-none md:items-center">
                <Button compact className="flex-1 basis-0 md:flex-none md:basis-auto" onClick={log}>
                    <Log size={20} />
                    {t('reminders.due.log')}
                </Button>
                <Button variant="secondary" compact className="flex-1 basis-0 md:flex-none md:basis-auto" onClick={() => onSnooze(item, 60)}>
                    <Snooze size={20} />
                    {t('reminders.due.snooze')}
                </Button>
                <Button variant="plain" compact className="hidden md:inline-flex" onClick={() => onSkip(item)}>
                    <Skip size={20} />
                    {t('reminders.due.skip')}
                </Button>
            </div>
            <div className="mt-1 flex justify-center md:hidden">
                <Button variant="plain" compact onClick={() => onSkip(item)}>
                    <Skip size={20} />
                    {t('reminders.due.skip')}
                </Button>
            </div>
        </section>
    );
};

export default DueCard;
