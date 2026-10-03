/**
 * F4-F6: customer checkout. Store, price, Connect, one Pay button.
 * Copy rule: say Pay / Paying / Paid. Never Bridge, Mint, Attest or chain names,
 * except one small line showing which balance was used.
 */
export default async function CheckoutPage(props: PageProps<"/pay/[chargeId]">) {
  const { chargeId } = await props.params;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6">
      <p className="text-sm text-zinc-500">Charge {chargeId}</p>
      {/* TODO(F4): store + price, wallet connect, routing, Pay $X, Paying progress */}
    </main>
  );
}
