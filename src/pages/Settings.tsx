import React, { useId, useState } from 'react';
import { External } from '../components/icons';
import { Button, ListGroup, ListRow, PageHeader, Switch } from '../components/ui';
import { Lang } from '../i18n/translations';
import { AppTheme } from '../constants';
import { DoseEvent, PKCustomParams } from '../../logic';
import { useHRTMode } from '../contexts/HRTModeContext';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import type { SyncStatus } from '../hooks/useCloudSync';
import { Avatar, LIST_CHEVRON, YouPage, useSyncWords } from './you/shared';

interface SettingsProps {
    t: (key: string) => string;
    lang: Lang;
    setLang: (lang: Lang) => void;
    theme: AppTheme;
    setTheme: (theme: AppTheme) => void;
    languageOptions: { value: string; label: string }[];
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
    onNavigateToLanguage: () => void;
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
}

const THEME_LABEL: Record<AppTheme, string> = {
    light: 'theme.light',
    dark: 'theme.dark',
    system: 'theme.system',
    mono: 'you.theme_mono',
};

const MODEL_ARTICLE = 'https://mahiro.uk/articles/estrogen-model-summary';
const SOURCE_REPO = 'https://github.com/SmirnovaOyama/Oyama-s-HRT-recorder';

/** A row whose only control is a Switch. The row's title names the switch;
 *  any explanation belongs in the group footer (format_rules.md 7). */
function SwitchRow({ title, checked, onChange }: {
    title: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    const id = useId();
    return (
        <ListRow
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
 * the account at the top, then small-headed groups of one-line rows, each with
 * a value or a state line but never both, and the destructive actions in their
 * own groups at the bottom.
 */
const Settings: React.FC<SettingsProps> = ({
    t, lang, theme, languageOptions, onClearAllEvents, events,
    showDialog, setIsDisclaimerOpen, onShowIntro, onNavigateToTransparency, appVersion,
    weight, pkParams, onNavigateToPKParams, onNavigateToHRTMode,
    onNavigateToLanguage, onNavigateToAppearance, onNavigateToWeight,
    onNavigateToExport, onNavigateToImport, autoSync, setAutoSync, isLoggedIn,
    devMode, setDevMode, onNavigateToMilkTea, onNavigateToCatStates, isAdmin, onNavigateToAdmin,
    onNavigate, onSignIn, syncStatus, syncErrorCode, lastSyncedAt,
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

    const languageLabel = languageOptions.find(o => o.value === lang)?.label ?? lang;
    const danger = (text: string) => <span className="text-[var(--c-danger)]">{text}</span>;

    return (
        <YouPage>
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
                            {t('you.sign_in')}
                        </Button>
                    </section>
                )}

                <ListGroup header={t('you.routine')} chevronIcon={LIST_CHEVRON}>
                    <ListRow
                        title={t('you.hrt_mode')}
                        value={t(mode === 'transfem' ? 'mode.transfem' : 'mode.transmasc')}
                        drillIn
                        onClick={onNavigateToHRTMode}
                    />
                    <ListRow
                        title={t('you.weight')}
                        value={`${weight}\u00a0kg`}
                        drillIn
                        onClick={onNavigateToWeight}
                    />
                </ListGroup>

                <ListGroup header={t('you.display')} chevronIcon={LIST_CHEVRON}>
                    <ListRow title={t('drawer.lang')} value={languageLabel} drillIn onClick={onNavigateToLanguage} />
                    <ListRow title={t('settings.theme')} value={t(THEME_LABEL[theme])} drillIn onClick={onNavigateToAppearance} />
                </ListGroup>

                <ListGroup header={t('you.data')} chevronIcon={LIST_CHEVRON}>
                    {signedIn && (
                        <SwitchRow title={t('you.sync.switch')} checked={autoSync} onChange={setAutoSync} />
                    )}
                    <ListRow title={t('you.export')} drillIn onClick={onNavigateToExport} />
                    <ListRow title={t('you.import')} drillIn onClick={onNavigateToImport} />
                    {signedIn && onNavigate && (
                        <ListRow title={t('you.share')} drillIn onClick={() => onNavigate('share')} />
                    )}
                </ListGroup>

                <ListGroup header={t('you.model')} footer={t('you.model_footer')} chevronIcon={LIST_CHEVRON}>
                    <ListRow
                        title={t('you.pk_params')}
                        value={t(pkParams ? 'pk.customized' : 'pk.default')}
                        drillIn
                        onClick={onNavigateToPKParams}
                    />
                    <ListRow title={t('transparency.title')} drillIn onClick={onNavigateToTransparency} />
                    <ListRow
                        title={t('you.model_explainer')}
                        trailing={<ExternalMark />}
                        onClick={() => openExternal('drawer.model_confirm', MODEL_ARTICLE)}
                    />
                </ListGroup>

                <ListGroup header={t('settings.group.about')} chevronIcon={LIST_CHEVRON}>
                    <ListRow title={t('settings.version')} value={appVersion} />
                    <ListRow title={t('drawer.disclaimer')} drillIn onClick={() => setIsDisclaimerOpen(true)} />
                    {/* The intro only ever shows itself once, so this is the only way back
                        to it, and the only way anyone who skipped it can read it. */}
                    <ListRow title={t('settings.show_intro')} drillIn onClick={onShowIntro} />
                    <ListRow
                        title={t('you.source_code')}
                        trailing={<ExternalMark />}
                        onClick={() => openExternal('drawer.github_confirm', SOURCE_REPO)}
                    />
                </ListGroup>

                <ListGroup footer={t('you.dev_mode_footer')} chevronIcon={LIST_CHEVRON}>
                    <SwitchRow title={t('you.dev_mode')} checked={devMode} onChange={setDevMode} />
                    {devMode && (
                        <ListRow title={t('settings.cat_states')} drillIn onClick={onNavigateToCatStates} />
                    )}
                    {devMode && (
                        <ListRow title={t('settings.milk_tea_egg')} drillIn onClick={onNavigateToMilkTea} />
                    )}
                </ListGroup>

                {/* Desktop also reaches the admin area from the sidebar; on a phone
                    this row is the way in. */}
                {isAdmin && (
                    <ListGroup chevronIcon={LIST_CHEVRON}>
                        <ListRow title={t('nav.admin')} drillIn onClick={onNavigateToAdmin} />
                    </ListGroup>
                )}

                {/* Destructive actions, each set in its own group at the bottom. */}
                <ListGroup footer={t('you.clear_footer')}>
                    <ListRow title={danger(t('you.clear'))} disabled={!events.length} onClick={onClearAllEvents} />
                </ListGroup>

                {signedIn && (
                    <ListGroup footer={onNavigate ? t('you.account.delete_footer') : undefined}>
                        <ListRow
                            title={<span className="text-[var(--c-ink)]">{t('you.sign_out')}</span>}
                            onClick={() => { void logout(); }}
                        />
                        {onNavigate && (
                            <ListRow title={danger(t('you.delete_account'))} onClick={() => onNavigate('delete-account')} />
                        )}
                    </ListGroup>
                )}
            </div>

            {!onSignIn && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />}
        </YouPage>
    );
};

export default Settings;
