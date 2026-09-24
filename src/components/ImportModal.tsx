import React, { useState, useRef, useEffect, useId } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { SecondaryPage } from './ui/SecondaryPage';
import { Button, ListGroup, ListRow } from './ui';

const ImportModal = ({ isOpen, onClose, onImportJson }: { isOpen: boolean; onClose: () => void; onImportJson: (text: string) => boolean | Promise<boolean> }) => {
    const { t } = useTranslation();
    const [text, setText] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pasteId = useId();

    useEffect(() => {
        if (isOpen) {
            setText("");
        }
    }, [isOpen]);

    const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const content = reader.result as string;
            if (await onImportJson(content)) {
                onClose();
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const handleTextImport = async () => {
        if (await onImportJson(text)) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <SecondaryPage title={t('account.page.import')} onBack={onClose}>
            <div className="flex flex-col gap-5">
                <ListGroup footer={t('account.import.footer')}>
                    <ListRow
                        title={t('account.import.file')}
                        onClick={() => fileInputRef.current?.click()}
                    />
                </ListGroup>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={handleJsonFileChange}
                />

                <div className="flex flex-col gap-2">
                    <label htmlFor={pasteId} className="px-4 text-sm font-semibold text-[var(--c-muted)]">
                        {t('account.import.paste_label')}
                    </label>
                    <textarea
                        id={pasteId}
                        className="input-base h-32 resize-none font-mono"
                        placeholder={t('import.paste_hint')}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                    />
                </div>

                <Button variant="primary" block onClick={handleTextImport} disabled={!text.trim()}>
                    {t('account.import.bring_in')}
                </Button>
            </div>
        </SecondaryPage>
    );
};

export default ImportModal;
