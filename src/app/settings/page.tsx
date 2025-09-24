'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Lock, 
  Shield, 
  Trash2, 
  ArrowLeft, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { updateProfile, updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';
import { isBanned, isSuspended } from '@/lib/userStorage';

export default function SettingsPage() {
  const { user, auth } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const userStatus = {
    banned: isBanned(user?.email),
    suspended: isSuspended(user?.email)
  };

  if (!isClient) return null;

  if (!user || !auth) {
    router.push('/login');
    return null;
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.newPassword && !formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required to change password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateProfile = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setSuccessMessage('');
    
    try {
      if (formData.displayName !== user.displayName) {
        await updateProfile(user, {
          displayName: formData.displayName
        });
        setSuccessMessage('Profile updated successfully!');
      }

      if (formData.newPassword && formData.currentPassword) {
        // Re-authenticate user before password change
        const credential = EmailAuthProvider.credential(
          user.email!,
          formData.currentPassword
        );
        
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, formData.newPassword);
        
        setSuccessMessage('Password updated successfully!');
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      }

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      
    } catch (error: any) {
      console.error('Update error:', error);
      let errorMessage = 'Failed to update profile';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
        setErrors(prev => ({ ...prev, currentPassword: errorMessage }));
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak';
        setErrors(prev => ({ ...prev, newPassword: errorMessage }));
      } else {
        setErrors(prev => ({ ...prev, general: errorMessage }));
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast({
        title: "Error",
        description: "Please enter your password to confirm account deletion",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Re-authenticate user before deletion
      const credential = EmailAuthProvider.credential(
        user.email!,
        deletePassword
      );
      
      await reauthenticateWithCredential(user, credential);
      await deleteUser(user);
      
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });
      
      router.push('/');
      
    } catch (error: any) {
      console.error('Delete error:', error);
      let errorMessage = 'Failed to delete account';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Password is incorrect';
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <h1 className="text-3xl font-bold text-green-800 mb-2">Account Settings</h1>
          <p className="text-green-600">Manage your account preferences and security settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <Card className="bg-white border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <User className="w-5 h-5 mr-2" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Account Status */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-sm text-green-700">Account Status</span>
                <span className="text-sm font-semibold px-2 py-1 rounded-md border"
                  style={{
                    backgroundColor: userStatus.banned ? '#fee2e2' : userStatus.suspended ? '#fef3c7' : '#ecfccb',
                    color: userStatus.banned ? '#991b1b' : userStatus.suspended ? '#92400e' : '#166534',
                    borderColor: userStatus.banned ? '#fecaca' : userStatus.suspended ? '#fde68a' : '#bbf7d0'
                  }}
                >
                  {userStatus.banned ? 'Banned' : userStatus.suspended ? 'Suspended' : 'Active'}
                </span>
              </div>
              <div>
                <Label htmlFor="displayName" className="text-green-700">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Enter your display name"
                  className="border-green-200 focus:border-green-500"
                />
                {errors.displayName && (
                  <p className="text-red-500 text-sm mt-1">{errors.displayName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email" className="text-green-700">Email Address</Label>
                <Input
                  id="email"
                  value={formData.email}
                  disabled
                  className="border-green-200 bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-green-600 mt-1">Email cannot be changed</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>Email verified: {user.emailVerified ? 'Yes' : 'No'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card className="bg-white border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <Lock className="w-5 h-5 mr-2" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword" className="text-green-700">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    placeholder="Enter current password"
                    className="border-green-200 focus:border-green-500 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {errors.currentPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>
                )}
              </div>

              <div>
                <Label htmlFor="newPassword" className="text-green-700">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    placeholder="Enter new password"
                    className="border-green-200 focus:border-green-500 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {errors.newPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-green-700">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Confirm new password"
                    className="border-green-200 focus:border-green-500 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-white border-green-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <Shield className="w-5 h-5 mr-2" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Two-Factor Authentication</h4>
                <p className="text-sm text-green-600 mb-3">
                  Add an extra layer of security to your account
                </p>
                <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                  Enable 2FA
                </Button>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Login Sessions</h4>
                <p className="text-sm text-green-600 mb-3">
                  Manage your active login sessions
                </p>
                <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                  View Sessions
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-white border-red-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <AlertCircle className="w-5 h-5 mr-2" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800 mb-2">Delete Account</h4>
                <p className="text-sm text-red-600 mb-3">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
                
                {!showDeleteConfirm ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Input
                      type="password"
                      placeholder="Enter your password to confirm"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="border-red-300"
                    />
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteAccount}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isLoading ? 'Deleting...' : 'Confirm Delete'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeletePassword('');
                        }}
                        className="border-red-300 text-red-700 hover:bg-red-100"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleUpdateProfile}
            disabled={isLoading}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isLoading ? 'Updating...' : 'Save Changes'}
          </Button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert className="mt-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {errors.general && (
          <Alert className="mt-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {errors.general}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}