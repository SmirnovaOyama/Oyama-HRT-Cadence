import { describe, expect, test } from 'bun:test';
import { computeBackupMergeDiff, type BackupMergeRecords } from '../src/utils/backupMergePreview';

const snapshot = (records: Partial<BackupMergeRecords> = {}): BackupMergeRecords => ({
    events: [], labResults: [], doseTemplates: [], schedules: [], supplies: [], ...records,
});

describe('cloud backup merge preview', () => {
    test('a backup containing only a new schedule enables its merge action', () => {
        const diff = computeBackupMergeDiff(snapshot(), snapshot({ schedules: [{ id: 'plan-1' }] }));
        expect(diff.newSchedules.map(record => record.id)).toEqual(['plan-1']);
        expect(diff.total).toBe(1);
        expect(diff.totalDiff).toBe(1);
    });

    test('a backup containing only a new supply enables its merge action', () => {
        const diff = computeBackupMergeDiff(snapshot(), snapshot({ supplies: [{ id: 'item-1' }] }));
        expect(diff.newSupplies.map(record => record.id)).toEqual(['item-1']);
        expect(diff.total).toBe(1);
        expect(diff.totalDiff).toBe(1);
    });

    test('counts all five kinds without treating existing records as additions', () => {
        const local = snapshot({
            schedules: [{ id: 'shared' }, { id: 'local-plan' }],
            supplies: [{ id: 'shared' }, { id: 'local-item' }],
        });
        const backup = snapshot({
            events: [{ id: 'record-1' }],
            labResults: [{ id: 'result-1' }],
            doseTemplates: [{ id: 'template-1' }],
            schedules: [{ id: 'shared' }, { id: 'new-plan' }],
            supplies: [{ id: 'shared' }, { id: 'new-item' }],
        });
        const before = JSON.stringify({ local, backup });
        const diff = computeBackupMergeDiff(local, backup);
        expect(diff.total).toBe(5);
        expect(diff.totalDiff).toBe(7);
        expect(diff.newSchedules.map(record => record.id)).toEqual(['new-plan']);
        expect(diff.newSupplies.map(record => record.id)).toEqual(['new-item']);
        expect(diff.localOnlySchedules.map(record => record.id)).toEqual(['local-plan']);
        expect(diff.localOnlySupplies.map(record => record.id)).toEqual(['local-item']);
        expect(JSON.stringify({ local, backup })).toBe(before);
    });

    test('the same ID in different record kinds does not suppress a new record', () => {
        const diff = computeBackupMergeDiff(
            snapshot({ schedules: [{ id: 'shared' }] }),
            snapshot({ schedules: [{ id: 'shared' }], supplies: [{ id: 'shared' }] }),
        );
        expect(diff.newSchedules).toHaveLength(0);
        expect(diff.newSupplies).toHaveLength(1);
        expect(diff.total).toBe(1);
    });

    test('legacy backups leave local routines alone and do not offer an empty merge', () => {
        const diff = computeBackupMergeDiff(
            snapshot({ schedules: [{ id: 'local-plan' }], supplies: [{ id: 'local-item' }] }),
            { events: [], labResults: [], doseTemplates: [] },
        );
        expect(diff.newSchedules).toHaveLength(0);
        expect(diff.newSupplies).toHaveLength(0);
        expect(diff.localOnlySchedules).toHaveLength(1);
        expect(diff.localOnlySupplies).toHaveLength(1);
        expect(diff.total).toBe(0);
        expect(diff.totalDiff).toBe(2);
    });

    test('identical routines have no differences', () => {
        const records = snapshot({ schedules: [{ id: 'plan-1' }], supplies: [{ id: 'item-1' }] });
        const diff = computeBackupMergeDiff(records, records);
        expect(diff.total).toBe(0);
        expect(diff.totalDiff).toBe(0);
    });
});
