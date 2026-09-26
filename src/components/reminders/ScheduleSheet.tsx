import React, { useEffect, useState } from 'react';
import { Ester, ExtraKey, Route, isTestosteroneEster } from '../../../logic';
import { useTranslation } from '../../contexts/LanguageContext';
import { useDialog } from '../../contexts/DialogContext';
import { useHRTMode } from '../../contexts/HRTModeContext';
import type { Schedule } from '../../types/routine';
import { formatLocalDate } from '../../utils/reminders';
import { ScheduleTimingFields } from './ScheduleTimingFields';
import { Regimen, RouteFamily, routeFamily } from '../../utils/schedule';
import { Button, ListGroup, ListRow } from '../ui';
import { SecondaryPage } from '../ui/SecondaryPage';
import { Calendar, Check, Clock, Delete, Moon, Plus, Reminder, Repeat, Snooze } from '../icons';
import { LabelIcon } from '../ui/LabelIcon';
import DoseStepper from '../dose_form/DoseStepper';
import { MedicineIcon } from '../dose_form/MedicineIcon';
import { RouteChoiceIcon } from '../dose_form/shared';
import { IconTile, ROUTE_ICON, tileKind } from '../today/ComingUp';
import { doseText, medName, medShort } from '../today/format';

const CHECK = <Check size={22} />;

const FAMILY_ROUTE: Record<RouteFamily, Route> = {
    injection: Route.injection,
    oral: Route.oral,
    sublingual: Route.sublingual,
    gel: Route.gel,
    patch: Route.patchApply,
};

/** Medicines that make sense for each route, as the Log sheet offers them. */
const ESTERS_FOR: Record<RouteFamily, Ester[]> = {
    injection: [Ester.EV, Ester.EC, Ester.EB, Ester.EN, Ester.EU, Ester.TC, Ester.TE, Ester.TU],
    oral: [Ester.E2, Ester.EV, Ester.CPA, Ester.TU],
    sublingual: [Ester.E2, Ester.EV],
    gel: [Ester.E2, Ester.T],
    patch: [Ester.E2, Ester.T],
};

const LEADS = [0, 15, 30] as const;
const NUDGES = [null, 60, 120] as const;
const DEFAULT_TIME = 21 * 60;

// Match the routes supported by the Log sheet for each HRT mode.
const familiesForMode = (isTransmasc: boolean): RouteFamily[] =>
    isTransmasc ? ['injection', 'gel'] : ['injection', 'oral', 'sublingual', 'gel', 'patch'];

const draftDose = (dose: Pick<Schedule, 'route' | 'doseMG' | 'extras'>): string =>
    String(dose.route === Route.patchApply && !(dose.doseMG > 0)
        ? dose.extras[ExtraKey.releaseRateUGPerDay] ?? dose.doseMG
        : dose.doseMG);

const roundTo5 = (min: number) => ((Math.round(min / 5) * 5) % 1440 + 1440) % 1440;
const upperFirst = (s: string) => (s ? s[0].toLocaleUpperCase() + s.slice(1) : s);

const newId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

interface Draft {
    route: Route;
    ester: Ester;
    dose: string;
    patchRate: boolean;
    extras: Schedule['extras'];
    kind: 'daily' | 'every';
    days: number;
    times: number[];
    anchorDate: string;
    leadMin: number;
    repeatAfterMin: number | null;
}

function draftFromSchedule(s: Schedule): Draft {
    const c = s.cadence;
    return {
        route: s.route,
        ester: s.ester,
        dose: draftDose(s),
        patchRate: s.route === Route.patchApply && !(s.doseMG > 0) && s.extras[ExtraKey.releaseRateUGPerDay] !== undefined,
        extras: { ...s.extras },
        kind: c.kind,
        days: c.kind === 'every' ? c.days : 7,
        times: c.kind === 'daily' ? [...c.times] : [c.time],
        anchorDate: c.kind === 'every' ? c.anchorDate : formatLocalDate(Date.now()),
        leadMin: s.remind.leadMin,
        repeatAfterMin: s.remind.repeatAfterMin,
    };
}

