import Link from 'next/link';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PLAN_INFO } from '@/lib/stripe/client';
import { CheckoutButton, PortalButton } from './buttons';

export default async function BillingPage(props: { searchParams: Promise<{ success?: string; cancelled?: string }> }) {
  const { user } = await validateRequest();
  if (!user) return null;
  const sp = await props.searchParams;

  const host = await prisma.host.findUnique({
    where: { id: user.id },
    select: { plan: true, planRenewsAt: true, stripeSubscriptionId: true, stripeCustomerId: true },
  });
  if (!host) return null;

  const current = PLAN_INFO[host.plan];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Abbonamento</h1>

      {sp.success && (
        <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          Abbonamento attivato. La fattura ti arriverà via email.
        </div>
      )}
      {sp.cancelled && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Pagamento non completato. Nessuna spesa addebitata.
        </div>
      )}

      <section className="citofono-card p-6">
        <h2 className="font-display text-xl font-bold">Piano attuale</h2>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{current.label}</div>
            <div className="text-sm text-ink/60">{current.description}</div>
            {host.planRenewsAt && (
              <div className="mt-2 text-xs text-ink/50">
                Rinnovo il {host.planRenewsAt.toLocaleDateString('it-IT')}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{current.priceMonthly}€</div>
            <div className="text-xs text-ink/50">al mese</div>
          </div>
        </div>
        {host.stripeCustomerId && <PortalButton />}
      </section>

      {host.plan === 'FREE' && (
        <section className="citofono-card p-6">
          <h2 className="font-display text-xl font-bold">Passa a un piano a pagamento</h2>
          <p className="mt-1 text-sm text-ink/60">14 giorni di prova gratuita su qualsiasi piano. Cancella in 1 click.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <PlanCard plan="HOST" />
            <PlanCard plan="HOST_PLUS" highlight />
          </div>
        </section>
      )}

      <p className="text-center text-xs text-ink/50">
        Property manager con 5+ unità: <Link href="mailto:sales@citofono.app" className="underline">contattaci</Link>.
      </p>
    </div>
  );
}

function PlanCard({ plan, highlight }: { plan: 'HOST' | 'HOST_PLUS'; highlight?: boolean }) {
  const info = PLAN_INFO[plan];
  return (
    <div className={`citofono-card p-6 ${highlight ? 'border-ink ring-2 ring-post' : ''}`}>
      {highlight && (
        <span className="mb-3 inline-flex items-center rounded-full bg-post px-3 py-1 text-xs font-medium text-ink">
          Più scelto
        </span>
      )}
      <div className="text-lg font-semibold">{info.label}</div>
      <div className="mt-1 text-sm text-ink/60">{info.description}</div>
      <div className="mt-4 text-3xl font-bold">{info.priceMonthly}€<span className="text-base font-normal text-ink/60">/mese</span></div>
      <CheckoutButton plan={plan} highlight={highlight} />
    </div>
  );
}
