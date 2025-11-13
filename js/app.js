import { requestNotificationPermission } from './notifications.js';
import { initAlarmChecker } from './alarm.js';
import { createTaskElement, saveAllTasks } from './tasks.js';
import { loadTasksFromStorage } from './storage.js';

const columns = {
  todo: document.getElementById('todo'),
  inprogress: document.getElementById('inprogress'),
  done: document.getElementById('done')
};

function loadTasks() {
  const tasks = loadTasksFromStorage();
  const now = new Date();
  Object.values(columns).forEach(col => col.innerHTML = `<h2>${col.querySelector('h2').textContent}</h2>`);

  tasks.forEach(task => {
    const createdDate = new Date(task.createdDate);
    // Only load tasks created less than or equal to 7 days ago on main board
    if ((now - createdDate) / (1000*60*60*24) <= 7) {
      const taskElem = createTaskElement(task);
      columns[task.column].appendChild(taskElem);
    }
  });
}

document.getElementById('taskForm').addEventListener('submit', e => {
  e.preventDefault();

  const name = document.getElementById('taskName').value.trim();
  if (!name) return alert('Task name is required');

  const description = document.getElementById('taskDescription').value.trim();
  const priority = document.getElementById('taskPriority').value;
  const tags = document.getElementById('taskTags').value;
  const column = document.getElementById('taskColumn').value;
  const alarmTime = document.getElementById('taskAlarm').value || null;
  const nowIso = new Date().toISOString();

  const taskData = {
    name, description, priority, tags, column,
    createdDate: nowIso,
    movedDate: nowIso,
    alarmTime
  };

  const taskElem = createTaskElement(taskData);
  columns[column].appendChild(taskElem);
  saveAllTasks();

  e.target.reset();
  alert(`Task "${name}" added${alarmTime ? ' with alarm set' : ''}.`);
});

window.addEventListener('load', () => {
  requestNotificationPermission();
  loadTasks();
  initAlarmChecker();
});
