'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { Wallet, Sparkles, LogIn, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, enableDemoMode } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setSubmitting(true);
    setAuthError(null);
    try {
      await signInWithEmail(data.email, data.password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      const firebaseError = err as { code?: string; message?: string };
      let msg = 'Invalid credentials or sign in failed. Try Demo Mode below.';
      if (
        firebaseError?.code === 'auth/invalid-credential' ||
        firebaseError?.code === 'auth/wrong-password'
      ) {
        msg = 'Incorrect email or password. Please try again.';
      } else if (firebaseError?.code === 'auth/user-not-found') {
        msg = 'No account found with this email. Please register first.';
      } else if (firebaseError?.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please reset password or wait.';
      }
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleSubmitting(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      toast.success('Signed in with Google!');
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      const firebaseError = err as { code?: string; message?: string };
      let msg = 'Google sign in failed or canceled';
      if (firebaseError?.code === 'auth/popup-closed-by-user') {
        msg = 'Sign in was cancelled.';
      } else if (
        firebaseError?.code === 'auth/configuration-not-found' ||
        firebaseError?.code === 'auth/operation-not-allowed'
      ) {
        msg = 'Please enable Google sign-in provider in Firebase Console.';
      }
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleDemoSignIn = () => {
    enableDemoMode();
    toast.success('Welcome to ExpenseFlow Demo!');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#d1fae5] via-[#f0fdf4] to-[#ecfdf5]">
      <div className="w-full max-w-md bg-white rounded-[28px] shadow-2xl border border-emerald-100 p-6 sm:p-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#047857] to-[#10b981] flex items-center justify-center text-white shadow-emerald-lg mb-3">
            <Wallet className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b3b2e]">Sign In to ExpenseFlow</h1>
          <p className="text-xs text-[#64748b] mt-1">
            Access your financial dashboard, split bills, and savings goals
          </p>
        </div>

        {/* Guest Demo Mode Instant Access Banner */}
        <div className="mb-6 p-3.5 bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div className="text-left">
              <p className="text-xs font-semibold text-[#0b3b2e]">Explore Instant Demo</p>
              <p className="text-[11px] text-[#64748b]">Try with pre-loaded transactions and groups</p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleDemoSignIn}
          >
            Open Demo
          </Button>
        </div>

        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
            {authError}
          </div>
        )}

        {/* Login Form: Email & Password */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            icon={<Mail className="w-4 h-4 text-emerald-600" />}
            {...register('email')}
            error={errors.email?.message}
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-emerald-950">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Forgot?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4 text-emerald-600" />}
              {...register('password')}
              error={errors.password?.message}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            loading={submitting}
            loadingText="Signing in..."
            icon={<LogIn className="w-4 h-4" />}
          >
            Sign In with Email
          </Button>

          {/* OR Divider */}
          <div className="flex items-center gap-3 py-1" role="separator" aria-label="or">
            <div className="h-px flex-1 bg-emerald-100" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">or</span>
            <div className="h-px flex-1 bg-emerald-100" />
          </div>

          {/* Continue with Google */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full border-slate-200 text-[#0b3b2e] hover:border-slate-300 hover:bg-slate-50"
            onClick={handleGoogleSignIn}
            loading={googleSubmitting}
            loadingText="Connecting to Google..."
            icon={<GoogleIcon size={20} />}
          >
            Continue with Google
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-[#64748b]">
          Don&apos;t have an account yet?{' '}
          <Link
            href="/signup"
            className="font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
