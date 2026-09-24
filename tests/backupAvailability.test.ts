import { describe, expect, test } from 'bun:test';
import { at, dose, schedule, supply } from './fixtures';
import type { LabResult } from '../logic';
import type { DoseTemplate } from '../src/components/DoseForm';
import { hasBackupRecords } from '../src/utils/backupAvailability';

const event = dose(at(2026, 9, 24, 8));
const result: LabResult = { id: 'result-1', timeH: event.timeH, concValue: 100, unit: 'pg/ml' };
const template: DoseTemplate = {
    id: 'template-1', name: 'Test template', route: event.route, ester: event.ester,
    doseMG: event.doseMG, extras: {}, createdAt: at(2026, 9, 24),
};
const records = {
    events: [event], labResults: [result], doseTemplates: [template],
    schedules: [schedule()], supplies: [supply({ name: 'Test item' })],
};
const emptyBlock = () => ({ events: [], labResults: [], doseTemplates: [], schedules: [], supplies: [], deletions: {} });

/** Matches buildExportPayload: v2 mode blocks and the three v1-compatible lists. */
function payload(block: Record<string, unknown> = {}) {
    const active = { ...emptyBlock(), ...block };
    return {
        meta: { version: 2, exportedAt: '2026-09-24T00:00:00.000Z' },
        mode: 'transfem', weight: 60, pkParams: null,
        modes: { transfem: active, transmasc: emptyBlock() },
        events: active.events, labResults: active.labResults, doseTemplates: active.doseTemplates,
    };
}

describe('full backup availability', () => {
    for (const [kind, items] of Object.entries(records)) {
        test(`${kind} alone enables a complete backup`, () => {
            expect(hasBackupRecords(payload({ [kind]: items }))).toBe(true);
        });
    }

    test('records in the other mode still enable a complete backup', () => {
        const data = payload();
        data.modes.transmasc = { ...emptyBlock(), supplies: records.supplies };
        expect(hasBackupRecords(data)).toBe(true);
    });

    test('legacy flat backups and record arrays remain exportable', () => {
        expect(hasBackupRecords({ events: [event], labResults: [], doseTemplates: [] })).toBe(true);
        expect(hasBackupRecords({ events: [], labResults: [], doseTemplates: [template] })).toBe(true);
        expect(hasBackupRecords([event])).toBe(true);
    });

    test('empty modes and metadata alone do not claim to contain records', () => {
        expect(hasBackupRecords(payload())).toBe(false);
        expect(hasBackupRecords([])).toBe(false);
        expect(hasBackupRecords(null)).toBe(false);
        expect(hasBackupRecords({ modes: { transfem: null }, supplies: { length: 1 } })).toBe(false);
    });
});
