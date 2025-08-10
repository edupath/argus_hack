'use client';
import { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { app } from '../../../lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
  const auth = getAuth(app);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signUpWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore
      await createUserProfile(user.uid, {
        email: user.email,
        fullName: fullName,
        createdAt: new Date().toISOString(),
        role: 'student',
        profileComplete: false,
        // Default profile structure
        profile: {
          personal: {
            fullName: fullName,
            email: user.email,
            phone: '',
            country: '',
            dateOfBirth: ''
          },
          academic: {
            currentGPA: '',
            targetDegree: '',
            fieldOfInterest: '',
            educationLevel: '',
            testScores: []
          },
          goals: {
            targetDegree: '',
            field: [],
            timelineMonths: 12,
            budgetUSD: 0,
            visa: '',
            remoteOk: false
          },
          constraints: {
            budgetUSD: 0,
            visa: '',
            remoteOk: false,
            location: []
          },
          background: {
            education: [],
            gpaScale: 4.0,
            tests: [],
            experience: []
          },
          preferences: {
            format: [],
            location: [],
            duration: ''
          },
          eligibility: {
            meetsMinGpa: false,
            meetsLangReq: false
          },
          status: {
            stage: 'explore'
          }
        }
      });

      router.replace('/');
    } catch (error: any) {
      console.error('Sign up error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError('');
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if user profile exists, if not create one
      const profileExists = await checkUserProfile(user.uid);
      if (!profileExists) {
        await createUserProfile(user.uid, {
          email: user.email,
          fullName: user.displayName || '',
          createdAt: new Date().toISOString(),
          role: 'student',
          profileComplete: false,
          // Default profile structure
          profile: {
            personal: {
              fullName: user.displayName || '',
              email: user.email,
              phone: '',
              country: '',
              dateOfBirth: ''
            },
            academic: {
              currentGPA: '',
              targetDegree: '',
              fieldOfInterest: '',
              educationLevel: '',
              testScores: []
            },
            goals: {
              targetDegree: '',
              field: [],
              timelineMonths: 12,
              budgetUSD: 0,
              visa: '',
              remoteOk: false
            },
            constraints: {
              budgetUSD: 0,
              visa: '',
              remoteOk: false,
              location: []
            },
            background: {
              education: [],
              gpaScale: 4.0,
              tests: [],
              experience: []
            },
            preferences: {
              format: [],
              location: [],
              duration: ''
            },
            eligibility: {
              meetsMinGpa: false,
              meetsLangReq: false
            },
            status: {
              stage: 'explore'
            }
          }
        });
      }

      router.replace('/');
    } catch (error: any) {
      console.error('Google sign in error:', error);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (userId: string, profileData: any) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...profileData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  };

  const checkUserProfile = async (userId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/api/profile/${userId}`);
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-10 w-[600px] h-[600px] rounded-full blur-3xl opacity-30 bg-secondary" />
        <div className="absolute -bottom-10 -right-10 w-[500px] h-[500px] rounded-full blur-3xl opacity-20 bg-accent" />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-4">
        <div className="glass rounded-2xl p-8 border border-white/10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-white/60">Join Argus Admissions to start your journey</p>
          </div>

          {/* Form */}
          <form onSubmit={signUpWithEmail} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full input"
                  placeholder="Enter your full name"
                  required
                />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full input"
                  placeholder="Enter your email"
                  required
                />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full input"
                  placeholder="Create a password"
                  required
                />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full input"
                  placeholder="Confirm your password"
                  required
                />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-white/10" />
            <span className="px-4 text-white/40 text-sm">or</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          {/* Google Sign In */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg glass border border-white/10 hover:border-primary/30 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-xl">🔍</span>
              <span>Continue with Google</span>
            </div>
          </button>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-white/60">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-primary hover:text-primary/80 transition-colors font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 