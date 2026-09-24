// In-app reminders: which scheduled doses are due right now, a timer that wakes
// the app at the next reminder while it is open, and an optional system
// notification (Web Notification API, which also works in the Tauri desktop
// webview). Nothing here talks to a server: the phone calendar export covers
// the time the app is closed.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { DoseEvent } from '../../logic';
import type { Schedule } from '../types/routine';
import {
    DueItem,
    ReminderState,
    dueItems,
    occurrenceKeyTime,
    readReminderState,
    skipOccurrence,
    snoozeOccurrence,
    writeReminderState,
} from '../utils/reminders';
import { nextReminderWake, reminderTimerDelay } from '../utils/reminderClock';
import { doseText, medName } from '../components/today/format';
import { scheduleAsDose } from '../components/reminders/format';

const MS_MIN = 60_000;

// ── Per-device preferences ─────────────────────────────────────────────
// Both are conveniences of this device (notification permission is granted
// per browser), so they live in localStorage, wrapped in try/catch.

const NOTIFY_KEY = 'cadence-reminder-notify';
const NAMES_KEY = 'cadence-reminder-names';
const NOTIFIED_KEY = 'cadence-reminder-notified';
const PREFS_EVENT = 'cadence-reminder-prefs';

function readFlag(key: string): boolean {
    try {
        return localStorage.getItem(key) === '1';
    } catch {
        return false;
    }
}

function writeFlag(key: string, on: boolean) {
    try {
        localStorage.setItem(key, on ? '1' : '0');
    } catch {
        /* private mode: the choice lasts until reload */
    }
    window.dispatchEvent(new Event(PREFS_EVENT));
}

function subscribePrefs(cb: () => void) {
    window.addEventListener(PREFS_EVENT, cb);
    window.addEventListener('storage', cb);
    window.addEventListener('focus', cb);
    document.addEventListener('visibilitychange', cb);
    return () => {
        window.removeEventListener(PREFS_EVENT, cb);
        window.removeEventListener('storage', cb);
        window.removeEventListener('focus', cb);
        document.removeEventListener('visibilitychange', cb);
    };
}

export type NotifyPermission = NotificationPermission | 'unsupported';

export function notificationSupport(): NotifyPermission {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
}

export interface ReminderPrefs {
    /** System notifications switched on here (and permission granted). */
    notify: boolean;
    /** Medicine names in notifications and calendar events. Off by default. */
    showNames: boolean;
    permission: NotifyPermission;
    /** Turns system notifications on (asking for permission first) or off.
     *  Resolves to the resulting permission. */
    setNotify: (on: boolean) => Promise<NotifyPermission>;
    setShowNames: (on: boolean) => void;
}

/** Device preferences for reminders, shared by every component that reads them. */
export function useReminderPrefs(): ReminderPrefs {
    const notifyFlag = useSyncExternalStore(subscribePrefs, () => readFlag(NOTIFY_KEY), () => false);
    const showNames = useSyncExternalStore(subscribePrefs, () => readFlag(NAMES_KEY), () => false);
    // Permission belongs to the browser, so every consumer (including the
    // app-wide notification hook) must see a grant made on the settings page.
    const permission = useSyncExternalStore(subscribePrefs, notificationSupport, () => 'unsupported' as const);

    const setNotify = useCallback(async (on: boolean): Promise<NotifyPermission> => {
        if (!on) {
            writeFlag(NOTIFY_KEY, false);
            return notificationSupport();
        }
        let p = notificationSupport();
        if (p === 'default') {
            try {
                p = await Notification.requestPermission();
            } catch {
                p = notificationSupport();
            }
        }
        writeFlag(NOTIFY_KEY, p === 'granted');
        return p;
    }, []);

    const setShowNames = useCallback((on: boolean) => writeFlag(NAMES_KEY, on), []);

    return { notify: notifyFlag && permission === 'granted', showNames, permission, setNotify, setShowNames };
}

// ── Which notifications were already shown ─────────────────────────────
// key -> number of notifications shown for that occurrence (1, or 2 after a
// nudge), so a reload does not show the same one again.

type Notified = Record<string, number>;

