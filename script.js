// --- Element Definitions ---
const privacyBanner = document.getElementById('privacyBanner');
const dismissPrivacyBtn = document.getElementById('dismissPrivacy');
const showPrivacyBtn = document.getElementById('showPrivacyBtn');
const fixedBannerSpacer = document.getElementById('fixedBannerSpacer');

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
  
  // Data Management Buttons
  backupBtn = document.getElementById("backupBtn"),
  restoreBtn = document.getElementById("restoreBtn"),
  importInput = document.getElementById("importInput"), // File input is used by the Restore button

  editModalBackdrop = document.getElementById("editModalBackdrop"),
  closeEditModalBtn = document.getElementById("closeEditModal"),
  editTaskForm = document.getElementById("editTaskForm"),
  editNameInput = document.getElementById("editName"),
  editDescInput = document.getElementById("editDesc"),
  editPrioritySelect = document.getElementById("editPriority"),
  editAlarmInput = document.getElementById("editAlarm"),
  editTagsInput = document.getElementById("editTags"),
  editStatusSelect = document.getElementById("editStatus");
  
const aiFeedbackBox = document.getElementById("aiFeedbackBox"); 

// Help Modal Elements
const showHelpBtn = document.getElementById("showHelpBtn");
const helpModalBackdrop = document.getElementById("helpModalBackdrop");
const closeHelpModalBtn = document.getElementById("closeHelpModal");
const helpContent = document.getElementById("helpContent");


const PRIORITY_CLASSES = { low: "priority-low", medium: "priority-medium", major: "priority-major" };
const WELCOME_TASK_ID = "WELCOME_TASK";
let editingTaskId = null;
let notifiedTaskIds = new Set(); 

// --- Utility Functions ---

