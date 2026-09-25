"use client";

import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAppContext } from '@/context/AppContext';
import { Button } from './ui/button';
import { ChevronRight } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarCollapsed, setSidebarCollapsed } = useAppContext();
  const location = useLocation();

  if (location.pathname === '/mobile-purchase') {
    return <>{children}</>;
  }
  
  return (
    <div className="flex h-[100dvh] flex-row-reverse bg-background text-foreground overflow-hidden relative">
      {/* Ambient Apple Liquid Glass backdrop mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-blue-500/10 dark:bg-blue-600/12 blur-[120px] pointer-events-none transform -translate-z-0" />
        <div className="absolute top-[40%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/8 dark:bg-cyan-500/10 blur-[130px] pointer-events-none transform -translate-z-0" />
        <div className="absolute -bottom-[20%] left-[25%] w-[45vw] h-[45vw] rounded-full bg-sky-400/8 dark:bg-blue-400/8 blur-[100px] pointer-events-none transform -translate-z-0" />
      </div>

      <Sidebar />
      
      <div className="flex flex-col flex-1 relative min-w-0 z-10">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;