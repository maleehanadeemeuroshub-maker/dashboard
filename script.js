// StudyDesk — dashboard behavior.
// CSS still owns the "submitted" checkmark/strikethrough visuals and the
// tiny hover/focus states. JS now owns: homework CRUD + filtering, course
// CRUD (add/edit/delete), grades editing, a weekly calendar view, due-date
// reminders, light/dark theme, and export/import/reset of all saved data —
// everything that needs real logic or needs to survive a page refresh.

const STORAGE_KEY = 'studydesk-v2';
const DAY_ABBR   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WEEK_ORDER  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ---- seed data for the 4 sample courses (used only the very first time
// the page loads on a browser; after that everything lives in state.courses) ----
const DEFAULT_COURSES = [
  { id:'CS201', name:'Data Structures', accent:'pink', progress:68, gradePct:78, letter:'B+', graded:6, total:9,
    next:'Assignment 4', nextDue:'Fri',
    syllabus:'Core data structures and algorithms — linked lists, trees, hash maps, and graphs — with weekly problem sets and two written exams.',
    files:['Syllabus.pdf', 'Lecture 6 slides — Trees.pdf', 'Assignment 3 rubric.pdf'] },
  { id:'MATH210', name:'Linear Algebra', accent:'blue', progress:82, gradePct:91, letter:'A-', graded:7, total:8,
    next:'Quiz 3', nextDue:'Thu',
    syllabus:'Vector spaces, matrix transformations, and eigenvalues, building toward a final project on PageRank.',
    files:['Course outline.pdf', 'Problem set 5.pdf'] },
  { id:'ENG105', name:'Academic Writing', accent:'yellow', progress:45, gradePct:72, letter:'B-', graded:3, total:7,
    next:'Essay draft', nextDue:'Mon',
    syllabus:'Workshop-style course on argumentative essays and source integration, with peer review every week.',
    files:['Style guide.pdf', 'Sample essay — annotated.pdf'] },
  { id:'PHY150', name:'Mechanics', accent:'coral', progress:90, gradePct:95, letter:'A', graded:5, total:6,
    next:'Lab report', nextDue:'Wed',
    syllabus:'Classical mechanics from kinematics through rotational dynamics, paired with a weekly lab section.',
    files:['Lab manual.pdf', 'Formula sheet.pdf'] },
];

// recurring weekly class schedule, shown on the Calendar tab
const STATIC_CLASSES = [
  { weekday:'Mon', time:'9:00',  course:'MATH210', title:'Lecture',  place:'Hall B' },
  { weekday:'Mon', time:'11:00', course:'CS201',   title:'Lab',      place:'Lab 3' },
  { weekday:'Tue', time:'10:00', course:'PHY150',  title:'Lecture',  place:'Hall A' },
  { weekday:'Tue', time:'15:00', course:'ENG105',  title:'Workshop', place:'Room 214' },
  { weekday:'Wed', time:'9:00',  course:'MATH210', title:'Lecture',  place:'Hall B' },
  { weekday:'Wed', time:'13:00', course:'PHY150',  title:'Lab',      place:'Lab 1' },
  { weekday:'Thu', time:'11:00', course:'CS201',   title:'Lab',      place:'Lab 3' },
  { weekday:'Fri', time:'10:00', course:'CS201',   title:'Lecture',  place:'Hall A' },
  { weekday:'Fri', time:'14:00', course:'ENG105',  title:'Seminar',  place:'Room 214' },
];

// weekday tag for the 5 static sample homework items already in the HTML —
// used by the calendar and the reminders panel, same as computed for new tasks.
const SAMPLE_TASK_WEEKDAY = { hw1:'Fri', hw2:'Thu', hw3:'Mon', hw4:'Tue', hw5:'Mon' };

// ---- element refs ----
const taskForm     = document.getElementById('task-form');
const hwList       = document.getElementById('hw-list');
const hwCountEl     = document.getElementById('hw-count');
const searchInput  = document.getElementById('search');
const courseEmpty  = document.getElementById('course-empty');
const courseGrid   = document.getElementById('course-grid');
const courseSelect = document.getElementById('task-course');
const gradesTable  = document.getElementById('grades-table');
const thisWeekList = document.getElementById('this-week-list');
const todayList    = document.getElementById('today-classes-list');
const calGrid      = document.getElementById('cal-grid');
const statEnrolled = document.getElementById('stat-enrolled');
const statDue      = document.getElementById('stat-due');
const statAvg      = document.getElementById('stat-avg');

const themeToggleBtn = document.getElementById('theme-toggle');
const bellBtn        = document.getElementById('reminder-btn');
const bellPanel      = document.getElementById('reminder-panel');
const gearBtn        = document.getElementById('settings-btn');

const addCourseBtn   = document.getElementById('add-course-btn');
const courseModal    = document.getElementById('course-modal');
const courseForm     = document.getElementById('course-form');
const courseModalTitle = document.getElementById('course-modal-title');
const deleteCourseBtn  = document.getElementById('course-delete-btn');

const detailModal    = document.getElementById('course-detail-modal');
const fileAddForm    = document.getElementById('file-add-form');

const settingsModal  = document.getElementById('settings-modal');
const exportBtn      = document.getElementById('export-btn');
const importInput    = document.getElementById('import-input');
const resetBtn       = document.getElementById('reset-btn');

// ---- persistence ----
function defaultState() {
  return {
    theme: 'dark',
    tasks: { added: [], done: [], deleted: [], nextId: 6 },
    courses: JSON.parse(JSON.stringify(DEFAULT_COURSES)),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      tasks: {
        added: Array.isArray(parsed.tasks?.added) ? parsed.tasks.added : [],
        done: Array.isArray(parsed.tasks?.done) ? parsed.tasks.done : [],
        deleted: Array.isArray(parsed.tasks?.deleted) ? parsed.tasks.deleted : [],
        nextId: typeof parsed.tasks?.nextId === 'number' ? parsed.tasks.nextId : 6,
      },
      courses: Array.isArray(parsed.courses) && parsed.courses.length ? parsed.courses : base.courses,
    };
  } catch (err) {
    console.warn('Could not read saved data, starting fresh.', err);
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save — storage may be full or blocked.', err);
  }
}

