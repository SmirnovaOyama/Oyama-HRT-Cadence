import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Attention, Clock, Info, Lock, Sync } from '../components/icons';
import { Button, ListGroup, ListRow } from '../components/ui';
import { BusySpinner, Card, ErrorNote, Field, Loading, Note, Panel, PasswordInput } from './account/shared';
import { DoseEvent, Ester, ExtraKey, getToE2Factor, isTestosteroneEster, Route } from '../../logic';
import ResultChart from '../components/ResultChart';
import { useTranslation } from '../contexts/LanguageContext';
import { getShareCopy } from '../i18n/share';
import { listComma } from '../i18n/listSeparator';
import { LOCALE_MAP } from '../utils/helpers';
import { LockedShare, ShareApiError, ShareDetails, sharingService } from '../services/sharing';

interface PublicShareProps {
    token: string | null;
}

type ShareState =
    | { kind: 'loading' }
    | { kind: 'locked'; meta: LockedShare }
    | { kind: 'ready'; details: ShareDetails }
    | { kind: 'expired' }
    | { kind: 'unavailable' };

const formatWearDays = (days: number): string =>
    (Math.round(days * 100) / 100).toString();

const PublicShare: React.FC<PublicShareProps> = ({ token }) => {
    const { lang, t } = useTranslation();
    const copy = getShareCopy(lang);
    const [state, setState] = useState<ShareState>({ kind: 'loading' });
    const [password, setPassword] = useState('');
    const [unlocking, setUnlocking] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const unlockedPasswordRef = useRef('');

    const classifyError = (error: unknown): ShareState => {
        if (error instanceof ShareApiError && (error.status === 410 || error.code === 'SHARE_EXPIRED')) {
            return { kind: 'expired' };
        }
        return { kind: 'unavailable' };
    };

    useEffect(() => {
        document.title = `${copy.publicTitle} – HRT Tracker`;
        let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
        const created = !robots;
        if (!robots) {
            robots = document.createElement('meta');
            robots.name = 'robots';
            document.head.appendChild(robots);
        }
        const previous = robots.content;
        robots.content = 'noindex, nofollow, noarchive';
        return () => {
            if (created) robots?.remove();
            else if (robots) robots.content = previous;
        };
    }, [copy.publicTitle]);

    useEffect(() => {
        let cancelled = false;
        unlockedPasswordRef.current = '';
        setPassword('');
        setPasswordError(null);

        if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
            setState({ kind: 'unavailable' });
            return () => { cancelled = true; };
        }

        setState({ kind: 'loading' });
        sharingService.open(token)
            .then(result => {
                if (cancelled) return;
                if ('snapshot' in result) setState({ kind: 'ready', details: result });
                else setState({ kind: 'locked', meta: result });
            })
            .catch(error => {
                if (!cancelled) setState(classifyError(error));
            });
        return () => { cancelled = true; };
        // classifyError contains no reactive state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleUnlock = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!token || unlocking) return;
        setUnlocking(true);
        setPasswordError(null);
        try {
            const details = await sharingService.unlock(token, password);
            unlockedPasswordRef.current = password;
            setState({ kind: 'ready', details });
            setPassword('');
        } catch (error) {
            if (error instanceof ShareApiError && error.code === 'INVALID_PASSWORD') {
                setPasswordError(copy.wrongPassword);
            } else {
                setState(classifyError(error));
            }
        } finally {
            setUnlocking(false);
        }
    };

    const liveReady = state.kind === 'ready' && state.details.live;
    useEffect(() => {
        if (!token || !liveReady) return;

        let cancelled = false;
        let refreshing = false;
        let retryAfter = 0;
        const refresh = async () => {
            if (cancelled || refreshing || document.hidden || Date.now() < retryAfter) return;
            refreshing = true;
            try {
                const result = unlockedPasswordRef.current
                    ? await sharingService.unlock(token, unlockedPasswordRef.current)
                    : await sharingService.open(token);
                if (!cancelled && 'snapshot' in result) {
                    setState({ kind: 'ready', details: result });
                }
            } catch (error) {
                if (cancelled) return;
                if (error instanceof ShareApiError && (error.status === 410 || error.code === 'SHARE_EXPIRED')) {
                    setState({ kind: 'expired' });
                } else if (error instanceof ShareApiError && error.status === 404) {
                    setState({ kind: 'unavailable' });
                } else if (error instanceof ShareApiError && error.status === 429) {
                    retryAfter = Date.now() + (error.retryAfterMs ?? 60_000);
                }
                // Keep showing the most recently loaded data for transient
                // network failures and rate limits.
            } finally {
                refreshing = false;
            }
        };

        const onVisibilityChange = () => {
            if (!document.hidden) void refresh();
        };
        void refresh();
        const timer = window.setInterval(() => void refresh(), 10_000);
        window.addEventListener('focus', refresh);
        window.addEventListener('online', refresh);
        window.addEventListener('pageshow', refresh);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
            window.removeEventListener('focus', refresh);
            window.removeEventListener('online', refresh);
            window.removeEventListener('pageshow', refresh);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [token, liveReady]);

    if (state.kind === 'loading') {
        return (
            <PublicShell>
                <main className="flex min-h-[65vh] items-center justify-center">
                    <Loading label={copy.loading} />
                </main>
            </PublicShell>
        );
    }

    if (state.kind === 'locked') {
        return (
            <PublicShell>
                <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16">
                    <Card className="w-full">
                        <Lock size={28} className="text-[var(--c-muted)]" aria-hidden="true" />
                        <div className="flex flex-col gap-2">
                            <h1 className="m-0 text-xl font-semibold text-[var(--c-ink)]">{copy.unlockTitle}</h1>
                            <p className="m-0 text-base text-[var(--c-muted)]">{copy.unlockDescription}</p>
                        </div>
                        <form onSubmit={handleUnlock} className="flex flex-col gap-4">
                            <Field label={copy.passwordLabel} htmlFor="shared-record-password">
                                <PasswordInput
                                    id="shared-record-password"
                                    value={password}
                                    onChange={(event) => {
                                        setPassword(event.target.value);
                                        setPasswordError(null);
                                    }}
                                    autoComplete="current-password"
                                    minLength={8}
                                    maxLength={128}
                                    required
                                    autoFocus
                                    aria-invalid={!!passwordError}
                                    aria-describedby={passwordError ? 'share-password-error' : undefined}
                                />
                            </Field>
                            <ErrorNote id="share-password-error">{passwordError}</ErrorNote>
                            <Button type="submit" variant="primary" block disabled={unlocking || password.length < 8}>
                                {unlocking && <BusySpinner />}
                                {unlocking ? copy.unlocking : copy.unlock}
                            </Button>
                        </form>
                    </Card>
                </main>
            </PublicShell>
        );
    }

    if (state.kind === 'expired' || state.kind === 'unavailable') {
        const expired = state.kind === 'expired';
        return (
            <PublicShell>
                <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                    <Attention size={28} className="text-[var(--c-attention)]" />
                    <h1 className="m-0 text-xl font-semibold text-[var(--c-ink)]">
                        {expired ? copy.expiredTitle : copy.unavailableTitle}
                    </h1>
                    <p className="m-0 max-w-sm text-base text-[var(--c-muted)]">
                        {expired ? copy.expiredDescription : copy.unavailableDescription}
                    </p>
                </main>
            </PublicShell>
        );
    }

    return <SharedRecord details={state.details} />;
};

const PublicShell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-[100dvh] bg-[var(--c-paper)] text-[var(--c-ink)]">
        {children}
    </div>
);

