import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/**
 * ArtistrySynk authorization landing page. It runs in a popup and does nothing
 * but hand the one-time code and state back to the window that opened it, on
 * the same origin. No credential is ever handled here.
 */
export const Route = createFileRoute("/oauth/artistrysynk/return")({
  head: () => ({
    meta: [
      { title: "Finishing your ArtistrySynk connection — Zik's Got Talent" },
      {
        name: "description",
        content: "Completing the secure ArtistrySynk creative identity connection.",
      },
      { property: "og:title", content: "Finishing your ArtistrySynk connection" },
      { property: "og:description", content: "Completing your creative identity connection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ArtistrySynkReturn,
});

function ArtistrySynkReturn() {
  const [message, setMessage] = useState("Finishing your ArtistrySynk connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    const payload = {
      type: "artistrysynkOAuthResult" as const,
      code,
      state,
      error: error ?? (code && state ? null : "invalid_callback"),
    };

    if (window.opener) {
      window.opener.postMessage(payload, window.location.origin);
      window.close();
      setMessage("You can close this window.");
      return;
    }
    setMessage(
      payload.error
        ? "That connection attempt could not be completed. Please return to Zik's Got Talent and try again."
        : "Connection received. Please return to Zik's Got Talent.",
    );
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-8 text-center">
      <p className="text-muted-foreground">{message}</p>
    </main>
  );
}
