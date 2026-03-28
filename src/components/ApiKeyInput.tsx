"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ApiKeyInput({ value, onChange }: ApiKeyInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter FMP API Key"
          className="w-48 rounded border border-border bg-bg-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary focus:border-info focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <a
        href="https://site.financialmodelingprep.com/developer/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-info hover:underline whitespace-nowrap"
      >
        Get free key →
      </a>
    </div>
  );
}
