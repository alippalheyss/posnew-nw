"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { showError } from '@/utils/toast';
import { Lock, User as UserIcon, ShieldCheck, Activity, Globe, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const Login = () => {
    const { t } = useTranslation();
    const { login } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const success = await login(username, password);

            if (success) {
                navigate('/');
            } else {
                showError(t('invalid_credentials'));
            }
        } catch (error) {
            showError(t('invalid_credentials'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden font-faruma">
            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
               <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
               <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-2 gap-0 bg-card/80 backdrop-blur-2xl border border-border rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] m-4">
                
                {/* Left Side: Branding & Info */}
                <div className="p-12 flex flex-col justify-between bg-primary/5 relative overflow-hidden hidden md:flex border-r border-border">
                   <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
                   </div>

                   <div className="relative z-10">
                      <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(0,132,255,0.4)] mb-8 rotate-3">
                         <span className="text-foreground text-2xl font-black -rotate-3">MV</span>
                      </div>
                      <h1 className="text-5xl font-black text-foreground leading-tight mb-4 tracking-tighter">
                         Enterprise <br/><span className="text-primary text-neon-blue">POS Solution</span>
                      </h1>
                      <p className="text-muted-foreground text-lg max-w-[300px]">Next-generation point of sale system designed for Maldivian businesses.</p>
                   </div>

                   <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-4 text-muted-foreground/80">
                         <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                         </div>
                         <div>
                            <p className="text-sm font-black text-foreground">Secure Access</p>
                            <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">End-to-end encryption</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground/80">
                         <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border">
                            <Activity className="h-5 w-5 text-green-500" />
                         </div>
                         <div>
                            <p className="text-sm font-black text-foreground">Real-time Sync</p>
                            <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">Cloud-enabled persistence</p>
                         </div>
                      </div>
                   </div>

                   <div className="relative z-10 pt-10 border-t border-border">
                      <div className="flex items-center gap-2 text-muted-foreground/50">
                         <Globe className="h-4 w-4" />
                         <span className="text-[10px] font-black uppercase tracking-[0.3em]">VERSION 2.0.4 - RELEASE CANDIDATE</span>
                      </div>
                   </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="p-12 flex flex-col justify-center bg-black/20">
                    <div className="md:hidden flex flex-col items-center mb-10">
                       <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg mb-4">
                          <span className="text-foreground text-2xl font-black">MV</span>
                       </div>
                       <h2 className="text-2xl font-black text-foreground">MV POS</h2>
                    </div>

                    <div className="mb-10 text-right">
                       <h2 className="text-3xl font-black text-foreground mb-2">{t('welcome_back')}</h2>
                       <p className="text-muted-foreground text-sm">{t('enter_credentials')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest pr-2">
                                {t('username')}
                            </Label>
                            <div className="relative">
                                <UserIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                                <Input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="bg-muted border-border h-14 rounded-2xl pr-12 text-lg font-bold text-foreground focus:border-primary/50 transition-all text-right"
                                    placeholder="Username"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-right block text-[10px] font-black uppercase text-muted-foreground tracking-widest pr-2">
                                {t('password')}
                            </Label>
                            <div className="relative">
                                <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-muted border-border h-14 rounded-2xl pr-12 text-lg font-bold text-foreground focus:border-primary/50 transition-all text-right font-mono"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary/90 h-14 rounded-2xl text-lg font-black text-foreground shadow-[0_0_30px_rgba(0,132,255,0.2)] group transition-all"
                        >
                            {isLoading ? (
                               <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>AUTHENTICATING...</span>
                               </div>
                            ) : (
                               <div className="flex items-center justify-center gap-2">
                                  <span>{t('login').toUpperCase()}</span>
                                  <ChevronRight className="h-5 w-5 group-hover:translate-x-[-4px] transition-transform" />
                               </div>
                            )}
                        </Button>
                    </form>

                    <div className="mt-10 text-center">
                       <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                          Authorized Access Only <br/>
                          <span className="opacity-50">© 2026 MV POS Enterprise Solutions</span>
                       </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
