'use client';
import { useEffect, useState, useRef } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';

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
  chatHistory?: Msg[];
  isActive?: boolean;
}

type Msg = { role: 'user' | 'assistant'; content: string };

interface University {
  id: string;
  name: string;
  programs: Program[];
}

interface Program {
  id: string;
  name: string;
  degree: string;
  deadline: string;
}

export default function ApplicationsPage() {
  const auth = getAuth(app);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUniversitySelection, setShowUniversitySelection] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [currentApplication, setCurrentApplication] = useState<Application | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Dummy universities and programs
  const universities: University[] = [
    {
      id: 'stanford',
      name: 'Stanford University',
      programs: [
        { id: 'stanford-cs', name: 'Computer Science', degree: 'Master of Science', deadline: '2024-12-15' },
        { id: 'stanford-ds', name: 'Data Science', degree: 'Master of Science', deadline: '2024-12-01' },
        { id: 'stanford-mba', name: 'Business Administration', degree: 'Master of Business Administration', deadline: '2025-01-10' }
      ]
    },
    {
      id: 'mit',
      name: 'Massachusetts Institute of Technology',
      programs: [
        { id: 'mit-cs', name: 'Computer Science', degree: 'Master of Science', deadline: '2024-12-01' },
        { id: 'mit-engineering', name: 'Engineering', degree: 'Master of Engineering', deadline: '2024-12-15' }
      ]
    },
    {
      id: 'berkeley',
      name: 'University of California, Berkeley',
      programs: [
        { id: 'berkeley-cs', name: 'Computer Science', degree: 'Master of Science', deadline: '2024-12-01' },
        { id: 'berkeley-ds', name: 'Data Science', degree: 'Master of Science', deadline: '2024-12-15' }
      ]
    }
  ];

  // Fetch applications for the current user
  const handleNewApplication = async () => {
    // If there's a current application in draft status, save its progress and mark as inactive
    if (currentApplication && currentApplication.status === 'draft') {
      try {
        await updateApplicationChat(currentApplication.id, messages);
        // Mark as inactive
        await fetch(`http://localhost:3001/api/applications/${currentApplication.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false })
        });
        console.log('Draft application progress saved and marked as inactive');
      } catch (error) {
        console.error('Error saving draft progress:', error);
      }
    }
    
    // Close current application and reset state
    setCurrentApplication(null);
    setMessages([]);
    setInput('');
    setShowUniversitySelection(true);
    
    // Clear localStorage
    if (user) {
      localStorage.removeItem(`activeApplication_${user.uid}`);
    }
  };

  const fetchApplications = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/applications?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        const fetchedApplications = data.applications || [];
        setApplications(fetchedApplications);
        
        console.log('Fetched applications:', fetchedApplications);
        
        // Restore last active application if it exists
        const lastActiveApplication = fetchedApplications.find((app: Application) => app.isActive && app.status === 'draft');
        console.log('Last active application:', lastActiveApplication);
        
        if (lastActiveApplication) {
          setCurrentApplication(lastActiveApplication);
          setMessages(lastActiveApplication.chatHistory || []);
          setInput('');
          console.log('Restored active application:', lastActiveApplication.id);
        } else {
          // Fallback: try to restore from localStorage
          const storedActiveId = localStorage.getItem(`activeApplication_${userId}`);
          if (storedActiveId) {
            const storedApplication = fetchedApplications.find((app: Application) => app.id === storedActiveId && app.status === 'draft');
            if (storedApplication) {
              setCurrentApplication(storedApplication);
              setMessages(storedApplication.chatHistory || []);
              setInput('');
              console.log('Restored from localStorage:', storedApplication.id);
            }
          }
        }
      } else {
        console.error('Failed to fetch applications:', response.status);
        // Try to restore from localStorage even if API fails
        const storedActiveId = localStorage.getItem(`activeApplication_${userId}`);
        if (storedActiveId) {
          console.log('API failed, trying to restore from localStorage:', storedActiveId);
          // We can't restore the full application without the API, but we can show a message
          setMessages([{ 
            role: 'assistant', 
            content: 'Your previous application session was interrupted. Please refresh the page or start a new application.' 
          }]);
        }
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!input.trim() || !currentApplication) return;
    
    const next: Msg[] = [...messages, { role: 'user' as const, content: input }];
    setMessages(next);
    setInput('');
    setIsTyping(true);
    
    console.log('[WEB] sending application chat', { 
      last: input, 
      applicationId: currentApplication.id,
      currentApplication: currentApplication,
      hasId: !!currentApplication.id 
    });
    try {
              const res = await fetch(`http://localhost:3001/api/chat`, {  
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          mode: 'application', 
          messages: next,
          userId: user.uid,
          applicationId: currentApplication.id,
          university: currentApplication.universityName,
          program: currentApplication.programName
        }) 
      });
      const json = await res.json();
      console.log('[WEB] got', json);
      console.log('[WEB] response content:', json.response);
      console.log('[WEB] applicationComplete:', json.applicationComplete);
      
      const newMessages = [...next, { role: 'assistant' as const, content: json.response }];
      setMessages(newMessages);
      
      // Update application with new chat history
      await updateApplicationChat(currentApplication.id, newMessages);
      
      // Check if application is complete
      if (json.applicationComplete) {
        // Add a message asking if they want to submit
        const finalMessages = [...newMessages, { 
          role: 'assistant' as const, 
          content: 'Great! I have all the information I need. Would you like to submit your application now?' 
        }];
        setMessages(finalMessages);
        await updateApplicationChat(currentApplication.id, finalMessages);
      }
    } catch (e) {
      console.error('[WEB] error', e);
      setMessages([...next, { role: 'assistant' as const, content: 'Hmm, something went wrong. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const updateApplicationChat = async (applicationId: string, chatHistory: Msg[]) => {
    try {
      const response = await fetch(`http://localhost:3001/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory })
      });
      
      if (response.ok) {
        // Update local state
        setApplications(prev => prev.map(app => 
          app.id === applicationId 
            ? { ...app, chatHistory, updatedAt: new Date().toISOString() }
            : app
        ));
      }
    } catch (error) {
      console.error('Error updating application chat:', error);
    }
  };

  const submitApplication = async (applicationId: string) => {
    if (!user || !currentApplication) return;
    
    try {
      // Get user profile
      const profileResponse = await fetch(`http://localhost:3001/api/profile/${user.uid}`);
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const profileData = await profileResponse.json();
      
      // Extract interview responses from chat history
      const interviewResponses = extractInterviewResponses(messages);
      
      // Submit application with all required data
      const response = await fetch(`http://localhost:3001/api/application/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: currentApplication.id,
          studentId: user.uid,
          universityId: currentApplication.universityId,
          profileSnapshot: profileData.profile,
          transcript: {}, // TODO: Add transcript upload functionality
          interviewResponses: interviewResponses
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update local state
        setApplications(prev => prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: 'submitted', isActive: false, updatedAt: new Date().toISOString() }
            : app
        ));
        
        // Close the chat interface
        setCurrentApplication(null);
        setMessages([]);
        setInput('');
        
        // Clear localStorage
        if (user) {
          localStorage.removeItem(`activeApplication_${user.uid}`);
        }
        
        console.log('Application submitted successfully:', result);
      } else {
        throw new Error('Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      // Show error message to user
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error submitting your application. Please try again.' 
      }]);
    }
  };

  // Helper function to extract interview responses from chat history
  const extractInterviewResponses = (chatMessages: Msg[]): Array<{ question: string; answer: string }> => {
    const responses: Array<{ question: string; answer: string }> = [];
    
    for (let i = 0; i < chatMessages.length; i++) {
      const message = chatMessages[i];
      if (message.role === 'assistant' && message.content && i + 1 < chatMessages.length) {
        const nextMessage = chatMessages[i + 1];
        if (nextMessage.role === 'user' && nextMessage.content) {
          // This is a question-answer pair
          responses.push({
            question: message.content,
            answer: nextMessage.content
          });
        }
      }
    }
    
    return responses;
  };

  const createNewApplication = async () => {
    if (!selectedUniversity || !selectedProgram || !user) return;
    
    // Check for existing application to the same program at the same university
    const existingApplication = applications.find(app => 
      app.universityId === selectedUniversity.id && 
      app.programName === selectedProgram.name &&
      app.studentId === user.uid
    );
    
    if (existingApplication) {
      // If application exists, open it instead of creating a new one
      setCurrentApplication(existingApplication);
      setMessages(existingApplication.chatHistory || []);
      setInput('');
      setShowUniversitySelection(false);
      setSelectedUniversity(null);
      setSelectedProgram(null);
      
      // Show a message to the user
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `You already have an application for ${selectedProgram.name} at ${selectedUniversity.name}. I've opened it for you to continue.` 
      }]);
      return;
    }
    
    try {
      const newApplication: Partial<Application> = {
        studentId: user.uid,
        universityId: selectedUniversity.id,
        programName: selectedProgram.name,
        universityName: selectedUniversity.name,
        status: 'draft',
        deadline: selectedProgram.deadline,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chatHistory: [],
        isActive: true
      };

      const response = await fetch(`http://localhost:3001/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApplication)
      });

      if (response.ok) {
        const data = await response.json();
        const createdApplication = data.application;
        
        console.log('[WEB] Created application:', createdApplication);
        console.log('[WEB] Application ID:', createdApplication.id);
        
        setApplications(prev => [...prev, createdApplication]);
        setCurrentApplication(createdApplication);
        setMessages([{ role: 'assistant', content: `Hi! I'll help you apply to ${selectedProgram.name} at ${selectedUniversity.name}. Let's start with your personal information. What's your full name?` }]);
        
        // Store in localStorage
        if (user) {
          localStorage.setItem(`activeApplication_${user.uid}`, createdApplication.id);
        }
        
        // Reset selection
        setShowUniversitySelection(false);
        setSelectedUniversity(null);
        setSelectedProgram(null);
      }
    } catch (error) {
      console.error('Error creating application:', error);
    }
  };

  const openApplication = async (application: Application) => {
    // Set all applications as inactive first
    const updatedApplications = applications.map(app => ({ ...app, isActive: false }));
    setApplications(updatedApplications);
    
    // Update the selected application as active
    const activeApplication = { ...application, isActive: true };
    setCurrentApplication(activeApplication);
    setMessages(application.chatHistory || []);
    setInput('');
    
    // Store in localStorage as backup
    if (user) {
      localStorage.setItem(`activeApplication_${user.uid}`, application.id);
    }
    
    // Update the application in the database to mark it as active
    try {
      await fetch(`http://localhost:3001/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });
      console.log('Marked application as active in database:', application.id);
    } catch (error) {
      console.error('Error updating application active status:', error);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) {
        fetchApplications(u.uid);
      }
    });
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (authReady && !user) {
      router.replace('/sign-in');
    }
  }, [authReady, user, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-green-500/20 text-green-400';
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'reviewed':
        return 'bg-blue-500/20 text-blue-400';
      case 'accepted':
        return 'bg-green-500/20 text-green-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      case 'draft':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!authReady || !user) {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="applications" pageTitle="Applications" user={user}>
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-6 flex-shrink-0">
            <h2 className="text-2xl font-semibold text-white">Applications</h2>
          </div>
          <div className="flex items-center justify-center h-32">
            <div className="text-white">Loading applications...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="applications" pageTitle="Applications" user={user}>
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-semibold text-white">Applications</h2>
          <div className="flex gap-2">
            {(showUniversitySelection || currentApplication) && (
              <button 
                onClick={async () => {
                  if (currentApplication && currentApplication.status === 'draft') {
                    await updateApplicationChat(currentApplication.id, messages);
                    // Mark as inactive
                    try {
                      await fetch(`http://localhost:3001/api/applications/${currentApplication.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isActive: false })
                      });
                    } catch (error) {
                      console.error('Error marking application as inactive:', error);
                    }
                  }
                  setCurrentApplication(null);
                  setShowUniversitySelection(false);
                  setMessages([]);
                  setInput('');
                  setSelectedUniversity(null);
                  setSelectedProgram(null);
                  
                  // Clear localStorage
                  if (user) {
                    localStorage.removeItem(`activeApplication_${user.uid}`);
                  }
                }}
                className="px-4 py-2 rounded btn btn-secondary"
              >
                ← Back to Applications
              </button>
            )}
            <button 
              onClick={() => handleNewApplication()}
              className="px-4 py-2 rounded btn btn-primary"
            >
              + New Application
            </button>
          </div>
        </div>
        
        {/* Main Content Grid */}
        <div className={`grid gap-6 flex-1 min-h-0 overflow-hidden ${
          showUniversitySelection || currentApplication 
            ? 'grid-cols-1' 
            : 'grid-cols-1 lg:grid-cols-4'
        }`} style={{ height: 'calc(100vh - 180px)' }}>
          {/* Main Content Area */}
          <div className={`flex flex-col overflow-hidden ${
            showUniversitySelection || currentApplication 
              ? 'col-span-1' 
              : 'lg:col-span-3'
          }`}>
            {showUniversitySelection && (
              <div className="glass rounded-xl p-6 border border-white/10 h-full flex flex-col overflow-hidden">
                <h3 className="text-xl font-semibold text-white mb-6">Select University & Program</h3>
                
                {!selectedUniversity ? (
                  <div className="space-y-4 flex-1 overflow-y-auto">
                    <h4 className="text-lg font-medium text-white mb-4">Choose a University:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {universities.map((university) => (
                        <div 
                          key={university.id}
                          onClick={() => setSelectedUniversity(university)}
                          className="p-4 bg-black/20 rounded border border-white/10 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                        >
                          <h5 className="font-semibold text-white mb-2">{university.name}</h5>
                          <p className="text-sm text-white/60">{university.programs.length} programs available</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 flex-1 overflow-y-auto">
                    <div className="flex items-center gap-4 mb-6">
                      <button 
                        onClick={() => setSelectedUniversity(null)}
                        className="text-white/60 hover:text-white"
                      >
                        ← Back to Universities
                      </button>
                      <h4 className="text-lg font-medium text-white">Programs at {selectedUniversity.name}:</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedUniversity.programs.map((program) => (
                        <div 
                          key={program.id}
                          onClick={() => setSelectedProgram(program)}
                          className="p-4 bg-black/20 rounded border border-white/10 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                        >
                          <h5 className="font-semibold text-white mb-2">{program.name}</h5>
                          <p className="text-sm text-white/60 mb-2">{program.degree}</p>
                          <p className="text-xs text-white/40">Deadline: {formatDate(program.deadline)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedUniversity && selectedProgram && (
                  <div className="mt-6 pt-6 border-t border-white/10 pb-4">
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-white mb-2">Selected Program:</h4>
                      <p className="text-white">{selectedProgram.name} at {selectedUniversity.name}</p>
                      <p className="text-sm text-white/60">Deadline: {formatDate(selectedProgram.deadline)}</p>
                    </div>
                    <button 
                      onClick={createNewApplication}
                      className="px-6 py-2 rounded btn btn-primary"
                    >
                      Start Application
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentApplication && (
              <div className="glass rounded-xl p-4 border border-white/10 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {currentApplication.programName} at {currentApplication.universityName}
                    </h3>
                    <p className="text-sm text-white/60">
                      Status: {currentApplication.status.charAt(0).toUpperCase() + currentApplication.status.slice(1)}
                    </p>
                  </div>
                  {currentApplication.status === 'draft' && (
                    <button 
                      onClick={() => {
                        setCurrentApplication(null);
                        setMessages([]);
                        setInput('');
                      }}
                      className="text-white/60 hover:text-white"
                    >
                      Close
                    </button>
                  )}
                </div>
                
                <div ref={chatRef} className="flex-1 overflow-y-auto space-y-3 mb-4 scroll-smooth chat-scroll min-h-0 p-2">
                  {messages.map((m, i) => (
                    <div key={`${m.role}-${i}-${m.content?.substring(0, 20)}`} className={m.role === 'user' ? 'text-right' : ''}>
                      <div className={`inline-block px-4 py-3 rounded-lg max-w-sm lg:max-w-2xl xl:max-w-3xl break-words ${
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
                          <span>Theo is typing</span>
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

                {currentApplication.status === 'draft' && (
                  <div className="flex flex-col gap-2 flex-shrink-0 mt-auto">
                    <div className="flex gap-2">
                      <input 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && send()}
                        className="flex-1 input" 
                        placeholder="Type your response..." 
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
                    
                    {/* Show submit button if application is complete */}
                    {messages.some(m => m.content && m.content.includes('Would you like to submit your application now?')) && (
                      <div className="flex justify-center pt-2">
                        <button 
                          onClick={() => submitApplication(currentApplication.id)}
                          disabled={isTyping}
                          className="px-6 py-2 rounded btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Submit Application
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!showUniversitySelection && !currentApplication && (
              <div className="glass rounded-xl p-8 border border-white/10 text-center h-full flex flex-col justify-center overflow-hidden pb-8">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-white mb-2">Ready to Apply?</h3>
                <p className="text-white/60 mb-4">Start your application journey by selecting a university and program</p>
                <button 
                  onClick={() => setShowUniversitySelection(true)}
                  className="px-6 py-2 rounded btn btn-primary"
                >
                  Start New Application
                </button>
              </div>
            )}
          </div>

          {/* Applications List - Sidebar */}
          <div className={`glass rounded-xl p-4 border border-white/10 flex flex-col overflow-hidden ${
            showUniversitySelection || currentApplication ? 'hidden' : ''
          }`}>
            <h3 className="text-lg font-semibold text-white mb-4 flex-shrink-0">My Applications</h3>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent min-h-0 pb-4">
              {applications.length === 0 ? (
                <div className="text-center">
                  <div className="text-3xl mb-3">📝</div>
                  <h4 className="text-sm font-semibold text-white mb-2">No Applications Yet</h4>
                  <p className="text-white/60 text-xs mb-3">Start your journey by creating your first application</p>
                  <button 
                    onClick={() => setShowUniversitySelection(true)}
                    className="px-4 py-2 rounded btn btn-primary text-sm"
                  >
                    Create Application
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pb-2">
                  {applications.map((application) => (
                    <div 
                      key={application.id} 
                      onClick={() => openApplication(application)}
                      className={`p-3 bg-black/20 rounded border transition-all duration-300 cursor-pointer ${
                        currentApplication?.id === application.id 
                          ? 'border-primary/50 bg-primary/10' 
                          : 'border-white/5 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white text-sm">{application.programName}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(application.status)}`}>
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1).replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-white/60 mb-1">{application.universityName}</div>
                      <div className="text-xs text-white/40">Deadline: {formatDate(application.deadline)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 