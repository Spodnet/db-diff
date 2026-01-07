import type { DiffStatus } from "../../lib/types";

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


