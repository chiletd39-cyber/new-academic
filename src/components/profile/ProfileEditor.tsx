import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Loader2, Save, User, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ClassSwitcher } from '@/components/dashboard/ClassSwitcher';

interface ProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ open, onOpenChange }) => {
  const { profile, updateProfile, uploadAvatar } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [currentClass, setCurrentClass] = useState(profile?.current_class || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setIsLoading(true);
    const { url, error } = await uploadAvatar(file);
    
    if (error) {
      toast.error('Failed to upload avatar');
      setAvatarPreview(null);
    } else if (url) {
      await updateProfile({ avatar_url: url });
      toast.success('Avatar updated!');
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    // Students cannot change their own class
    const updates: Record<string, string> = {
      full_name: fullName,
      phone,
    };
    
    // Only non-students can update class
    if (profile?.role !== 'student') {
      updates.current_class = currentClass;
    }

    const { error } = await updateProfile(updates);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully!');
      onOpenChange(false);
    }
    
    setIsLoading(false);
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        {profile?.role === 'student' ? (
          <Tabs defaultValue="profile">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="profile" className="gap-1">
                <User className="h-3 w-3" /> Profile
              </TabsTrigger>
              <TabsTrigger value="class" className="gap-1">
                <ArrowRightLeft className="h-3 w-3" /> Class & History
              </TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="space-y-6 mt-4">
              {renderProfileForm()}
            </TabsContent>
            <TabsContent value="class" className="mt-4">
              <ClassSwitcher />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            {renderProfileForm()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  function renderProfileForm() {
    return (
      <>
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarPreview || profile?.avatar_url || ''} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          <p className="text-xs text-muted-foreground">Click camera to change photo</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div>
            <Label>Phone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+250 xxx xxx xxx"
            />
          </div>

          {profile?.role === 'student' && (
            <div>
              <Label>Class</Label>
              <Input
                value={profile?.current_class || ''}
                disabled
                className="bg-muted"
                placeholder="Assigned by admin"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use the "Class & History" tab to request a class switch.
              </p>
            </div>
          )}

          <div>
            <Label>Role</Label>
            <Input
              value={profile?.role?.toUpperCase() || ''}
              disabled
              className="bg-muted"
            />
          </div>

          {profile?.role === 'teacher' && (
            <div>
              <Label>Teacher MCode</Label>
              <Input
                value={(profile as any)?.teacher_mcode || 'Generating...'}
                disabled
                className="bg-muted font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Share this code with parents so they can send you direct messages.
              </p>
            </div>
          )}

          <div>
            <Label>Student Card</Label>
            <Input
              value={profile?.student_card || 'N/A'}
              disabled
              className="bg-muted"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </>
    );
  }
};