let state = loadState();
document.documentElement.setAttribute('data-theme', state.theme);

// ---- small helpers ----
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function formatDue(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function weekdayFromDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return null;
  return DAY_ABBR[d.getDay()];
}
function todayAbbr() { return DAY_ABBR[new Date().getDay()]; }
function letterFromPct(pct) {
  if (pct >= 93) return 'A'; if (pct >= 90) return 'A-';
  if (pct >= 87) return 'B+'; if (pct >= 83) return 'B'; if (pct >= 80) return 'B-';
  if (pct >= 77) return 'C+'; if (pct >= 73) return 'C'; if (pct >= 70) return 'C-';
  if (pct >= 60) return 'D'; return 'F';
}

// ---- toasts ----
function showToast(msg, danger) {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'toast' + (danger ? ' toast--danger' : '');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ---- modal helpers ----
function openModal(modal) { modal.hidden = false; }
function closeModal(modal) { modal.hidden = true; }
document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.closest('.modal-overlay')));
});
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay); });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay:not([hidden])').forEach(closeModal);
});

// =========================================================
// COURSES — render course cards, grades table, "this week",
// "today's classes", the course <select>, and top stats —
// all derived from state.courses so add/edit/delete stay in sync.
// =========================================================
function courseById(id) { return state.courses.find((c) => c.id === id); }

