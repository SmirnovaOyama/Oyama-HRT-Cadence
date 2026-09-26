import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Check, Copy, Edit, InTarget, Link, Lock, Off, Plus, Share, Sync } from '../components/icons';
import { LabelIcon } from '../components/ui/LabelIcon';
import { DoseEvent, HRTMode, SimulationResult } from '../../logic';
import { useTranslation } from '../contexts/LanguageContext';
import { getShareCopy } from '../i18n/share';
import { CreatedShare, notifyLiveSharesChanged, ShareApiError, ShareSummary, sharingService } from '../services/sharing';
import { useDialog } from '../contexts/DialogContext';
import { LOCALE_MAP } from '../utils/helpers';
import DateTimePicker from '../components/DateTimePicker';
import { buildSharedDosageSnapshot } from '../services/shareSnapshot';
import { BackHeader, Button, ListGroup, ListRow, Switch } from '../components/ui';
import { LIST_CHECK, YouPage } from './you/shared';
import { BusySpinner, Card, ErrorNote, Field, Groups, Lead, Loading, Note, PasswordInput } from './account/shared';

const DAY_MS = 24 * 60 * 60_000;

/** Ready-made lifetimes for a link, in the order people usually want them. */
type ExpiryPreset = '1d' | '7d' | '30d' | '90d';
const EXPIRY_PRESETS: { id: ExpiryPreset; days: number }[] = [
    { id: '1d', days: 1 },
    { id: '7d', days: 7 },
    { id: '30d', days: 30 },
    { id: '90d', days: 90 },
];

interface ShareSettingsProps {
    onBack: () => void;
    /** Name of the screen Back returns to. Defaults to the You tab. */
    parentLabel?: string;
    authToken: string;
    mode: HRTMode;
    events: DoseEvent[];
    simulation: SimulationResult | null;
    calibrationFn: (timeH: number) => number;
}

const toLocalDateTimeValue = (timestamp: number): string => {
    const date = new Date(timestamp);
    return new Date(timestamp - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

// `toLocaleString()` renders seconds, which makes every timestamp in the list
// read as noise. Share stamps only ever matter to the minute, and the year is
// shown only when it isn't this one, so the value stays short beside its row.
const formatStamp = (timestamp: number, lang: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString(LOCALE_MAP[lang] || 'en-US', {
        month: 'short',
        day: 'numeric',
        ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}),
        hour: '2-digit',
        minute: '2-digit',
    });
};

// A short date for list rows ("Sep 23", with the year only when it isn't this
// one), kept on one line: the space inside it is non-breaking.
const formatDay = (timestamp: number, lang: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(LOCALE_MAP[lang] || 'en-US', {
        month: 'short',
        day: 'numeric',
        ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}),
    }).replace(/ /g, '\u00A0');
};

