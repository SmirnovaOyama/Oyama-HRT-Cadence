import React from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { dateForTimeOfDay } from '../../utils/dateTimeParts';
import { formatLocalDate } from '../../utils/reminders';
import DateTimePicker from '../DateTimePicker';
import { Minus } from '../icons';
import { Button, ListGroup, ListRow } from '../ui';

const toClock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Clock choices belong to the schedule draft; opening one never leaves the form. */
export function ScheduleTimingFields({ kind, times, anchorDate, onTimesChange, onAnchorChange }: {
    kind: 'daily' | 'every';
    times: number[];
    anchorDate: string;
    onTimesChange: (times: number[]) => void;
    onAnchorChange: (date: string) => void;
}) {
    const { t } = useTranslation();
    const addTime = () => {
        let next = Math.round(((times[times.length - 1] ?? 21 * 60) + 720) / 5) * 5 % 1440;
        while (times.includes(next)) next = (next + 60) % 1440;
        onTimesChange([...times, next]);
    };

    return (
        <ListGroup aria-label={t('reminders.sheet.times')}>
            {(kind === 'every' ? times.slice(0, 1) : times).map((minutes, index) => (
                <DateTimePicker
                    // Reset open panels when rows are added/removed, so an
                    // index shifted by deletion cannot inherit another row's picker.
                    key={`time-${times.length}-${index}`}
                    isOpen inline embedded mode="time"
                    initialDate={dateForTimeOfDay(minutes)}
                    onClose={() => {}}
                    onConfirm={date => onTimesChange(times.map((time, i) => i === index ? date.getHours() * 60 + date.getMinutes() : time))}
                    trailing={kind === 'daily' && times.length > 1 ? (
                        <Button
                            variant="icon"
                            aria-label={t('reminders.sheet.remove_time').replace('{time}', toClock(minutes))}
                            onClick={() => onTimesChange(times.filter((_, i) => i !== index))}
                        >
                            <Minus size={22} />
                        </Button>
                    ) : undefined}
                />
            ))}
            {kind === 'every' ? (
                <DateTimePicker
                    isOpen inline embedded mode="date"
                    title={t('reminders.sheet.next_on')}
                    initialDate={new Date(`${anchorDate}T12:00:00`)}
                    onClose={() => {}}
                    onConfirm={date => onAnchorChange(formatLocalDate(date.getTime()))}
                />
            ) : times.length < 6 ? (
                <ListRow tone="accent" title={t('reminders.sheet.add_time')} onClick={addTime} />
            ) : null}
        </ListGroup>
    );
}
