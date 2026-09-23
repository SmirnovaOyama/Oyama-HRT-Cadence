import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from './icons';
import { Button } from './ui';
import { useTranslation } from '../contexts/LanguageContext';
import { useEscape } from '../hooks/useEscape';
import { LOCALE_MAP } from '../utils/helpers';

interface DateTimePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
    initialDate?: Date;
    mode?: 'datetime' | 'date' | 'time';
    title?: string;
    inline?: boolean;
}

type DatePart = 'year' | 'month' | 'day' | 'hour' | 'minute';

interface PartOption {
    value: number;
    label: string;
    /** Shorter form for the closed pill, e.g. "Sep" for "September". */
    short?: string;
}

interface PartSelectProps {
    label: string;
    value: number;
    options: PartOption[];
    onChange: (value: number) => void;
}

/** One part of the date or time: a tinted pill (like the iOS compact date
 *  picker) that opens a hairline-bordered list with a check on the chosen
 *  value. No shadow. */
const PartSelect: React.FC<PartSelectProps> = ({ label, value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (typeof document !== 'undefined') setPortalTarget(document.body);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (
                (triggerRef.current && triggerRef.current.contains(event.target as Node)) ||
                (listRef.current && listRef.current.contains(event.target as Node))
            ) return;
            setIsOpen(false);
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey, true);
        };
    }, [isOpen]);

    useLayoutEffect(() => {
        if (!isOpen || !triggerRef.current) return;

        const updatePosition = () => {
            const rect = triggerRef.current!.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const flip = spaceBelow < 200 && spaceAbove > spaceBelow;
            const maxHeight = Math.max(160, Math.min(288, (flip ? spaceAbove : spaceBelow) - 16));
            const width = Math.max(rect.width + 48, 120);
            const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));

            if (flip) {
                setPositionStyle({ bottom: window.innerHeight - rect.top + 6, left, width, maxHeight });
            } else {
                setPositionStyle({ top: rect.bottom + 6, left, width, maxHeight });
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, { capture: true, passive: true });
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, { capture: true });
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const el = listRef.current?.querySelector('[data-selected="true"]') as HTMLElement | null;
        el?.scrollIntoView({ block: 'center' });
        el?.focus();
    }, [isOpen]);

    const selected = options.find(option => option.value === value);

    return (
        <>
            <button
                type="button"
                ref={triggerRef}
                onClick={() => setIsOpen(open => !open)}
                aria-label={`${label}: ${selected?.label ?? value}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-[10px] px-3 text-[1.0625rem] leading-6 tabular-nums transition-colors motion-reduce:transition-none ${isOpen
                    ? 'bg-[var(--c-accent-container)] text-[var(--c-on-accent-container)]'
                    : 'bg-[var(--c-plate)] text-[var(--c-ink)] hover:bg-[var(--c-plate-strong)]'}`}
            >
                {selected?.short ?? selected?.label ?? value}
            </button>

            {isOpen && portalTarget && createPortal(
                <div
                    ref={listRef}
                    role="listbox"
                    aria-label={label}
                    style={positionStyle}
                    className="dropdown-in fixed z-[80] overflow-y-auto rounded-[14px] border border-[var(--c-hairline)] bg-[var(--c-surface)] py-1.5"
                >
                    {options.map(option => {
                        const isSelected = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                data-selected={isSelected}
                                onClick={() => { onChange(option.value); setIsOpen(false); triggerRef.current?.focus(); }}
                                className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-start text-[1.0625rem] leading-6 tabular-nums text-[var(--c-ink)] hover:bg-[var(--c-plate)] focus-visible:bg-[var(--c-plate)] focus-visible:outline-none"
                            >
                                <span>{option.label}</span>
                                {isSelected && <Check size={22} className="shrink-0 text-[var(--c-accent)]" />}
                            </button>
                        );
                    })}
                </div>,
                portalTarget,
            )}
        </>
    );
};

