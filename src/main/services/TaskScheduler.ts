import { PublishTask, TaskStatus } from '../../types';

type TaskReadyCallback = (task: PublishTask) => void;
type TaskExpiredCallback = (task: PublishTask) => void;

export class TaskScheduler {
  private tasks: Map<string, PublishTask> = new Map();
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private taskReadyCallbacks: TaskReadyCallback[] = [];
  private taskExpiredCallbacks: TaskExpiredCallback[] = [];

  addTask(task: PublishTask): void {
    this.tasks.set(task.id, task);
  }

  removeTask(taskId: string): void {
    this.tasks.delete(taskId);
  }

  getTasks(): PublishTask[] {
    return Array.from(this.tasks.values());
  }

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.isPaused = false;

    this.checkInterval = setInterval(() => {
      if (!this.isPaused) {
        this.checkAndTriggerTasks();
      }
    }, 1000); // Check every second
  }

  stop(): void {
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  getNextTask(): PublishTask | null {
    const sortedTasks = this.getSortedTasks();
    return sortedTasks.length > 0 ? sortedTasks[0] : null;
  }

  getTasksByStatus(status: TaskStatus): PublishTask[] {
    return Array.from(this.tasks.values()).filter((task) => task.status === status);
  }

  on(event: 'task-ready' | 'task-expired', callback: TaskReadyCallback | TaskExpiredCallback): void {
    if (event === 'task-ready') {
      this.taskReadyCallbacks.push(callback as TaskReadyCallback);
    } else if (event === 'task-expired') {
      this.taskExpiredCallbacks.push(callback as TaskExpiredCallback);
    }
  }

  private checkAndTriggerTasks(): void {
    const now = new Date();
    const tasks = this.getTasks();

    for (const task of tasks) {
      if (task.status === 'pending' && task.scheduledTime <= now) {
        // Task is ready to publish
        this.taskReadyCallbacks.forEach((callback) => callback(task));
      } else if (task.status === 'pending' && task.scheduledTime < new Date(now.getTime() - 60000)) {
        // Task is expired (more than 1 minute past scheduled time)
        this.taskExpiredCallbacks.forEach((callback) => callback(task));
      }
    }
  }

  private getSortedTasks(): PublishTask[] {
    const pendingTasks = this.getTasksByStatus('pending');
    return pendingTasks.sort((a, b) => {
      // Sort by scheduled time
      return a.scheduledTime.getTime() - b.scheduledTime.getTime();
    });
  }
}
