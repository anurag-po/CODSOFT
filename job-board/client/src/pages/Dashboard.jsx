import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState([]);
  
  // State for the form
  const [formData, setFormData] = useState({ title: '', description: '', company: '', location: '', type: 'Full-time' });
  const [editingId, setEditingId] = useState(null); // Track if we are editing a specific job
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) fetchProfile();
  }, [session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data);
      if (data && data.role === 'employer') await fetchPostedJobs();
      else await fetchApplications();
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostedJobs = async () => {
    const { data } = await supabase.from('jobs').select('*').eq('employer_id', session.user.id).order('created_at', { ascending: false });
    setData(data || []);
  };

  const fetchApplications = async () => {
    const { data } = await supabase.from('applications').select('*, jobs(title, company)').eq('candidate_id', session.user.id);
    setData(data || []);
  };

  // --- NEW: Handle Create AND Update ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
        if (editingId) {
            // UPDATE existing job
            const { error } = await supabase
                .from('jobs')
                .update(formData)
                .eq('id', editingId);
            
            if (error) throw error;
            toast.success('Job updated successfully!');
        } else {
            // CREATE new job
            const { error } = await supabase
                .from('jobs')
                .insert({ ...formData, employer_id: session.user.id });

            if (error) throw error;
            toast.success('Job posted successfully!');
        }

        // Reset form and refresh list
        setFormData({ title: '', description: '', company: '', location: '', type: 'Full-time' });
        setEditingId(null);
        fetchPostedJobs();

    } catch (error) {
        toast.error(error.message);
    }
  };

  // --- NEW: Load data into form for editing ---
  const handleEdit = (job) => {
    setFormData({
        title: job.title,
        description: job.description,
        company: job.company,
        location: job.location,
        type: job.type
    });
    setEditingId(job.id);
    // Scroll to top so user sees the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setFormData({ title: '', description: '', company: '', location: '', type: 'Full-time' });
      setEditingId(null);
  };

  // --- NEW: Delete Job ---
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this job? This cannot be undone.")) return;

    try {
        const { error } = await supabase.from('jobs').delete().eq('id', id);
        if (error) throw error;
        
        toast.success('Job deleted.');
        fetchPostedJobs();
    } catch (error) {
        toast.error('Error deleting job: ' + error.message);
    }
  };

  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all";

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (!profile) return <div className="text-center mt-10">Profile not found.</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-8">
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome back, <span className="text-blue-600">{profile.full_name || session.user.email}</span>
        </h1>
        <p className="text-gray-500 mt-1 capitalize">Role: {profile.role}</p>
      </div>

      {profile.role === 'employer' ? (
        <>
          {/* Post/Edit Job Form */}
          <div className={`p-6 rounded-lg shadow-sm border transition-colors ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-between">
                <span>{editingId ? 'Edit Job Details' : 'Post a New Job'}</span>
                {editingId && (
                    <button onClick={handleCancelEdit} className="text-sm text-red-500 hover:text-red-700 underline">
                        Cancel Edit
                    </button>
                )}
            </h2>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input className={inputClass} placeholder="e.g. Senior React Developer" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input className={inputClass} placeholder="e.g. Tech Corp" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} required />
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input className={inputClass} placeholder="e.g. Remote / New York" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required />
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                <select className={`${inputClass} bg-white`} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                    <option>Freelance</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className={`${inputClass} min-h-[100px]`} placeholder="Job details..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
              </div>

              <div className="col-span-1 md:col-span-2">
                <button className={`w-full text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {editingId ? 'Update Job Listing' : 'Post Job Listing'}
                </button>
              </div>
            </form>
          </div>

          {/* Job List with Actions */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Posted Jobs</h2>
            <div className="space-y-4">
              {data.map(job => (
                <div key={job.id} className="bg-white border border-gray-200 p-5 rounded-lg hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{job.title}</h3>
                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
                      <span>{job.type}</span>
                      <span>•</span>
                      <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button 
                        onClick={() => handleEdit(job)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        Edit
                    </button>
                    
                    <button 
                        onClick={() => handleDelete(job.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Candidate View (Unchanged) */
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">My Applications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {data.map(app => (
                <div key={app.id} className="bg-white border p-4 rounded shadow-sm">
                    <h3 className="font-bold">{app.jobs?.title}</h3>
                    <p>{app.jobs?.company}</p>
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded inline-block mt-2 capitalize">{app.status}</span>
                </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}