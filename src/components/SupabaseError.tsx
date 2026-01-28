import React from 'react';
import { AlertTriangle, ExternalLink, Settings, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { showSuccess } from '@/utils/toast';

const SupabaseError: React.FC = () => {
    const { t } = useTranslation();
    const [copied, setCopied] = React.useState<string | null>(null);

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        showSuccess('Copied to clipboard');
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 font-faruma" dir="rtl">
            <Card className="w-full max-w-2xl border-orange-200 dark:border-orange-900 shadow-xl overflow-hidden">
                <div className="bg-orange-500 h-2 w-full" />
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                            <AlertTriangle className="h-10 w-10 text-orange-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-black text-gray-900 dark:text-gray-100">
                        Supabase Setup Required
                        <span className="block text-sm font-normal text-gray-500 mt-1">(ސުޕަބޭސް ސެޓަޕް ކުރަން ޖެހޭ)</span>
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        The application is unable to connect to Supabase. This usually happens when environment variables are missing on Vercel.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <h4 className="font-bold flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-300">
                            <Settings className="h-4 w-4" /> How to fix on Vercel:
                        </h4>
                        <ol className="text-sm space-y-3 text-gray-700 dark:text-gray-400 list-decimal list-inside pr-2">
                            <li>Open your project on <strong>Vercel Dashboard</strong>.</li>
                            <li>Go to <strong>Settings</strong> {'>'} <strong>Environment Variables</strong>.</li>
                            <li>Add the following variables exactly:</li>
                        </ol>

                        <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded border border-blue-200 dark:border-blue-800">
                                <code className="text-xs font-mono text-blue-600">VITE_SUPABASE_URL</code>
                                <Button variant="ghost" size="sm" onClick={() => copyToClipboard('VITE_SUPABASE_URL', 'url')}>
                                    {copied === 'url' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                </Button>
                            </div>
                            <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded border border-blue-200 dark:border-blue-800">
                                <code className="text-xs font-mono text-blue-600">VITE_SUPABASE_ANON_KEY</code>
                                <Button variant="ghost" size="sm" onClick={() => copyToClipboard('VITE_SUPABASE_ANON_KEY', 'key')}>
                                    {copied === 'key' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 text-sm text-right">
                        <p className="font-bold">ސަމާލުކަމަށް:</p>
                        <p className="opacity-80">މި މައްސަލަ ދިމާވަނީ Vercel އެންވަޔަރަންމަންޓް ވޭރިއަބަލްތައް ސެޓްނުކުރާތީއެވެ. މަތީގައިވާ ވޭރިއަބަލްތައް އިތުރުކުރުމަށްފަހު އަލުން ރިޑިޕްލޯއި ކުރައްވާށެވެ.</p>
                    </div>
                </CardContent>
                <CardFooter className="bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row gap-3 pt-6">
                    <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" asChild>
                        <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            Open Vercel Dashboard <ExternalLink className="h-4 w-4" />
                        </a>
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                        Reload App (އަލުން ލޯޑް ކުރޭ)
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default SupabaseError;
