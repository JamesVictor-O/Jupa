import Link from "next/link";
import { arc } from "@/lib/env";

type StoreSummary = { id: string; name: string; logoUrl: string | null };
type MerchantSection = "home" | "till";

export function MerchantShell({ store, active, children }: { store: StoreSummary; active: MerchantSection; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="border-b border-line bg-ink text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-white/10">
        <div className="flex h-20 items-center justify-between px-5 lg:px-7">
          <Link href="/dashboard" className="text-xl font-bold tracking-[-0.04em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Jupa</Link>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">Arc {arc.network}</span>
        </div>
        <nav aria-label="Merchant navigation" className="flex gap-2 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-4 lg:pb-0">
          <NavItem href="/dashboard" active={active === "home"} icon={<HomeIcon />}>Home</NavItem>
          <NavItem href={`/till/${store.id}`} active={active === "till"} icon={<TillIcon />}>Counter</NavItem>
          <NavItem href={`/s/${store.id}`} icon={<LinkIcon />} external>Payment page</NavItem>
        </nav>
        <div className="hidden px-7 pt-10 lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Store</p>
          <div className="mt-3 flex items-center gap-3">
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- merchant-provided data URL
              <img src={store.logoUrl} alt="" className="size-10 rounded-xl object-cover" />
            ) : <span className="grid size-10 place-items-center rounded-xl bg-white text-sm font-bold text-ink">{initials(store.name)}</span>}
            <div className="min-w-0"><p className="truncate text-sm font-bold">{store.name}</p><p className="text-xs text-white/50">Accepting USDC</p></div>
          </div>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function NavItem({ href, active = false, external = false, icon, children }: { href: string; active?: boolean; external?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} aria-current={active ? "page" : undefined} className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${active ? "bg-white text-ink" : "text-white/65 hover:bg-white/10 hover:text-white"}`}>
      {icon}{children}{external && <span className="sr-only"> (opens in a new tab)</span>}
    </Link>
  );
}

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function HomeIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></svg>; }
function TillIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h4M15 13h2"/></svg>; }
function LinkIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/></svg>; }
