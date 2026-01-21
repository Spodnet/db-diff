import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode; // Optional custom fallback
    onReset?: () => void; // Optional callback to reset state
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public override state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    public override render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-surface">
                    <div className="bg-error/10 p-4 rounded-full mb-4">
                        <AlertTriangle className="w-12 h-12 text-error" />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary mb-2">
                        Something went wrong
                    </h2>
                    <p className="text-text-secondary mb-6 max-w-md">
                        {this.state.error?.message || "An unexpected error occurred."}
                    </p>
                    <button
                        type="button"
                        onClick={this.handleReset}
                        className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </button>
                    {import.meta.env.DEV && (
                        <pre className="mt-8 p-4 bg-black/30 text-white rounded text-xs text-left overflow-auto max-w-2xl max-h-48 border border-white/10">
                            {this.state.error?.stack}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
