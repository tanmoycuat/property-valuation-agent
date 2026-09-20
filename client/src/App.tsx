import { Link, Route, Switch, useLocation } from "wouter";
import { Layers, MapPin, Sparkles } from "lucide-react";
import ValuationDesk from "./pages/ValuationDesk";
import AgentSkills from "./pages/AgentSkills";

const NAV = [
  { href: "/", label: "Valuation desk", icon: MapPin },
  { href: "/skills", label: "Agent skills", icon: Sparkles },
];

function Sidebar() {
  const [location] = useLocation();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2 px-6 py-7">
        <Layers className="h-5 w-5 text-sidebar-primary" />
        <span className="text-base font-semibold tracking-tight">Plotline</span>
      </div>
      <nav className="flex flex-col gap-1 px-3" aria-label="Primary navigation">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = location === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-auto px-6 py-7 text-xs leading-5 text-sidebar-foreground/60">
        Bring your own judgment. Plotline gives you a transparent baseline to test it against.
      </p>
    </aside>
  );
}

function MobileBar() {
  return (
    <div className="flex items-center justify-between border-b border-border bg-sidebar px-5 py-4 text-sidebar-foreground lg:hidden">
      <Link href="/" data-testid="link-mobile-logo" className="flex items-center gap-2 font-semibold">
        <Layers className="h-5 w-5 text-sidebar-primary" />
        Plotline
      </Link>
      <Link href="/skills" data-testid="link-mobile-skills" className="text-sm font-medium">
        Agent skills
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <div className="noise min-h-[100dvh] bg-background">
      <Sidebar />
      <MobileBar />
      <main className="lg:pl-[252px]">
        <Switch>
          <Route path="/" component={ValuationDesk} />
          <Route path="/skills" component={AgentSkills} />
          <Route>
            <div className="px-6 py-16 text-center text-muted-foreground">
              404 — did you forget to add the page to the router?
            </div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}
