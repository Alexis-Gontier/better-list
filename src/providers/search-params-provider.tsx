import { NuqsAdapter } from "nuqs/adapters/next/app";

export function SearchParamsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}
