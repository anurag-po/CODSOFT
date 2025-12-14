import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]); // Applications received (Employer)
  const [myApplications, setMyApplications] = useState([]); // Applications sent (Candidate)
  
  // Profile Editing State
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', username: '', website: '' });

  // Job Form State
  const [jobForm, setJobForm] = useState({ title: '', description: '', company: '', location: '', type: 'Full-time' });
  const [editingJobId, setEditingJobId] = useState(null);
  
  // Modal State (For Employer viewing Candidate)
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    if (session) fetchAllData();
  }, [session]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Profile
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(profileData);
      setProfileForm({ 
        full_name: profileData.full_name || '', 
        username: profileData.username || '', 
        website: profileData.website || '' 
      });

      // 2. Fetch Role-Specific Data
      if (profileData.role === 'employer') {
          await fetchEmployerData();
      } else {
          await fetchCandidateData();
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- DATA FETCHING ---
  const fetchEmployerData = async () => {
    // Get Jobs
    const { data: jobData } = await supabase.from('jobs').select('*').eq('employer_id', session.user.id).order('created_at', { ascending: false });
    setJobs(jobData || []);

    // Get Applications
    if (jobData && jobData.length > 0) {
        const jobIds = jobData.map(j => j.id);
        const { data: appData } = await supabase
            .from('applications')
            .select(`*, profiles:candidate_id(*), jobs:job_id(title)`)
            .in('job_id', jobIds)
            .order('created_at', { ascending: false });
        setApplications(appData || []);
    }
  };

  const fetchCandidateData = async () => {
    const { data } = await supabase.from('applications').select('*, jobs(title, company)').eq('candidate_id', session.user.id);
    setMyApplications(data || []);
  };

  // --- PROFILE UPDATES ---
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
        setUploading(true);
        let avatarUrl = profile.avatar_url;

        // 1. Upload Avatar if selected
        if (avatarFile) {
            const fileName = `${session.user.id}-${Date.now()}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile);
            if (uploadError) throw uploadError;
            avatarUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}`;
        }

        // 2. Update Profile Table
        const { error } = await supabase.from('profiles').update({
            full_name: profileForm.full_name,
            username: profileForm.username,
            avatar_url: avatarUrl,
            updated_at: new Date()
        }).eq('id', session.user.id);

        if (error) throw error;
        toast.success('Profile updated!');
        setProfile({ ...profile, ...profileForm, avatar_url: avatarUrl });
        setAvatarFile(null);
    } catch (error) {
        toast.error('Error updating profile: ' + error.message);
    } finally {
        setUploading(false);
    }
  };

  // --- JOB HANDLERS (Simplified) ---
  const handleJobSubmit = async (e) => {
    e.preventDefault();
    try {
        if (editingJobId) {
            await supabase.from('jobs').update(jobForm).eq('id', editingJobId);
            toast.success('Job updated!');
        } else {
            await supabase.from('jobs').insert({ ...jobForm, employer_id: session.user.id });
            toast.success('Job posted!');
        }
        setJobForm({ title: '', description: '', company: '', location: '', type: 'Full-time' });
        setEditingJobId(null);
        fetchEmployerData();
    } catch (error) { toast.error(error.message); }
  };
  
  const handleJobDelete = async (id) => {
    if (!window.confirm("Delete this job?")) return;
    await supabase.from('jobs').delete().eq('id', id);
    fetchEmployerData();
  };

  if (loading) return <div className="p-10 text-center">Loading Dashboard...</div>;
  if (!profile) return <div className="p-10 text-center">Profile not found.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      
      {/* --- SECTION 1: PROFILE CARD (Visible to Everyone) --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-32"></div>
        <div className="px-6 pb-6 relative">
            {/* Avatar Image */}
            <div className="relative -mt-12 mb-4 flex justify-between items-end">
                <div className="relative group">
                    <img 
                        src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.email}&background=random`} 
                        alt="Profile" 
                        className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-md bg-white"
                    />
                    <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity text-xs font-bold">
                        Change
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} />
                    </label>
                </div>
                {/* Save Button */}
                <button 
                    onClick={handleProfileUpdate}
                    disabled={uploading}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                    {uploading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Profile Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                    <input 
                        className="w-full border-b border-gray-300 py-1 focus:border-blue-600 outline-none text-gray-900 font-medium" 
                        value={profileForm.full_name} 
                        onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} 
                        placeholder="Enter your name"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Username / Title</label>
                    <input 
                        className="w-full border-b border-gray-300 py-1 focus:border-blue-600 outline-none text-gray-900" 
                        value={profileForm.username} 
                        onChange={e => setProfileForm({...profileForm, username: e.target.value})} 
                        placeholder="@username or Job Title"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Email (Read Only)</label>
                    <div className="text-gray-500 py-1">{session.user.email}</div>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Role</label>
                    <div className="capitalize text-blue-600 font-bold py-1">{profile.role}</div>
                </div>
            </div>
        </div>
      </div>


      {/* --- SECTION 2: ROLE SPECIFIC CONTENT --- */}
      
      {/* === CANDIDATE VIEW === */}
      {profile.role !== 'employer' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             <h2 className="text-xl font-bold text-gray-800 mb-6">My Applications</h2>
             {myApplications.length === 0 ? <p className="text-gray-500">No applications sent yet.</p> : (
                 <div className="grid gap-4 md:grid-cols-2">
                     {myApplications.map(app => (
                         <div key={app.id} className="border p-4 rounded-lg hover:shadow-md transition-shadow">
                             <div className="font-bold text-lg text-gray-800">{app.jobs?.title}</div>
                             <div className="text-gray-600">{app.jobs?.company}</div>
                             <div className="mt-3 flex justify-between items-center text-sm">
                                 <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">Applied</span>
                                 <span className="text-gray-400">{new Date(app.created_at).toLocaleDateString()}</span>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
        </div>
      )}

      {/* === EMPLOYER VIEW === */}
      {profile.role === 'employer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col: Job Creator */}
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                <h3 className="font-bold text-lg mb-4">{editingJobId ? 'Edit Job' : 'Post New Job'}</h3>
                <form onSubmit={handleJobSubmit} className="space-y-4">
                    <input className="w-full border p-2 rounded" placeholder="Job Title" value={jobForm.title} onChange={e=>setJobForm({...jobForm, title:e.target.value})} required/>
                    <input className="w-full border p-2 rounded" placeholder="Company" value={jobForm.company} onChange={e=>setJobForm({...jobForm, company:e.target.value})} required/>
                    <input className="w-full border p-2 rounded" placeholder="Location" value={jobForm.location} onChange={e=>setJobForm({...jobForm, location:e.target.value})} required/>
                    <textarea className="w-full border p-2 rounded" placeholder="Description" rows="4" value={jobForm.description} onChange={e=>setJobForm({...jobForm, description:e.target.value})} required/>
                    <div className="flex gap-2">
                        <button className="flex-1 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">Post</button>
                        {editingJobId && <button type="button" onClick={() => {setEditingJobId(null); setJobForm({title:'',description:'',company:'',location:'',type:'Full-time'})}} className="px-3 bg-gray-200 rounded">Cancel</button>}
                    </div>
                </form>
            </div>

            {/* Right Col: Applications & Jobs List */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* 1. Applications Received */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 border-b font-bold text-gray-700 flex justify-between">
                        <span>Inbox ({applications.length})</span>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                        {applications.map(app => (
                            <div key={app.id} className="p-4 flex items-center justify-between hover:bg-blue-50 transition-colors">
                                <div 
                                    className="flex items-center gap-3 cursor-pointer group"
                                    onClick={() => setSelectedCandidate(app)} // <--- CLICK TO OPEN MODAL
                                >
                                    <img src={app.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${app.profiles?.full_name || 'User'}&background=random`} className="w-10 h-10 rounded-full object-cover" />
                                    <div>
                                        <div className="font-bold text-gray-900 group-hover:text-blue-600">{app.profiles?.full_name || 'Unknown Candidate'}</div>
                                        <div className="text-xs text-gray-500">Applied for: {app.jobs?.title}</div>
                                    </div>
                                </div>
                                <a href={app.resume_url} target="_blank" className="text-sm border px-3 py-1 rounded hover:bg-gray-100">Resume ⬇</a>
                            </div>
                        ))}
                        {applications.length === 0 && <div className="p-6 text-center text-gray-500">No applications yet.</div>}
                    </div>
                </div>

                {/* 2. Active Jobs List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-800 mb-4">Your Posted Jobs</h3>
                    <div className="space-y-3">
                        {jobs.map(job => (
                            <div key={job.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                                <div>
                                    <div className="font-bold">{job.title}</div>
                                    <div className="text-xs text-gray-500">{new Date(job.created_at).toLocaleDateString()}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => {setEditingJobId(job.id); setJobForm(job); window.scrollTo({top:0,behavior:'smooth'})}} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Edit</button>
                                    <button onClick={() => handleJobDelete(job.id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL: CANDIDATE PROFILE POPUP --- */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedCandidate(null)}>
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                <div className="h-24 bg-blue-600"></div>
                <div className="px-6 pb-6 relative">
                    <img 
                        src={selectedCandidate.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${selectedCandidate.profiles?.full_name || 'User'}&background=random`} 
                        className="w-24 h-24 rounded-full border-4 border-white -mt-12 mb-3 bg-white object-cover shadow"
                    />
                    <h2 className="text-2xl font-bold text-gray-900">{selectedCandidate.profiles?.full_name || 'Unnamed Candidate'}</h2>
                    <p className="text-blue-600 font-medium mb-4">{selectedCandidate.profiles?.username || 'Candidate'}</p>
                    
                    <div className="space-y-3 text-sm text-gray-600 mb-6">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            {selectedCandidate.profiles?.email}
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            Applying for: <span className="font-bold">{selectedCandidate.jobs?.title}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <a 
                            href={selectedCandidate.resume_url} 
                            target="_blank" 
                            className="flex-1 bg-blue-600 text-white text-center py-2.5 rounded-lg font-bold hover:bg-blue-700 shadow-md transition-all"
                        >
                            View Resume PDF
                        </a>
                        <button onClick={() => setSelectedCandidate(null)} className="px-4 py-2.5 border border-gray-300 rounded-lg font-bold hover:bg-gray-50">
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
