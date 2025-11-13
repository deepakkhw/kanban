export function saveTasksToStorage(tasks) {
  localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
}

export function loadTasksFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('kanbanTasks')) || [];
  } catch {
    return [];
  }
}