function saveTasks() { localStorage.setItem("kanbanTasks", JSON.stringify(tasks)); }
function escapeHtml(text) { if (!text) return ""; return text.replace(/[&<>"']/g, m => ({ '&': "&amp;", '<': "&lt;", '>': "&gt;", '"': "&quot;", "'": "&#39;" })[m]); }
function getTaskAgeBadge(createdAt) { const created = new Date(createdAt), today = new Date(), yesterday = new Date(); yesterday.setDate(today.getDate() - 1); if (created.toDateString() === today.toDateString()) return 'Today'; if (created.toDateString() === yesterday.toDateString()) return 'Yesterday'; return null; }
function getTaskAgeClass(createdAt) { const created = new Date(createdAt), today = new Date(), yesterday = new Date(); yesterday.setDate(today.getDate() - 1); if (created.toDateString() === today.toDateString()) return 'badge-today'; if (created.toDateString() === yesterday.toDateString()) return 'badge-yesterday'; return 'badge-old'; }
function formatDateTime(ts) { return (new Date(ts)).toLocaleString(undefined, {dateStyle:'short',timeStyle:'short'});}

function hideFeedback() {
    aiFeedbackBox.classList.add("hidden");
    aiFeedbackBox.innerHTML = "";
    aiFeedbackBox.classList.remove("success");
}
function clearAddForm(){
  document.getElementById("todoName").value = "";
  document.getElementById("todoDesc").value = "";
  document.getElementById("todoPriority").value = "medium";
  document.getElementById("todoAlarm").value = "";
  document.getElementById("todoTags").value = "";
}

// --- Privacy Banner Logic ---

function dismissBanner() {
    privacyBanner.classList.add('hidden');
    localStorage.setItem('privacyBannerDismissed', 'true');
}

function showBanner() {
    privacyBanner.classList.remove('hidden');
    localStorage.removeItem('privacyBannerDismissed');
}

// Initial check on load
if (localStorage.getItem('privacyBannerDismissed') === 'true') {
    privacyBanner.classList.add('hidden');
} else {
    privacyBanner.classList.remove('hidden');
}

dismissPrivacyBtn.addEventListener('click', dismissBanner);
showPrivacyBtn.addEventListener('click', showBanner);


// --- Task Rendering and Board Functions ---

function renderTasks(container, taskArray, allowEditing = true) {
  container.innerHTML = "";
  // Placeholder task logic
  if (taskArray.length === 0 && container.id === 'todoTasks' && searchInput.value === "") {
    if (!tasks.filter(t => t.id !== WELCOME_TASK_ID).length) {
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
      taskArray.unshift(placeholderTask);
    }
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
  // Hide feedback box whenever the board is re-rendered due to general searching/filtering
  const isTerm = searchInput.value.trim() !== "";
  if (isTerm && !isCommand(searchInput.value.trim())) {
      hideFeedback();
  } else if (!isTerm) {
      hideFeedback();
  }

  const now = Date.now(), sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000, filtered = filterTasks(searchInput.value);
  const activeTasks = filtered.filter(t => t.id !== WELCOME_TASK_ID && new Date(t.createdAt).getTime() > sevenDaysAgo);
  const archivedTasks = filtered.filter(t => t.id !== WELCOME_TASK_ID && new Date(t.createdAt).getTime() <= sevenDaysAgo);
  
  renderTasks(todoTasksDiv, activeTasks.filter(t => t.status === "todo"));
  renderTasks(inprogressTasksDiv, activeTasks.filter(t => t.status === "inprogress"));
  renderTasks(doneTasksDiv, activeTasks.filter(t => t.status === "done"));
  renderTasks(archiveTasksDiv, archivedTasks, false);
}


// --- Command Logic ---

// Helper to determine if the input is a command
function isCommand(term) {
    const lowerTerm = term.toLowerCase();
    return lowerTerm.startsWith("add ") || lowerTerm.startsWith("create ") || lowerTerm.startsWith("count ") || lowerTerm.startsWith("how many") || lowerTerm.startsWith("move ") || lowerTerm.startsWith("clear ") || lowerTerm.startsWith("complete ") || lowerTerm.startsWith("delete ");
}

// Function to handle query commands
function handleAICheck(term) {
    const lowerTerm = term.toLowerCase();
    const taskList = tasks.filter(t => t.id !== WELCOME_TASK_ID);
    let resultText = "";
    
    aiFeedbackBox.classList.remove("hidden");
    aiFeedbackBox.classList.remove("success");
    
    if (lowerTerm.includes("in progress") || lowerTerm.includes("inprogress")) {
        const count = taskList.filter(t => t.status === "inprogress").length;
        resultText = `You have <strong>${count}</strong> task(s) in progress.`;
    } else if (lowerTerm.includes("to-do") || lowerTerm.includes("todo")) {
        const count = taskList.filter(t => t.status === "todo").length;
        resultText = `You have <strong>${count}</strong> task(s) remaining in To-Do.`;
    } else if (lowerTerm.includes("major") || lowerTerm.includes("high priority")) {
        const count = taskList.filter(t => t.priority === "major").length;
        resultText = `You have <strong>${count}</strong> major priority task(s).`;
    } else {
        resultText = "Query recognized, but the target (status/priority) was not clear.";
    }

    aiFeedbackBox.innerHTML = resultText;
    searchInput.blur();
    setTimeout(hideFeedback, 4000);
}

// Function to create a task from a command string
function createTaskFromCommand(command) {
    const commandLower = command.toLowerCase();
    let taskString = command.replace(/^(add|create)\s*/i, '').trim();

    // 1. Extract Tags
    const tagsMatch = taskString.match(/#(\w+)/g) || [];
    const tags = tagsMatch.map(tag => tag.substring(1));
    taskString = taskString.replace(/#(\w+)/g, '').trim();

    // 2. Extract Priority
    let priority = "medium";
    if (commandLower.includes(" priority:low")) priority = "low";
    else if (commandLower.includes(" priority:major") || commandLower.includes(" priority:high")) priority = "major";
    taskString = taskString.replace(/priority:(low|medium|major|high)\s*/i, '').trim();

    // 3. Determine Alarm Date (Basic)
    let alarmDate = null;
    const now = new Date();
    
    if (commandLower.includes(" today")) {
        alarmDate = new Date(now);
        taskString = taskString.replace(/ today\s*/i, '').trim();
    }
    if (commandLower.includes(" tomorrow")) {
        alarmDate = new Date(now);
        alarmDate.setDate(now.getDate() + 1);
        taskString = taskString.replace(/ tomorrow\s*/i, '').trim();
    }
    
    // 4. Final Task Name
    const name = taskString.trim();

    if (name.length < 3) {
        aiFeedbackBox.classList.remove("hidden");
        aiFeedbackBox.classList.remove("success");
        aiFeedbackBox.innerHTML = 'Command failed ❌. Task name is too short or missing. Try: `add Call client #urgent priority:major`';
        setTimeout(hideFeedback, 4000);
        return;
    }

    // 5. Create the task object
    tasks = tasks.filter(t => t.id !== WELCOME_TASK_ID);
    tasks.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        name: name.charAt(0).toUpperCase() + name.slice(1),
        description: "",
        priority: priority,
        alarmDate: alarmDate ? alarmDate.toISOString() : null,
        tags: tags,
        status: "todo",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMovedAt: null
    });
    
    saveTasks();
    renderBoard();
    
    // 6. Success Feedback
    aiFeedbackBox.classList.remove("hidden");
    aiFeedbackBox.classList.add("success");
    aiFeedbackBox.innerHTML = `Task **'${name.substring(0, 30)}...'** successfully added to To-Do! ✅`;
    searchInput.value = "";
    searchInput.blur();
    setTimeout(hideFeedback, 4000);
}

// Function: Bulk Status Change (Move Command)
function handleMoveCommand(command) {
    const commandLower = command.toLowerCase();
    
    // 1. Determine the target status
    let targetStatus = null;
    let targetStatusName = "";
    if (commandLower.includes("to done") || commandLower.includes("to complete")) {
        targetStatus = "done"; targetStatusName = "Done";
    } else if (commandLower.includes("to in progress") || commandLower.includes("to ongoing")) {
        targetStatus = "inprogress"; targetStatusName = "In Progress";
    } else if (commandLower.includes("to todo") || commandLower.includes("to to-do")) {
        targetStatus = "todo"; targetStatusName = "To-Do";
    }
    
    if (!targetStatus) {
        aiFeedbackBox.classList.remove("hidden");
        aiFeedbackBox.classList.remove("success");
        aiFeedbackBox.innerHTML = 'Move failed ❌. Must specify a valid destination: `to done`, `to in progress`, or `to todo`.';
        setTimeout(hideFeedback, 5000);
        return;
    }

    // 2. Extract filter criteria
    let filterTerm = command.replace(/^(move|complete)\s+/i, '').replace(` to ${targetStatusName.toLowerCase()}`, '').trim();
    filterTerm = filterTerm.replace(/tasks\s*$/i, '').trim(); 
    
    const tasksToMove = tasks.filter(t => t.id !== WELCOME_TASK_ID && t.status !== targetStatus);
    let filteredTasks = tasksToMove;

    // Apply filtering based on remaining term
    if (filterTerm) {
        const lowerFilterTerm = filterTerm.toLowerCase();
        
        if (lowerFilterTerm.includes("todo") && lowerFilterTerm.includes("all")) {
            filteredTasks = tasksToMove.filter(t => t.status === "todo");
        } else if (lowerFilterTerm.includes("inprogress") && lowerFilterTerm.includes("all")) {
            filteredTasks = tasksToMove.filter(t => t.status === "inprogress");
        } else if (lowerFilterTerm.includes("#")) {
            const tagTerm = lowerFilterTerm.match(/#(\w+)/g) || [];
            const tagsToMatch = tagTerm.map(t => t.substring(1));
            
            filteredTasks = tasksToMove.filter(t => 
                t.tags && Array.isArray(t.tags) && t.tags.some(tag => tagsToMatch.includes(tag.toLowerCase()))
            );
        } else if (lowerFilterTerm.includes("all")) {
             // Move all tasks not already in the target status
             filteredTasks = tasksToMove;
        } else {
             // General keyword search
             filteredTasks = tasksToMove.filter(t =>
                t.name.toLowerCase().includes(lowerFilterTerm) ||
                (t.description && t.description.toLowerCase().includes(lowerFilterTerm))
            );
        }
    }
    
    const count = filteredTasks.length;

    if (count === 0) {
        aiFeedbackBox.classList.remove("hidden");
        aiFeedbackBox.classList.remove("success");
        aiFeedbackBox.innerHTML = `Move failed ❌. Found <strong>0</strong> tasks matching the criteria to move.`;
        setTimeout(hideFeedback, 5000);
        return;
    }

    // Perform the move
    filteredTasks.forEach(task => {
        task.status = targetStatus;
        task.lastMovedAt = new Date().toISOString();
        task.updatedAt = task.lastMovedAt;
    });

    saveTasks();
    renderBoard();

    // Success Feedback
    aiFeedbackBox.classList.remove("hidden");
    aiFeedbackBox.classList.add("success");
    aiFeedbackBox.innerHTML = `Successfully moved <strong>${count}</strong> tasks to **${targetStatusName}**! ✅`;
    searchInput.value = ""; 
    searchInput.blur();
    setTimeout(hideFeedback, 5000);
}

// Function: Bulk Deletion (Clear Command)
function handleClearCommand(command) {
    const commandLower = command.toLowerCase();
    
    // 1. Determine what to clear
    let filterTerm = command.replace(/^(clear|delete)\s*/i, '').trim();
    filterTerm = filterTerm.replace(/tasks\s*$/i, '').trim(); 

    let tasksToClear = tasks.filter(t => t.id !== WELCOME_TASK_ID);
    let filteredTasks = [];
    
    if (commandLower.includes("all done") || commandLower.includes("done tasks")) {
        filteredTasks = tasksToClear.filter(t => t.status === "done");
        filterTerm = "all DONE tasks";
    } else if (commandLower.includes("all archived") || commandLower.includes("archive tasks")) {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        filteredTasks = tasksToClear.filter(t => new Date(t.createdAt).getTime() <= sevenDaysAgo);
        filterTerm = "all ARCHIVED tasks (older than 7 days)";
    } else if (filterTerm.startsWith("#")) {
        // Clear by tag
        const tagsToMatch = filterTerm.split(/#/).filter(t => t.trim()).map(t => t.trim().toLowerCase());
        filteredTasks = tasksToClear.filter(t => 
            t.tags && Array.isArray(t.tags) && t.tags.some(tag => tagsToMatch.includes(tag.toLowerCase()))
        );
        filterTerm = `tasks with tags: ${filterTerm}`;
    } else {
        aiFeedbackBox.classList.remove("hidden");
        aiFeedbackBox.classList.remove("success");
        aiFeedbackBox.innerHTML = 'Clear failed ❌. Must specify a filter: `clear all done`, `clear all archived`, or `clear #tag`.';
        setTimeout(hideFeedback, 5000);
        return;
    }

    const count = filteredTasks.length;

    if (count === 0) {
        aiFeedbackBox.classList.remove("hidden");
        aiFeedbackBox.classList.remove("success");
        aiFeedbackBox.innerHTML = `Clear failed ❌. Found <strong>0</strong> tasks matching the criteria to delete.`;
        setTimeout(hideFeedback, 5000);
        return;
    }
    
    // DOUBLE CONFIRMATION
    const confirmation = prompt(`Are you absolutely sure you want to PERMANENTLY DELETE ${count} tasks matching: "${filterTerm}"? Type 'YES DELETE' to confirm.`);
    
    if (confirmation.toUpperCase() !== 'YES DELETE') {
        aiFeedbackBox.classList.remove("hidden");
        aiFeedbackBox.classList.remove("success");
        aiFeedbackBox.innerHTML = 'Clear cancelled 🛑. No tasks were deleted.';
        setTimeout(hideFeedback, 5000);
        return;
    }

    // Perform the deletion
    const tasksToDeleteIds = new Set(filteredTasks.map(t => t.id));
    tasks = tasks.filter(t => !tasksToDeleteIds.has(t.id));

    saveTasks();
    renderBoard();

    // Success Feedback
    aiFeedbackBox.classList.remove("hidden");
    aiFeedbackBox.classList.add("success");
    aiFeedbackBox.innerHTML = `Successfully DELETED <strong>${count}</strong> tasks! 🗑️`;
    searchInput.value = ""; 
    searchInput.blur();
    setTimeout(hideFeedback, 5000);
}


// Function: Enhanced filter/search function
function filterTasks(term) {
  term = term.trim();
  let taskList = tasks.filter(t => t.id !== WELCOME_TASK_ID);
  if (!term) return taskList;
  
  const lowerTerm = term.toLowerCase();
  
  // 1. Check for Action/Query Commands (do not filter the board)
  if (isCommand(term)) {
      return taskList; 
  }

  // 2. Standard text search / Tag Search / Special Filters
  
  // Handle specific tag search
  if (lowerTerm.startsWith("#")) {
      const tagTerm = lowerTerm.substring(1);
      return taskList.filter(t => 
          t.tags && Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().includes(tagTerm))
      );
  }

  // Handle date-based filter: `due next week`, `due tomorrow`
  if (lowerTerm.startsWith("due ")) {
    const dueTerm = lowerTerm.substring(4).trim();
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    let targetTime = null;

    if (dueTerm.includes("today")) {
        // Show tasks due today or past
        targetTime = now.getTime() + oneDay; 
    } else if (dueTerm.includes("tomorrow")) {
        // Show tasks due by tomorrow morning
        targetTime = now.getTime() + 2 * oneDay; 
    } else if (dueTerm.includes("next week") || dueTerm.includes("seven days")) {
        targetTime = now.getTime() + 7 * oneDay;
    } else {
        // Default to next 7 days if term is vague
        targetTime = now.getTime() + 7 * oneDay;
    }

    return taskList.filter(t => t.alarmDate && new Date(t.alarmDate).getTime() < targetTime);
  }
  
  // Handle existing AI search commands for filtering
  if (lowerTerm.includes("today tasks")) {
    const today = new Date().toDateString();
    return taskList.filter(t => t.alarmDate && new Date(t.alarmDate).toDateString() === today);
  }
  if (lowerTerm.includes("high priority") || lowerTerm.includes("major")) {
    return taskList.filter(t => t.priority === "major");
  }
  if (lowerTerm.includes("low priority")) {
    return taskList.filter(t => t.priority === "low");
  }

  // Standard text search
  return taskList.filter(t =>
    t.name.toLowerCase().includes(lowerTerm) ||
    (t.description && t.description.toLowerCase().includes(lowerTerm)) ||
    (t.tags && Array.isArray(t.tags) && t.tags.some(tag => tag.toLowerCase().includes(lowerTerm)))
  );
}


// --- Event Listeners ---

// Add form events
showAddTodoTop.addEventListener("click", () => {
  hideFeedback();
  addFormTodo.classList.remove("hidden");
  addFormTodo.setAttribute("aria-hidden", "false");
  document.getElementById("todoName").value = "";
  addFormTodo.querySelector("#todoName").focus();
});
cancelTodoBtn.addEventListener("click", () => {
  addFormTodo.classList.add("hidden"); 
  addFormTodo.setAttribute("aria-hidden", "true"); 
  clearAddForm();
});

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
  addFormTodo.classList.add("hidden"); 
  addFormTodo.setAttribute("aria-hidden", "true");
});

// Drag and drop functions
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
    let newStatus;
    if (columnId === "todoCol") newStatus = "todo";
    else if (columnId === "inprogressCol") newStatus = "inprogress";
    else if (columnId === "doneCol") newStatus = "done";
    
    if (newStatus && task.status !== newStatus) {
        task.status = newStatus;
        task.lastMovedAt = new Date().toISOString();
        task.updatedAt = task.lastMovedAt;
        saveTasks(); renderBoard();
    }
  }
  draggedTaskId = null;
}
["todoCol","inprogressCol","doneCol"].forEach(id=>{
  const col = document.getElementById(id);
  col.addEventListener("dragover", dragOver); col.addEventListener("drop", drop);
});

// Delete task function
function deleteTask(id) {
  if (!confirm("Are you sure you want to delete this task?")) return;
  tasks = tasks.filter(t => t.id !== id); 
  if (tasks.length === 0) { notifiedTaskIds.clear(); } 
  saveTasks(); 
  renderBoard();
}

// Edit Modal functions
function openEditModal(id) {
  editingTaskId = id;
  const task = tasks.find(t => t.id === id);
  if (!task || task.id === WELCOME_TASK_ID) return alert("Task not found or cannot be edited");
  editNameInput.value = task.name;
  editDescInput.value = task.description || "";
  editPrioritySelect.value = task.priority;
  // Format ISO date string to match input[type="datetime-local"] format (YYYY-MM-DDTHH:MM)
  editAlarmInput.value = task.alarmDate ? task.alarmDate.substring(0,16) : "";
  editTagsInput.value = (task.tags && Array.isArray(task.tags)) ? task.tags.join(", ") : "";
  editStatusSelect.value = task.status;
  
  editModalBackdrop.classList.remove("hidden");
  editNameInput.focus();
}
function closeEditModal() {
  editingTaskId = null;
  editModalBackdrop.classList.add("hidden");
}
closeEditModalBtn.addEventListener("click", closeEditModal);
document.getElementById("cancelEdit").addEventListener("click", closeEditModal);
editModalBackdrop.addEventListener("mousedown", function(e) { if (e.target === this) closeEditModal(); });

editTaskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!editingTaskId) return;
  const task = tasks.find(t => t.id === editingTaskId);
  if (!task) return alert("Task not found");
  const name = editNameInput.value.trim();
  if (!name) return alert("Task name is required");
  
  // Update task properties
  task.name = name;
  task.description = editDescInput.value.trim();
  task.priority = editPrioritySelect.value;
  task.alarmDate = editAlarmInput.value ? new Date(editAlarmInput.value).toISOString() : null;
  task.tags = editTagsInput.value.split(",").map(t => t.trim()).filter(Boolean);
  task.status = editStatusSelect.value;
  task.updatedAt = new Date().toISOString();
  
  saveTasks(); renderBoard(); closeEditModal();
});

