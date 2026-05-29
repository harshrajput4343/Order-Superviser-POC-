'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SyncIcon from '@mui/icons-material/Sync';

const navLinks = [
  { href: '/',            icon: <DashboardIcon fontSize="small" />, label: 'Dashboard'   },
  { href: '/supervisors', icon: <SmartToyIcon  fontSize="small" />, label: 'Supervisors' },
  { href: '/runs',        icon: <SyncIcon      fontSize="small" />, label: 'Runs'        },
];

export function Navigation() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* ── Sidebar (desktop) ───────────────────────────────────────────── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-full w-[240px] z-50 flex-col"
        style={{ background: 'var(--color-sidebar)', borderRight: '1px solid var(--color-sidebar-border)' }}
      >
        {/* Logo */}
        <div className="p-5" style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}>
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600/20 transition-transform group-hover:scale-105">
              <Image src="/parcel.png" alt="OS Logo" width={24} height={24} className="object-contain" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Order Supervisor</div>
              <div className="text-xs" style={{ color: 'var(--color-sidebar-text)' }}>AI Monitoring</div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navLinks.map(({ href, icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                style={{
                  background: active ? 'var(--color-sidebar-active)' : 'transparent',
                  color: active ? 'var(--color-sidebar-active-text)' : 'var(--color-sidebar-text)',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-sidebar-hover)';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#ffffff';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-sidebar-text)';
                  }
                }}
              >
                {/* Active indicator bar */}
                <span
                  className="absolute left-0 w-0.5 h-6 rounded-r-full transition-opacity duration-150"
                  style={{ background: '#60A5FA', opacity: active ? 1 : 0 }}
                />
                <span className="flex items-center relative">{icon}</span>
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4" style={{ borderTop: '1px solid var(--color-sidebar-border)' }}>
          <div className="text-xs" style={{ color: 'var(--color-sidebar-text)' }}>
            <div className="font-medium">Order Supervisor POC</div>
            <div className="mt-0.5 opacity-60">v1.0.0</div>
          </div>
        </div>
      </aside>

      {/* ── Mobile header ───────────────────────────────────────────────── */}
      <header
        className="md:hidden sticky top-0 left-0 right-0 z-50 flex items-center gap-3 p-4 backdrop-blur-xl"
        style={{
          background: 'rgba(255,255,255,0.95)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="w-7 h-7 flex items-center justify-center rounded-md bg-blue-600/10">
          <Image src="/parcel.png" alt="OS Logo" width={20} height={20} className="object-contain" />
        </div>
        <div className="text-sm font-semibold text-foreground">Order Supervisor</div>
      </header>

      {/* ── Bottom nav (mobile) ─────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around p-2 backdrop-blur-xl"
        style={{
          background: 'rgba(255,255,255,0.97)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        {navLinks.map(({ href, icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center p-2 rounded-lg transition-colors"
              style={{ color: active ? 'var(--color-primary)' : 'var(--color-muted)' }}
            >
              <span className="mb-0.5">{icon}</span>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
