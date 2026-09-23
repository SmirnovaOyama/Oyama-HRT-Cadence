import React, { useState, useEffect, useId } from 'react';
import DoseForm, { DoseTemplate, DoseFormPrefill } from './DoseForm';
import type { QuickDose } from './dose_form/QuickDoseButtons';
import { useEscape } from '../hooks/useEscape';
import { DoseEvent } from '../../logic';

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
}

/** The Log a dose sheet: paper background, 28px top corners and a grab bar
 *  on a phone, a centred panel from tablet width up. No shadow: the hairline
 *  edge and the scrim carry it. */
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
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const titleId = useId();

    useEffect(() => {
        if (isOpen) setIsVisible(true);
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        onClose();
    };

    useEscape(() => {
        if (!document.querySelector('.z-\\[70\\]')) {
            handleClose();
        }
    }, isOpen);

    const handleSave = (event: any) => {
        if (onSave) {
            onSave(event);
        }
        handleClose();
    };

    if (!isVisible && !isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-shell modal-shell-wide">
                <section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    className="flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-b-0 border-[var(--c-hairline)] bg-[var(--c-paper)] text-[var(--c-ink)] md:h-[min(85vh,880px)] md:rounded-[20px] md:border-b"
                >
                    <div className="flex h-5 shrink-0 items-center justify-center" aria-hidden="true">
                        <div className="h-1 w-9 rounded-sm bg-[var(--c-rule)] md:hidden" />
                    </div>
                    <DoseForm
                        eventToEdit={eventToEdit}
                        onSave={handleSave}
                        onDelete={onDelete}
                        onCancel={handleClose}
                        templates={templates}
                        onSaveTemplate={onSaveTemplate}
                        onDeleteTemplate={onDeleteTemplate}
                        quickDoses={quickDoses}
                        onAddQuickDose={onAddQuickDose}
                        onDeleteQuickDose={onDeleteQuickDose}
                        isInline={false}
                        events={events}
                        titleId={titleId}
                        prefill={eventToEdit ? null : prefill}
                    />
                </section>
            </div>
        </div>
    );
};

export default DoseFormModal;
