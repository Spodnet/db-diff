import { Minus, Plus, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import type { DiffStatus } from "../../lib/types";

export const getStatusIcon = (status: DiffStatus): ReactNode => {
    switch (status) {
        case "added":
            return <Plus className="w-3 h-3" />;
        case "deleted":
            return <Minus className="w-3 h-3" />;
        case "modified":
            return <RefreshCw className="w-3 h-3" />;
        default:
            return null;
    }
};

export const getStatusBgClass = (status: DiffStatus): string => {
    switch (status) {
        case "added":
            return "bg-added-bg";
        case "deleted":
            return "bg-deleted-bg";
        case "modified":
            return "bg-modified-bg";
        default:
            return "";
    }
};
