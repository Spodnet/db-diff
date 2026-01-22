import { type RefObject, useEffect } from "react";

/**
 * Hook to detect clicks outside a specific element.
 * @param ref Ref object to the element to watch
 * @param handler Callback to fire when a click outside occurs
 * @param enabled Whether the listener should be active
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
    ref: RefObject<T | null>,
    handler: (event: MouseEvent | TouchEvent) => void,
    enabled = true,
) {
    useEffect(() => {
        if (!enabled) return;

        const listener = (event: MouseEvent | TouchEvent) => {
            const el = ref.current;
            // Do nothing if clicking ref's element or descendent elements
            if (!el || el.contains(event.target as Node)) {
                return;
            }
            handler(event);
        };

        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);

        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler, enabled]);
}
