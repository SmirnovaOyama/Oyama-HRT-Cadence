import React, { useState, useEffect } from 'react';
import { authService, Session } from '../services/auth';
import { useTranslation } from '../contexts/LanguageContext';
import { joinList, listSeparator } from '../i18n/listSeparator';
import { useDialog } from '../contexts/DialogContext';
import { maskIpAddress } from '../components/SettingsListItem';
import { BackHeader, Button, ListGroup, ListRow } from '../components/ui';
import { YouPage } from './you/shared';
import { BusySpinner, DangerTitle, Groups, Loading, Note, Panel } from './account/shared';
import { formatRelative } from '../utils/helpers';

interface SessionsPageProps {
    token: string;
    onBack: () => void;
}

/**
 * Browser and OS out of a user agent. Both halves are product names and stay
 * as they are; only the "we couldn't tell" case is a word, so the caller
 * translates that one rather than this taking a `t` for a single string.
 */
function parseDevice(ua: string): { browser: string | null; os: string } {
    const lower = ua.toLowerCase();

    let browser: string | null = null;
    if (lower.includes('edg')) browser = 'Edge';
    else if (lower.includes('chrome') && !lower.includes('edg')) browser = 'Chrome';
    else if (lower.includes('firefox')) browser = 'Firefox';
    else if (lower.includes('safari') && !lower.includes('chrome')) browser = 'Safari';

    let os = '';
    if (lower.includes('iphone')) os = 'iPhone';
    else if (lower.includes('ipad')) os = 'iPad';
    else if (lower.includes('android')) os = 'Android';
    else if (lower.includes('windows')) os = 'Windows';
    else if (lower.includes('mac os') || lower.includes('macos')) os = 'macOS';
    else if (lower.includes('linux')) os = 'Linux';

    return { browser, os };
}

const SessionsPage: React.FC<SessionsPageProps> = ({ token, onBack }) => {
    const { t, lang } = useTranslation();
    const { showDialog } = useDialog();
    // One instant for every row, rather than each call reading its own clock.
    const nowSec = Math.floor(Date.now() / 1000);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);
    const [terminating, setTerminating] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            setSessions(await authService.listSessions(token));
        } catch {
            showDialog('alert', t('account.sessions_fetch_failed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleTerminate = (sid: string) => {
        showDialog('confirm', t('account.sessions_terminate_confirm'), async () => {
            setTerminating(sid);
            try {
                await authService.terminateSession(token, sid);
                setSessions(prev => prev.filter(s => s.id !== sid));
            } catch {
                showDialog('alert', t('account.sessions_terminate_failed'));
            } finally {
                setTerminating(null);
            }
        });
    };

    const handleTerminateOthers = () => {
        showDialog('confirm', t('account.sessions_terminate_all_confirm'), async () => {
            setTerminating('others');
            try {
                await authService.terminateOtherSessions(token);
                setSessions(prev => prev.filter(s => s.is_current));
            } catch {
                showDialog('alert', t('account.sessions_terminate_failed'));
            } finally {
                setTerminating(null);
            }
        });
    };

    const current = sessions.filter(s => s.is_current);
    const otherSessions = sessions.filter(s => !s.is_current);

    const row = (s: Session) => {
        const { browser, os } = parseDevice(s.device_info || '');
        const label = joinList(lang, [browser ?? t('session.unknown_browser'), os].filter((p): p is string => !!p));
        const isTerminating = terminating === s.id;
        // One line of state: when it was last used, and roughly where from.
        const sub = (
            <span className="block truncate">
                {t('account.sessions_last_used')} {formatRelative(s.last_used_at, nowSec, t)}
                {listSeparator(lang)}
                <span className="font-mono">{maskIpAddress(s.ip)}</span>
            </span>
        );
        return (
            <ListRow
                key={s.id}
                title={<span className="block truncate">{label}</span>}
                sub={sub}
                trailing={!s.is_current && (
                    <Button
                        variant="destructive"
                        className="-me-2"
                        onClick={() => handleTerminate(s.id)}
                        disabled={isTerminating || terminating === 'others'}
                        aria-label={t('account.sessions.sign_out_device').replace('{device}', label)}
                    >
                        {isTerminating ? <BusySpinner /> : t('account.sessions.sign_out')}
                    </Button>
                )}
            />
        );
    };

    return (
        <YouPage>
            <BackHeader parentLabel={t('account.title')} onBack={onBack} title={t('account.page.sessions')} />

            {loading ? (
                <Loading />
            ) : sessions.length === 0 ? (
                <Panel className="mt-4"><Note>{t('account.sessions_empty')}</Note></Panel>
            ) : (
                <Groups className="mt-4">
                    {current.length > 0 && (
                        <ListGroup header={t('account.sessions_current')}>
                            {current.map(row)}
                        </ListGroup>
                    )}
                    {otherSessions.length > 0 && (
                        <ListGroup header={t('account.sessions.others')} footer={t('account.sessions.others_footer')}>
                            {otherSessions.map(row)}
                        </ListGroup>
                    )}
                    {/* The one action that affects every other device sits in
                        its own group at the bottom. */}
                    {otherSessions.length > 1 && (
                        <ListGroup>
                            <ListRow
                                title={<DangerTitle>{t('account.sessions.sign_out_others')}</DangerTitle>}
                                trailing={terminating === 'others' ? <BusySpinner /> : undefined}
                                onClick={handleTerminateOthers}
                                disabled={terminating === 'others'}
                            />
                        </ListGroup>
                    )}
                </Groups>
            )}
        </YouPage>
    );
};

export default SessionsPage;
