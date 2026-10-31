/**
 * Cancel the ward shell bottom padding so the sacrament viewport fit can
 * fill the remaining window without leaving document scroll overflow.
 */
export default function SacramentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="relative -mb-4 flex min-h-0 flex-1 flex-col sm:-mb-6">{children}</div>;
}
