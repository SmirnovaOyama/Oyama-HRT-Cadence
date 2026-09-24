import { useState, useEffect, useMemo } from 'react';
import { useTranslation, LanguageProvider } from './contexts/LanguageContext';
import { useDialog, DialogProvider } from './contexts/DialogContext';
import { HRTModeProvider, useHRTMode } from './contexts/HRTModeContext';
import { PixelCatProvider } from './contexts/PixelCatContext';
import ErrorBoundary from './components/ErrorBoundary';
import { APP_VERSION, AppTheme } from './constants';
import { DoseEvent, decompressData, encryptData, decryptData } from '../logic';
import { parseCloudBackup } from './utils/cloudBackup';
import { hasBackupRecords } from './utils/backupAvailability';
import { accessibleView } from './utils/accessibleView';
import { useAppData } from './hooks/useAppData';
import { useProjection } from './hooks/useProjection';
import { useAppNavigation, ViewKey } from './hooks/useAppNavigation';
import { useLiveShareSync } from './hooks/useLiveShareSync';
import { describeSyncError, useCloudSync } from './hooks/useCloudSync';

import WeightEditorModal from './components/WeightEditorModal';
import DoseFormModal from './components/DoseFormModal';
import type { DoseFormPrefill } from './components/DoseForm';
import ImportModal from './components/ImportModal';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import PasswordInputModal from './components/PasswordInputModal';
import DisclaimerModal from './components/DisclaimerModal';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { cloudService } from './services/cloud';

// Pages
import Home, { type LogDosePrefill } from './pages/Home';
import History from './pages/History';
import Lab from './pages/Lab';
import CalibrationSettings from './pages/CalibrationSettings';
import Settings from './pages/Settings';
import Account from './pages/Account';
import Admin from './pages/Admin';
import SessionsPage from './pages/Sessions';
import TwoFactorPage from './pages/TwoFactor';
import ChangePasswordPage from './pages/ChangePassword';
import DeleteAccountPage from './pages/DeleteAccount';
import EditProfilePage from './pages/EditProfile';
import EditAvatarPage from './pages/EditAvatar';
import PKParamsPage from './pages/PKParams';
import HRTModeSettings from './pages/HRTModeSettings';
import AppearanceSettings from './pages/AppearanceSettings';
import WeightSettings from './pages/WeightSettings';
import ExportSettings from './pages/ExportSettings';
import ImportSettings from './pages/ImportSettings';
import TransparencySettings from './pages/TransparencySettings';
import MilkTeaEasterEgg from './pages/MilkTeaEasterEgg';
import CatStates from './pages/CatStates';
import PublicShare from './pages/PublicShare';
import ShareSettings from './pages/ShareSettings';
import Reminders from './pages/Reminders';
import SuppliesPage from './pages/Supplies';
import { useReminders } from './hooks/useReminders';
import { suppliesNeedingAttention, useSupplyForecasts } from './components/supplies';
import Onboarding, { markOnboardingSeen, shouldShowOnboarding } from './pages/Onboarding';
import SiteNoticeBanner from './components/SiteNotice';
import { SecondaryPageHost, SecondaryPageProvider, useSecondaryNavigation } from './components/ui/SecondaryPage';

