"use client";

import React from 'react';
import Sidebar from './Sidebar';
import { useAppContext } from '@/context/AppContext';
import { Button } from './ui/button';
import { ChevronRight } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarCollapsed, setSidebarCollapsed } = useAppContext();
  
  return (
    <div className="flex min-h-screen flex-row-reverse bg-[#050510] text-white overflow-hidden">
      {!sidebarCollapsed && <Sidebar />}
      
      <div className="flex flex-col flex-1 relative min-w-0">
        {sidebarCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(false)}
            className="absolute top-1/2 -translate-y-1/2 right-0 z-[100] h-12 w-6 bg-primary/20 hover:bg-primary/40 border-y border-l border-white/10 rounded-l-xl rounded-r-none text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;