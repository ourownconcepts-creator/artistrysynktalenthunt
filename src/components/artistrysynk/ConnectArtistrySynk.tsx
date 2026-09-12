import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, ExternalLink, Link2, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";
import type { ArtistrySynkConnection } from "@/integrations/artistrysynk/types";
import {
  completeArtistrySynkConnection,
  disconnectArtistrySynk,
  getArtistrySynkConnection,
  provisionArtistrySynkIdentity,
  startArtistrySynkConnection,
} from "@/lib/artistrysynk.functions";
import { cn } from "@/lib/utils";

type Phase = "IDLE" | "CREATING" | "AUTHORIZING" | "NEEDS_SIGNIN" | "CANCELLED" | "FAILED";

/** Same-origin, popup-scoped wait for the authorization result. */
function waitForResult(popup: Window) {
  return new Promise<{ code: string; state: string }>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        (event.data as { type?: string } | null)?.type !== "artistrysynkOAuthResult"
      ) {
        return;
      }
      cleanup();
      const data = event.data as { code?: string; state?: string; error?: string | null };
      if (data.error || !data.code || !data.state) {
        reject(new Error(data.error === "access_denied" ? "CANCELLED" : "INVALID_CALLBACK"));
        return;
      }
      resolve({ code: data.code, state: data.state });
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("CANCELLED"));
    }, 500);
  });
}