function draftFromRegimen(r: Regimen, base: Draft): Draft {
    const time = roundTo5(r.timeOfDayMin);
    const common = {
        ...base, route: r.last.route, ester: r.last.ester, dose: draftDose(r.last), extras: { ...r.last.extras },
        patchRate: r.last.route === Route.patchApply && !(r.last.doseMG > 0) && r.last.extras[ExtraKey.releaseRateUGPerDay] !== undefined,
    };
    if (r.kind === 'cycle' && r.cycleDays >= 2) {
        const next = r.nextDueMs > 0 ? r.nextDueMs : Date.now();
        return { ...common, kind: 'every', days: r.cycleDays, times: [time], anchorDate: formatLocalDate(next) };
    }
    const perDay = r.kind === 'interval' && r.intervalH > 0 ? Math.min(4, Math.max(1, Math.round(24 / r.intervalH))) : 1;
    const step = 1440 / perDay;
    const times = Array.from({ length: perDay }, (_, i) => roundTo5(time + i * step));
    return { ...common, kind: 'daily', times };
}

function emptyDraft(isTransmasc: boolean): Draft {
    return {
        route: isTransmasc ? Route.injection : Route.oral,
        ester: isTransmasc ? Ester.TC : Ester.E2,
        dose: '',
        patchRate: false,
        extras: {},
        kind: 'daily',
        days: 7,
        times: [DEFAULT_TIME],
        anchorDate: formatLocalDate(Date.now()),
        leadMin: 0,
        repeatAfterMin: null,
    };
}

export interface ScheduleSheetProps {
    open: boolean;
    /** The schedule being edited; leave unset for a new one. */
    schedule?: Schedule | null;
    /** Routines read from the log (inferRegimens), offered as starting points. */
    regimens: Regimen[];
    onSave: (schedule: Schedule) => void;
    onDelete?: (id: string) => void;
    onClose: () => void;
}

/** A secondary page to add or edit a schedule: what, how often, the time or
 *  times, when to remind and whether to nudge again. */
