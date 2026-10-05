import {
  BarChart3,
  Compass,
  Cpu,
  Flag,
  Gauge,
  LayoutTemplate,
  LogOut,
  Megaphone,
  Menu,
  ScrollText,
  Type,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { clearSession, client } from "@/session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const GROUPS: Array<{
  label: string;
  items: Array<{ to: string; label: string; icon: LucideIcon }>;
}> = [
  {
    label: "營運",
    items: [
      { to: "/users", label: "用戶", icon: Users },
      { to: "/usage", label: "用量", icon: BarChart3 },
      { to: "/announcements", label: "公告", icon: Megaphone },
      { to: "/audit", label: "審計", icon: ScrollText },
    ],
  },
  {
    label: "內容",
    items: [
      { to: "/tools", label: "工具", icon: Wrench },
      { to: "/templates", label: "模板", icon: LayoutTemplate },
      { to: "/discover", label: "發現", icon: Compass },
      { to: "/copy", label: "文案", icon: Type },
    ],
  },
  {
    label: "系統",
    items: [
      { to: "/models", label: "模型", icon: Cpu },
      { to: "/flags", label: "旗標", icon: Flag },
      { to: "/quotas", label: "配額", icon: Gauge },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-ink px-3 text-cream lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="border-white/15 text-cream hover:bg-ink-2 hover:text-white"
          aria-label="開啟選單"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        <div className="min-w-0">
          <div className="font-serif text-lg leading-none tracking-[0.08em]">智泉</div>
          <div className="mt-1 font-serif text-[10px] tracking-[0.16em] text-pine-2">ADMIN · GWGW</div>
        </div>
      </header>
      {open ? (
        <button
          type="button"
          aria-label="關閉選單"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "flex w-[min(16.5rem,88vw)] flex-col gap-1 bg-ink px-4 py-6 text-cream transition-transform duration-200",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:shadow-[8px_0_24px_rgba(0,0,0,0.28)]",
          open ? "max-lg:translate-x-0" : "max-lg:pointer-events-none max-lg:-translate-x-full",
          "lg:sticky lg:top-0 lg:h-screen lg:w-auto",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-2 px-2">
          <div>
            <div className="font-serif text-[28px] tracking-[0.08em]">智泉</div>
            <div className="mt-1 font-serif text-xs tracking-[0.16em] text-pine-2">ADMIN · GWGW</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="border-white/15 text-cream hover:bg-ink-2 hover:text-white lg:hidden"
            aria-label="關閉選單"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-1 text-[11px] tracking-[0.14em] text-cream/45">{group.label}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-cream/80 no-underline hover:bg-ink-2 hover:text-white",
                          isActive && "bg-ink-2 text-white shadow-[inset_3px_0_0_var(--color-pine)]",
                        )
                      }
                    >
                      <Icon className="size-4 shrink-0 opacity-80" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <Separator className="my-3 bg-white/10" />
        <Button
          variant="ghost"
          className="justify-start border-white/15 text-cream hover:bg-ink-2 hover:text-white"
          onClick={() => {
            void client.logout(false).catch(() => undefined);
            clearSession();
          }}
        >
          <LogOut className="size-4" />
          登出
        </Button>
      </aside>
      <main className="min-w-0 px-4 py-5 lg:px-8 lg:py-6">{children}</main>
    </div>
  );
}
