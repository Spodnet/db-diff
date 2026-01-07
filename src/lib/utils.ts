export function formatCellValue(value: unknown): string {
    if (value === null) return "NULL";
    if (value === undefined) return "";

    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";

    // Handle Date objects
    if (value instanceof Date) {
        return value.toISOString().slice(0, 19).replace("T", " ");
    }

    if (typeof value === "string") {
        // Handle ISO date strings
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            try {
                const date = new Date(value);
                if (!Number.isNaN(date.getTime())) {
                    return date.toISOString().slice(0, 19).replace("T", " ");
                }
            } catch (_e) {
                // Fall through to default string display
            }
        }
        return value;
    }

    // Handle objects (e.g., JSON columns)
    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch (_e) {
            return String(value);
        }
    }

    return String(value);
}
