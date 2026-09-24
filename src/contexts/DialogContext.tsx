import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from './LanguageContext';
import { SecondaryPage } from '../components/ui/SecondaryPage';
import { DialogContext, type DialogType } from './dialogState';

export { useDialog } from './dialogState';

export const DialogProvider = ({ children }: { children: React.ReactNode }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<DialogType>('alert');
    const [message, setMessage] = useState("");
    const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);

    const showDialog = useCallback((type: DialogType, message: string, onConfirm?: () => void) => {
        setType(type);
        setMessage(message);
        setOnConfirm(() => onConfirm || null);
        setIsOpen(true);
    }, []);

    // Stable reference so opening/closing the dialog doesn't re-render every
    // consumer of useDialog() across the app (showDialog itself never changes).
    const contextValue = useMemo(() => ({ showDialog }), [showDialog]);

    const handleConfirm = () => {
        // The callback may open a result page synchronously. Close this one
        // first so its result is not overwritten by our final state update.
        setIsOpen(false);
        if (onConfirm) onConfirm();
    };

    return (
        <DialogContext.Provider value={contextValue}>
            {children}
            {isOpen && (
                <SecondaryPage
                    title={type === 'confirm' ? t('dialog.confirm_title') : t('dialog.alert_title')}
                    onBack={() => setIsOpen(false)}
                >
                    <p className="text-sm text-muted mb-5 leading-relaxed">{message}</p>
                    <div className="flex gap-2">
                        {type === 'confirm' && (
                            <button onClick={() => setIsOpen(false)} className="btn-secondary flex-1">
                                {t('btn.cancel')}
                            </button>
                        )}
                        <button onClick={handleConfirm} className="btn-primary flex-1">
                            {t('btn.ok')}
                        </button>
                    </div>
                </SecondaryPage>
            )}
        </DialogContext.Provider>
    );
};
