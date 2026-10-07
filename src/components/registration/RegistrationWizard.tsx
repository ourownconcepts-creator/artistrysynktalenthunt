import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ARTISTRYSYNK } from "@/config/brand";
import { supabase } from "@/integrations/supabase/client";
import type { GroupedCategories, LiveCompetition, RequirementRow } from "@/lib/live-data";
import { fetchRequirements, submitEntry } from "@/lib/live-data";
import { sendEntryEmails } from "@/lib/email.functions";
import { cn } from "@/lib/utils";

/**
 * Creates the entrant's account, or signs them into the existing one, so a
 * second identity is never created for the same person.
 */
async function ensureAccount(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: current } = await supabase.auth.getUser();
  if (current.user) return { ok: true };

  const signUp = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/dashboard` },
  });

  if (!signUp.error && signUp.data.session) return { ok: true };

  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signIn.error) return { ok: true };

  if (!signUp.error && !signUp.data.session) {
    return {
      ok: false,
      message: "Check your email to confirm your account, then come back and continue.",
    };
  }

  return {
    ok: false,
    message:
      signIn.error.message === "Invalid login credentials"
        ? "That email already has an account — use its password to continue."
        : signIn.error.message,
  };
}

const STEPS = [
  "Category",
  "Identity",
  "Personal",
  "Creative",
  "Submission",
  "Review",
  "Consent",
] as const;

const personalSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  phone: z.string().min(7, "Enter a reachable phone number"),
  location: z.string().min(2, "Where are you based?"),
  dateOfBirth: z.string().min(4, "Enter your date of birth"),
});

const identitySchema = z.object({
  email: z.string().email("Enter a valid email address"),
  displayName: z.string().min(2, "Enter your stage or creative name"),
  password: z.string().min(8, "Use at least 8 characters"),
});

const creativeSchema = z.object({
  bio: z.string().min(40, "Give judges at least 40 characters"),
  experience: z.string().min(2, "Tell us how long you've been doing this"),
});

interface FormState {
  categorySlug: string;
  email: string;
  password: string;
  displayName: string;
  fullName: string;
  phone: string;
  location: string;
  dateOfBirth: string;
  bio: string;
  experience: string;
  auditionNotes: string;
  answers: Record<string, string>;
  consents: Record<number, boolean>;
}

const EMPTY: FormState = {
  categorySlug: "",
  email: "",
  password: "",
  displayName: "",
  fullName: "",
  phone: "",
  location: "",
  dateOfBirth: "",
  bio: "",
  experience: "",
  auditionNotes: "",
  answers: {},
  consents: {},
};

function validateAnswers(
  requirements: RequirementRow[],
  answers: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const requirement of requirements) {
    const value = (answers[requirement.key] ?? "").trim();
    if (!value) {
      if (requirement.is_required) errors[requirement.key] = `${requirement.label} is required`;
      continue;
    }
    if (requirement.kind === "URL" || requirement.kind === "FILE_URL") {
      if (!/^https?:\/\/\S+$/i.test(value)) {
        errors[requirement.key] = "Paste a full link starting with https://";
      }
    }
    if (requirement.kind === "NUMBER" && !Number.isFinite(Number(value))) {
      errors[requirement.key] = "Enter a number";
    }
    if (requirement.kind === "IMAGE_URL_LIST") {
      const lines = value.split(/\n+/).filter(Boolean);
      if (lines.some((line) => !/^https?:\/\/\S+$/i.test(line.trim()))) {
        errors[requirement.key] = "Each line must be a full image link";
      }
    }
  }
  return errors;
}

export function RegistrationWizard({
  competition,
  groups,
  initialCategory,
}: {
  competition: LiveCompetition;
  groups: GroupedCategories[];
  initialCategory: string;
}) {
  const [step, setStep] = useState(initialCategory ? 1 : 0);
  const [form, setForm] = useState<FormState>({ ...EMPTY, categorySlug: initialCategory });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [accountReady, setAccountReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allCategories = useMemo(() => groups.flatMap((g) => g.categories), [groups]);
  const category = allCategories.find((c) => c.slug === form.categorySlug);
  const group = groups.find((g) => g.id === category?.group_id);

  /** Submission fields are configured per category, so they load per category. */
  const requirements = useQuery({
    queryKey: ["requirements", category?.id],
    queryFn: () => fetchRequirements(category!.id, true),
    enabled: Boolean(category?.id),
  });
  const requirementRows = requirements.data ?? [];

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyIssues(result: z.SafeParseReturnType<unknown, unknown>): boolean {
    if (result.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "form");
      next[key] = issue.message;
    }
    setErrors(next);
    return false;
  }

  async function next() {
    if (step === 0 && !form.categorySlug) {
      toast.error("Choose a talent category to continue");
      return;
    }

    if (step === 1) {
      if (!applyIssues(identitySchema.safeParse(form))) return;
      setBusy(true);
      try {
        const account = await ensureAccount(form.email, form.password);
        if (!account.ok) {
          toast.error(account.message);
          return;
        }
        setAccountReady(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "We couldn't set up your account.");
        return;
      } finally {
        setBusy(false);
      }
    }

    if (step === 2 && !applyIssues(personalSchema.safeParse(form))) return;
    if (step === 3 && !applyIssues(creativeSchema.safeParse(form))) return;
    if (step === 4) {
      const issues = validateAnswers(requirementRows, form.answers);
      if (Object.keys(issues).length > 0) {
        setErrors(issues);
        return;
      }
      setErrors({});
    }

    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  const allConsentsGiven = competition.consent_requirements.every((_, i) => form.consents[i]);

  /** The primary audition link stays populated for judges and moderators. */
  const primaryLink =
    form.answers["audition_url"] ??
    requirementRows
      .filter((r) => r.kind === "URL" || r.kind === "FILE_URL")
      .map((r) => form.answers[r.key])
      .find(Boolean) ??
    "";

  async function submit() {
    if (!allConsentsGiven) {
      toast.error("All consents are required before submitting");
      return;
    }
    setBusy(true);
    try {
      await submitEntry({
        competitionSlug: competition.slug,
        categorySlug: form.categorySlug,
        displayName: form.displayName,
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        location: form.location,
        dateOfBirth: form.dateOfBirth,
        bio: form.bio,
        experience: form.experience,
        auditionUrl: primaryLink,
        auditionNotes: form.auditionNotes,
        submissionAnswers: form.answers,
      });
      // Confirmation email + organiser alert. A mail failure must never lose an entry.
      try {
        await sendEntryEmails();
      } catch {
        /* the entry is saved; the email can be resent later */
      }
      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your entry could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="card-stage glow mx-auto max-w-2xl p-10 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="size-7" />
        </span>
        <h2 className="mt-6 text-3xl">Entry submitted</h2>
        <p className="mt-3 text-muted-foreground">
          Your {category?.name} entry for {competition.name} is saved and queued for review.
          {` Your permanent ${ARTISTRYSYNK.brand} talent profile is ready — add skills, photo and portfolio links from your dashboard.`}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild className="bg-gold text-primary-foreground hover:opacity-90">
            <Link to="/dashboard">Go to my dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/competitions/$slug" params={{ slug: competition.slug }}>
              Competition details
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <ol className="space-y-1">
          {STEPS.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => index < step && setStep(index)}
                disabled={index > step}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                  index === step && "bg-primary/15 text-primary",
                  index < step && "text-foreground hover:bg-muted",
                  index > step && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-xs",
                    index < step && "border-success/50 bg-success/15 text-success",
                    index === step && "border-primary/60 text-primary",
                    index > step && "border-border",
                  )}
                >
                  {index < step ? <Check className="size-3.5" /> : index + 1}
                </span>
                {label}
              </button>
            </li>
          ))}
        </ol>

        <div className="card-stage mt-6 p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <ShieldCheck className="size-4" /> One identity
          </p>
          <p className="mt-3 text-sm text-muted-foreground">{ARTISTRYSYNK.promise}</p>
        </div>
      </aside>

      <div className="card-stage p-6 sm:p-8">
        {step === 0 && (
          <StepBody
            title="Choose your talent category"
            hint="Pick the single category that best fits your entry. Admins configure these per competition."
          >
            <div className="space-y-7">
              {groups.map((g) => (
                <div key={g.id}>
                  <p className="eyebrow">{g.name}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {g.categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => set("categorySlug", c.slug)}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-colors",
                          form.categorySlug === c.slug
                            ? "border-primary/60 bg-primary/10"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <span className="block font-display text-lg">{c.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{c.blurb}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No categories are open for entries yet.
                </p>
              )}
            </div>
          </StepBody>
        )}

        {step === 1 && (
          <StepBody title="Create your account" hint={ARTISTRYSYNK.promise}>
            <Field label="Email address" error={errors["email"]}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Stage / creative name" error={errors["displayName"]}>
              <Input
                value={form.displayName}
                onChange={(e) => set("displayName", e.target.value)}
                placeholder="How you want to be known"
              />
            </Field>
            <Field label="Choose a password" error={errors["password"]}>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="At least 8 characters"
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Already entered before? Use the same email and password and we&rsquo;ll connect you to
              your existing account instead of creating a second one.
            </p>
          </StepBody>
        )}

        {step === 2 && (
          <StepBody
            title="Personal information"
            hint="Private. Only reviewers and you can see this."
          >
            <Field label="Full legal name" error={errors["fullName"]}>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
            </Field>
            <Field label="Phone number" error={errors["phone"]}>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="City / country" error={errors["location"]}>
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
            </Field>
            <Field label="Date of birth" error={errors["dateOfBirth"]}>
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
              />
            </Field>
          </StepBody>
        )}

        {step === 3 && (
          <StepBody
            title="Creative information"
            hint="This becomes your public contestant profile and your permanent ArtistrySynk talent profile."
          >
            <Field label="Short bio" error={errors["bio"]}>
              <Textarea
                rows={5}
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="Who you are, what you make, what you're chasing."
              />
            </Field>
            <Field label="Experience" error={errors["experience"]}>
              <Input
                value={form.experience}
                onChange={(e) => set("experience", e.target.value)}
                placeholder="e.g. 4 years performing live"
              />
            </Field>
          </StepBody>
        )}

        {step === 4 && (
          <StepBody
            title={`What ${category?.name ?? "this category"} needs`}
            hint={
              requirementRows.length
                ? "These fields are set by admins for your category."
                : (category?.audition_hint ?? "Submit the media required for your category.")
            }
          >
            {requirements.isLoading && (
              <p className="text-sm text-muted-foreground">Loading requirements…</p>
            )}
            {requirementRows.map((requirement) => (
              <RequirementField
                key={requirement.id}
                requirement={requirement}
                value={form.answers[requirement.key] ?? ""}
                error={errors[requirement.key]}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    answers: { ...prev.answers, [requirement.key]: value },
                  }))
                }
              />
            ))}
            <Field label="Notes for judges (optional)">
              <Textarea
                rows={4}
                value={form.auditionNotes}
                onChange={(e) => set("auditionNotes", e.target.value)}
              />
            </Field>
            <p className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
              Direct file upload arrives with secure private storage: raw audition media will be
              stored privately and released only to assigned judges and moderators.
            </p>
          </StepBody>
        )}

        {step === 5 && (
          <StepBody title="Review your application" hint="Check everything before you submit.">
            <dl className="divide-y divide-border/60 text-sm">
              <Row label="Competition" value={competition.name} />
              <Row label="Category" value={`${group?.name ?? ""} · ${category?.name ?? ""}`} />
              <Row label="Creative name" value={form.displayName} />
              <Row label="Email" value={form.email} />
              <Row label="Full name" value={form.fullName} />
              <Row label="Location" value={form.location} />
              <Row label="Experience" value={form.experience} />
              {requirementRows.map((requirement) => (
                <Row
                  key={requirement.id}
                  label={requirement.label}
                  value={form.answers[requirement.key] ?? ""}
                />
              ))}
            </dl>
          </StepBody>
        )}

        {step === 6 && (
          <StepBody title="Consent and submit" hint="All consents are required.">
            <ul className="space-y-3">
              {competition.consent_requirements.map((requirement, index) => (
                <li key={requirement} className="flex gap-3 rounded-lg border border-border p-4">
                  <Checkbox
                    id={`consent-${index}`}
                    checked={Boolean(form.consents[index])}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        consents: { ...prev.consents, [index]: checked === true },
                      }))
                    }
                  />
                  <Label htmlFor={`consent-${index}`} className="text-sm leading-relaxed">
                    {requirement}
                  </Label>
                </li>
              ))}
            </ul>
          </StepBody>
        )}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/60 pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}
          >
            <ArrowLeft className="mr-1 size-4" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={next}
              disabled={busy}
              className="bg-gold text-primary-foreground hover:opacity-90"
            >
              {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Continue <ArrowRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={submit}
              disabled={busy || !allConsentsGiven}
              className="bg-heat text-accent-foreground hover:opacity-90"
            >
              {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Submit application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Renders the input type an admin configured for this requirement. */
function RequirementField({
  requirement,
  value,
  error,
  onChange,
}: {
  requirement: RequirementRow;
  value: string;
  error?: string | undefined;
  onChange: (value: string) => void;
}) {
  const label = `${requirement.label}${requirement.is_required ? "" : " (optional)"}`;

  if (requirement.kind === "LONG_TEXT" || requirement.kind === "IMAGE_URL_LIST") {
    return (
      <Field label={label} error={error} hint={requirement.help_text}>
        <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
      </Field>
    );
  }

  const type =
    requirement.kind === "NUMBER" ? "number" : requirement.kind === "DATE" ? "date" : "text";

  return (
    <Field label={label} error={error} hint={requirement.help_text}>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          requirement.kind === "URL" || requirement.kind === "FILE_URL" ? "https://…" : undefined
        }
      />
    </Field>
  );
}

function StepBody({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl">{title}</h2>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {/* The label wraps the control so screen readers and keyboard users get
          a real association without hand-managed ids. */}
      <label className="block space-y-2">
        <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
        {children}
      </label>
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold break-all">{value || "—"}</dd>
    </div>
  );
}
