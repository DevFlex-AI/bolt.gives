import { useState, useCallback, memo } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Bug, 
  Terminal, 
  Cpu, 
  GitBranch, 
  History,
  Settings,
  Zap
} from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { activitySidebarStore } from '~/lib/stores/activitySidebar';
import { AgentHub } from '../agent-hub/AgentHub';
import { RuntimeScanner } from '../runtime/RuntimeScanner';

interface ActivitySidebarProps {
  className?: string;
}

type ActivityTab = 'agents' | 'runtime' | 'git' | 'history' | 'settings';

interface TabConfig {
  id: ActivityTab;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType;
}

const tabs: TabConfig[] = [
  { id: 'agents', label: 'Agent Hub', icon: Terminal, component: AgentHub },
  { id: 'runtime', label: 'Runtime', icon: Cpu, component: RuntimeScanner },
  { id: 'git', label: 'Git', icon: GitBranch, component: GitPanel },
  { id: 'history', label: 'History', icon: History, component: HistoryPanel },
  { id: 'settings', label: 'Settings', icon: Settings, component: SettingsPanel },
];

function GitPanel() {
  return (
    <div className="p-4">
      <h3 className="neural-heading neural-heading-sm mb-4">Git Operations</h3>
      <div className="space-y-2">
        <button className="neural-btn neural-btn-secondary w-full justify-start">
          <GitBranch className="w-4 h-4" />
          View Branches
        </button>
        <button className="neural-btn neural-btn-secondary w-full justify-start">
          <Zap className="w-4 h-4" />
          Sync Changes
        </button>
      </div>
    </div>
  );
}

function HistoryPanel() {
  return (
    <div className="p-4">
      <h3 className="neural-heading neural-heading-sm mb-4">Session History</h3>
      <div className="text-sm text-bolt-elements-textSecondary">
        No history items yet.
      </div>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="p-4">
      <h3 className="neural-heading neural-heading-sm mb-4">Quick Settings</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-bolt-elements-textSecondary">Auto-save</span>
          <button className="w-10 h-5 rounded-full bg-neural-green/30 relative">
            <span className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-neural-green" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-bolt-elements-textSecondary">Live Preview</span>
          <button className="w-10 h-5 rounded-full bg-neural-green/30 relative">
            <span className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-neural-green" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const ActivitySidebar = memo(({ className }: ActivitySidebarProps) => {
  const { isOpen, activeTab, setActiveTab, toggle } = useStore(activitySidebarStore);
  const [isHovered, setIsHovered] = useState(false);

  const handleTabClick = useCallback((tabId: ActivityTab) => {
    if (activeTab === tabId && isOpen) {
      toggle();
    } else {
      setActiveTab(tabId);
      if (!isOpen) {
        toggle();
      }
    }
  }, [activeTab, isOpen, setActiveTab, toggle]);

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || AgentHub;

  return (
    <div 
      className={classNames(
        'flex h-full transition-all duration-300 ease-out-expo',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tab Rail */}
      <div className="glass-sidebar w-14 flex flex-col items-center py-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && isOpen;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={classNames(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200',
                isActive 
                  ? 'bg-neural-green/10 text-neural-green shadow-[0_0_10px_rgba(0,255,65,0.2)]' 
                  : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-white/5'
              )}
              title={tab.label}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
        
        <div className="flex-1" />
        
        {/* Bug Report Button */}
        <button
          className="bug-report-btn w-10 h-10 p-0 justify-center"
          onClick={() => window.open('https://github.com/embire2/bolt.gives/issues/new', '_blank')}
          title="Report Bug"
        >
          <Bug className="w-4 h-4" />
        </button>
      </div>

      {/* Content Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass-sidebar border-l border-white/5 overflow-hidden"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <h2 className="neural-heading neural-heading-md">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h2>
                <button
                  onClick={toggle}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-white/5 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto modern-scrollbar">
                <ActiveComponent />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ActivitySidebar.displayName = 'ActivitySidebar';
