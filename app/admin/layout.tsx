'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, UserSquare2, BarChart3, LogOut, ChevronRight, Settings, X, Check, Loader2, ChevronsUpDown } from 'lucide-react';

import { ElectionProvider, useElection } from '@/components/ElectionContext';

const navLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/voters', label: 'Voters', icon: Users },
  { href: '/admin/candidates', label: 'Candidates', icon: UserSquare2 },
  { href: '/admin/results', label: 'Results', icon: BarChart3 },
  { href: '/admin/config', label: 'Configuration', icon: Settings },
];

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeElection, elections, setActiveElectionId } = useElection();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSwitcherModal, setShowSwitcherModal] = useState(false);
  const [isSwitchingElection, setIsSwitchingElection] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (!session && pathname !== '/admin/login') {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, [pathname, router]);

  const handleSwitchElection = async (id: string) => {
    if (activeElection?.id === id) {
       setShowSwitcherModal(false);
       return;
    }
    setIsSwitchingElection(true);
    // Add visual feedback delay so components have time to register state changes and we avoid jarring flashes
    await new Promise(r => setTimeout(r, 600)); 
    setActiveElectionId(id);
    setIsSwitchingElection(false);
    setShowSwitcherModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
      </div>
    );
  }

  if (pathname === '/admin/login') return <>{children}</>;
  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    localStorage.removeItem('admin_session');
    // Clear the httpOnly cookie server-side (JS can't access httpOnly cookies directly)
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F7F8FA' }}>
      {/* Solid background shield — prevents the voter page-bg blobs from bleeding through */}
      <div className="fixed inset-0 bg-[#F7F8FA] z-0" aria-hidden="true" />

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 min-h-screen bg-[#0F1117] flex flex-col shrink-0 fixed top-0 left-0 h-full z-30 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo area */}
        <div className="px-6 pt-8 pb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9B7248] to-[#7C5C3A] flex items-center justify-center shrink-0">
              <span className="text-white font-black text-xs tracking-tight">C</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">COMELEC</p>
              <p className="text-white/30 text-[10px] mt-0.5 leading-none uppercase tracking-widest">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isArchived = activeElection?.status === 'archived';
            let displayLabel = label;
            
            if (isArchived) {
              if (href === '/admin/voters' || href === '/admin/candidates' || href === '/admin/results') return null;
              if (href === '/admin') displayLabel = 'Summary';
            }

            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#C4993A]' : 'text-inherit'}`} />
                <span className="flex-1">{displayLabel}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-white/30" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 pb-6 border-t border-white/[0.07] pt-4 space-y-2">
          {/* Election Switcher */}
          {isAuthenticated && (
            <button
              onClick={() => setShowSwitcherModal(true)}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs rounded-lg px-3 py-2.5 flex items-center justify-between transition-colors text-left"
            >
              <div className="min-w-0 pr-2">
                <p className="font-semibold text-white truncate">{activeElection ? activeElection.name : 'Select Election'}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-widest mt-0.5 font-bold">
                  {activeElection?.status || 'No Active'}
                </p>
              </div>
              <ChevronsUpDown className="w-3.5 h-3.5 text-white/40 shrink-0" />
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col relative z-10">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-[#0F1117] flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#9B7248] to-[#7C5C3A] flex items-center justify-center">
              <span className="text-white font-black text-[10px]">C</span>
            </div>
            <p className="text-white font-bold text-sm">COMELEC</p>
          </div>
          <button
            onClick={() => setShowSwitcherModal(true)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Switch election"
          >
            <ChevronsUpDown className="w-4 h-4" />
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          {children}
        </main>
      </div>

      {/* Switcher Modal */}
      {showSwitcherModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Switch Election</h3>
              <button 
                onClick={() => setShowSwitcherModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-3 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1">
                {elections.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-6">No elections found.</p>
                ) : (
                  elections.map((e) => {
                    const isActive = e.id === activeElection?.id;
                    const isArchived = e.status === 'archived';
                    return (
                      <button
                        key={e.id}
                        onClick={() => handleSwitchElection(e.id)}
                        disabled={isSwitchingElection}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                          isActive ? 'bg-[#F0E6D6] border border-[#9B7248]/20' : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-semibold ${isActive ? 'text-[#7C5C3A]' : 'text-gray-900'}`}>
                            {e.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Status: <span className="uppercase font-semibold">{e.status}</span>
                            {isArchived && ' (Read-only Summary)'}
                          </p>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-[#9B7248]" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Loading Overlay for switching */}
      {isSwitchingElection && (
        <div className="fixed inset-0 bg-[#F7F8FA]/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-in fade-in duration-200">
          <Loader2 className="w-8 h-8 text-[#9B7248] animate-spin mb-4" />
          <p className="text-gray-900 font-semibold tracking-tight">Switching Election...</p>
          <p className="text-gray-500 text-sm mt-1">Preparing configuration and results</p>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Pass children through the inner layout to avoid conditional rendering hooks issues, 
  // but wrap everything in ElectionProvider
  return (
    <ElectionProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </ElectionProvider>
  );
}
