import { LoginForm } from "@/components/auth/AuthForms";
import { Logo, LogoMark } from "@/components/ui/Brand";
import { IconClients, IconDashboard, IconInventory } from "@/components/ui/icons";

export const metadata = { title: "Sign in" };

const FEATURES = [
  { icon: IconInventory, title: "Inventory", text: "Every item and its status, in one place." },
  { icon: IconClients, title: "Customers", text: "Always know who ordered what." },
  { icon: IconDashboard, title: "Sales", text: "Your profit at a glance." },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-sidebar lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Brand panel: all colors come from the theme's sidebar/brand/accent roles. Compact banner on phones. */}
      <section className="relative overflow-hidden px-6 pb-14 pt-8 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/40 blur-3xl" />
          <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute -right-40 top-1/4 hidden h-[34rem] w-[34rem] rounded-full border border-brand/15 lg:block" />
          <div className="absolute -right-24 top-[calc(25%+7rem)] hidden h-[22rem] w-[22rem] rounded-full border border-brand/10 lg:block" />
          <LogoMark className="absolute -bottom-20 -left-16 hidden h-96 w-96 opacity-[0.07] lg:block" />
        </div>

        <div className="relative">
          <Logo />
        </div>

        <div className="relative hidden max-w-lg lg:block">
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight text-sidebar-hover xl:text-5xl">
            Your pasabuy business, organized.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-sidebar-text">Inventory, customers and sales for your Japan pasabuy business.</p>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand ring-1 ring-brand/25">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm leading-snug text-sidebar-text">
                  <span className="block font-medium text-sidebar-hover">{title}</span>
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* <p className="relative hidden text-xs text-sidebar-text/70 lg:block">&copy; {new Date().getFullYear()} CC</p> */}
      </section>

      {/* Form side: slides up like a sheet on phones, sits beside the brand panel on desktop. */}
      <main className="relative -mt-6 flex flex-1 items-center justify-center rounded-t-[2rem] bg-page px-4 pb-10 pt-8 lg:mt-0 lg:rounded-none lg:p-12">
        <div className="rise w-full max-w-md">
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl shadow-ink/5 sm:p-10">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mb-8 mt-2 text-sm text-neutral-500">Sign in to manage your pasabuy orders.</p>
            <LoginForm signupEnabled={process.env.ALLOW_SIGNUP !== "false"} />
          </div>
        </div>
      </main>
    </div>
  );
}
