import React, { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  LogOut, Plus, Mail, Calendar, CheckSquare, AlertCircle, RefreshCw, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { ComposeModal } from './ComposeModal';
import { fetchScheduledEmails, fetchSentEmails, EmailRecord } from '../services/api';

export const Dashboard: React.FC = () => {
  const { data: session } = useSession();
  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');

  const user = session?.user;

  // Loads campaign and email data from Express API
  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [scheduled, sent] = await Promise.all([
        fetchScheduledEmails(session),
        fetchSentEmails(session)
      ]);
      setScheduledEmails(scheduled);
      setSentEmails(sent);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load email records.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const getStatusBadge = (status: EmailRecord['status']) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="info">Scheduled</Badge>;
      case 'PROCESSING':
        return <Badge variant="warning" className="animate-pulse">Processing</Badge>;
      case 'RATE_LIMITED':
        return <Badge variant="warning">Rate Limited</Badge>;
      case 'SENT':
        return <Badge variant="success">Sent</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Stats computation
  const totalScheduled = scheduledEmails.length;
  const totalSent = sentEmails.filter(e => e.status === 'SENT').length;
  const totalFailed = sentEmails.filter(e => e.status === 'FAILED').length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white p-2 rounded-lg">
            <Mail className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">ReachInbox Scheduler</span>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            {/* User Details */}
            <div className="flex items-center gap-3">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || 'User'}
                  className="h-9 w-9 rounded-full border border-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm border border-slate-200">
                  {user.name?.[0] || 'U'}
                </div>
              )}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-700">{user.name}</span>
                <span className="text-xs text-slate-400">{user.email}</span>
              </div>
            </div>

            {/* Logout */}
            <Button
              variant="ghost"
              className="p-2 h-9 w-9"
              title="Sign Out"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4 text-slate-500 hover:text-red-500" />
            </Button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-100 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className="bg-sky-50 text-sky-600 p-3 rounded-lg">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-sm text-slate-400 font-medium">Scheduled</span>
              <strong className="text-2xl font-bold text-slate-800">{totalScheduled}</strong>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-sm text-slate-400 font-medium">Sent</span>
              <strong className="text-2xl font-bold text-slate-800">{totalSent}</strong>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className="bg-red-50 text-red-600 p-3 rounded-lg">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-sm text-slate-400 font-medium">Failed</span>
              <strong className="text-2xl font-bold text-slate-800">{totalFailed}</strong>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'scheduled'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Scheduled Emails ({totalScheduled})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'sent'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Sent & Failed ({totalSent + totalFailed})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="secondary"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="px-3"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="primary"
              onClick={() => setIsComposeOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Compose New Campaign
            </Button>
          </div>
        </div>

        {/* Content Table / Card */}
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
              <span className="text-sm font-medium text-slate-500">Loading email schedules...</span>
            </div>
          ) : (
            <>
              {activeTab === 'scheduled' ? (
                // Scheduled Table
                scheduledEmails.length === 0 ? (
                  <div className="text-center p-12">
                    <Mail className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-slate-700 mb-1">No scheduled emails</h3>
                    <p className="text-sm text-slate-400">Click "Compose New Campaign" to schedule emails.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Campaign Subject</TableHead>
                        <TableHead>Scheduled Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scheduledEmails.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell className="font-medium text-slate-800">{email.recipient}</TableCell>
                          <TableCell className="text-slate-600">{email.campaign.subject}</TableCell>
                          <TableCell className="text-slate-400">
                            {new Date(email.scheduledAt).toLocaleString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(email.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              ) : (
                // Sent/Failed Table
                sentEmails.length === 0 ? (
                  <div className="text-center p-12">
                    <CheckSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-slate-700 mb-1">No sent emails</h3>
                    <p className="text-sm text-slate-400">Sent and failed emails will appear here.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Processed At</TableHead>
                        <TableHead>Status / Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sentEmails.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell className="font-medium text-slate-800">{email.recipient}</TableCell>
                          <TableCell className="text-slate-600">{email.campaign.subject}</TableCell>
                          <TableCell className="text-slate-400">
                            {new Date(email.updatedAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(email.status)}
                              {email.status === 'SENT' && email.etherealPreviewUrl && (
                                <a
                                  href={email.etherealPreviewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 transition-colors text-xs font-semibold"
                                >
                                  Preview <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              {email.status === 'FAILED' && email.errorMessage && (
                                <span className="text-xs text-red-500 font-medium" title={email.errorMessage}>
                                  {email.errorMessage.length > 50
                                    ? `${email.errorMessage.substring(0, 50)}...`
                                    : email.errorMessage}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              )}
            </>
          )}
        </div>
      </main>

      {/* Campaign Composer Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onCampaignCreated={() => loadData(false)}
      />
    </div>
  );
};
