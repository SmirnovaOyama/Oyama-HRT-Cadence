import React, { useId, useState } from 'react';
import { Appearance, Attention, Delete, Export, External, Flask, Helix, Help, Import, Info, Link, Reminder, Share, Shield, SignIn, SignOut, Sliders, Supplies, Sync, Terminal, Weight } from '../components/icons';
import { Button, ListGroup, ListRow, PageHeader, Switch } from '../components/ui';
import { LabelIcon } from '../components/ui/LabelIcon';
import PixelCat from '../components/PixelCat';
import { Lang } from '../i18n/translations';
import { AppTheme } from '../constants';
import { DoseEvent, PKCustomParams } from '../../logic';
import { useHRTMode } from '../contexts/HRTModeContext';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import type { SyncStatus } from '../hooks/useCloudSync';
import { Avatar, LIST_CHEVRON, YouPage, useSyncWords } from './you/shared';
import type { Schedule } from '../types/routine';
import type { ForecastedSupply } from '../components/supplies';
import { fmt } from '../components/today/format';

interface SettingsProps {
    t: (key: string) => string;
    lang: Lang;
    theme: AppTheme;
    setTheme: (theme: AppTheme) => void;
    onImportJson: (text: string) => boolean | Promise<boolean>;
    labResults: any[];
    onExport: (encrypt: boolean, password?: string) => Promise<string | null>;
    onQuickExport: () => void;
    onClearAllEvents: () => void;
    events: DoseEvent[];
    showDialog: (type: 'alert' | 'confirm', message: string, onConfirm?: () => void) => void;
    setIsDisclaimerOpen: (isOpen: boolean) => void;
    onShowIntro: () => void;
    onNavigateToTransparency: () => void;
    appVersion: string;
    weight: number;
    setIsWeightModalOpen: (isOpen: boolean) => void;
    pkParams: PKCustomParams | null;
    onNavigateToPKParams: () => void;
    onNavigateToHRTMode: () => void;
    onNavigateToAppearance: () => void;
    onNavigateToWeight: () => void;
    onNavigateToExport: () => void;
    onNavigateToImport: () => void;
    autoSync: boolean;
    setAutoSync: (v: boolean) => void;
    isLoggedIn: boolean;
    devMode: boolean;
    setDevMode: (v: boolean) => void;
    onNavigateToMilkTea: () => void;
    onNavigateToCatStates: () => void;
    isAdmin: boolean;
    onNavigateToAdmin: () => void;

    /* Optional, so the page works before the host passes them. */

    /** Opens another view by key: 'account', 'share', 'delete-account'. */
    onNavigate?: (view: string) => void;
    /** Opens the host's sign-in flow. Without it the page opens its own AuthModal. */
    onSignIn?: () => void;
    /** Live cloud sync state, for the backup line under the account row. */
    syncStatus?: SyncStatus;
    syncErrorCode?: string | null;
    lastSyncedAt?: number | null;
    /** Explicit schedules, for the Reminders row's value. */
    schedules?: Schedule[];
    /** Forecast for each tracked supply, for the Supplies row's value. */
    supplyForecasts?: ForecastedSupply[];
}

const THEME_LABEL: Record<AppTheme, string> = {
    light: 'theme.light',
    dark: 'theme.dark',
    system: 'theme.system',
    mono: 'you.theme_mono',
};

const MODEL_ARTICLE = 'https://mahiro.uk/articles/estrogen-model-summary';
const SOURCE_REPO = 'https://github.com/SmirnovaOyama/Oyama-HRT-Cadence';

/** A row whose only control is a Switch. The row's title names the switch;
 *  any explanation belongs in the group footer (format_rules.md 7). */
function SwitchRow({ title, checked, onChange, icon }: {
    title: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    icon: React.ReactNode;
}) {
    const id = useId();
    return (
        <ListRow
            leading={icon}
            title={<span id={id}>{title}</span>}
            trailing={<Switch checked={checked} onChange={onChange} aria-labelledby={id} />}
        />
    );
}

const ExternalMark = () => (
    <span className="inline-flex flex-none text-[var(--c-muted)]" aria-hidden="true">
        <External size={16} />
    </span>
);

/**
 * The You tab, in the Apple Settings shape (design/cadence/spec/format_rules.md):
 * the account at the top, then spaced groups of one-line rows, each with
 * a value or a state line but never both, and the destructive actions in their
 * own groups at the bottom.
 */
