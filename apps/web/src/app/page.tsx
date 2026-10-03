import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Jupa</h1>
      <p className="text-lg text-zinc-600">
        Customers scan, tap Pay, and you get USDC. Whatever wallet they already use.
      </p>
      <Link href="/onboard" className="rounded-xl bg-black px-5 py-3 text-center font-medium text-white">
        Set up your store
      </Link>
    </main>
  );
}
