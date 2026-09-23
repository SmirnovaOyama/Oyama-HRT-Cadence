import { useState, useEffect } from 'react';
import { isPlausibleBodyWeightKG } from '../../logic';
import { useTranslation } from '../contexts/LanguageContext';
import { useDialog } from '../contexts/DialogContext';
import { useEscape } from '../hooks/useEscape';
import { Button } from './ui';
import DoseStepper from './dose_form/DoseStepper';

const WeightEditorModal = ({ isOpen, onClose, currentWeight, onSave }: any) => {
    const { t } = useTranslation();
    const { showDialog } = useDialog();
    const [weightStr, setWeightStr] = useState(currentWeight.toString());

    useEscape(onClose, isOpen);

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => setWeightStr(currentWeight.toString()), [currentWeight, isOpen]);

    const handleSave = () => {
        if (isSaving) return;
        setIsSaving(true);
        const val = parseFloat(weightStr);
        // `> 0` alone accepted 1e-9, and weight sets the distribution volume —
        // a near-zero one turns a normal dose into a reading in the trillions.
        if (isPlausibleBodyWeightKG(val)) {
            onSave(val);
            onClose();
        } else {
            showDialog('alert', t('error.weightRange'));
            setIsSaving(false);
        }
        setIsSaving(false);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-shell">
                <div className="modal-card bg-[var(--c-paper)]" role="dialog" aria-modal="true">
                    <h3 className="modal-title">{t('modal.weight.title')}</h3>

                    <div className="mb-6">
                        <div className="list-group">
                            <DoseStepper
                                value={weightStr}
                                onChange={setWeightStr}
                                step={0.5}
                                min={0}
                                unit="kg"
                                label={t('modal.weight.title')}
                                placeholder="0.0"
                            />
                        </div>
                        <p className="list-group-footer m-0">{t('modal.weight.desc')}</p>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1 basis-0" onClick={onClose}>
                            {t('btn.cancel')}
                        </Button>
                        <Button variant="primary" className="flex-1 basis-0" onClick={handleSave} disabled={isSaving}>
                            {t('btn.save')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeightEditorModal;
