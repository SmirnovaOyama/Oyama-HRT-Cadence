import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from './ui';
import { SecondaryPage } from './ui/SecondaryPage';
import { InlineDatePicker } from './ui/InlineDatePicker';
import { InlineTimePicker } from './ui/InlineTimePicker';
import { useTranslation } from '../contexts/LanguageContext';
import { LOCALE_MAP } from '../utils/helpers';
import { dateTimePartValue, updateDateTimePart, type DateTimePart } from '../utils/dateTimeParts';
import { Calendar, Clock, Check, Close } from './icons';
import { LabelIcon } from './ui/LabelIcon';

interface DateTimePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    initialDate?: Date;
    mode?: 'datetime' | 'date' | 'time';
    title?: string;
    inline?: boolean;
    /** Render rows inside an existing list group. */
    embedded?: boolean;
    /** An action belonging to a single date-only or time-only row. */
    trailing?: React.ReactNode;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
    isOpen,
    onClose,
    onConfirm,
    initialDate,
    mode = 'datetime',
    title,
    inline = false,
    embedded = false,
    trailing,
}) => {
    const { t, lang } = useTranslation();
    const locale = LOCALE_MAP[lang] || 'en-US';
    const panelId = useId();
    const [activePart, setActivePart] = useState<DateTimePart | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);

    const [selectedDate, setSelectedDate] = useState(() => {
        const candidate = initialDate ? new Date(initialDate) : new Date();
        return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
    });
    const selectedDateRef = useRef(selectedDate);
    useEffect(() => {
        setActivePart(null);
        if (!isOpen) return;
        const candidate = initialDate ? new Date(initialDate) : new Date();
        selectedDateRef.current = Number.isNaN(candidate.getTime()) ? new Date() : candidate;
        setSelectedDate(selectedDateRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Inline editors follow deliberate parent updates as well as their own
    // commits (for example, restoring a form draft). Full-page edits keep
    // their local draft until Confirm or Back.
    const initialTime = initialDate?.getTime();
    useEffect(() => {
        if (!isOpen || !inline || !Number.isFinite(initialTime) || initialTime === selectedDateRef.current.getTime()) return;
        selectedDateRef.current = new Date(initialTime);
        setSelectedDate(selectedDateRef.current);
    }, [isOpen, inline, initialTime]);

    // Year, month and day in the order the language writes them.
    const dateOrder = useMemo<('year' | 'month' | 'day')[]>(() => {
        try {
            const parts = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' })
                .formatToParts(new Date(2020, 8, 26))
                .map(p => p.type)
                .filter((type): type is 'year' | 'month' | 'day' => type === 'year' || type === 'month' || type === 'day');
            return parts.length === 3 ? parts : ['year', 'month', 'day'];
        } catch {
            return ['year', 'month', 'day'];
        }
    }, [locale]);

    const applyDate = (next: Date) => {
        selectedDateRef.current = next;
        setSelectedDate(next);
        // Inline pickers live inside a form — apply changes immediately instead
        // of requiring a separate confirm step; closing stays under the caller's control.
        if (inline) onConfirm(next);
    };
    const setPart = (part: DateTimePart, value: number) => applyDate(updateDateTimePart(selectedDateRef.current, part, value));
    const closePicker = () => {
        setActivePart(null);
        triggerRef.current?.focus({ preventScroll: true });
    };

    if (!isOpen) return null;

    const showDate = mode !== 'time';
    const showTime = mode !== 'date';

    const partButton = (part: DateTimePart) => {
        const number = dateTimePartValue(selectedDate, part);
        const display = part === 'month' ? selectedDate.toLocaleDateString(locale, { month: 'short' })
            : part === 'hour' || part === 'minute' ? String(number).padStart(2, '0') : String(number);
        return (
            <button
                key={part}
                type="button"
                aria-label={`${t(`time.${part}`)}: ${display}`}
                aria-expanded={activePart === part}
                aria-controls={activePart === part ? panelId : undefined}
                onClick={event => {
                    triggerRef.current = event.currentTarget;
                    setActivePart(activePart === part ? null : part);
                }}
                className={`date-time-trigger inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full border-0 px-3 text-[1.0625rem] leading-6 font-normal tabular-nums text-[var(--c-ink)] transition-colors motion-reduce:transition-none ${activePart === part ? 'bg-[var(--c-plate-strong)]' : 'bg-[var(--c-plate)] hover:bg-[var(--c-plate-strong)]'}`}
            >
                {display}
            </button>
        );
    };
    const datePart = activePart === 'year' || activePart === 'month' || activePart === 'day' ? activePart : null;
    const timePart = activePart === 'hour' || activePart === 'minute' ? activePart : null;

    // Two list rows: Date with its pills, Time with its pills.
    const body = (
        <div
            className={embedded ? undefined : 'list-group'}
            data-escape-local={activePart ? 'true' : undefined}
            onKeyDown={event => {
                if (event.key === 'Escape' && activePart) {
                    event.preventDefault();
                    event.stopPropagation();
                    closePicker();
                }
            }}
        >
            {showDate && (
                <div className="list-row flex-wrap py-2">
                    <span className="list-row-text">
                        <span className="list-row-title"><span className="field-label"><LabelIcon icon={Calendar} tone="blue" />{inline && mode === 'date' && title ? title : t('log.picker_date')}</span></span>
                    </span>
                    <span className="flex flex-wrap items-center justify-end gap-1.5">
                        {dateOrder.map(partButton)}
                    </span>
                    {mode === 'date' && trailing}
                </div>
            )}
            {showDate && datePart && (
                <div id={panelId} className="inline-picker-enter">
                    <InlineDatePicker key={datePart} value={selectedDate} locale={locale} initialPart={datePart} onChange={applyDate} onClose={closePicker} />
                </div>
            )}
            {showDate && showTime && <div className="list-sep" role="presentation" aria-hidden="true" />}
            {showTime && (
                <div className="list-row py-2">
                    <span className="list-row-text">
                        <span className="list-row-title"><span className="field-label"><LabelIcon icon={Clock} tone="purple" />{inline && mode === 'time' && title ? title : t('log.picker_time')}</span></span>
                    </span>
                    <span className="flex items-center gap-1 tabular-nums">
                        {partButton('hour')}
                        <span aria-hidden="true" className="text-[1.0625rem] font-semibold text-[var(--c-muted)]">:</span>
                        {partButton('minute')}
                    </span>
                    {mode === 'time' && trailing}
                </div>
            )}
            {showTime && timePart && (
                <div id={panelId} className="inline-picker-enter">
                    <InlineTimePicker key={timePart} value={selectedDate} initialPart={timePart} onChange={setPart} onClose={closePicker} />
                </div>
            )}
        </div>
    );

    if (inline) return embedded ? body : <div className="mt-3">{body}</div>;

    const dateSummary = selectedDate.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const timeSummary = selectedDate.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    return (
        <SecondaryPage
            title={title ?? (showDate ? t('log.picker_date') : t('log.picker_time'))}
            onBack={onClose}
        >
            <div className="flex flex-col gap-6">
                <p className="m-0 text-sm tabular-nums text-[var(--c-muted)]">
                    {[showDate ? dateSummary : null, showTime ? timeSummary : null].filter(Boolean).join(', ')}
                </p>

                {body}

                <div className="flex gap-3">
                    <Button variant="secondary" compact className="flex-1 basis-0" onClick={onClose}>
                        <Close size={18} />
                        {t('btn.cancel')}
                    </Button>
                    <Button variant="primary" compact className="flex-1 basis-0" onClick={() => onConfirm(selectedDateRef.current)}>
                        <Check size={18} />
                        {t('btn.ok')}
                    </Button>
                </div>
            </div>
        </SecondaryPage>
    );
};

export default DateTimePicker;
