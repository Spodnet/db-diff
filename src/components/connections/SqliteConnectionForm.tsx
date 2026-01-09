import type { SQLiteConnection } from "../../lib/types";

interface SqliteConnectionFormProps {
    config: Partial<SQLiteConnection>;
    onChange: (config: Partial<SQLiteConnection>) => void;
}

export function SqliteConnectionForm({
    config,
    onChange,
}: SqliteConnectionFormProps) {
    return (
        <div>
            <label
                htmlFor="file-path"
                className="block text-sm font-medium text-text-secondary mb-1.5"
            >
                Database File Path
            </label>
            <input
                id="file-path"
                type="text"
                value={config.filePath ?? ""}
                onChange={(e) =>
                    onChange({ ...config, filePath: e.target.value })
                }
                placeholder="/path/to/database.sqlite"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
        </div>
    );
}
