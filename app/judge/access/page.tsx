"use client";

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JudgeAccessPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [initialCode, setInitialCode] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Verify Judge Access";
    try {
      const sp = new URLSearchParams(window.location.search);
      const ev = sp.get("eventSlug");
      const nx = sp.get("next");
      const ic = sp.get("code");
      setEventSlug(ev);
      setNextUrl(nx);
      setInitialCode(ic);
      if (ic) {
        setCode(ic);
        void verifyCode(undefined, ic);
      }
    } catch (e) {
      // ignore (not in browser)
    }
  }, []);

  async function verifyCode(e?: React.FormEvent, overrideCode?: string) {
    if (e) e.preventDefault();
    const codeToUse = (overrideCode ?? code).trim();
    if (!codeToUse) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/judge/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeToUse, eventSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Verification failed");

      // Normalize and persist judge identity
      const normalized = {
        id: data.judgeId,
        name: data.judgeName || 'Judge',
        role: data.role || 'judge',
      };
      localStorage.setItem("judgeInfo", JSON.stringify(normalized));
      // Also elevate role for current session if needed
      try { localStorage.setItem('user-role', 'judge'); } catch {}
      setStatus("success");
      setMessage(`Welcome ${normalized.name}. Access granted.`);

      // Redirect to event-specific judge console if known
      const target = nextUrl || (eventSlug ? `/e/${eventSlug}/judge` : "/judge");
      setTimeout(() => { router.push(target); }, 500);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Something went wrong");
    }
  }

  return (
    <main className="container" style={{ maxWidth: 520, margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Judge Access</h1>
      <p style={{ color: "#666", marginBottom: "1rem" }}>
        Enter your invite code to unlock the judge console on this device.
      </p>
      <form onSubmit={verifyCode} aria-label="Verify judge invite code">
        <label htmlFor="invite" style={{ display: "block", fontWeight: 600 }}>Invite Code</label>
        <input
          id="invite"
          name="invite"
          type="text"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. JUDGE-4F7X-92KQ"
          aria-describedby="invite-help"
          style={{ width: "100%", padding: "0.5rem", margin: "0.25rem 0 0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
        />
        <div id="invite-help" style={{ fontSize: 12, color: "#666", marginBottom: "0.75rem" }}>
          This links your identity to scores you submit.
        </div>
        <button
          type="submit"
          disabled={status === "loading" || code.trim().length === 0}
          style={{ padding: "0.5rem 0.75rem", borderRadius: 6 }}
        >
          {status === "loading" ? "Verifying…" : "Verify Access"}
        </button>
      </form>

      {status !== "idle" && (
        <div role="status" aria-live="polite" style={{ marginTop: "1rem", color: status === "error" ? "#b00020" : "#0a7" }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: "2rem", fontSize: 12, color: "#666" }}>
        Tip: After verification, open the <a href="/judge">Judge Console</a>.
      </div>
    </main>
  );
}
