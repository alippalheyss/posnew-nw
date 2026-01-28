"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showError } from '@/utils/toast';
import { Lock, User } from 'lucide-react';

const Login = () => {
    const { t } = useTranslation();
    const { login } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 font-faruma">
            <Card className="w-full max-w-md shadow-2xl border-none">
                <CardHeader className="space-y-4 pb-8">
                    {/* Logo/Branding */}
                    <div className="flex flex-col items-center space-y-3">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="text-white text-3xl font-black">MV</span>
                        </div>
                        <div className="text-center">
                            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                {t('mvpos')}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Point of Sale System
                            </p>
                        </div>
                    </div>

                    <div className="text-center">
                        <CardTitle className="text-2xl font-bold">{t('welcome_back')}</CardTitle>
                        <CardDescription className="mt-2">{t('enter_credentials')}</CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Username */}
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-right block">
                                {t('username')}
                            </Label>
                            <div className="relative">
                                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="text-right pr-10"
                                    placeholder="admin"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-right block">
                                {t('password')}
                            </Label>
                            <div className="relative">
                                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="text-right pr-10"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
                            <Label htmlFor="remember" className="text-sm cursor-pointer">
                                {t('remember_me')}
                            </Label>
                            <Checkbox
                                id="remember"
                                checked={rememberMe}
                                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                            />
                        </div>

                        {/* Login Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                            disabled={isLoading}
                        >
                            {isLoading ? t('loading') : t('login')}
                        </Button>
                    </form>

                    {/* Default Credentials Hint (for development) */}
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed">
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            Default: <span className="font-mono font-bold">admin</span> / <span className="font-mono font-bold">admin123</span>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Login;
