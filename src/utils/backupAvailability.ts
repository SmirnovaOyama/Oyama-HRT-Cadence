const RECORD_KINDS = ['events', 'labResults', 'doseTemplates', 'schedules', 'supplies'] as const;

function hasRecordList(block: unknown): boolean {
    if (!block || typeof block !== 'object') return false;
    const records = block as Record<string, unknown>;
    return RECORD_KINDS.some(kind => Array.isArray(records[kind]) && records[kind].length > 0);
}

/** Full JSON backups include every record kind from both treatment modes. */
export function hasBackupRecords(payload: unknown): boolean {
    if (Array.isArray(payload)) return payload.length > 0;
    if (hasRecordList(payload)) return true;
    if (!payload || typeof payload !== 'object') return false;
    const modes = (payload as { modes?: unknown }).modes;
    if (!modes || typeof modes !== 'object') return false;
    const blocks = modes as Record<string, unknown>;
    return hasRecordList(blocks.transfem) || hasRecordList(blocks.transmasc);
}
