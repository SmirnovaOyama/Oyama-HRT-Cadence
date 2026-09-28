// Cadence icon library: the owner's own drawings, generated from
// design/cadence/icons/icons.json by `bun run icons` (see design/cadence/icons/grammar.md).
import type { IconComponent } from './Icon';

export { createIcon, ICON_STROKE_WIDTH } from './Icon';
export type { IconProps, IconComponent } from './Icon';

// Every Cadence icon in PascalCase (Today, InTarget, ChevronRight, ...), plus
// `cadenceIcons` (kebab-case name -> component) and `CadenceIconName`.
// Lucide names that match a Cadence name exactly (Check, Copy, Eye, EyeOff, Info,
// Lock, Plus, Minus, Search, Cloud, CloudOff, Shield, ChevronUp/Down/Left/Right)
// are covered by this export directly.
export * from './generated';

// Lucide-compatible names, so call sites can switch their import path from
// 'lucide-react' to this module first and be renamed later.
export {
    Timeline as Activity,
    Attention as AlertCircle,
    Attention as AlertTriangle,
    Back as ArrowLeft,
    Verified as BadgeCheck,
    InTarget as CheckCircle2,
    Clock as Clock3,
    Gel as Droplet,
    External as ExternalLink,
    Passkey as Fingerprint,
    Today as Home,
    Select as ListChecks,
    Timeline as ListTodo,
    Spinner as Loader2,
    Lock as LockKeyhole,
    Notice as Megaphone,
    Tablet as Pill,
    Sync as RefreshCw,
    Share as Share2,
    TwoStep as ShieldCheck,
    Patch as Sticker,
    Injection as Syringe,
    Delete as Trash,
    Delete as Trash2,
    You as UserCircle,
    Close as X,
} from './generated';

/** Lucide-compatible alias for the component type. */
export type LucideIcon = IconComponent;
