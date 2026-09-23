import React, { useState, useCallback } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useDialog } from '../contexts/DialogContext';
import { PKCustomParams, DEFAULT_PK_PARAMS } from '../../logic';
import { BackHeader, Button, Lead, ListGroup, ListRow } from '../components/ui';

interface PKParamsPageProps {
    pkParams: PKCustomParams | null;
    onSave: (params: PKCustomParams) => void;
    onReset: () => void;
    onBack: () => void;
    /** Name of the screen Back returns to. Defaults to the You tab. */
    parentLabel?: string;
}

type SectionKey = 'e2_inj' | 'e2_oral_sl' | 'e2_gel' | 'e2_core' | 't_inj' | 't_other';

interface FieldDef {
    key: keyof PKCustomParams;
    labelKey: string;
    min: number;
    max: number;
    step: number;
    precision: number;
}

/** Each group's one-line explanation, shown as its footer (the row titles stay
 *  short: "Valerate (EV)" under "Estradiol injections"). */
const FOOTER: Partial<Record<SectionKey, string>> = {
    e2_inj: 'tests.pk.footer.ff',
    e2_gel: 'tests.pk.footer.gel',
    e2_core: 'tests.pk.footer.clear',
    t_inj: 'tests.pk.footer.ff',
    t_other: 'tests.pk.footer.t_other',
};

const SECTIONS: { key: SectionKey; fields: FieldDef[] }[] = [
    {
        key: 'e2_inj',
        fields: [
            { key: 'e2_ff_EB', labelKey: 'tests.pk.f.e2_EB', min: 0, max: 1, step: 0.001, precision: 4 },
            { key: 'e2_ff_EV', labelKey: 'tests.pk.f.e2_EV', min: 0, max: 1, step: 0.001, precision: 4 },
            { key: 'e2_ff_EC', labelKey: 'tests.pk.f.e2_EC', min: 0, max: 1, step: 0.001, precision: 4 },
            { key: 'e2_ff_EN', labelKey: 'tests.pk.f.e2_EN', min: 0, max: 1, step: 0.001, precision: 4 },
            { key: 'e2_ff_EU', labelKey: 'tests.pk.f.e2_EU', min: 0, max: 1, step: 0.001, precision: 4 },
        ],
    },
    {
        key: 'e2_oral_sl',
        fields: [
            { key: 'e2_oral_bio', labelKey: 'tests.pk.f.oral_bio', min: 0, max: 1, step: 0.001, precision: 4 },
            { key: 'e2_sl_quick', labelKey: 'pk.sl_theta.quick', min: 0, max: 1, step: 0.001, precision: 4 },
            { key: 'e2_sl_casual', labelKey: 'pk.sl_theta.casual', min: 0, max: 1, step: 0.001, precision: 4 },
            { key: 'e2_sl_standard', labelKey: 'pk.sl_theta.standard', min: 0, max: 1, step: 0.001, precision: 4 },
            { key: 'e2_sl_strict', labelKey: 'pk.sl_theta.strict', min: 0, max: 1, step: 0.001, precision: 4 },
        ],
    },
    {
        key: 'e2_gel',
        fields: [
            { key: 'e2_gel_arm', labelKey: 'tests.pk.f.arm', min: 0, max: 1, step: 0.001, precision: 3 },
            { key: 'e2_gel_thigh', labelKey: 'tests.pk.f.thigh', min: 0, max: 1, step: 0.001, precision: 3 },
            { key: 'e2_gel_scrotal', labelKey: 'tests.pk.f.scrotal', min: 0, max: 1, step: 0.001, precision: 3 },
        ],
    },
    {
        key: 'e2_core',
        fields: [
            { key: 'e2_kClear', labelKey: 'tests.pk.f.clear', min: 0.001, max: 5, step: 0.001, precision: 4 },
            { key: 'e2_kClearInj', labelKey: 'tests.pk.f.clear_inj', min: 0.001, max: 1, step: 0.001, precision: 4 },
        ],
    },
    {
        key: 't_inj',
        fields: [
            { key: 't_ff_TC', labelKey: 'tests.pk.f.t_TC', min: 0, max: 1, step: 0.001, precision: 4 },
            { key: 't_ff_TE', labelKey: 'tests.pk.f.t_TE', min: 0, max: 1, step: 0.001, precision: 4 },
            { key: 't_ff_TU', labelKey: 'tests.pk.f.t_TU', min: 0, max: 1, step: 0.001, precision: 4 },
        ],
    },
    {
        key: 't_other',
        fields: [
            { key: 't_gel_arm', labelKey: 'tests.pk.f.gel_arm', min: 0, max: 1, step: 0.001, precision: 3 },
            { key: 't_gel_thigh', labelKey: 'tests.pk.f.gel_thigh', min: 0, max: 1, step: 0.001, precision: 3 },
            { key: 't_gel_scrotal', labelKey: 'tests.pk.f.gel_scrotal', min: 0, max: 1, step: 0.001, precision: 3 },
            { key: 't_kClear', labelKey: 'tests.pk.f.clear', min: 0.001, max: 5, step: 0.001, precision: 4 },
            { key: 't_kClearInj', labelKey: 'tests.pk.f.clear_inj', min: 0.001, max: 1, step: 0.001, precision: 4 },
        ],
    },
];

