import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Home() {
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await supabase
          .from('jobs')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(3);
        setFeaturedJobs(data || []);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* 1. HERO SECTION WITH GRADIENT */}
      <div className="relative bg-gradient-to-br from-blue-700 to-indigo-800 text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Decorative background blob */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white blur-3xl"></div>
            <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full bg-blue-400 blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Find Your <span className="text-blue-200">Dream Job</span> Today
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto font-light">
            Connecting top talent with the best employers. 
            Discover opportunities that match your skills and passion.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              to="/jobs" 
              className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              Browse Open Positions
            </Link>
            <Link 
              to="/register" 
              className="bg-transparent border-2 border-white text-white hover:bg-white/10 px-8 py-4 rounded-full text-lg font-bold transition-all"
            >
              Post a Job
            </Link>
          </div>
        </div>
      </div>

      {/* 2. STATS / TRUST BAR */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-gray-100">
                <div>
                    <div className="text-3xl font-bold text-gray-900">10k+</div>
                    <div className="text-sm text-gray-500 mt-1">Active Jobs</div>
                </div>
                <div>
                    <div className="text-3xl font-bold text-gray-900">500+</div>
                    <div className="text-sm text-gray-500 mt-1">Companies</div>
                </div>
                <div>
                    <div className="text-3xl font-bold text-gray-900">1M+</div>
                    <div className="text-sm text-gray-500 mt-1">Candidates</div>
                </div>
                <div>
                    <div className="text-3xl font-bold text-gray-900">24/7</div>
                    <div className="text-sm text-gray-500 mt-1">Support</div>
                </div>
            </div>
        </div>
      </div>

      {/* 3. FEATURED JOBS SECTION */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Featured New Jobs</h2>
                <p className="text-gray-500 mt-2">The latest opportunities curated for you</p>
            </div>
            <Link to="/jobs" className="hidden sm:block text-blue-600 font-semibold hover:text-blue-800 hover:underline">
                View all jobs &rarr;
            </Link>
        </div>
        
        {loading ? (
             <div className="grid gap-8 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>
                ))}
             </div>
        ) : (
            <div className="grid gap-8 md:grid-cols-3">
            {featuredJobs.map(job => (
                <div 
                    key={job.id} 
                    className="group bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xl">
                            {job.company.charAt(0)}
                        </div>
                        <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-100">
                            {job.type || 'Full-time'}
                        </span>
                    </div>

                    <h3 className="font-bold text-xl text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {job.title}
                    </h3>
                    <p className="text-gray-600 font-medium mb-4">{job.company}</p>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            {job.location}
                        </div>
                        <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>

                    <Link to={`/jobs/${job.id}`} className="absolute inset-0" aria-label={`View details for ${job.title}`} />
                </div>
            ))}
            </div>
        )}

        <div className="mt-8 text-center sm:hidden">
             <Link to="/jobs" className="text-blue-600 font-semibold hover:text-blue-800">
                View all jobs &rarr;
            </Link>
        </div>
      </div>
    </div>
  );
}