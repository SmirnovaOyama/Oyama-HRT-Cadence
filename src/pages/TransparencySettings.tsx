import { formatRelative } from '../utils/helpers';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BackHeader, ListGroup, ListRow } from '../components/ui';
import { YouPage } from './you/shared';
import { ErrorNote, Groups, Lead, Loading } from './account/shared';
import { useTranslation } from '../contexts/LanguageContext';

interface TransparencyStats {
    total_users: number;
    total_backups: number;
    new_users_24h: number;
    new_users_7d: number;
    admin_deleted_count: number;
    self_deleted_count: number;
    admin_deleted_7d: number;
    self_deleted_7d: number;
    recent_registrations: { anon_id: string; created_at: number }[];
    server_time: number;
}

const REFRESH_INTERVAL_MS = 30_000;

interface TransparencySettingsProps {
    onBack: () => void;
}

const TransparencySettings: React.FC<TransparencySettingsProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const [stats, setStats] = useState<TransparencyStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const timerRef = useRef<number | null>(null);

    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/transparency', { signal, cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as TransparencyStats;
            setStats(data);
            setLastUpdated(Date.now());
        } catch (e: any) {
            if (e.name === 'AbortError') return;
            setError(t('transparency.load_error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const ctrl = new AbortController();
        load(ctrl.signal);
        timerRef.current = window.setInterval(() => load(), REFRESH_INTERVAL_MS);
        return () => {
            ctrl.abort();
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, [load]);

    const now = stats?.server_time ?? Math.floor(Date.now() / 1000);

    const count = (n: number | undefined) => <span className="tabular-nums">{(n ?? 0).toLocaleString('en-US')}</span>;
    const recent = stats?.recent_registrations ?? [];
    const updated = lastUpdated
        ? t('transparency.last_updated').replace('{t}', new Date(lastUpdated).toLocaleTimeString('en-US'))
        : undefined;

    return (
        <YouPage>
            <BackHeader parentLabel={t('you.title')} onBack={onBack} title={t('transparency.title')} />
            <Lead className="mt-2" note={t('account.transparency.lead_note')}>{t('account.transparency.lead')}</Lead>

            <Groups className="mt-6">
                <ErrorNote>{error}</ErrorNote>

                {!stats && loading ? (
                    <Loading label={t('transparency.loading')} />
                ) : !stats ? null : (
                    <>
                        <ListGroup header={t('account.transparency.numbers')} footer={updated}>
                            <ListRow title={t('transparency.stat.total_users')} value={count(stats.total_users)} />
                            <ListRow title={t('transparency.stat.total_backups')} value={count(stats.total_backups)} />
                        </ListGroup>
                        <ListGroup header={t('account.transparency.new_users')}>
                            <ListRow title={t('account.transparency.last_24h')} value={count(stats.new_users_24h)} />
                            <ListRow title={t('account.transparency.last_7d')} value={count(stats.new_users_7d)} />
                        </ListGroup>
                        <ListGroup header={t('transparency.stat.self_deleted')}>
                            <ListRow title={t('account.transparency.all_time')} value={count(stats.self_deleted_count)} />
                            <ListRow title={t('account.transparency.last_7d')} value={count(stats.self_deleted_7d)} />
                        </ListGroup>
                        <ListGroup header={t('transparency.stat.admin_deleted')}>
                            <ListRow title={t('account.transparency.all_time')} value={count(stats.admin_deleted_count)} />
                            <ListRow title={t('account.transparency.last_7d')} value={count(stats.admin_deleted_7d)} />
                        </ListGroup>
                    </>
                )}

                {!stats ? null : recent.length === 0 && !loading ? (
                    <ListGroup header={t('transparency.recent.title')}>
                        <ListRow title={<span className="text-[var(--c-muted)]">{t('transparency.recent.empty')}</span>} />
                    </ListGroup>
                ) : recent.length > 0 && (
                    <ListGroup header={t('transparency.recent.title')} footer={t('account.transparency.recent_footer')}>
                        {recent.map((r, idx) => (
                            <ListRow
                                key={`${r.anon_id}-${r.created_at}-${idx}`}
                                title={<span className="font-mono">user_{r.anon_id}***</span>}
                                value={formatRelative(r.created_at, now, t)}
                            />
                        ))}
                    </ListGroup>
                )}
            </Groups>
        </YouPage>
    );
};

export default TransparencySettings;