// Archive functions
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

// Backup and Restore functions
backupBtn.addEventListener("click", () => {
  const dataStr = JSON.stringify(tasks);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = 'kanban_backup.json';
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
});

// Restore functionality update: Correctly bind the file input click to the restore button
document.getElementById('restoreBtn').addEventListener('click', function(e) {
    // The restoreBtn click is handled by the label in HTML, 
    // but here we ensure the file input is triggered if necessary.
    document.getElementById('importInput').click();
});

// Actual file import listener
document.getElementById('importInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedTasks = JSON.parse(event.target.result);
                if (Array.isArray(importedTasks)) {
                    // Filter out any tasks that do not have a name property (basic validation)
                    tasks = importedTasks.filter(t => t.name && t.id); 
                    saveTasks();
                    renderBoard();
                    alert("Board restored successfully!");
                } else {
                    alert("Restore failed: Imported file format is incorrect.");
                }
            } catch (error) {
                alert("Restore failed: Could not parse JSON data.");
                console.error("Restore error:", error);
            }
        };
        reader.readAsText(file);
        // Reset file input to allow restoring the same file again if needed
        e.target.value = null; 
    }
});


// Search input and command listeners
searchInput.addEventListener("input", renderBoard);

searchInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        e.preventDefault();
        const term = searchInput.value.trim();
        const lowerTerm = term.toLowerCase();
        
        if (lowerTerm.startsWith("add ") || lowerTerm.startsWith("create ")) {
            createTaskFromCommand(term);
        } else if (lowerTerm.startsWith("move ") || lowerTerm.startsWith("complete ")) {
            handleMoveCommand(term);
        } else if (lowerTerm.startsWith("clear ") || lowerTerm.startsWith("delete ")) {
            handleClearCommand(term);
        } else if (lowerTerm.startsWith("count ") || lowerTerm.startsWith("how many")) {
            handleAICheck(term);
        }
    }
});

