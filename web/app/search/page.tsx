'use client';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';

interface Program {
  id: string;
  university: string;
  name: string;
  field: string[];
  degree: string;
  location: string;
  tuitionUsd: number;
  format: string[];
  description: string;
}

export default function SearchPage() {
  const auth = getAuth(app);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [degreeFilter, setDegreeFilter] = useState('All Degrees');
  const [fieldFilter, setFieldFilter] = useState('All Fields');
  const [budgetFilter, setBudgetFilter] = useState('Any Budget');
  const [formatFilter, setFormatFilter] = useState('All Formats');
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique values for filter options
  const allFields = Array.from(new Set(programs.flatMap(p => p.field))).sort();
  const allDegrees = Array.from(new Set(programs.map(p => p.degree))).sort();
  const allFormats = Array.from(new Set(programs.flatMap(p => p.format))).sort();

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

  // Fetch programs on component mount
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/program-matches/all');
        if (response.ok) {
          const data = await response.json();
          setPrograms(data.programs || []);
          setFilteredPrograms(data.programs || []);
        }
      } catch (error) {
        console.error('Error fetching programs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (authReady && user) {
      fetchPrograms();
    }
  }, [authReady, user]);

  // Apply filters
  useEffect(() => {
    let filtered = programs;

    // Search query filter
    if (searchQuery) {
      filtered = filtered.filter(program =>
        program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.field.some(field => field.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Degree filter
    if (degreeFilter !== 'All Degrees') {
      filtered = filtered.filter(program => program.degree === degreeFilter);
    }

    // Field filter
    if (fieldFilter !== 'All Fields') {
      filtered = filtered.filter(program => program.field.includes(fieldFilter));
    }

    // Budget filter
    if (budgetFilter !== 'Any Budget') {
      const [min, max] = budgetFilter.split(' - ').map(s => 
        s.replace('$', '').replace(',', '').replace('+', '')
      );
      if (max === '') {
        // $40,000+ case
        filtered = filtered.filter(program => program.tuitionUsd >= parseInt(min));
      } else {
        filtered = filtered.filter(program => 
          program.tuitionUsd >= parseInt(min) && program.tuitionUsd <= parseInt(max)
        );
      }
    }

    // Format filter
    if (formatFilter !== 'All Formats') {
      const formatMap: { [key: string]: string } = {
        'On-campus': 'in-person',
        'Online': 'online',
        'Hybrid': 'hybrid'
      };
      filtered = filtered.filter(program => 
        program.format.includes(formatMap[formatFilter])
      );
    }

    setFilteredPrograms(filtered);
  }, [programs, searchQuery, degreeFilter, fieldFilter, budgetFilter, formatFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDisplay = (format: string[]) => {
    return format.map(f => {
      if (f === 'in-person') return 'On-campus';
      return f.charAt(0).toUpperCase() + f.slice(1);
    }).join(', ');
  };

  if (!authReady || !user) {
    return null;
  }

  return (
    <DashboardLayout currentPage="search" pageTitle="Program Search" user={user}>
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-semibold text-white">Program Search</h2>
          <div className="text-sm text-white/60">
            {filteredPrograms.length} of {programs.length} programs
          </div>
        </div>
        
        <div className="glass rounded-xl p-6 border border-white/10 flex-shrink-0">
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search programs, universities, or fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full input text-lg"
            />
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-white/80 mb-2">Degree Type</label>
              <select 
                className="w-full input"
                value={degreeFilter}
                onChange={(e) => setDegreeFilter(e.target.value)}
              >
                <option>All Degrees</option>
                {allDegrees.map(degree => (
                  <option key={degree}>{degree}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/80 mb-2">Field of Study</label>
              <select 
                className="w-full input"
                value={fieldFilter}
                onChange={(e) => setFieldFilter(e.target.value)}
              >
                <option>All Fields</option>
                {allFields.map(field => (
                  <option key={field}>{field}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/80 mb-2">Budget Range</label>
              <select 
                className="w-full input"
                value={budgetFilter}
                onChange={(e) => setBudgetFilter(e.target.value)}
              >
                <option>Any Budget</option>
                <option>$0 - $20,000</option>
                <option>$20,000 - $40,000</option>
                <option>$40,000+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/80 mb-2">Format</label>
              <select 
                className="w-full input"
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
              >
                <option>All Formats</option>
                <option>On-campus</option>
                <option>Online</option>
                <option>Hybrid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto mt-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-white/60">Loading programs...</div>
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-white/60">No programs match your criteria</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredPrograms.map((program) => (
                <div key={program.id} className="glass rounded-xl p-6 border border-white/10 hover:border-primary/30 transition-all duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{program.name}</h3>
                      <p className="text-white/60 text-sm">{program.university}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-primary font-semibold">{formatCurrency(program.tuitionUsd)}</div>
                      <div className="text-white/40 text-xs">{program.location}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded">
                      {program.degree}
                    </span>
                    {program.field.map(field => (
                      <span key={field} className="px-2 py-1 bg-secondary/20 text-white/80 text-xs rounded">
                        {field}
                      </span>
                    ))}
                    <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded">
                      {formatDisplay(program.format)}
                    </span>
                  </div>
                  
                  <p className="text-white/70 text-sm mb-4">{program.description}</p>
                  
                  <button 
                    onClick={() => {
                      // TODO: Implement program selection/application creation
                      console.log('Selected program:', program);
                    }}
                    className="w-full px-4 py-2 rounded btn btn-primary text-sm"
                  >
                    Apply to Program
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 