import {
  PROVIDER_LABELS,
  PROVIDERS,
  type Provider,
  ProviderLogo,
} from "@/features/auth/components/provider-logos";

function isProvider(value: string): value is Provider {
  return PROVIDERS.some((provider) => provider === value);
}

/**
 * Les fournisseurs liés à un compte, un logo chacun. Avec `withLabel`, le nom du premier suit :
 * c'est par lui que la demande est arrivée.
 */
export function ProviderIcons({
  providers,
  withLabel = false,
}: {
  providers: string[];
  withLabel?: boolean;
}) {
  const known = providers.filter(isProvider);
  const first = known[0];

  return (
    <span className="flex items-center gap-1.5 [&_svg]:size-4">
      {known.map((provider) => (
        <span key={provider} title={PROVIDER_LABELS[provider]}>
          <ProviderLogo provider={provider} />
        </span>
      ))}
      {withLabel && first ? <span>{PROVIDER_LABELS[first]}</span> : null}
    </span>
  );
}