const ShareSettings: React.FC<ShareSettingsProps> = ({
    onBack,
    parentLabel,
    authToken,
    mode,
    events,
    simulation,
    calibrationFn,
}) => {
    const { lang, t } = useTranslation();
    const { showDialog } = useDialog();
    const copy = getShareCopy(lang);
    const [passwordEnabled, setPasswordEnabled] = useState(false);
    const [liveEnabled, setLiveEnabled] = useState(false);
    const [password, setPassword] = useState('');
    const [expiryChoice, setExpiryChoice] = useState<ExpiryPreset | 'custom'>('7d');
    const [expiresAtInput, setExpiresAtInput] = useState('');
    const [isExpiryPickerOpen, setIsExpiryPickerOpen] = useState(false);
    const [createdShare, setCreatedShare] = useState<CreatedShare | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shares, setShares] = useState<ShareSummary[]>([]);
    const [sharesLoading, setSharesLoading] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const linkInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setPasswordEnabled(false);
        setLiveEnabled(false);
        setPassword('');
        setExpiryChoice('7d');
        setExpiresAtInput(toLocalDateTimeValue(Date.now() + 7 * DAY_MS));
        setIsExpiryPickerOpen(false);
        setCreatedShare(null);
        setSubmitting(false);
        setCopied(false);
        setError(null);
        setShares([]);
        setSharesLoading(true);
        sharingService.list(authToken)
            .then(items => setShares(items.filter(item => !item.expired)))
            .catch(() => setShares([]))
            .finally(() => setSharesLoading(false));
    }, [authToken]);

    const shareSnapshot = useMemo(
        () => buildSharedDosageSnapshot({ mode, events, simulation, calibrationFn }),
        [mode, events, simulation, calibrationFn],
    );

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (submitting || !events.length) return;

        setError(null);
        setSubmitting(true);
        try {
            const preset = EXPIRY_PRESETS.find(p => p.id === expiryChoice);
            const expiresAt = preset ? Date.now() + preset.days * DAY_MS : new Date(expiresAtInput).getTime();
            if (
                !Number.isFinite(expiresAt)
                || expiresAt <= Date.now()
                || expiresAt > Date.now() + 365 * 24 * 60 * 60_000
            ) {
                setError(copy.invalidExpiry);
                return;
            }
            const result = await sharingService.create(authToken, shareSnapshot, {
                password: passwordEnabled ? password : undefined,
                expiresAt,
                live: liveEnabled,
            });
            setCreatedShare(result);
            if (result.live) notifyLiveSharesChanged();
            setShares(previous => [{
                id: result.id,
                createdAt: result.createdAt,
                expiresAt: result.expiresAt,
                passwordRequired: result.passwordRequired,
                live: result.live,
                mode: result.mode,
                updatedAt: result.updatedAt,
                expired: false,
            }, ...previous.filter(item => item.id !== result.id)]);
        } catch (requestError) {
            if (requestError instanceof ShareApiError) {
                if (requestError.code === 'SNAPSHOT_TOO_LARGE') setError(copy.tooLarge);
                else if (requestError.code === 'SHARE_LIMIT_REACHED') setError(copy.limitReached);
                else if (requestError.code === 'INVALID_EXPIRATION') setError(copy.invalidExpiry);
                else setError(copy.createError);
            } else {
                setError(copy.createError);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopy = async () => {
        if (!createdShare) return;
        try {
            await navigator.clipboard.writeText(createdShare.url);
        } catch {
            linkInputRef.current?.select();
            document.execCommand('copy');
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    const handleRevoke = (share: ShareSummary) => {
        showDialog('confirm', copy.revokeConfirm, async () => {
            setRevokingId(share.id);
            try {
                await sharingService.revoke(authToken, share.id);
                setShares(previous => previous.filter(item => item.id !== share.id));
                if (createdShare?.id === share.id) setCreatedShare(null);
                if (share.live) notifyLiveSharesChanged();
            } catch {
                showDialog('alert', copy.revokeError);
            } finally {
                setRevokingId(null);
            }
        });
    };

    const statusWords = (share: { live: boolean; passwordRequired: boolean }) => (
        <>
            {share.live && (
                <span className="inline-flex items-center gap-1">
                    <Sync size={16} className="flex-none" />
                    {copy.liveBadge}
                </span>
            )}
            {share.passwordRequired && (
                <span className="inline-flex items-center gap-1">
                    <Lock size={16} className="flex-none" />
                    {copy.protected}
                </span>
            )}
        </>
    );

    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const handleNativeShare = async () => {
        if (!createdShare || !canShare) return;
        try {
            await navigator.share({ title: copy.publicTitle, url: createdShare.url });
        } catch { /* dismissed */ }
    };

    return (
        <YouPage>
            <BackHeader parentLabel={parentLabel ?? t('you.title')} onBack={onBack} title={t('account.page.share')} />
            <Lead className="mt-2" note={t('account.share.lead_note')}>{copy.modalDescription}</Lead>

            <Groups className="mt-6">
                {createdShare ? (
                    <Card aria-live="polite">
                        <div className="flex items-start gap-3">
                            <InTarget size={22} className="mt-px flex-none text-[var(--c-target)]" />
                            <div className="flex min-w-0 flex-col">
                                <p className="m-0 text-base font-semibold text-[var(--c-ink)]">{copy.created}</p>
                                {(createdShare.live || createdShare.passwordRequired) && (
                                    <p className="m-0 flex flex-wrap gap-x-3 text-sm text-[var(--c-muted)]">{statusWords(createdShare)}</p>
                                )}
                            </div>
                        </div>
                        <label className="sr-only" htmlFor="created-share-link">{copy.copy}</label>
                        <input
                            ref={linkInputRef}
                            id="created-share-link"
                            readOnly
                            value={createdShare.url}
                            className="input-base select-all truncate bg-[var(--c-plate)] font-mono text-sm"
                            onFocus={(event) => event.currentTarget.select()}
                        />
                        {createdShare.passwordRequired && <Note>{copy.passwordHint}</Note>}
                        <div className="flex gap-3">
                            {/* Both labels share one grid cell so the button keeps a single
                                width across the copy to copied swap, in every locale. */}
                            <Button variant="secondary" compact className="grid flex-1 place-items-center" onClick={handleCopy}>
                                <span className={`col-start-1 row-start-1 inline-flex items-center gap-2 ${copied ? 'invisible' : ''}`}><Copy size={20} />{copy.copy}</span>
                                <span className={`col-start-1 row-start-1 inline-flex items-center gap-2 ${copied ? '' : 'invisible'}`}><Check size={20} />{copy.copied}</span>
                            </Button>
                            {canShare && (
                                <Button variant="secondary" compact className="flex-1" onClick={handleNativeShare}>
                                    <Share size={20} />
                                    {copy.action}
                                </Button>
                            )}
                        </div>
                        <Button variant="plain" className="self-start" onClick={() => { setCreatedShare(null); setCopied(false); }}>
                            <Plus size={20} />
                            {t('account.share.another')}
                        </Button>
                    </Card>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                            <ListGroup
                                header={t('account.share.options')}
                                footer={liveEnabled ? t('account.share.live_footer') : t('account.share.static_footer')}
                            >
                                <ListRow
                                    leading={<LabelIcon icon={Sync} tone="teal" />}
                                    title={<span id="share-live-label">{copy.liveToggle}</span>}
                                    trailing={
                                        <Switch
                                            id="share-live-toggle"
                                            checked={liveEnabled}
                                            onChange={setLiveEnabled}
                                            aria-labelledby="share-live-label"
                                        />
                                    }
                                />
                                <ListRow
                                    leading={<LabelIcon icon={Lock} tone="purple" />}
                                    title={<span id="share-password-label">{copy.passwordToggle}</span>}
                                    trailing={
                                        <Switch
                                            id="share-password-toggle"
                                            checked={passwordEnabled}
                                            onChange={(value) => { setPasswordEnabled(value); setError(null); }}
                                            aria-labelledby="share-password-label"
                                        />
                                    }
                                />
                            </ListGroup>

                            {passwordEnabled && (
                                <Field label={<span className="inline-flex items-center gap-2"><LabelIcon icon={Lock} tone="purple" size={18} />{copy.passwordLabel}</span>} htmlFor="share-password" hint={copy.passwordHint}>
                                    <PasswordInput
                                        id="share-password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder={copy.passwordPlaceholder}
                                        minLength={8}
                                        maxLength={128}
                                        autoComplete="new-password"
                                        required
                                        autoFocus
                                    />
                                </Field>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <ListGroup
                                header={copy.expiryLabel}
                                footer={copy.expiryHint}
                                selection="single"
                                checkIcon={LIST_CHECK}
                            >
                                {EXPIRY_PRESETS.map(({ id, days }) => (
                                    <ListRow
                                        key={id}
                                        leading={<LabelIcon icon={Calendar} tone="blue" />}
                                        title={t(`account.share.expiry_${id}`)}
                                        value={expiryChoice === id ? formatStamp(Date.now() + days * DAY_MS, lang) : undefined}
                                        selected={expiryChoice === id}
                                        onClick={() => { setExpiryChoice(id); setIsExpiryPickerOpen(false); setError(null); }}
                                    />
                                ))}
                                <ListRow
                                    leading={<LabelIcon icon={Edit} tone="purple" />}
                                    title={t('account.share.expiry_custom')}
                                    value={expiryChoice === 'custom' && expiresAtInput ? formatStamp(new Date(expiresAtInput).getTime(), lang) : undefined}
                                    selected={expiryChoice === 'custom'}
                                    aria-expanded={isExpiryPickerOpen}
                                    onClick={() => {
                                        setExpiryChoice('custom');
                                        setIsExpiryPickerOpen(value => expiryChoice === 'custom' ? !value : true);
                                        setError(null);
                                    }}
                                />
                            </ListGroup>
                            <DateTimePicker
                                isOpen={isExpiryPickerOpen}
                                inline
                                onClose={() => setIsExpiryPickerOpen(false)}
                                onConfirm={(date) => setExpiresAtInput(toLocalDateTimeValue(date.getTime()))}
                                initialDate={expiresAtInput ? new Date(expiresAtInput) : new Date(Date.now() + 7 * DAY_MS)}
                                mode="datetime"
                                title={copy.expiryLabel}
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <ErrorNote>{error}</ErrorNote>
                            {!events.length && <Note>{copy.noData}</Note>}
                            <Button
                                type="submit"
                                variant="primary"
                                block
                                disabled={submitting || !events.length || (passwordEnabled && password.length < 8)}
                            >
                                {submitting ? <BusySpinner /> : <Link size={20} />}
                                {submitting ? copy.creating : copy.create}
                            </Button>
                        </div>
                    </form>
                )}

                {sharesLoading ? (
                    <Loading label={copy.loading} />
                ) : shares.length === 0 ? (
                    <ListGroup header={copy.manageTitle}>
                        <ListRow leading={<LabelIcon icon={Link} tone="muted" />} title={<span className="text-[var(--c-muted)]">{copy.noneActive}</span>} />
                    </ListGroup>
                ) : (
                    <ListGroup header={copy.manageTitle} footer={t('account.share.manage_footer')}>
                        {shares.map(share => (
                            <ListRow
                                key={share.id}
                                leading={<LabelIcon icon={Link} tone="blue" />}
                                title={<span className="block truncate">{copy.sharedOn} {formatDay(share.createdAt, lang)}</span>}
                                sub={
                                    <span className="flex flex-wrap gap-x-3">
                                        <span>{share.expiresAt ? `${copy.expiresOn} ${formatDay(share.expiresAt, lang)}` : copy.neverExpires}</span>
                                        {statusWords(share)}
                                    </span>
                                }
                                trailing={
                                    <Button
                                        variant="destructive"
                                        className="-me-2"
                                        onClick={() => handleRevoke(share)}
                                        disabled={revokingId === share.id}
                                    >
                                        {revokingId === share.id ? <BusySpinner /> : <Off size={18} />}
                                        {copy.revoke}
                                    </Button>
                                }
                            />
                        ))}
                    </ListGroup>
                )}
            </Groups>
        </YouPage>
    );
};

export default ShareSettings;
