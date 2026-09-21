// Each auth page owns its full-page layout (login is a split screen, signup a centered card).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
