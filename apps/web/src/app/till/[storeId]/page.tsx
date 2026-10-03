/** F3: amount pad -> per-charge QR with countdown -> full-screen green Paid. */
export default async function TillPage(props: PageProps<"/till/[storeId]">) {
  const { storeId } = await props.params;
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <p className="text-sm text-zinc-500">Till · {storeId}</p>
      {/* TODO(F3): number pad, Charge, QR + countdown, live status, Paid screen */}
    </main>
  );
}
