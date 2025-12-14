import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]); // Jobs posted by employer
  const [applications, setApplications] = useState([]); // Applications received
  const [myApplications, setMyApplications] = useState([]); // Applications sent by candidate
  
  // State for the form
  const [formData, setFormData] = useState({ title: '', description: '', company: '', location: '', type: 'Full-time' });
  const [editingId, setEditingId] = useState(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) fetchProfile();
  }, [session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data);
      
      if (data && data.role === 'employer') {
          await fetchEmployerData();
      } else {
          await fetchCandidateData();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- EMPLOYER FETCHING ---
  const fetchEmployerData = async () => {
    // 1. Get Jobs
    const { data: jobData } = await supabase
        .from('jobs')
        .select('*')
        .eq('employer_id', session.user.id)
        .order('created_at', { ascending: false });
    
    setJobs(jobData || []);

    // 2. Get Applications for those jobs
    if (jobData && jobData.length > 0) {
        const jobIds = jobData.map(job => job.id);
        const { data: appData } = await supabase
            .from('applications')
            .select(`
                *,
                profiles:candidate_id (email, full_name),
                jobs:job_id (title)
            `)
            .in('job_id', jobIds)
            .order('created_at', { ascending: false });
        
        setApplications(appData || []);
    }
  };

  // --- CANDIDATE FETCHING ---
  const fetchCandidateData = async () => {
    const { data } = await supabase.from('applications').select('*, jobs(title, company)').eq('candidate_id', session.user.id);
    setMyApplications(data || []);
  };

  // --- FORM HANDLERS ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        if (editingId) {
            const { error } = await supabase.from('jobs').update(formData).eq('id', editingId);
            if (error) throw error;
            toast.success('Job updated!');
        } else {
            const { error } = await supabase.from('jobs').insert({ ...formData, employer_id: session.user.id });
            if (error) throw error;
            toast.success('Job posted!');
        }
        setFormData({ title: '', description: '', company: '', location: '', type: 'Full-time' });
        setEditingId(null);
        fetchEmployerData(); // Refresh everything
    } catch (error) {
        toast.error(error.message);
    }
  };

  const handleEdit = (job) => {
    setFormData({ title: job.title, description: job.description, company: job.company, location: job.location, type: job.type });
    setEditingId(job.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setFormData({ title: '', description: '', company: '', location: '', type: 'Full-time' });
      setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
        const { error } = await supabase.from('jobs').delete().eq('id', id);
        if (error) throw error;
        toast.success('Job deleted.');
        fetchEmployerData();
    } catch (error) {
        toast.error('Error deleting job: ' + error.message);
    }
  };

  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none";

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (!profile) return <div className="text-center mt-10">Profile not found.</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-8">
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, <span className="text-blue-600">{profile.full_name || session.user.email}</span>
        </h1>
        <p className="text-gray-500 mt-1 capitalize">Role: {profile.role}</p>
      </div>

      {profile.role === 'employer' ? (
        <>
          {/* 1. JOB POSTING FORM */}
          <div className={`p-6 rounded-lg shadow-sm border transition-colors ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex justify-between">
                <span>{editingId ? 'Edit Job' : 'Post a New Job'}</span>
                {editingId && <button onClick={handleCancelEdit} className="text-sm text-red-500 underline">Cancel</button>}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm mb-1">Job Title</label><input className={inputClass} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required /></div>
              <div><label className="block text-sm mb-1">Company</label><input className={inputClass} value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} required /></div>
              <div><label className="block text-sm mb-1">Location</label><input className={inputClass} value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required /></div>
              <div><label className="block text-sm mb-1">Type</label>
                <select className={`${inputClass} bg-white`} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Freelance</option>
                </select>
              </div>
              <div className="col-span-1 md:col-span-2"><label className="block text-sm mb-1">Description</label><textarea className={`${inputClass} min-h-[100px]`} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required /></div>
              <div className="col-span-1 md:col-span-2"><button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow">{editingId ? 'Update Job' : 'Post Job'}</button></div>
            </form>
          </div>

          {/* 2. RECEIVED APPLICATIONS (NEW SECTION) */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">Applications Received ({applications.length})</h2>
            </div>
            {applications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No applications yet.</div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {applications.map((app) => (
                        <div key={app.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors">
                            <div>
                                <h3 className="font-bold text-gray-900">{app.profiles?.full_name || app.profiles?.email || 'Unknown Candidate'}</h3>
                                <p className="text-sm text-gray-500">Applied for: <span className="text-blue-600 font-medium">{app.jobs?.title}</span></p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(app.created_at).toLocaleDateString()}</p>
                            </div>
                            <a 
                                href={app.resume_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium text-sm border border-indigo-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                Download Resume
                            </a>
                        </div>
                    ))}
                </div>
            )}
          </div>

          {/* 3. YOUR POSTED JOBS */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Posted Jobs</h2>
            <div className="space-y-4">
              {jobs.map(job => (
                <div key={job.id} className="bg-white border border-gray-200 p-5 rounded-lg flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">{job.title}</h3>
                    <p className="text-sm text-gray-500">{new Date(job.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(job)} className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded">Edit</button>
                    <button onClick={() => handleDelete(job.id)} className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* CANDIDATE VIEW */
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">My Applications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {myApplications.map(app => (
                <div key={app.id} className="bg-white border p-4 rounded shadow-sm">
                    <h3 className="font-bold">{app.jobs?.title}</h3>
                    <p>{app.jobs?.company}</p>
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded inline-block mt-2">Status: Pending</span>
                </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}
