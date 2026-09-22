"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { postMessage } from "@/lib/api";
import { getWebSocket } from "@/lib/websocket";
import QRCode from "@/components/QRCode";
import { API_URL } from "@/lib/config";

type FormState = "idle" | "submitting" | "success" | "error";

export default function SendPage() {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");
  const [liveEnabled, setLiveEnabled] = useState(true);

  // Fetch live state on mount
  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/api/live`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: any) => {
        if (data && typeof data.enabled === "boolean") {
          setLiveEnabled(data.enabled);
        }
      })
      .catch(() => {});

    // Also listen for live_state via WS
    const ws = getWebSocket();
    if (ws) {
      ws.connect();
      const unsub = ws.on("live_state", (data: unknown) => {
        const d = data as { enabled: boolean };
        setLiveEnabled(d.enabled);
      });
      return unsub;
    }
  }, []);

  const charCount = message.length;
  const isValid = name.trim().length > 0 && message.trim().length > 0 && charCount <= 240 && liveEnabled;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || state === "submitting") return;

    setState("submitting");
    setError("");

    const clientId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const payload = {
      name: name.trim(),
      department: department.trim() || undefined,
      message: message.trim(),
      clientId,
    };

    const res = await postMessage(payload);

    if (res.ok) {
      setState("success");
    } else if (res.status === 423) {
      setLiveEnabled(false);
      setError("Live wishes are paused right now. Please check back soon.");
      setState("error");
    } else {
      setError(res.error || "Something went wrong");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 chapter-paper">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--madder)" }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          </div>
          <h1
            className="font-display italic mb-4"
            style={{ fontSize: "1.75rem", color: "var(--ink)" }}
          >
            शुभकामनाएँ भेज दी गईं
          </h1>
          <p className="font-body mb-2" style={{ fontSize: "0.85rem", color: "var(--dhundh)" }}>
            Your wish has been sent!
          </p>
          <p className="font-body mb-8" style={{ fontSize: "0.75rem", color: "var(--dhundh)" }}>
            Thank you, {name}. Your message will appear on the stage display.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setName("");
                setDepartment("");
                setMessage("");
                setState("idle");
              }}
              className="px-6 py-3 rounded-lg font-body cursor-pointer transition-colors"
              style={{
                fontSize: "0.8rem",
                border: "1px solid var(--madder)",
                color: "var(--madder)",
                background: "transparent",
              }}
            >
              Send Another Wish
            </button>
            <Link
              href="/"
              className="px-6 py-3 font-body transition-colors"
              style={{ fontSize: "0.7rem", color: "var(--dhundh)" }}
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 chapter-paper">
      <div className="max-w-md w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1 font-body hover:opacity-70 transition-opacity mb-8"
          style={{ fontSize: "0.65rem", color: "var(--dhundh)", letterSpacing: "0.05em" }}
        >
          ← Back to Home
        </Link>

        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-full overflow-hidden mb-4 flex items-center justify-center"
            style={{ border: "1px solid rgba(31,26,23,0.1)" }}
          >
            <span className="font-display italic" style={{ fontSize: "1.5rem", color: "var(--madder)" }}>
              SC
            </span>
          </div>
          <h1
            className="font-display italic text-center"
            style={{ fontSize: "1.75rem", color: "var(--ink)" }}
          >
            शुभकामनाएँ भेजें
          </h1>
          <p className="font-body text-center mt-1" style={{ fontSize: "0.8rem", color: "var(--dhundh)" }}>
            Send your birthday wishes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!liveEnabled && (
            <div
              className="px-4 py-3 rounded-lg font-body"
              style={{
                fontSize: "0.8rem",
                color: "var(--ink-soft)",
                border: "1px solid var(--rule)",
                backgroundColor: "var(--paper-2)",
              }}
            >
              Live wishes are paused right now. Please check back soon.
            </div>
          )}
          <div>
            <label htmlFor="name" className="block font-body mb-1.5" style={{ fontSize: "0.65rem", color: "var(--dhundh)", letterSpacing: "0.05em" }}>
              Your Name *
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Kumar"
              className="w-full px-4 py-3 font-body rounded-lg outline-none transition-colors"
              style={{
                fontSize: "0.85rem",
                border: "1px solid rgba(31,26,23,0.12)",
                backgroundColor: "transparent",
                color: "var(--ink)",
              }}
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="department" className="block font-body mb-1.5" style={{ fontSize: "0.65rem", color: "var(--dhundh)", letterSpacing: "0.05em" }}>
              Department / Year <span style={{ opacity: 0.5 }}>(optional)</span>
            </label>
            <input
              id="department"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Mass Communication, 2020"
              className="w-full px-4 py-3 font-body rounded-lg outline-none transition-colors"
              style={{
                fontSize: "0.85rem",
                border: "1px solid rgba(31,26,23,0.12)",
                backgroundColor: "transparent",
                color: "var(--ink)",
              }}
            />
          </div>

          <div>
            <label htmlFor="message" className="block font-body mb-1.5" style={{ fontSize: "0.65rem", color: "var(--dhundh)", letterSpacing: "0.05em" }}>
              Your Message *
            </label>
            <textarea
              id="message"
              required
              rows={4}
              maxLength={240}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your wishes here..."
              className="w-full px-4 py-3 font-body rounded-lg outline-none resize-none transition-colors"
              style={{
                fontSize: "0.85rem",
                border: "1px solid rgba(31,26,23,0.12)",
                backgroundColor: "transparent",
                color: "var(--ink)",
              }}
            />
            <div className="flex justify-between mt-1">
              <span
                className="font-body"
                style={{
                  fontSize: "0.6rem",
                  color: charCount > 220 ? "var(--madder)" : "var(--dhundh)",
                }}
              >
                {charCount}/240
              </span>
            </div>
          </div>

          {error && (
            <p
              className="font-body px-4 py-2 rounded"
              style={{ fontSize: "0.75rem", color: "var(--madder)" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!isValid || state === "submitting"}
            className="w-full py-3.5 font-medium rounded-lg transition-all disabled:cursor-not-allowed cursor-pointer"
            style={{
              fontSize: "0.85rem",
              backgroundColor: isValid ? "var(--madder)" : "var(--paper-3)",
              color: isValid ? "var(--paper-1)" : "var(--ink-soft)",
              opacity: state === "submitting" ? 0.6 : 1,
            }}
          >
            {state === "submitting" ? "Sending..." : "Send Wish"}
          </button>
        </form>

        <div className="mt-8 flex justify-center">
          <QRCode />
        </div>
      </div>
    </div>
  );
}