const AppContent = () => {
    const { t, lang } = useTranslation();
    const { showDialog } = useDialog();
    const { mode } = useHRTMode();
    const { hasPages, closeAll: closeSecondaryPages } = useSecondaryNavigation();
    const { user, token, logout, needsSetup2FA, clearSetup2FA, isLoading: isAuthLoading } = useAuth();
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);

    // Use Custom Hooks
    const {
        events,
        weight, setWeight,
        labResults,
        doseTemplates,
        simulation,
        calibrationFn,
        calibrationMethod, setCalibrationMethod,
        calibrationHistoryMode, setCalibrationHistoryMode,
        calibration,
        currentLevel,
        currentCPA,
        currentT,
        currentStatus,
        groupedEvents,
        addEvent, addEvents, updateEvent, deleteEvent, deleteEvents, clearAllEvents,
        addLabResult, updateLabResult, deleteLabResult, clearLabResults,
        addTemplate, deleteTemplate,
        addQuickDose, deleteQuickDose,
        quickDoses,
        pkParams, setPkParams, clearPkParams,
        processImportedData,
        mergeImportedData,
        buildExportPayload,
        applySyncedState,
        scope,
        readyScope,
        schedules, addSchedule, updateSchedule, deleteSchedule,
        supplies, addSupply, updateSupply, deleteSupply,
    } = useAppData(showDialog);

    useLiveShareSync({
        authToken: token,
        mode,
        events,
        simulation,
        calibrationFn,
    });

    const {
        currentView,
        transitionDirection,
        handleViewChange,
        mainScrollRef,
    } = useAppNavigation();

    // "If you keep your schedule": the logged doses plus the ones each regular
    // routine still brings. Only the pages that draw the estimate need it.
    const projection = useProjection({
        events,
        weight,
        schedules,
        enabled: currentView === 'home' || currentView === 'history',
    });


    // Reminders run wherever the app is, not only on Today: the hook raises the
    // system notification, and Today shows the due cards it reports.
    const reminders = useReminders({ schedules, events, t });

    // Supply forecasts feed the rail's attention icon, the You row and Today's
    // "Reorder" rows.
    const supplyForecasts = useSupplyForecasts(supplies, schedules, events);
    const suppliesAttention = useMemo(() => suppliesNeedingAttention(supplyForecasts), [supplyForecasts]);

    // --- Local UI State (Modals & Forms) ---
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<DoseEvent | null>(null);
    const [doseFormPrefill, setDoseFormPrefill] = useState<DoseFormPrefill | null>(null);
    // Where Share and the model settings go back to: both open from more than
    // one tab (Share from Today, Timeline and You; the model settings from
    // Blood tests and You).
    const [shareReturn, setShareReturn] = useState<ViewKey>('home');
    const [pkReturn, setPkReturn] = useState<ViewKey>('lab');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isPasswordInputOpen, setIsPasswordInputOpen] = useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [isQuickAddLabOpen, setIsQuickAddLabOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
    const [pendingImportText, setPendingImportText] = useState<string | null>(null);

    // --- Auto-sync preference ---
    // Storage key kept from when this only ever uploaded, so an existing
    // preference carries over rather than silently resetting to on.
    const [autoSync, setAutoSync] = useState<boolean>(() =>
        localStorage.getItem('app-auto-backup') !== 'false'
    );

    // --- First run ---
    const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);

    // --- Developer mode (unlocks the milk tea easter egg) ---
    const [devMode, setDevMode] = useState<boolean>(() =>
        localStorage.getItem('app-dev-mode') === 'true'
    );
    useEffect(() => {
        localStorage.setItem('app-dev-mode', String(devMode));
    }, [devMode]);

    const [theme, setTheme] = useState<AppTheme>(() => {
        const saved = localStorage.getItem('app-theme');
        return (saved as AppTheme) || 'system';
    });

    useEffect(() => {
        localStorage.setItem('app-auto-backup', String(autoSync));
    }, [autoSync]);

    // Two-way sync with the cloud backup: pull, reconcile, push. Replaces both
    // the upload-only auto-backup and the startup "your data differs" prompt —
    // the prompt could only add records the cloud had and this device lacked, so
    // edits and deletions stayed unresolved and it reappeared every launch.
    const syncState = useCloudSync({
        token,
        userId: user?.id ?? null,
        enabled: autoSync,
        // Never touch the cloud while the data layer is mid-switch between
        // accounts or modes: the payload would mix one account's in-memory
        // records with another's storage keys.
        ready: readyScope === scope,
        buildPayload: buildExportPayload,
        applyRemote: applySyncedState,
        events,
        labResults,
        doseTemplates,
        schedules,
        supplies,
        weight,
        pkParams,
    });

    // A lost session must not leave a token-gated route rendering nothing.
    // Keep any session-expired result page open above the sign-in destination.
    useEffect(() => {
        if (isAuthLoading) return;
        const next = accessibleView(currentView, { signedIn: !!token, isAdmin: !!user?.isAdmin });
        if (next !== currentView) handleViewChange(next);
    }, [currentView, token, user?.isAdmin, isAuthLoading, handleViewChange]);

    // --- Theme Effect ---
    useEffect(() => {
        if (needsSetup2FA && user && currentView !== 'two-factor') {
            handleViewChange('two-factor');
        }
    }, [needsSetup2FA, user]);

    useEffect(() => {
        localStorage.setItem('app-theme', theme);
        const root = window.document.documentElement;

        const applyTheme = (isDark: boolean) => {
            root.classList.remove('light', 'dark');
            root.classList.add(isDark ? 'dark' : 'light');
        };

        // Mono renders as light with a grayscale filter (see html.mono in index.css)
        root.classList.toggle('mono', theme === 'mono');

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            applyTheme(mediaQuery.matches);
            const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches);
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            applyTheme(theme === 'dark');
        }
    }, [theme]);

    // --- Modal Logic Wrappers ---

    useEffect(() => {
        const shouldLock = isPasswordInputOpen || isWeightModalOpen || isFormOpen || isImportModalOpen || isDisclaimerOpen;
        document.body.style.overflow = shouldLock ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isPasswordInputOpen, isWeightModalOpen, isFormOpen, isImportModalOpen, isDisclaimerOpen]);


    const importEventsFromJson = async (text: string): Promise<boolean> => {
        try {
            let parsed = JSON.parse(text);

            // Handle Encryption
            if (parsed.encrypted && parsed.iv && parsed.salt && parsed.data) {
                setPendingImportText(text);
                setIsPasswordInputOpen(true);
                return true;
            }

            // Handle Compression
            if (parsed.c && typeof parsed.c === 'string') {
                const decompressed = await decompressData(parsed.c);
                parsed = JSON.parse(decompressed);
            }

            return processImportedData(parsed);
        } catch (err) {
            console.error(err);
            showDialog('alert', t('drawer.import_error'));
            return false;
        }
    };

    const handlePasswordSubmit = async (password: string) => {
        if (!pendingImportText) return;
        const decrypted = await decryptData(pendingImportText, password);
        if (decrypted) {
            try {
                let parsed = JSON.parse(decrypted);
                // Handle Compression after decryption
                if (parsed.c && typeof parsed.c === 'string') {
                    const decompressed = await decompressData(parsed.c);
                    parsed = JSON.parse(decompressed);
                }
                processImportedData(parsed);
                setIsPasswordInputOpen(false);
                setPendingImportText(null);
            } catch (e) {
                console.error(e);
                showDialog('alert', t('import.decrypt_error'));
            }
        } else {
            showDialog('alert', t('import.decrypt_error'));
        }
    };

    const handleEditEvent = (e: DoseEvent) => { setDoseFormPrefill(null); setEditingEvent(e); setIsFormOpen(true); };

    // The tab bar's Log button and the rail's "Log a dose": a new dose, never
    // the one last opened for editing. A "Coming up" row on Today passes the
    // routine it belongs to, so the sheet opens on that medicine and amount.
    const handleLogNewDose = (prefill?: LogDosePrefill) => {
        if (isFormOpen) return;
        closeSecondaryPages();
        setEditingEvent(null);
        setDoseFormPrefill(prefill
            ? {
                route: prefill.route,
                ester: prefill.ester,
                doseMG: prefill.doseMG,
                extras: { ...prefill.extras },
                scheduleOccurrence: prefill.scheduleOccurrence,
            }
            : null);
        setIsFormOpen(true);
    };

    // Share and the model settings keep the tab they were opened from lit.
    const navView: ViewKey = currentView === 'share' ? shareReturn
        : currentView === 'pk-params' ? pkReturn
            : currentView;

    const openShare = (from: ViewKey) => { setShareReturn(from); handleViewChange('share'); };
    const openPKParams = (from: ViewKey) => { setPkReturn(from); handleViewChange('pk-params'); };
    const tabLabel = (view: ViewKey) => t(
        view === 'home' ? 'shell.tab.today'
            : view === 'history' ? 'shell.tab.timeline'
                : view === 'lab' ? 'tests.page_title'
                    : 'you.title');

    // The rail's "Add a blood test": Blood tests, with its add form open.
    const handleAddLabResult = () => { closeSecondaryPages(); handleViewChange('lab'); setIsQuickAddLabOpen(true); };

    // While a forced 2FA setup is pending, the nav stays locked on that page.
    const handleNavChange = (view: ViewKey) => {
        if (!needsSetup2FA) {
            closeSecondaryPages();
            handleViewChange(view);
        }
    };

    const handleQuickExport = () => {
        const exportData = buildExportPayload();
        if (!hasBackupRecords(exportData)) {
            showDialog('alert', t('drawer.empty_export'));
            return;
        }
        const json = JSON.stringify(exportData, null, 2);
        navigator.clipboard.writeText(json).then(() => {
            showDialog('alert', t('drawer.export_copied'));
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    };

    const downloadFile = (data: string, filename: string) => {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportConfirm = async (encrypt: boolean, customPassword?: string): Promise<string | null> => {
        const exportData = buildExportPayload();
        const json = JSON.stringify(exportData, null, 2);

        if (encrypt) {
            const { data, password } = await encryptData(json, customPassword);
            downloadFile(data, `hrt-dosages-encrypted-${new Date().toISOString().split('T')[0]}.json`);
            if (!customPassword) {
                return password;
            }
        } else {
            downloadFile(json, `hrt-dosages-${new Date().toISOString().split('T')[0]}.json`);
        }
        return null;
    };

    // Reconcile, then upload — not a plain upload. Every save inserts a new
    // newest revision with no "only if unchanged", so writing without reading
    // first would let one device's press erase a dose another device deleted.
    // Works with auto-sync switched off; refuses when the cloud copy is
    // encrypted and unreadable here, rather than replacing it with plaintext.
    const handleCloudSave = async () => {
        if (!token) { setIsAuthModalOpen(true); return; }
        const { outcome, errorCode } = await syncState.syncNow();
        // A locked cloud copy is not a failure to retry — it is a password this
        // device hasn't been given. Say so, rather than the flat "save failed"
        // that sent people pressing the button again to no effect. A failure
        // likewise names its cause: the worker's error code picks the line.
        if (outcome === 'error') {
            showDialog('alert', `${t('account.cloud_save_failed')} ${describeSyncError(errorCode, t)}`);
            return;
        }
        showDialog('alert', t(
            outcome === 'synced' ? 'account.cloud_save_success'
                : outcome === 'locked' ? 'account.cloud_save_locked'
                    : 'account.cloud_save_failed'));
    };

    const handleCloudLoad = async (backupId?: string) => {
        if (!token) { setIsAuthModalOpen(true); return; }
        try {
            let parsed: any;
            let timestamp: number;
            if (backupId) {
                const backup = await cloudService.loadOne(token, backupId);
                parsed = await parseCloudBackup(backup.data);
                timestamp = backup.created_at;
            } else {
                // Metadata first, then fetch only the newest body — the same
                // reason as the startup check: the plain list endpoint is
                // SELECT * and would ship every retained backup to read one.
                const metas = await cloudService.listMeta(token);
                if (!metas || metas.length === 0) {
                    showDialog('alert', t('account.no_cloud_backups'));
                    return;
                }
                const newest = metas.reduce((a, b) => (b.created_at > a.created_at ? b : a));
                const latest = await cloudService.loadOne(token, newest.id);
                parsed = await parseCloudBackup(latest.data);
                timestamp = latest.created_at;
            }
            if (!parsed) {
                showDialog('alert', t('account.cloud_load_failed'));
                return;
            }
            showDialog('confirm', (t('account.load_confirm') as string).replace('{time}', new Date(timestamp * 1000).toLocaleString('en-US')), () => {
                processImportedData(parsed);
            });
        } catch (e) {
            showDialog('alert', t('account.cloud_load_failed'));
        }
    };

    const handleCloudMerge = async (backupId: string) => {
        if (!token) { setIsAuthModalOpen(true); return; }
        try {
            const backup = await cloudService.loadOne(token, backupId);
            const parsed = await parseCloudBackup(backup.data);
            if (!parsed) {
                showDialog('alert', t('account.merge_cloud_failed'));
                return;
            }
            mergeImportedData(parsed);
        } catch (e) {
            showDialog('alert', t('account.merge_cloud_failed'));
        }
    };

    // Takes over the whole screen rather than sitting in the view stack: the
    // intro is where HRT mode gets chosen, and leaving the nav up
    // would let someone tab away before choosing. Yields to a
    // forced 2FA setup, which is the one thing that can't wait behind a tour.
    if (showOnboarding && !needsSetup2FA) {
        return (
            <Onboarding
                onDone={() => { markOnboardingSeen(); setShowOnboarding(false); }}
            />
        );
    }

    return (
        <div className="h-[100dvh] w-full flex flex-col md:flex-row font-sans bg-[var(--c-paper)] text-[var(--c-ink)] select-none overflow-hidden">
            <Sidebar
                currentView={navView}
                onViewChange={handleNavChange}
                onLogDose={() => handleLogNewDose()}
                onAddTest={handleAddLabResult}
                isAdmin={!!user?.isAdmin}
                locked={needsSetup2FA}
                suppliesAttention={suppliesAttention.length > 0}
            />
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden w-full bg-[var(--c-paper)] relative pt-[env(safe-area-inset-top,0px)] md:pt-0">

                {/* Operator banner. Outside the scroller and keyed off nothing in
                    this component, so it stays put across view changes. */}
                <SiteNoticeBanner />

                <div
                    ref={mainScrollRef}
                    data-page-scroll
                    key={currentView}
                    className={`flex-1 flex flex-col overflow-y-auto scrollbar-hide scroll-pb-nav ${transitionDirection === 'backward' ? 'view-enter-backward' : 'view-enter-forward'}`}
                >
                    <div style={{ display: hasPages ? 'none' : undefined }}>
                    {currentView === 'home' && (
                        <Home
                            t={t}
                            currentLevel={currentLevel}
                            currentCPA={currentCPA}
                            currentT={currentT}
                            currentStatus={currentStatus}
                            events={events}
                            simulation={simulation}
                            projection={projection}
                            labResults={labResults}
                            onEditEvent={handleEditEvent}
                            calibrationFn={calibrationFn}
                            theme={theme}
                            onNavigateToHistory={() => handleViewChange('history')}
                            onNavigateToLab={() => handleViewChange('lab')}
                            onNavigateToShare={() => openShare('home')}
                            authToken={token}
                            onAuthRequired={() => setIsAuthModalOpen(true)}
                            onLogDose={handleLogNewDose}
                            syncStatus={token ? syncState.status : undefined}
                            lastSyncedAt={syncState.lastSyncedAt}
                            onOpenBackup={() => handleViewChange('account')}
                            schedules={schedules}
                            dueReminders={reminders.due}
                            onSnoozeReminder={reminders.snooze}
                            onSkipReminder={reminders.skip}
                            suppliesAttention={suppliesAttention}
                            onNavigateToReminders={() => handleViewChange('reminders')}
                            onNavigateToSupplies={() => handleViewChange('supplies')}
                        />
                    )}

                    {currentView === 'share' && token && (
                        <ShareSettings
                            onBack={() => handleViewChange(shareReturn)}
                            parentLabel={tabLabel(shareReturn)}
                            authToken={token}
                            mode={mode}
                            events={events}
                            simulation={simulation}
                            calibrationFn={calibrationFn}
                        />
                    )}

                    {currentView === 'history' && (
                        <History
                            t={t}
                            isQuickAddOpen={isQuickAddOpen}
                            setIsQuickAddOpen={setIsQuickAddOpen}
                            doseTemplates={doseTemplates}
                            onSaveEvent={e => {
                                if (events.find(p => p.id === e.id)) updateEvent(e);
                                else addEvent(e);
                            }}
                            onDeleteEvent={deleteEvent}
                            onAddEvents={addEvents}
                            onDeleteEvents={deleteEvents}
                            onSaveTemplate={addTemplate}
                            onDeleteTemplate={deleteTemplate}
                            groupedEvents={groupedEvents}
                            events={events}
                            simulation={simulation}
                            projection={projection}
                            labResults={labResults}
                            calibrationFn={calibrationFn}
                            calibration={calibration}
                            theme={theme}
                            onNavigateToLab={() => handleViewChange('lab')}
                            onNavigateToShare={token ? () => openShare('history') : undefined}
                        />
                    )}

                    {currentView === 'lab' && (
                        <Lab
                            t={t}
                            isQuickAddLabOpen={isQuickAddLabOpen}
                            setIsQuickAddLabOpen={setIsQuickAddLabOpen}
                            labResults={labResults}
                            onSaveLabResult={r => {
                                if (labResults.find(prev => prev.id === r.id)) updateLabResult(r);
                                else addLabResult(r);
                            }}
                            onDeleteLabResult={deleteLabResult}
                            onClearLabResults={clearLabResults}
                            calibrationMethod={calibrationMethod}
                            calibration={calibration}
                            onOpenCalibrationSettings={() => handleViewChange('lab-calibration')}
                            lang={lang}
                            events={events}
                            calibrationHistoryMode={calibrationHistoryMode}
                            onSetCalibrationMethod={setCalibrationMethod}
                            onSetCalibrationHistoryMode={setCalibrationHistoryMode}
                            onOpenPKParams={() => openPKParams('lab')}
                            pkCustomized={!!pkParams}
                        />
                    )}

                    {currentView === 'lab-calibration' && (
                        <CalibrationSettings
                            method={calibrationMethod}
                            setMethod={setCalibrationMethod}
                            historyMode={calibrationHistoryMode}
                            setHistoryMode={setCalibrationHistoryMode}
                            calibration={calibration}
                            onBack={() => handleViewChange('lab')}
                        />
                    )}

                    {currentView === 'settings' && (
                        <Settings
                            t={t}
                            lang={lang}
                            theme={theme}
                            setTheme={setTheme}
                            onImportJson={importEventsFromJson}
                            labResults={labResults}
                            onExport={handleExportConfirm}
                            onQuickExport={handleQuickExport}
                            onClearAllEvents={clearAllEvents}
                            events={events}
                            showDialog={showDialog}
                            setIsDisclaimerOpen={setIsDisclaimerOpen}
                            onShowIntro={() => setShowOnboarding(true)}
                            onNavigateToTransparency={() => handleViewChange('settings-transparency')}
                            appVersion={APP_VERSION}
                            weight={weight}
                            setIsWeightModalOpen={setIsWeightModalOpen}
                            pkParams={pkParams}
                            onNavigateToPKParams={() => openPKParams('settings')}
                            onNavigateToHRTMode={() => handleViewChange('settings-hrt-mode')}
                            onNavigateToAppearance={() => handleViewChange('settings-appearance')}
                            onNavigateToWeight={() => handleViewChange('settings-weight')}
                            onNavigateToExport={() => handleViewChange('settings-export')}
                            onNavigateToImport={() => handleViewChange('settings-import')}
                            autoSync={autoSync}
                            setAutoSync={setAutoSync}
                            isLoggedIn={!!user}
                            devMode={devMode}
                            setDevMode={setDevMode}
                            onNavigateToMilkTea={() => handleViewChange('settings-milk-tea')}
                            onNavigateToCatStates={() => handleViewChange('settings-cat-states')}
                            isAdmin={!!user?.isAdmin}
                            onNavigateToAdmin={() => handleViewChange('admin')}
                            onNavigate={(v) => {
                                if (v === 'share') openShare('settings');
                                else handleViewChange(v as ViewKey);
                            }}
                            onSignIn={() => setIsAuthModalOpen(true)}
                            syncStatus={syncState.status}
                            syncErrorCode={syncState.errorCode}
                            lastSyncedAt={syncState.lastSyncedAt}
                            schedules={schedules}
                            supplyForecasts={supplyForecasts}
                        />
                    )}

                    {currentView === 'reminders' && (
                        <Reminders
                            schedules={schedules}
                            events={events}
                            addSchedule={addSchedule}
                            updateSchedule={updateSchedule}
                            deleteSchedule={deleteSchedule}
                            onBack={() => handleViewChange('settings')}
                        />
                    )}

                    {currentView === 'supplies' && (
                        <SuppliesPage
                            supplies={supplies}
                            schedules={schedules}
                            events={events}
                            isTransmasc={mode === 'transmasc'}
                            addSupply={addSupply}
                            updateSupply={updateSupply}
                            deleteSupply={deleteSupply}
                            onBack={() => handleViewChange('settings')}
                        />
                    )}

                    {currentView === 'settings-hrt-mode' && (
                        <HRTModeSettings
                            onBack={() => handleViewChange('settings')}
                        />
                    )}

                    {currentView === 'settings-appearance' && (
                        <AppearanceSettings
                            theme={theme}
                            setTheme={setTheme}
                            onBack={() => handleViewChange('settings')}
                        />
                    )}

                    {currentView === 'settings-weight' && (
                        <WeightSettings
                            weight={weight}
                            onSave={setWeight}
                            onBack={() => handleViewChange('settings')}
                        />
                    )}

                    {currentView === 'settings-export' && (
                        <ExportSettings
                            events={events}
                            labResults={labResults}
                            hasBackupData={hasBackupRecords(buildExportPayload())}
                            weight={weight}
                            onExport={handleExportConfirm}
                            onQuickExport={handleQuickExport}
                            onBack={() => handleViewChange('settings')}
                        />
                    )}

                    {currentView === 'settings-import' && (
                        <ImportSettings
                            onImportJson={importEventsFromJson}
                            onBack={() => handleViewChange('settings')}
                        />
                    )}

                    {currentView === 'account' && (
                        <Account
                            t={t}
                            user={user}
                            token={token}
                            onLogout={logout}
                            onCloudSave={handleCloudSave}
                            onCloudLoad={handleCloudLoad}
                            onCloudMerge={handleCloudMerge}
                            localData={{ events, labResults, doseTemplates, schedules, supplies, weight }}
                            onNavigate={(v) => handleViewChange(v as ViewKey)}
                            twoFAEnabled={twoFAEnabled}
                            onTwoFAStatusChange={setTwoFAEnabled}
                            syncStatus={syncState.status}
                            syncErrorCode={syncState.errorCode}
                            lastSyncedAt={syncState.lastSyncedAt}
                        />
                    )}

                    {currentView === 'sessions' && token && (
                        <SessionsPage
                            token={token}
                            onBack={() => handleViewChange('account')}
                        />
                    )}

                    {currentView === 'two-factor' && token && (
                        <TwoFactorPage
                            token={token}
                            enabled={twoFAEnabled}
                            onStatusChange={(v) => { setTwoFAEnabled(v); if (v) clearSetup2FA(); }}
                            onBack={() => handleViewChange('account')}
                            setupRequired={needsSetup2FA}
                        />
                    )}

                    {currentView === 'change-password' && (
                        <ChangePasswordPage
                            onBack={() => handleViewChange('account')}
                        />
                    )}

                    {currentView === 'delete-account' && (
                        <DeleteAccountPage
                            onBack={() => handleViewChange('account')}
                        />
                    )}

                    {currentView === 'edit-profile' && (
                        <EditProfilePage
                            onBack={() => handleViewChange('account')}
                        />
                    )}

                    {currentView === 'edit-avatar' && user && token && (
                        <EditAvatarPage
                            username={user.username}
                            token={token}
                            onBack={() => handleViewChange('account')}
                        />
                    )}

                    {currentView === 'settings-transparency' && (
                        <TransparencySettings
                            onBack={() => handleViewChange('settings')}
                        />
                    )}

                    {currentView === 'settings-milk-tea' && devMode && (
                        <MilkTeaEasterEgg
                            onBack={() => handleViewChange('settings')}
                        />
                    )}

                    {currentView === 'settings-cat-states' && devMode && (
                        <CatStates onBack={() => handleViewChange('settings')} />
                    )}

                    {currentView === 'pk-params' && (
                        <PKParamsPage
                            pkParams={pkParams}
                            onSave={setPkParams}
                            onReset={clearPkParams}
                            onBack={() => handleViewChange(pkReturn)}
                            parentLabel={tabLabel(pkReturn)}
                        />
                    )}

                    {currentView === 'admin' && user?.isAdmin && (
                        <Admin onBack={() => handleViewChange('settings')} />
                    )}
                    </div>
                    <SecondaryPageHost />
                </div>

                {/* Docked tab bar (mobile only). Part of the column, not fixed over
                    it, so the scroller above always ends at its top edge. */}
                <TabBar
                    currentView={navView}
                    onViewChange={handleNavChange}
                    onLogDose={() => handleLogNewDose()}
                    locked={needsSetup2FA}
                />
            </div>

            <PasswordInputModal
                isOpen={isPasswordInputOpen}
                onClose={() => setIsPasswordInputOpen(false)}
                onConfirm={handlePasswordSubmit}
            />

            <WeightEditorModal
                isOpen={isWeightModalOpen}
                onClose={() => setIsWeightModalOpen(false)}
                currentWeight={weight}
                onSave={setWeight}
            />

            <DoseFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                eventToEdit={editingEvent}
                prefill={doseFormPrefill}
                onSave={(e: DoseEvent) => {
                    if (events.find(p => p.id === e.id)) updateEvent(e);
                    else addEvent(e);
                }}
                onDelete={deleteEvent}
                templates={doseTemplates}
                onSaveTemplate={addTemplate}
                onDeleteTemplate={deleteTemplate}
                quickDoses={quickDoses}
                onAddQuickDose={addQuickDose}
                onDeleteQuickDose={deleteQuickDose}
                events={events}
                schedules={schedules}
            />

            <DisclaimerModal
                isOpen={isDisclaimerOpen}
                onClose={() => setIsDisclaimerOpen(false)}
            />

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportJson={importEventsFromJson}
            />

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />

        </div>
    );
};

const getShareRoute = (): { isShareRoute: boolean; token: string | null } => {
    if (!/^\/share\/?$/.test(window.location.pathname)) {
        return { isShareRoute: false, token: null };
    }

    const fragmentToken = window.location.hash
        .slice(1)
        .replace(/^\/+/, '')
        .split(/[/?]/, 1)[0];

    return { isShareRoute: true, token: fragmentToken || null };
};

const App = () => {
    const [shareRoute, setShareRoute] = useState(getShareRoute);
    useEffect(() => {
        const updateRoute = () => setShareRoute(getShareRoute());
        window.addEventListener('hashchange', updateRoute);
        window.addEventListener('popstate', updateRoute);
        return () => {
            window.removeEventListener('hashchange', updateRoute);
            window.removeEventListener('popstate', updateRoute);
        };
    }, []);
    return (
        <LanguageProvider>
            <HRTModeProvider>
                {shareRoute.isShareRoute ? (
                    <ErrorBoundary>
                        <PublicShare token={shareRoute.token} />
                    </ErrorBoundary>
                ) : (
                    <SecondaryPageProvider>
                    <DialogProvider>
                        <AuthProvider>
                            <PixelCatProvider>
                                <ErrorBoundary>
                                    <AppContent />
                                </ErrorBoundary>
                            </PixelCatProvider>
                        </AuthProvider>
                    </DialogProvider>
                    </SecondaryPageProvider>
                )}
            </HRTModeProvider>
        </LanguageProvider>
    );
};

export default App;
