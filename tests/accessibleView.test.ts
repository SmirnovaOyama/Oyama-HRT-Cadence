import { describe, expect, test } from 'bun:test';
import type { ViewKey } from '../src/hooks/useAppNavigation';
import { accessibleView } from '../src/utils/accessibleView';

const signedOut = { signedIn: false, isAdmin: false };
const signedIn = { signedIn: true, isAdmin: false };

describe('navigation after session changes', () => {
    const protectedViews: ViewKey[] = [
        'share', 'sessions', 'two-factor', 'change-password', 'delete-account',
        'edit-profile', 'edit-avatar', 'admin',
    ];
    for (const view of protectedViews) {
        test(`${view} returns to account when its session expires`, () => {
            expect(accessibleView(view, signedOut)).toBe('account');
        });
    }

    test('local tracker pages remain usable without signing in', () => {
        const localViews: ViewKey[] = [
            'home', 'history', 'lab', 'reminders', 'supplies', 'settings', 'account',
            'settings-export', 'settings-import', 'settings-weight', 'pk-params', 'lab-calibration',
        ];
        for (const view of localViews) expect(accessibleView(view, signedOut)).toBe(view);
    });

    test('valid sessions keep their account pages and sharing destination', () => {
        for (const view of protectedViews.filter(view => view !== 'admin')) {
            expect(accessibleView(view, signedIn)).toBe(view);
        }
    });

    test('the admin destination also requires current admin permission', () => {
        expect(accessibleView('admin', signedIn)).toBe('account');
        expect(accessibleView('admin', { signedIn: true, isAdmin: true })).toBe('admin');
        expect(accessibleView('admin', { signedIn: false, isAdmin: true })).toBe('account');
    });
});