function renderCourses() {
  courseGrid.innerHTML = '';
  state.courses.forEach((c) => {
    const card = document.createElement('article');
    card.className = 'course-card rise';
    card.style.setProperty('--accent', `var(--${c.accent})`);
    card.dataset.id = c.id;
    card.innerHTML = `
      <button type="button" class="course-card__edit" aria-label="Edit ${escapeHTML(c.name)}">✎</button>
      <div class="flex items-center justify-between mb-2">
        <span class="font-mono text-[11px] text-chalkdim">${escapeHTML(c.id)}</span>
        <span class="font-mono text-[11px]" style="color:var(--${c.accent})">${c.gradePct}%</span>
      </div>
      <h3 class="font-display text-base mb-2">${escapeHTML(c.name)}</h3>
      <div class="progress-chalk"><div class="progress-chalk__bar" style="--p:${c.progress}%"></div></div>
      <p class="text-xs text-chalkdim mt-2">Next: ${escapeHTML(c.next || '—')} · due ${escapeHTML(c.nextDue || '—')}</p>
    `;
    card.addEventListener('click', () => openCourseDetail(c.id));
    card.querySelector('.course-card__edit').addEventListener('click', (e) => {
      e.stopPropagation();
      openCourseForm(c.id);
    });
    courseGrid.appendChild(card);
  });

  // course <select> in the add-task form
  const currentVal = courseSelect.value;
  courseSelect.innerHTML = '<option value="" selected disabled>Choose…</option>' +
    state.courses.map((c) => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.id)} — ${escapeHTML(c.name)}</option>`).join('');
  if (state.courses.some((c) => c.id === currentVal)) courseSelect.value = currentVal;

  renderGrades();
  renderThisWeek();
  renderTodayClasses();
  renderStats();
  renderCalendar();
}

function renderGrades() {
  gradesTable.innerHTML = `
    <div class="grades-row grades-row--head" role="row">
      <span role="columnheader">Course</span>
      <span role="columnheader">Graded</span>
      <span role="columnheader">Current grade</span>
      <span role="columnheader">Letter</span>
    </div>` + state.courses.map((c) => `
    <div class="grades-row" role="row" data-id="${c.id}">
      <span role="cell" class="grade-static">${escapeHTML(c.id)} — ${escapeHTML(c.name)}</span>
      <span role="cell" class="grade-static font-mono text-chalkdim">${c.graded} / ${c.total}</span>
      <span role="cell" class="grade-static"><div class="progress-chalk"><div class="progress-chalk__bar" style="--p:${c.gradePct}%; --accent:var(--${c.accent})"></div></div></span>
      <span role="cell" class="grade-static flex items-center gap-2">
        <span class="grade-pill" style="--accent:var(--${c.accent})">${escapeHTML(c.letter)}</span>
        <button type="button" class="grade-edit-btn" aria-label="Edit ${escapeHTML(c.name)} grade">✎</button>
      </span>
      <span role="cell" class="grade-editing" style="grid-column:1/-1">
        <div class="grade-edit-fields">
          <span>Graded</span><input type="number" min="0" class="ge-graded" value="${c.graded}" style="width:52px">
          <span>/ of</span><input type="number" min="0" class="ge-total" value="${c.total}" style="width:52px">
          <span>Grade %</span><input type="number" min="0" max="100" class="ge-pct" value="${c.gradePct}" style="width:60px">
          <button type="button" class="btn-ghost ge-save" style="flex:none;padding:6px 10px;">Save</button>
          <button type="button" class="btn-ghost ge-cancel" style="flex:none;padding:6px 10px;">Cancel</button>
        </div>
      </span>
    </div>`).join('');

  gradesTable.querySelectorAll('.grade-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('.grades-row').classList.add('grades-row--editing'));
  });
  gradesTable.querySelectorAll('.ge-cancel').forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('.grades-row').classList.remove('grades-row--editing'));
  });
  gradesTable.querySelectorAll('.ge-save').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.grades-row');
      const c = courseById(row.dataset.id);
      if (!c) return;
      c.graded = Math.max(0, parseInt(row.querySelector('.ge-graded').value, 10) || 0);
      c.total = Math.max(c.graded, parseInt(row.querySelector('.ge-total').value, 10) || c.graded);
      c.gradePct = Math.min(100, Math.max(0, parseInt(row.querySelector('.ge-pct').value, 10) || 0));
      c.letter = letterFromPct(c.gradePct);
      saveState();
      renderCourses();
      showToast(`Updated grade for ${c.id}`);
    });
  });
}

function renderThisWeek() {
  const upcoming = state.courses.filter((c) => c.next);
  thisWeekList.innerHTML = upcoming.length
    ? upcoming.map((c) => `
      <li class="week-item"><span class="week-dot" style="--accent:var(--${c.accent})"></span>
        <div><p class="text-sm">${escapeHTML(c.next)}</p><p class="text-[11px] text-chalkdim font-mono">${escapeHTML(c.id)} · ${escapeHTML(c.nextDue)}</p></div>
      </li>`).join('')
    : '<li class="week-item"><p class="text-sm">Nothing on deck — nice.</p></li>';
}

function renderTodayClasses() {
  const today = todayAbbr();
  const classes = STATIC_CLASSES.filter((cl) => cl.weekday === today);
  todayList.innerHTML = classes.length
    ? classes.map((cl) => {
        const c = courseById(cl.course);
        return `<li class="week-item"><span class="week-time font-mono">${cl.time}</span><div><p class="text-sm">${c ? escapeHTML(c.name) : cl.course} — ${escapeHTML(cl.title)}</p><p class="text-[11px] text-chalkdim">${escapeHTML(cl.place)}</p></div></li>`;
      }).join('')
    : '<li class="week-item"><p class="text-sm">No classes today.</p></li>';
}

function renderStats() {
  if (statEnrolled) statEnrolled.textContent = state.courses.length;
  if (statAvg) {
    const avg = state.courses.length ? Math.round(state.courses.reduce((s, c) => s + c.gradePct, 0) / state.courses.length) : 0;
    statAvg.textContent = `${avg}%`;
  }
  if (statDue) {
    const dueCount = hwList.querySelectorAll('.hw-item.hw-pending, .hw-item.hw-late').length;
    statDue.textContent = dueCount;
  }
}

// =========================================================
// COURSE ADD / EDIT MODAL
// =========================================================
function openCourseForm(id) {
  courseForm.reset();
  courseForm.dataset.editId = id || '';
  if (id) {
    const c = courseById(id);
    courseModalTitle.textContent = 'Edit course';
    deleteCourseBtn.hidden = false;
    courseForm.code.value = c.id;
    courseForm.code.disabled = true;
    courseForm.name.value = c.name;
    courseForm.progress.value = c.progress;
    courseForm.gradePct.value = c.gradePct;
    courseForm.graded.value = c.graded;
    courseForm.total.value = c.total;
    courseForm.next.value = c.next;
    courseForm.nextDue.value = c.nextDue;
    courseForm.syllabus.value = c.syllabus;
    const swatch = courseForm.querySelector(`input[name="accent"][value="${c.accent}"]`);
    if (swatch) swatch.checked = true;
  } else {
    courseModalTitle.textContent = 'Add course';
    deleteCourseBtn.hidden = true;
    courseForm.code.disabled = false;
    courseForm.progress.value = 0;
    courseForm.gradePct.value = 0;
    courseForm.graded.value = 0;
    courseForm.total.value = 1;
  }
  openModal(courseModal);
}
addCourseBtn.addEventListener('click', () => openCourseForm(null));

courseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!courseForm.checkValidity()) return;
  const editId = courseForm.dataset.editId;
  const accentInput = courseForm.querySelector('input[name="accent"]:checked');
  const gradePct = Math.min(100, Math.max(0, parseInt(courseForm.gradePct.value, 10) || 0));
  const data = {
    name: courseForm.name.value.trim(),
    accent: accentInput ? accentInput.value : 'blue',
    progress: Math.min(100, Math.max(0, parseInt(courseForm.progress.value, 10) || 0)),
    gradePct,
    letter: letterFromPct(gradePct),
    graded: Math.max(0, parseInt(courseForm.graded.value, 10) || 0),
    total: Math.max(1, parseInt(courseForm.total.value, 10) || 1),
    next: courseForm.next.value.trim(),
    nextDue: courseForm.nextDue.value.trim(),
    syllabus: courseForm.syllabus.value.trim(),
  };

  if (editId) {
    const c = courseById(editId);
    Object.assign(c, data);
    showToast(`Saved changes to ${c.id}`);
  } else {
    const code = courseForm.code.value.trim().toUpperCase();
    if (!code) return;
    if (courseById(code)) { showToast('That course code already exists', true); return; }
    state.courses.push({ id: code, files: [], ...data });
    showToast(`Added ${code}`);
  }
  saveState();
  renderCourses();
  closeModal(courseModal);
});

deleteCourseBtn.addEventListener('click', () => {
  const editId = courseForm.dataset.editId;
  if (!editId) return;
  if (!confirm(`Delete ${editId} and remove it from your course list?`)) return;
  state.courses = state.courses.filter((c) => c.id !== editId);
  saveState();
  renderCourses();
  closeModal(courseModal);
  showToast(`Deleted ${editId}`);
});

// =========================================================
// COURSE DETAIL MODAL (view syllabus + files, add a file)
// =========================================================
function openCourseDetail(id) {
  const c = courseById(id);
  if (!c) return;
  detailModal.dataset.id = id;
  detailModal.querySelector('.course-detail__name').textContent = `${c.id} — ${c.name}`;
  detailModal.querySelector('.course-detail__pct').textContent = `${c.gradePct}% · ${c.letter}`;
  detailModal.querySelector('.progress-chalk__bar').style.setProperty('--p', `${c.progress}%`);
  detailModal.querySelector('.progress-chalk__bar').style.setProperty('--accent', `var(--${c.accent})`);
  detailModal.querySelector('.syllabus-text').textContent = c.syllabus || 'No syllabus notes yet.';
  renderFileList(c);
  openModal(detailModal);
}
function renderFileList(c) {
  const list = detailModal.querySelector('.file-list');
  list.innerHTML = (c.files && c.files.length)
    ? c.files.map((f) => `<li class="file-row"><span class="file-row__icon">📄</span>${escapeHTML(f)}</li>`).join('')
    : '<li class="file-row" style="color:var(--chalkdim)">No files yet.</li>';
}
detailModal.querySelector('.course-detail__edit-btn').addEventListener('click', () => {
  const id = detailModal.dataset.id;
  closeModal(detailModal);
  openCourseForm(id);
});
fileAddForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = fileAddForm.querySelector('input');
  const name = input.value.trim();
  if (!name) return;
  const c = courseById(detailModal.dataset.id);
  if (!c) return;
  if (!c.files) c.files = [];
  c.files.push(name);
  input.value = '';
  saveState();
  renderFileList(c);
});

// =========================================================
// HOMEWORK — task creation, done/delete, priority + weekday,
// unified status+priority+search filtering.
// =========================================================
function buildTaskEl(task) {
  const doneId = `done-${task.id}`;
  const delId  = `del-${task.id}`;
  const priority = task.priority || 'medium';
  const li = document.createElement('li');
  li.className = 'hw-item hw-pending';
  li.dataset.id = task.id;
  li.dataset.priority = priority;
  li.dataset.weekday = task.weekday || weekdayFromDate(task.due) || '';
  li.innerHTML = `
    <input type="checkbox" id="${doneId}" class="hw-done-toggle" hidden>
    <input type="checkbox" id="${delId}" class="hw-del-toggle" hidden>
    <label for="${doneId}" class="hw-check" aria-label="Mark ${task.title} as submitted"></label>
    <div class="hw-body">
      <p class="hw-title">${task.title}</p>
      <p class="hw-meta font-mono">${escapeHTML(task.course)} · due ${formatDue(task.due)}</p>
    </div>
    <span class="hw-priority hw-priority--${priority}">${priority}</span>
    <span class="hw-status hw-status--pending">Pending</span>
    <span class="hw-status hw-status--done">Submitted</span>
    <label for="${delId}" class="hw-delete" aria-label="Delete ${task.title}">✕</label>
  `;
  return li;
}

// apply saved homework state before wiring new interactions
state.tasks.deleted.forEach((id) => {
  const el = hwList.querySelector(`[data-id="${id}"]`);
  if (el) el.remove();
});
state.tasks.added.forEach((task) => {
  if (state.tasks.deleted.includes(task.id)) return;
  hwList.appendChild(buildTaskEl(task));
});
state.tasks.done.forEach((id) => {
  const checkbox = document.getElementById(`done-${id}`);
  if (checkbox) checkbox.checked = true;
});
// fallback tagging in case any item is missing its weekday/priority data attribute
hwList.querySelectorAll('.hw-item').forEach((item) => {
  const id = item.dataset.id;
  if (!item.dataset.weekday && SAMPLE_TASK_WEEKDAY[id]) item.dataset.weekday = SAMPLE_TASK_WEEKDAY[id];
  if (!item.dataset.priority) item.dataset.priority = 'medium';
});

function updateTaskCount() {
  const count = hwList.querySelectorAll('.hw-item').length;
  if (hwCountEl) hwCountEl.textContent = `${count} task${count === 1 ? '' : 's'}`;
}

function applyFilters() {
  const statusInput = document.querySelector('input[name="hwFilter"]:checked');
  const status = statusInput ? statusInput.id : 'hw-all';
  const priInput = document.querySelector('input[name="hwPriorityFilter"]:checked');
  const priority = priInput ? priInput.id.replace('pri-', '') : 'all';
  const q = searchInput ? searchInput.value.trim().toLowerCase() : '';

  let anyVisible = false;
  hwList.querySelectorAll('.hw-item').forEach((item) => {
    const isDone = item.classList.contains('hw-done') || item.querySelector('.hw-done-toggle')?.checked;
    const isLate = item.classList.contains('hw-late');
    const matchesStatus = status === 'hw-all'
      || (status === 'hw-pending' && !isDone && !isLate)
      || (status === 'hw-late' && !isDone && isLate)
      || (status === 'hw-done' && isDone);
    const matchesPriority = priority === 'all' || item.dataset.priority === priority;
    const matchesSearch = !q || item.textContent.toLowerCase().includes(q);
    const show = matchesStatus && matchesPriority && matchesSearch;
    item.style.display = show ? 'flex' : 'none';
    if (show) anyVisible = true;
  });
  const emptyState = document.querySelector('#hw-wrap .empty-state');
  if (emptyState) emptyState.style.display = anyVisible ? 'none' : 'block';
  updateTaskCount();
  renderStats();
}
document.querySelectorAll('input[name="hwFilter"], input[name="hwPriorityFilter"]').forEach((el) => {
  el.addEventListener('change', applyFilters);
});

if (taskForm) {
  taskForm.addEventListener('submit', function (e) {
    if (!taskForm.checkValidity()) return;
    e.preventDefault();

    const priInput = taskForm.querySelector('input[name="priority"]:checked');
    const due = document.getElementById('task-due').value;
    const task = {
      id: `hw${state.tasks.nextId}`,
      title: escapeHTML(document.getElementById('task-title').value.trim()),
      course: document.getElementById('task-course').value,
      due,
      priority: priInput ? priInput.value : 'medium',
      weekday: weekdayFromDate(due),
    };
    state.tasks.nextId += 1;

    const li = buildTaskEl(task);
    li.classList.add('is-new');
    hwList.prepend(li);

    state.tasks.added.push(task);
    saveState();

    taskForm.reset();
    const mediumChip = taskForm.querySelector('input[name="priority"][value="medium"]');
    if (mediumChip) mediumChip.checked = true;
    const allTab = document.getElementById('hw-all');
    if (allTab) allTab.checked = true;

    applyFilters();
    renderReminders();
    renderCalendar();
    showToast('Task added');
    li.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  hwList.addEventListener('change', function (e) {
    const item = e.target.closest('.hw-item');
    if (!item) return;
    const id = item.dataset.id;

    if (e.target.classList.contains('hw-done-toggle')) {
      if (!id) return;
      state.tasks.done = state.tasks.done.filter((x) => x !== id);
      if (e.target.checked) state.tasks.done.push(id);
      saveState();
      applyFilters();
      renderReminders();
      return;
    }

    if (e.target.classList.contains('hw-del-toggle')) {
      item.addEventListener('animationend', () => {
        item.remove();
        applyFilters();
        renderReminders();
        renderCalendar();
      }, { once: true });

      if (id) {
        state.tasks.added = state.tasks.added.filter((t) => t.id !== id);
        state.tasks.done = state.tasks.done.filter((x) => x !== id);
        if (!state.tasks.deleted.includes(id)) state.tasks.deleted.push(id);
        saveState();
      }
    }
  });
}

// ---- search bar: live-filter courses (CSS can't read text input) and homework (via applyFilters) ----
if (searchInput) {
  searchInput.addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    let visibleCourses = 0;
    document.querySelectorAll('#course-grid .course-card').forEach((card) => {
      const match = card.textContent.toLowerCase().includes(q);
      card.style.display = match ? '' : 'none';
      if (match) visibleCourses++;
    });
    if (courseEmpty) courseEmpty.style.display = (q && visibleCourses === 0) ? 'block' : 'none';
    applyFilters();
  });
}

// =========================================================
// REMINDERS — due-today / due-tomorrow / overdue, computed
// from each homework item's weekday tag.
// =========================================================
function renderReminders() {
  const today = todayAbbr();
  const tomorrow = DAY_ABBR[(new Date().getDay() + 1) % 7];
  const items = [];
  hwList.querySelectorAll('.hw-item').forEach((item) => {
    const isDone = item.classList.contains('hw-done') || item.querySelector('.hw-done-toggle')?.checked;
    if (isDone) return;
    const isLate = item.classList.contains('hw-late');
    const wd = item.dataset.weekday;
    if (isLate || wd === today || wd === tomorrow) {
      items.push({
        title: item.querySelector('.hw-title').textContent,
        meta: item.querySelector('.hw-meta').textContent,
        late: isLate,
      });
    }
  });
  bellPanel.innerHTML = `<h3>Reminders</h3>` + (items.length
    ? items.map((it) => `<div class="reminder-item"><span class="rdot" style="background:var(${it.late ? '--coral' : '--yellow'})"></span><div><div>${escapeHTML(it.title)}</div><div class="text-[10.5px]" style="color:var(--chalkdim)">${escapeHTML(it.meta)}</div></div></div>`).join('')
    : '<p class="reminder-empty">Nothing due today or tomorrow.</p>');
  if (bellBtn) {
    let dot = bellBtn.querySelector('.icon-btn__dot');
    if (items.length && !dot) {
      dot = document.createElement('span');
      dot.className = 'icon-btn__dot';
      bellBtn.appendChild(dot);
    } else if (!items.length && dot) {
      dot.remove();
    }
  }
}
if (bellBtn) {
  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    bellPanel.hidden = !bellPanel.hidden;
  });
  document.addEventListener('click', (e) => {
    if (!bellPanel.hidden && !bellPanel.contains(e.target) && e.target !== bellBtn) bellPanel.hidden = true;
  });
}

// =========================================================
// CALENDAR — weekly schedule view (recurring classes + homework)
// =========================================================
function renderCalendar() {
  if (!calGrid) return;
  const today = todayAbbr();
  calGrid.innerHTML = WEEK_ORDER.map((day) => {
    const classes = STATIC_CLASSES.filter((c) => c.weekday === day);
    const tasks = [];
    hwList.querySelectorAll('.hw-item').forEach((item) => {
      if (item.dataset.weekday !== day) return;
      const isDone = item.classList.contains('hw-done') || item.querySelector('.hw-done-toggle')?.checked;
      tasks.push({ title: item.querySelector('.hw-title').textContent, done: isDone });
    });
    const events = classes.map((c) => {
      const course = courseById(c.course);
      return `<div class="cal-event" style="--accent:var(--${course ? course.accent : 'blue'})"><span class="cal-event__time">${c.time}</span>${escapeHTML(c.course)} ${escapeHTML(c.title)}</div>`;
    }).join('') + tasks.map((t) => `<div class="cal-event cal-event--task"${t.done ? ' style="opacity:.55;text-decoration:line-through;"' : ''}>${escapeHTML(t.title)}</div>`).join('');
    return `<div class="cal-day${day === today ? ' is-today' : ''}"><span class="cal-day__label">${day}</span>${events || '<span style="color:var(--chalkdim); font-size:11px;">—</span>'}</div>`;
  }).join('');
}

// =========================================================
// THEME TOGGLE
// =========================================================
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    saveState();
  });
}

// =========================================================
// SETTINGS — export / import / reset all saved data
// =========================================================
if (gearBtn) gearBtn.addEventListener('click', () => openModal(settingsModal));

if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studydesk-backup.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Data exported');
  });
}

if (importInput) {
  importInput.addEventListener('change', () => {
    const file = importInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== 'object') throw new Error('bad file');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        showToast('Data imported — reloading…');
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        showToast('That file could not be read as StudyDesk data', true);
      }
    };
    reader.readAsText(file);
    importInput.value = '';
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (!confirm('Reset StudyDesk to its default sample data? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
}

// ---- initial paint ----
renderCourses();
applyFilters();
renderReminders();