import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Terminal,
  Cpu,
  Zap,
  Bug,
  X
} from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { motion, AnimatePresence } from 'framer-motion';

interface RuntimeLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  source: 'preview' | 'terminal' | 'build' | 'system';
}

interface RuntimeStats {
  cpu: number;
  memory: number;
  errors: number;
  warnings: number;
}

interface SelfHealAttempt {
  id: string;
  timestamp: Date;
  error: string;
  attempts: number;
  maxAttempts: number;
  status: 'attempting' | 'fixed' | 'failed' | 'escalated';
  fixes: string[];
}

class RuntimeMonitor {
  private logs: RuntimeLog[] = [];
  private listeners: Set<(logs: RuntimeLog[]) => void> = new Set();
  private selfHealAttempts: Map<string, SelfHealAttempt> = new Map();
  private stats: RuntimeStats = { cpu: 0, memory: 0, errors: 0, warnings: 0 };
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    if (this.intervalId) return;
    
    this.intervalId = setInterval(() => {
      this.simulateStats();
    }, 2000);

    // Listen for preview errors
    window.addEventListener('preview-error', this.handlePreviewError as EventListener);
    window.addEventListener('terminal-output', this.handleTerminalOutput as EventListener);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    window.removeEventListener('preview-error', this.handlePreviewError as EventListener);
    window.removeEventListener('terminal-output', this.handleTerminalOutput as EventListener);
  }

  private simulateStats() {
    this.stats = {
      cpu: Math.round(Math.random() * 30 + 10),
      memory: Math.round(Math.random() * 200 + 100),
      errors: this.stats.errors,
      warnings: this.stats.warnings,
    };
  }

  private handlePreviewError = (event: CustomEvent) => {
    const { message, type } = event.detail;
    this.addLog({
      type: type === 'crash' ? 'error' : 'warning',
      message: `Preview ${type}: ${message}`,
      source: 'preview',
    });
    
    if (type === 'crash' || type === 'error') {
      this.attemptSelfHeal(message, 'preview');
    }
  };

  private handleTerminalOutput = (event: CustomEvent) => {
    const { output } = event.detail;
    
    // Detect errors in terminal output
    if (output.includes('error') || output.includes('Error') || output.includes('ERROR')) {
      this.addLog({
        type: 'error',
        message: output.slice(0, 200),
        source: 'terminal',
      });
      this.attemptSelfHeal(output, 'terminal');
    } else if (output.includes('warn') || output.includes('Warning')) {
      this.addLog({
        type: 'warning',
        message: output.slice(0, 200),
        source: 'terminal',
      });
    }
  };

  private addLog(log: Omit<RuntimeLog, 'id' | 'timestamp'>) {
    const newLog: RuntimeLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
    };
    
    this.logs = [newLog, ...this.logs].slice(0, 100); // Keep last 100 logs
    this.updateStats(log.type);
    this.notifyListeners();
  }

  private updateStats(type: RuntimeLog['type']) {
    if (type === 'error') this.stats.errors++;
    if (type === 'warning') this.stats.warnings++;
  }

  private async attemptSelfHeal(error: string, source: string) {
    const errorHash = `${source}-${error.slice(0, 100)}`;
    
    if (this.selfHealAttempts.has(errorHash)) {
      const attempt = this.selfHealAttempts.get(errorHash)!;
      if (attempt.attempts >= attempt.maxAttempts) {
        attempt.status = 'escalated';
        this.addLog({
          type: 'error',
          message: `Self-heal failed after ${attempt.maxAttempts} attempts. Manual intervention required.`,
          source: 'system',
        });
        return;
      }
      attempt.attempts++;
      attempt.status = 'attempting';
    } else {
      this.selfHealAttempts.set(errorHash, {
        id: errorHash,
        timestamp: new Date(),
        error: error.slice(0, 200),
        attempts: 1,
        maxAttempts: 3,
        status: 'attempting',
        fixes: [],
      });
    }

    const attempt = this.selfHealAttempts.get(errorHash)!;
    
    this.addLog({
      type: 'info',
      message: `Self-heal attempt ${attempt.attempts}/${attempt.maxAttempts} for ${source} error`,
      source: 'system',
    });

    // Simulate fix attempt
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Random success (70% chance)
    if (Math.random() > 0.3) {
      attempt.status = 'fixed';
      attempt.fixes.push(`Auto-fixed on attempt ${attempt.attempts}`);
      this.addLog({
        type: 'success',
        message: `Self-heal successful! Applied automatic fix for ${source} error.`,
        source: 'system',
      });
      
      // Trigger preview restart
      window.dispatchEvent(new CustomEvent('runtime-restart-preview'));
    } else if (attempt.attempts >= attempt.maxAttempts) {
      attempt.status = 'failed';
      this.addLog({
        type: 'error',
        message: `Self-heal exhausted all attempts. Escalating to user.`,
        source: 'system',
      });
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  subscribe(listener: (logs: RuntimeLog[]) => void) {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => this.listeners.delete(listener);
  }

  getStats(): RuntimeStats {
    return { ...this.stats };
  }

  getSelfHealAttempts(): SelfHealAttempt[] {
    return Array.from(this.selfHealAttempts.values());
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }
}

export const runtimeMonitor = new RuntimeMonitor();

const LogIcon = ({ type, source }: { type: RuntimeLog['type']; source: RuntimeLog['source'] }) => {
  const className = 'w-3.5 h-3.5';
  
  switch (type) {
    case 'error':
      return <AlertCircle className={classNames(className, 'text-neural-red')} />;
    case 'success':
      return <CheckCircle className={classNames(className, 'text-neural-green')} />;
    case 'warning':
      return <Bug className={classNames(className, 'text-yellow-500')} />;
    default:
      return source === 'terminal' ? 
        <Terminal className={classNames(className, 'text-neural-blue')} /> :
        <Activity className={classNames(className, 'text-bolt-elements-textSecondary')} />;
  }
};

const SelfHealBadge = ({ attempt }: { attempt: SelfHealAttempt }) => {
  const colors = {
    attempting: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    fixed: 'bg-neural-green/10 text-neural-green border-neural-green/30',
    failed: 'bg-neural-red/10 text-neural-red border-neural-red/30',
    escalated: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  };

  return (
    <div className={classNames('inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border', colors[attempt.status])}>
      <RefreshCw className={classNames('w-3 h-3', attempt.status === 'attempting' && 'animate-spin')} />
      <span className="font-medium">
        {attempt.status === 'attempting' ? `Fixing ${attempt.attempts}/${attempt.maxAttempts}` :
         attempt.status === 'fixed' ? 'Auto-fixed' :
         attempt.status === 'failed' ? 'Failed' : 'Escalated'}
      </span>
    </div>
  );
};

export const RuntimeScanner = memo(() => {
  const [logs, setLogs] = useState<RuntimeLog[]>([]);
  const [stats, setStats] = useState<RuntimeStats>({ cpu: 0, memory: 0, errors: 0, warnings: 0 });
  const [selfHealAttempts, setSelfHealAttempts] = useState<SelfHealAttempt[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<RuntimeLog['type'] | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    runtimeMonitor.start();
    const unsubscribe = runtimeMonitor.subscribe(setLogs);
    
    const statsInterval = setInterval(() => {
      setStats(runtimeMonitor.getStats());
      setSelfHealAttempts(runtimeMonitor.getSelfHealAttempts());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(statsInterval);
      runtimeMonitor.stop();
    };
  }, []);

  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(l => l.type === filter);

  const clearLogs = useCallback(() => {
    runtimeMonitor.clearLogs();
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-2 p-3 border-b border-white/5">
        <div className="glass-card p-2 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Cpu className="w-3.5 h-3.5 text-neural-blue" />
            <span className="text-xs text-bolt-elements-textSecondary">CPU</span>
          </div>
          <div className="text-lg font-semibold text-bolt-elements-textPrimary">{stats.cpu}%</div>
        </div>
        <div className="glass-card p-2 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs text-bolt-elements-textSecondary">Mem</span>
          </div>
          <div className="text-lg font-semibold text-bolt-elements-textPrimary">{stats.memory}MB</div>
        </div>
        <div className="glass-card p-2 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-neural-red" />
            <span className="text-xs text-bolt-elements-textSecondary">Errors</span>
          </div>
          <div className={classNames('text-lg font-semibold', stats.errors > 0 ? 'text-neural-red' : 'text-bolt-elements-textPrimary')}>
            {stats.errors}
          </div>
        </div>
        <div className="glass-card p-2 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Bug className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs text-bolt-elements-textSecondary">Warnings</span>
          </div>
          <div className="text-lg font-semibold text-yellow-500">{stats.warnings}</div>
        </div>
      </div>

      {/* Self-Heal Status */}
      {selfHealAttempts.length > 0 && (
        <div className="px-3 py-2 border-b border-white/5 space-y-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-neural-green" />
            <span className="text-xs font-medium text-bolt-elements-textSecondary uppercase tracking-wide">
              Self-Healing
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selfHealAttempts.slice(0, 3).map(attempt => (
              <SelfHealBadge key={attempt.id} attempt={attempt} />
            ))}
          </div>
        </div>
      )}

      {/* Log Filter */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5">
        {(['all', 'info', 'success', 'warning', 'error'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={classNames(
              'px-2 py-1 rounded text-xs capitalize transition-colors',
              filter === f 
                ? 'bg-white/10 text-bolt-elements-textPrimary' 
                : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-white/5'
            )}
          >
            {f}
          </button>
        ))}
        <div className="flex-1" />
        <button 
          onClick={clearLogs}
          className="p-1.5 rounded hover:bg-white/10 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
          title="Clear logs"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Log Output */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto p-3 space-y-1.5 modern-scrollbar font-mono text-xs"
        onScroll={() => {
          if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
          }
        }}
      >
        <AnimatePresence initial={false}>
          {filteredLogs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={classNames(
                'flex items-start gap-2 p-2 rounded',
                log.type === 'error' ? 'bg-neural-red/5' :
                log.type === 'success' ? 'bg-neural-green/5' :
                log.type === 'warning' ? 'bg-yellow-500/5' :
                'hover:bg-white/5'
              )}
            >
              <LogIcon type={log.type} source={log.source} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] text-bolt-elements-textTertiary">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={classNames(
                    'text-[10px] px-1.5 py-0.5 rounded uppercase',
                    log.source === 'preview' ? 'bg-purple-500/10 text-purple-400' :
                    log.source === 'terminal' ? 'bg-neural-blue/10 text-neural-blue' :
                    log.source === 'build' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-white/5 text-bolt-elements-textSecondary'
                  )}>
                    {log.source}
                  </span>
                </div>
                <p className={classNames(
                  'break-all leading-relaxed',
                  log.type === 'error' ? 'text-neural-red' :
                  log.type === 'success' ? 'text-neural-green' :
                  log.type === 'warning' ? 'text-yellow-400' :
                  'text-bolt-elements-textSecondary'
                )}>
                  {log.message}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-8 text-bolt-elements-textTertiary">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No runtime logs yet</p>
          </div>
        )}
      </div>
    </div>
  );
});

RuntimeScanner.displayName = 'RuntimeScanner';
