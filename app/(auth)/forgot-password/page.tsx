'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, KeyRound, Mail, MailCheck, Send } from 'lucide-react';
import { toast } from 'sonner';

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ResetFormData = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const sendLink = async (email: string) => {
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSentTo(email);
      toast.success('Password reset link sent!');
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to send reset email. Please check the address.');
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (data: ResetFormData) => sendLink(data.email);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#d1fae5] via-[#f0fdf4] to-[#ecfdf5]">
      <div className="w-full max-w-md bg-white rounded-[28px] shadow-2xl border border-emerald-100 p-6 sm:p-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748b] hover:text-emerald-700 transition-colors rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>

        {sentTo ? (
          <div className="text-center pt-6 pb-2" role="status" aria-live="polite">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/60">
              <MailCheck className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-[#0b3b2e]">Check your inbox</h1>
            <p className="text-sm text-[#64748b] mt-2">
              If an account exists for{' '}
              <span className="font-semibold text-[#0b3b2e] break-all">{sentTo}</span>, you&apos;ll get a link to
              reset your password in a few minutes.
            </p>

            <div className="mt-6 space-y-3">
              <Link href="/login" className="block">
                <Button variant="primary" size="lg" className="w-full">
                  Back to sign in
                </Button>
              </Link>
              <p className="text-xs text-[#64748b]">
                Didn&apos;t get it? Check spam, or{' '}
                <button
                  type="button"
                  onClick={() => sendLink(getValues('email') || sentTo)}
                  disabled={submitting}
                  className="font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 disabled:opacity-50"
                >
                  {submitting ? 'sending...' : 'resend the link'}
                </button>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center mt-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#047857] to-[#10b981] flex items-center justify-center text-white shadow-emerald-lg mb-3">
                <KeyRound className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-black text-[#0b3b2e]">Forgot your password?</h1>
              <p className="text-xs text-[#64748b] mt-1 max-w-[300px]">
                Enter the email you signed up with and we&apos;ll send you a secure reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input
                type="email"
                label="Email Address"
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                icon={<Mail className="w-4 h-4 text-emerald-600" />}
                {...register('email')}
                error={errors.email?.message}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                loading={submitting}
                loadingText="Sending link..."
                icon={<Send className="w-4 h-4" />}
              >
                Send reset link
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-[#64748b]">
              Remembered it?{' '}
              <Link
                href="/login"
                className="font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
