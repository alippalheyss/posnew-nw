"use client";

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

import PulsatingDots from '@/components/PulsatingDots';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden font-faruma">
                {/* Ambient liquid glow backdrop */}
                <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
                <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-500/15 rounded-full blur-[130px] pointer-events-none" />

                <div className="glass3d p-8 sm:p-10 rounded-3xl flex flex-col items-center gap-5 border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-2xl z-10">
                    <PulsatingDots dotClassName="h-3.5 w-3.5 rounded-full bg-primary" />
                    <p className="text-xs font-black text-foreground tracking-wider uppercase">Loading MVPOS...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
