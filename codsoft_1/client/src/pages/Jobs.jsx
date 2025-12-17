import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  
  const fetchJobs = async () => {
    setLoading(true);
    try {
        let query = supabase.from('jobs').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (search) query = query.ilike('title', `%${search}%`);
        
        const { data, error } = await query;
        if (!error) setJobs(data);
    } catch (error) {
        console.error("Error fetching jobs", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [search]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      
      {/* Header and Search Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Explore Opportunities</h1>
        <p className="text-gray-500 mb-6">Find the perfect role for your career path.</p>
        
        <div className="relative max-w-2xl">
            {/* Search Icon */}
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            {/* Input Field */}
            <input 
                type="text" 
                placeholder="Search by job title (e.g. 'Software Engineer')" 
                className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out shadow-sm sm:text-sm"
                onChange={(e) => setSearch(e.target.value)}
                value={search}
            />
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {loading ? (
            // Loading Skeleton
            [1,2,3].map(i => (
                <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
            ))
        ) : jobs.length === 0 ? (
            // Empty State
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search terms.</p>
            </div>
        ) : (
            // Job Cards
            jobs.map(job => (
            <div key={job.id} className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    
                    {/* Info */}
                    <div className="flex items-start gap-4">
                        {/* Company Logo default */}
                        <div className="hidden sm:flex flex-shrink-0 items-center justify-center h-12 w-12 rounded-lg bg-blue-50 text-blue-600 font-bold text-lg">
                            {job.company.charAt(0)}
                        </div>
                        
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                <Link to={`/jobs/${job.id}`}>
                                    {job.title}
                                </Link>
                            </h2>
                            <p className="text-gray-600 font-medium mb-2">{job.company}</p>
                            
                            <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                                <span className="flex items-center bg-gray-100 px-2.5 py-0.5 rounded-full">
                                    <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                    {job.location}
                                </span>
                                <span className="flex items-center bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    {job.type}
                                </span>
                                <span className="flex items-center text-gray-400 text-xs mt-1 sm:mt-0 sm:ml-2">
                                    Posted {new Date(job.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0 w-full sm:w-auto">
                        <Link 
                            to={`/jobs/${job.id}`} 
                            className="block w-full text-center sm:inline-block bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold py-2 px-6 rounded-lg transition-colors"
                        >
                            View Details
                        </Link>
                    </div>
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
}
