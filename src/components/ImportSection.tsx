import React, { useId, useRef, useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { ChevronDown, ChevronUp, Copy, Import } from './icons';
import { Button, ListGroup, ListRow } from './ui';
import { LabelIcon } from './ui/LabelIcon';

interface ImportSectionProps {
    onImportJson: (text: string) => boolean | Promise<boolean>;
}

/** The import page's body: pick a file, or open a field to paste its text. */
const ImportSection: React.FC<ImportSectionProps> = ({ onImportJson }) => {
    const { t } = useTranslation();
    const [showPaste, setShowPaste] = useState(false);
    const [text, setText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pasteId = useId();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            await onImportJson(reader.result as string);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleTextImport = async () => {
        if (!await onImportJson(text)) return;
        setText('');
        setShowPaste(false);
    };

    return (
        <div className="flex flex-col gap-4 [&_.list-sep-icon]:ms-[48px]">
            <ListGroup footer={t('account.import.footer')}>
                <ListRow
                    className="min-h-[52px]"
                    leading={<LabelIcon icon={Import} tone="blue" />}
                    title={t('account.import.file')}
                    onClick={() => fileInputRef.current?.click()}
                />
                <ListRow
                    className="min-h-[52px]"
                    leading={<LabelIcon icon={Copy} tone="purple" />}
                    title={t('account.import.paste')}
                    aria-expanded={showPaste}
                    aria-controls={pasteId}
                    trailing={
                        <span className="flex-none text-[var(--c-muted)]" aria-hidden="true">
                            {showPaste ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </span>
                    }
                    onClick={() => setShowPaste(v => !v)}
                />
            </ListGroup>
            <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleFileChange}
            />

            {showPaste && (
                <div id={pasteId} className="flex flex-col gap-3">
                    <textarea
                        className="input-base h-40 resize-none font-mono"
                        aria-label={t('account.import.paste')}
                        placeholder={t('import.paste_hint')}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        autoFocus
                    />
                    <div className="flex justify-end">
                        <Button variant="primary" compact onClick={handleTextImport} disabled={!text.trim()}>
                            <Import size={20} />
                            {t('account.import.bring_in')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportSection;
