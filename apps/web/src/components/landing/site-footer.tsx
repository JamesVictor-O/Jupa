import Link from "next/link";
import { LogoMark, OctagonField, Sparkle } from "@/components/art";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#problem", label: "Why Jupa" },
      { href: "#how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Merchants",
    links: [
      { href: "/onboard", label: "Set up a store" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Built on",
    links: [
      { href: "https://docs.arc.network", label: "Arc", external: true },
      { href: "https://developers.circle.com", label: "Circle", external: true },
    ],
  },
];

const linkClass =
  "rounded-sm text-[15px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";

export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden bg-canvas">
      <OctagonField className="absolute inset-0 -z-20 size-full opacity-70 [mask-image:linear-gradient(to_bottom,transparent,black_30%)]" />

      <div className="mx-auto w-full max-w-7xl px-6 pt-4 lg:px-12 lg:pt-8">
        <div className="reveal flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:pl-20">
          <h2 className="font-display text-[clamp(2.25rem,4.6vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.04em] text-balance">
            Your next sale,
            <br />
            paid in seconds
          </h2>
          <div className="flex flex-wrap items-center gap-6">
            <Link
              href="/onboard"
              className="grid h-16 min-w-56 place-items-center rounded-lg bg-gradient-to-br from-ink to-ink-soft px-10 text-lg font-bold text-white shadow-pill transition-transform duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              Get Started
            </Link>
            <Link
              href="#top"
              className="grid size-16 place-items-center rounded-full bg-surface text-ink shadow-pill transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              aria-label="Back to top"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-12 border-t border-ink/10 pt-12 sm:grid-cols-2 lg:mt-24 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:pl-20">
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 self-start rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              <LogoMark className="size-8" />
              <span className="text-2xl font-bold tracking-tight">Jupa</span>
            </Link>
            <p className="max-w-xs text-muted text-pretty">
              Checkout for a real counter. Your money goes straight to you. Jupa never holds it.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-sm font-bold">{col.title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {"external" in l ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex items-center gap-1`}>
                        {l.label}
                        <span aria-hidden="true">↗</span>
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      <Link href={l.href} className={linkClass}>
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between lg:pl-20">
          <p>© {new Date().getFullYear()} Jupa</p>
          <p className="flex items-center gap-2">
            <Sparkle className="size-3 text-ink" />
            USDC only. Settles on Arc.
          </p>
        </div>
      </div>

      {/* Oversized wordmark, cropped by the page edge. */}
      <div aria-hidden="true" className="pointer-events-none mt-10 select-none overflow-hidden">
        <p className="translate-y-[18%] text-center font-display text-[24vw] font-extrabold leading-[0.8] tracking-[-0.06em] text-ink">
          Jupa
        </p>
      </div>
    </footer>
  );
}
