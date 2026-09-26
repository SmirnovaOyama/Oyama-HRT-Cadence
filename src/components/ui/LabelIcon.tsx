import type { IconComponent } from '../icons';

export type IconTone = 'blue' | 'purple' | 'pink' | 'teal' | 'green' | 'orange' | 'muted';

/** Decorative companion to a visible label; color never carries meaning alone. */
export function LabelIcon({ icon: Icon, tone = 'muted', size = 20 }: {
    icon: IconComponent;
    tone?: IconTone;
    size?: number;
}) {
    return <span className="label-icon" data-tone={tone} aria-hidden="true"><Icon size={size} /></span>;
}