// Check query on blur only if it's a query command
searchInput.addEventListener("blur", function() {
    const term = searchInput.value.trim();
    const lowerTerm = term.toLowerCase();
    
    if (lowerTerm.startsWith("count ") || lowerTerm.startsWith("how many")) {
        handleAICheck(term);
    }
});


// --- Help Modal Logic ---

function renderHelpContent() {
    helpContent.innerHTML = `
        <h2>🤖 Search / Ask AI Command Guide</h2>
        <p>Use the search bar to filter tasks, ask questions, or quickly manage tasks. Press <strong>Enter</strong> to run Action and Query commands.</p>
        
        <hr/>
        
        <h3>1. Action Commands (Quick Task Management)</h3>
        <p>These commands perform immediate actions on your board (Creation, Moving, Deleting).</p>
        
        <h4>A. Quick Create</h4>
        <p>Use <code>add</code> or <code>create</code> to instantly add a task to the **To-Do** column.</p>
        <table>
            <thead>
                <tr>
                    <th>Command Pattern</th>
                    <th>Example</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><code>(add|create) [Task Name] #tag priority:level (today|tomorrow)</code></td>
                    <td><code>add Call the client #urgent priority:major</code></td>
                </tr>
            </tbody>
        </table>
        
        <h4>B. Bulk Move</h4>
        <p>Use <code>move</code> or <code>complete</code> to change the status of multiple tasks at once. Use tags or statuses to filter the tasks.</p>
        <table>
            <thead>
                <tr>
                    <th>Command Pattern</th>
                    <th>Example</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><code>(move|complete) [filter] to (done|inprogress|todo)</code></td>
                    <td><code>move all #qa tasks to in progress</code></td>
                </tr>
                <tr>
                    <td>-</td>
                    <td><code>complete todo tasks to done</code></td>
                </tr>
            </tbody>
        </table>
        
        <h4>C. Bulk Clear / Delete (Requires 'YES DELETE' confirmation)</h4>
        <p>Use <code>clear</code> or <code>delete</code> to permanently remove tasks. This requires an extra step for safety.</p>
        <table>
            <thead>
                <tr>
                    <th>Command Pattern</th>
                    <th>Example</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><code>(clear|delete) all done</code></td>
                    <td><code>clear all done</code></td>
                </tr>
                <tr>
                    <td><code>(clear|delete) all archived</code></td>
                    <td><code>delete all archived</code></td>
                </tr>
                <tr>
                    <td><code>(clear|delete) #tag</code></td>
                    <td><code>clear #junk tags</code></td>
                </tr>
            </tbody>
        </table>

        <hr/>
        
        <h3>2. Query Commands (Instant Status Check)</h3>
        <p>Use <code>count</code> or <code>how many</code> to ask for metrics. The result appears in a temporary feedback box.</p>
        <table>
            <thead>
                <tr>
                    <th>Command Pattern</th>
                    <th>Example</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><code>(count|how many) tasks (in progress|todo|major priority)</code></td>
                    <td><code>count tasks in progress</code></td>
                </tr>
            </tbody>
        </table>
        
        <hr/>
        
        <h3>3. Filter Commands (Quick Searching)</h3>
        <p>These commands filter the board instantly as you type.</p>
        <table>
            <thead>
                <tr>
                    <th>Command Pattern</th>
                    <th>Example</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><code>#tag</code></td>
                    <td><code>#urgent</code></td>
                </tr>
                <tr>
                    <td><code>(due) (today|tomorrow|next week)</code></td>
                    <td><code>due next week</code></td>
                </tr>
                <tr>
                    <td><code>(major|low) priority</code></td>
                    <td><code>low priority</code></td>
                </tr>
                <tr>
                    <td><code>[any keyword]</code></td>
                    <td><code>database connection</code></td>
                </tr>
            </tbody>
        </table>
        
        <hr/>
        
        <h3>4. Keyboard Shortcuts</h3>
        <p>For even faster navigation and management.</p>
        <ul>
            <li><code>Alt + A</code>: Show / Hide **Add Task** form.</li>
            <li><code>Alt + S</code>: **Save** task (when form is open).</li>
            <li><code>Alt + C</code>: **Cancel** task (when form is open).</li>
            <li><code>Alt + F</code> or <code>/</code>: Focus on the **Search / Ask AI** bar.</li>
            <li><code>Alt + B</code> / <code>Alt + R</code>: **Backup** / **Restore** board data.</li>
            <li><code>Alt + V</code>: Show **Archive** view.</li>
            <li><code>Esc</code>: Close any open modal (Edit, Help) or the Archive view.</li>
        </ul>
    `;
}

