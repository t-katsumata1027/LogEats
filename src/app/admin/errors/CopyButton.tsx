"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
    textToCopy: string;
}

export function CopyButton({ textToCopy }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-sage-50 text-sage-600 border border-sage-200 rounded-md shadow-sm transition-colors text-[10px] font-bold"
            title="コピーする"
        >
            {copied ? (
                <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-600">コピーしました</span>
                </>
            ) : (
                <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>コピー</span>
                </>
            )}
        </button>
    );
}