const DateTimePicker: React.FC<DateTimePickerProps> = ({
    isOpen,
    onClose,
    onConfirm,
    initialDate,
    mode = 'datetime',
    title,
    inline = false,
}) => {
    const { t, lang } = useTranslation();
    useEscape(onClose, isOpen);
    const locale = LOCALE_MAP[lang] || 'en-US';

    const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const anchorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof document !== 'undefined') setPortalTarget(document.body);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const candidate = initialDate ? new Date(initialDate) : new Date();
        setSelectedDate(Number.isNaN(candidate.getTime()) ? new Date() : candidate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useLayoutEffect(() => {
        if (!isOpen || inline) return;

        const updatePosition = () => {
            if (window.innerWidth < 768) {
                setPositionStyle({});
                return;
            }
            setPositionStyle({
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 440,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [isOpen, inline]);

    const currentYear = new Date().getFullYear();
    const years = useMemo(() => {
        const first = Math.min(2015, selectedDate.getFullYear());
        const last = Math.max(currentYear + 10, selectedDate.getFullYear());
        return Array.from({ length: last - first + 1 }, (_, index) => first + index);
    }, [currentYear, selectedDate]);

    const months = useMemo(() => (
        Array.from({ length: 12 }, (_, month) => ({
            value: month,
            label: new Date(2020, month, 1).toLocaleDateString(locale, { month: 'long' }),
            short: new Date(2020, month, 1).toLocaleDateString(locale, { month: 'short' }),
        }))
    ), [locale]);

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

    const daysInSelectedMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0,
    ).getDate();

    const days = Array.from({ length: daysInSelectedMonth }, (_, index) => index + 1);
    const hours = Array.from({ length: 24 }, (_, index) => index);
    const minutes = Array.from({ length: 60 }, (_, index) => index);

    const setPart = (part: DatePart, value: number) => {
        const next = new Date(selectedDate);

        if (part === 'year' || part === 'month') {
            const originalDay = next.getDate();
            next.setDate(1);
            if (part === 'year') next.setFullYear(value);
            else next.setMonth(value);
            const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
            next.setDate(Math.min(originalDay, maxDay));
        } else if (part === 'day') {
            next.setDate(value);
        } else if (part === 'hour') {
            next.setHours(value);
        } else {
            next.setMinutes(value);
        }

        next.setSeconds(0, 0);
        setSelectedDate(next);
        // Inline pickers live inside a form — apply changes immediately instead
        // of requiring a separate confirm step; closing stays under the caller's control.
        if (inline) onConfirm(next);
    };

    if (!isOpen) return inline ? null : <div ref={anchorRef} className="hidden" />;
    if (!inline && !portalTarget) return <div ref={anchorRef} className="hidden" />;

    const showDate = mode !== 'time';
    const showTime = mode !== 'date';

    const datePart = (part: 'year' | 'month' | 'day') => {
        if (part === 'year') {
            return (
                <PartSelect
                    key="year"
                    label={t('time.year')}
                    value={selectedDate.getFullYear()}
                    options={years.map(year => ({ value: year, label: String(year) }))}
                    onChange={next => setPart('year', next)}
                />
            );
        }
        if (part === 'month') {
            return (
                <PartSelect
                    key="month"
                    label={t('time.month')}
                    value={selectedDate.getMonth()}
                    options={months}
                    onChange={next => setPart('month', next)}
                />
            );
        }
        return (
            <PartSelect
                key="day"
                label={t('time.day')}
                value={selectedDate.getDate()}
                options={days.map(day => ({ value: day, label: String(day) }))}
                onChange={next => setPart('day', next)}
            />
        );
    };

    // Two list rows: Date with its pills, Time with its pills.
    const body = (
        <div className="list-group">
            {showDate && (
                <div className="list-row flex-wrap py-2">
                    <span className="list-row-text">
                        <span className="list-row-title">{t('log.picker_date')}</span>
                    </span>
                    <span className="flex flex-wrap items-center justify-end gap-1.5">
                        {dateOrder.map(datePart)}
                    </span>
                </div>
            )}
            {showDate && showTime && <div className="list-sep" role="presentation" aria-hidden="true" />}
            {showTime && (
                <div className="list-row py-2">
                    <span className="list-row-text">
                        <span className="list-row-title">{t('log.picker_time')}</span>
                    </span>
                    <span className="flex items-center gap-1 tabular-nums">
                        <PartSelect
                            label={t('time.hour')}
                            value={selectedDate.getHours()}
                            options={hours.map(hour => ({ value: hour, label: String(hour).padStart(2, '0') }))}
                            onChange={next => setPart('hour', next)}
                        />
                        <span aria-hidden="true" className="text-[1.0625rem] font-semibold text-[var(--c-muted)]">:</span>
                        <PartSelect
                            label={t('time.minute')}
                            value={selectedDate.getMinutes()}
                            options={minutes.map(minute => ({ value: minute, label: String(minute).padStart(2, '0') }))}
                            onChange={next => setPart('minute', next)}
                        />
                    </span>
                </div>
            )}
        </div>
    );

    if (inline) return <div className="mt-3">{body}</div>;

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

    const inner = (
        <div className="flex flex-col gap-4 p-4">
            <div className="px-1">
                {title && <h2 className="m-0 text-xl font-semibold text-[var(--c-ink)]">{title}</h2>}
                <p className="m-0 text-sm tabular-nums text-[var(--c-muted)]">
                    {[showDate ? dateSummary : null, showTime ? timeSummary : null].filter(Boolean).join(', ')}
                </p>
            </div>

            {body}

            <div className="flex gap-3">
                <Button variant="secondary" compact className="flex-1 basis-0" onClick={onClose}>
                    {t('btn.cancel')}
                </Button>
                <Button variant="primary" compact className="flex-1 basis-0" onClick={() => onConfirm(selectedDate)}>
                    {t('btn.ok')}
                </Button>
            </div>
        </div>
    );

    return (
        <>
            <div ref={anchorRef} className="hidden" />
            {createPortal(
                <>
                    <button
                        type="button"
                        aria-label={t('btn.cancel')}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-[var(--c-scrim)]"
                    />
                    <div
                        ref={containerRef}
                        role="dialog"
                        aria-modal="true"
                        style={positionStyle}
                        className={`fixed z-[70] overflow-hidden border border-[var(--c-hairline)] bg-[var(--c-paper)] ${Object.keys(positionStyle).length > 0 ? 'rounded-[20px]' : 'bottom-0 left-0 right-0 w-full rounded-t-[28px] border-b-0 pb-[env(safe-area-inset-bottom)]'}`}
                    >
                        {inner}
                    </div>
                </>,
                portalTarget,
            )}
        </>
    );
};

export default DateTimePicker;
