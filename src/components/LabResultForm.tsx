import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useDialog } from '../contexts/DialogContext';
import { LabResult, isT_LabUnit } from '../../logic';
import { ChevronRight } from './icons';
import { v4 as uuidv4 } from 'uuid';
import DateTimePicker from './DateTimePicker';
import { formatTime } from '../utils/helpers';
import { makeDayFormatter } from './DoseHeatmap';
import { Button, ListGroup, ListRow, SegmentedControl } from './ui';

interface LabResultFormProps {
    resultToEdit?: LabResult | null;
    onSave: (result: LabResult) => void;
    onCancel: () => void;
    onDelete?: (id: string) => void;
}

type LabUnit = 'pg/ml' | 'pmol/l' | 'ng/dl' | 'nmol/l';

const E2_UNITS: LabUnit[] = ['pmol/l', 'pg/ml'];
const T_UNITS: LabUnit[] = ['ng/dl', 'nmol/l'];
const UNIT_LABELS: Record<LabUnit, string> = {
    'pmol/l': 'pmol/L',
    'pg/ml': 'pg/mL',
    'ng/dl': 'ng/dL',
    'nmol/l': 'nmol/L',
};

/** Local "YYYY-MM-DDTHH:mm" for a moment, the shape the date row keeps. */
const toLocalIso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

