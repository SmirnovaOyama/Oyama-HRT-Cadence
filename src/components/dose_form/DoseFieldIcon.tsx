import type { ReactNode } from 'react';
import type { IconComponent } from '../icons';
import './DoseForm.css';

type Tone = 'blue' | 'violet' | 'teal' | 'amber';

/** Small semantic tiles for dose-entry rows; labels always carry the meaning. */
export function DoseFieldIcon({ icon: Icon, tone = 'blue' }: { icon: IconComponent; tone?: Tone }) {
    return <span aria-hidden="true" className="dose-field-icon" data-tone={tone}><Icon size={20} /></span>;
}

export function DoseFieldLabel({ icon: Icon, children }: { icon: IconComponent; children: ReactNode }) {
    return <span className="dose-field-label"><Icon size={18} aria-hidden="true" />{children}</span>;
}
