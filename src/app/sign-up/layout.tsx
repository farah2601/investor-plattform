// Force dynamic rendering for this route since it uses search params
export const dynamic = 'force-dynamic';

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

