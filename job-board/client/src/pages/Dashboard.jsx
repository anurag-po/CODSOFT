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
  
  // Modal State
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    if (session) fetchAllData();
  }, [session]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      // Fetch Profile
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(profileData);
      setProfileForm({ 
        full_name: profileData.full_name || '', 
        username: profileData.username || '', 
        website: profileData.website || '' 
      });

      //Fetch Role-Specific Data
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

  
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
        setUploading(true);
        let avatarUrl = profile.avatar_url;

       
        if (avatarFile) {
            const fileName = `${session.user.id}-${Date.now()}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile);
            if (uploadError) throw uploadError;
            avatarUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}`;
        }

        //Update Profile Table
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
    // 1. Ask for confirmation
    if (!window.confirm("Are you sure? This will delete the job AND all its applications.")) return;
    
    try {
        // 2. First, delete all applications linked to this job
        const { error: appError } = await supabase
            .from('applications')
            .delete()
            .eq('job_id', id);
            
        if (appError) throw appError;

        // 3. Then, delete the job itself
        const { error: jobError } = await supabase
            .from('jobs')
            .delete()
            .eq('id', id);
            
        if (jobError) throw jobError;

        // 4. Success
        toast.success('Job and applications deleted.');
        fetchEmployerData(); // Refresh the list
    } catch (error) {
        console.error(error);
        toast.error('Error deleting job: ' + error.message);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Dashboard...</div>;
  if (!profile) return <div className="p-10 text-center">Profile not found.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-32"></div>
        <div className="px-6 pb-6 relative">
            
            
            <div className="relative -mt-12 mb-4 inline-block">
                <img 
                    src={avatarFile ? URL.createObjectURL(avatarFile) : (profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.email}&background=random`)} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-md bg-white"
                />
                <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg border border-gray-200 cursor-pointer hover:bg-gray-50 text-gray-600 transition-colors">
                    
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} />
                </label>
            </div>

            <div className="flex justify-between items-end">
                
                <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
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
                </div>

                 
                <button 
                    onClick={handleProfileUpdate}
                    disabled={uploading}
                    className="mb-2 bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-50 shadow"
                >
                    {uploading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
      </div>


      
      
      {/* Candidate view */}
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

      {/* Emploer view */}
      {profile.role === 'employer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit sticky top-4">
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

            
            <div className="lg:col-span-2 space-y-8">
                
                {/* Applications Received */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 border-b font-bold text-gray-700 flex justify-between">
                        <span>Inbox ({applications.length})</span>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                        {applications.map(app => (
                            <div key={app.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-blue-50 transition-colors gap-4">
                                
                                
                                <button 
                                    className="flex items-center gap-3 text-left group w-full sm:w-auto"
                                    onClick={() => setSelectedCandidate(app)}
                                >
                                    <img src={app.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${app.profiles?.full_name || 'User'}&background=random`} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                    <div>
                                        <div className="font-bold text-blue-600 group-hover:underline text-lg">
                                            {app.profiles?.full_name || 'Unknown Candidate'}
                                        </div>
                                        <div className="text-xs text-gray-500">Applied for: {app.jobs?.title}</div>
                                    </div>
                                </button>

                                <a 
                                    href={app.resume_url} 
                                    target="_blank" 
                                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100 font-medium whitespace-nowrap"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    Download PDF
                                </a>
                            </div>
                        ))}
                        {applications.length === 0 && <div className="p-6 text-center text-gray-500">No applications yet.</div>}
                    </div>
                </div>

                
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

      
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setSelectedCandidate(null)}>
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="h-24 bg-blue-600"></div>
                <div className="px-6 pb-6 relative">
                    <img 
                        src={selectedCandidate.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${selectedCandidate.profiles?.full_name || 'User'}&background=random`} 
                        className="w-24 h-24 rounded-full border-4 border-white -mt-12 mb-3 bg-white object-cover shadow"
                    />
                    <h2 className="text-2xl font-bold text-gray-900">{selectedCandidate.profiles?.full_name || 'Unnamed Candidate'}</h2>
                    <p className="text-blue-600 font-medium mb-4">{selectedCandidate.profiles?.username || 'Candidate'}</p>
                    
                    <div className="space-y-3 text-sm text-gray-600 mb-6 border-t pt-4">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            {selectedCandidate.profiles?.email}
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            Applied for: <span className="font-bold text-gray-900">{selectedCandidate.jobs?.title}</span>
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
                        <button onClick={() => setSelectedCandidate(null)} className="px-4 py-2.5 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 text-gray-700">
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
