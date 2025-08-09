'use client';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../lib/firebase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../components/DashboardLayout';

type Msg = { role: 'user' | 'assistant'; content: string };
type ChatMode = 'counseling' | 'application' | 'interview';

interface UserProfile {
  userId: string;
  email: string;
  fullName: string;
  createdAt: string;
  role: string;
  profileComplete: boolean;
  profile: {
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
    goals: {
      targetDegree: string;
      field: string[];
      timelineMonths: number;
      budgetUSD: number;
      visa: string;
      remoteOk: boolean;
    };
    constraints: {
      budgetUSD: number;
      visa: string;
      remoteOk: boolean;
      location: string[];
    };
    background: {
      education: string[];
      gpaScale: number;
      tests: any[];
      experience: any[];
    };
    preferences: {
      format: string[];
      location: string[];
      duration: string;
    };
    eligibility: {
      meetsMinGpa: boolean;
      meetsLangReq: boolean;
    };
    status: {
      stage: string;
    };
  };
}

interface Application {
  id: string;
  studentId: string;
  universityId: string;
  programName: string;
  universityName: string;
  status: 'draft' | 'submitted' | 'in_progress' | 'reviewed' | 'accepted' | 'rejected';
  deadline: string;
  createdAt: string;
  updatedAt: string;
}

