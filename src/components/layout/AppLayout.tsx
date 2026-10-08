import { useState, ReactNode } from 'react';
import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';
import { SetupBanner } from '../common/SetupBanner.js';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <SetupBanner />
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="py-4 px-6 border-t border-slate-200 text-center text-xs text-slate-500 bg-white">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>CivicPulse &copy; {new Date().getFullYear()} — Municipal Governance & Resource Dashboard</span>
            <span className="text-slate-600 font-medium">
              AI Decision Support: Officer discretion and verification required for operational action.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
