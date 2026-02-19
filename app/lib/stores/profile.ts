import { atom } from 'nanostores';

interface Profile {
  username: string;
  bio: string;
  avatar: string;
}

// Initialize with stored profile or defaults
const storedProfile = typeof window !== 'undefined' ? localStorage.getItem('bolt_profile') : null;
const initialProfile: Profile = (() => {
  if (storedProfile) {
    try {
      return JSON.parse(storedProfile);
    } catch (error) {
      console.error('Error parsing stored profile:', error);
      localStorage.removeItem('bolt_profile');
    }
  }
  return {
    username: '',
    bio: '',
    avatar: '',
  };
})();

export const profileStore = atom<Profile>(initialProfile);

export const updateProfile = (updates: Partial<Profile>) => {
  profileStore.set({ ...profileStore.get(), ...updates });

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('bolt_profile', JSON.stringify(profileStore.get()));
  }
};
