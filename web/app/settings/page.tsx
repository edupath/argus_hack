'use client';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';

export default function SettingsPage() {
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
    <DashboardLayout currentPage="settings" pageTitle="Settings" user={user}>
      <div className="glass rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-semibold text-white mb-6">Settings</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Account Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/80 mb-2">Email</label>
                <input className="w-full input" value={user.email} disabled />
              </div>
              <button className="px-4 py-2 rounded btn btn-secondary">Change Password</button>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-white">Email notifications</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-white">Application deadline reminders</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-white">New program matches</span>
              </label>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Theme</h3>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 rounded btn btn-primary">Dark Mode</button>
              <button className="px-4 py-2 rounded btn glass">Light Mode</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 