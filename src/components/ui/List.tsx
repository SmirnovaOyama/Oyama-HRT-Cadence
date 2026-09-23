import React, { createContext, useContext, useEffect, useId } from 'react';

/* Apple inset grouped list (design/cadence/spec/listview_v3.md), drawn by the
   .list-* classes in index.css. Icons come in as elements: this file never
   imports an icon library.

   Row density follows design/cadence/spec/format_rules.md, which wins over the
   boards: a one-line title, then EITHER a trailing value OR one short state
   sub-line (never both). Explanations go in the group footer. Settings-style
   lists carry no icon tiles, and a group either gives every row a tile or none. */

const DEV = import.meta.env.DEV;

/** Plain text of a title, for dev warnings. */
const textOf = (node: React.ReactNode): string => {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(textOf).join('');
    if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
    return '';
};

const warned = new Set<string>();
/** console.warn once per message, in development only. */
const warnOnce = (message: string) => {
    if (!DEV || warned.has(message)) return;
    warned.add(message);
    console.warn(message);
};

type Selection = 'single' | 'multiple';

interface ListContextValue {
    selection?: Selection;
    checkIcon?: React.ReactNode;
    chevronIcon?: React.ReactNode;
}

const ListContext = createContext<ListContextValue>({});

export interface ListGroupProps {
    children: React.ReactNode;
    /** Small sentence-case label above the group (15/20 600 muted, 8px above
     *  the group). Also labels a choice group. */
    header?: React.ReactNode;
    /** One short muted sentence under the group (15/22, 8px below). This is
     *  where a row's explanation goes; most groups need none. */
    footer?: React.ReactNode;
    /** Pick one (radiogroup, rows get role=radio) or pick many (rows get
     *  aria-pressed). Leave unset for plain navigation or settings rows. */
    selection?: Selection;
    /** Check drawn after a selected row. A row's own `check` wins. */
    checkIcon?: React.ReactNode;
    /** Chevron drawn after a drill-in row. A row's own `chevron` wins. */
    chevronIcon?: React.ReactNode;
    className?: string;
    'aria-label'?: string;
}

/** A white, hairline-bordered group of rows. Separators are inserted between
 *  rows automatically, inset to the text column (68px after a row with a
 *  leading icon tile, 16px otherwise). */
export function ListGroup({
    children,
    header,
    footer,
    selection,
    checkIcon,
    chevronIcon,
    className,
    'aria-label': ariaLabel,
}: ListGroupProps) {
    const headerId = useId();
    const rows = React.Children.toArray(children).filter(React.isValidElement);

    const items: React.ReactNode[] = [];
    rows.forEach((row, i) => {
        if (i > 0) {
            const above = rows[i - 1].props as { leading?: React.ReactNode };
            items.push(
                <div
                    key={`sep-${i}`}
                    className={above.leading ? 'list-sep list-sep-icon' : 'list-sep'}
                    role="presentation"
                    aria-hidden="true"
                />,
            );
        }
        items.push(row);
    });

    // format_rules 5: within one group, every row has a tile or none does.
    const tiles = rows.filter(row => (row.props as { leading?: React.ReactNode }).leading != null).length;
    const mixedTiles = tiles > 0 && tiles < rows.length;
    const groupLabel = textOf(header) || ariaLabel || '';
    useEffect(() => {
        if (mixedTiles) {
            warnOnce(
                `[ListGroup]${groupLabel ? ` "${groupLabel}":` : ''} ${tiles} of ${rows.length} rows have a leading tile. ` +
                'Give every row in a group a tile or none (design/cadence/spec/format_rules.md rule 5).',
            );
        }
    }, [mixedTiles, groupLabel, tiles, rows.length]);

    const role = selection === 'single' ? 'radiogroup' : selection === 'multiple' ? 'group' : undefined;

    return (
        <ListContext.Provider value={{ selection, checkIcon, chevronIcon }}>
            <div className={className}>
                {header != null && (
                    <div id={headerId} className="list-group-header">
                        {header}
                    </div>
                )}
                <div
                    className="list-group"
                    role={role}
                    aria-label={ariaLabel}
                    aria-labelledby={role && !ariaLabel && header != null ? headerId : undefined}
                >
                    {items}
                </div>
                {footer != null && <div className="list-group-footer">{footer}</div>}
            </div>
        </ListContext.Provider>
    );
}

/** A column of ListGroups on a settings-style page: 24px between groups
 *  (format_rules 9). Use `spacing="sections"` for 32px between content
 *  sections. Also available as the .list-stack / .section-stack classes. */
export function ListStack({
    children,
    spacing = 'groups',
    className,
}: {
    children: React.ReactNode;
    spacing?: 'groups' | 'sections';
    className?: string;
}) {
    const base = spacing === 'sections' ? 'section-stack' : 'list-stack';
    return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}

