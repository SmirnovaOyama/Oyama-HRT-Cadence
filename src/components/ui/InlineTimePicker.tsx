import React, { useId, useLayoutEffect, useRef } from 'react';
import { Button } from './Button';
import { useTranslation } from '../../contexts/LanguageContext';

function TimeColumn({ label, value, count, autoFocus, onChange }: {
    label: string;
    value: number;
    count: number;
    autoFocus: boolean;
    onChange: (value: number) => void;
}) {
    const id = useId();
    const listRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef(new Map<number, HTMLButtonElement>());

    useLayoutEffect(() => {
        const list = listRef.current;
        const selected = optionRefs.current.get(value);
        if (!list || !selected) return;
        list.scrollTop = selected.offsetTop - (list.clientHeight - selected.offsetHeight) / 2;
    }, [value]);

    useLayoutEffect(() => {
        if (autoFocus) optionRefs.current.get(value)?.focus({ preventScroll: true });
        // Focus only when opening this column, not when choosing the other one.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoFocus]);

    return (
        <div className="min-w-0 flex-1">
            <div id={id} className="pb-2 text-center text-sm font-normal text-[var(--c-muted)]">{label}</div>
            <div ref={listRef} role="listbox" aria-labelledby={id} className="relative h-55 overflow-y-auto overscroll-contain px-1" style={{ scrollbarWidth: 'thin' }}>
                {Array.from({ length: count }, (_, number) => (
                    <button
                        key={number}
                        ref={button => { if (button) optionRefs.current.set(number, button); else optionRefs.current.delete(number); }}
                        type="button"
                        role="option"
                        aria-selected={number === value}
                        tabIndex={number === value ? 0 : -1}
                        onClick={() => onChange(number)}
                        onKeyDown={event => {
                            const next = event.key === 'ArrowUp' ? Math.max(0, number - 1)
                                : event.key === 'ArrowDown' ? Math.min(count - 1, number + 1)
                                : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null;
                            if (next === null) return;
                            event.preventDefault();
                            onChange(next);
                            optionRefs.current.get(next)?.focus({ preventScroll: true });
                        }}
                        className={`block h-11 w-full rounded-full border text-base font-normal tabular-nums ${number === value
                            ? 'border-[var(--c-rule)] bg-[var(--c-plate)] text-[var(--c-ink)]'
                            : 'border-transparent bg-transparent text-[var(--c-muted)] hover:bg-[var(--c-plate)] hover:text-[var(--c-ink)]'}`}
                    >
                        {String(number).padStart(2, '0')}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function InlineTimePicker({ value, initialPart, onChange, onClose }: {
    value: Date;
    initialPart: 'hour' | 'minute';
    onChange: (part: 'hour' | 'minute', value: number) => void;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col gap-3 px-3 pb-3 pt-2">
            <div className="flex gap-4">
                <TimeColumn label={t('time.hour')} value={value.getHours()} count={24} autoFocus={initialPart === 'hour'} onChange={hour => onChange('hour', hour)} />
                <TimeColumn label={t('time.minute')} value={value.getMinutes()} count={60} autoFocus={initialPart === 'minute'} onChange={minute => onChange('minute', minute)} />
            </div>
            <Button compact variant="secondary" className="self-end" onClick={onClose}>{t('btn.ok')}</Button>
        </div>
    );
}
