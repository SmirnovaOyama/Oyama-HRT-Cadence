import React from 'react';
import DoseForm, { DoseTemplate, DoseFormPrefill } from './DoseForm';
import type { QuickDose } from './dose_form/QuickDoseButtons';
import { useTranslation } from '../contexts/LanguageContext';
import { SecondaryPage } from './ui/SecondaryPage';
import { DoseEvent } from '../../logic';
import type { Schedule } from '../types/routine';

export type { DoseTemplate, QuickDose };

interface DoseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventToEdit?: any;
    onSave?: any;
    onDelete?: any;
    templates?: DoseTemplate[];
    onSaveTemplate?: any;
    onDeleteTemplate?: any;
    quickDoses?: QuickDose[];
    onAddQuickDose?: (dose: QuickDose) => void;
    onDeleteQuickDose?: (id: string) => void;
    events?: DoseEvent[];
    /** Opens a new dose on this medicine and amount. */
    prefill?: DoseFormPrefill | null;
    /** Explicit schedules, listed first in the "What" list. */
    schedules?: Schedule[];
}

/** Dose editor presented as a child page in the main content column. */
const DoseFormModal: React.FC<DoseFormModalProps> = ({
    isOpen,
    onClose,
    eventToEdit,
    onSave,
    onDelete,
    templates = [],
    onSaveTemplate,
    onDeleteTemplate,
    quickDoses = [],
    onAddQuickDose,
    onDeleteQuickDose,
    events = [],
    prefill = null,
    schedules = [],
}) => {
    const { t } = useTranslation();
    if (!isOpen) return null;
    const handleSave = (event: DoseEvent) => {
        onSave?.(event);
        onClose();
    };
    return (
        <SecondaryPage title={t(eventToEdit ? 'log.edit_title' : 'log.title')} onBack={onClose}>
                    <DoseForm
                        eventToEdit={eventToEdit}
                        onSave={handleSave}
                        onDelete={onDelete}
                        onCancel={onClose}
                        templates={templates}
                        onSaveTemplate={onSaveTemplate}
                        onDeleteTemplate={onDeleteTemplate}
                        quickDoses={quickDoses}
                        onAddQuickDose={onAddQuickDose}
                        onDeleteQuickDose={onDeleteQuickDose}
                        isInline
                        hideHeader
                        events={events}
                        prefill={eventToEdit ? null : prefill}
                        schedules={schedules}
                    />
        </SecondaryPage>
    );
};

export default DoseFormModal;
