'use client';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';

export default function ProfilePage() {
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
    <DashboardLayout currentPage="profile" pageTitle="Profile" user={user}>
      <div className="glass rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-semibold text-white mb-6">Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/80 mb-2">Full Name</label>
                <input className="w-full input" placeholder="Enter your full name" />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-2">Email</label>
                <input className="w-full input" value={user.email} disabled />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-2">Phone</label>
                <input className="w-full input" placeholder="Enter your phone number" />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Academic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/80 mb-2">Current GPA</label>
                <input className="w-full input" placeholder="e.g., 3.8" />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-2">Target Degree</label>
                <select className="w-full input">
                  <option>Select degree type</option>
                  <option>Bachelor's</option>
                  <option>Master's</option>
                  <option>PhD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-2">Field of Interest</label>
                <input className="w-full input" placeholder="e.g., Computer Science" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button className="px-6 py-2 rounded btn btn-primary">Save Changes</button>
        </div>
      </div>
    </DashboardLayout>
  );
} 