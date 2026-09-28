"use client";

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

import PulsatingDots from '@/components/PulsatingDots';
import AmbientBackground from '@/components/AmbientBackground';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden font-faruma">
                {/* Ambient slowly moving dots & lines backdrop */}
                <AmbientBackground />

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
