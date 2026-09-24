import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from '../icons';
import { useTranslation } from '../../contexts/LanguageContext';
import { dateTimePartBounds, updateDateTimePart } from '../../utils/dateTimeParts';

type DatePart = 'year' | 'month' | 'day';

interface InlineDatePickerProps {
    value: Date;
    locale: string;
    initialPart: DatePart;
    onChange: (date: Date) => void;
    onClose: () => void;
}

// Construct calendar dates without Date's special interpretation of years 0–99.
const calendarDate = (year: number, month: number, day = 1) => {
    const date = new Date(2000, 0, 1, 12);
    date.setFullYear(year, month, day);
    return date;
};

const yearRangeStart = (year: number) => Math.floor((year - 1) / 12) * 12 + 1;

const firstWeekday = (locale: string): number => {
    const calendarLocale = new Intl.Locale(locale) as Intl.Locale & {
        weekInfo?: { firstDay: number };
        getWeekInfo?: () => { firstDay: number };
    };
    return (calendarLocale.getWeekInfo?.().firstDay ?? calendarLocale.weekInfo?.firstDay
        ?? (locale === 'zh-CN' || locale === 'tr-TR' ? 1 : 7)) % 7;
};

/** An in-flow calendar: browsing never changes the date until an option is chosen. */
export function InlineDatePicker({ value, locale, initialPart, onChange, onClose }: InlineDatePickerProps) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<DatePart>(initialPart);
    const [page, setPage] = useState(() => calendarDate(value.getFullYear(), value.getMonth()));
    const [yearStart, setYearStart] = useState(() => yearRangeStart(value.getFullYear()));
    const [focusedDay, setFocusedDay] = useState(value.getDate());
    const content = useRef<HTMLDivElement>(null);
    const choices = useRef<HTMLDivElement>(null);
    const focusNext = useRef(true);
    const focusMode = useRef<DatePart>(initialPart);
    const year = page.getFullYear();
    const month = page.getMonth();

    const formats = useMemo(() => ({
        month: new Intl.DateTimeFormat(locale, { month: 'long' }),
        monthYear: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
        year: new Intl.DateTimeFormat(locale, { year: 'numeric' }),
        full: new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
        weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
        weekdayLong: new Intl.DateTimeFormat(locale, { weekday: 'long' }),
        number: new Intl.NumberFormat(locale, { useGrouping: false }),
        firstDay: firstWeekday(locale),
    }), [locale]);

    useEffect(() => {
        setMode(initialPart);
        setPage(calendarDate(value.getFullYear(), value.getMonth()));
        setYearStart(yearRangeStart(value.getFullYear()));
        setFocusedDay(value.getDate());
        focusMode.current = initialPart;
        focusNext.current = true;
        // Switching a capsule opens that part of the current date. Choosing an
        // option below deliberately keeps the calendar open for its next step.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialPart]);

    useEffect(() => {
        if (!focusNext.current || mode !== focusMode.current) return;
        focusNext.current = false;
        const target = content.current?.querySelector<HTMLButtonElement>('[data-calendar-focus="true"]');
        target?.focus({ preventScroll: true });
        if (target && choices.current?.contains(target)) {
            const scroller = choices.current;
            scroller.scrollTop += target.getBoundingClientRect().top - scroller.getBoundingClientRect().top
                - (scroller.clientHeight - target.clientHeight) / 2;
        }
    }, [mode, year, month, yearStart, focusedDay, initialPart]);

    const days = dateTimePartBounds(page, 'day').max;
    const offset = (page.getDay() - formats.firstDay + 7) % 7;
    const rowCount = Math.ceil((offset + days) / 7);
    const today = new Date();
    const selectedMonth = year === value.getFullYear() && month === value.getMonth();
    const rangeEnd = Math.min(yearStart + 11, 9999);
    const header = mode === 'year'
        ? `${formats.year.format(calendarDate(yearStart, 0))} – ${formats.year.format(calendarDate(rangeEnd, 0))}`
        : mode === 'month' ? formats.year.format(page) : formats.monthYear.format(page);

    const destination = (direction: -1 | 1) => mode === 'day'
        ? calendarDate(year, month + direction)
        : calendarDate(mode === 'year' ? yearStart + direction * 12 : year + direction, month);

    const canBrowse = (direction: -1 | 1) => {
        const next = destination(direction);
        return next.getFullYear() >= 1 && next.getFullYear() <= 9999;
    };

    const destinationLabel = (direction: -1 | 1) => {
        if (!canBrowse(direction)) return header;
        const next = destination(direction);
        if (mode === 'day') return formats.monthYear.format(next);
        if (mode === 'month') return formats.year.format(next);
        return `${formats.year.format(next)} – ${formats.year.format(calendarDate(Math.min(next.getFullYear() + 11, 9999), 0))}`;
    };

    const browse = (direction: -1 | 1) => {
        if (!canBrowse(direction)) return;
        const next = destination(direction);
        if (mode === 'year') setYearStart(next.getFullYear());
        else {
            setPage(next);
            setFocusedDay(Math.min(focusedDay, dateTimePartBounds(next, 'day').max));
        }
    };

    const choosePart = (part: 'year' | 'month', nextValue: number) => {
        let next: Date;
        if (part === 'year') next = updateDateTimePart(value, 'year', nextValue);
        else {
            // Changing both year and month must clamp once to the destination:
            // February 29 → March in another year should retain day 29.
            const first = updateDateTimePart(updateDateTimePart(updateDateTimePart(value, 'day', 1), 'year', year), 'month', nextValue);
            next = updateDateTimePart(first, 'day', Math.min(value.getDate(), dateTimePartBounds(first, 'day').max));
        }
        onChange(next);
        setPage(calendarDate(next.getFullYear(), next.getMonth()));
        setFocusedDay(next.getDate());
        focusMode.current = 'day';
        focusNext.current = true;
        setMode('day');
    };

    const chooseDay = (day: number) => {
        const next = new Date(value.getTime());
        next.setFullYear(year, month, day);
        next.setSeconds(0, 0);
        onChange(next);
        onClose();
    };

    const onDayKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, day: number) => {
        let next: Date;
        const current = calendarDate(year, month, day);
        switch (event.key) {
            case 'ArrowLeft': next = calendarDate(year, month, day - 1); break;
            case 'ArrowRight': next = calendarDate(year, month, day + 1); break;
            case 'ArrowUp': next = calendarDate(year, month, day - 7); break;
            case 'ArrowDown': next = calendarDate(year, month, day + 7); break;
            case 'Home': next = calendarDate(year, month, day - (current.getDay() - formats.firstDay + 7) % 7); break;
            case 'End': next = calendarDate(year, month, day + 6 - (current.getDay() - formats.firstDay + 7) % 7); break;
            case 'PageUp':
            case 'PageDown': {
                const direction = event.key === 'PageUp' ? -1 : 1;
                next = calendarDate(year + (event.shiftKey ? direction : 0), month + (event.shiftKey ? 0 : direction));
                next.setDate(Math.min(day, dateTimePartBounds(next, 'day').max));
                break;
            }
            default: return;
        }
        event.preventDefault();
        if (next.getFullYear() < 1 || next.getFullYear() > 9999) return;
        focusNext.current = true;
        setFocusedDay(next.getDate());
        setPage(calendarDate(next.getFullYear(), next.getMonth()));
    };

    const optionValues = mode === 'month'
        ? Array.from({ length: 12 }, (_, index) => index + 1)
        : Array.from({ length: rangeEnd - yearStart + 1 }, (_, index) => yearStart + index);
    const selectedOption = mode === 'month' ? value.getMonth() + 1 : value.getFullYear();
    const focusOption = optionValues.includes(selectedOption) ? selectedOption : optionValues[0];

    return (
        <div ref={content} className="min-w-0 px-2 pb-3 pt-1" data-inline-date-picker={mode}>
            <div className="flex min-h-11 items-center justify-between gap-1">
                <button type="button" className="btn-icon shrink-0" disabled={!canBrowse(-1)} aria-label={destinationLabel(-1)} onClick={() => browse(-1)}>
                    <ChevronLeft size={20} />
                </button>
                <span className="min-w-0 text-center text-sm font-medium text-[var(--c-ink)]" aria-live="polite">{header}</span>
                <button type="button" className="btn-icon shrink-0" disabled={!canBrowse(1)} aria-label={destinationLabel(1)} onClick={() => browse(1)}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {mode === 'day' ? (
                <div role="grid" aria-label={formats.monthYear.format(page)} className="min-w-0">
                    <div role="row" className="grid grid-cols-7">
                        {Array.from({ length: 7 }, (_, index) => {
                            const weekday = calendarDate(2020, 10, 1 + formats.firstDay + index);
                            return <span key={index} role="columnheader" aria-label={formats.weekdayLong.format(weekday)} className="min-w-0 py-2 text-center text-xs text-[var(--c-muted)]">{formats.weekday.format(weekday)}</span>;
                        })}
                    </div>
                    {Array.from({ length: rowCount }, (_, row) => (
                        <div key={row} role="row" className="grid grid-cols-7">
                            {Array.from({ length: 7 }, (_, column) => {
                                const day = row * 7 + column - offset + 1;
                                if (day < 1 || day > days) return <span key={column} role="gridcell" />;
                                const selected = selectedMonth && day === value.getDate();
                                const current = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                                return (
                                    <span key={column} role="gridcell" aria-selected={selected} className="min-w-0">
                                        <button
                                            type="button"
                                            aria-label={formats.full.format(calendarDate(year, month, day))}
                                            aria-current={current ? 'date' : undefined}
                                            tabIndex={day === focusedDay ? 0 : -1}
                                            data-calendar-focus={day === focusedDay ? 'true' : undefined}
                                            className={`min-h-11 w-full min-w-0 rounded-full border text-base font-normal tabular-nums focus-visible:outline-offset-[-3px] ${selected ? 'border-[var(--c-rule)] bg-[var(--c-plate)] text-[var(--c-ink)]' : 'border-transparent text-[var(--c-ink)] hover:bg-[var(--c-plate)]'}`}
                                            onFocus={() => setFocusedDay(day)}
                                            onKeyDown={event => onDayKeyDown(event, day)}
                                            onClick={() => chooseDay(day)}
                                        >
                                            {formats.number.format(day)}
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    ))}
                </div>
            ) : (
                <div ref={choices} role="group" aria-label={t(`time.${mode}`)} className="relative max-h-64 overflow-y-auto overscroll-contain">
                    {optionValues.map(option => {
                        const selected = option === selectedOption && (mode === 'year' || year === value.getFullYear());
                        const label = mode === 'month'
                            ? formats.month.format(calendarDate(year, option - 1))
                            : formats.year.format(calendarDate(option, 0));
                        return (
                            <button
                                key={option}
                                type="button"
                                aria-pressed={selected}
                                data-calendar-focus={option === focusOption ? 'true' : undefined}
                                className="list-row"
                                onClick={() => choosePart(mode, option)}
                            >
                                <span className="flex-1">{label}</span>
                                {selected && <Check size={20} className="text-[var(--c-accent)]" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
