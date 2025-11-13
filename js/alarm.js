import { showNotification } from './notifications.js';

export function initAlarmChecker() {
  setInterval(checkDueAlarms, 30 * 1000); // Check every 30 seconds
}

function checkDueAlarms() {
  let tasks = [];
  try {
    tasks = JSON.parse(localStorage.getItem('kanbanTasks')) || [];
  } catch {
    tasks = [];
  }
  const now = new Date();

  tasks.forEach(task => {
    if (!task.alarmTime) return;

    const alarmDate = new Date(task.alarmTime);

    if (
      now >= alarmDate &&
      (!task.alarmTriggered || new Date(task.alarmTriggered) < alarmDate)
    ) {
      // Show browser notification which uses system default sound
      showNotification('Task Alarm', { body: `${task.name} is due now!` });
      
      // Also show alert popup as fallback, no custom audio now
      alert(`Task Alarm:\n${task.name} is due now!`);

      task.alarmTriggered = new Date().toISOString();
      saveAlarmTriggeredFlag(task.name, task.alarmTriggered);
    }
  });
}

function saveAlarmTriggeredFlag(taskName, timestamp) {
  let tasks = [];
  try {
    tasks = JSON.parse(localStorage.getItem('kanbanTasks')) || [];
  } catch {
    tasks = [];
  }
  tasks = tasks.map(t => (t.name === taskName ? { ...t, alarmTriggered: timestamp } : t));
  localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
}
