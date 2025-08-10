'use client';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';

interface ProfileData {
  personal: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
    dateOfBirth: string;
  };
  academic: {
    currentGPA: string;
    targetDegree: string;
    fieldOfInterest: string;
    educationLevel: string;
    testScores: any[];
  };
}

export default function ProfilePage() {
  const auth = getAuth(app);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    personal: {
      fullName: '',
      email: '',
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
    }
  });

  // Load profile data
  const loadProfile = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/profile/${userId}`);
      console.log('Profile API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Profile API response data:', data);
        
        if (data.success && data.profile) {
          console.log('Setting profile with data:', data.profile);
          setProfile({
            personal: {
              fullName: data.profile.profile?.personal?.fullName || '',
              email: data.profile.profile?.personal?.email || '',
              phone: data.profile.profile?.personal?.phone || '',
              country: data.profile.profile?.personal?.country || '',
              dateOfBirth: data.profile.profile?.personal?.dateOfBirth || ''
            },
            academic: {
              currentGPA: data.profile.profile?.academic?.currentGPA || '',
              targetDegree: data.profile.profile?.academic?.targetDegree || '',
              fieldOfInterest: data.profile.profile?.academic?.fieldOfInterest || '',
              educationLevel: data.profile.profile?.academic?.educationLevel || '',
              testScores: data.profile.profile?.academic?.testScores || []
            }
          });
        }
      } else {
        console.error('Profile API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save profile data
  const saveProfile = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      const saveData = {
        profile: {
          personal: profile.personal,
          academic: profile.academic
        }
      };
      console.log('Saving profile data:', saveData);
      
      const response = await fetch(`/api/profile/${user.uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      console.log('Save response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Save response data:', data);
        if (data.success) {
          alert('Profile saved successfully!');
        } else {
          alert('Failed to save profile');
        }
      } else {
        const errorData = await response.json();
        console.error('Save error response:', errorData);
        alert('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  // Handle form field changes
  const handlePersonalChange = (field: keyof ProfileData['personal'], value: string) => {
    setProfile(prev => ({
      ...prev,
      personal: {
        ...prev.personal,
        [field]: value
      }
    }));
  };

  const handleAcademicChange = (field: keyof ProfileData['academic'], value: string) => {
    setProfile(prev => ({
      ...prev,
      academic: {
        ...prev.academic,
        [field]: value
      }
    }));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) {
        loadProfile(u.uid);
      }
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

  if (loading) {
    return (
      <DashboardLayout currentPage="profile" pageTitle="Profile" user={user}>
        <div className="glass rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-center h-32">
            <div className="text-white">Loading profile...</div>
          </div>
        </div>
      </DashboardLayout>
    );
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
                <input 
                  className="w-full input" 
                  placeholder="Enter your full name"
                  value={profile.personal.fullName}
                  onChange={(e) => handlePersonalChange('fullName', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-2">Email</label>
                <input 
                  className="w-full input" 
                  value={user.email} 
                  disabled 
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-2">Phone</label>
                <input 
                  className="w-full input" 
                  placeholder="Enter your phone number"
                  value={profile.personal.phone}
                  onChange={(e) => handlePersonalChange('phone', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-2">Country</label>
                <input 
                  className="w-full input" 
                  placeholder="Enter your country"
                  value={profile.personal.country}
                  onChange={(e) => handlePersonalChange('country', e.target.value)}
                />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Academic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/80 mb-2">Current GPA</label>
                <input 
                  className="w-full input" 
                  placeholder="e.g., 3.8"
                  value={profile.academic.currentGPA}
                  onChange={(e) => handleAcademicChange('currentGPA', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-2">Target Degree</label>
                <select 
                  className="w-full input"
                  value={profile.academic.targetDegree}
                  onChange={(e) => handleAcademicChange('targetDegree', e.target.value)}
                >
                  <option value="">Select degree type</option>
                  <option value="Bachelor's">Bachelor's</option>
                  <option value="Master's">Master's</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-2">Field of Interest</label>
                <input 
                  className="w-full input" 
                  placeholder="e.g., Computer Science"
                  value={profile.academic.fieldOfInterest}
                  onChange={(e) => handleAcademicChange('fieldOfInterest', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-2">Education Level</label>
                <select 
                  className="w-full input"
                  value={profile.academic.educationLevel}
                  onChange={(e) => handleAcademicChange('educationLevel', e.target.value)}
                >
                  <option value="">Select education level</option>
                  <option value="High School">High School</option>
                  <option value="Bachelor's">Bachelor's</option>
                  <option value="Master's">Master's</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button 
            className={`px-6 py-2 rounded btn ${saving ? 'btn-disabled' : 'btn-primary'}`}
            onClick={saveProfile}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
} 