// Remove the old privacy badge listeners as they caused the overlap
// const privacy=document.getElementById('privacyBadge');
// const tooltip=document.getElementById('privacyTooltip');
// privacy.addEventListener('mouseenter', ()=>{ tooltip.classList.remove('hidden'); });
// ... (removed all old privacy listeners)

// NEW IDEA: Dismissible Privacy Banner Logic
const privacyBanner = document.getElementById('privacyBanner');
const dismissPrivacyBtn = document.getElementById('dismissPrivacy');
const showPrivacyBtn = document.getElementById('showPrivacyBtn');

// Check if the user has dismissed the banner before
if (localStorage.getItem('privacyBannerDismissed') === 'true') {
    privacyBanner.style.display = 'none';
    document.querySelector('h1').style.marginTop = '22px'; // Restore original margin
}

// Function to dismiss the banner
function dismissBanner() {
    privacyBanner.style.display = 'none';
    localStorage.setItem('privacyBannerDismissed', 'true');
    document.querySelector('h1').style.marginTop = '22px'; // Adjust H1 margin
}

// Function to show the banner
function showBanner() {
    privacyBanner.style.display = 'flex';
    localStorage.removeItem('privacyBannerDismissed'); // Reset dismissal flag
    document.querySelector('h1').style.marginTop = '50px'; // Adjust H1 margin
}

dismissPrivacyBtn.addEventListener('click', dismissBanner);
showPrivacyBtn.addEventListener('click', showBanner);


let tasks = JSON.parse(localStorage.getItem("kanbanTasks") || "[]");
const todoTasksDiv = document.getElementById("todoTasks"),
  inprogressTasksDiv = document.getElementById("inprogressTasks"),
  doneTasksDiv = document.getElementById("doneTasks"),
  archiveTasksDiv = document.getElementById("archiveTasks"),
  archiveSection = document.getElementById("archiveSection"),
  showAddTodoTop = document.getElementById("showAddTodoTop"),
  addFormTodo = document.getElementById("addFormTodo"),
  saveTodoBtn = document.getElementById("saveTodo"),
  cancelTodoBtn = document.getElementById("cancelTodo"),
  searchInput = document.getElementById("searchInput"),
  showArchiveBtn = document.getElementById("showArchiveBtn"),
  closeArchiveBtn = document.getElementById("closeArchive"),
  backupBtn = document.getElementById("backupBtn"),
  restoreBtn = document.getElementById("restoreBtn"),
  importInput = document.getElementById("importInput"),
  editModalBackdrop = document.getElementById("editModalBackdrop"),
  closeEditModalBtn = document.getElementById("closeEditModal"),
  editTaskForm = document.getElementById("editTaskForm"),
  editNameInput = document.getElementById("editName"),
  editDescInput = document.getElementById("editDesc"),
  editPrioritySelect = document.getElementById("editPriority"),
  editAlarmInput = document.getElementById("editAlarm"),
  editTagsInput = document.getElementById("editTags"),
  editStatusSelect = document.getElementById("editStatus");
const PRIORITY_CLASSES = { low: "priority-low", medium: "priority-medium", major: "priority-major" };
const WELCOME_TASK_ID = "WELCOME_TASK";
let editingTaskId = null;
let notifiedTaskIds = new Set(); 