const SharedRecord = ({ details }: { details: ShareDetails }) => {
    const { lang, t } = useTranslation();
    const copy = getShareCopy(lang);
    const { snapshot } = details;
    const locale = LOCALE_MAP[lang] || 'en-US';
    const timeZone = snapshot.timezone || 'UTC';

    const formatDateTime = (timestamp: number) => new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
    }).format(new Date(timestamp));

    const groups = useMemo(() => {
        const formatter = new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone,
        });
        const grouped: { label: string; events: DoseEvent[] }[] = [];
        for (const event of [...snapshot.events].sort((a, b) => b.timeH - a.timeH)) {
            const label = formatter.format(new Date(event.timeH * 3_600_000));
            const current = grouped[grouped.length - 1];
            if (current?.label === label) current.events.push(event);
            else grouped.push({ label, events: [event] });
        }
        return grouped;
    }, [snapshot.events, locale, timeZone]);

    const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone,
    }), [locale, timeZone]);

    return (
        <PublicShell>
            {/* A content page: one column on phones, and from xl the chart with
                its note on the left and the history on the right, instead of
                one long column with empty ground beside it. */}
            <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-20 pt-6 md:px-8 md:pt-12">
                <header className="flex flex-col gap-1">
                    <p className="m-0 text-sm text-[var(--c-muted)]">{copy.publicEyebrow}</p>
                    <h1 className="m-0 text-3xl font-bold text-[var(--c-ink)]">{copy.publicTitle}</h1>
                    {/* One muted line of state: when, and whether it is live or locked. */}
                    <p className="m-0 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--c-muted)]">
                        <span className="inline-flex items-center gap-1.5">
                            <Clock size={18} className="flex-none" />
                            <span>{copy.sharedOn} {formatDateTime(details.createdAt)}</span>
                        </span>
                        {details.live && (
                            <span className="inline-flex items-center gap-1.5">
                                <Sync size={18} className="flex-none text-[var(--c-accent)]" />
                                <span>{copy.liveBadge}, {copy.updatedOn} {formatDateTime(details.updatedAt)}</span>
                            </span>
                        )}
                        {details.passwordRequired && (
                            <span className="inline-flex items-center gap-1.5">
                                <Lock size={18} className="flex-none" />
                                <span>{copy.protected}</span>
                            </span>
                        )}
                    </p>
                </header>

                <div className="grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:items-start xl:gap-10">
                    <section aria-labelledby="shared-chart-title" className="min-w-0">
                        <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
                            <h2 id="shared-chart-title" className="m-0 text-xl font-semibold text-[var(--c-ink)]">{copy.chartTitle}</h2>
                            <span className="text-sm text-[var(--c-muted)]">{timeZone}</span>
                        </div>
                        <ResultChart
                            sim={snapshot.simulation}
                            events={snapshot.events}
                            mode={snapshot.mode}
                            timeZone={timeZone}
                            title={t('chart.title')}
                        />
                        <p className="m-0 mt-3 flex items-start gap-2 px-1 text-sm text-[var(--c-muted)]">
                            <Info size={20} className="mt-px flex-none" />
                            <span>{copy.disclaimer}</span>
                        </p>
                    </section>

                    <section aria-labelledby="shared-history-title" className="min-w-0">
                        <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
                            <h2 id="shared-history-title" className="m-0 text-xl font-semibold text-[var(--c-ink)]">{copy.historyTitle}</h2>
                            <span className="text-sm tabular-nums text-[var(--c-muted)]">{snapshot.events.length}{'\u00A0'}{copy.records}</span>
                        </div>

                        {groups.length === 0 ? (
                            <Panel><Note>{t('timeline.empty')}</Note></Panel>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {groups.map(group => (
                                    <ListGroup key={group.label} header={group.label}>
                                        {group.events.map(event => (
                                            <DoseHistoryRow
                                                key={event.id}
                                                event={event}
                                                time={timeFormatter.format(new Date(event.timeH * 3_600_000))}
                                            />
                                        ))}
                                    </ListGroup>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </PublicShell>
    );
};

const NBSP = '\u00A0';

/**
 * One dose: the ester as the title and one line under it with the time, the
 * route and the amount. No trailing value as well (format_rules.md 2). The
 * E2 or T equivalent is extra detail, so it joins the line only where there is
 * room for it.
 */
const DoseHistoryRow = ({ event, time }: { event: DoseEvent; time: string }) => {
    const { lang, t } = useTranslation();
    const comma = listComma(lang);
    const isRemoval = event.route === Route.patchRemove;
    const releaseRate = event.extras[ExtraKey.releaseRateUGPerDay];
    const wearHours = event.extras[ExtraKey.patchWearH];

    const parts: string[] = [time, t(`route.${event.route}`)];
    if (releaseRate) parts.push(`${releaseRate}${NBSP}µg/d`);
    else if (!isRemoval) parts.push(`${event.doseMG.toFixed(2)}${NBSP}mg`);
    if (event.route === Route.patchApply && typeof wearHours === 'number' && wearHours > 0) {
        parts.push(`${formatWearDays(wearHours / 24)}${NBSP}${t('unit.day_short')}`);
    }

    let equivalent: string | null = null;
    if (!releaseRate && !isRemoval) {
        if (event.ester !== Ester.E2 && event.ester !== Ester.CPA && !isTestosteroneEster(event.ester)) {
            equivalent = `${t('label.e2')} eq: ${(event.doseMG * getToE2Factor(event.ester)).toFixed(2)}${NBSP}mg`;
        } else if (isTestosteroneEster(event.ester) && event.ester !== Ester.T) {
            equivalent = `${t('label.t')} eq: ${(event.doseMG * getToE2Factor(event.ester)).toFixed(2)}${NBSP}mg`;
        }
    }

    return (
        <ListRow
            title={<span className="block truncate">{isRemoval ? t('route.patchRemove') : t(`ester.${event.ester}`)}</span>}
            sub={
                <span className="block truncate tabular-nums">
                    {parts.join(`${comma} `)}
                    {equivalent && <span className="hidden sm:inline"> ({equivalent})</span>}
                </span>
            }
        />
    );
};

export default PublicShare;
