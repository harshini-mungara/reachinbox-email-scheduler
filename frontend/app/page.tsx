'use client';

import { signIn, useSession } from 'next-auth/react';
import { Mail, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Dashboard } from '../components/Dashboard';

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
          <span className="text-sm font-medium text-slate-500">Checking auth session...</span>
        </div>
      </div>
    );
  }

  // If user is authenticated, render the full email scheduler dashboard
  if (session) {
    return <Dashboard />;
  }

  // Otherwise, render a clean, high-converting Google login landing page
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Visual Brand Left Panel */}
      <div className="hidden md:flex flex-1 bg-slate-900 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <div className="bg-white text-slate-900 p-1.5 rounded-lg">
            <Mail className="h-6 w-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">ReachInbox Outbox</span>
        </div>

        <div className="space-y-4 max-w-lg">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Scale your cold email campaigns with intelligent scheduling.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Ensure delivery and protect domain reputation using automatic BullMQ delayed queues, custom email spacing, and Redis-backed distributed hourly rate limiters.
          </p>
        </div>

        <div className="text-xs text-slate-500">
          © {new Date().getFullYear()} ReachInbox. All rights reserved.
        </div>
      </div>

      {/* Login Form Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md bg-white border border-slate-100 shadow-xl rounded-2xl p-8 space-y-6">
          <div className="space-y-2 text-center">
            {/* Small screen branding logo */}
            <div className="flex md:hidden items-center justify-center gap-2 mb-4">
              <div className="bg-slate-900 text-white p-1.5 rounded-lg">
                <Mail className="h-6 w-6" />
              </div>
              <span className="font-bold text-xl tracking-tight">ReachInbox Outbox</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Welcome to Scheduler</h2>
            <p className="text-slate-400 text-sm">
              Sign in with your Google account to manage and schedule your outreach campaigns.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <Button
              variant="primary"
              className="w-full h-12 flex items-center justify-center gap-3 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-semibold transition-colors"
              onClick={() => signIn('google')}
            >
              {/* SVG Google Icon */}
              <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign In with Google
            </Button>

            <div className="relative flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <span className="relative bg-white px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">
                Outreach scheduler features
              </span>
            </div>

            {/* Value Props Bullet points */}
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-2.5">
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Space out sends with custom delay options</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Automated Redis rate-limiting per hour</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Survives worker crashes or system restarts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
