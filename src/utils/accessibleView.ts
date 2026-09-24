import type { ViewKey } from '../hooks/useAppNavigation';

const ACCOUNT_VIEWS = new Set<ViewKey>([
    'share', 'sessions', 'two-factor', 'change-password', 'delete-account',
    'edit-profile', 'edit-avatar', 'admin',
]);

/** Keep the main view usable when a session expires or its permissions change. */
export function accessibleView(view: ViewKey, session: { signedIn: boolean; isAdmin: boolean }): ViewKey {
    if (ACCOUNT_VIEWS.has(view) && !session.signedIn) return 'account';
    if (view === 'admin' && !session.isAdmin) return 'account';
    return view;
}