const Settings: React.FC<SettingsProps> = ({
    t, lang, theme, onClearAllEvents, events,
    showDialog, setIsDisclaimerOpen, onShowIntro, onNavigateToTransparency, appVersion,
    weight, pkParams, onNavigateToPKParams, onNavigateToHRTMode,
    onNavigateToAppearance, onNavigateToWeight,
    onNavigateToExport, onNavigateToImport, autoSync, setAutoSync, isLoggedIn,
    devMode, setDevMode, onNavigateToMilkTea, onNavigateToCatStates, isAdmin, onNavigateToAdmin,
    onNavigate, onSignIn, syncStatus, syncErrorCode, lastSyncedAt,
    schedules = [], supplyForecasts = [],
}) => {
    const { mode } = useHRTMode();
    const { user, logout } = useAuth();
    const signedIn = isLoggedIn && !!user;

    const syncWords = useSyncWords({ t, lang, autoSync, status: syncStatus, errorCode: syncErrorCode, lastSyncedAt });
    const SyncIcon = syncWords.icon;

    const [authOpen, setAuthOpen] = useState(false);
    const openAccount = onNavigate ? () => onNavigate('account') : undefined;
    const signIn = onSignIn ?? (() => setAuthOpen(true));
    const openExternal = (confirmKey: string, url: string) =>
        showDialog('confirm', t(confirmKey), () => window.open(url, '_blank', 'noopener'));

    // Reminders: how many schedules actually remind. Supplies: the most urgent
    // state in words when something needs attention, otherwise the count.
    const remindersOn = schedules.filter(s => s.active && s.remind.enabled).length;
    const remindersValue = remindersOn > 0 ? fmt(t('you.reminders_on'), { n: remindersOn }) : t('you.reminders_off');
    const suppliesValue = supplyForecasts.some(s => s.forecast.status === 'out') ? t('supplies.status.out')
        : supplyForecasts.some(s => s.forecast.status === 'reorder_soon') ? t('supplies.status.reorder_soon')
            : supplyForecasts.length > 0 ? fmt(t('you.supplies_tracked'), { n: supplyForecasts.length })
                : undefined;
    const suppliesAttention = supplyForecasts.some(s => s.forecast.status !== 'ok');

    const danger = (text: string) => <span className="text-[var(--c-danger)]">{text}</span>;

    return (
        <YouPage className="[&_.list-row-tall]:min-h-[52px] [&_.list-sep-icon]:ms-[48px]">
            <PageHeader title={t('you.title')} />

            <div className="flex flex-col gap-6">
                {/* Account: one row with one line of state, or one line and one button. */}
                {signedIn ? (
                    <ListGroup chevronIcon={LIST_CHEVRON}>
                        <ListRow
                            leading={<Avatar username={user!.username} size={48} />}
                            title={<span className="block truncate font-semibold">{user!.username}</span>}
                            sub={
                                <span className="flex min-w-0 items-center gap-1.5">
                                    <SyncIcon
                                        size={16}
                                        className={`flex-none ${syncWords.tone} ${syncWords.spin ? 'animate-spin' : ''}`}
                                    />
                                    <span className="truncate">{syncWords.line}</span>
                                </span>
                            }
                            drillIn={!!openAccount}
                            onClick={openAccount}
                        />
                    </ListGroup>
                ) : (
                    <section className="flex flex-col gap-4 rounded-2xl bg-[var(--c-plate)] p-4">
                        <p className="m-0 text-base font-semibold text-[var(--c-ink)]">{t('you.signed_out_title')}</p>
                        <Button variant="primary" block onClick={signIn}>
                            <SignIn size={20} />
                            {t('you.sign_in')}
                        </Button>
                    </section>
                )}

                <ListGroup chevronIcon={LIST_CHEVRON}>
                    <ListRow
                        leading={<LabelIcon icon={Helix} tone="pink" />}
                        title={t('you.hrt_mode')}
                        value={t(mode === 'transfem' ? 'mode.transfem' : 'mode.transmasc')}
                        drillIn
                        onClick={onNavigateToHRTMode}
                    />
                    <ListRow
                        leading={<LabelIcon icon={Weight} tone="teal" />}
                        title={t('you.weight')}
                        value={`${weight}\u00a0kg`}
                        drillIn
                        onClick={onNavigateToWeight}
                    />
                    {onNavigate && (
                        <ListRow
                            leading={<LabelIcon icon={Reminder} tone="orange" />}
                            title={t('reminders.title')}
                            value={remindersValue}
                            drillIn
                            onClick={() => onNavigate('reminders')}
                        />
                    )}
                    {onNavigate && (
                        <ListRow
                            leading={<LabelIcon icon={Supplies} tone="green" />}
                            title={t('supplies.title')}
                            value={suppliesAttention
                                ? (
                                    <span className="inline-flex items-center gap-1.5 text-[var(--c-attention)]">
                                        <Attention size={18} className="flex-none" />
                                        <span>{suppliesValue}</span>
                                    </span>
                                )
                                : suppliesValue}
                            drillIn
                            onClick={() => onNavigate('supplies')}
                        />
                    )}
                </ListGroup>

                <ListGroup chevronIcon={LIST_CHEVRON}>
                    <ListRow leading={<LabelIcon icon={Appearance} tone="purple" />} title={t('settings.theme')} value={t(THEME_LABEL[theme])} drillIn onClick={onNavigateToAppearance} />
                </ListGroup>

                <ListGroup chevronIcon={LIST_CHEVRON}>
                    {signedIn && (
                        <SwitchRow icon={<LabelIcon icon={Sync} tone="blue" />} title={t('you.sync.switch')} checked={autoSync} onChange={setAutoSync} />
                    )}
                    <ListRow leading={<LabelIcon icon={Export} tone="teal" />} title={t('you.export')} drillIn onClick={onNavigateToExport} />
                    <ListRow leading={<LabelIcon icon={Import} tone="blue" />} title={t('you.import')} drillIn onClick={onNavigateToImport} />
                    {signedIn && onNavigate && (
                        <ListRow leading={<LabelIcon icon={Share} tone="purple" />} title={t('you.share')} drillIn onClick={() => onNavigate('share')} />
                    )}
                </ListGroup>

                <ListGroup footer={t('you.model_footer')} chevronIcon={LIST_CHEVRON}>
                    <ListRow
                        leading={<LabelIcon icon={Sliders} tone="teal" />}
                        title={t('you.pk_params')}
                        value={t(pkParams ? 'pk.customized' : 'pk.default')}
                        drillIn
                        onClick={onNavigateToPKParams}
                    />
                    <ListRow leading={<LabelIcon icon={Flask} tone="purple" />} title={t('transparency.title')} drillIn onClick={onNavigateToTransparency} />
                    <ListRow
                        leading={<LabelIcon icon={Help} tone="blue" />}
                        title={t('you.model_explainer')}
                        trailing={<ExternalMark />}
                        onClick={() => openExternal('drawer.model_confirm', MODEL_ARTICLE)}
                    />
                </ListGroup>

                <ListGroup chevronIcon={LIST_CHEVRON}>
                    <ListRow leading={<LabelIcon icon={Info} tone="blue" />} title={t('settings.version')} value={appVersion} />
                    <ListRow leading={<LabelIcon icon={Shield} tone="green" />} title={t('drawer.disclaimer')} drillIn onClick={() => setIsDisclaimerOpen(true)} />
                    {/* The intro only ever shows itself once, so this is the only way back
                        to it, and the only way anyone who skipped it can read it. */}
                    <ListRow leading={<LabelIcon icon={Help} tone="purple" />} title={t('settings.show_intro')} drillIn onClick={onShowIntro} />
                    <ListRow
                        leading={<LabelIcon icon={Link} tone="muted" />}
                        title={t('you.source_code')}
                        trailing={<ExternalMark />}
                        onClick={() => openExternal('drawer.github_confirm', SOURCE_REPO)}
                    />
                </ListGroup>

                <ListGroup footer={t('you.dev_mode_footer')} chevronIcon={LIST_CHEVRON}>
                    <SwitchRow icon={<LabelIcon icon={Terminal} tone="teal" />} title={t('you.dev_mode')} checked={devMode} onChange={setDevMode} />
                    {devMode && (
                        <ListRow leading={<span className="inline-flex w-5 justify-center"><PixelCat size={24} force /></span>} title={t('settings.cat_states')} drillIn onClick={onNavigateToCatStates} />
                    )}
                    {devMode && (
                        <ListRow leading={<LabelIcon icon={Flask} tone="orange" />} title={t('settings.milk_tea_egg')} drillIn onClick={onNavigateToMilkTea} />
                    )}
                </ListGroup>

                {/* Desktop also reaches the admin area from the sidebar; on a phone
                    this row is the way in. */}
                {isAdmin && (
                    <ListGroup chevronIcon={LIST_CHEVRON}>
                        <ListRow leading={<LabelIcon icon={Shield} tone="purple" />} title={t('nav.admin')} drillIn onClick={onNavigateToAdmin} />
                    </ListGroup>
                )}

                {/* Destructive actions, each set in its own group at the bottom. */}
                <ListGroup footer={t('you.clear_footer')}>
                    <ListRow leading={<Delete size={20} className="text-[var(--c-danger)]" />} title={danger(t('you.clear'))} disabled={!events.length} onClick={onClearAllEvents} />
                </ListGroup>

                {signedIn && (
                    <ListGroup footer={onNavigate ? t('you.account.delete_footer') : undefined}>
                        <ListRow
                            leading={<LabelIcon icon={SignOut} tone="muted" />}
                            title={<span className="text-[var(--c-ink)]">{t('you.sign_out')}</span>}
                            onClick={() => { void logout(); }}
                        />
                        {onNavigate && (
                            <ListRow leading={<Delete size={20} className="text-[var(--c-danger)]" />} title={danger(t('you.delete_account'))} onClick={() => onNavigate('delete-account')} />
                        )}
                    </ListGroup>
                )}
            </div>

            {!onSignIn && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />}
        </YouPage>
    );
};

export default Settings;
