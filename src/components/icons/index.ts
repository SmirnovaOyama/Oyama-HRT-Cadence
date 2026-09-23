// Cadence icon library. Icons are generated from design/cadence/icons/icons.json by
// `bun run icons`; see design/cadence/icons/grammar.md for the drawing rules.
import type { IconComponent } from './Icon';

export { createIcon, opticalStrokeWidth } from './Icon';
export type { IconProps, IconComponent } from './Icon';

// Every Cadence icon in PascalCase (Today, InTarget, ChevronRight, ...), plus
// `cadenceIcons` (kebab-case name -> component) and `CadenceIconName`.
// Lucide names that match a Cadence name exactly (Check, Copy, Eye, EyeOff, Info,
// Lock, Plus, Minus, Server, Search, Settings, Save, Cloud, CloudOff, Users, Shield,
// ShieldOff, ImageOff, HardDrive, Database, Merge, Gauge, Radar, Wind, Orbit, Shell,
// Rewind, ChevronUp/Down/Left/Right) are covered by this export directly.
export * from './generated';

// Lucide-compatible names, so call sites can switch their import path from
// 'lucide-react' to this module first and be renamed later.
export {
    Timeline as Activity,
    Attention as AlertCircle,
    Attention as AlertTriangle,
    Back as ArrowLeft,
    Molecule as Atom,
    Verified as BadgeCheck,
    Template as Bookmark,
    TemplateAdd as BookmarkPlus,
    Calendar as CalendarDays,
    InTarget as CheckCircle2,
    Off as CircleOff,
    Clock as Clock3,
    Helix as Dna,
    Export as Download,
    CloudDownload as DownloadCloud,
    Gel as Droplet,
    Edit as Edit2,
    External as ExternalLink,
    Forward as FastForward,
    Passkey as Fingerprint,
    Flask as FlaskConical,
    Language as Globe,
    Ring as Hexagon,
    Today as Home,
    ImageAdd as ImagePlus,
    Key as KeyRound,
    Link as Link2,
    Select as ListChecks,
    Timeline as ListTodo,
    Spinner as Loader2,
    Lock as LockKeyhole,
    SignOut as LogOut,
    Notice as Megaphone,
    Desktop as Monitor,
    Devices as MonitorSmartphone,
    Edit as PenLine,
    Tablet as Pill,
    Sync as RefreshCw,
    Reset as RotateCcw,
    Sliders as Settings2,
    Share as Share2,
    TwoStep as ShieldCheck,
    Phone as Smartphone,
    Patch as Sticker,
    Injection as Syringe,
    Delete as Trash,
    Delete as Trash2,
    Import as Upload,
    CloudUpload as UploadCloud,
    You as UserCircle,
    Close as X,
} from './generated';

/** Lucide-compatible alias for the component type. */
export type LucideIcon = IconComponent;
