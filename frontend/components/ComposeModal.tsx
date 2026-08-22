import React, { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { X, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { parseEmailsClient, ParseResult } from '../utils/csvParser';
import { createCampaign } from '../services/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onCampaignCreated,
}) => {
  const { data: session } = useSession();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startTime, setStartTime] = useState(() => {
    // Default to current local time in ISO format for datetime-local (YYYY-MM-DDTHH:mm)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [hourlyLimit, setHourlyLimit] = useState(200);

  // File parsing states
  const [fileStats, setFileStats] = useState<ParseResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handles reading and parsing uploaded CSV/TXT lists
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const stats = parseEmailsClient(text);
      setFileStats(stats);
      
      if (stats.validEmails.length === 0) {
        toast.error('No valid email addresses detected in the uploaded file.');
      } else {
        toast.success(`Successfully parsed ${stats.validEmails.length} email addresses.`);
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read file.');
    };

    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      return toast.error('Subject is required.');
    }
    if (!body.trim()) {
      return toast.error('Body is required.');
    }
    if (!fileStats || fileStats.validEmails.length === 0) {
      return toast.error('Please upload a file containing at least one valid recipient email.');
    }

    try {
      setIsSubmitting(true);
      
      await createCampaign(
        {
          subject,
          body,
          startTime: new Date(startTime).toISOString(),
          delaySeconds,
          hourlyLimit,
          recipients: fileStats.validEmails,
        },
        session
      );

      toast.success('Campaign scheduled successfully!');
      
      // Reset form
      setSubject('');
      setBody('');
      setFileStats(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      onCampaignCreated();
      onClose();
    } catch (error: any) {
      console.error('Submit Error:', error);
      toast.error(error.message || 'Failed to schedule campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Compose New Campaign</h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-50 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <Input
            label="Campaign Subject"
            placeholder="e.g. Introducing our new platform!"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          <Textarea
            label="Email Body"
            placeholder="Write your message content here. Supports multiple paragraphs..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            required
          />

          {/* Schedulers & Spacers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Start Time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />

            <Input
              label="Delay between emails (seconds)"
              type="number"
              min="0"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 0)}
              required
            />

            <Input
              label="Hourly Send Limit"
              type="number"
              min="1"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value) || 1)}
              required
            />
          </div>

          {/* CSV File Upload Section */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Recipient Email List (CSV/TXT)</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/50 hover:bg-slate-50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="h-8 w-8 text-slate-400" />
              <div className="text-sm text-slate-600 font-medium">Click to upload CSV or TXT file</div>
              <div className="text-xs text-slate-400">Comma, semicolon, or newline separated list of email addresses</div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.txt"
                className="hidden"
              />
            </div>

            {/* Display Stats */}
            {fileStats && (
              <div className="mt-2 flex flex-col gap-1 text-sm bg-slate-50 border border-slate-100 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>
                    <strong className="font-semibold text-emerald-700">{fileStats.validEmails.length}</strong> email addresses detected
                  </span>
                </div>
                {fileStats.invalidEmails.length > 0 && (
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>
                      Ignored {fileStats.invalidEmails.length} invalid email format(s)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Schedule Campaign
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
