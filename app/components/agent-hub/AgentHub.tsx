import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { 
  Terminal, 
  Play, 
  Square, 
  RotateCcw, 
  Plus,
  MoreHorizontal,
  Command,
  Bot,
  Sparkles,
  Code2,
  MessageSquare
} from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentSession {
  id: string;
  name: string;
  type: 'claude' | 'gemini' | 'codex' | 'opencode';
  status: 'idle' | 'running' | 'error';
  output: string[];
  lastActivity: Date;
}

const AGENT_TYPES = [
  { id: 'claude', name: 'Claude Code', icon: Bot, color: '#D4A574' },
  { id: 'gemini', name: 'Gemini CLI', icon: Sparkles, color: '#4285F4' },
  { id: 'codex', name: 'Codex', icon: Code2, color: '#10A37F' },
  { id: 'opencode', name: 'Open Code', icon: Command, color: '#FF6B6B' },
];

// IPC Bridge for WebContainer Integration
class AgentIPCBridge {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  on(channel: string, callback: (data: any) => void) {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);
    return () => this.off(channel, callback);
  }

  off(channel: string, callback: (data: any) => void) {
    this.listeners.get(channel)?.delete(callback);
  }

  emit(channel: string, data: any) {
    this.listeners.get(channel)?.forEach(cb => cb(data));
  }

  sendToWebContainer(message: { type: string; payload: any }) {
    window.dispatchEvent(new CustomEvent('agent-ipc-to-webcontainer', { detail: message }));
  }

  receiveFromWebContainer(message: { type: string; payload: any }) {
    this.emit(message.type, message.payload);
  }
}

export const agentBridge = new AgentIPCBridge();

interface AgentTerminalProps {
  session: AgentSession;
  onClose: () => void;
  onRestart: () => void;
}

const AgentTerminal = memo(({ session, onClose, onRestart }: AgentTerminalProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [session.output]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    agentBridge.sendToWebContainer({
      type: 'agent-command',
      payload: { 
        agentId: session.id, 
        command: input 
      }
    });
    setInput('');
  }, [input, session.id]);

  const agentType = AGENT_TYPES.find(t => t.id === session.type);

  return (
    <div className="flex flex-col h-full bg-[#050505] rounded-lg border border-white/10 overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2">
          {agentType && <agentType.icon className="w-4 h-4" style={{ color: agentType.color }} />}
          <span className="text-sm font-medium text-bolt-elements-textPrimary">{session.name}</span>
          <span className={classNames(
            'w-2 h-2 rounded-full',
            session.status === 'running' ? 'bg-neural-green animate-pulse' :
            session.status === 'error' ? 'bg-neural-red' : 'bg-bolt-elements-textTertiary'
          )} />
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onRestart}
            className="p-1.5 rounded hover:bg-white/10 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-bolt-elements-textSecondary hover:text-neural-red transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div 
        ref={terminalRef}
        className="flex-1 p-3 overflow-auto font-mono text-xs leading-relaxed space-y-1 modern-scrollbar"
      >
        {session.output.length === 0 ? (
          <div className="text-bolt-elements-textTertiary italic">
            Agent ready. Type a command to begin...
          </div>
        ) : (
          session.output.map((line, i) => (
            <div key={i} className={classNames(
              'break-all',
              line.startsWith('>') ? 'text-neural-green' :
              line.startsWith('!') ? 'text-neural-red' :
              line.startsWith('$') ? 'text-neural-blue' :
              'text-bolt-elements-textSecondary'
            )}>
              {line}
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-white/5">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded">
          <span className="text-neural-green text-xs">❯</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter command..."
            className="flex-1 bg-transparent border-none outline-none text-xs text-bolt-elements-textPrimary placeholder:text-bolt-elements-textTertiary"
          />
        </div>
      </form>
    </div>
  );
});

AgentTerminal.displayName = 'AgentTerminal';

export const AgentHub = memo(() => {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showNewAgentMenu, setShowNewAgentMenu] = useState(false);

  const createSession = useCallback((type: AgentSession['type']) => {
    const agentType = AGENT_TYPES.find(t => t.id === type);
    const newSession: AgentSession = {
      id: `agent-${Date.now()}`,
      name: `${agentType?.name || 'Agent'} ${sessions.length + 1}`,
      type,
      status: 'idle',
      output: [
        `> Initializing ${agentType?.name}...`,
        `> Agent ready for commands`,
        `$ Connected to WebContainer workspace`
      ],
      lastActivity: new Date(),
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    setShowNewAgentMenu(false);
  }, [sessions.length]);

  const closeSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
  }, [activeSessionId]);

  const restartSession = useCallback((id: string) => {
    setSessions(prev => prev.map(s => 
      s.id === id 
        ? { 
            ...s, 
            status: 'idle', 
            output: [...s.output, '> Restarting agent...'] 
          }
        : s
    ));
  }, []);

  // IPC Listener for agent responses
  useEffect(() => {
    const unsubscribe = agentBridge.on('agent-response', (data) => {
      setSessions(prev => prev.map(s => 
        s.id === data.agentId 
          ? { ...s, output: [...s.output, data.message], lastActivity: new Date() }
          : s
      ));
    });

    return unsubscribe;
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-neural-green" />
          <span className="neural-heading neural-heading-sm">Agent Hub</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNewAgentMenu(!showNewAgentMenu)}
            className="neural-btn neural-btn-primary py-1.5 px-3 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Agent
          </button>
          
          <AnimatePresence>
            {showNewAgentMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
              >
                {AGENT_TYPES.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => createSession(agent.id as AgentSession['type'])}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                  >
                    <agent.icon className="w-4 h-4" style={{ color: agent.color }} />
                    <span className="text-sm text-bolt-elements-textPrimary">{agent.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Session Tabs */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-2 border-b border-white/5 overflow-x-auto">
          {sessions.map((session) => {
            const agentType = AGENT_TYPES.find(t => t.id === session.type);
            const isActive = activeSessionId === session.id;
            
            return (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={classNames(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all whitespace-nowrap',
                  isActive 
                    ? 'bg-neural-green/10 text-neural-green border border-neural-green/20' 
                    : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-white/5'
                )}
              >
                {agentType && <agentType.icon className="w-3.5 h-3.5" style={{ color: isActive ? undefined : agentType.color }} />}
                <span className="font-medium">{session.name}</span>
                <span className={classNames(
                  'w-1.5 h-1.5 rounded-full',
                  session.status === 'running' ? 'bg-neural-green' :
                  session.status === 'error' ? 'bg-neural-red' : 'bg-bolt-elements-textTertiary'
                )} />
              </button>
            );
          })}
        </div>
      )}

      {/* Active Terminal */}
      <div className="flex-1 p-4 overflow-hidden">
        {activeSession ? (
          <AgentTerminal 
            session={activeSession}
            onClose={() => closeSession(activeSession.id)}
            onRestart={() => restartSession(activeSession.id)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full bg-neural-green/10 flex items-center justify-center mb-4">
              <Terminal className="w-8 h-8 text-neural-green" />
            </div>
            <h3 className="neural-heading neural-heading-md mb-2">No Active Agents</h3>
            <p className="text-sm text-bolt-elements-textSecondary mb-4 max-w-xs">
              Launch AI agents to assist with coding tasks. They can run in parallel and collaborate.
            </p>
            <button
              onClick={() => setShowNewAgentMenu(true)}
              className="neural-btn neural-btn-primary"
            >
              <Plus className="w-4 h-4" />
              Launch First Agent
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

AgentHub.displayName = 'AgentHub';