export function ConnectArtistrySynk({
  enabled = true,
  onChange,
  className,
}: {
  /** Signed in? Connecting requires an account. */
  enabled?: boolean;
  onChange?: (connection: ArtistrySynkConnection | null) => void;
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [failure, setFailure] = useState<string | null>(null);
  const notified = useRef<string | null>(null);

  const connection = useQuery({
    queryKey: ["artistrysynk-connection", enabled],
    queryFn: () => getArtistrySynkConnection(),
    enabled,
    retry: false,
  });

  const data = connection.data ?? null;

  useEffect(() => {
    const key = data ? `${data.status}:${data.identity?.identityRef ?? ""}` : "none";
    if (notified.current === key) return;
    notified.current = key;
    onChange?.(data);
  }, [data, onChange]);

  /** Default path: no ArtistrySynk account needed, nothing to type. */
  async function connect() {
    setFailure(null);
    setPhase("CREATING");
    try {
      const result = await provisionArtistrySynkIdentity();
      if (result.outcome === "CONNECTED") {
        setPhase("IDLE");
        await connection.refetch();
        toast.success(`Connected to ${ARTISTRYSYNK.brand}`);
        return;
      }
      if (result.reason === "AUTHORIZATION_REQUIRED") {
        setPhase("NEEDS_SIGNIN");
        return;
      }
      setPhase("FAILED");
      setFailure(result.message);
    } catch {
      setPhase("FAILED");
      setFailure(`We couldn't reach ${ARTISTRYSYNK.brand}. Your entry is unaffected — try later.`);
    }
  }

  /** For someone who already has an ArtistrySynk account: their own approval. */
  async function connectWithSignIn() {
    setFailure(null);
    const popup = window.open("", "artistrysynk-oauth", "width=600,height=760");
    if (!popup) {
      setPhase("FAILED");
      setFailure("Allow pop-ups for this site, then try connecting again.");
      return;
    }
    setPhase("AUTHORIZING");
    try {
      const started = await startArtistrySynkConnection();
      if (!started.ok) {
        popup.close();
        setPhase("FAILED");
        setFailure(started.message);
        return;
      }
      const waiting = waitForResult(popup);
      popup.location.href = started.authorizationUrl;
      const { code, state } = await waiting;

      const result = await completeArtistrySynkConnection({ data: { code, state } });
      if (result.outcome !== "CONNECTED") {
        setPhase("FAILED");
        setFailure(result.message);
        return;
      }
      setPhase("IDLE");
      await connection.refetch();
      toast.success(`Connected to ${ARTISTRYSYNK.brand}`);
    } catch (error) {
      popup.close();
      const reason = error instanceof Error ? error.message : "FAILED";
      if (reason === "CANCELLED") {
        setPhase("CANCELLED");
        return;
      }
      setPhase("FAILED");
      setFailure(
        reason === "INVALID_CALLBACK"
          ? `The ${ARTISTRYSYNK.brand} response could not be verified. Please try again.`
          : `We couldn't reach ${ARTISTRYSYNK.brand}. Your entry is unaffected — you can connect later.`,
      );
    }
  }

  async function disconnect() {
    await disconnectArtistrySynk();
    await connection.refetch();
    toast.success(`Disconnected from ${ARTISTRYSYNK.brand}`);
  }

  const connected = data?.status === "CONNECTED";
  const revoked = data?.status === "REVOKED";
  const notConfigured = data?.status === "NOT_CONFIGURED";
  const busy = phase === "AUTHORIZING" || phase === "CREATING" || connection.isLoading;

  return (
    <div className={cn("rounded-xl border border-border bg-card/60 p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            {connected ? (
              <BadgeCheck className="size-5 text-success" />
            ) : (
              <Link2 className="size-5 text-primary" />
            )}
            {ARTISTRYSYNK.brand} creative identity
          </h3>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">{ARTISTRYSYNK.promise}</p>
        </div>
        {connected && (
          <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-success">
            Connected
          </span>
        )}
      </div>

      {connected && data?.identity && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
          {data.identity.avatarUrl ? (
            <img
              src={data.identity.avatarUrl}
              alt={`${data.identity.displayName ?? "Creative"} on ${ARTISTRYSYNK.brand}`}
              className="size-11 rounded-full object-cover"
            />
          ) : (
            <span className="size-11 rounded-full bg-muted" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {data.identity.displayName ?? data.identity.username ?? "Creative profile"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {data.identity.username ? `@${data.identity.username}` : "Verified identity"}
              {data.identity.location ? ` · ${data.identity.location}` : ""}
            </p>
          </div>
        </div>
      )}

      {revoked && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          Your {ARTISTRYSYNK.brand} connection was removed. Reconnect whenever you like — your
          competition entry is unaffected.
        </p>
      )}

      {notConfigured && (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          Connecting to {ARTISTRYSYNK.brand} is not available on this environment yet. You can still
          register and compete.
        </p>
      )}

      {phase === "NEEDS_SIGNIN" && (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          It looks like this email already belongs to an {ARTISTRYSYNK.brand} account. Sign in to
          that account once to approve the connection.
        </p>
      )}

      {phase === "CANCELLED" && (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Authorization was cancelled. Nothing was connected — you can try again any time.
        </p>
      )}

      {phase === "FAILED" && failure && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {failure}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {!notConfigured && (
          <Button
            type="button"
            onClick={connect}
            disabled={!enabled || busy}
            className={cn(!connected && "bg-gold text-primary-foreground hover:opacity-90")}
            variant={connected ? "outline" : "default"}
          >
            {busy ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : connected || revoked ? (
              <RefreshCw className="mr-1 size-4" />
            ) : null}
            {connected
              ? `Reconnect ${ARTISTRYSYNK.brand}`
              : revoked || phase === "FAILED" || phase === "CANCELLED"
                ? "Try again"
                : `Connect ${ARTISTRYSYNK.brand}`}
          </Button>
        )}
        {!notConfigured && !connected && (
          <Button type="button" variant="outline" onClick={connectWithSignIn} disabled={!enabled || busy}>
            {phase === "AUTHORIZING" ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            I already have an {ARTISTRYSYNK.brand} account
          </Button>
        )}
        {connected && data?.profileUrl && (
          <Button asChild variant="outline">
            <a href={data.profileUrl} target="_blank" rel="noreferrer noopener">
              View profile <ExternalLink className="ml-1 size-3.5" />
            </a>
          </Button>
        )}
        {connected && (
          <Button type="button" variant="ghost" onClick={disconnect}>
            Disconnect
          </Button>
        )}
      </div>

      {!enabled && (
        <p className="mt-3 text-xs text-muted-foreground">
          Create your Zik&rsquo;s Got Talent account first, then connect.
        </p>
      )}
    </div>
  );
}
