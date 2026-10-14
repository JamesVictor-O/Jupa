import Link from "next/link";
import { LogoMark } from "@/components/art";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#infrastructure", label: "Why Arc", current: true },
  { href: "#merchants", label: "Merchants" },
];

export function SiteNav() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center gap-6 px-6 pt-8 lg:px-12 lg:pt-12">
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        <LogoMark className="size-8" />
        <span className="text-2xl font-bold tracking-tight">Jupa</span>
      </Link>

      <nav aria-label="Main" className="ml-12 hidden md:block">
        <ul className="flex items-center gap-10">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                aria-current={l.current ? "true" : undefined}
                className={`relative block py-2 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${
                  l.current
                    ? "text-ink after:absolute after:inset-x-0 after:-bottom-1 after:h-[3px] after:rounded-full after:bg-ink"
                    : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

    
    </header>
  );
}
