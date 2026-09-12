import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { completeArtistrySynkClaim } from "@/lib/artistrysynk.functions";

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
  const navigate = useNavigate();
  const complete = useServerFn(completeArtistrySynkClaim);
  const [message, setMessage] = useState("Finishing your ArtistrySynk connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    // An authorization return carries code + state. A claim return may carry
    // neither: the opener then verifies the claimed identity server-side.
    const payload = {
      type: "artistrysynkOAuthResult" as const,
      code,
      state,
      error: error ?? null,
    };

    if (window.opener) {
      window.opener.postMessage(payload, window.location.origin);
      window.close();
      setMessage("You can close this window.");
      return;
    }

    if (error || !code || !state) {
      setMessage(
        "We couldn't complete your ArtistrySynk connection. Please try again from your dashboard.",
      );
      return;
    }

    // Full-page return: finish the connection here, then land on the profile.
    let active = true;
    void complete({ data: { code, state } })
      .then((result) => {
        if (!active) return;
        if (result.outcome === "CONNECTED") {
          toast.success("Your ArtistrySynk identity is connected.");
          void navigate({ to: "/dashboard/$section", params: { section: "profile" } });
          return;
        }
        setMessage("We couldn't complete your ArtistrySynk connection. Please try again.");
      })
      .catch(() => {
        if (active) {
          setMessage("We couldn't complete your ArtistrySynk connection. Please try again.");
        }
      });
    return () => {
      active = false;
    };
  }, [complete, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center p-8 text-center">
      <p className="text-muted-foreground">{message}</p>
    </main>
  );
}
