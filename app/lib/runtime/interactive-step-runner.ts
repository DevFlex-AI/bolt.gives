export interface InteractiveStep {
  description: string;
  command: string[];
}

export type InteractiveStepRunnerEventType =
  | 'step-start'
  | 'stdout'
  | 'stderr'
  | 'step-end'
  | 'error'
  | 'complete'
  | 'telemetry';

export interface InteractiveStepRunnerEvent {
  type: InteractiveStepRunnerEventType;
  timestamp: string;
  stepIndex?: number;
  description?: string;
  command?: string[];
  output?: string;
  exitCode?: number;
  error?: string;
  totalSteps?: number;
}

export interface StepExecutionResult {
  exitCode: number;
  stdout?: string;
  stderr?: string;
}

export interface StepExecutionContext {
  command: string[];
  onStdout: (chunk: string) => void;
  onStderr: (chunk: string) => void;
}

export interface StepExecutor {
  executeStep: (step: InteractiveStep, context: StepExecutionContext) => Promise<StepExecutionResult>;
}

export type StepEventSocket = Pick<WebSocket, 'readyState' | 'send'>;

export interface InteractiveStepRunResult {
  status: 'complete' | 'error';
  failedStepIndex?: number;
  exitCode?: number;
  error?: string;
}

const WS_OPEN = 1;
const STREAM_FLUSH_MS = 300;
const MAX_STREAM_BUFFER_CHARS = 2400;
const NOISY_PROGRESS_LINE_RE =
  /(?:^|\n)\s*(?:progress:\s+resolved|packages:\s+\+|lockfile is up to date|already up to date|resolved \d+, reused \d+).*$/gim;

function normalizeStreamChunk(chunk: string): string {
  if (!chunk) {
    return '';
  }

  return chunk
    .replace(/\r/g, '\n')
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '')
    .replace(NOISY_PROGRESS_LINE_RE, '')
    .replace(/\n{3,}/g, '\n\n');
}

export class InteractiveStepRunner extends EventTarget {
  #executor: StepExecutor;
  #socket?: StepEventSocket;
  #streamBuffer = new Map<string, InteractiveStepRunnerEvent>();
  #streamFlushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(executor: StepExecutor, socket?: StepEventSocket) {
    super();
    this.#executor = executor;
    this.#socket = socket;
  }

  #streamBufferKey(stepIndex: number, type: 'stdout' | 'stderr'): string {
    return `${stepIndex}:${type}`;
  }

  #scheduleStreamFlush() {
    if (this.#streamFlushTimer) {
      return;
    }

    this.#streamFlushTimer = setTimeout(() => {
      this.#flushStreamBuffer();
    }, STREAM_FLUSH_MS);
  }

  #bufferStreamChunk(type: 'stdout' | 'stderr', stepIndex: number, description: string, output: string) {
    const normalizedChunk = normalizeStreamChunk(output);

    if (!normalizedChunk.trim()) {
      return;
    }

    const key = this.#streamBufferKey(stepIndex, type);
    const existing = this.#streamBuffer.get(key);
    const nextOutput = `${existing?.output || ''}${normalizedChunk}`.slice(-MAX_STREAM_BUFFER_CHARS);

    this.#streamBuffer.set(key, {
      type,
      timestamp: new Date().toISOString(),
      stepIndex,
      description,
      output: nextOutput,
    });
    this.#scheduleStreamFlush();
  }

  #flushStreamBuffer() {
    if (this.#streamFlushTimer) {
      clearTimeout(this.#streamFlushTimer);
      this.#streamFlushTimer = null;
    }

    if (this.#streamBuffer.size === 0) {
      return;
    }

    for (const event of this.#streamBuffer.values()) {
      this.#emit(event);
    }

    this.#streamBuffer.clear();
  }

  #emit(event: InteractiveStepRunnerEvent) {
    this.dispatchEvent(new CustomEvent<InteractiveStepRunnerEvent>('event', { detail: event }));

    if (this.#socket?.readyState === WS_OPEN) {
      this.#socket.send(JSON.stringify(event));
    }
  }

  async run(steps: InteractiveStep[]): Promise<InteractiveStepRunResult> {
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index];

      this.#emit({
        type: 'step-start',
        timestamp: new Date().toISOString(),
        stepIndex: index,
        description: step.description,
        command: step.command,
      });

      try {
        const result = await this.#executor.executeStep(step, {
          command: step.command,
          onStdout: (chunk) => {
            this.#bufferStreamChunk('stdout', index, step.description, chunk);
          },
          onStderr: (chunk) => {
            this.#bufferStreamChunk('stderr', index, step.description, chunk);
          },
        });
        this.#flushStreamBuffer();

        this.#emit({
          type: 'step-end',
          timestamp: new Date().toISOString(),
          stepIndex: index,
          description: step.description,
          exitCode: result.exitCode,
          output: result.stdout,
        });

        if (result.exitCode !== 0) {
          const errorMessage = result.stderr || result.stdout || `Step failed with exit code ${result.exitCode}`;

          this.#emit({
            type: 'error',
            timestamp: new Date().toISOString(),
            stepIndex: index,
            description: step.description,
            exitCode: result.exitCode,
            error: errorMessage,
          });

          return {
            status: 'error',
            failedStepIndex: index,
            exitCode: result.exitCode,
            error: errorMessage,
          };
        }
      } catch (error) {
        this.#flushStreamBuffer();

        const errorMessage = error instanceof Error ? error.message : String(error);

        this.#emit({
          type: 'error',
          timestamp: new Date().toISOString(),
          stepIndex: index,
          description: step.description,
          error: errorMessage,
        });

        return {
          status: 'error',
          failedStepIndex: index,
          error: errorMessage,
        };
      }
    }

    this.#flushStreamBuffer();
    this.#emit({
      type: 'complete',
      timestamp: new Date().toISOString(),
      totalSteps: steps.length,
    });

    return {
      status: 'complete',
    };
  }
}
