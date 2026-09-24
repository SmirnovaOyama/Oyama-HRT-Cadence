import React, { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from '../contexts/LanguageContext';
import { useDialog } from '../contexts/DialogContext';
import CustomSelect from './CustomSelect';
import DateTimePicker from './DateTimePicker';
import { Route, Ester, ExtraKey, DoseEvent, SL_TIER_ORDER, SublingualTierParams, getBioavailabilityMultiplier, getToE2Factor, getDoseAdvisory } from '../../logic';
import { Check, ChevronRight, ChevronDown, Close, Plus, Delete, External } from './icons';
import { Button, ListGroup, ListRow } from './ui';
import { DoseAdvisoryLine } from './DoseAdvisory';
import { joinList } from '../i18n/listSeparator';
import InjectionFields from './dose_form/InjectionFields';
import OralFields from './dose_form/OralFields';
import SublingualFields from './dose_form/SublingualFields';
import GelFields from './dose_form/GelFields';
import PatchFields from './dose_form/PatchFields';
import type { QuickDose } from './dose_form/QuickDoseButtons';
import type { AmountBasis } from './dose_form/AmountSection';
import {
    GroupHeader,
    ListSep,
    RouteTile,
    describeAmount,
    describeDose,
    describeWhen,
    esterName,
    formatAmount,
    formatRelative,
    formatTime,
    routeName,
} from './dose_form/shared';
import { isDue, regimenSub, sameDose } from './dose_form/regimens';
import { Regimen, regimensFor, sameLocalDay, usableRegimens } from '../utils/schedule';
import type { Schedule } from '../types/routine';
import { useHRTMode } from '../contexts/HRTModeContext';
import { doseTimeForSave, toLocalMinuteString as toLocalInput } from '../utils/doseEventTime';
import { retainedScheduleOccurrence } from '../utils/doseScheduleLink';

export interface DoseTemplate {
    id: string;
    name: string;
    route: Route;
    ester: Ester;
    doseMG: number;
    extras: Partial<Record<ExtraKey, number>>;
    createdAt: number;
}

type DoseLevelKey = 'low' | 'medium' | 'high' | 'very_high' | 'above';

type DoseGuideConfig = {
    unitKey: 'mg_day' | 'ug_day' | 'mg_week';
    thresholds: [number, number, number, number];
    requiresRate?: boolean;
};

const DOSE_GUIDE_CONFIG: Partial<Record<Route, DoseGuideConfig>> = {
    [Route.oral]: { unitKey: 'mg_day', thresholds: [2, 4, 8, 12] },
    [Route.sublingual]: { unitKey: 'mg_day', thresholds: [1, 2, 4, 6] },
    [Route.patchApply]: { unitKey: 'ug_day', thresholds: [100, 200, 400, 600], requiresRate: true },
    [Route.gel]: { unitKey: 'mg_day', thresholds: [1.5, 3, 6, 9] },
};

// The level is words in a colour, never a dot or a badge.
const LEVEL_TEXT: Record<DoseLevelKey, string> = {
    low: 'text-[var(--c-target)]',
    medium: 'text-[var(--c-target)]',
    high: 'text-[var(--c-attention)]',
    very_high: 'text-[var(--c-danger)]',
    above: 'text-[var(--c-danger)]',
};

const formatGuideNumber = (val: number) => {
    if (Number.isInteger(val)) return val.toString();
    const rounded = val < 1 ? val.toFixed(2) : val.toFixed(1);
    return rounded.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
};

const SL_POINTS = SL_TIER_ORDER
    .map((k, idx) => ({ idx, key: k, hold: SublingualTierParams[k].hold, theta: SublingualTierParams[k].theta }))
    .sort((a, b) => a.hold - b.hold);

const thetaFromHold = (holdMin: number): number => {
    if (holdMin <= 0) return 0;
    if (SL_POINTS.length === 0) return 0.11;
    const h = Math.max(1, holdMin);
    // Linear interpolation with endpoint extrapolation
    for (let i = 0; i < SL_POINTS.length - 1; i++) {
        const p1 = SL_POINTS[i];
        const p2 = SL_POINTS[i + 1];
        if (h >= p1.hold && h <= p2.hold) {
            const t = (h - p1.hold) / (p2.hold - p1.hold || 1);
            return Math.min(1, Math.max(0, p1.theta + (p2.theta - p1.theta) * t));
        }
    }
    // Extrapolate below first or above last segment
    if (h < SL_POINTS[0].hold) {
        const p1 = SL_POINTS[0];
        const p2 = SL_POINTS[1];
        const slope = (p2.theta - p1.theta) / (p2.hold - p1.hold || 1);
        return Math.min(1, Math.max(0, p1.theta + (h - p1.hold) * slope));
    }
    const pLast = SL_POINTS[SL_POINTS.length - 1];
    const pPrev = SL_POINTS[SL_POINTS.length - 2];
    const slope = (pLast.theta - pPrev.theta) / (pLast.hold - pPrev.hold || 1);
    return Math.min(1, Math.max(0, pLast.theta + (h - pLast.hold) * slope));
};

const holdFromTheta = (thetaVal: number): number => {
    if (SL_POINTS.length === 0) return 10;
    const th = thetaVal;
    for (let i = 0; i < SL_POINTS.length - 1; i++) {
        const p1 = SL_POINTS[i];
        const p2 = SL_POINTS[i + 1];
        const minTh = Math.min(p1.theta, p2.theta);
        const maxTh = Math.max(p1.theta, p2.theta);
        if (th >= minTh && th <= maxTh) {
            const t = (th - p1.theta) / (p2.theta - p1.theta || 1);
            return p1.hold + (p2.hold - p1.hold) * t;
        }
    }
    // Extrapolate
    if (th < SL_POINTS[0].theta) {
        const p1 = SL_POINTS[0];
        const p2 = SL_POINTS[1];
        const slope = (p2.hold - p1.hold) / (p2.theta - p1.theta || 1);
        return Math.max(1, p1.hold + (th - p1.theta) * slope);
    }
    const pLast = SL_POINTS[SL_POINTS.length - 1];
    const pPrev = SL_POINTS[SL_POINTS.length - 2];
    const slope = (pLast.hold - pPrev.hold) / (pLast.theta - pPrev.theta || 1);
    return Math.max(1, pLast.hold + (th - pLast.theta) * slope);
};

// Display order of the route list (the enum's own order is not meaningful).
const ROUTE_ORDER: Route[] = [Route.injection, Route.oral, Route.sublingual, Route.gel, Route.patchApply, Route.patchRemove];

/** "custom" (the full route and medicine fields), one of the person's
 *  routines (inferred from the log), or a saved row. */
type WhatChoice = 'custom' | `reg:${string}` | `tpl:${string}` | `qd:${string}`;

const NO_SCHEDULES: Schedule[] = [];

interface DoseFormProps {
    eventToEdit: DoseEvent | null;
    onSave: (event: DoseEvent) => void;
    onCancel: () => void;
    onDelete: (id: string) => void;
    templates: DoseTemplate[];
    onSaveTemplate: (template: DoseTemplate) => void;
    onDeleteTemplate: (id: string) => void;
    isInline?: boolean;
    hideHeader?: boolean;
    quickDoses?: QuickDose[];
    onAddQuickDose?: (dose: QuickDose) => void;
    onDeleteQuickDose?: (id: string) => void;
    /** Existing doses, used only to show whether recent use is already running high. */
    events?: DoseEvent[];
    /** id for the sheet title, so a dialog around the form can point at it. */
    titleId?: string;
    /** A new dose that should open on this medicine, route and amount (a
     *  "Coming up" row on Today). Ignored when editing. */
    prefill?: DoseFormPrefill | null;
    /** Explicit schedules: listed first in "What", ahead of the routines
     *  inferred from the log, and replacing any they cover. */
    schedules?: Schedule[];
}

/** What a "Coming up" row hands the sheet. Time stays "Now". */
export interface DoseFormPrefill {
    route: Route;
    ester: Ester;
    doseMG: number;
    extras: Partial<Record<ExtraKey, number>>;
    /** Explicit reminder being logged; absent for ordinary entry points. */
    scheduleOccurrence?: DoseEvent['scheduleOccurrence'];
}

/**
 * The Log a dose sheet (design/cadence/boards/LogDose.dc.html). Every choice
 * is a list view: What (the person's routines, then saved templates and quick
 * doses that are not the same dose, or "Something else" with route and
 * medicine pickers), When (Now, or Earlier with the date and
 * time picker), then How much with a stepper and the route's own fields. A
 * footer sentence says exactly what will be saved.
 */
const DoseForm: React.FC<DoseFormProps> = ({ eventToEdit, onSave, onCancel, onDelete, templates = [], onSaveTemplate, onDeleteTemplate, isInline = false, hideHeader = false, quickDoses, onAddQuickDose, onDeleteQuickDose, events = [], titleId, prefill = null, schedules = NO_SCHEDULES }) => {
    const { t, lang } = useTranslation();
    const { showDialog } = useDialog();
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const isInitializingRef = useRef(false);
    const [showSaveTemplateInput, setShowSaveTemplateInput] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [whatChoice, setWhatChoice] = useState<WhatChoice>('custom');
    const [isEditingList, setIsEditingList] = useState(false);
    const [whenMode, setWhenMode] = useState<'now' | 'earlier'>(eventToEdit ? 'earlier' : 'now');
    const [now, setNow] = useState(() => new Date());
    const [amountBasis, setAmountBasis] = useState<AmountBasis>('raw');
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isDoseGuideOpen, setIsDoseGuideOpen] = useState(false);

    // Form State
    const [dateStr, setDateStr] = useState("");
    const { isTransmasc } = useHRTMode();
    const [route, setRoute] = useState<Route>(Route.injection);
    const [ester, setEster] = useState<Ester>(isTransmasc ? Ester.TC : Ester.EV);

    const [rawDose, setRawDose] = useState("");
    const [e2Dose, setE2Dose] = useState("");

    const [patchMode, setPatchMode] = useState<"dose" | "rate">("rate");
    const [patchRate, setPatchRate] = useState("");
    const [patchWearDays, setPatchWearDays] = useState("");

    const [gelSite, setGelSite] = useState(0); // Index in GEL_SITE_ORDER

    const [slTier, setSlTier] = useState(2);
    const [useCustomTheta, setUseCustomTheta] = useState(false);
    const [customHoldInput, setCustomHoldInput] = useState<string>("10");
    const [customHoldValue, setCustomHoldValue] = useState<number>(10);
    const [lastEditedField, setLastEditedField] = useState<'raw' | 'bio'>('bio');

    const availableRoutes = useMemo(() => {
        if (isTransmasc) {
            // Transmasc: no oral/sublingual; no patches (T patches are uncommon and
            // not realistically modeled with the current µg/day scheme).
            return Object.values(Route).filter(r =>
                r !== Route.oral && r !== Route.sublingual &&
                r !== Route.patchApply && r !== Route.patchRemove
            );
        }
        return Object.values(Route);
    }, [isTransmasc]);

    // Saved rows offered in "What". Rows for a route this mode can't log are left out.
    const savedTemplates = useMemo(
        () => templates.filter(tpl => availableRoutes.includes(tpl.route)),
        [templates, availableRoutes],
    );
    const savedQuickDoses = useMemo(
        () => (quickDoses ?? [])
            .filter(q => availableRoutes.includes(q.route))
            .slice()
            .sort((a, b) => a.route === b.route && a.ester === b.ester ? a.value - b.value : 0),
        [quickDoses, availableRoutes],
    );

    // The person's routines as the top rows of "What": explicit schedules
    // first, then the routines inferred from the log that no schedule covers,
    // each group soonest due first. A schedule row logs the schedule's dose;
    // an inferred one repeats its latest dose.
    const nowMs = now.getTime();
    const regimens = useMemo<Regimen[]>(
        () => eventToEdit
            ? []
            : usableRegimens(regimensFor(events, schedules, nowMs))
                .filter(r => availableRoutes.includes(r.last.route))
                .sort((a, b) => (a.schedule ? 0 : 1) - (b.schedule ? 0 : 1) || a.nextDueMs - b.nextDueMs),
        [eventToEdit, events, schedules, nowMs, availableRoutes],
    );
    // Saved rows that repeat a routine are left out of the list (still shown
    // while editing the list, so they can be deleted).
    const isRoutineDose = (dose: { route: Route; ester: Ester; doseMG: number; extras?: Partial<Record<ExtraKey, number>> }) =>
        regimens.some(r => sameDose(r.last, dose));
    const listedTemplates = isEditingList ? savedTemplates : savedTemplates.filter(tpl => !isRoutineDose(tpl));
    const listedQuickDoses = isEditingList
        ? savedQuickDoses
        : savedQuickDoses.filter(q => !isRoutineDose({ route: q.route, ester: q.ester, doseMG: q.value }));
    /** When a quick dose's amount was last logged, for its sub-line. */
    const lastLoggedMs = (q: QuickDose): number | null => {
        let best: number | null = null;
        for (const e of events) {
            if (!sameDose(e, { route: q.route, ester: q.ester, doseMG: q.value })) continue;
            const ms = e.timeH * 3_600_000;
            if (ms <= nowMs && (best === null || ms > best)) best = ms;
        }
        return best;
    };

    const slExtras = useMemo(() => {
        if (route !== Route.sublingual) return null;
        if (useCustomTheta) {
            const theta = thetaFromHold(customHoldValue);
            return { [ExtraKey.sublingualTheta]: theta };
        }
        return { [ExtraKey.sublingualTier]: slTier };
    }, [route, useCustomTheta, customHoldValue, slTier]);

    const bioMultiplier = useMemo(() => {
        const extrasForCalc: Record<string, unknown> = slExtras ?? {};
        if (route === Route.gel) {
            extrasForCalc[ExtraKey.gelSite] = gelSite;
        }
        return getBioavailabilityMultiplier(route, ester, extrasForCalc);
    }, [route, ester, slExtras, gelSite]);

    /** Fill the form from a saved template. Templates store the raw-ester
     *  dose, so the raw field is the source of truth; otherwise handleSave
     *  would re-derive the dose from the rounded E2-equivalent string and
     *  drift it (12.5 → 12.499934). */
    const applyTemplate = (template: DoseTemplate) => {
        setRoute(template.route);
        setEster(template.ester);
        setRawDose(formatAmount(template.doseMG));
        setLastEditedField(template.ester === Ester.E2 ? 'bio' : 'raw');
        setAmountBasis(template.ester === Ester.E2 ? 'bio' : 'raw');

        const factor = getToE2Factor(template.ester) || 1;
        setE2Dose(formatAmount(template.doseMG * factor));

        if (template.route === Route.patchApply) {
            const rate = template.extras[ExtraKey.releaseRateUGPerDay];
            if (rate) {
                setPatchMode('rate');
                setPatchRate(rate.toString());
            } else {
                setPatchMode('dose');
            }
            const wearH = template.extras[ExtraKey.patchWearH];
            setPatchWearDays(typeof wearH === 'number' && Number.isFinite(wearH) && wearH > 0 ? (wearH / 24).toString() : "");
        }

        if (template.route === Route.sublingual) {
            if (template.extras[ExtraKey.sublingualTier] !== undefined) {
                setSlTier(template.extras[ExtraKey.sublingualTier]);
                setUseCustomTheta(false);
            } else if (template.extras[ExtraKey.sublingualTheta] !== undefined) {
                const theta = template.extras[ExtraKey.sublingualTheta];
                const hold = Math.max(1, Math.min(60, holdFromTheta(typeof theta === 'number' ? theta : 0.11)));
                setCustomHoldValue(hold);
                setCustomHoldInput(formatAmount(hold));
                setUseCustomTheta(true);
            }
        }

        if (template.route === Route.gel && template.extras[ExtraKey.gelSite] !== undefined) {
            setGelSite(template.extras[ExtraKey.gelSite]);
        }
    };

    /** Fill everything from a routine's latest dose. */
    const applyRegimen = (regimen: Regimen) => {
        const last = regimen.last;
        applyTemplate({ id: '', name: '', createdAt: 0, route: last.route, ester: last.ester, doseMG: last.doseMG, extras: { ...last.extras } });
    };

    /** Fill route, medicine and amount from a quick dose (a raw-ester value). */
    const applyQuickDose = (dose: QuickDose) => {
        setRoute(dose.route);
        setEster(dose.ester);
        setRawDose(formatAmount(dose.value));
        const factor = getToE2Factor(dose.ester) || 1;
        setE2Dose(formatAmount(dose.value * factor));
        setLastEditedField(dose.ester === Ester.E2 ? 'bio' : 'raw');
        setAmountBasis(dose.ester === Ester.E2 ? 'bio' : 'raw');
        if (dose.route === Route.patchApply) setPatchMode('dose');
    };

    useEffect(() => {
        isInitializingRef.current = true;
        if (eventToEdit) {
            setDateStr(toLocalInput(new Date(eventToEdit.timeH * 3600000)));
            setWhenMode('earlier');
            setWhatChoice('custom');
            setRoute(eventToEdit.route);
            setEster(eventToEdit.ester);

            if (eventToEdit.route === Route.patchApply && eventToEdit.extras[ExtraKey.releaseRateUGPerDay]) {
                setPatchMode("rate");
                setPatchRate(eventToEdit.extras[ExtraKey.releaseRateUGPerDay].toString());
                setE2Dose("");
                setRawDose("");
            } else {
                setPatchMode("dose");
                const factor = getToE2Factor(eventToEdit.ester);
                const e2Val = eventToEdit.doseMG * factor;
                setE2Dose(formatAmount(e2Val));
                setRawDose(formatAmount(eventToEdit.doseMG));

                if (eventToEdit.ester !== Ester.E2) {
                    setLastEditedField('raw');
                    setAmountBasis('raw');
                } else {
                    setLastEditedField('bio');
                    setAmountBasis('bio');
                }
            }

            if (eventToEdit.route === Route.sublingual) {
                if (eventToEdit.extras[ExtraKey.sublingualTier] !== undefined) {
                    setSlTier(eventToEdit.extras[ExtraKey.sublingualTier]);
                    setUseCustomTheta(false);
                    const tierKey = SL_TIER_ORDER[eventToEdit.extras[ExtraKey.sublingualTier]] || 'standard';
                    const hold = SublingualTierParams[tierKey]?.hold ?? 10;
                    setCustomHoldValue(hold);
                    setCustomHoldInput(hold.toString());
                } else if (eventToEdit.extras[ExtraKey.sublingualTheta] !== undefined) {
                    const thetaVal = eventToEdit.extras[ExtraKey.sublingualTheta];
                    setUseCustomTheta(true);
                    const safeTheta = (typeof thetaVal === 'number' && Number.isFinite(thetaVal)) ? thetaVal : 0.11;
                    const hold = Math.max(1, Math.min(60, holdFromTheta(safeTheta)));
                    setCustomHoldValue(hold);
                    setCustomHoldInput(formatAmount(hold));
                } else {
                    setUseCustomTheta(false);
                    setCustomHoldValue(10);
                    setCustomHoldInput("10");
                }
            } else {
                setUseCustomTheta(false);
                setCustomHoldValue(10);
                setCustomHoldInput("10");
            }

            if (eventToEdit.route === Route.gel) {
                setGelSite(eventToEdit.extras[ExtraKey.gelSite] ?? 0);
            } else {
                setGelSite(0);
            }

            const wearH = eventToEdit.extras[ExtraKey.patchWearH];
            if (eventToEdit.route === Route.patchApply && typeof wearH === 'number' && Number.isFinite(wearH) && wearH > 0) {
                setPatchWearDays((wearH / 24).toString());
            } else {
                setPatchWearDays("");
            }

        } else {
            setDateStr(toLocalInput(new Date()));
            setWhenMode('now');
            setRoute(isTransmasc ? Route.injection : Route.sublingual);
            setEster(isTransmasc ? Ester.TC : Ester.EV);
            setRawDose("");
            setE2Dose("");
            setPatchMode("rate");
            setPatchRate("");
            setPatchWearDays("");
            setSlTier(2);
            setGelSite(0);
            setUseCustomTheta(false);
            setCustomHoldValue(10);
            setCustomHoldInput("10");
            setLastEditedField('bio');
            setAmountBasis('raw');

            // Start on the routine that is due (or the one a "Coming up" row
            // passed in), else the first row of the list. Later calls win over
            // the defaults above.
            const initNow = Date.now();
            const dueRegimen = regimens.find(r => isDue(r, initNow));
            const firstRegimen = dueRegimen ?? regimens[0];
            const firstTemplate = listedTemplates[0];
            const firstQuick = listedQuickDoses[0];
            const sameAmount = (a: number, b: number) => Math.abs(a - b) < 1e-6;
            const prefillRegimen = prefill && availableRoutes.includes(prefill.route)
                ? regimens.find(r => sameDose(r.last, prefill))
                : undefined;
            const prefillTemplate = prefill && !prefillRegimen && availableRoutes.includes(prefill.route)
                ? savedTemplates.find(tpl => tpl.route === prefill.route && tpl.ester === prefill.ester && sameAmount(tpl.doseMG, prefill.doseMG))
                : undefined;
            const prefillQuick = prefill && !prefillRegimen && !prefillTemplate && availableRoutes.includes(prefill.route)
                ? savedQuickDoses.find(q => q.route === prefill.route && q.ester === prefill.ester && sameAmount(q.value, prefill.doseMG))
                : undefined;
            if (prefillRegimen) {
                applyRegimen(prefillRegimen);
                setWhatChoice(`reg:${prefillRegimen.key}`);
            } else if (prefillTemplate) {
                applyTemplate(prefillTemplate);
                setWhatChoice(`tpl:${prefillTemplate.id}`);
            } else if (prefillQuick) {
                applyQuickDose(prefillQuick);
                setWhatChoice(`qd:${prefillQuick.id}`);
            } else if (prefill && availableRoutes.includes(prefill.route)) {
                // Not saved as a row: open "Something else" filled in.
                applyTemplate({ id: '', name: '', createdAt: 0, ...prefill });
                setWhatChoice('custom');
            } else if (firstRegimen) {
                applyRegimen(firstRegimen);
                setWhatChoice(`reg:${firstRegimen.key}`);
            } else if (firstTemplate) {
                applyTemplate(firstTemplate);
                setWhatChoice(`tpl:${firstTemplate.id}`);
            } else if (firstQuick) {
                applyQuickDose(firstQuick);
                setWhatChoice(`qd:${firstQuick.id}`);
            } else {
                setWhatChoice('custom');
            }
        }

        // Use timeout to allow state to settle
        const timer = setTimeout(() => {
            isInitializingRef.current = false;
        }, 0);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventToEdit, prefill]); // Removed isOpen dependency as component mounts only when needed

    // Nothing left to edit: leave edit mode.
    useEffect(() => {
        if (isEditingList && savedTemplates.length === 0 && savedQuickDoses.length === 0) setIsEditingList(false);
    }, [isEditingList, savedTemplates.length, savedQuickDoses.length]);

    // Keep the "Now" row's time (and the planned-or-past check) current.
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 15_000);
        return () => window.clearInterval(timer);
    }, []);

    const handleRawChange = (val: string) => {
        setRawDose(val);
        setLastEditedField('raw');
        const v = parseFloat(val);
        if (!isNaN(v)) {
            const factor = getToE2Factor(ester) || 1;
            const e2Equivalent = v * factor;
            setE2Dose(formatAmount(e2Equivalent));
        } else {
            setE2Dose("");
        }
    };

    const handleE2Change = (val: string) => {
        setE2Dose(val);
        setLastEditedField('bio');
        const v = parseFloat(val);
        if (!isNaN(v)) {
            const factor = getToE2Factor(ester) || 1;
            if (ester === Ester.E2) {
                setRawDose(formatAmount(v));
            } else {
                setRawDose(formatAmount(v / factor));
            }
        } else {
            setRawDose("");
        }
    };

    useEffect(() => {
        if (isInitializingRef.current || lastEditedField !== 'raw' || !rawDose) return;
        handleRawChange(rawDose);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bioMultiplier, ester, route]);

    useEffect(() => {
        if (isInitializingRef.current || lastEditedField !== 'bio' || !e2Dose) return;
        handleE2Change(e2Dose);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bioMultiplier, ester, route]);

    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

    const handleSaveAsTemplate = () => {
        if (!templateName.trim()) {
            showDialog('alert', t('template.name_required'));
            return;
        }

        const template: DoseTemplate = {
            id: uuidv4(),
            name: templateName.trim(),
            route,
            ester,
            doseMG: parseFloat(rawDose) || 0,
            extras: {},
            createdAt: Date.now()
        };

        if (route === Route.sublingual && slExtras) {
            Object.assign(template.extras, slExtras);
        }
        if (route === Route.gel) {
            template.extras[ExtraKey.gelSite] = gelSite;
        }
        if (route === Route.patchApply && patchMode === 'rate') {
            template.extras[ExtraKey.releaseRateUGPerDay] = parseFloat(patchRate) || 0;
        }
        if (route === Route.patchApply) {
            const wearDays = parseFloat(patchWearDays);
            if (Number.isFinite(wearDays) && wearDays > 0) {
                template.extras[ExtraKey.patchWearH] = wearDays * 24;
            }
        }

        onSaveTemplate(template);
        setShowSaveTemplateInput(false);
        setTemplateName('');
        showDialog('alert', t('template.saved'));
    };

    // Quick doses: the raw amount for the current route and medicine.
    const currentQuickValue = parseFloat(rawDose);
    const quickExists = savedQuickDoses.some(d =>
        d.route === route && d.ester === ester && Number.isFinite(currentQuickValue) && Math.abs(d.value - currentQuickValue) < 0.0001);

    const handleAddQuickDose = () => {
        if (!onAddQuickDose) return;
        if (!Number.isFinite(currentQuickValue) || currentQuickValue <= 0) {
            showDialog('alert', t('quickdose.empty_input'));
            return;
        }
        if (quickExists) return;
        onAddQuickDose({
            id: uuidv4(),
            route,
            ester,
            value: currentQuickValue,
            createdAt: Date.now()
        });
    };

    const handleDeleteTemplate = (template: DoseTemplate) => {
        showDialog('confirm', t('template.delete_confirm'), () => {
            onDeleteTemplate(template.id);
            if (whatChoice === `tpl:${template.id}`) setWhatChoice('custom');
        });
    };

    const handleDeleteQuickDose = (dose: QuickDose) => {
        if (!onDeleteQuickDose) return;
        showDialog('confirm', t('quickdose.delete_confirm'), () => {
            onDeleteQuickDose(dose.id);
            if (whatChoice === `qd:${dose.id}`) setWhatChoice('custom');
        });
    };

    const handleDeleteEvent = () => {
        if (!eventToEdit) return;
        showDialog('confirm', t('modal.dose.delete_confirm'), () => {
            onDelete(eventToEdit.id);
            onCancel();
        });
    };

    const chosenDate = useMemo(() => {
        if (whenMode === 'now') return now;
        const d = new Date(dateStr);
        return Number.isNaN(d.getTime()) ? now : d;
    }, [whenMode, dateStr, now]);

    const isPlanned = !eventToEdit && whenMode === 'earlier' && chosenDate.getTime() > now.getTime() + 60_000;

    const handleSave = () => {
        // Ref latch, not state: setIsSaving(true/false) within one synchronous
        // handler nets out to no visible change, so the disabled prop never
        // engaged and a double-click/double-tap could add the dose twice
        // (each click mints a fresh uuid in add mode).
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        setIsSaving(true);
        const failSave = (msg: string) => {
            showDialog('alert', msg);
            isSavingRef.current = false;
            setIsSaving(false);
        };
        // An untouched minute keeps an edited record's original seconds, so
        // it stays after any supply amount set moments before that dose.
        const timeH = doseTimeForSave(whenMode, dateStr, eventToEdit?.timeH);

        let e2Equivalent = parseFloat(e2Dose);
        if (isNaN(e2Equivalent)) e2Equivalent = 0;
        let finalDose = 0;

        const extras: any = {};
        const nonPositiveMsg = t('error.nonPositive');

        if (route === Route.sublingual && useCustomTheta) {
            if (!Number.isFinite(customHoldValue) || customHoldValue < 1) {
                failSave(t('error.slHoldMinOne'));
                return;
            }
        }

        if (route === Route.patchApply && patchMode === "rate") {
            const rateVal = parseFloat(patchRate);
            if (!Number.isFinite(rateVal) || rateVal <= 0) {
                failSave(nonPositiveMsg);
                return;
            }
            finalDose = 0;
            extras[ExtraKey.releaseRateUGPerDay] = rateVal;
        } else if (route === Route.patchApply && patchMode === "dose") {
            const raw = parseFloat(rawDose);
            if (!rawDose || rawDose.trim() === '' || !Number.isFinite(raw) || raw <= 0) {
                failSave(nonPositiveMsg);
                return;
            }
            finalDose = raw;
        } else if (route !== Route.patchRemove) {
            const rawVal = parseFloat(rawDose);
            if (ester !== Ester.E2 && lastEditedField === 'raw') {
                // doseMG is stored in raw-ester mg, and the raw field is what the
                // user typed (or a template/quick-dose filled). Use it directly:
                // round-tripping through the E2-equivalent string loses precision
                // to its rounding, e.g. 12.5 mg CPA saved as 12.499934.
                if (!rawDose || rawDose.trim() === '' || !Number.isFinite(rawVal) || rawVal <= 0) {
                    failSave(nonPositiveMsg);
                    return;
                }
                finalDose = rawVal;
            } else {
                if (!e2Dose || e2Dose.trim() === '' || !Number.isFinite(e2Equivalent) || e2Equivalent <= 0) {
                    failSave(nonPositiveMsg);
                    return;
                }
                const factor = getToE2Factor(ester) || 1;
                finalDose = (ester === Ester.E2) ? e2Equivalent : e2Equivalent / factor;
            }
        }

        if (route === Route.sublingual && slExtras) {
            Object.assign(extras, slExtras);
        }

        if (route === Route.gel) {
            extras[ExtraKey.gelSite] = gelSite;
        }

        if (route === Route.patchApply) {
            const wearDays = parseFloat(patchWearDays);
            if (Number.isFinite(wearDays) && wearDays > 0) {
                extras[ExtraKey.patchWearH] = wearDays * 24;
            }
        }

        const scheduleOccurrence = retainedScheduleOccurrence(eventToEdit ?? prefill, route, savedEster);
        const newEvent: DoseEvent = {
            id: eventToEdit?.id || uuidv4(),
            route,
            ester: savedEster,
            timeH,
            doseMG: finalDose,
            extras,
            ...(scheduleOccurrence ? { scheduleOccurrence } : {}),
        };

        onSave(newEvent);
        // Every current mount point unmounts this form after a successful save;
        // the delayed re-arm is a safety net for any future persistent mount,
        // while still swallowing the double-click window.
        window.setTimeout(() => {
            isSavingRef.current = false;
            setIsSaving(false);
        }, 800);
    };

    const availableEsters = useMemo(() => {
        if (isTransmasc) {
            switch (route) {
                case Route.injection:
                    return [Ester.TC, Ester.TE, Ester.TU];
                case Route.gel:
                    return [Ester.T];
                default:
                    return [Ester.T];
            }
        }
        switch (route) {
            case Route.injection:
                return [Ester.EB, Ester.EV, Ester.EC, Ester.EN, Ester.EU];
            case Route.oral:
                return [Ester.E2, Ester.EV, Ester.CPA];
            case Route.sublingual:
                return [Ester.E2, Ester.EV];
            default:
                return [Ester.E2];
        }
    }, [route, isTransmasc]);

    useEffect(() => {
        if (!availableRoutes.includes(route)) {
            setRoute(availableRoutes[0]);
        }
    }, [availableRoutes, route]);

    useEffect(() => {
        if (!availableEsters.includes(ester)) {
            setEster(availableEsters[0]);
        }
    }, [availableEsters, ester]);

    // The ester actually stored: patches and gels always save the plain hormone.
    const savedEster = (route === Route.patchRemove || route === Route.patchApply || route === Route.gel)
        ? (isTransmasc ? Ester.T : Ester.E2)
        : ester;

    const doseGuide = useMemo(() => {
        if (ester === Ester.CPA) return null;
        // The built-in dose thresholds (DOSE_GUIDE_CONFIG) are calibrated for
        // feminizing HRT (E2). They would be misleading for testosterone dosing,
        // so skip the guide entirely in transmasc mode.
        if (isTransmasc) return null;
        const cfg = DOSE_GUIDE_CONFIG[route];
        if (!cfg) return null;
        if (route === Route.patchApply && patchMode === "dose" && cfg.requiresRate) {
            return { config: cfg, level: null, value: null, showRateHint: true as const };
        }
        const rawVal = route === Route.patchApply ? parseFloat(patchRate) : parseFloat(e2Dose);
        const value = Number.isFinite(rawVal) && rawVal > 0 ? rawVal : null;
        let level: DoseLevelKey | null = null;
        if (value !== null) {
            const [low, medium, high, veryHigh] = cfg.thresholds;
            if (value <= low) level = 'low';
            else if (value <= medium) level = 'medium';
            else if (value <= high) level = 'high';
            else if (value <= veryHigh) level = 'very_high';
            else level = 'above';
        }
        return { config: cfg, level, value, showRateHint: false as const };
    }, [route, patchMode, patchRate, e2Dose, ester, isTransmasc]);

    // Recent-use heads-up, based on doses already logged (not the still-unsaved
    // value being typed here). Covers CPA and injections too, which the static
    // per-dose guide above doesn't — see getDoseAdvisory in logic.ts.
    const doseAdvisory = useMemo(() => getDoseAdvisory(events), [events]);

    const guideUnitLabel = doseGuide?.config ? t(`dose.guide.unit.${doseGuide.config.unitKey}`) : "";
    const guideRangeText = doseGuide?.config
        ? `${doseGuide.config.thresholds.map((threshold) => `≤ ${formatGuideNumber(threshold)}`).join(', ')} ${guideUnitLabel}`
        : "";
    const confirmAndOpenExternal = (url: string) => {
        const host = (() => {
            try {
                return new URL(url).hostname.replace(/^www\./, '');
            } catch {
                return url;
            }
        })();
        const confirmText = t('drawer.model_confirm').replace('mahiro.uk', host);
        showDialog('confirm', confirmText, () => {
            window.open(url, '_blank', 'noopener,noreferrer');
        });
    };

    // ── The sentence in the footer ────────────────────────────────────
    const sentenceDose = (() => {
        const rate = parseFloat(patchRate);
        if (route === Route.patchApply && patchMode === 'rate') {
            return describeDose(t, lang, {
                route, ester: savedEster, doseMG: 0,
                extras: Number.isFinite(rate) && rate > 0 ? { [ExtraKey.releaseRateUGPerDay]: rate } : {},
            }, { lower: true, unitRate: t('dose.guide.unit.ug_day') });
        }
        const amount = route === Route.gel ? parseFloat(e2Dose) : parseFloat(rawDose);
        return describeDose(t, lang, {
            route, ester: savedEster, doseMG: Number.isFinite(amount) && amount > 0 ? amount : 0,
        }, { lower: true });
    })();
    const missingAmount = (() => {
        if (route === Route.patchRemove) return false;
        const v = route === Route.patchApply && patchMode === 'rate'
            ? parseFloat(patchRate)
            : route === Route.gel ? parseFloat(e2Dose) : parseFloat(rawDose);
        return !(Number.isFinite(v) && v > 0);
    })();
    const sentence = t(eventToEdit ? 'log.will_save' : isPlanned ? 'log.will_plan' : 'log.will_log').replace(
        '{what}',
        joinList(lang, [sentenceDose, ...(missingAmount ? [t('log.no_amount')] : []), describeWhen(t, lang, chosenDate)]),
    );

    const title = eventToEdit ? t('log.edit_title') : isPlanned ? t('log.plan_title') : t('log.title');
    const saveLabel = eventToEdit ? t('log.save_changes') : isPlanned ? t('log.add_to_plan') : t('log.log_it');

    const checkIcon = <Check size={22} />;
    const chevronIcon = <ChevronRight size={16} />;
    const hasSavedRows = savedTemplates.length > 0 || savedQuickDoses.length > 0;
    const showWhatList = !eventToEdit && (regimens.length > 0 || hasSavedRows);
    const showChoosers = !showWhatList || whatChoice === 'custom';
    const unitRate = t('dose.guide.unit.ug_day');
    /** One line, never wrapping next to the check: long text ends in an ellipsis. */
    const oneLine = (text: React.ReactNode) => <span className="block truncate">{text}</span>;

    // ── Sections ──────────────────────────────────────────────────────
    // Route and medicine, with no tiles: the rows of this group are plain.
    const choosers = (
        <div className="list-group">
            <CustomSelect
                bare
                label={t('log.route_label')}
                value={route}
                onChange={(val) => setRoute(val as Route)}
                options={ROUTE_ORDER.filter(r => availableRoutes.includes(r)).map(r => ({
                    value: r,
                    label: routeName(t, r),
                }))}
            />
            {route !== Route.patchRemove && availableEsters.length > 1 && (
                <>
                    <ListSep />
                    <CustomSelect
                        bare
                        label={t('log.ester_label')}
                        value={ester}
                        onChange={(val) => setEster(val as Ester)}
                        options={availableEsters.map(e => ({
                            value: e,
                            label: esterName(t, e),
                        }))}
                    />
                </>
            )}
        </div>
    );

    /** A template's sub-line: the full dose when it fits one line, else
     *  the medicine and amount (the tile shows the route). */
    const templateSub = (tpl: DoseTemplate): string => {
        const full = describeDose(t, lang, tpl, { unitRate });
        return full.length <= 40 ? full : describeAmount(t, tpl, { unitRate });
    };

    const deleteButton = (label: string, onClick: () => void) => (
        <Button
            variant="icon"
            className="-my-2 -mr-2 text-[var(--c-danger)]"
            aria-label={t('log.delete_named').replace('{name}', label)}
            onClick={onClick}
        >
            <Delete size={22} />
        </Button>
    );

    /** A routine's title: medicine and amount ("Estradiol valerate 4 mg"),
     *  which fits one line. The route is in the tile; it joins the title only
     *  when two routines would otherwise read the same. */
    const regimenTitle = (regimen: Regimen): string => {
        const short = describeAmount(t, regimen.last, { unitRate });
        const clash = regimens.some(r => r !== regimen && describeAmount(t, r.last, { unitRate }) === short);
        return clash ? describeDose(t, lang, regimen.last, { unitRate }) : short;
    };

    const whatSection = showWhatList ? (
        <section className="flex flex-col gap-3">
            <div>
                <GroupHeader
                    trailing={hasSavedRows || isEditingList ? (
                        <Button variant="plain" onClick={() => setIsEditingList(v => !v)}>
                            {isEditingList ? t('log.done') : t('log.edit_list')}
                        </Button>
                    ) : undefined}
                >
                    {t('log.what')}
                </GroupHeader>
                <ListGroup
                    selection={isEditingList ? undefined : 'single'}
                    aria-label={t('log.what')}
                    checkIcon={checkIcon}
                    chevronIcon={chevronIcon}
                >
                    {/* The person's routines first: medicine and amount, then
                        one line of state (how often, when the next one is due). */}
                    {!isEditingList && regimens.map(regimen => {
                        const key = `reg:${regimen.key}` as const;
                        const due = isDue(regimen, nowMs);
                        const sub = regimenSub(t, lang, regimen, nowMs);
                        return (
                            <ListRow
                                key={key}
                                aria-label={joinList(lang, [describeDose(t, lang, regimen.last, { unitRate }), sub])}
                                title={oneLine(regimenTitle(regimen))}
                                sub={oneLine(
                                    <span className={due ? 'text-[var(--c-attention)]' : undefined}>{sub}</span>,
                                )}
                                leading={<RouteTile route={regimen.last.route} ester={regimen.last.ester} />}
                                selected={whatChoice === key}
                                onClick={() => {
                                    applyRegimen(regimen);
                                    setWhatChoice(key);
                                }}
                            />
                        );
                    })}
                    {listedTemplates.map(tpl => {
                        const key = `tpl:${tpl.id}` as const;
                        const common = {
                            title: oneLine(tpl.name),
                            sub: oneLine(templateSub(tpl)),
                            leading: <RouteTile route={tpl.route} ester={tpl.ester} />,
                        };
                        return isEditingList ? (
                            <ListRow
                                key={key}
                                {...common}
                                trailing={deleteButton(tpl.name, () => handleDeleteTemplate(tpl))}
                            />
                        ) : (
                            <ListRow
                                key={key}
                                {...common}
                                selected={whatChoice === key}
                                onClick={() => {
                                    applyTemplate(tpl);
                                    setWhatChoice(key);
                                }}
                            />
                        );
                    })}
                    {listedQuickDoses.map(dose => {
                        const key = `qd:${dose.id}` as const;
                        const shape = { route: dose.route, ester: dose.ester, doseMG: dose.value };
                        const label = describeDose(t, lang, shape);
                        const lastMs = lastLoggedMs(dose);
                        const common = {
                            title: oneLine(describeAmount(t, shape)),
                            sub: oneLine(joinList(lang, [
                                routeName(t, dose.route),
                                ...(lastMs !== null ? [t('log.last_logged').replace('{when}', formatRelative(lang, lastMs, nowMs))] : []),
                            ])),
                            leading: <RouteTile route={dose.route} ester={dose.ester} />,
                        };
                        return isEditingList ? (
                            <ListRow
                                key={key}
                                {...common}
                                trailing={onDeleteQuickDose ? deleteButton(label, () => handleDeleteQuickDose(dose)) : undefined}
                            />
                        ) : (
                            <ListRow
                                key={key}
                                {...common}
                                selected={whatChoice === key}
                                onClick={() => {
                                    applyQuickDose(dose);
                                    setWhatChoice(key);
                                }}
                            />
                        );
                    })}
                    {!isEditingList && (
                        <ListRow
                            title={t('log.something_else')}
                            leading={<RouteTile route={route} neutral><Plus size={20} /></RouteTile>}
                            drillIn
                            chevron={whatChoice === 'custom' ? <ChevronDown size={16} /> : chevronIcon}
                            aria-expanded={whatChoice === 'custom'}
                            onClick={() => setWhatChoice('custom')}
                        />
                    )}
                </ListGroup>
            </div>
            {showChoosers && choosers}
        </section>
    ) : (
        <section>
            <GroupHeader>{t('log.what')}</GroupHeader>
            {choosers}
        </section>
    );

    const whenSection = (
        <section>
            <ListGroup header={t('log.when')} selection="single" checkIcon={checkIcon} chevronIcon={chevronIcon}>
                <ListRow
                    title={t('log.now')}
                    value={formatTime(lang, now)}
                    selected={whenMode === 'now'}
                    onClick={() => {
                        setWhenMode('now');
                        setIsDatePickerOpen(false);
                    }}
                />
                <ListRow
                    title={t('log.earlier')}
                    value={whenMode === 'earlier'
                        ? (sameLocalDay(chosenDate.getTime(), nowMs) ? formatTime(lang, chosenDate) : describeWhen(t, lang, chosenDate))
                        : undefined}
                    drillIn
                    chevron={isDatePickerOpen ? <ChevronDown size={16} /> : chevronIcon}
                    aria-expanded={isDatePickerOpen}
                    onClick={() => {
                        if (whenMode === 'now') setDateStr(toLocalInput(new Date()));
                        setWhenMode('earlier');
                        setIsDatePickerOpen(v => whenMode === 'now' ? true : !v);
                    }}
                />
            </ListGroup>
            <DateTimePicker
                isOpen={isDatePickerOpen}
                inline
                onClose={() => setIsDatePickerOpen(false)}
                onConfirm={(date) => setDateStr(toLocalInput(date))}
                initialDate={dateStr ? new Date(dateStr) : new Date()}
                mode="datetime"
                title={t('log.when')}
            />
        </section>
    );

    const amountFields = (() => {
        const amountProps = {
            ester,
            rawDose,
            e2Dose,
            onRawChange: handleRawChange,
            onE2Change: handleE2Change,
            basis: amountBasis,
            onBasisChange: setAmountBasis,
        };
        switch (route) {
            case Route.injection:
                return <InjectionFields {...amountProps} />;
            case Route.oral:
                return <OralFields {...amountProps} />;
            case Route.sublingual:
                return (
                    <SublingualFields
                        {...amountProps}
                        slTier={slTier}
                        setSlTier={setSlTier}
                        useCustomTheta={useCustomTheta}
                        setUseCustomTheta={setUseCustomTheta}
                        customHoldInput={customHoldInput}
                        setCustomHoldInput={setCustomHoldInput}
                        customHoldValue={customHoldValue}
                        setCustomHoldValue={setCustomHoldValue}
                        thetaFromHold={thetaFromHold}
                    />
                );
            case Route.gel:
                return (
                    <GelFields
                        gelSite={gelSite}
                        setGelSite={setGelSite}
                        e2Dose={e2Dose}
                        onE2Change={handleE2Change}
                        bioMultiplier={bioMultiplier}
                    />
                );
            case Route.patchApply:
                return (
                    <PatchFields
                        patchMode={patchMode}
                        setPatchMode={setPatchMode}
                        patchRate={patchRate}
                        setPatchRate={setPatchRate}
                        rawDose={rawDose}
                        onRawChange={handleRawChange}
                        patchWearDays={patchWearDays}
                        setPatchWearDays={setPatchWearDays}
                    />
                );
            case Route.patchRemove:
                return <p className="callout m-0">{t('log.patch_remove_note')}</p>;
            default:
                return null;
        }
    })();

    // Dose guidance, folded into a one-row disclosure: the level stays
    // visible as the row's value, the details open underneath.
    const hasDoseGuide = route !== Route.patchRemove && Boolean(doseGuide || ester === Ester.CPA);
    const doseGuideRows = hasDoseGuide ? (
        <>
            <button
                type="button"
                className={`list-row ${doseGuide?.level ? 'list-row-has-value' : ''}`}
                aria-expanded={isDoseGuideOpen}
                onClick={() => setIsDoseGuideOpen(v => !v)}
            >
                <span className="list-row-text">
                    <span className="list-row-title">{t('dose.guide.title')}</span>
                </span>
                {doseGuide?.level && (
                    <span className={`list-row-value ${LEVEL_TEXT[doseGuide.level]}`}>
                        {t(`dose.guide.level.${doseGuide.level}`)}
                    </span>
                )}
                <span className="list-row-chevron" aria-hidden="true">
                    <ChevronDown size={16} className={`chev ${isDoseGuideOpen ? 'rotate-180' : ''}`} />
                </span>
            </button>
            {isDoseGuideOpen && (
                <>
                    <ListSep />
                    <div className="space-y-1 px-4 py-3 text-[0.9375rem] leading-[1.375rem] text-[var(--c-muted)]">
                        {ester === Ester.CPA ? (
                            (['rec', 'combo', 'ultralow'] as const).map(key => (
                                <p key={key} className="m-0">{t(`dose.guide.cpa_hint.${key}`)}</p>
                            ))
                        ) : doseGuide && (
                            <>
                                {!doseGuide.showRateHint && (
                                    <p className="m-0">
                                        {t('dose.guide.current')}: {doseGuide.value !== null ? `${formatGuideNumber(doseGuide.value)} ${guideUnitLabel}` : t('dose.guide.current_blank')}
                                    </p>
                                )}
                                {guideRangeText && (
                                    <p className="m-0">{t('dose.guide.reference')}: {guideRangeText}</p>
                                )}
                                {doseGuide.showRateHint && (
                                    <p className="m-0 text-[var(--c-attention)]">{t('dose.guide.patch_rate_hint')}</p>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}
        </>
    ) : null;

    // Injection guide from mtf.wiki, folded into a one-row disclosure.
    const injectionGuideRows = route === Route.injection && !isTransmasc ? (
        <>
            <button
                type="button"
                className="list-row"
                aria-expanded={isGuideOpen}
                onClick={() => setIsGuideOpen(v => !v)}
            >
                <span className="list-row-text">
                    <span className="list-row-title">{t('log.inj_guide')}</span>
                </span>
                <span className="list-row-chevron" aria-hidden="true">
                    <ChevronDown size={16} className={`chev ${isGuideOpen ? 'rotate-180' : ''}`} />
                </span>
            </button>
            {isGuideOpen && (
                <>
                    <ListSep />
                    <div className="space-y-3 px-4 py-3 text-sm leading-[1.375rem] text-[var(--c-muted)]">
                        <p className="m-0 font-semibold text-[var(--c-attention)]">{t('inj.guide.safety')}</p>
                        <div className="space-y-1">
                            <p className="m-0 font-semibold text-[var(--c-ink)]">{t('inj.guide.title')}</p>
                            <p className="m-0">{t('inj.guide.route_methods')}</p>
                            <p className="m-0 font-semibold text-[var(--c-danger)]">{t('inj.guide.route_warn')}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="m-0 font-semibold text-[var(--c-ink)]">{t('inj.guide.dosage_title')}</p>
                            <p className="m-0">{t('inj.guide.dosage_ev')}</p>
                            <p className="m-0">{t('inj.guide.dosage_ec')}</p>
                            <a
                                href="https://transfemscience.org/misc/injectable-e2-simulator/"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                    e.preventDefault();
                                    confirmAndOpenExternal('https://transfemscience.org/misc/injectable-e2-simulator/');
                                }}
                                className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-[var(--c-accent)] no-underline hover:text-[var(--c-accent-hover)]"
                            >
                                {t('inj.guide.sim_link')}
                                <External size={16} />
                            </a>
                        </div>
                        <div className="space-y-1.5">
                            <p className="m-0 font-semibold text-[var(--c-ink)]">{t('inj.guide.notes_title')}</p>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                <p
                                    key={n}
                                    className={`m-0 ${n === 3 ? 'font-semibold text-[var(--c-danger)]' : n === 4 ? 'font-semibold text-[var(--c-attention)]' : ''}`}
                                >
                                    {t(`inj.guide.note_${n}`)}
                                </p>
                            ))}
                        </div>
                        <a
                            href="https://mtf.wiki/zh-cn/docs/medicine/estrogen/injection"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                e.preventDefault();
                                confirmAndOpenExternal('https://mtf.wiki/zh-cn/docs/medicine/estrogen/injection');
                            }}
                            className="inline-flex min-h-11 items-center gap-1.5 text-[var(--c-muted)] no-underline hover:text-[var(--c-accent)]"
                        >
                            {t('inj.guide.source')}
                            <External size={16} />
                        </a>
                    </div>
                </>
            )}
        </>
    ) : null;

    // Both guides share one group.
    const guideGroup = doseGuideRows || injectionGuideRows ? (
        <div className="list-group">
            {doseGuideRows}
            {doseGuideRows && injectionGuideRows && <ListSep />}
            {injectionGuideRows}
        </div>
    ) : null;

    const canAddQuick = Boolean(quickDoses && onAddQuickDose) && route !== Route.patchRemove;
    const saveSection = (
        <ListGroup header={t('log.save_header')} chevronIcon={chevronIcon}>
            <ListRow
                title={t('log.save_template')}
                drillIn
                chevron={showSaveTemplateInput ? <ChevronDown size={16} /> : chevronIcon}
                aria-expanded={showSaveTemplateInput}
                onClick={() => setShowSaveTemplateInput(v => !v)}
            />
            {showSaveTemplateInput && (
                <div className="flex items-center gap-2 px-4 py-2">
                    <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAsTemplate(); }}
                        placeholder={t('template.name_placeholder')}
                        aria-label={t('template.name_placeholder')}
                        className="input-base min-w-0 flex-1"
                        autoFocus
                    />
                    <Button variant="secondary" compact onClick={handleSaveAsTemplate}>
                        {t('btn.save')}
                    </Button>
                </div>
            )}
            {canAddQuick && (
                <ListRow
                    title={quickExists
                        ? t('log.add_quick_done')
                        : <span className="text-[var(--c-accent)]">{t('log.add_quick')}</span>}
                    disabled={quickExists}
                    onClick={handleAddQuickDose}
                />
            )}
        </ListGroup>
    );

    // ── Footer ────────────────────────────────────────────────────────
    const saveButton = (
        <Button
            variant="primary"
            block={!isInline}
            compact={isInline}
            onClick={handleSave}
            disabled={isSaving}
        >
            <Check size={20} />
            <span>{saveLabel}</span>
        </Button>
    );

    const footer = isInline ? (
        <div className="flex shrink-0 flex-col gap-3 pt-2">
            <p className="m-0 text-sm leading-[1.375rem] text-[var(--c-ink)]" aria-live="polite">{sentence}</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
                {eventToEdit ? (
                    <Button variant="destructive" className="-ml-3" onClick={handleDeleteEvent}>
                        {t('log.delete_dose')}
                    </Button>
                ) : <span />}
                <div className="flex items-center gap-2">
                    {hideHeader && (
                        <Button variant="secondary" compact onClick={onCancel}>
                            {t('btn.cancel')}
                        </Button>
                    )}
                    {saveButton}
                </div>
            </div>
        </div>
    ) : (
        <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--c-hairline)] bg-[var(--c-paper)] px-4 pb-4 pt-3">
            <p className="m-0 text-sm leading-[1.375rem] text-[var(--c-ink)]" aria-live="polite">{sentence}</p>
            {saveButton}
            {eventToEdit && (
                <Button variant="destructive" className="-ml-3 self-start" onClick={handleDeleteEvent}>
                    {t('log.delete_dose')}
                </Button>
            )}
        </div>
    );

    return (
        <div className="flex h-full min-h-0 flex-col">
            {!isInline && !hideHeader && (
                <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3">
                    <h2 id={titleId} className="m-0 text-2xl font-bold text-[var(--c-ink)]">{title}</h2>
                    <Button variant="icon" aria-label={t('log.close')} onClick={onCancel}>
                        <Close size={22} />
                    </Button>
                </div>
            )}

            <div className={isInline
                ? 'flex flex-col gap-6 pb-4'
                : 'flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6 pt-1 [&>*]:shrink-0'}
            >
                {whatSection}
                {whenSection}
                {amountFields}
                {guideGroup}
                {doseAdvisory && route !== Route.patchRemove && (
                    <div className="px-4">
                        <DoseAdvisoryLine advisory={doseAdvisory} t={t} />
                    </div>
                )}
                {saveSection}
            </div>

            {footer}
        </div>
    );
};

export default DoseForm;
