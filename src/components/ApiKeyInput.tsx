"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function ApiKeyInput({ value, onChange, placeholder = "API Key" }: ApiKeyInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-28 rounded-lg border border-border bg-bg-surface px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-secondary focus:border-info focus:outline-none sm:w-40"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
      >
        {visible ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
}
