import React, { useEffect, useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import type { DoseEvent } from '../../logic';
import { useTranslation } from '../contexts/LanguageContext';
import { useDialog } from '../contexts/DialogContext';
import { useHRTMode } from '../contexts/HRTModeContext';
import { BackHeader, Button, Lead, ListGroup, ListRow, ListStack, Switch } from '../components/ui';
import { Calendar, ChevronRight, Export, Eye, Phone, Plus, Reminder } from '../components/icons';
import { LabelIcon } from '../components/ui/LabelIcon';
import { IconTile } from '../components/today/ComingUp';
import { doseText, fmt, medInline, whenInline } from '../components/today/format';
import { ScheduleTile, scheduleAsDose, scheduleSub, scheduleTitle } from '../components/reminders/format';
import ScheduleSheet from '../components/reminders/ScheduleSheet';
import { useReminderPrefs } from '../hooks/useReminders';
import type { Schedule } from '../types/routine';
import { buildCalendar } from '../utils/ics';
import { dueItems, nextOccurrences, readReminderState } from '../utils/reminders';
import { inferRegimens, usableRegimens } from '../utils/schedule';
import { YouPage } from './you/shared';

const CHEVRON = <ChevronRight size={16} />;

export interface RemindersProps {
    schedules: Schedule[];
    events: DoseEvent[];
    addSchedule: (s: Schedule) => void;
    updateSchedule: (s: Schedule) => void;
    deleteSchedule: (id: string) => void;
    onBack: () => void;
}

/** Reminders, under You: the schedules, how reminders reach you, and the
 *  calendar export as a drill-in view of the same page. */
const Reminders: React.FC<RemindersProps> = ({ schedules, events, addSchedule, updateSchedule, deleteSchedule, onBack }) => {
    const { t, lang } = useTranslation();
    const { showDialog } = useDialog();
    const { isTransmasc } = useHRTMode();
    const prefs = useReminderPrefs();
    const [view, setView] = useState<'main' | 'calendar'>('main');
    const [sheet, setSheet] = useState<{ open: boolean; schedule: Schedule | null }>({ open: false, schedule: null });
    const [, setClock] = useState(() => Date.now());
    useEffect(() => {
        const refresh = () => setClock(Date.now());
        const timer = window.setInterval(refresh, 60_000);
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, []);
    const nowMs = Date.now();

    const regimens = useMemo(() => usableRegimens(inferRegimens(events)), [events]);
    const sorted = useMemo(() => [...schedules].sort((a, b) => a.createdAt - b.createdAt), [schedules]);

    const next = useMemo(() => {
        let best: { s: Schedule; ms: number } | null = null;
        for (const s of schedules) {
            if (!s.active) continue;
            const ms = nextOccurrences(s, nowMs, 1)[0];
            if (ms !== undefined && (!best || ms < best.ms)) best = { s, ms };
        }
        return best;
    }, [schedules, nowMs]);

    const toggleNotify = async (on: boolean) => {
        const p = await prefs.setNotify(on);
        if (!on) return;
        if (p === 'unsupported') showDialog('alert', t('reminders.system_unsupported'));
        else if (p === 'denied') showDialog('alert', t('reminders.system_denied'));
    };

    const downloadCalendar = () => {
        // Floating local times (no TZID): without a VTIMEZONE block a zone name
        // is not strict RFC 5545 and Outlook can reject the file, while a
        // floating time is read as the phone's own local time everywhere.
        const ics = buildCalendar(schedules, {
            title: s => (prefs.showNames ? scheduleTitle(s, t) : t('reminders.calendar.event')),
            calendarName: t('reminders.calendar.name'),
        });
        saveAs(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), 'cadence-reminders.ics');
    };

    const hasActive = schedules.some(s => s.active);

    if (view === 'calendar') {
        return (
            <YouPage>
                <BackHeader parentLabel={t('reminders.title')} onBack={() => setView('main')} title={t('reminders.calendar')} />
                <ListStack className="mt-2">
                    <div className="flex flex-col items-start gap-4">
                        <p className="m-0 text-base text-[var(--c-ink)]">{t('reminders.calendar.lead')}</p>
                        <Button onClick={downloadCalendar} disabled={!hasActive}>
                            <Export size={20} />
                            {t('reminders.calendar.download')}
                        </Button>
                        <p className="m-0 text-sm text-[var(--c-muted)]">
                            {t(hasActive ? 'reminders.calendar.after' : 'reminders.calendar.none')}
                        </p>
                    </div>
                    <ListGroup footer={t('reminders.calendar.names_footer')}>
                        <ListRow
                            leading={<LabelIcon icon={Eye} tone="purple" />}
                            title={t('reminders.calendar.names')}
                            trailing={
                                <Switch checked={prefs.showNames} onChange={prefs.setShowNames} aria-label={t('reminders.calendar.names')} />
                            }
                        />
                    </ListGroup>
                </ListStack>
            </YouPage>
        );
    }

    // A dose that is due and not logged comes before the next one.
    const due = dueItems(schedules, events, nowMs, readReminderState(nowMs))[0];
    const lead = due
        ? fmt(t('reminders.lead_due'), { dose: scheduleTitle(due.schedule, t) })
        : next
        ? fmt(t('reminders.lead_next'), {
              dose: `${medInline(next.s.ester, t, lang)} ${doseText(scheduleAsDose(next.s))}`,
              when: whenInline(next.ms, nowMs, lang, t),
          })
        : t('reminders.lead_none');

    return (
        <YouPage>
            <BackHeader parentLabel={t('you.title')} onBack={onBack} title={t('reminders.title')} />
            <ListStack className="mt-2">
                <Lead>{lead}</Lead>

                <ListGroup aria-label={t('reminders.schedules')} footer={t('reminders.privacy_footer')}>
                    {[
                        ...sorted.map(s => {
                            const title = scheduleTitle(s, t);
                            return (
                                <ListRow
                                    key={s.id}
                                    className="relative"
                                    leading={<ScheduleTile schedule={s} isTransmasc={isTransmasc} />}
                                    title={
                                        <>
                                            {/* The whole row opens the sheet; the switch sits above this button. */}
                                            <button
                                                type="button"
                                                className="absolute inset-0 rounded-[inherit]"
                                                aria-label={title}
                                                onClick={() => setSheet({ open: true, schedule: s })}
                                            />
                                            <span className="font-semibold">{title}</span>
                                        </>
                                    }
                                    sub={scheduleSub(s, nowMs, lang, t)}
                                    trailing={
                                        <span className="relative z-10 flex">
                                            <Switch
                                                checked={s.active && s.remind.enabled}
                                                onChange={on =>
                                                    updateSchedule({ ...s, active: on ? true : s.active, remind: { ...s.remind, enabled: on } })
                                                }
                                                aria-label={fmt(t('reminders.remind_about'), { name: title })}
                                            />
                                        </span>
                                    }
                                />
                            );
                        }),
                        <ListRow
                            key="new"
                            tone="accent"
                            leading={<IconTile kind="neutral" icon={Plus} />}
                            title={t('reminders.new_schedule')}
                            onClick={() => setSheet({ open: true, schedule: null })}
                        />,
                    ]}
                </ListGroup>

                <ListGroup aria-label={t('reminders.delivery')} chevronIcon={CHEVRON} footer={t('reminders.system_footer')}>
                    <ListRow leading={<LabelIcon icon={Reminder} tone="orange" />} title={t('reminders.in_app')} value={t('reminders.always_on')} />
                    <ListRow
                        leading={<LabelIcon icon={Phone} tone="blue" />}
                        title={t('reminders.system')}
                        trailing={<Switch checked={prefs.notify} onChange={on => void toggleNotify(on)} aria-label={t('reminders.system')} />}
                    />
                    <ListRow leading={<LabelIcon icon={Calendar} tone="teal" />} title={t('reminders.calendar')} drillIn onClick={() => setView('calendar')} />
                </ListGroup>

            </ListStack>

            <ScheduleSheet
                open={sheet.open}
                schedule={sheet.schedule}
                regimens={regimens}
                onSave={s => (sheet.schedule ? updateSchedule(s) : addSchedule(s))}
                onDelete={deleteSchedule}
                onClose={() => setSheet(prev => ({ ...prev, open: false }))}
            />
        </YouPage>
    );
};

export default Reminders;
