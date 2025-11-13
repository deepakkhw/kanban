export function createTaskElement(taskData) {
  const task = document.createElement('div');
  task.className = 'task priority-' + taskData.priority;
  task.draggable = true;

  // Store all attributes in dataset
  Object.entries(taskData).forEach(([key, value]) => {
    task.dataset[key] = value || '';
  });

  // Display alarm time if set
  let alarmInfo = '';
  if (taskData.alarmTime) {
    alarmInfo = `<div class="alarm-info">Alarm: ${new Date(taskData.alarmTime).toLocaleString()}</div>`;
  }

  task.innerHTML = `
    <strong>${taskData.name}</strong>
    <button class="delete-btn" title="Delete task">&times;</button>
    <div>${taskData.description || ''}</div>
    <div class="dates">Created: ${new Date(taskData.createdDate).toLocaleDateString()} | Moved: ${new Date(taskData.movedDate).toLocaleDateString()} (${taskData.priority.charAt(0).toUpperCase()})</div>
    ${alarmInfo}
  `;

  // Delete button handler
  task.querySelector('.delete-btn').onclick = e => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${taskData.name}"?`)) {
      task.remove();
      saveAllTasks();
    }
  };

  // Drag handlers
  task.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', null);
    task.classList.add('dragging');
    window.draggedTask = task;
  });
  task.addEventListener('dragend', e => {
    task.classList.remove('dragging');
    window.draggedTask = null;
    task.dataset.movedDate = new Date().toISOString();

    // Update date display
    task.querySelector('.dates').textContent =
      `Created: ${new Date(task.dataset.createdDate).toLocaleDateString()} | Moved: ${new Date(task.dataset.movedDate).toLocaleDateString()} (${task.dataset.priority.charAt(0).toUpperCase()})`;
    saveAllTasks();
  });

  return task;
}

// Get all tasks from the DOM columns
export function getAllTaskElements(columns) {
  const allTasks = [];
  Object.values(columns).forEach(col => {
    [...col.children].forEach(child => {
      if (child.classList && child.classList.contains('task')) {
        allTasks.push(child);
      }
    });
  });
  return allTasks;
}

// Save all tasks in DOM to localStorage
export function saveAllTasks() {
  const columns = {
    todo: document.getElementById('todo'),
    inprogress: document.getElementById('inprogress'),
    done: document.getElementById('done')
  };

  const allTasks = getAllTaskElements(columns).map(taskElem => ({
    name: taskElem.dataset.name,
    description: taskElem.dataset.description,
    priority: taskElem.dataset.priority,
    tags: taskElem.dataset.tags,
    column: taskElem.parentElement.id,
    createdDate: taskElem.dataset.createdDate,
    movedDate: taskElem.dataset.movedDate,
    alarmTime: taskElem.dataset.alarmTime || null
  }));

  localStorage.setItem('kanbanTasks', JSON.stringify(allTasks));
}
