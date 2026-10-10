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
import { Avatar } from '@/components/ui/Avatar';
import { Wallet, UserPlus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { SUPPORTED_CURRENCIES } from '@/lib/format';

const signupSchema = z
  .object({
    name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().optional(),
    currency: z.string().min(1, 'Please select your currency').default('INR'),
    monthlyBudget: z.coerce.number().positive('Budget must be positive').default(50000),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle, enableDemoMode } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      currency: 'INR',
      monthlyBudget: 50000,
      password: '',
      confirmPassword: '',
    },
  });

  const enteredName = watch('name');

  const onSubmit = async (data: SignupFormData) => {
    setSubmitting(true);
    try {
      await signUpWithEmail({
        name: data.name,
        email: data.email,
        pass: data.password,
        phone: data.phone,
        currency: data.currency,
        monthlyBudget: Number(data.monthlyBudget),
      });
      toast.success(`Welcome to ExpenseFlow, ${data.name}!`);
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      toast.error('Registration failed. Please check your credentials or try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      toast.success('Signed in with Google!');
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      const firebaseError = err as { code?: string; message?: string };
      let msg = 'Google sign up failed or canceled';
      if (firebaseError?.code === 'auth/popup-closed-by-user') {
        msg = 'Sign-up was cancelled.';
      } else if (
        firebaseError?.code === 'auth/configuration-not-found' ||
        firebaseError?.code === 'auth/operation-not-allowed'
      ) {
        msg = 'Please enable Google sign-in provider in Firebase Console.';
      }
      toast.error(msg);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-8 bg-gradient-to-br from-[#d1fae5] via-[#f0fdf4] to-[#ecfdf5]">
      <div className="w-full max-w-lg bg-white rounded-[28px] shadow-2xl border border-emerald-100 p-6 sm:p-8 my-auto">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#047857] to-[#10b981] flex items-center justify-center text-white shadow-emerald-lg mb-2.5">
            <Wallet className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-[#0b3b2e]">Create Your Account</h1>
          <p className="text-xs text-[#64748b] mt-1">
            Fill in your details to set up your personal ExpenseFlow vault
          </p>
        </div>

        {/* Live Initials Avatar Preview */}
        <div className="mb-6 p-4 bg-[#f0fdf4] border border-[#a7f3d0] rounded-2xl flex items-center gap-4">
          <Avatar
            name={enteredName || 'New User'}
            size="lg"
            className="border-2 border-white shadow-md ring-2 ring-emerald-300"
          />
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Your Unique Avatar
            </span>
            <p className="text-sm font-bold text-[#0b3b2e] truncate">
              {enteredName ? enteredName : 'Type your full name below'}
            </p>
            <p className="text-[11px] text-[#64748b]">
              Your initials are generated with a distinctive custom gradient
            </p>
          </div>
        </div>

        {/* Registration Form with All Necessary Details */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          {/* Full Name */}
          <Input
            label="Full Name"
            placeholder="e.g. Johnathan Vance"
            {...register('name')}
            error={errors.name?.message}
          />

          {/* Email Address */}
          <Input
            type="email"
            label="Email Address"
            placeholder="e.g. john@example.com"
            {...register('email')}
            error={errors.email?.message}
          />

          {/* Phone Number */}
          <Input
            type="tel"
            label="Phone Number"
            placeholder="e.g. +1 (555) 234-5678"
            {...register('phone')}
            error={errors.phone?.message}
          />

          {/* Currency and Monthly Budget grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-950 mb-1.5">
                Currency
              </label>
              <select
                {...register('currency')}
                className="w-full h-11 px-3 bg-[#f0fdf4] text-[#0b3b2e] rounded-xl border border-[#a7f3d0] text-xs font-bold"
                style={{ colorScheme: 'light' }}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} ({c.symbol.trim()}) — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-950 mb-1.5">
                Monthly Budget Target (₹)
              </label>
              <input
                type="number"
                step="500"
                placeholder="50000"
                {...register('monthlyBudget')}
                className="w-full h-11 px-3 bg-[#f0fdf4] text-[#0b3b2e] rounded-xl border border-[#a7f3d0] text-xs font-bold"
                style={{ colorScheme: 'light' }}
              />
              {errors.monthlyBudget && (
                <p className="text-xs text-red-500 mt-1">{errors.monthlyBudget.message}</p>
              )}
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
            />

            <Input
              type="password"
              label="Confirm Password"
              placeholder="••••••••"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-3"
            loading={submitting}
            loadingText="Creating account..."
            icon={<UserPlus className="w-4 h-4" />}
          >
            Create My Account
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

        <div className="mt-4 pt-3 border-t border-emerald-50">
          <p className="text-center text-xs text-[#64748b]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
