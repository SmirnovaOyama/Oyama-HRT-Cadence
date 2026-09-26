import React, { useState, useEffect, useId } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useDialog } from '../contexts/DialogContext';
import { BackHeader, Button } from '../components/ui';
import { Save, Weight } from '../components/icons';
import { LabelIcon } from '../components/ui/LabelIcon';
import { YouPage } from './you/shared';

interface WeightSettingsProps {
    weight: number;
    onSave: (weight: number) => void;
    onBack: () => void;
}

const WeightSettings: React.FC<WeightSettingsProps> = ({ weight, onSave, onBack }) => {
    const { t } = useTranslation();
    const { showDialog } = useDialog();
    const [weightStr, setWeightStr] = useState(weight.toString());
    const inputId = useId();
    const hintId = useId();

    useEffect(() => {
        setWeightStr(weight.toString());
    }, [weight]);

    const handleSave = (e?: React.FormEvent) => {
        e?.preventDefault();
        const val = parseFloat(weightStr);
        if (!isNaN(val) && val > 0) {
            onSave(val);
            onBack();
        } else {
            showDialog('alert', t('error.nonPositive'));
        }
    };

    return (
        <YouPage>
            <BackHeader parentLabel={t('you.title')} onBack={onBack} title={t('you.weight')} />

            <form onSubmit={handleSave} className="mt-2 flex flex-col gap-6">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <LabelIcon icon={Weight} tone="teal" size={24} />
                        <input
                            id={inputId}
                            type="number"
                            inputMode="decimal"
                            step="any"
                            min="0"
                            value={weightStr}
                            onChange={(e) => setWeightStr(e.target.value)}
                            aria-label={t('you.weight')}
                            aria-describedby={hintId}
                            className="input-base w-40 text-2xl font-semibold tabular-nums"
                            placeholder="0.0"
                            autoFocus
                        />
                        <span className="text-xl text-[var(--c-muted)]">kg</span>
                    </div>
                    <p id={hintId} className="m-0 pt-2 text-sm text-[var(--c-muted)]">
                        {t('you.weight_footer')}
                    </p>
                </div>

                <Button type="submit" variant="primary" block>
                    <Save size={20} />
                    {t('btn.save')}
                </Button>
            </form>
        </YouPage>
    );
};

export default WeightSettings;
