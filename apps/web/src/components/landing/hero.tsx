import Link from "next/link";
import { Horizon, OctagonField, Sparkle } from "@/components/art";
import { PhoneDemo } from "./phone-demo";
import { SiteNav } from "./site-nav";

export function Hero() {
  return (
    <section id="top" className="relative isolate flex min-h-svh flex-col overflow-hidden bg-canvas lg:h-svh lg:min-h-[640px]">
      <OctagonField className="absolute inset-0 -z-10 size-full" />
      <Horizon className="pointer-events-none absolute bottom-0 left-0 -z-10 h-40 w-full sm:h-56 lg:h-[24svh]" />

      <SiteNav />

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-16 px-6 pb-48 pt-16 lg:min-h-0 lg:grid-cols-[1.15fr_1fr] lg:gap-8 lg:px-12 lg:py-6">
        <div className="lg:pb-[24svh] lg:pl-20">
          <h1 className="font-display text-[clamp(2.25rem,4.6vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.04em] text-balance">
            Get Paid In
            <br />
            USDC From
            <br />
            Any Chain
          </h1>
          <p className="mt-8 max-w-md text-lg text-muted text-pretty">
            Customers scan and tap Pay. You get USDC on Arc in seconds, whichever chain they hold it on.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-10">
            <Link
              href="/onboard"
              className="grid h-16 min-w-56 place-items-center rounded-lg bg-gradient-to-br from-ink to-ink-soft px-10 text-lg font-bold text-white shadow-pill transition-transform duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              Get Started
            </Link>
          </div>
        </div>

        <div className="relative flex justify-center lg:h-full lg:min-h-0 lg:justify-end lg:pr-16">
          <Sparkle className="float-slow absolute right-0 top-16 size-9 text-ink lg:right-0" />
          <Sparkle className="absolute -left-2 bottom-24 hidden size-4 text-ink/70 lg:block" />
          <PhoneDemo />
        </div>
      </div>
    </section>
  );
}