function readNotified(nowMs: number): Notified {
    try {
        const raw = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}') as unknown;
        if (!raw || typeof raw !== 'object') return {};
        const out: Notified = {};
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
            if (typeof v === 'number' && nowMs - occurrenceKeyTime(k) < 14 * 24 * 60 * MS_MIN) out[k] = v;
        }
        return out;
    } catch {
        return {};
    }
}

function writeNotified(n: Notified) {
    try {
        localStorage.setItem(NOTIFIED_KEY, JSON.stringify(n));
    } catch {
        /* ignore */
    }
}

// ── The hook ───────────────────────────────────────────────────────────

export interface UseRemindersOptions {
    schedules: Schedule[];
    events: DoseEvent[];
    t: (key: string) => string;
}

export interface UseRemindersResult {
    /** Occurrences due now, oldest first. */
    due: DueItem[];
    snooze: (item: DueItem, minutes: number) => void;
    skip: (item: DueItem) => void;
}

export function useReminders({ schedules, events, t }: UseRemindersOptions): UseRemindersResult {
    const [clockTick, setNowMs] = useState(() => Date.now());
    const [state, setState] = useState<ReminderState>(() => readReminderState());
    const { notify, showNames } = useReminderPrefs();
    const notifiedRef = useRef<Notified | null>(null);
    if (notifiedRef.current === null) notifiedRef.current = readNotified(Date.now());

    // A new schedule or dose can arrive between timer ticks. Evaluate it using
    // the current clock immediately, including already-due reminders/nudges.
    const nowMs = useMemo(() => Date.now(), [schedules, events, state, clockTick]);
    const due = useMemo(() => dueItems(schedules, events, nowMs, state), [schedules, events, nowMs, state]);

    // Wake at the next reminder, and whenever the app comes back to the front.
    useEffect(() => {
        const wake = nextReminderWake(schedules, due, state, notifiedRef.current ?? {}, nowMs);
        const id = window.setTimeout(() => setNowMs(Date.now()), reminderTimerDelay(wake));
        return () => window.clearTimeout(id);
    }, [schedules, due, state, nowMs]);

    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === 'visible') {
                setNowMs(Date.now());
                setState(readReminderState());
                notifiedRef.current = readNotified(Date.now());
            }
        };
        document.addEventListener('visibilitychange', refresh);
        window.addEventListener('focus', refresh);
        window.addEventListener('storage', refresh);
        return () => {
            document.removeEventListener('visibilitychange', refresh);
            window.removeEventListener('focus', refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);

    // System notifications for newly due items and nudges.
    useEffect(() => {
        if (!notify || notificationSupport() !== 'granted') return;
        const notified = notifiedRef.current ?? {};
        let changed = false;
        for (const d of due) {
            const shown = notified[d.key] ?? 0;
            const r = d.schedule.remind.repeatAfterMin;
            const wantNudge = r != null && r > 0 && nowMs >= d.occurrenceMs + r * MS_MIN;
            const want = wantNudge ? 2 : 1;
            if (shown >= want) continue;
            const dose = `${medName(d.schedule.ester, t)} ${doseText(scheduleAsDose(d.schedule))}`;
            const body = showNames ? t('reminders.notify.body_named').replace('{dose}', dose) : t('reminders.notify.body');
            try {
                const n = new Notification(t('reminders.notify.title'), { body, tag: d.key });
                n.onclick = () => {
                    window.focus();
                    n.close();
                };
            } catch {
                /* some webviews only allow notifications from a service worker */
                continue;
            }
            notified[d.key] = want;
            changed = true;
        }
        if (changed) {
            notifiedRef.current = notified;
            writeNotified(notified);
        }
    }, [due, notify, showNames, nowMs, t]);

    const snooze = useCallback((item: DueItem, minutes: number) => {
        const now = Date.now();
        setState(prev => writeReminderState(snoozeOccurrence(prev, item.key, now + minutes * MS_MIN, now), now));
        // The snoozed reminder notifies again when it comes back.
        if (notifiedRef.current) {
            delete notifiedRef.current[item.key];
            writeNotified(notifiedRef.current);
        }
        setNowMs(now);
    }, []);

    const skip = useCallback((item: DueItem) => {
        const now = Date.now();
        setState(prev => writeReminderState(skipOccurrence(prev, item.key, now), now));
        setNowMs(now);
    }, []);

    return { due, snooze, skip };
}

export default useReminders;
