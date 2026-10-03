/** F8: public receipt. Amount, store, time, source, explorer link. Also the recovery page mid-payment. */
export default async function ReceiptPage(props: PageProps<"/receipt/[chargeId]">) {
  const { chargeId } = await props.params;
  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold">Receipt</h1>
      <p className="text-sm text-zinc-500">{chargeId}</p>
      {/* TODO(F8): amount, store, time, source chain, arcTxUrl() link */}
    </main>
  );
}
