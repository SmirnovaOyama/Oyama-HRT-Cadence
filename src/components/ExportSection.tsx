import React, { useId, useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { DoseEvent, LabResult } from '../../logic';
import { exportToCSV, exportToPDF } from '../services/export';
import { Button, ListGroup, ListRow, Switch } from './ui';
import { Field, Note, Panel, PasswordInput } from '../pages/account/shared';

interface ExportSectionProps {
    events: DoseEvent[];
    labResults: LabResult[];
    weight: number;
    onExport: (encrypt: boolean, password?: string) => Promise<string | null>;
    onQuickExport?: () => void;
}

/** The export page's body: an encrypted or plain JSON backup as the main
 *  action, then the other formats as a list of rows that act on tap. */
const ExportSection: React.FC<ExportSectionProps> = ({ events, labResults, weight, onExport, onQuickExport }) => {
    const { t, lang } = useTranslation();
    const [encrypt, setEncrypt] = useState(true);
    const [password, setPassword] = useState('');
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [jsonCopied, setJsonCopied] = useState(false);
    const encryptLabelId = useId();
    const passwordId = useId();

    const hasData = events.length > 0 || labResults.length > 0;

    const handleSave = async () => {
        if (!encrypt) {
            await onExport(false);
            return;
        }
        const pw = await onExport(true, password || undefined);
        if (pw) setGeneratedPassword(pw);
    };

    const handleCopyPassword = () => {
        if (!generatedPassword) return;
        navigator.clipboard.writeText(generatedPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyJson = () => {
        if (onQuickExport) {
            onQuickExport();
            setJsonCopied(true);
            setTimeout(() => setJsonCopied(false), 2000);
        }
    };

    const handleCsvExport = () => {
        const csv = exportToCSV({ events, labResults, weight, lang, t });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hrt-data-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (!hasData) {
        return (
            <Panel>
                <Note>{t('drawer.empty_export')}</Note>
            </Panel>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-6">
                <ListGroup
                    header={t('account.export.backup_header')}
                    footer={encrypt ? t('account.export.encrypt_sub') : undefined}
                >
                    <ListRow
                        title={<span id={encryptLabelId}>{t('account.export.encrypt')}</span>}
                        trailing={
                            <Switch
                                checked={encrypt}
                                onChange={(v) => { setEncrypt(v); setGeneratedPassword(null); }}
                                aria-labelledby={encryptLabelId}
                            />
                        }
                    />
                </ListGroup>

                {encrypt && (
                    <Field label={t('account.field.file_password')} htmlFor={passwordId}>
                        <PasswordInput
                            id={passwordId}
                            name="export-encryption-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('export.password_placeholder')}
                            autoComplete="new-password"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                        />
                    </Field>
                )}

                <Button variant="primary" block onClick={handleSave}>
                    {t('account.export.save')}
                </Button>

                {generatedPassword && (
                    <Panel aria-live="polite">
                        <div className="flex flex-col gap-1">
                            <p className="m-0 text-base font-semibold text-[var(--c-ink)]">{t('account.export.password_title')}</p>
                            <Note>{t('export.password_desc')}</Note>
                        </div>
                        <p className="m-0 select-all break-all rounded-xl bg-[var(--c-surface)] px-4 py-3 font-mono text-base text-[var(--c-ink)]">
                            {generatedPassword}
                        </p>
                        <div className="flex items-center gap-3">
                            <Button variant="secondary" compact onTint onClick={handleCopyPassword}>
                                {copied ? t('account.copied') : t('btn.copy')}
                            </Button>
                            <Button variant="plain" onClick={() => setGeneratedPassword(null)}>
                                {t('account.done')}
                            </Button>
                        </div>
                    </Panel>
                )}
            </section>

            <ListGroup header={t('account.export.other')}>
                {onQuickExport && (
                    <ListRow
                        title={t('account.export.copy')}
                        value={jsonCopied ? t('account.copied') : undefined}
                        onClick={handleCopyJson}
                    />
                )}
                <ListRow
                    title={t('account.export.csv')}
                    onClick={handleCsvExport}
                />
                <ListRow
                    title={t('account.export.pdf')}
                    onClick={() => exportToPDF({ events, labResults, weight, lang, t })}
                />
            </ListGroup>
        </div>
    );
};

export default ExportSection;
