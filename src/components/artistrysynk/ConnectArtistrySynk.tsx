import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, ExternalLink, Link2, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";
import type { ArtistrySynkConnection } from "@/integrations/artistrysynk/types";
import {
  completeArtistrySynkClaim,
  completeArtistrySynkConnection,
  disconnectArtistrySynk,
  finalizeArtistrySynkClaim,
  getArtistrySynkConnection,
  prepareArtistrySynkIdentity,
  startArtistrySynkConnection,
} from "@/lib/artistrysynk.functions";
import { cn } from "@/lib/utils";

type Phase =
  "IDLE" | "PREPARING" | "CLAIMING" | "AUTHORIZING" | "EXISTING" | "CANCELLED" | "FAILED";

interface ReturnPayload {
  code: string | null;
  state: string | null;
  error: string | null;
}

/** Same-origin, popup-scoped wait for whatever ArtistrySynk returns. */
function waitForReturn(popup: Window) {
  return new Promise<ReturnPayload>((resolve, reject) => {
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
      const data = event.data as Partial<ReturnPayload>;
      if (data.error) {
        reject(new Error(data.error === "access_denied" ? "CANCELLED" : "INVALID_CALLBACK"));
        return;
      }
      resolve({ code: data.code ?? null, state: data.state ?? null, error: null });
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

  async function connected(message: string) {
    setPhase("IDLE");
    await connection.refetch();
    toast.success(message);
  }

  /**
   * New creative identity: ArtistrySynk prepares it, the contestant claims it on
   * ArtistrySynk. No ArtistrySynk password is ever entered on ArtistrySynk Creatives Talent Hunt.
   */
  async function createIdentity() {
    setFailure(null);
    const popup = window.open("", "artistrysynk-claim", "width=600,height=760");
    if (!popup) {
      setPhase("FAILED");
      setFailure("Allow pop-ups for this site, then try again.");
      return;
    }
    setPhase("PREPARING");
    try {
      const prepared = await prepareArtistrySynkIdentity();
      if (prepared.outcome === "CONNECTED") {
        popup.close();
        await connected(`Connected to ${ARTISTRYSYNK.brand}`);
        return;
      }
      if (prepared.outcome === "FAILED") {
        popup.close();
        if (
          prepared.reason === "EXISTING_ACCOUNT" ||
          prepared.reason === "AUTHORIZATION_REQUIRED"
        ) {
          setPhase("EXISTING");
          return;
        }
        setPhase("FAILED");
        setFailure(prepared.message);
        return;
      }

      setPhase("CLAIMING");
      const waiting = waitForReturn(popup);
      popup.location.href = prepared.claimUrl;
      const returned = await waiting;

      // A claim return carries a single-use completion code: it is exchanged
      // server-side. Without one, verify the claimed identity directly.
      const result =
        returned.code && returned.state
          ? await completeArtistrySynkClaim({
              data: { code: returned.code, state: returned.state },
            })
          : await finalizeArtistrySynkClaim();

      if (result.outcome === "CONNECTED") {
        await connected(`Connected to ${ARTISTRYSYNK.brand}`);
        return;
      }
      if (result.outcome === "CLAIM_REQUIRED") {
        setPhase("FAILED");
        setFailure(`Finish claiming your ${ARTISTRYSYNK.brand} identity, then try again.`);
        return;
      }
      setPhase("FAILED");
      setFailure(result.message);
    } catch (error) {
      popup.close();
      const reason = error instanceof Error ? error.message : "FAILED";
      if (reason === "CANCELLED") {
        // The claim may still have succeeded before the window closed.
        const verified = await finalizeArtistrySynkClaim().catch(() => null);
        if (verified?.outcome === "CONNECTED") {
          await connected(`Connected to ${ARTISTRYSYNK.brand}`);
          return;
        }
        setPhase("CANCELLED");
        return;
      }
      setPhase("FAILED");
      setFailure(
        reason === "INVALID_CALLBACK"
          ? `The ${ARTISTRYSYNK.brand} response could not be verified. Please try again.`
          : `We couldn't reach ${ARTISTRYSYNK.brand}. Your entry is unaffected — try again later.`,
      );
    }
  }

  /** Existing ArtistrySynk account: their own sign-in and approval. */
  async function connectExisting() {
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
      const waiting = waitForReturn(popup);
      popup.location.href = started.authorizationUrl;
      const { code, state } = await waiting;
      if (!code || !state) {
        setPhase("FAILED");
        setFailure(`The ${ARTISTRYSYNK.brand} response was incomplete. Please try again.`);
        return;
      }

      const result = await completeArtistrySynkConnection({ data: { code, state } });
      if (result.outcome !== "CONNECTED") {
        setPhase("FAILED");
        setFailure(result.outcome === "FAILED" ? result.message : "Please try connecting again.");
        return;
      }
      await connected(`Connected to ${ARTISTRYSYNK.brand}`);
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

  const isConnected = data?.status === "CONNECTED";
  const revoked = data?.status === "REVOKED";
  const notConfigured = data?.status === "NOT_CONFIGURED";
  const busy =
    phase === "PREPARING" ||
    phase === "CLAIMING" ||
    phase === "AUTHORIZING" ||
    connection.isLoading;

  return (
    <div className={cn("rounded-xl border border-border bg-card/60 p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            {isConnected ? (
              <BadgeCheck className="size-5 text-success" />
            ) : (
              <Link2 className="size-5 text-primary" />
            )}
            {isConnected
              ? `${ARTISTRYSYNK.brand} creative identity`
              : `Create your ${ARTISTRYSYNK.brand} creative identity`}
          </h3>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            {isConnected
              ? ARTISTRYSYNK.promise
              : `We'll prepare your ${ARTISTRYSYNK.brand} identity and take you to ${ARTISTRYSYNK.brand} to claim it. You won't enter an ${ARTISTRYSYNK.brand} password on ArtistrySynk Creatives Talent Hunt.`}
          </p>
        </div>
        {isConnected && (
          <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-success">
            Connected
          </span>
        )}
      </div>

      {isConnected && data?.identity && (
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

      {phase === "CLAIMING" && (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Finish claiming your identity in the {ARTISTRYSYNK.brand} window, then come back here.
        </p>
      )}

      {phase === "EXISTING" && (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          An {ARTISTRYSYNK.brand} account already exists for this email. Use{" "}
          <strong>Connect existing {ARTISTRYSYNK.brand} account</strong> below to link it.
        </p>
      )}

      {phase === "CANCELLED" && (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Nothing was connected and your entry is safe — you can try again any time.
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
            onClick={createIdentity}
            disabled={!enabled || busy}
            className={cn(!isConnected && "bg-gold text-primary-foreground hover:opacity-90")}
            variant={isConnected ? "outline" : "default"}
          >
            {busy ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : isConnected || revoked ? (
              <RefreshCw className="mr-1 size-4" />
            ) : null}
            {isConnected
              ? `Reconnect ${ARTISTRYSYNK.brand}`
              : revoked || phase === "FAILED" || phase === "CANCELLED"
                ? "Try again"
                : `Create my ${ARTISTRYSYNK.brand} identity`}
          </Button>
        )}
        {!notConfigured && !isConnected && (
          <Button
            type="button"
            variant="outline"
            onClick={connectExisting}
            disabled={!enabled || busy}
          >
            {phase === "AUTHORIZING" ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            Connect existing {ARTISTRYSYNK.brand} account
          </Button>
        )}
        {isConnected && data?.profileUrl && (
          <Button asChild variant="outline">
            <a href={data.profileUrl} target="_blank" rel="noreferrer noopener">
              View profile <ExternalLink className="ml-1 size-3.5" />
            </a>
          </Button>
        )}
        {isConnected && (
          <Button type="button" variant="ghost" onClick={disconnect}>
            Disconnect
          </Button>
        )}
      </div>

      {!isConnected && !notConfigured && (
        <p className="mt-3 text-xs text-muted-foreground">
          Already have an {ARTISTRYSYNK.brand} account? Connect your existing creative identity
          instead. Connecting is optional — you can do it later from your dashboard.
        </p>
      )}

      {!enabled && (
        <p className="mt-3 text-xs text-muted-foreground">
          Create your ArtistrySynk Creatives Talent Hunt account first, then connect.
        </p>
      )}
    </div>
  );
}