function saveTasks() { localStorage.setItem("kanbanTasks", JSON.stringify(tasks)); }
function escapeHtml(text) { if (!text) return ""; return text.replace(/[&<>"']/g, m => ({ '&': "&amp;", '<': "&lt;", '>': "&gt;", '"': "&quot;", "'": "&#39;" })[m]); }
function getTaskAgeBadge(createdAt) { const created = new Date(createdAt), today = new Date(), yesterday = new Date(); yesterday.setDate(today.getDate() - 1); if (created.toDateString() === today.toDateString()) return 'Today'; if (created.toDateString() === yesterday.toDateString()) return 'Yesterday'; return null; }
function getTaskAgeClass(createdAt) { const created = new Date(createdAt), today = new Date(), yesterday = new Date(); yesterday.setDate(today.getDate() - 1); if (created.toDateString() === today.toDateString()) return 'badge-today'; if (created.toDateString() === yesterday.toDateString()) return 'badge-yesterday'; return 'badge-old'; }
function formatDateTime(ts) { return (new Date(ts)).toLocaleString(undefined, {dateStyle:'short',timeStyle:'short'});}

function renderTasks(container, taskArray, allowEditing = true) {
  container.innerHTML = "";
  if (taskArray.length === 0 && container.id === 'todoTasks' && searchInput.value === "") {
    const placeholderTask = {
        id: WELCOME_TASK_ID,
        name: "Welcome to your AI-Kanban!",
        description: "Click '+ Add Task' (Alt+A) to start. All data is local. Backup often!",
        priority: "low",
        tags: ["setup", "guide"],
        status: "todo",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMovedAt: null
    };
    taskArray.push(placeholderTask);
  }

  taskArray.forEach(task => {
    const isPlaceholder = task.id === WELCOME_TASK_ID;
    const div = document.createElement("div");
    div.className = "task " + PRIORITY_CLASSES[task.priority];
    div.draggable = allowEditing && !isPlaceholder;
    div.dataset.id = task.id; div.tabIndex = 0;
    
    const ageBadge = isPlaceholder ? 'NEW' : getTaskAgeBadge(task.createdAt);
    const ageClass = isPlaceholder ? 'badge-today' : getTaskAgeClass(task.createdAt);
    
    const tagsHtml = task.tags && Array.isArray(task.tags) && task.tags.length ? task.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("") : "";
    const alarmStr = task.alarmDate ? formatDateTime(task.alarmDate) : "";
    
    div.innerHTML = `
      <div class="task-badge ${ageClass}">${ageBadge || ''}</div>
      <strong>${escapeHtml(task.name)}</strong>
      <details><summary>Description</summary><p>${escapeHtml(task.description || "No description")}</p></details>
      <div><b>Priority:</b> ${task.priority}</div>
      <div class="tags">${tagsHtml}</div>
      ${alarmStr ? `<div><b>Alarm:</b> ${alarmStr}</div>` : ""}
      ${isPlaceholder ? '' : `
        <button class="more-detail-link" type="button">More details</button>
        <div class="history-details hidden">
          Created: ${formatDateTime(task.createdAt)}<br/>
          Edited: ${formatDateTime(task.updatedAt)}<br/>
          Moved: ${task.lastMovedAt ? formatDateTime(task.lastMovedAt) : 'N/A'}
        </div>
        ${allowEditing ? `<div class="task-buttons"><button class="editBtn">Edit</button><button class="deleteBtn">Delete</button></div>` : ""}
      `}
    `;
    container.appendChild(div);
    
    if (allowEditing && !isPlaceholder) {
      div.addEventListener("dragstart", dragStart);
      div.querySelector(".editBtn").addEventListener("click", () => openEditModal(task.id));
      div.querySelector(".deleteBtn").addEventListener("click", () => deleteTask(task.id));
      
      div.querySelector(".more-detail-link").addEventListener("click", function(){
        let hd = div.querySelector(".history-details");
        if (hd.classList.contains("hidden")) { hd.classList.remove("hidden"); this.textContent = "Hide details"; }
        else { hd.classList.add("hidden"); this.textContent = "More details"; }
      });
    }
  });
}
function renderBoard() {
  const now = Date.now(), sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000, filtered = filterTasks(searchInput.value);
  const activeTasks = filtered.filter(t => new Date(t.createdAt).getTime() > sevenDaysAgo);
  const archivedTasks = filtered.filter(t => new Date(t.createdAt).getTime() <= sevenDaysAgo);
  
  renderTasks(todoTasksDiv, activeTasks.filter(t => t.status === "todo"));
  renderTasks(inprogressTasksDiv, activeTasks.filter(t => t.status === "inprogress" && t.id !== WELCOME_TASK_ID));
  renderTasks(doneTasksDiv, activeTasks.filter(t => t.status === "done" && t.id !== WELCOME_TASK_ID));
  renderTasks(archiveTasksDiv, archivedTasks, false);
}
function filterTasks(term) {
  term = term.trim().toLowerCase();
  if (!term) return tasks.filter(t => t.id !== WELCOME_TASK_ID);
  return tasks.filter(t =>
    t.name.toLowerCase().includes(term) ||
    (t.description && t.description.toLowerCase().includes(term)) ||
    (t.tags && Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().includes(term)))
  );
}
// Add form events
showAddTodoTop.addEventListener("click", () => {
  addFormTodo.classList.remove("hidden");
  addFormTodo.setAttribute("aria-hidden", "false");
  document.getElementById("todoName").value = "";
  addFormTodo.querySelector("#todoName").focus();
});
cancelTodoBtn.addEventListener("click", () => {
  addFormTodo.classList.add("hidden"); addFormTodo.setAttribute("aria-hidden", "true"); clearAddForm();
});
function clearAddForm(){
  document.getElementById("todoName").value = "";
  document.getElementById("todoDesc").value = "";
  document.getElementById("todoPriority").value = "medium";
  document.getElementById("todoAlarm").value = "";
  document.getElementById("todoTags").value = "";
}
addFormTodo.addEventListener("submit", function(e){
  e.preventDefault();
  const name = document.getElementById("todoName").value.trim();
  if (!name) return alert("Task name is required");
  const desc = document.getElementById("todoDesc").value.trim(),
    priority = document.getElementById("todoPriority").value,
    alarmDate = document.getElementById("todoAlarm").value,
    tags = document.getElementById("todoTags").value.split(",").map(t => t.trim()).filter(Boolean);
  
  tasks = tasks.filter(t => t.id !== WELCOME_TASK_ID); 
    
  tasks.push({
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    name, description: desc, priority,
    alarmDate: alarmDate ? new Date(alarmDate).toISOString() : null,
    tags, status: "todo",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastMovedAt: null
  });
  saveTasks(); renderBoard(); clearAddForm();
  addFormTodo.classList.add("hidden"); addFormTodo.setAttribute("aria-hidden", "true");
});
// Drag and drop
let draggedTaskId = null;
function dragStart(event) {
  draggedTaskId = event.target.dataset.id;
  if (draggedTaskId === WELCOME_TASK_ID) {
    event.preventDefault();
    draggedTaskId = null;
    return;
  }
  event.dataTransfer.setData("text/plain", draggedTaskId);
  event.dataTransfer.effectAllowed = "move";
}
function dragOver(event) { event.preventDefault(); }
function drop(event) {
  event.preventDefault();
  const columnId = event.currentTarget.id; 
  if (!draggedTaskId) return;
  const task = tasks.find(t => t.id === draggedTaskId);
  if (task) {
    if (columnId === "todoCol") task.status = "todo";
    else if (columnId === "inprogressCol") task.status = "inprogress";
    else if (columnId === "doneCol") task.status = "done";
    task.lastMovedAt = new Date().toISOString();
    task.updatedAt = task.lastMovedAt;
    saveTasks(); renderBoard();
  }
  draggedTaskId = null;
}
["todoCol","inprogressCol","doneCol"].forEach(id=>{
  const col = document.getElementById(id);
  col.addEventListener("dragover", dragOver); col.addEventListener("drop", drop);
});
function deleteTask(id) {
  if (!confirm("Are you sure you want to delete this task?")) return;
  tasks = tasks.filter(t => t.id !== id); 
  if (tasks.length === 0) { notifiedTaskIds.clear(); } 
  saveTasks(); 
  renderBoard();
}
// Edit modal
function openEditModal(id) {
  editingTaskId = id;
  const task = tasks.find(t => t.id === id);
  if (!task || task.id === WELCOME_TASK_ID) return alert("Task not found or cannot be edited");
  editNameInput.value = task.name;
  editDescInput.value = task.description || "";
  editPrioritySelect.value = task.priority;
  editAlarmInput.value = task.alarmDate ? task.alarmDate.substring(0,16) : "";
  editTagsInput.value = (task.tags && Array.isArray(task.tags)) ? task.tags.join(", ") : "";
  editStatusSelect.value = task.status;
  editModalBackdrop.classList.add("hidden");
  setTimeout(() => {editModalBackdrop.classList.remove("hidden");editNameInput.focus();},10);
}
function closeEditModal() {
  editingTaskId = null;
  editModalBackdrop.classList.add("hidden");
}
closeEditModalBtn.addEventListener("click", closeEditModal);
document.getElementById("cancelEdit").addEventListener("click", closeEditModal);
editModalBackdrop.addEventListener("mousedown", function(e) { if (e.target === this) closeEditModal(); });
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape" && !editModalBackdrop.classList.contains("hidden")) closeEditModal();
});
editTaskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!editingTaskId) return;
  const task = tasks.find(t => t.id === editingTaskId);
  if (!task) return alert("Task not found");
  const name = editNameInput.value.trim();
  if (!name) return alert("Task name is required");
  task.name = name;
  task.description = editDescInput.value.trim();
  task.priority = editPrioritySelect.value;
  task.alarmDate = editAlarmInput.value ? new Date(editAlarmInput.value).toISOString() : null;
  task.tags = editTagsInput.value.split(",").map(t => t.trim()).filter(Boolean);
  task.status = editStatusSelect.value;
  task.updatedAt = new Date().toISOString();
  saveTasks(); renderBoard(); closeEditModal();
});
showArchiveBtn.addEventListener("click", () => {
  archiveSection.classList.remove("hidden");
  document.querySelector(".kanban-container").classList.add("hidden");
  showArchiveBtn.setAttribute("aria-expanded", "true");
  showArchiveBtn.classList.add("hidden");
  closeArchiveBtn.focus();
});
closeArchiveBtn.addEventListener("click", closeArchiveSection);
function closeArchiveSection() {
  archiveSection.classList.add("hidden");
  document.querySelector(".kanban-container").classList.remove("hidden");
  showArchiveBtn.setAttribute("aria-expanded", "false");
  showArchiveBtn.classList.remove("hidden");
  showArchiveBtn.focus();
}
searchInput.addEventListener("input", renderBoard);

