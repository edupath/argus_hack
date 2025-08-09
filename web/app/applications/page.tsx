'use client';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';

export default function ApplicationsPage() {
  const auth = getAuth(app);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (authReady && !user) {
      router.replace('/sign-in');
    }
  }, [authReady, user, router]);

  if (!authReady || !user) {
    return null;
  }

  return (
    <DashboardLayout currentPage="applications" pageTitle="Applications" user={user}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-white">Applications</h2>
          <button className="px-4 py-2 rounded btn btn-primary">+ New Application</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4 border border-white/10 hover:border-primary/30 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">MS Data Science</h3>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Submitted</span>
            </div>
            <div className="text-sm text-white/60 mb-2">Stanford University</div>
            <div className="text-xs text-white/40">Deadline: Dec 15, 2024</div>
          </div>
          <div className="glass rounded-xl p-4 border border-white/10 hover:border-primary/30 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">MBA</h3>
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">In Progress</span>
            </div>
            <div className="text-sm text-white/60 mb-2">MIT Sloan</div>
            <div className="text-xs text-white/40">Deadline: Jan 10, 2025</div>
          </div>
          <div className="glass rounded-xl p-4 border border-white/10 hover:border-primary/30 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">MS Computer Science</h3>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">Reviewed</span>
            </div>
            <div className="text-sm text-white/60 mb-2">UC Berkeley</div>
            <div className="text-xs text-white/40">Deadline: Dec 1, 2024</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 