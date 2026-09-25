import React, { useId, useRef, useState } from 'react';
import { ChevronDown, Check } from './icons';
import { ListGroup, ListRow } from './ui';

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
    /** Muted note under the group. */
    footer?: React.ReactNode;
    /** Render only the rows, for a caller that puts them in its own .list-group. */
    bare?: boolean;
    defaultOpen?: boolean;
}

/**
 * A pick-one list view (spec/listview_v3.md). Closed, it is a single row:
 * the label, the chosen value and a chevron. Choices expand below the row,
 * with a trailing check on the chosen one.
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
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const trigger = useRef<HTMLButtonElement>(null);
    const choicesId = useId();
    const close = () => {
        setIsOpen(false);
        trigger.current?.focus();
    };
    const selected = options.find(o => o.value === value);
    const leading = icon ?? selected?.icon;
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
                aria-controls={isOpen ? choicesId : undefined}
                className={`list-row ${leading != null ? 'list-row-tall' : ''} ${label != null ? 'list-row-has-value' : ''}`}
                onClick={() => setIsOpen(open => !open)}
                onKeyDown={event => {
                    if (event.key === 'Escape' && isOpen) { event.stopPropagation(); close(); }
                }}
            >
                {leading != null && <span className="list-row-leading">{leading}</span>}
                <span className="list-row-text">
                    <span className="list-row-title">{label ?? summary}</span>
                </span>
                {label != null && <span className="list-row-value">{summary}</span>}
                <span className="list-row-chevron" aria-hidden="true">
                    <ChevronDown size={16} className={isOpen ? 'rotate-180' : undefined} />
                </span>
            </button>
            {isOpen && (
                <div id={choicesId} onKeyDown={event => {
                    if (event.key === 'Escape') { event.stopPropagation(); close(); }
                }}>
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
                                onClick={() => {
                                    onChange(opt.value);
                                    close();
                                }}
                            />
                        ))}
                    </ListGroup>
                </div>
            )}
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
