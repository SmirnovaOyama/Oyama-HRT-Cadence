import { useEffect } from 'react';
import { Check } from '../icons';
import './SaveFeedback.css';

export interface SaveFeedbackMessage {
    id: number;
    label: string;
    tone: 'dose' | 'planned' | 'test';
}

interface SaveFeedbackProps {
    message: SaveFeedbackMessage | null;
    enabled?: boolean;
    onDismiss: () => void;
}

/** A brief confirmation in the content flow. This describes a local record
 *  change only; the account's existing sync indicator owns cloud status. */
export function SaveFeedback({ message, enabled = true, onDismiss }: SaveFeedbackProps) {
    const visible = !!message && enabled;

    useEffect(() => {
        if (!visible) return;
        const timer = window.setTimeout(onDismiss, 4500);
        return () => window.clearTimeout(timer);
    }, [message?.id, visible, onDismiss]);

    return (
        <div className="save-feedback" data-visible={visible}>
            <div className="save-feedback-clip">
                <div className="save-feedback-spacing">
                    <div className="save-feedback-line" data-tone={message?.tone}>
                        {visible && (
                            <span key={message.id} className="save-feedback-check" aria-hidden="true">
                                <Check size={18} />
                            </span>
                        )}
                        <span role="status" aria-live="polite" aria-atomic="true">
                            {visible ? message.label : ''}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
