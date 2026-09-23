import React, { useState } from 'react';
import { Attention, Eye, EyeOff, Spinner } from '../../components/icons';
import { useTranslation } from '../../contexts/LanguageContext';

/* Pieces shared by the account sub-pages, the data pages and their dialogs.
   Everything here draws with the --c-* tokens, so it follows dark and mono
   themes without dark: variants. */

/** The one summary sentence a page may open with (format_rules.md 10:
 *  17/26 600 ink). At most one short muted line (`note`) follows it. */
export function Lead({ children, note, className }: { children: React.ReactNode; note?: React.ReactNode; className?: string }) {
    return (
        <div className={`flex flex-col gap-1 ${className ?? ''}`}>
            <p className="m-0 text-base font-semibold text-[var(--c-ink)]">{children}</p>
            {note != null && <p className="m-0 text-sm text-[var(--c-muted)]">{note}</p>}
        </div>
    );
}

/** Muted helper line (15/22). */
export function Note({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
    return <p id={id} className={`m-0 text-sm text-[var(--c-muted)] ${className ?? ''}`}>{children}</p>;
}

/** An error in words, with the attention icon in front. Renders nothing when empty. */
export function ErrorNote({ children, id, className }: { children?: React.ReactNode; id?: string; className?: string }) {
    if (!children) return null;
    return (
        <p id={id} role="alert" className={`m-0 flex items-start gap-2 text-sm text-[var(--c-danger)] ${className ?? ''}`}>
            <Attention size={20} className="mt-px flex-none" />
            <span className="min-w-0">{children}</span>
        </p>
    );
}

/** A labelled form field: the label sits above the control. */
export function Field({
    label,
    htmlFor,
    hint,
    hintId,
    children,
    className,
}: {
    label: React.ReactNode;
    htmlFor: string;
    hint?: React.ReactNode;
    hintId?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`flex flex-col gap-2 ${className ?? ''}`}>
            <label htmlFor={htmlFor} className="px-4 text-sm font-semibold text-[var(--c-muted)]">
                {label}
            </label>
            {children}
            {hint != null && <Note id={hintId} className="px-4">{hint}</Note>}
        </div>
    );
}

/** A password input with a show/hide toggle inside its right edge. */
export const PasswordInput = React.forwardRef<
    HTMLInputElement,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>
>(function PasswordInput({ className, ...rest }, ref) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative">
            <input ref={ref} type={visible ? 'text' : 'password'} className={`input-base pe-12 ${className ?? ''}`} {...rest} />
            <button
                type="button"
                onClick={() => setVisible(v => !v)}
                aria-label={visible ? t('account.hide_password') : t('account.show_password')}
                aria-pressed={visible}
                className="absolute inset-y-0 end-0 grid w-12 place-items-center rounded-e-xl text-[var(--c-muted)] hover:text-[var(--c-ink)]"
            >
                {visible ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
        </div>
    );
});

/** Centred spinner for a list that is still loading. */
export function Loading({ label, className }: { label?: string; className?: string }) {
    return (
        <div className={`flex items-center justify-center gap-2 py-12 text-sm text-[var(--c-muted)] ${className ?? ''}`} aria-live="polite">
            <Spinner size={22} className="animate-spin" />
            {label && <span>{label}</span>}
        </div>
    );
}

/** C14 plate panel: tone, not a border, sets it apart. */
export function Panel({ children, className, ...rest }: React.HTMLAttributes<HTMLElement>) {
    return (
        <section className={`flex flex-col gap-3 rounded-2xl bg-[var(--c-plate)] p-4 ${className ?? ''}`} {...rest}>
            {children}
        </section>
    );
}

/** C11 surface card with padding, for content that isn't a list of rows. */
export function Card({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`flex flex-col gap-3 rounded-2xl border border-[var(--c-hairline)] bg-[var(--c-surface)] p-4 ${className ?? ''}`}
            {...rest}
        >
            {children}
        </div>
    );
}

/** Settings-page rhythm (format_rules.md 9): 24px between groups. */
export function Groups({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={`flex flex-col gap-6 ${className ?? ''}`}>{children}</div>;
}

/** Title of a destructive row in a page's bottom group (format_rules.md 6). */
export function DangerTitle({ children }: { children: React.ReactNode }) {
    return <span className="text-[var(--c-danger)]">{children}</span>;
}

/** Title of a plain action row (an accent-coloured title, no chevron). */
export function ActionTitle({ children }: { children: React.ReactNode }) {
    return <span className="text-[var(--c-accent)]">{children}</span>;
}

/** Content-page rhythm: 32px between regions, like the boards. */
export function Stack({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={`flex flex-col gap-8 ${className ?? ''}`}>{children}</div>;
}

/** Inline spinner for a button's busy state. */
export const BusySpinner = () => <Spinner size={20} className="animate-spin" />;
