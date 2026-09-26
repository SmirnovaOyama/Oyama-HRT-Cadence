import React, { useId, useRef, useState } from 'react';
import { ChevronDown, Check } from './icons';
import { ListGroup, ListRow } from './ui';
import './CustomSelect.css';

interface Option {
    value: string;
    label: string;
    /** Leading element, e.g. a 40px icon tile. */
    icon?: React.ReactNode;
    /** Short muted value at the end of the option's row ("10 min"), and
     *  after the chosen label when closed. One line: a row shows a value or a
     *  sub-line, never an explanation (spec/format_rules.md). */
    description?: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (val: string) => void;
    options: Option[];
    /** Row title. The chosen option shows as the row's value. */
    label?: string;
    /** Leading element of the closed row. Defaults to the chosen option's icon. */
    icon?: React.ReactNode;
    /** Sentence-case heading above the group. */
    header?: React.ReactNode;
    /** Keep compact labelled triggers text-only while decorating their options. */
    showSelectedIcon?: boolean;
    /** Place a chosen option's icon beside its trailing value instead of the label. */
    selectedIconPosition?: 'leading' | 'value';
    /** Muted note under the group. */
    footer?: React.ReactNode;
    /** Render only the rows, for a caller that puts them in its own .list-group. */
    bare?: boolean;
    defaultOpen?: boolean;
}

/**
 * A pick-one list view (spec/listview_v3.md). Closed, it is a single row:
 * the label, the chosen value and a chevron. Choices expand below the row,
 * with a trailing check on the chosen one. Selection keeps the choices open;
 * the trigger or Escape closes them.
 */
const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onChange,
    options,
    label,
    icon,
    header,
    footer,
    bare = false,
    defaultOpen = false,
    showSelectedIcon = true,
    selectedIconPosition = 'leading',
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [lastPicked, setLastPicked] = useState<string | null>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const choicesId = useId();
    const close = () => {
        setIsOpen(false);
        trigger.current?.focus();
    };
    const selected = options.find(o => o.value === value);
    const leading = icon ?? (showSelectedIcon && selectedIconPosition === 'leading' ? selected?.icon : undefined);
    const valueIcon = showSelectedIcon && selectedIconPosition === 'value' ? selected?.icon : undefined;
    const hasIcons = options.some(o => o.icon != null);

    const summary = selected
        ? selected.description
            ? `${selected.label}, ${selected.description}`
            : selected.label
        : value;

    const rows = (
        <>
            <button
                ref={trigger}
                type="button"
                aria-expanded={isOpen}
                data-escape-local={isOpen ? "true" : undefined}
                aria-controls={choicesId}
                className={`list-row cadence-select-trigger ${leading != null ? 'list-row-tall' : ''} ${label != null ? 'list-row-has-value' : ''}`}
                onClick={() => setIsOpen(open => !open)}
                onKeyDown={event => {
                    if (event.key === 'Escape' && isOpen) { event.stopPropagation(); close(); }
                }}
            >
                {leading != null && <span key={value} className={`list-row-leading ${lastPicked === value ? 'cadence-select-picked' : ''}`}>{leading}</span>}
                <span className="list-row-text">
                    <span className="list-row-title">{label ?? summary}</span>
                </span>
                {label != null && (
                    <span className={`list-row-value ${valueIcon != null ? 'flex items-center justify-end gap-2' : ''}`}>
                        {valueIcon != null && <span key={value} aria-hidden="true" className={`select-value-icon ${lastPicked === value ? 'cadence-select-picked' : ''}`}>{valueIcon}</span>}
                        <span className="min-w-0 truncate">{summary}</span>
                    </span>
                )}
                <span className="list-row-chevron" aria-hidden="true">
                    <ChevronDown size={16} />
                </span>
            </button>
            <div
                id={choicesId}
                className="cadence-select-choices"
                data-open={isOpen}
                data-escape-local={isOpen ? 'true' : undefined}
                aria-hidden={!isOpen}
                // React 18 does not forward a boolean inert attribute. Set it
                // on the element while retaining the rows for the closing motion.
                ref={element => { element?.toggleAttribute('inert', !isOpen); }}
                onKeyDown={event => {
                    if (event.key === 'Escape' && isOpen) { event.stopPropagation(); close(); }
                }}
            >
                <div className="cadence-select-choices-inner">
                    <div className={leading != null ? 'list-sep list-sep-icon' : 'list-sep'} aria-hidden="true" />
                    <ListGroup
                        className="[&>.list-group]:rounded-none [&>.list-group]:border-0 [&>.list-group]:bg-transparent"
                        selection="single"
                        aria-label={label ?? selected?.label ?? value}
                        checkIcon={<Check size={22} />}
                    >
                        {options.map(opt => (
                            <ListRow
                                key={opt.value}
                                title={opt.label}
                                value={opt.description}
                                leading={opt.icon ?? (hasIcons ? <span className="w-10" /> : undefined)}
                                selected={opt.value === value}
                                tabIndex={isOpen ? undefined : -1}
                                className={lastPicked === opt.value ? 'cadence-select-choice-picked' : undefined}
                                onClick={() => {
                                    if (opt.value !== value) setLastPicked(opt.value);
                                    onChange(opt.value);
                                }}
                            />
                        ))}
                    </ListGroup>
                </div>
            </div>
        </>
    );

    if (bare) return rows;

    return (
        <div>
            {header != null && <div className="list-group-header">{header}</div>}
            <div className="list-group">{rows}</div>
            {footer != null && <div className="list-group-footer">{footer}</div>}
        </div>
    );
};

export default CustomSelect;
