"use client";

import { useEffect, useRef } from "react";

export function PageViewTracker() {
    const tracked = useRef(false);

    useEffect(() => {
        if (!tracked.current) {
            tracked.current = true;
            fetch("/api/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_type: "page_view", path: "/" }),
            }).catch(err => console.error("Tracking error:", err));
        }
    }, []);

    return null;
}