export const ScheduleSheet: React.FC<ScheduleSheetProps> = ({ open, schedule, regimens, onSave, onDelete, onClose }) => {
    const { t } = useTranslation();
    const { showDialog } = useDialog();
    const { isTransmasc } = useHRTMode();
    const [draft, setDraft] = useState<Draft>(() => (schedule ? draftFromSchedule(schedule) : emptyDraft(isTransmasc)));
    /** Which "What" row is picked: a regimen key, or 'custom'. */
    const [what, setWhat] = useState<string>('custom');
    const supportedFamilies = familiesForMode(isTransmasc);
    const availableRegimens = regimens.filter(r =>
        supportedFamilies.includes(r.family) && isTestosteroneEster(r.ester) === isTransmasc);

    useEffect(() => {
        if (!open) return;
        if (schedule) {
            setDraft(draftFromSchedule(schedule));
            setWhat('custom');
        } else if (availableRegimens.length > 0) {
            setDraft(draftFromRegimen(availableRegimens[0], emptyDraft(isTransmasc)));
            setWhat(availableRegimens[0].key);
        } else {
            setDraft(emptyDraft(isTransmasc));
            setWhat('custom');
        }
        // Reset only when the sheet opens or switches schedule.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, schedule?.id]);

    if (!open) return null;

    const set = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }));
    const family = routeFamily(draft.route) ?? 'oral';
    // Keep an existing plan editable after a mode change, without offering its
    // unsupported route or medicine when creating a new plan.
    const availableFamilies = supportedFamilies.includes(family) ? supportedFamilies : [...supportedFamilies, family];
    const availableEsters = ESTERS_FOR[family].filter(e => isTestosteroneEster(e) === isTransmasc || e === draft.ester);
    const patchRate = family === 'patch' && draft.patchRate;

    const pickRegimen = (r: Regimen) => {
        setWhat(r.key);
        setDraft(d => draftFromRegimen(r, d));
    };

    const pickFamily = (f: RouteFamily) => {
        if (f === family) return;
        const esters = ESTERS_FOR[f].filter(e => isTestosteroneEster(e) === isTransmasc);
        if (esters.length === 0) return;
        set({
            route: FAMILY_ROUTE[f],
            ester: esters.includes(draft.ester) ? draft.ester : esters[0],
            dose: '',
            patchRate: f === 'patch',
            extras: f === 'patch' ? { [ExtraKey.releaseRateUGPerDay]: 0 } : {},
        });
    };

    const save = () => {
        const amount = Number(draft.dose);
        const times = [...new Set(draft.times)].sort((a, b) => a - b);
        if (!Number.isFinite(amount) || !(amount > 0) || times.length === 0 || !draft.ester) {
            showDialog('alert', t('reminders.sheet.invalid'));
            return;
        }
        const now = Date.now();
        const cadence: Schedule['cadence'] =
            draft.kind === 'daily'
                ? { kind: 'daily', times }
                : { kind: 'every', days: Math.max(2, Math.round(draft.days)), time: times[0], anchorDate: draft.anchorDate };
        onSave({
            id: schedule?.id ?? newId(),
            route: draft.route,
            ester: draft.ester,
            doseMG: patchRate ? 0 : amount,
            extras: patchRate ? { ...draft.extras, [ExtraKey.releaseRateUGPerDay]: amount } : draft.extras,
            cadence,
            remind: {
                enabled: schedule?.remind.enabled ?? true,
                leadMin: draft.leadMin,
                repeatAfterMin: draft.repeatAfterMin,
            },
            active: schedule?.active ?? true,
            createdAt: schedule?.createdAt ?? now,
            updatedAt: now,
        });
        onClose();
    };

    const remove = () => {
        if (!schedule || !onDelete) return;
        showDialog('confirm', t('reminders.sheet.delete_confirm'), () => {
            onDelete(schedule.id);
            onClose();
        });
    };

    const regimenTitle = (r: Regimen) => `${medShort(r.last.ester, t)} ${doseText(r.last)}`;

    return (
        <SecondaryPage
            title={t(schedule ? 'reminders.sheet.edit' : 'reminders.sheet.new')}
            onBack={onClose}
            backLabel={t('reminders.title')}
        >
                    <div className="list-stack">
                        {/* What */}
                        {!schedule && availableRegimens.length > 0 && (
                            <ListGroup header={t('reminders.sheet.start_from')} selection="single" checkIcon={CHECK}>
                                {[
                                    ...availableRegimens.map(r => (
                                        <ListRow
                                            key={r.key}
                                            leading={<IconTile kind={tileKind(r.ester, isTransmasc)} icon={ROUTE_ICON[r.family]} />}
                                            title={regimenTitle(r)}
                                            selected={what === r.key}
                                            onClick={() => pickRegimen(r)}
                                        />
                                    )),
                                    <ListRow
                                        key="custom"
                                        leading={<IconTile kind="neutral" icon={Plus} />}
                                        title={t('reminders.sheet.something_else')}
                                        selected={what === 'custom'}
                                        onClick={() => setWhat('custom')}
                                    />,
                                ]}
                            </ListGroup>
                        )}

                        {what === 'custom' && (
                            <>
                                <ListGroup header={t('reminders.sheet.route')} selection="single" checkIcon={CHECK}>
                                    {availableFamilies.map(f => (
                                        <ListRow
                                            key={f}
                                            leading={<RouteChoiceIcon route={FAMILY_ROUTE[f]} />}
                                            title={upperFirst(t(`today.route.${f}`))}
                                            selected={family === f}
                                            onClick={() => pickFamily(f)}
                                        />
                                    ))}
                                </ListGroup>
                                <ListGroup header={t('reminders.sheet.medicine')} selection="single" checkIcon={CHECK}>
                                    {availableEsters.map(e => (
                                        <ListRow key={e} leading={<MedicineIcon ester={e} />} title={medName(e, t)} selected={draft.ester === e} onClick={() => set({ ester: e })} />
                                    ))}
                                </ListGroup>
                                <div>
                                    <div className="list-group-header">{t('reminders.sheet.dose')}</div>
                                    <div className="list-group">
                                        <DoseStepper
                                            value={draft.dose}
                                            onChange={v => set({ dose: v })}
                                            step={patchRate ? 12.5 : family === 'injection' ? 0.5 : 0.25}
                                            min={0}
                                            unit={patchRate ? t('dose.guide.unit.ug_day') : 'mg'}
                                            label={t('reminders.sheet.dose')}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* How often */}
                        <ListGroup header={t('reminders.sheet.how_often')} selection="single" checkIcon={CHECK}>
                            <ListRow
                                leading={<LabelIcon icon={Calendar} tone="teal" />}
                                title={t('reminders.sheet.every_day')}
                                selected={draft.kind === 'daily'}
                                onClick={() => set({ kind: 'daily' })}
                            />
                            <ListRow
                                leading={<LabelIcon icon={Repeat} tone="purple" />}
                                title={t('reminders.sheet.every_n')}
                                selected={draft.kind === 'every'}
                                onClick={() => set({ kind: 'every', times: draft.times.slice(0, 1) })}
                            />
                        </ListGroup>

                        {draft.kind === 'every' && (
                            <div>
                                <div className="list-group-header">{t('reminders.sheet.days')}</div>
                                <div className="list-group">
                                    <DoseStepper
                                        value={String(draft.days)}
                                        onChange={v => {
                                            const n = Math.round(parseFloat(v));
                                            set({ days: Number.isFinite(n) ? Math.min(90, Math.max(2, n)) : 2 });
                                        }}
                                        step={1}
                                        min={2}
                                        max={90}
                                        unit=""
                                        label={t('reminders.sheet.days')}
                                    />
                                </div>
                            </div>
                        )}

                        <ScheduleTimingFields
                            kind={draft.kind}
                            times={draft.times}
                            anchorDate={draft.anchorDate}
                            onTimesChange={times => set({ times })}
                            onAnchorChange={anchorDate => set({ anchorDate })}
                        />

                        {/* Remind me */}
                        <ListGroup header={t('reminders.sheet.remind')} selection="single" checkIcon={CHECK}>
                            {LEADS.map(l => (
                                <ListRow
                                    key={l}
                                    leading={<LabelIcon icon={l === 0 ? Reminder : Clock} tone="orange" />}
                                    title={t(l === 0 ? 'reminders.sheet.at_time' : `reminders.sheet.before_${l}`)}
                                    selected={draft.leadMin === l}
                                    onClick={() => set({ leadMin: l })}
                                />
                            ))}
                        </ListGroup>

                        <ListGroup header={t('reminders.sheet.nudge')} selection="single" checkIcon={CHECK}>
                            {NUDGES.map(n => (
                                <ListRow
                                    key={String(n)}
                                    leading={<LabelIcon icon={n === null ? Moon : Snooze} tone={n === null ? 'muted' : 'purple'} />}
                                    title={t(n === null ? 'reminders.sheet.nudge_off' : `reminders.sheet.nudge_${n / 60}h`)}
                                    selected={draft.repeatAfterMin === n}
                                    onClick={() => set({ repeatAfterMin: n })}
                                />
                            ))}
                        </ListGroup>
                    </div>

                    <div className="mt-6 flex flex-col items-center gap-2">
                        <Button block onClick={save}>
                            <Check size={20} />
                            {t('reminders.sheet.save')}
                        </Button>
                        {schedule && onDelete && (
                            <Button variant="destructive" onClick={remove}>
                                <Delete size={20} />
                                {t('reminders.sheet.delete')}
                            </Button>
                        )}
                    </div>
        </SecondaryPage>
    );
};

export default ScheduleSheet;