/** Advanced model settings: the pharmacokinetic parameters as grouped lists,
 *  each row with its standard value underneath and "Changed." in words when
 *  it differs. */
const PKParamsPage: React.FC<PKParamsPageProps> = ({ pkParams, onSave, onReset, onBack, parentLabel }) => {
    const { t } = useTranslation();
    const { showDialog } = useDialog();

    const [draft, setDraft] = useState<PKCustomParams>(() =>
        pkParams ? { ...DEFAULT_PK_PARAMS, ...pkParams } : { ...DEFAULT_PK_PARAMS }
    );
    const [saved, setSaved] = useState(false);

    const updateField = useCallback((key: keyof PKCustomParams, rawValue: string, min: number, max: number) => {
        const num = parseFloat(rawValue);
        if (!Number.isFinite(num)) return;
        setDraft(prev => ({ ...prev, [key]: Math.max(min, Math.min(max, num)) }));
        setSaved(false);
    }, []);

    const handleSave = () => {
        onSave(draft);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleReset = () => {
        showDialog('confirm', t('pk.reset_confirm'), () => {
            setDraft({ ...DEFAULT_PK_PARAMS });
            onReset();
        });
    };

    // The page is reached from the You tab; fall back to the older Settings
    // name if the shell's label is not there.
    const youLabel = t('shell.tab.you') !== 'shell.tab.you' ? t('shell.tab.you') : t('nav.settings');

    const isCustomized = (key: keyof PKCustomParams) => draft[key] !== DEFAULT_PK_PARAMS[key];

    return (
        <div className="relative pb-32">
            <div className="mx-auto flex w-full max-w-[704px] flex-col gap-6 px-4 md:px-8">
                <BackHeader
                    parentLabel={parentLabel ?? youLabel}
                    onBack={onBack}
                    title={t('tests.advanced')}
                />

                <Lead className="-mt-2" detail={t('tests.pk.warn_short')}>
                    {t(pkParams ? 'tests.pk.status_custom' : 'tests.pk.status_default')}
                </Lead>

                {SECTIONS.map(section => {
                    const footerKey = FOOTER[section.key];
                    return (
                        <ListGroup
                            key={section.key}
                            header={t(`tests.pk.group.${section.key}`)}
                            footer={footerKey ? t(footerKey) : undefined}
                        >
                            {section.fields.map(field => {
                                const defVal = DEFAULT_PK_PARAMS[field.key] as number;
                                const curVal = draft[field.key] as number;
                                const changed = isCustomized(field.key);
                                const inputId = `pk-${field.key}`;
                                const std = defVal.toFixed(field.precision);
                                return (
                                    <ListRow
                                        key={field.key}
                                        title={<label htmlFor={inputId} className="block truncate">{t(field.labelKey)}</label>}
                                        sub={changed ? (
                                            <span className="block truncate font-semibold text-[var(--c-accent)]">
                                                {t('tests.pk.changed_from').replace('{v}', std)}
                                            </span>
                                        ) : (
                                            <span className="block truncate">{t('tests.pk.default').replace('{v}', std)}</span>
                                        )}
                                        trailing={
                                            <input
                                                id={inputId}
                                                type="number"
                                                inputMode="decimal"
                                                min={field.min}
                                                max={field.max}
                                                step={field.step}
                                                value={curVal}
                                                onChange={e => updateField(field.key, e.target.value, field.min, field.max)}
                                                className="input-base !w-24 !min-h-11 shrink-0 !py-2 text-end tabular-nums"
                                            />
                                        }
                                    />
                                );
                            })}
                        </ListGroup>
                    );
                })}

                <div className="flex flex-col gap-2">
                    <Button block onClick={handleSave}>
                        {saved ? t('pk.saved') : t('btn.save')}
                    </Button>
                    <p className="m-0 px-4 text-sm text-[var(--c-muted)]">{t('pk.note')}</p>
                </div>

                {/* Destructive: its own group at the bottom. */}
                <ListGroup>
                    <ListRow tone="destructive" title={t('tests.pk.reset')} onClick={handleReset} />
                </ListGroup>
            </div>
        </div>
    );
};

export default PKParamsPage;
