"use client";

import { useState } from "react";
import { PUBLIC_URL } from "@/lib/config";

interface QRCodeProps {
  url?: string;
  className?: string;
}

export default function QRCode({ url, className = "" }: QRCodeProps) {
  const [expanded, setExpanded] = useState(false);
  const targetUrl = url || PUBLIC_URL || "";

  if (!targetUrl) return null;

  const encoded = encodeURIComponent(targetUrl);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}&bgcolor=F6F0E4&color=1F1A17&margin=8`;
  const thumbSrc = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encoded}&bgcolor=F6F0E4&color=1F1A17&margin=8`;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 font-body hover:opacity-70 transition-opacity cursor-pointer"
        style={{ fontSize: "0.65rem", color: "var(--dhundh)", letterSpacing: "0.04em" }}
        aria-expanded={expanded}
        aria-label="Toggle QR code"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="3" height="3" />
          <rect x="18" y="18" width="3" height="3" />
          <rect x="14" y="18" width="3" height="3" />
          <rect x="18" y="14" width="3" height="3" />
        </svg>
        <span>Scan to send your wishes</span>
      </button>

      {expanded && (
        <div className="mt-3 p-4 rounded-lg" style={{ border: "1px solid rgba(31,26,23,0.1)" }}>
          <img
            src={qrSrc}
            alt={`QR code linking to ${targetUrl}`}
            width={200}
            height={200}
            className="block"
          />
          <p className="mt-2 font-body text-center break-all" style={{ fontSize: "0.6rem", color: "var(--dhundh)" }}>
            {targetUrl}
          </p>
        </div>
      )}

      {!expanded && (
        <img
          src={thumbSrc}
          alt=""
          width={80}
          height={80}
          className="mt-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={() => setExpanded(true)}
        />
      )}
    </div>
  );
}
