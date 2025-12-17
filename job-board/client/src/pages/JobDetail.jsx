import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function JobDetail({ session }) {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  
 
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  useEffect(() => {
    const getJob = async () => {
      
      const { data } = await supabase
        .from('jobs')
        .select('*, profiles(*)') 
        .eq('id', id)
        .single();
      setJob(data);
    };
    getJob();
  }, [id]);

  const handleApply = async (e) => {
    e.preventDefault();
    
    // checking
    if (!session) return toast.error('Please login to apply');
    if (!file) return toast.error('Please upload a resume first.');

    setLoading(true);

    try {
      
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(fileName, file);
      if (uploadError) throw new Error('Resume Upload Failed: ' + uploadError.message);

      const resumeUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/resumes/${fileName}`;

      
      const { error: dbError } = await supabase.from('applications').insert({
        job_id: job.id,
        candidate_id: session.user.id,
        resume_url: resumeUrl
      });
      if (dbError) throw new Error('Database Error: ' + dbError.message);

      
      try {
        axios.post('https://job-board-api-rc22.onrender.com/api/notify', {
          employerEmail: job.profiles.email, 
          jobTitle: job.title,
          candidateName: session.user.email,
          resumeUrl
        }).catch(err => console.warn("Background email failed", err));
      } catch (emailErr) {
        console.warn("Email logic skipped");
      }

      
      toast.success('Application submitted successfully!');
      setFile(null); 
      e.target.reset();
      
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  
  if (!job) return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
        </div>
    </div>
  );

  //  get company info 
  const employer = job.profiles || {};
  const companyName = employer.full_name || job.company || 'Confidential Company';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative">
      {/* Breadcrumb Navigation */}
      <Link to="/jobs" className="inline-flex items-center text-gray-500 hover:text-blue-600 mb-6 transition-colors">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Back to Jobs
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
                        
                        {/* Company Name - a button to show company details*/}
                        <button 
                            onClick={() => setShowCompanyModal(true)}
                            className="flex items-center hover:text-blue-600 hover:underline transition-colors group"
                        >
                            <svg className="w-4 h-4 mr-1 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            <span className="font-medium">{companyName}</span>
                        </button>

                        <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            {job.location}
                        </span>
                        <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            {new Date(job.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                
                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold border border-blue-100">
                    {job.type || 'Full-time'}
                </span>
            </div>

            <div className="prose prose-blue max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {job.description}
              </p>
            </div>
          </div>
        </div>

        
        <div className="md:col-span-1 sticky top-24">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Apply for this position</h3>
            <p className="text-sm text-gray-500 mb-6">Upload your resume to start the application process.</p>
            
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resume (PDF)</label>
                <div className="relative">
                    <input 
                        type="file" 
                        accept=".pdf" 
                        onChange={(e) => setFile(e.target.files[0])} 
                        required 
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-300 rounded-lg p-1"
                    />
                </div>
              </div>

              <button 
                disabled={loading || !session} 
                className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow transition-all transform hover:-translate-y-0.5 
                    ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}
                    ${!session ? 'bg-gray-400 cursor-not-allowed hover:bg-gray-400 hover:transform-none hover:shadow-none' : ''}
                `}
              >
                {loading ? (
                    <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Sending...
                    </span>
                ) : (
                    session ? 'Submit Application' : 'Login to Apply'
                )}
              </button>
              
              {!session && (
                  <p className="text-center text-xs text-red-500 mt-2">
                    You must be logged in to apply.
                  </p>
              )}
            </form>
          </div>
          
          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h4 className="text-sm font-bold text-blue-800 mb-1">Safe & Secure</h4>
            <p className="text-xs text-blue-600">
                Your application is sent directly to the employer.
            </p>
          </div>
        </div>
      </div>

      
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setShowCompanyModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="h-24 bg-gradient-to-r from-gray-700 to-gray-900"></div>
                <div className="px-6 pb-6 relative">
                    <img 
                        src={employer.avatar_url || `https://ui-avatars.com/api/?name=${companyName}&background=random`} 
                        className="w-24 h-24 rounded-lg border-4 border-white -mt-12 mb-3 bg-white object-cover shadow"
                        alt="Company Logo"
                    />
                    <h2 className="text-2xl font-bold text-gray-900">{companyName}</h2>
                    <p className="text-blue-600 font-medium mb-4">{employer.username || 'Employer'}</p>
                    
                    <div className="space-y-4 text-sm text-gray-600 mb-6 border-t pt-4">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            <span>{employer.email}</span>
                        </div>
                        {employer.website && (
                             <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                                <a href={employer.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{employer.website}</a>
                             </div>
                        )}
                        <div className="bg-gray-50 p-3 rounded-lg text-xs leading-relaxed">
                            <span className="font-bold block mb-1 text-gray-700">About the Employer:</span>
                            
                            This company is a verified employer on our platform. They have posted this job opportunity and are actively looking for candidates like you.
                        </div>
                    </div>

                    <div className="flex gap-3">
                         <button onClick={() => setShowCompanyModal(false)} className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
