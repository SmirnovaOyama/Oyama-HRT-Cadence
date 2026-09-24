import { describe, expect, test } from 'bun:test';
import { at, dose, schedule, supply } from './fixtures';
import {
    RECORD_KINDS, ROUTINE_KINDS, emptySyncState, fingerprintState, hasContent, mergeSyncStates,
    normalizeSyncState, pruneTombstones, sanitizeTombstones,
} from '../src/utils/syncMerge';
import { sanitizeSchedule, sanitizeSchedules, sanitizeSupplies, sanitizeSupply } from '../src/utils/routineRecords';
import { buildSharedDosageSnapshot } from '../src/services/shareSnapshot';

/** A v2 payload shaped the way buildExportPayload writes it. */
function payload(transfem: Record<string, any>, extra: Record<string, any> = {}) {
    return {
        meta: { version: 2 },
        mode: 'transfem',
        modes: {
            transfem: { events: [], labResults: [], doseTemplates: [], deletions: {}, ...transfem },
            transmasc: { events: [], labResults: [], doseTemplates: [], deletions: {} },
        },
        ...extra,
    };
}

/** What an old client (the production tracker) pushes: no routine kinds at all. */
function stripRoutines(p: any) {
    const copy = JSON.parse(JSON.stringify(p));
    for (const m of ['transfem', 'transmasc']) {
        delete copy.modes[m].schedules;
        delete copy.modes[m].supplies;
        for (const k of ROUTINE_KINDS) delete copy.modes[m].deletions?.[k];
    }
    return copy;
}

const s1 = schedule({ id: 's1', updatedAt: 1000 });
const i1 = supply({ id: 'i1', updatedAt: 1000 });

describe('record kinds', () => {
    test('schedules and supplies are synced kinds', () => {
        expect(RECORD_KINDS).toContain('schedules');
        expect(RECORD_KINDS).toContain('supplies');
        const t = sanitizeTombstones({ schedules: { a: 5 }, supplies: { b: 6, bad: 'x' } });
        expect(t.schedules).toEqual({ a: 5 });
        expect(t.supplies).toEqual({ b: 6 });
        const pruned = pruneTombstones(t, 10);
        expect(pruned.schedules).toEqual({ a: 5 });
    });

    test('normalize reads the new kinds and treats a missing list as empty', () => {
        const withThem = normalizeSyncState(payload({ schedules: [s1], supplies: [i1] }));
        expect(withThem.modes.transfem.schedules).toHaveLength(1);
        expect(withThem.modes.transfem.supplies).toHaveLength(1);
        const without = normalizeSyncState(stripRoutines(payload({ schedules: [s1] })));
        expect(without.modes.transfem.schedules).toEqual([]);
        expect(without.modes.transfem.deletions.schedules).toEqual({});
    });

    test('routines alone count as content worth uploading', () => {
        expect(hasContent(normalizeSyncState(payload({ supplies: [i1] })))).toBe(true);
        expect(hasContent(emptySyncState())).toBe(false);
    });
});

describe('merge', () => {
    test('round trip: the other side gains the records, then both agree', () => {
        const a = normalizeSyncState(payload({ schedules: [s1], supplies: [i1] }));
        const b = normalizeSyncState(payload({}));
        const toB = mergeSyncStates(b, a);
        expect(toB.localChanged).toBe(true);
        expect(toB.stats.added).toBe(2);
        expect(toB.merged.modes.transfem.schedules[0].id).toBe('s1');
        expect(toB.merged.modes.transfem.supplies[0].id).toBe('i1');

        const back = mergeSyncStates(a, toB.merged);
        expect(back.localChanged).toBe(false);
        expect(back.remoteStale).toBe(false);
        expect(fingerprintState(back.merged)).toBe(fingerprintState(a));
    });

    test('conflict: the newer edit wins on both devices', () => {
        const older = schedule({ id: 's1', doseMG: 2, updatedAt: 1000 });
        const newer = schedule({ id: 's1', doseMG: 4, updatedAt: 2000 });
        const local = normalizeSyncState(payload({ schedules: [older] }));
        const remote = normalizeSyncState(payload({ schedules: [newer] }));
        const here = mergeSyncStates(local, remote);
        const there = mergeSyncStates(remote, local);
        expect(here.merged.modes.transfem.schedules[0].doseMG).toBe(4);
        expect(there.merged.modes.transfem.schedules[0].doseMG).toBe(4);
        expect(here.stats.updated).toBe(1);

        const supA = supply({ id: 'i1', amount: 10, updatedAt: 3000 });
        const supB = supply({ id: 'i1', amount: 4, updatedAt: 2000 });
        const r = mergeSyncStates(
            normalizeSyncState(payload({ supplies: [supB] })),
            normalizeSyncState(payload({ supplies: [supA] })),
        );
        expect(r.merged.modes.transfem.supplies[0].amount).toBe(10);
    });

    test('unstamped conflict resolves the same way on both sides', () => {
        const x = schedule({ id: 's1', doseMG: 2, updatedAt: undefined });
        const y = schedule({ id: 's1', doseMG: 3, updatedAt: undefined });
        const one = mergeSyncStates(normalizeSyncState(payload({ schedules: [x] })), normalizeSyncState(payload({ schedules: [y] })));
        const two = mergeSyncStates(normalizeSyncState(payload({ schedules: [y] })), normalizeSyncState(payload({ schedules: [x] })));
        expect(one.merged.modes.transfem.schedules[0].doseMG).toBe(two.merged.modes.transfem.schedules[0].doseMG);
    });

    test('a remote from an old client that lacks the fields keeps local', () => {
        const local = normalizeSyncState(payload({ schedules: [s1], supplies: [i1], events: [dose(at(2026, 9, 1))] }));
        const oldClient = normalizeSyncState(stripRoutines(payload({ events: [dose(at(2026, 9, 1))] })));
        const r = mergeSyncStates(local, oldClient);
        expect(r.merged.modes.transfem.schedules).toHaveLength(1);
        expect(r.merged.modes.transfem.supplies).toHaveLength(1);
        expect(r.stats.removed).toBe(0);
        expect(r.localChanged).toBe(false);
        // The cloud copy lost them, so this device puts them back.
        expect(r.remoteStale).toBe(true);
    });

    test('an empty local and a silent remote do not ping-pong', () => {
        const local = normalizeSyncState(payload({ events: [dose(at(2026, 9, 1))] }));
        const oldClient = normalizeSyncState(stripRoutines(payload({ events: [dose(at(2026, 9, 1))] })));
        const r = mergeSyncStates(local, oldClient);
        expect(r.remoteStale).toBe(false);
        expect(r.localChanged).toBe(false);
    });

    test('an explicit tombstone deletes on the other device', () => {
        const local = normalizeSyncState(payload({ schedules: [s1], supplies: [i1] }));
        const remote = normalizeSyncState(payload({ deletions: { schedules: { s1: 5000 }, supplies: { i1: 5000 } } }));
        const r = mergeSyncStates(local, remote);
        expect(r.merged.modes.transfem.schedules).toEqual([]);
        expect(r.merged.modes.transfem.supplies).toEqual([]);
        expect(r.stats.removed).toBe(2);
        expect(r.localChanged).toBe(true);
        expect(r.merged.modes.transfem.deletions.schedules).toEqual({ s1: 5000 });
    });

    test('a local tombstone survives a remote that still holds the record', () => {
        const local = normalizeSyncState(payload({ deletions: { schedules: { s1: 5000 } } }));
        const remote = normalizeSyncState(payload({ schedules: [s1] }));
        const r = mergeSyncStates(local, remote);
        expect(r.merged.modes.transfem.schedules).toEqual([]);
        expect(r.remoteStale).toBe(true);
    });

    test('kinds stay in their own mode', () => {
        const p = payload({});
        (p.modes.transmasc as any).supplies = [supply({ id: 'm1' })];
        const r = mergeSyncStates(normalizeSyncState(payload({})), normalizeSyncState(p));
        expect(r.merged.modes.transmasc.supplies).toHaveLength(1);
        expect(r.merged.modes.transfem.supplies).toHaveLength(0);
    });
});

