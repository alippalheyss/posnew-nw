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
    <div className="flex h-[100dvh] flex-row-reverse bg-background text-foreground overflow-hidden">
      <Sidebar />
      
      <div className="flex flex-col flex-1 relative min-w-0">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;