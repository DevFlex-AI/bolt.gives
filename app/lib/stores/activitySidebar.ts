import { atom, map } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

export type ActivityTab = 'agents' | 'runtime' | 'git' | 'history' | 'settings';

interface ActivitySidebarState {
  isOpen: boolean;
  activeTab: ActivityTab;
  width: number;
}

const defaultState: ActivitySidebarState = {
  isOpen: false,
  activeTab: 'agents',
  width: 320,
};

export const activitySidebarStore = map<ActivitySidebarState>(defaultState);

export const setActivitySidebarOpen = (isOpen: boolean) => {
  activitySidebarStore.setKey('isOpen', isOpen);
};

export const toggleActivitySidebar = () => {
  const current = activitySidebarStore.get();
  activitySidebarStore.setKey('isOpen', !current.isOpen);
};

export const setActiveTab = (tab: ActivityTab) => {
  activitySidebarStore.setKey('activeTab', tab);
};

export const setSidebarWidth = (width: number) => {
  activitySidebarStore.setKey('width', Math.max(280, Math.min(480, width)));
};

// Actions exposed for components
activitySidebarStore.toggle = toggleActivitySidebar;
activitySidebarStore.setActiveTab = setActiveTab;