interface ListRowOwnProps {
    /** One short line. With a `value` it never wraps: it keeps its natural
     *  width and the value takes what is left. Shorten the copy if it does
     *  not fit at 375px (about 26 characters). */
    title: React.ReactNode;
    /** One short line of state under the title ("Backed up 4 minutes ago",
     *  "Off"), 15px, about 40 characters at most. It is cut to one line; put
     *  explanations in the group footer. Makes the row 64px tall. Do not
     *  combine with `value`. */
    sub?: React.ReactNode;
    /** Let `sub` wrap onto more lines. Rare: content lists only, never for an
     *  explanation. */
    wrapSub?: boolean;
    /** Muted one-line value on the right ("English", "62.5 kg"). It gives way
     *  to the title and is cut with an ellipsis only as a last resort. Do not
     *  combine with `sub`. */
    value?: React.ReactNode;
    /** destructive: red title, for the destructive group at the bottom of a
     *  page ("Clear all records", "Delete account"). accent: accent-coloured
     *  title for a plain action row ("Sign out"). */
    tone?: 'destructive' | 'accent';
    /** 40px icon tile or similar at the start. Makes the row 64px tall. */
    leading?: React.ReactNode;
    /** Anything else at the end, such as a Switch. Drawn after `value`. */
    trailing?: React.ReactNode;
    /** Choice rows: true draws the check. Unselected rows show no mark. */
    selected?: boolean;
    /** Overrides the group's check icon. */
    check?: React.ReactNode;
    /** Opens a picker or another screen: draws the chevron, never a check. */
    drillIn?: boolean;
    /** Overrides the group's chevron icon. */
    chevron?: React.ReactNode;
    /** Force the 64px height. */
    tall?: boolean;
    disabled?: boolean;
    className?: string;
}

type ListRowButtonProps = ListRowOwnProps &
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ListRowOwnProps | 'children'> & { href?: undefined };

type ListRowAnchorProps = ListRowOwnProps &
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ListRowOwnProps | 'children'> & { href: string };

export type ListRowProps = ListRowButtonProps | ListRowAnchorProps;

/** One row: a <button>, or an <a> when given `href`. With neither `href`,
 *  `onClick` nor `selected` it renders as a plain <div>, for rows that hold
 *  their own control (a Switch in `trailing`). */
export function ListRow(props: ListRowProps) {
    const {
        title,
        sub,
        wrapSub,
        value,
        tone,
        leading,
        trailing,
        selected,
        check,
        drillIn,
        chevron,
        tall,
        disabled,
        className,
        ...rest
    } = props;
    const ctx = useContext(ListContext);

    // format_rules 2: a value or a sub-line, never both.
    const valueAndSub = value != null && sub != null;
    const titleText = textOf(title);
    useEffect(() => {
        if (valueAndSub) {
            warnOnce(
                `[ListRow] ${titleText ? `"${titleText}"` : 'A row'} has both a value and a sub-line. Show one of them and move any ` +
                'explanation to the group footer (design/cadence/spec/format_rules.md rule 2).',
            );
        }
    }, [valueAndSub, titleText]);

    const classes = [
        'list-row',
        (tall || sub != null || leading != null) && 'list-row-tall',
        value != null && 'list-row-has-value',
        tone === 'destructive' && 'list-row-destructive',
        tone === 'accent' && 'list-row-accent',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const checkIcon = check ?? ctx.checkIcon;
    const chevronIcon = chevron ?? ctx.chevronIcon;

    const content = (
        <>
            {leading != null && <span className="list-row-leading">{leading}</span>}
            <span className="list-row-text">
                <span className="list-row-title">{title}</span>
                {sub != null && <span className={wrapSub ? 'list-row-sub list-row-sub-wrap' : 'list-row-sub'}>{sub}</span>}
            </span>
            {value != null && <span className="list-row-value">{value}</span>}
            {trailing}
            {selected && !drillIn && checkIcon != null && (
                <span className="list-row-check" aria-hidden="true">
                    {checkIcon}
                </span>
            )}
            {drillIn && chevronIcon != null && (
                <span className="list-row-chevron" aria-hidden="true">
                    {chevronIcon}
                </span>
            )}
        </>
    );

    if (rest.href !== undefined) {
        const anchorProps = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
        return (
            <a
                {...anchorProps}
                className={classes}
                aria-disabled={disabled || undefined}
                onClick={disabled ? (e) => e.preventDefault() : anchorProps.onClick}
            >
                {content}
            </a>
        );
    }

    const { type = 'button', ...buttonProps } = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;

    if (buttonProps.onClick === undefined && selected === undefined) {
        return (
            <div className={classes} id={buttonProps.id}>
                {content}
            </div>
        );
    }

    const selectionProps: Pick<React.AriaAttributes, 'aria-checked' | 'aria-pressed'> & { role?: string } = {};
    if (selected !== undefined) {
        if (ctx.selection === 'single') {
            selectionProps.role = 'radio';
            selectionProps['aria-checked'] = selected;
        } else {
            selectionProps['aria-pressed'] = selected;
        }
    }

    return (
        <button {...selectionProps} {...buttonProps} type={type} className={classes} disabled={disabled}>
            {content}
        </button>
    );
}

export default ListGroup;
