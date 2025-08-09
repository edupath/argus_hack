'use client';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';

export default function SearchPage() {
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
    <DashboardLayout currentPage="search" pageTitle="Program Search" user={user}>
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">Program Search</h2>
        <div className="glass rounded-xl p-6 border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm text-white/80 mb-2">Degree Type</label>
              <select className="w-full input">
                <option>All Degrees</option>
                <option>Bachelor's</option>
                <option>Master's</option>
                <option>PhD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/80 mb-2">Field of Study</label>
              <select className="w-full input">
                <option>All Fields</option>
                <option>Computer Science</option>
                <option>Data Science</option>
                <option>Business</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/80 mb-2">Budget Range</label>
              <select className="w-full input">
                <option>Any Budget</option>
                <option>$0 - $20,000</option>
                <option>$20,000 - $40,000</option>
                <option>$40,000+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/80 mb-2">Format</label>
              <select className="w-full input">
                <option>All Formats</option>
                <option>On-campus</option>
                <option>Online</option>
                <option>Hybrid</option>
              </select>
            </div>
          </div>
          <div className="text-white/60">Search results will appear here...</div>
        </div>
      </div>
    </DashboardLayout>
  );
} 