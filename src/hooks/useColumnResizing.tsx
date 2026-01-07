import { useEffect, useRef, useState } from "react";

interface ResizeState {
    column: string;
    startX: number;
    startWidth: number;
}

export function useColumnResizing(dataAttribute = "data-col") {
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
        {},
    );
    const resizingRef = useRef<ResizeState | null>(null);

    // Initial listener setup
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingRef.current) return;
            const { column, startX, startWidth } = resizingRef.current;
            const diff = e.pageX - startX;
            const newWidth = Math.max(50, startWidth + diff);
            setColumnWidths((prev) => ({ ...prev, [column]: newWidth }));
        };

        const handleMouseUp = () => {
            if (resizingRef.current) {
                resizingRef.current = null;
                document.body.style.cursor = "";
            }
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    const startResizing = (
        e: React.MouseEvent,
        column: string,
        width: number,
    ) => {
        e.preventDefault();
        resizingRef.current = { column, startX: e.pageX, startWidth: width };
        document.body.style.cursor = "col-resize";
    };

    const handleAutoResize = (e: React.MouseEvent, column: string) => {
        e.preventDefault();
        e.stopPropagation();

        // Find all cells for this column
        const cells = document.querySelectorAll(
            `[${dataAttribute}="${column}"]`,
        );
        if (cells.length === 0) return;

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return;

        // Get font from first cell for accuracy
        const font = window.getComputedStyle(cells[0]).font;
        context.font = font || "14px ui-sans-serif";

        // Measure header width first (approximate with column name)
        let maxWidth = context.measureText(column).width + 32; // Header buffer

        // Measure all cell contents
        for (const cell of cells) {
            const text = cell.textContent || "";
            const width = context.measureText(text).width;
            maxWidth = Math.max(maxWidth, width + 24); // Content padding
        }

        // Cap between 60px and 600px
        const newWidth = Math.max(60, Math.min(600, maxWidth));
        setColumnWidths((prev) => ({ ...prev, [column]: newWidth }));
    };

    return {
        columnWidths,
        setColumnWidths,
        startResizing,
        handleAutoResize,
    };
}
