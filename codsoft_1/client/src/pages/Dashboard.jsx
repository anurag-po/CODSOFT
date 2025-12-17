import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]); 
  const [myApplications, setMyApplications] = useState([]);
  
  // States for Profile and Job Forms
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', username: '', website: '' });

  const [jobForm, setJobForm] = useState({ title: '', description: '', company: '', location: '', type: 'Full-time' });
  const [editingJobId, setEditingJobId] = useState(null);
  
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  useEffect(() => {
    if (session) fetchAllData();
  }, [session]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      
      if (profileData) {
          setProfile(profileData);
          setProfileForm({ 
            full_name: profileData.full_name || '', 
            username: profileData.username || '', 
            website: profileData.website || '' 
          });

          // check if user has role
          if (!profileData.role) {
              setShowRoleModal(true); 
          } else {
              
              if (profileData.role === 'employer') {
                  await fetchEmployerData();
              } else {
                  await fetchCandidateData();
              }
          }
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

 
  const setUserRole = async (role) => {
      try {
          setUpdatingRole(true);
          const { error } = await supabase.from('profiles').update({ role: role }).eq('id', session.user.id);
          if (error) throw error;
          
          toast.success(`Welcome, ${role === 'employer' ? 'Employer' : 'Candidate'}!`);
          
          // Update local state and reload data
          const newProfile = { ...profile, role: role };
          setProfile(newProfile);
          setShowRoleModal(false);
          
          if (role === 'employer') fetchEmployerData();
          else fetchCandidateData();

      } catch (error) {
          toast.error("Error setting role: " + error.message);
      } finally {
          setUpdatingRole(false);
      }
  };

  
  const fetchEmployerData = async () => {
    const { data: jobData } = await supabase.from('jobs').select('*').eq('employer_id', session.user.id).order('created_at', { ascending: false });
    setJobs(jobData || []);

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

        const { error } = await supabase.from('profiles').update({
            full_name: profileForm.full_name,
            username: profileForm.username,
            avatar_url: avatarUrl,
            
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
    if (!window.confirm("Delete this job?")) return;
    try {
      
        const { error } = await supabase.from('jobs').delete().eq('id', id);
        if (error) throw error;
        toast.success('Job deleted.');
        setJobs(jobs.filter(j => j.id !== id));
    } catch (error) { toast.error(error.message); }
  };

  if (loading) return <div className="p-10 text-center">Loading Dashboard...</div>;
  if (!profile) return <div className="p-10 text-center">Profile not found.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 relative">
      
  
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
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Full Name</label><input className="w-full border-b border-gray-300 py-1 focus:border-blue-600 outline-none font-medium" value={profileForm.full_name} onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} placeholder="Enter name" /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Username / Title</label><input className="w-full border-b border-gray-300 py-1 focus:border-blue-600 outline-none" value={profileForm.username} onChange={e => setProfileForm({...profileForm, username: e.target.value})} placeholder="Enter title" /></div>
                </div>
                <button onClick={handleProfileUpdate} disabled={uploading} className="mb-2 bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-50 shadow">{uploading ? 'Saving...' : 'Save'}</button>
            </div>
        </div>
      </div>

   
      {profile.role === 'employer' ? (
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 border-b font-bold text-gray-700">Inbox ({applications.length})</div>
                    <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                        {applications.map(app => (
                            <div key={app.id} className="p-4 flex justify-between items-center hover:bg-blue-50">
                                <button className="flex items-center gap-3 text-left group" onClick={() => setSelectedCandidate(app)}>
                                    <img src={app.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${app.profiles?.full_name}&background=random`} className="w-10 h-10 rounded-full object-cover" />
                                    <div><div className="font-bold text-blue-600 group-hover:underline">{app.profiles?.full_name}</div><div className="text-xs text-gray-500">{app.jobs?.title}</div></div>
                                </button>
                                <a href={app.resume_url} target="_blank" className="text-sm border px-3 py-1 rounded hover:bg-gray-100">PDF ⬇</a>
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
                                <div><div className="font-bold">{job.title}</div><div className="text-xs text-gray-500">{new Date(job.created_at).toLocaleDateString()}</div></div>
                                <div className="flex gap-2"><button onClick={() => {setEditingJobId(job.id); setJobForm(job); window.scrollTo({top:0,behavior:'smooth'})}} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Edit</button><button onClick={() => handleJobDelete(job.id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Delete</button></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             <h2 className="text-xl font-bold text-gray-800 mb-6">My Applications</h2>
             {myApplications.length === 0 ? <p className="text-gray-500">No applications sent yet.</p> : (
                 <div className="grid gap-4 md:grid-cols-2">
                     {myApplications.map(app => (
                         <div key={app.id} className="border p-4 rounded-lg">
                             <div className="font-bold text-lg text-gray-800">{app.jobs?.title}</div>
                             <div className="text-gray-600">{app.jobs?.company}</div>
                             <div className="mt-3 text-sm text-blue-600">Status: Applied</div>
                         </div>
                     ))}
                 </div>
             )}
        </div>
      )}

    
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-95 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl text-center animate-in zoom-in duration-300">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome!</h2>
                <p className="text-gray-500 mb-8">To get started, please select how you want to use the platform.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                        onClick={() => setUserRole('candidate')}
                        disabled={updatingRole}
                        className="flex flex-col items-center justify-center p-6 border-2 border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        </div>
                        <span className="font-bold text-gray-900">I want a Job</span>
                        <span className="text-xs text-gray-400 mt-1">Candidate</span>
                    </button>

                    <button 
                        onClick={() => setUserRole('employer')}
                        disabled={updatingRole}
                        className="flex flex-col items-center justify-center p-6 border-2 border-gray-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
                    >
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        </div>
                        <span className="font-bold text-gray-900">I want to Hire</span>
                        <span className="text-xs text-gray-400 mt-1">Employer</span>
                    </button>
                </div>
            </div>
        </div>
      )}

   
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-40" onClick={() => setSelectedCandidate(null)}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-4 mb-4">
                    <img src={selectedCandidate.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${selectedCandidate.profiles?.full_name}&background=random`} className="w-16 h-16 rounded-full" />
                    <div><h2 className="text-xl font-bold">{selectedCandidate.profiles?.full_name}</h2><p className="text-blue-600">{selectedCandidate.profiles?.username}</p></div>
                </div>
                <div className="mb-6 space-y-2 text-sm text-gray-600"><p>📧 {selectedCandidate.profiles?.email}</p><p>💼 Applying for: <strong>{selectedCandidate.jobs?.title}</strong></p></div>
                <div className="flex gap-2"><a href={selectedCandidate.resume_url} target="_blank" className="flex-1 bg-blue-600 text-white text-center py-2 rounded font-bold">Resume</a><button onClick={() => setSelectedCandidate(null)} className="px-4 border rounded">Close</button></div>
            </div>
        </div>
      )}
    </div>
  );
}
