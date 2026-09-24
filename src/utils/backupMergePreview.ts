interface IdentifiedRecord { id: string }

export interface BackupMergeRecords {
    events: readonly IdentifiedRecord[];
    labResults: readonly IdentifiedRecord[];
    doseTemplates: readonly IdentifiedRecord[];
    schedules: readonly IdentifiedRecord[];
    supplies: readonly IdentifiedRecord[];
}

function difference(local: readonly IdentifiedRecord[], backup: readonly IdentifiedRecord[] = []) {
    const localIds = new Set(local.map(record => record.id));
    const backupIds = new Set(backup.map(record => record.id));
    return {
        added: backup.filter(record => !localIds.has(record.id)),
        localOnly: local.filter(record => !backupIds.has(record.id)),
    };
}

/** Preview the explicit, additive merge: existing IDs are kept on this device. */
export function computeBackupMergeDiff(local: BackupMergeRecords, backup: Partial<BackupMergeRecords>) {
    const events = difference(local.events, backup.events);
    const labs = difference(local.labResults, backup.labResults);
    const templates = difference(local.doseTemplates, backup.doseTemplates);
    const schedules = difference(local.schedules, backup.schedules);
    const supplies = difference(local.supplies, backup.supplies);
    const groups = [events, labs, templates, schedules, supplies];

    return {
        newEvents: events.added,
        newLabs: labs.added,
        newTemplates: templates.added,
        newSchedules: schedules.added,
        newSupplies: supplies.added,
        localOnlyEvents: events.localOnly,
        localOnlyLabs: labs.localOnly,
        localOnlyTemplates: templates.localOnly,
        localOnlySchedules: schedules.localOnly,
        localOnlySupplies: supplies.localOnly,
        total: groups.reduce((count, group) => count + group.added.length, 0),
        totalDiff: groups.reduce((count, group) => count + group.added.length + group.localOnly.length, 0),
    };
}
