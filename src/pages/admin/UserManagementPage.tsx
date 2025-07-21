import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Edit, Trash2, PlusCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from '@/contexts/SessionContext';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'user' | 'admin';
  email: string | null;
  phone: string | null;
  house_no: string | null; // New field
  village: string | null; // New field
  pincode: string | null; // New field
  mandal: string | null; // New field
  district: string | null; // New field
}

const UserManagementPage = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editHouseNo, setEditHouseNo] = useState(''); // New state
  const [editVillage, setEditVillage] = useState(''); // New state
  const [editPincode, setEditPincode] = useState(''); // New state
  const [editMandal, setEditMandal] = useState(''); // New state
  const [editDistrict, setEditDistrict] = useState(''); // New state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAuthPassword, setNewAuthPassword] = useState('');
  const { user: currentUser } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) throw new Error("You must be logged in to view users.");

      const { data, error: invokeError } = await supabase.functions.invoke('get-all-users', {
        headers: { 'Authorization': `Bearer ${currentSession.access_token}` },
      });

      if (invokeError) throw new Error(`Failed to load users: ${invokeError.message}`);
      if (data && data.profiles) setProfiles(data.profiles || []);
      else throw new Error("Unexpected response from server.");
    } catch (err: any) {
      showError("Failed to load user profiles.");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (currentUser) {
        const { data } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
        if (data) setIsAdmin(data.role === 'admin');
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [currentUser]);

  const handleEditClick = (profile: Profile) => {
    setCurrentProfile(profile);
    setEditFirstName(profile.first_name || '');
    setEditLastName(profile.last_name || '');
    setEditRole(profile.role);
    setEditHouseNo(profile.house_no || ''); // Set new address fields
    setEditVillage(profile.village || '');
    setEditPincode(profile.pincode || '');
    setEditMandal(profile.mandal || '');
    setEditDistrict(profile.district || '');
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user's profile? This action cannot be undone.")) return;
    const toastId = showLoading("Deleting user profile...");
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    dismissToast(toastId);
    if (error) showError(`Failed to delete profile: ${error.message}`);
    else {
      showSuccess("User profile deleted successfully!");
      fetchProfiles();
    }
  };

  const handleSaveEdit = async () => {
    if (!currentProfile) return;
    const toastId = showLoading("Saving profile changes...");
    const { error } = await supabase.from('profiles').update({
      first_name: editFirstName,
      last_name: editLastName,
      role: editRole,
      house_no: editHouseNo, // Update new address fields
      village: editVillage,
      pincode: editPincode,
      mandal: editMandal,
      district: editDistrict,
    }).eq('id', currentProfile.id);
    dismissToast(toastId);
    if (error) showError(`Failed to update profile: ${error.message}`);
    else {
      showSuccess("Profile updated successfully!");
      setIsEditModalOpen(false);
      fetchProfiles();
    }
  };

  const handleAddUserClick = () => {
    setNewEmail('');
    setNewPassword('');
    setNewFirstName('');
    setNewLastName('');
    setIsAddUserModalOpen(true);
  };

  const handleSubmitAddUser = async () => {
    if (!newEmail.trim() || !newPassword.trim()) {
      showError("Email and password cannot be empty.");
      return;
    }
    const toastId = showLoading("Creating new user...");
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) throw new Error("Authentication session not found.");

      const { error: invokeError } = await supabase.functions.invoke('create-user-admin', {
        body: { email: newEmail, password: newPassword, first_name: newFirstName, last_name: newLastName },
        headers: { 'Authorization': `Bearer ${currentSession.access_token}` },
      });
      if (invokeError) throw new Error(invokeError.message);
      showSuccess("User created successfully!");
      setIsAddUserModalOpen(false);
      fetchProfiles();
    } catch (err: any) {
      showError(`Failed to create user: ${err.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleUpdateAuthClick = (profile: Profile) => {
    setCurrentProfile(profile);
    const phoneFromEmail = profile.email?.match(/guest_(\d{10})@/)?.[1] || '';
    setNewPhone(phoneFromEmail);
    setNewAuthPassword(phoneFromEmail); // Default password to phone number
    setIsAuthModalOpen(true);
  };

  const handleSaveAuthUpdate = async () => {
    if (!currentProfile || !newPhone.trim() || !newAuthPassword.trim()) {
      showError("Phone number and password cannot be empty.");
      return;
    }
    if (!/^\d{10}$/.test(newPhone.trim())) {
      showError("Please enter a valid 10-digit phone number.");
      return;
    }

    const toastId = showLoading("Updating user credentials...");
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) throw new Error("Authentication session not found.");

      const { error: invokeError } = await supabase.functions.invoke('update-user-credentials', {
        body: {
          userId: currentProfile.id,
          phone: newPhone.trim(),
          password: newAuthPassword.trim(),
        },
        headers: { 'Authorization': `Bearer ${currentSession.access_token}` },
      });

      if (invokeError) throw new Error(invokeError.message);
      showSuccess("User credentials updated successfully!");
      setIsAuthModalOpen(false);
      fetchProfiles();
    } catch (err: any) {
      showError(`Failed to update credentials: ${err.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">User Management</h1>
      {loading && <p>Loading users...</p>}
      {error && <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {!loading && !error && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>User List</CardTitle>
            {isAdmin && <Button onClick={handleAddUserClick}><PlusCircle className="mr-2 h-4 w-4" /> Add User</Button>}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>House No</TableHead> {/* New TableHead */}
                  <TableHead>Village</TableHead> {/* New TableHead */}
                  <TableHead>Pincode</TableHead> {/* New TableHead */}
                  <TableHead>Mandal</TableHead> {/* New TableHead */}
                  <TableHead>District</TableHead> {/* New TableHead */}
                  <TableHead>Role</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.id}</TableCell>
                    <TableCell>{profile.email || 'N/A'}</TableCell>
                    <TableCell>{profile.phone || 'N/A'}</TableCell>
                    <TableCell>{profile.first_name || 'N/A'}</TableCell>
                    <TableCell>{profile.last_name || 'N/A'}</TableCell>
                    <TableCell>{profile.house_no || 'N/A'}</TableCell> {/* New TableCell */}
                    <TableCell>{profile.village || 'N/A'}</TableCell> {/* New TableCell */}
                    <TableCell>{profile.pincode || 'N/A'}</TableCell> {/* New TableCell */}
                    <TableCell>{profile.mandal || 'N/A'}</TableCell> {/* New TableCell */}
                    <TableCell>{profile.district || 'N/A'}</TableCell> {/* New TableCell */}
                    <TableCell>{profile.role}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="mr-2" onClick={() => handleUpdateAuthClick(profile)} disabled={profile.id === currentUser?.id}><KeyRound className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" className="mr-2" onClick={() => handleEditClick(profile)} disabled={profile.id === currentUser?.id}><Edit className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(profile.id)} disabled={profile.id === currentUser?.id}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User Profile</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-first-name" className="text-right">First Name</Label><Input id="edit-first-name" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-last-name" className="text-right">Last Name</Label><Input id="edit-last-name" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-house-no" className="text-right">House No</Label><Input id="edit-house-no" value={editHouseNo} onChange={(e) => setEditHouseNo(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-village" className="text-right">Village</Label><Input id="edit-village" value={editVillage} onChange={(e) => setEditVillage(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-pincode" className="text-right">Pincode</Label><Input id="edit-pincode" value={editPincode} onChange={(e) => setEditPincode(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-mandal" className="text-right">Mandal</Label><Input id="edit-mandal" value={editMandal} onChange={(e) => setEditMandal(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-district" className="text-right">District</Label><Input id="edit-district" value={editDistrict} onChange={(e) => setEditDistrict(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-role" className="text-right">Role</Label><Select value={editRole} onValueChange={(value: 'user' | 'admin') => setEditRole(value)}><SelectTrigger className="col-span-3"><SelectValue placeholder="Select a role" /></SelectTrigger><SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button><Button onClick={handleSaveEdit}>Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="new-email" className="text-right">Email</Label><Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="col-span-3" required /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="new-password" className="text-right">Password</Label><Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="col-span-3" required /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="new-first-name" className="text-right">First Name</Label><Input id="new-first-name" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="new-last-name" className="text-right">Last Name</Label><Input id="new-last-name" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className="col-span-3" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsAddUserModalOpen(false)}>Cancel</Button><Button onClick={handleSubmitAddUser}>Create User</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Credentials</DialogTitle>
            <DialogDescription>Update the phone number (username) and password for {currentProfile?.email}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="update-phone" className="text-right">Phone</Label>
              <Input id="update-phone" type="tel" value={newPhone} onChange={(e) => { setNewPhone(e.target.value); setNewAuthPassword(e.target.value); }} className="col-span-3" placeholder="10-digit number" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="update-password" className="text-right">New Password</Label>
              <Input id="update-password" type="text" value={newAuthPassword} onChange={(e) => setNewAuthPassword(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAuthModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAuthUpdate}>Update Credentials</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;