import React, { useState } from 'react';
import { ChevronRight, Check } from './icons';
import { ListGroup, ListRow } from './ui';
import { SecondaryPage } from './ui/SecondaryPage';

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
 * the label, the chosen value and a chevron. The row opens a secondary page
 * of grouped choices, with a trailing check on the chosen one.
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
                type="button"
                className={`list-row ${leading != null ? 'list-row-tall' : ''} ${label != null ? 'list-row-has-value' : ''}`}
                onClick={() => setIsOpen(true)}
            >
                {leading != null && <span className="list-row-leading">{leading}</span>}
                <span className="list-row-text">
                    <span className="list-row-title">{label ?? summary}</span>
                </span>
                {label != null && <span className="list-row-value">{summary}</span>}
                <span className="list-row-chevron" aria-hidden="true">
                    <ChevronRight size={16} />
                </span>
            </button>
            {isOpen && (
                <SecondaryPage title={label ?? header ?? selected?.label ?? value} onBack={() => setIsOpen(false)}>
                    <ListGroup
                        selection="single"
                        aria-label={label ?? selected?.label ?? value}
                        checkIcon={<Check size={22} />}
                        footer={footer}
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
                                    setIsOpen(false);
                                }}
                            />
                        ))}
                    </ListGroup>
                </SecondaryPage>
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