function openHelpModal() {
    renderHelpContent();
    helpModalBackdrop.classList.remove("hidden");
    helpModalBackdrop.focus();
}

function closeHelpModal() {
    helpModalBackdrop.classList.add("hidden");
}

showHelpBtn.addEventListener("click", openHelpModal);
closeHelpModalBtn.addEventListener("click", closeHelpModal);
helpModalBackdrop.addEventListener("mousedown", function(e) { if (e.target === this) closeHelpModal(); });

// --- Global Keyboard Shortcuts ---

document.addEventListener("keydown", function(e){
  const mod = e.altKey;
  // Check if focus is on an input field
  const isInputFocused = document.activeElement.tagName.match(/^INPUT|TEXTAREA|SELECT$/i);

  if(isInputFocused) {
    // Shortcuts for Add Task Form
    if (addFormTodo && !addFormTodo.classList.contains('hidden')) {
      if (mod && e.key.toLowerCase() === "s") { saveTodoBtn.click(); e.preventDefault(); }
      else if ((mod && e.key.toLowerCase() === "c") || e.key === "Escape") { cancelTodoBtn.click(); e.preventDefault(); }
    }
    // Shortcuts for Edit Modal
    if (editModalBackdrop && !editModalBackdrop.classList.contains('hidden')) {
      if (mod && e.key.toLowerCase() === "s") { editTaskForm.querySelector('button[type="submit"]').click(); e.preventDefault(); }
      else if ((mod && e.key.toLowerCase() === "c") || e.key === "Escape") { closeEditModal(); e.preventDefault(); }
    }
    // Forward slash to focus search, only if not already in search
    if (e.key === "/" && document.activeElement !== searchInput) {
      searchInput.focus(); e.preventDefault();
    }
    return;
  }
  
  // Global Shortcuts (when no input is focused)
  if      (mod && e.key.toLowerCase() === "a") { showAddTodoTop.click(); e.preventDefault(); }
  else if (mod && e.key.toLowerCase() === "b") { backupBtn.click(); e.preventDefault(); }
  else if (mod && e.key.toLowerCase() === "r") { 
    // Alt+R should trigger the file selection for restore
    document.getElementById('importInput').click(); 
    e.preventDefault(); 
  }
  else if ((mod && e.key.toLowerCase() === "f") || e.key === "/") { searchInput.focus(); e.preventDefault(); }
  else if (mod && e.key.toLowerCase() === "v") { showArchiveBtn.click(); e.preventDefault(); }
  
  // Global Escape Key to close open sections/modals/help
  if (e.key === "Escape") {
    if (!addFormTodo.classList.contains('hidden')) cancelTodoBtn.click();
    if (!archiveSection.classList.contains('hidden')) closeArchiveSection();
    if (!editModalBackdrop.classList.contains('hidden')) closeEditModal();
    if (!helpModalBackdrop.classList.contains('hidden')) closeHelpModal();
  }
});

// --- Initialization ---

// Alarm check interval (keeping this for completeness, though not visually active in this style update)
setInterval(() => {
    const now = Date.now();
    tasks.forEach(task => {
        if (task.alarmDate && task.status !== "done") {
            const alarmTime = new Date(task.alarmDate).getTime();
            // Check if alarm is due (e.g., within the last 5 minutes) and hasn't been notified
            if (alarmTime > now - 300000 && alarmTime <= now && !notifiedTaskIds.has(task.id)) {
                alert(`🔔 ALARM: Task "${task.name}" is due now!`);
                notifiedTaskIds.add(task.id); 
            }
        }
    });
}, 60000); // Check every minute

// Initial render
renderBoard();