describe('sanitisers', () => {
    test('keep only known fields', () => {
        const s = sanitizeSchedule({ ...s1, secret: 'x', remind: { enabled: true, leadMin: 15, repeatAfterMin: 30, junk: 1 } });
        expect(s).not.toBeNull();
        expect(Object.keys(s!).sort()).toEqual(
            ['active', 'cadence', 'createdAt', 'doseMG', 'ester', 'extras', 'id', 'remind', 'route', 'updatedAt'],
        );
        expect(s!.remind).toEqual({ enabled: true, leadMin: 15, repeatAfterMin: 30 });

        const i = sanitizeSupply({ ...i1, note: 'x', link: { ester: 'EV', route: 'injection', extra: 1 } });
        expect(i).not.toBeNull();
        expect('note' in i!).toBe(false);
        expect(i!.link).toEqual({ ester: 'EV' as any, route: 'injection' as any });
    });

    test('drop invalid records', () => {
        expect(sanitizeSchedule({ ...s1, route: 'nope' })).toBeNull();
        expect(sanitizeSchedule({ ...s1, cadence: { kind: 'daily', times: [] } })).toBeNull();
        expect(sanitizeSchedule({ ...s1, cadence: { kind: 'every', days: 0, time: 480, anchorDate: '2026-09-01' } })).toBeNull();
        expect(sanitizeSupply({ ...i1, amount: -1 })).toBeNull();
        expect(sanitizeSchedules('nope')).toEqual([]);
        expect(sanitizeSupplies([null, i1])).toHaveLength(1);
    });

    test('normalise cadence and link', () => {
        const s = sanitizeSchedule({ ...s1, cadence: { kind: 'daily', times: [1200, 480, 480, 5000] } });
        expect(s!.cadence).toEqual({ kind: 'daily', times: [480, 1200] });
        expect(sanitizeSupply({ ...i1, link: {} })!.link).toBeNull();
    });

    test('timestamps outside the Date range cannot reach calendar iteration', () => {
        const now = at(2026, 9, 24);
        const s = sanitizeSchedule({ ...s1, createdAt: 1e20, updatedAt: 1e20 }, now)!;
        expect(s.createdAt).toBe(now);
        expect(s.updatedAt).toBe(undefined);
        const item = sanitizeSupply({ ...i1, createdAt: 1e20, setAt: 1e20 }, now)!;
        expect(item.createdAt).toBe(now);
        expect(item.setAt).toBe(now);
    });
});

describe('share snapshot', () => {
    test('never carries schedules, supplies or local ids', () => {
        const ev = { ...dose(at(2026, 9, 1)), updatedAt: 1, schedules: [s1], supplies: [i1] } as any;
        const snap = buildSharedDosageSnapshot({
            mode: 'transfem' as any,
            events: [ev],
            simulation: null,
            calibrationFn: () => 1,
        });
        const text = JSON.stringify(snap);
        expect(text).not.toContain('schedules');
        expect(text).not.toContain('supplies');
        expect(text).not.toContain('cadence');
        expect(Object.keys(snap).sort()).toEqual(['createdAt', 'events', 'mode', 'simulation', 'timezone', 'version']);
        expect(Object.keys(snap.events[0]).sort()).toEqual(['doseMG', 'ester', 'extras', 'id', 'route', 'timeH']);
        expect(snap.events[0].id).not.toBe(ev.id);
    });
});
