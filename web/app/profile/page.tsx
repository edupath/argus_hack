'use client';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';

interface ProfileData {
  personal: {
    firstName: string;
    middleName: string;
    lastName: string;
    dateOfBirth: string;
    email: string;
    phone: string;
    mailingAddress: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    gender: string;
    pronouns: string;
    birthCountry: string;
    citizenshipStatus: string;
  };
  academic: {
    currentGPA: string;
    gpaScale: number;
    targetDegree: string;
    fieldOfInterest: string;
    educationLevel: string;
    testScores: {
      sat: {
        total: number;
        math: number;
        reading: number;
        writing: number;
      };
      act: {
        composite: number;
        math: number;
        english: number;
        reading: number;
        science: number;
      };
      toefl: number;
      ielts: number;
      gre: {
        verbal: number;
        quantitative: number;
        analytical: number;
      };
      gmat: number;
    };
    transcript: {
      fileUrl: string;
      fileName: string;
      uploadedAt: string;
    };
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
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      email: '',
      phone: '',
      mailingAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      gender: '',
      pronouns: '',
      birthCountry: '',
      citizenshipStatus: ''
    },
    academic: {
      currentGPA: '',
      gpaScale: 4.0,
      targetDegree: '',
      fieldOfInterest: '',
      educationLevel: '',
      testScores: {
        sat: { total: 0, math: 0, reading: 0, writing: 0 },
        act: { composite: 0, math: 0, english: 0, reading: 0, science: 0 },
        toefl: 0,
        ielts: 0,
        gre: { verbal: 0, quantitative: 0, analytical: 0 },
        gmat: 0
      },
      transcript: {
        fileUrl: '',
        fileName: '',
        uploadedAt: ''
      }
    }
  });

  // Load profile data
  const loadProfile = async (userId: string) => {
    try {
      console.log('[FRONTEND] loadProfile called with userId:', userId);
      console.log('[FRONTEND] About to fetch from:', `/api/profile/${userId}?t=${Date.now()}`);
      setLoading(true);
      const response = await fetch(`/api/profile/${userId}?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      console.log('Profile API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Profile API response data:', data);
        
        if (data.success && data.profile) {
          console.log('Setting profile with data:', data.profile);
          console.log('Profile structure:', JSON.stringify(data.profile, null, 2));
          console.log('[FRONTEND] testScores from API:', JSON.stringify(data.profile.profile?.academic?.testScores, null, 2));
          setProfile({
            personal: {
              firstName: data.profile.profile?.personal?.firstName || '',
              middleName: data.profile.profile?.personal?.middleName || '',
              lastName: data.profile.profile?.personal?.lastName || '',
              dateOfBirth: data.profile.profile?.personal?.dateOfBirth || '',
              email: data.profile.profile?.personal?.email || '',
              phone: data.profile.profile?.personal?.phone || '',
              mailingAddress: {
                street: data.profile.profile?.personal?.mailingAddress?.street || '',
                city: data.profile.profile?.personal?.mailingAddress?.city || '',
                state: data.profile.profile?.personal?.mailingAddress?.state || '',
                zipCode: data.profile.profile?.personal?.mailingAddress?.zipCode || '',
                country: data.profile.profile?.personal?.mailingAddress?.country || ''
              },
              gender: data.profile.profile?.personal?.gender || '',
              pronouns: data.profile.profile?.personal?.pronouns || '',
              birthCountry: data.profile.profile?.personal?.birthCountry || '',
              citizenshipStatus: data.profile.profile?.personal?.citizenshipStatus || ''
            },
            academic: {
              currentGPA: data.profile.profile?.academic?.currentGPA || '',
              gpaScale: data.profile.profile?.academic?.gpaScale || 4.0,
              targetDegree: data.profile.profile?.academic?.targetDegree || '',
              fieldOfInterest: data.profile.profile?.academic?.fieldOfInterest || '',
              educationLevel: data.profile.profile?.academic?.educationLevel || '',
              testScores: data.profile.profile?.academic?.testScores || {
                sat: { total: 0, math: 0, reading: 0, writing: 0 },
                act: { composite: 0, math: 0, english: 0, reading: 0, science: 0 },
                toefl: 0,
                ielts: 0,
                gre: { verbal: 0, quantitative: 0, analytical: 0 },
                gmat: 0
              },
              transcript: data.profile.profile?.academic?.transcript || {
                fileUrl: '',
                fileName: '',
                uploadedAt: ''
              }
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
  const handlePersonalChange = (field: keyof ProfileData['personal'], value: string | ProfileData['personal']['mailingAddress']) => {
    setProfile(prev => ({
      ...prev,
      personal: {
        ...prev.personal,
        [field]: value
      }
    }));
  };

  const handleMailingAddressChange = (field: keyof ProfileData['personal']['mailingAddress'], value: string) => {
    setProfile(prev => ({
      ...prev,
      personal: {
        ...prev.personal,
        mailingAddress: {
          ...prev.personal.mailingAddress,
          [field]: value
        }
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
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white">Profile</h2>
          <div className="glass rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-center h-32">
              <div className="text-white">Loading profile...</div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="profile" pageTitle="Profile" user={user}>
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">Profile</h2>
        
        <div className="glass rounded-xl p-6 border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm text-white/80 mb-2">First Name</label>
                  <input 
                    className="w-full input" 
                    placeholder="First name"
                    value={profile.personal.firstName}
                    onChange={(e) => handlePersonalChange('firstName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-2">Middle Name</label>
                  <input 
                    className="w-full input" 
                    placeholder="Middle name"
                    value={profile.personal.middleName}
                    onChange={(e) => handlePersonalChange('middleName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-2">Last Name</label>
                  <input 
                    className="w-full input" 
                    placeholder="Last name"
                    value={profile.personal.lastName}
                    onChange={(e) => handlePersonalChange('lastName', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-2">Date of Birth</label>
                <input 
                  type="date"
                  className="w-full input" 
                  value={profile.personal.dateOfBirth}
                  onChange={(e) => handlePersonalChange('dateOfBirth', e.target.value)}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-white/80 mb-2">Gender</label>
                  <select 
                    className="w-full input"
                    value={profile.personal.gender}
                    onChange={(e) => handlePersonalChange('gender', e.target.value)}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-2">Pronouns</label>
                  <input 
                    className="w-full input" 
                    placeholder="e.g., He/Him, She/Her"
                    value={profile.personal.pronouns}
                    onChange={(e) => handlePersonalChange('pronouns', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-white/80 mb-2">Birth Country</label>
                  <input 
                    className="w-full input" 
                    placeholder="Country of birth"
                    value={profile.personal.birthCountry}
                    onChange={(e) => handlePersonalChange('birthCountry', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-2">Citizenship Status</label>
                  <select 
                    className="w-full input"
                    value={profile.personal.citizenshipStatus}
                    onChange={(e) => handlePersonalChange('citizenshipStatus', e.target.value)}
                  >
                    <option value="">Select status</option>
                    <option value="US Citizen">US Citizen</option>
                    <option value="Permanent Resident">Permanent Resident</option>
                    <option value="International Student">International Student</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div>
                <h4 className="text-md font-medium text-white/90 mb-3">Mailing Address</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/80 mb-2">Street Address</label>
                    <input 
                      className="w-full input" 
                      placeholder="Enter street address"
                      value={profile.personal.mailingAddress.street}
                      onChange={(e) => handleMailingAddressChange('street', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-sm text-white/80 mb-2">City</label>
                      <input 
                        className="w-full input" 
                        placeholder="City"
                        value={profile.personal.mailingAddress.city}
                        onChange={(e) => handleMailingAddressChange('city', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/80 mb-2">State</label>
                      <input 
                        className="w-full input" 
                        placeholder="State"
                        value={profile.personal.mailingAddress.state}
                        onChange={(e) => handleMailingAddressChange('state', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/80 mb-2">ZIP Code</label>
                      <input 
                        className="w-full input" 
                        placeholder="ZIP Code"
                        value={profile.personal.mailingAddress.zipCode}
                        onChange={(e) => handleMailingAddressChange('zipCode', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-white/80 mb-2">Country</label>
                    <input 
                      className="w-full input" 
                      placeholder="Country"
                      value={profile.personal.mailingAddress.country}
                      onChange={(e) => handleMailingAddressChange('country', e.target.value)}
                    />
                  </div>
                </div>
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
      </div>
    </DashboardLayout>
  );
} 