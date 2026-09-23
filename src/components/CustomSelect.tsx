import React, { useId, useState } from 'react';
import { ChevronDown, Check } from './icons';

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
 * the label, the chosen value and a chevron. Opened, the options unfold
 * underneath as rows of the same inset group, with a trailing check on the
 * chosen one. No floating menu, no radio circles.
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
    const listId = useId();
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
                aria-expanded={isOpen}
                aria-controls={listId}
                onClick={() => setIsOpen(open => !open)}
            >
                {leading != null && <span className="list-row-leading">{leading}</span>}
                <span className="list-row-text">
                    <span className="list-row-title">{label ?? summary}</span>
                </span>
                {label != null && <span className="list-row-value">{summary}</span>}
                <span className="list-row-chevron" aria-hidden="true">
                    <ChevronDown size={16} className={`chev ${isOpen ? 'rotate-180' : ''}`} />
                </span>
            </button>
            {isOpen && (
                <div id={listId} role="radiogroup" aria-label={label}>
                    {options.map((opt, i) => {
                        const isSelected = opt.value === value;
                        const iconAbove = i === 0 ? leading != null : options[i - 1].icon != null;
                        return (
                            <React.Fragment key={opt.value}>
                                <div
                                    role="presentation"
                                    aria-hidden="true"
                                    className={iconAbove ? 'list-sep list-sep-icon' : 'list-sep'}
                                />
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={isSelected}
                                    className={`list-row ${opt.icon != null ? 'list-row-tall' : ''} ${opt.description ? 'list-row-has-value' : ''}`}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                >
                                    {opt.icon != null ? (
                                        <span className="list-row-leading">{opt.icon}</span>
                                    ) : hasIcons ? (
                                        <span className="list-row-leading w-10" />
                                    ) : null}
                                    <span className="list-row-text">
                                        <span className="list-row-title">{opt.label}</span>
                                    </span>
                                    {opt.description && <span className="list-row-value">{opt.description}</span>}
                                    {isSelected && (
                                        <span className="list-row-check" aria-hidden="true">
                                            <Check size={22} />
                                        </span>
                                    )}
                                </button>
                            </React.Fragment>
                        );
                    })}
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
