import React, { ReactNode } from 'react';
import { Attention, Sync } from './icons';
import { Button } from './ui/Button';
import { TRANSLATIONS } from '../i18n/translations';

/**
 * The crash screen uses English directly rather than depending on the
 * LanguageProvider or an old language preference in storage.
 *
 * This boundary wraps the whole app shell, so the render it is catching may be
 * the provider's own. Taking a dependency on a context that might be the thing
 * that just failed would mean the error screen can fail too, and the one screen
 * that has to survive anything would be the most fragile in the app.
 */
const tr = (key: string): string => {
    const english = TRANSLATIONS.en as Record<string, string>;
    return english[key] ?? key;
};

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div role="alert" className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
                    <Attention size={32} className="mb-4 text-[var(--c-danger)]" />
                    <h2 className="m-0 mb-2 text-xl font-semibold text-[var(--c-ink)]">
                        {tr('error.title')}
                    </h2>
                    <p className="m-0 mb-6 max-w-md text-base text-[var(--c-muted)]">
                        {tr('error.body')}
                    </p>
                    {this.state.error && (
                        <div className="mb-6 w-full max-w-md overflow-x-auto rounded-xl border border-[var(--c-hairline)] bg-[var(--c-plate)] p-4 text-left">
                            <code className="font-mono text-sm text-[var(--c-danger)]">
                                {this.state.error.toString()}
                            </code>
                        </div>
                    )}
                    <Button variant="primary" onClick={this.handleReload}>
                        <Sync size={20} />
                        {tr('error.reload')}
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
