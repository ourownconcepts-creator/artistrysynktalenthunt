import { Link } from "@tanstack/react-router";

import { Wordmark } from "@/components/brand/Wordmark";
import { SponsorStrip } from "@/components/site/SponsorStrip";
import { ARTISTRYSYNK } from "@/integrations/artistrysynk";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-surface/60">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <SponsorStrip placement="FOOTER" className="pb-12" />

        <div className="grid gap-10 border-t border-border/60 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              An ArtistrySynk talent hunt organized by ArtistrySynk in
              collaboration with the ArtistrySynk.
            </p>
          </div>

          <FooterColumn
            title="Competition"
            links={[
              { to: "/competitions", label: "Competitions" },
              { to: "/categories", label: "Categories" },
              { to: "/register", label: "Enter now" },
              { to: "/rules", label: "Rules & eligibility" },
            ]}
          />
          <FooterColumn
            title="Explore"
            links={[
              { to: "/how-it-works", label: "How It Works" },
              { to: "/contestants", label: "Contestants" },
              { to: "/announcements", label: "Announcements" },
              { to: "/sponsors", label: "Sponsors" },
              { to: "/about", label: "About" },
            ]}
          />
          <div>
            <p className="eyebrow">From talent to opportunity</p>
            <p className="mt-4 text-sm text-muted-foreground">
              {ARTISTRYSYNK.ecosystem} Connect with the wider creative community beyond the
              competition.
            </p>
            <a
              href={ARTISTRYSYNK.site}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
            >
              {ARTISTRYSYNK.site.replace(/^https?:\/\//, "")}
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ArtistrySynk Creatives Talent Hunt. ArtistrySynk.</p>
          <div className="flex gap-5">
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/admin" className="hover:text-foreground">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ to: string; label: string }>;
}) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