// Alarm notifications
function requestNotifications() {
  if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") Notification.requestPermission();
  }
}
requestNotifications();
function showAlarm(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body: body });
  }
}
function notifyDueTasks() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const now = Date.now(), 
        next5min = now + 5 * 60 * 1000; 
  
  tasks.forEach(task => {
    if ((task.status === "todo" || task.status === "inprogress") && task.alarmDate && task.id !== WELCOME_TASK_ID && !notifiedTaskIds.has(task.id)) {
      const alarmTime = new Date(task.alarmDate).getTime();
      
      if (alarmTime >= now - 5 * 60 * 1000 && alarmTime <= next5min) {
        showAlarm("Kanban Task Alarm", `${task.name} is due at ${new Date(task.alarmDate).toLocaleTimeString()}`);
        notifiedTaskIds.add(task.id); 
      }
    }
  });
}
setInterval(() => { notifyDueTasks(); }, 5 * 60 * 1000); 

setInterval(() => { saveTasks(); }, 4 * 60 * 60 * 1000);

// Backup/restore
backupBtn.addEventListener("click", () => {
  const dataStr = JSON.stringify(tasks.filter(t => t.id !== WELCOME_TASK_ID), null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kanban-backup-${new Date().toISOString().substring(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
});
restoreBtn.addEventListener("click", () => importInput.click());
importInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        const hasValidTasks = imported.some(item => 
          typeof item === 'object' && 
          item !== null && 
          'name' in item && 
          'status' in item && 
          'createdAt' in item
        );
        
        if (hasValidTasks) {
          tasks = imported; 
          saveTasks(); 
          renderBoard();
          alert("Tasks restored successfully!");
        } else {
          alert("Invalid task structure found in the file. Restore failed.");
        }
      } else alert("Invalid file format. Expected an array of tasks.");
    } catch (error) { alert("Error reading file: " + error.message);}
  };
  reader.readAsText(file);
  importInput.value = "";
});
document.addEventListener("keydown", function(e){
  const mod = e.altKey;
  if(document.activeElement.tagName.match(/^INPUT|TEXTAREA|SELECT$/i)) {
    if (addFormTodo && !addFormTodo.classList.contains('hidden')) {
      if (mod && e.key.toLowerCase() === "s") { saveTodoBtn.click(); e.preventDefault(); }
      else if ((mod && e.key.toLowerCase() === "c") || e.key === "Escape") { cancelTodoBtn.click(); e.preventDefault(); }
    }
    if (editModalBackdrop && !editModalBackdrop.classList.contains('hidden')) {
      if (mod && e.key.toLowerCase() === "s") { editTaskForm.querySelector('button[type="submit"]').click(); e.preventDefault(); }
      else if ((mod && e.key.toLowerCase() === "c") || e.key === "Escape") { closeEditModal(); e.preventDefault(); }
    }
    if (e.key === "/" && document.activeElement !== searchInput) {
      searchInput.focus(); e.preventDefault();
    }
    return;
  }
  if      (mod && e.key.toLowerCase() === "a") { showAddTodoTop.click(); e.preventDefault(); }
  else if (mod && e.key.toLowerCase() === "b") { backupBtn.click(); e.preventDefault(); }
  else if (mod && e.key.toLowerCase() === "r") { restoreBtn.click(); e.preventDefault(); }
  else if ((mod && e.key.toLowerCase() === "f") || e.key === "/") { searchInput.focus(); e.preventDefault(); }
  else if (mod && e.key.toLowerCase() === "v") { showArchiveBtn.click(); e.preventDefault(); }
  else if (mod && e.key.toLowerCase() === "x") { 
    if (!archiveSection.classList.contains('hidden')) { closeArchiveSection(); e.preventDefault(); }
  }
  if (e.key === "Escape") {
    if (!addFormTodo.classList.contains('hidden')) cancelTodoBtn.click();
    if (!archiveSection.classList.contains('hidden')) closeArchiveSection();
    if (!editModalBackdrop.classList.contains('hidden')) closeEditModal();
  }
});

// Initial call to render the board
renderBoard();