interface RecentActivity {
  id: string;
  userId: string;
  type: 'profile_update' | 'application_submitted' | 'interview_completed' | 'program_saved';
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

export default function Page() {
  const auth = getAuth(app);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [mode, setMode] = useState<ChatMode>('counseling');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: 'Hi! How can I help with your university plans today?' }]);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real data from database
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [programMatches, setProgramMatches] = useState<any[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (authReady && !user && !showLoading) {
      router.replace('/sign-in');
    }
  }, [authReady, user, router, showLoading]);

  // Fetch user data when user is authenticated
  useEffect(() => {
    if (user && authReady) {
      fetchUserData();
    }
  }, [user, authReady]);

  const fetchUserData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch user profile
      const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/api/profile/${user.uid}`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setUserProfile(profileData.profile);
      }

      // Fetch applications
      const applicationsResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/api/applications?userId=${user.uid}`);
      if (applicationsResponse.ok) {
        const applicationsData = await applicationsResponse.json();
        setApplications(applicationsData.applications || []);
      }

      // Fetch recent activity
      const activityResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/api/activity?userId=${user.uid}`);
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData.activities || []);
      }

      // Fetch program matches (based on user profile)
      if (userProfile) {
        const matchesResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/api/program-matches?userId=${user.uid}`);
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json();
          setProgramMatches(matchesData.matches || []);
        }
      }

      // Fetch pending questions
      const questionsResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/api/pending-questions?userId=${user.uid}`);
      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        setPendingQuestions(questionsData.questions || []);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!input.trim()) return;
    
    const next: Msg[] = [...messages, { role: 'user' as const, content: input }];
    setMessages(next);
    setInput('');
    setIsTyping(true);
    
    console.log('[WEB] sending', { mode, last: input });
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/api/chat`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ mode, messages: next }) 
      });
      const json = await res.json();
      console.log('[WEB] got', json);
      setMessages([...next, { role: 'assistant' as const, content: json.response }]);
    } catch (e) {
      console.error('[WEB] error', e);
      setMessages([...next, { role: 'assistant' as const, content: 'Hmm, something went wrong. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCardClick = (cardType: string) => {
    switch (cardType) {
      case 'applications':
        router.push('/applications');
        break;
      case 'profile':
        router.push('/profile');
        break;
      case 'questions':
        setMode('interview');
        break;
      case 'programs':
        router.push('/search');
        break;
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push('/search');
    }
  };

  // Calculate profile completeness percentage
  const calculateProfileCompleteness = () => {
    if (!userProfile) return 0;
    
    const profile = userProfile.profile;
    let completedFields = 0;
    let totalFields = 0;

    // Personal info
    totalFields += 5;
    if (profile.personal.fullName) completedFields++;
    if (profile.personal.email) completedFields++;
    if (profile.personal.phone) completedFields++;
    if (profile.personal.country) completedFields++;
    if (profile.personal.dateOfBirth) completedFields++;

    // Academic info
    totalFields += 5;
    if (profile.academic.currentGPA) completedFields++;
    if (profile.academic.targetDegree) completedFields++;
    if (profile.academic.fieldOfInterest) completedFields++;
    if (profile.academic.educationLevel) completedFields++;
    if (profile.academic.testScores.length > 0) completedFields++;

    // Goals
    totalFields += 6;
    if (profile.goals.targetDegree) completedFields++;
    if (profile.goals.field.length > 0) completedFields++;
    if (profile.goals.timelineMonths) completedFields++;
    if (profile.goals.budgetUSD > 0) completedFields++;
    if (profile.goals.visa) completedFields++;
    if (profile.goals.remoteOk !== undefined) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  };

  // Get active applications count
  const getActiveApplicationsCount = () => {
    return applications.filter(app => 
      ['draft', 'submitted', 'in_progress', 'reviewed'].includes(app.status)
    ).length;
  };

  // Get top program matches
  const getTopProgramMatches = () => {
    return programMatches.slice(0, 2);
  };

  // Get recent activity items
  const getRecentActivityItems = () => {
    return recentActivity.slice(0, 3);
  };

  if (showLoading || !authReady) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-20 -left-10 w-[600px] h-[600px] rounded-full blur-3xl opacity-30 bg-secondary" />
          <div className="absolute -bottom-10 -right-10 w-[500px] h-[500px] rounded-full blur-3xl opacity-20 bg-accent" />
        </div>
        <div className="relative flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-28 h-28 rounded-full border border-white/10 glass grid place-items-center shadow-glow">
              <div className="w-16 h-16 rounded-full border-2 border-transparent border-t-primary animate-spin" />
            </div>
            <div className="absolute inset-0 animate-pulse pointer-events-none" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold tracking-wide">Argus Admissions</div>
            <div className="text-white/60 mt-1">Checking your session...</div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const profileCompleteness = calculateProfileCompleteness();
  const activeApplicationsCount = getActiveApplicationsCount();
  const topProgramMatches = getTopProgramMatches();
  const recentActivityItems = getRecentActivityItems();

  return (
    <DashboardLayout currentPage="home" pageTitle="Dashboard" user={user}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            onClick={() => handleCardClick('applications')}
            className="glass rounded-xl p-4 border border-white/10 hover:border-primary/30 transition-all duration-300 cursor-pointer hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{activeApplicationsCount}</div>
                <div className="text-sm text-white/60">Active Applications</div>
              </div>
              <div className="text-2xl">📝</div>
            </div>
          </div>
          <div 
            onClick={() => handleCardClick('profile')}
            className="glass rounded-xl p-4 border border-white/10 hover:border-primary/30 transition-all duration-300 cursor-pointer hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{profileCompleteness}%</div>
                <div className="text-sm text-white/60">Profile Complete</div>
              </div>
              <div className="text-2xl">👤</div>
            </div>
            <div className="mt-2 w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${profileCompleteness}%` }}
              ></div>
            </div>
          </div>
          <div 
            onClick={() => handleCardClick('questions')}
            className="glass rounded-xl p-4 border border-white/10 hover:border-primary/30 transition-all duration-300 cursor-pointer hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{pendingQuestions.length}</div>
                <div className="text-sm text-white/60">Pending Questions</div>
              </div>
              <div className="text-2xl">❓</div>
            </div>
          </div>
          <div 
            onClick={() => handleCardClick('programs')}
            className="glass rounded-xl p-4 border border-white/10 hover:border-primary/30 transition-all duration-300 cursor-pointer hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{programMatches.length}</div>
                <div className="text-sm text-white/60">Program Matches</div>
              </div>
              <div className="text-2xl">🎓</div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2 glass rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">AI Counselor</h2>
              <select 
                className="bg-black/30 border border-white/10 rounded px-3 py-1 text-white text-sm"
                value={mode} 
                onChange={(e) => setMode(e.target.value as ChatMode)}
              >
                <option value="counseling">Counseling</option>
                <option value="application">Application</option>
                <option value="interview">Interview</option>
              </select>
            </div>
            
            <div className="h-80 overflow-y-auto space-y-3 mb-4 scroll-smooth">
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                  <div className={`inline-block px-3 py-2 rounded-lg max-w-xs lg:max-w-md ${
                    m.role === 'user' ? 'bg-primary text-black' : 'bg-secondary/70 text-white'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="text-left">
                  <div className="inline-block px-3 py-2 rounded-lg bg-secondary/70 text-white">
                    <div className="flex items-center gap-1">
                      <span>AI is typing</span>
                      <div className="flex gap-1">
                        <span className="w-1 h-1 bg-white rounded-full animate-bounce"></span>
                        <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                        <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && send()}
                className="flex-1 input" 
                placeholder="Type your message..." 
                disabled={isTyping}
              />
              <button 
                onClick={send} 
                disabled={isTyping || !input.trim()}
                className="px-4 py-2 rounded btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Program Search Widget */}
            <div className="glass rounded-xl p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">Quick Search</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input 
                    className="flex-1 input text-sm" 
                    placeholder="Search programs..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button 
                    onClick={handleSearch}
                    className="px-3 py-2 rounded btn btn-secondary text-sm"
                  >
                    🔍
                  </button>
                </div>
                <div className="text-xs text-white/60">Top matches:</div>
                <div className="space-y-2">
                  {topProgramMatches.length > 0 ? (
                    topProgramMatches.map((program, index) => (
                      <div key={index} className="p-2 bg-black/20 rounded border border-white/5 hover:border-primary/30 transition-colors cursor-pointer">
                        <div className="font-medium text-white text-sm">{program.name}</div>
                        <div className="text-xs text-white/60">{program.university}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 bg-black/20 rounded border border-white/5">
                      <div className="text-xs text-white/60">No matches yet</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass rounded-xl p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivityItems.length > 0 ? (
                  recentActivityItems.map((activity, index) => (
                    <div key={activity.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'application_submitted' ? 'bg-primary' :
                        activity.type === 'profile_update' ? 'bg-accent' :
                        'bg-secondary'
                      }`}></div>
                      <div>
                        <div className="text-white">{activity.title}</div>
                        <div className="text-white/60 text-xs">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <div className="text-white/60 text-sm">No recent activity</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