// One hormone's value and unit, as a grouped list: the number field on the
// left, the unit as a short segmented control on the right. Reused for the
// estradiol group, the testosterone group, and (when editing) the one group
// matching the hormone of the record being edited.
const HormoneValueGroup: React.FC<{
    id: string;
    label: string;
    units: LabUnit[];
    unit: LabUnit;
    onUnitChange: (u: LabUnit) => void;
    value: string;
    onValueChange: (v: string) => void;
}> = ({ id, label, units, unit, onUnitChange, value, onValueChange }) => (
    <ListGroup header={<label htmlFor={id} className="font-normal">{label}</label>}>
        <div className="list-row gap-3">
            <input
                id={id}
                type="number"
                inputMode="decimal"
                placeholder="0.0"
                value={value}
                onChange={e => onValueChange(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xl font-normal tabular-nums text-[var(--c-ink)] outline-none placeholder:text-[var(--c-muted)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <SegmentedControl
                aria-label={label}
                variant="inline"
                className="w-40 shrink-0"
                options={units.map(u => ({ value: u, label: UNIT_LABELS[u] }))}
                value={unit}
                onChange={onUnitChange}
            />
        </div>
    </ListGroup>
);

/** Add or edit a blood test, laid out for a sheet: grouped rows, then the
 *  one primary action and a plain destructive delete. */
const LabResultForm: React.FC<LabResultFormProps> = ({ resultToEdit, onSave, onCancel, onDelete }) => {
    const { t, lang } = useTranslation();
    const { showDialog } = useDialog();
    const [dateStr, setDateStr] = useState("");
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Editing an existing record: single value tied to that record's hormone.
    const [editUnit, setEditUnit] = useState<LabUnit>('pmol/l');
    const [editValue, setEditValue] = useState("");

    // Adding new: estradiol and testosterone are independent fields, so one
    // blood draw covering both markers can be logged as a single entry at a
    // single timestamp instead of two separate saves.
    const [e2Unit, setE2Unit] = useState<LabUnit>('pmol/l');
    const [e2Value, setE2Value] = useState("");
    const [tUnit, setTUnit] = useState<LabUnit>('ng/dl');
    const [tValue, setTValue] = useState("");

    useEffect(() => {
        if (resultToEdit) {
            setDateStr(toLocalIso(new Date(resultToEdit.timeH * 3600000)));
            setEditValue(resultToEdit.concValue.toString());
            setEditUnit(resultToEdit.unit);
        } else {
            setDateStr(toLocalIso(new Date()));
            setE2Value("");
            setTValue("");
            setE2Unit('pmol/l');
            setTUnit('ng/dl');
        }
    }, [resultToEdit]);

    const handleSave = () => {
        if (!dateStr) return;
        const timeH = new Date(dateStr).getTime() / 3600000;
        if (isNaN(timeH)) return;

        if (resultToEdit) {
            const numValue = parseFloat(editValue);
            if (!editValue || isNaN(numValue) || numValue < 0) return;
            onSave({ id: resultToEdit.id, timeH, concValue: numValue, unit: editUnit });
            return;
        }

        const e2Num = parseFloat(e2Value);
        const tNum = parseFloat(tValue);
        const hasE2 = e2Value.trim() !== '' && Number.isFinite(e2Num) && e2Num >= 0;
        const hasT = tValue.trim() !== '' && Number.isFinite(tNum) && tNum >= 0;
        if (!hasE2 && !hasT) return;
        if (hasE2) onSave({ id: uuidv4(), timeH, concValue: e2Num, unit: e2Unit });
        if (hasT) onSave({ id: uuidv4(), timeH, concValue: tNum, unit: tUnit });
    };

    const handleDelete = () => {
        if (!resultToEdit || !onDelete) return;
        showDialog('confirm', t('lab.delete_confirm'), () => {
            onDelete(resultToEdit.id);
            onCancel();
        });
    };

    const canSave = resultToEdit ? !!editValue : (!!e2Value || !!tValue);
    const editIsT = isT_LabUnit(editUnit);

    const dayText = useMemo(() => makeDayFormatter(lang), [lang]);
    const dateLabel = dateStr && !Number.isNaN(new Date(dateStr).getTime())
        ? `${dayText(new Date(dateStr))}, ${formatTime(new Date(dateStr))}`
        : '';

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <ListGroup chevronIcon={<ChevronRight size={16} />}>
                    <ListRow
                        title={t('tests.date')}
                        value={<span className="tabular-nums">{dateLabel}</span>}
                        drillIn
                        aria-expanded={isDatePickerOpen}
                        onClick={() => setIsDatePickerOpen(v => !v)}
                    />
                </ListGroup>
                <DateTimePicker
                    isOpen={isDatePickerOpen}
                    inline
                    onClose={() => setIsDatePickerOpen(false)}
                    onConfirm={(date) => setDateStr(toLocalIso(date))}
                    initialDate={dateStr ? new Date(dateStr) : new Date()}
                    mode="datetime"
                    title={t('tests.date')}
                />
            </div>

            {resultToEdit ? (
                <HormoneValueGroup
                    id="lab-edit-value"
                    label={editIsT ? t('tests.t') : t('tests.e2')}
                    units={editIsT ? T_UNITS : E2_UNITS}
                    unit={editUnit}
                    onUnitChange={setEditUnit}
                    value={editValue}
                    onValueChange={setEditValue}
                />
            ) : (
                <>
                    <HormoneValueGroup
                        id="lab-e2-value"
                        label={t('tests.e2')}
                        units={E2_UNITS}
                        unit={e2Unit}
                        onUnitChange={setE2Unit}
                        value={e2Value}
                        onValueChange={setE2Value}
                    />
                    <div className="flex flex-col">
                        <HormoneValueGroup
                            id="lab-t-value"
                            label={t('tests.t')}
                            units={T_UNITS}
                            unit={tUnit}
                            onUnitChange={setTUnit}
                            value={tValue}
                            onValueChange={setTValue}
                        />
                        <p className="list-group-footer">{t('lab.dual_hint')}</p>
                    </div>
                </>
            )}

            <div className="flex flex-col gap-2">
                <Button block onClick={handleSave} disabled={!canSave || !dateStr}>
                    {t('tests.save')}
                </Button>
                <div className="flex items-center justify-between gap-3">
                    {resultToEdit && onDelete ? (
                        <Button variant="destructive" onClick={handleDelete}>{t('tests.delete')}</Button>
                    ) : <span />}
                    <Button variant="plain" onClick={onCancel}>{t('btn.cancel')}</Button>
                </div>
            </div>
        </div>
    );
};

export default LabResultForm;
