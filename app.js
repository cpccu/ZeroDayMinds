// Club name used as the key for the CUCC page
const CUCC_NAME = 'City University Computer Club (CUCC)';

// ---- Settings & helpers ----
const DAY_MS = 24 * 60 * 60 * 1000;
const ID_EMAIL_DOMAIN = '@users.campusos.app';   // a Personal ID becomes a hidden email for Firebase sign-in
const HAS_ACCOUNT_KEY = 'campusos_has_account_v1';
const WELCOME_SEEN_KEY = 'campusos_welcome_seen';

let db = null;                 // Firestore: the shared online database
let auth = null;               // Firebase sign-in
let currentUser = null;        // { uid, id (Personal ID), name, saved } or null for a guest
let authMode = 'login';        // 'login' or 'signup'
let suggestedId = '';          // Personal ID suggested on the Register tab
let editingNoticeId = null;    // id of the notice being edited (null = creating a new one)
let pendingSignupName = '';    // name typed on the Register tab
const profileCache = {};       // uid -> promise, so a profile is loaded only once

function daysFromNow(days) {
    return Date.now() + days * DAY_MS;
}

// State Management. Notices, events, materials, lost items and complaints
// are filled from the shared database (Firebase). Buses and FAQs are fixed.
const State = {
    notices: [],
    events: [],
    resources: [],

    buses: [
        { route: "Dhanmondi Route", shift: "Morning", plate: "Dhaka Metro Cha 11-2233", start: "07:30", end: "08:15", startLabel: "07:30 AM", endLabel: "08:15 AM", stops: ["Dhanmondi 27", "Asad Gate", "College Gate", "Campus"], phone: "+880 1711-000001" },
        { route: "Mirpur Route", shift: "Morning", plate: "Dhaka Metro Cha 11-2244", start: "07:15", end: "08:20", startLabel: "07:15 AM", endLabel: "08:20 AM", stops: ["Mirpur 10", "Mirpur 1", "Gabtoli", "Campus"], phone: "+880 1711-000002" },
        { route: "Uttara Route", shift: "Morning", plate: "Dhaka Metro Cha 11-2255", start: "07:00", end: "08:30", startLabel: "07:00 AM", endLabel: "08:30 AM", stops: ["Uttara House Building", "Airport", "Khilkhet", "Campus"], phone: "+880 1711-000003" },
        { route: "Dhanmondi Route", shift: "Evening", plate: "Dhaka Metro Cha 11-2233", start: "17:30", end: "18:15", startLabel: "05:30 PM", endLabel: "06:15 PM", stops: ["Campus", "College Gate", "Asad Gate", "Dhanmondi 27"], phone: "+880 1711-000001" }
    ],

    faqs: [
        { q: "What are the rules for university bus passes?", a: "Students must carry their official Student ID card at all times when boarding university buses." },
        { q: "How do I apply for midterm exam retakes?", a: "Submit an official application to your Department Head within 3 days of exam schedule announcement." },
        { q: "How do I create an account?", a: "Tap Sign In at the top, choose Register, type your name, keep the suggested Personal ID (or type your own) and choose a password. You do not need a university email. Write your Personal ID down, because you need it to sign in." },
        { q: "How do I save a notice?", a: "Sign in, then tap the Save button on any notice. Your saved notices are kept in the My Saved Notices tab, even after the notice leaves the board." }
    ],

    lostItems: [],
    complaints: []
};

// ==========================================
// START UP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getTheme());
    const connected = initFirebase();
    applyUserToHeader();
    startImageHydration();
    renderNotices();
    renderSavedNotices();
    renderResources();
    renderLostItems();
    renderComplaints();
    renderBuses();
    renderFAQs();
    updateBusReminder();
    setInterval(updateBusReminder, 30000);

    // Every minute: hide (and clean out) notices and events whose time is up
    setInterval(() => {
        purgeExpired('notices');
        purgeExpired('events');
        filterNotices();
        refreshClubView();
    }, 60000);

    if (!connected) {
        showSetupBanner();
        return;
    }
    startListeners();
    auth.onAuthStateChanged(handleAuthChange);
});

function initFirebase() {
    try {
        if (typeof firebase === 'undefined' || typeof firebaseConfig === 'undefined') return false;
        if (!firebaseConfig.apiKey || String(firebaseConfig.apiKey).startsWith('PASTE')) return false;
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        return true;
    } catch (err) {
        console.error('Firebase could not start:', err);
        return false;
    }
}

function showSetupBanner() {
    const bar = document.createElement('div');
    bar.style.cssText = 'background:#fef3c7; color:#92400e; padding:10px 24px; font-size:0.9rem; border-bottom:1px solid #fcd34d;';
    bar.innerHTML = '⚠️ The shared database is not connected yet, so nothing can be posted or shared. Open <strong>firebase-config.js</strong> and paste your Firebase settings.';
    document.body.insertBefore(bar, document.body.firstChild);
}

// Live data: every change anyone makes shows up for everyone straight away
function listen(collection, onData) {
    db.collection(collection).orderBy('createdAt', 'desc').onSnapshot(
        snap => onData(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
        err => {
            console.error('Could not load ' + collection + ':', err);
            showToast('Could not load ' + collection + '. Please check the Firestore rules.');
        }
    );
}

function startListeners() {
    listen('notices', list => { State.notices = list; purgeExpired('notices'); filterNotices(); renderSavedNotices(); });
    listen('events', list => { State.events = list; purgeExpired('events'); refreshClubView(); });
    listen('resources', list => { State.resources = list; refreshResources(); });
    listen('lostItems', list => { State.lostItems = list; renderLostItems(); });
    listen('complaints', list => { State.complaints = list; renderComplaints(); });
}

// Remove expired notices/events from the database (any signed-in or guest browser may do this)
function purgeExpired(collection) {
    if (!db) return;
    State[collection].filter(isExpired).forEach(item => {
        db.collection(collection).doc(item.id).delete().catch(() => { /* not allowed or already gone */ });
        deleteFiles(item.imageIds);
    });
}

function refreshAll() {
    filterNotices();
    renderSavedNotices();
    refreshClubView();
    refreshResources();
    renderLostItems();
    renderComplaints();
}

// ---- Light / dark mode (remembered on this device) ----
const THEME_KEY = 'campusos_theme';

function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
        btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
}

function toggleTheme() {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (err) { /* ignore */ }
}

// Navigation Engine
function switchTab(tabId) {
    if (tabId === 'saved') renderSavedNotices();
    document.querySelectorAll('.app-section, .tab-content').forEach(sec => {
        sec.classList.remove('active');
        sec.style.display = 'none';
    });

    document.querySelectorAll('.nav-link, .nav-tab').forEach(btn => btn.classList.remove('active'));

    const targetSection = document.getElementById(tabId) || document.getElementById('section-' + tabId);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
    }

    const activeBtn = Array.from(document.querySelectorAll('.nav-link, .nav-tab')).find(btn =>
        btn.getAttribute('onclick')?.includes(`'${tabId}'`)
    );
    if (activeBtn) activeBtn.classList.add('active');
}

// Modal Engine
function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

// ==========================================
// ACCOUNTS: Personal ID + password (Firebase, works on every device)
// ==========================================
// Personal IDs are not case-sensitive: "cu-123" and "CU-123" are the same ID
function normalizeId(value) {
    return String(value || '').trim().toUpperCase();
}

function generatePersonalId() {
    return 'CU-' + (10000 + Math.floor(Math.random() * 90000));
}

// Returns an error message, or '' if the ID is fine
function validatePersonalId(id) {
    if (id.length < 4 || id.length > 20) return 'Your Personal ID must be 4 to 20 characters long.';
    if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(id)) return 'Use only letters, numbers, - or _ in your Personal ID (no spaces), and start with a letter or number.';
    return '';
}

function idToEmail(id) { return id.toLowerCase() + ID_EMAIL_DOMAIN; }
function emailToId(email) { return String(email || '').split('@')[0].toUpperCase(); }

function authErrorMessage(err) {
    switch (err && err.code) {
        case 'auth/email-already-in-use': return 'This Personal ID is already taken. Please choose a different one.';
        case 'auth/weak-password': return 'Your password must be at least 6 characters long.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials': return 'Wrong Personal ID or password. Please try again, or tap Register to create an account.';
        case 'auth/too-many-requests': return 'Too many attempts. Please wait a few minutes and try again.';
        case 'auth/network-request-failed': return 'No internet connection. Please try again.';
        case 'auth/operation-not-allowed': return 'Sign-in is not switched on yet. In Firebase, enable Email/Password sign-in.';
        default: return 'Something went wrong. Please try again.';
    }
}

// Loads (or creates) the student's profile and makes them the current user
function loadProfile(fbUser, nameHint) {
    if (!profileCache[fbUser.uid]) {
        profileCache[fbUser.uid] = (async () => {
            const ref = db.collection('users').doc(fbUser.uid);
            const snap = await ref.get();
            let data;
            if (snap.exists) {
                data = snap.data();
            } else {
                data = { personalId: emailToId(fbUser.email), name: nameHint || emailToId(fbUser.email), createdAt: Date.now(), saved: [] };
                await ref.set(data);
            }
            currentUser = { uid: fbUser.uid, id: data.personalId, name: data.name, saved: Array.isArray(data.saved) ? data.saved : [] };
            applyUserToHeader();
            refreshAll();
            return currentUser;
        })();
        profileCache[fbUser.uid].catch(() => { delete profileCache[fbUser.uid]; });
    }
    return profileCache[fbUser.uid];
}

let firstAuthCheck = true;
async function handleAuthChange(fbUser) {
    if (fbUser) {
        try {
            await loadProfile(fbUser, pendingSignupName);
        } catch (err) {
            console.error(err);
            showToast('Could not load your profile. Please check your internet connection.');
        }
    } else {
        currentUser = null;
        applyUserToHeader();
        refreshAll();
    }
    if (firstAuthCheck) {
        firstAuthCheck = false;
        if (!fbUser) showWelcomeOnce();
    }
}

// Show the Sign In / Register window once per visit for guests
function showWelcomeOnce() {
    let seen = false;
    try {
        seen = sessionStorage.getItem(WELCOME_SEEN_KEY) === '1';
        sessionStorage.setItem(WELCOME_SEEN_KEY, '1');
    } catch (err) { /* ignore */ }
    if (seen) return;
    let hasAccount = false;
    try { hasAccount = localStorage.getItem(HAS_ACCOUNT_KEY) === '1'; } catch (err) { /* ignore */ }
    openAuthModal(hasAccount ? 'login' : 'signup');
}

function markHasAccount() {
    try { localStorage.setItem(HAS_ACCOUNT_KEY, '1'); } catch (err) { /* ignore */ }
}

function applyUserToHeader() {
    const label = document.getElementById('user-display-name');
    const button = document.getElementById('auth-header-btn');
    if (label) label.textContent = currentUser ? `${currentUser.name} · ID: ${currentUser.id}` : 'Guest';
    if (button) button.textContent = currentUser ? 'Sign Out' : 'Sign In';
}

function handleHeaderAuthButton() {
    if (currentUser) logout();
    else openAuthModal('login');
}

async function logout() {
    try {
        if (currentUser) delete profileCache[currentUser.uid];
        if (auth) await auth.signOut();
    } catch (err) { console.error(err); }
    currentUser = null;
    applyUserToHeader();
    refreshAll();
    openAuthModal('login');
}

// Checks the database is connected and the student is signed in
function requireReady(action) {
    if (!db) {
        showToast('The shared database is not connected yet. Please tell the website admin.');
        return false;
    }
    if (!currentUser) {
        showToast(`Please sign in (or register) to ${action}.`);
        openAuthModal('login');
        return false;
    }
    return true;
}

// Small message at the bottom of the screen
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function showAuthError(message) {
    const box = document.getElementById('auth-error');
    if (box) box.textContent = message;
}

function clearAuthError() {
    showAuthError('');
}

function togglePasswordVisibility(show) {
    const input = document.getElementById('auth-password');
    if (input) input.type = show ? 'text' : 'password';
}

// Opens the Sign In / Register window on the chosen tab
function openAuthModal(mode = 'login') {
    const form = document.getElementById('auth-form');
    if (form) form.reset();
    clearAuthError();
    document.getElementById('auth-panel').style.display = 'block';
    document.getElementById('auth-success').style.display = 'none';
    togglePasswordVisibility(false);
    suggestedId = '';
    switchAuthTab(mode);
    openModal('auth-modal');
}

function switchAuthTab(type) {
    authMode = type === 'signup' ? 'signup' : 'login';
    const signup = authMode === 'signup';

    const loginBtn = document.getElementById('tab-login-btn');
    const signupBtn = document.getElementById('tab-signup-btn');
    (signup ? loginBtn : signupBtn)?.classList.remove('active');
    (signup ? signupBtn : loginBtn)?.classList.add('active');

    const nameGroup = document.getElementById('name-group');
    if (nameGroup) nameGroup.style.display = signup ? 'block' : 'none';

    const submitBtn = document.getElementById('auth-submit-btn');
    if (submitBtn) submitBtn.textContent = signup ? 'Create My Account' : 'Sign In';

    const help = document.getElementById('auth-id-help');
    if (help) {
        help.textContent = signup
            ? 'Keep the suggested ID or type your own (for example your student ID number). Letters, numbers, - and _ only.'
            : 'The Personal ID you got when you registered. It is not case-sensitive.';
    }

    const idInput = document.getElementById('auth-id');
    if (idInput) {
        if (signup && idInput.value.trim() === '') {
            suggestedId = generatePersonalId();
            idInput.value = suggestedId;
        } else if (!signup && suggestedId && idInput.value === suggestedId) {
            idInput.value = '';
            suggestedId = '';
        }
    }
    clearAuthError();
}

async function handleAuth(e) {
    e.preventDefault();
    clearAuthError();
    if (!auth) return showAuthError('The shared database is not connected yet. Please tell the website admin.');

    const id = normalizeId(document.getElementById('auth-id').value);
    const password = document.getElementById('auth-password').value;
    const button = document.getElementById('auth-submit-btn');
    button.disabled = true;

    try {
        if (authMode === 'signup') {
            const name = document.getElementById('auth-name').value.trim();
            if (name.length < 2) return showAuthError('Please type your name (at least 2 letters).');
            const idError = validatePersonalId(id);
            if (idError) return showAuthError(idError);
            if (password.length < 6) return showAuthError('Your password must be at least 6 characters long.');

            pendingSignupName = name;
            const cred = await auth.createUserWithEmailAndPassword(idToEmail(id), password);
            const user = await loadProfile(cred.user, name);
            pendingSignupName = '';
            markHasAccount();
            showAuthSuccess(user);
            return;
        }

        // Sign in
        const cred = await auth.signInWithEmailAndPassword(idToEmail(id), password);
        const user = await loadProfile(cred.user, '');
        markHasAccount();
        closeModal('auth-modal');
        showToast(`Welcome back, ${user.name}!`);
    } catch (err) {
        pendingSignupName = '';
        console.error(err);
        showAuthError(authErrorMessage(err));
    } finally {
        button.disabled = false;
    }
}

function showAuthSuccess(user) {
    document.getElementById('auth-panel').style.display = 'none';
    document.getElementById('auth-success').style.display = 'block';
    document.getElementById('auth-success-name').textContent = `Welcome, ${user.name}!`;
    document.getElementById('auth-success-id').textContent = user.id;
}

function copyPersonalId() {
    if (!currentUser) return;
    const id = currentUser.id;
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).then(
            () => showToast('Personal ID copied'),
            () => showToast('Please write your ID down: ' + id)
        );
    } else {
        showToast('Please write your ID down: ' + id);
    }
}

// ==========================================
// SHARED HELPERS (posting and deleting)
// ==========================================
function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function isExpired(item) {
    return Boolean(item.expiresAt) && item.expiresAt <= Date.now();
}

// Only the person who posted something owns it
function isOwner(item) {
    return Boolean(currentUser) && Boolean(item.authorId) && item.authorId === currentUser.uid;
}

// Adds one document to the shared database, stamped with the author.
// imageKind ('notice', 'event' or 'resource') = also upload the pictures chosen in that form.
async function postDoc(collection, data, modalId, form, okMessage, imageKind) {
    if (postDoc.busy) return false;
    postDoc.busy = true;
    let fileIds = [];
    try {
        if (imageKind && imagePickers[imageKind].length) showToast('Uploading picture…');
        if (imageKind) fileIds = await uploadPickedImages(imageKind, data.expiresAt || null);
        await db.collection(collection).add({
            ...data,
            ...(imageKind ? { imageIds: fileIds } : {}),
            authorId: currentUser.uid,
            authorName: currentUser.name,
            createdAt: Date.now()
        });
        if (imageKind) clearPicker(imageKind);
        if (modalId) closeModal(modalId);
        if (form) form.reset();
        if (okMessage) showToast(okMessage);
        return true;
    } catch (err) {
        console.error(err);
        await deleteFiles(fileIds);
        showToast('Could not save. Please check your internet connection and try again.');
        return false;
    } finally {
        postDoc.busy = false;
    }
}

// Delete button (only shown on your own posts)
async function deleteOwnItem(collection, id) {
    const item = (State[collection] || []).find(x => x.id === id);
    if (!item || !isOwner(item)) {
        alert('Only the person who posted this can delete it.');
        return;
    }
    if (!confirm('Delete this? This cannot be undone.')) return;
    try {
        await db.collection(collection).doc(id).delete();
        deleteFiles(item.imageIds);
        showToast('Deleted');
    } catch (err) {
        console.error(err);
        showToast('Could not delete. Please try again.');
    }
}

// ==========================================
// NOTICES
// ==========================================
function formatNoticeTime(ms) {
    return new Date(ms).toLocaleString('en-US', {
        timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
}

function formatNoticeDate(ms) {
    return new Date(ms).toLocaleDateString('en-US', {
        timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric', year: 'numeric'
    });
}

// Render Notices Grid
function renderNotices(noticesToRender = State.notices) {
    const container = document.getElementById('notices-grid') || document.getElementById('notice-grid');
    if (!container) return;

    const visible = noticesToRender.filter(n => !isExpired(n));

    if (visible.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; color: #64748b; text-align: center; padding: 40px 0;">No notices found.</p>`;
        return;
    }

    container.innerHTML = visible.map(item => {
        const owner = isOwner(item);
        const saved = isNoticeSaved(item.id);
        const id = escapeHTML(item.id);
        const author = escapeHTML(item.authorName || 'Unknown') + (owner ? ' (you)' : '');
        const until = item.expiresAt ? ` · ⏳ Visible until ${formatNoticeDate(item.expiresAt)}` : '';
        return `
        <div class="card notice-card">
            <div class="card-meta">
                <span class="badge badge-dept" style="background:#e0e7ff; color:#3730a3; padding:4px 8px; border-radius:4px; font-weight:700; font-size:0.8rem;">${escapeHTML(item.dept)}</span>
                <span class="timestamp" style="color:#64748b; font-size:0.85rem;">${escapeHTML(item.time)}</span>
            </div>
            <h3 style="margin: 10px 0 6px 0;">${escapeHTML(item.title)}</h3>
            <p style="color:#475569; font-size:0.95rem;">${escapeHTML(item.content)}</p>
            ${imageBlock(item)}
            <div class="notice-footer">
                <span class="notice-info">👤 ${author}${item.edited ? ' · edited' : ''}${until}</span>
                <div class="notice-actions">
                    <button type="button" class="notice-btn ${saved ? 'saved' : ''}" onclick="toggleSaveNotice('${id}')">${saved ? '★ Saved' : '☆ Save'}</button>
                    ${owner ? `<button type="button" class="notice-btn" onclick="editNotice('${id}')">✏️ Edit</button>
                    <button type="button" class="notice-btn danger" onclick="deleteOwnItem('notices', '${id}')">🗑️ Delete</button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

// Department Filter Logic
function filterNotices() {
    const query = (document.getElementById('notice-search')?.value || '').toLowerCase();
    const deptFilter = document.getElementById('notice-dept-filter')?.value || 'ALL';

    const filtered = State.notices.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query);
        const matchesDept = (deptFilter === 'ALL') || (item.dept === deptFilter);
        return matchesSearch && matchesDept;
    });

    renderNotices(filtered);
}

function setNoticeModalMode(editing) {
    document.getElementById('notice-modal-title').textContent = editing ? 'Edit Notice' : 'Post Department Notice';
    document.getElementById('notice-submit-btn').textContent = editing ? 'Save Changes' : 'Publish Notice';
    const keepOption = document.getElementById('notice-keep-option');
    keepOption.disabled = !editing;
    keepOption.hidden = !editing;
    document.getElementById('new-notice-duration').value = editing ? 'keep' : '7';
}

// "+ Post Notice" button
function openNoticeModal() {
    if (!requireReady('post a notice')) return;
    editingNoticeId = null;
    document.getElementById('notice-form').reset();
    clearPicker('notice');
    setNoticeModalMode(false);
    openModal('notice-modal');
}

// "Edit" button (only shown on your own notices)
function editNotice(id) {
    const notice = State.notices.find(n => n.id === id);
    if (!notice || !isOwner(notice)) {
        alert('Only the person who published this notice can edit it.');
        return;
    }
    editingNoticeId = id;
    setNoticeModalMode(true);
    document.getElementById('new-notice-title').value = notice.title;
    document.getElementById('new-notice-dept').value = notice.dept;
    document.getElementById('new-notice-body').value = notice.content;
    imagePickers.notice = [];
    noticeExistingIds = (notice.imageIds || []).slice();
    renderImagePreview('notice');
    openModal('notice-modal');
}

// Publish / Save Changes
async function handlePostNotice(e) {
    e.preventDefault();
    const form = e.target;
    if (!db || !currentUser) {
        closeModal('notice-modal');
        requireReady('post a notice');
        return;
    }

    const title = document.getElementById('new-notice-title').value.trim();
    const dept = document.getElementById('new-notice-dept').value;
    const content = document.getElementById('new-notice-body').value.trim();
    const duration = document.getElementById('new-notice-duration').value;

    if (editingNoticeId !== null) {
        const notice = State.notices.find(n => n.id === editingNoticeId);
        if (!notice || !isOwner(notice)) {
            alert('Only the person who published this notice can edit it.');
            editingNoticeId = null;
            closeModal('notice-modal');
            return;
        }
        if (postDoc.busy) return;
        postDoc.busy = true;
        const newExpiry = duration !== 'keep' ? daysFromNow(Number(duration)) : (notice.expiresAt || null);
        let newIds = [];
        try {
            newIds = await uploadPickedImages('notice', newExpiry);
            const keptIds = newIds.length ? newIds : noticeExistingIds.slice();
            const changes = { title, dept, content, edited: true, imageIds: keptIds };
            if (duration !== 'keep') changes.expiresAt = newExpiry;
            await db.collection('notices').doc(editingNoticeId).update(changes);

            // remove pictures that were replaced or removed; keep expiry of the rest in step
            deleteFiles((notice.imageIds || []).filter(id => !keptIds.includes(id)));
            if (duration !== 'keep') {
                keptIds.forEach(id => db.collection('files').doc(id).update({ expiresAt: newExpiry }).catch(() => {}));
            }
            editingNoticeId = null;
            clearPicker('notice');
            closeModal('notice-modal');
            form.reset();
            showToast('Notice updated');
        } catch (err) {
            console.error(err);
            await deleteFiles(newIds);
            showToast('Could not save the changes. Please try again.');
        } finally {
            postDoc.busy = false;
        }
        return;
    }

    const ok = await postDoc('notices', {
        title,
        dept,
        content,
        time: formatNoticeTime(Date.now()),
        expiresAt: daysFromNow(Number(duration))
    }, 'notice-modal', form, 'Notice published', 'notice');

    if (ok) {
        // Clear filters so the new notice is visible straight away
        const search = document.getElementById('notice-search');
        const deptFilter = document.getElementById('notice-dept-filter');
        if (search) search.value = '';
        if (deptFilter) deptFilter.value = 'ALL';
        filterNotices();
    }
}

// ---- Saved notices (kept in each student's account, on every device) ----
function isNoticeSaved(id) {
    return Boolean(currentUser) && (currentUser.saved || []).some(s => s.id === id);
}

async function toggleSaveNotice(id) {
    if (!currentUser) {
        showToast('Please sign in or register to save notices.');
        openAuthModal('login');
        return;
    }
    const before = (currentUser.saved || []).slice();
    currentUser.saved = (currentUser.saved || []).slice();
    const index = currentUser.saved.findIndex(s => s.id === id);

    if (index >= 0) {
        currentUser.saved.splice(index, 1);
        showToast('Removed from your saved notices');
    } else {
        const notice = State.notices.find(n => n.id === id);
        if (!notice) return;
        // Keep a copy, so the notice stays in "My Saved Notices" even after it expires
        currentUser.saved.unshift({
            id: notice.id, title: notice.title, dept: notice.dept, content: notice.content,
            time: notice.time, authorName: notice.authorName || '', expiresAt: notice.expiresAt || null, imageIds: notice.imageIds || [], savedAt: Date.now()
        });
        showToast('⭐ Saved! Find it in "My Saved Notices".');
    }
    filterNotices();
    renderSavedNotices();

    try {
        await db.collection('users').doc(currentUser.uid).update({ saved: currentUser.saved });
    } catch (err) {
        console.error(err);
        currentUser.saved = before;
        filterNotices();
        renderSavedNotices();
        showToast('Could not save. Please check your internet connection.');
    }
}

function renderSavedNotices() {
    const container = document.getElementById('saved-grid');
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = `
            <div class="card" style="grid-column: 1/-1; text-align: center; padding: 30px;">
                <h3>Sign in to see your saved notices</h3>
                <p style="color:#64748b; margin: 8px 0 14px;">Create a free account to save the notices that matter to you.</p>
                <button type="button" class="btn btn-primary" onclick="openAuthModal('login')">Sign In / Register</button>
            </div>`;
        return;
    }

    const list = currentUser.saved || [];
    if (list.length === 0) {
        container.innerHTML = `
            <div class="card" style="grid-column: 1/-1; text-align: center; padding: 30px;">
                <h3>No saved notices yet</h3>
                <p style="color:#64748b; margin-top: 8px;">Tap <strong>☆ Save</strong> on any notice to keep it here.</p>
            </div>`;
        return;
    }

    container.innerHTML = list.map(snap => {
        const live = State.notices.find(n => n.id === snap.id && !isExpired(n));
        const item = live || snap;
        const status = live
            ? (item.expiresAt ? `⏳ Visible until ${formatNoticeDate(item.expiresAt)}` : '')
            : '⚠️ No longer on the notice board';
        return `
        <div class="card notice-card">
            <div class="card-meta">
                <span class="badge badge-dept" style="background:#e0e7ff; color:#3730a3; padding:4px 8px; border-radius:4px; font-weight:700; font-size:0.8rem;">${escapeHTML(item.dept)}</span>
                <span class="timestamp" style="color:#64748b; font-size:0.85rem;">${escapeHTML(item.time)}</span>
            </div>
            <h3 style="margin: 10px 0 6px 0;">${escapeHTML(item.title)}</h3>
            <p style="color:#475569; font-size:0.95rem;">${escapeHTML(item.content)}</p>
            ${imageBlock(item)}
            <div class="notice-footer">
                <span class="notice-info">${status}</span>
                <div class="notice-actions">
                    <button type="button" class="notice-btn saved" onclick="toggleSaveNotice('${escapeHTML(snap.id)}')">★ Remove</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// CLUB EVENTS
// ==========================================
// Re-draw whichever club page is currently open
function refreshClubView() {
    if (currentClubViewState === 'standard-detail' || currentClubViewState === 'sub-wing-detail') {
        renderClubNoticeBoard(currentClubName);
    } else if (currentClubViewState === 'cucc-wings') {
        renderWingEvents('CUCC_ALL');
    }
}

// "+ Host Event" button
function openEventModal() {
    if (!requireReady('host an event')) return;
    clearPicker('event');
    const expiry = document.getElementById('new-event-expiry');
    if (expiry) {
        // Earliest choice = today (Dhaka time); default = 7 days from now
        expiry.min = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
        expiry.value = new Date(daysFromNow(7)).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    }
    openModal('event-modal');
}

// --- DEDICATED CLUB PAGE NAVIGATION ENGINE ---

// State tracking variable for nested club navigation
let currentClubViewState = 'all'; // 'all', 'cucc-wings', 'standard-detail', or 'sub-wing-detail'
let currentClubName = '';

// Build event cards for a club / wing
function buildEventCards(list) {
    const visible = list.filter(ev => !isExpired(ev));
    if (visible.length === 0) {
        return `<p style="color:#64748b; padding:20px 0;">No events or announcements posted yet.</p>`;
    }
    return visible.map(ev => {
        const owner = isOwner(ev);
        const by = ev.authorName ? `👤 ${escapeHTML(ev.authorName)}${owner ? ' (you)' : ''}` : '';
        const until = ev.expiresAt ? `⏳ Visible until ${formatNoticeDate(ev.expiresAt)}` : '';
        const info = [by, until].filter(Boolean).join(' · ');
        return `
        <div class="card">
            <div class="card-meta">
                <span class="badge">${escapeHTML(ev.club)}</span>
                <span class="timestamp">${escapeHTML(ev.date)}</span>
            </div>
            <h3 style="margin-bottom:6px;">${escapeHTML(ev.title)}</h3>
            <p style="color:#475569; font-size:0.95rem;">${escapeHTML(ev.desc)}</p>
            ${imageBlock(ev)}
            <p style="color:#64748b; font-size:0.85rem; margin-top:8px;">📍 ${escapeHTML(ev.location)}</p>
            ${info ? `<p class="notice-info" style="margin-top:8px;">${info}</p>` : ''}
            ${owner ? `<div class="notice-actions" style="margin-top:8px;"><button type="button" class="notice-btn danger" onclick="deleteOwnItem('events', '${escapeHTML(ev.id)}')">🗑️ Delete</button></div>` : ''}
        </div>`;
    }).join('');
}

// Full dedicated page for a club or sub-wing
function renderClubNoticeBoard(clubName) {
    const contentArea = document.getElementById('club-page-content');
    if (!contentArea) return;
    const list = State.events.filter(e => e.club.toLowerCase() === clubName.toLowerCase());
    contentArea.innerHTML = `
        <div style="background:#eff6ff; border:2px solid #2563eb; padding:20px; border-radius:12px; margin-bottom:20px;">
            <h2 style="color:#1e3a8a;">${clubName}</h2>
            <p style="color:#475569;">Announcements & upcoming events</p>
        </div>
        <div class="grid-container">${buildEventCards(list)}</div>
    `;
}

// Open Dedicated Page for selected Club
function openClubPage(clubName) {
    const directoryView = document.getElementById('clubs-directory-view');
    const detailView = document.getElementById('club-detail-view');
    const contentArea = document.getElementById('club-page-content');
    const backBtn = document.getElementById('btn-back-clubs');

    if (!directoryView || !detailView || !contentArea) return;

    directoryView.style.display = 'none';
    detailView.style.display = 'block';
    currentClubName = clubName;
    if (backBtn) backBtn.innerText = '← Back to All Clubs';

    // SPECIAL CASE: CUCC Nested Page with 3 Sub-Wings
    if (clubName === CUCC_NAME) {
        currentClubViewState = 'cucc-wings';

        contentArea.innerHTML = `
            <div style="background: #eff6ff; border: 2px solid #2563eb; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <span style="font-size: 2.5rem;">💻</span>
                <h2 style="margin: 8px 0 4px 0; color: #1e3a8a;">City University Computer Club (CUCC)</h2>
                <p style="color: #475569;">Select one of the specialized sub-wings below to enter its event board:</p>
            </div>

            <h3 style="margin-bottom: 12px;">CUCC Sub-Wings & Sections</h3>
            <div class="club-grid" style="margin-bottom: 30px;">
                <div class="club-card" onclick="renderWingEvents('Programming Club')">
                    <span class="club-icon">⚡</span>
                    <h4>Programming Club</h4>
                    <small style="color: #2563eb; font-weight: 600;">View Events →</small>
                </div>
                <div class="club-card" onclick="renderWingEvents('Cyber Security Club')">
                    <span class="club-icon">🛡️</span>
                    <h4>Cyber Security Club</h4>
                    <small style="color: #2563eb; font-weight: 600;">View Events →</small>
                </div>
                <div class="club-card" onclick="renderWingEvents('Research Club')">
                    <span class="club-icon">🔬</span>
                    <h4>Research Club</h4>
                    <small style="color: #2563eb; font-weight: 600;">View Events →</small>
                </div>
            </div>
            <div id="wing-events-container"></div>
        `;
        renderWingEvents('CUCC_ALL');
    } else {
        currentClubViewState = 'standard-detail';
        renderClubNoticeBoard(clubName);
    }
}

// Sub-wing page (or the "all CUCC events" list on the CUCC page)
function renderWingEvents(wingName) {
    if (wingName === 'CUCC_ALL') {
        currentClubViewState = 'cucc-wings';
        const box = document.getElementById('wing-events-container');
        if (box) {
            const list = State.events.filter(e => e.wing === 'CUCC');
            box.innerHTML = `<h3 style="margin-bottom:12px;">All CUCC Events</h3>
                             <div class="grid-container">${buildEventCards(list)}</div>`;
        }
    } else {
        currentClubViewState = 'sub-wing-detail';
        currentClubName = wingName;
        renderClubNoticeBoard(wingName);   // opens as its own page
        const backBtn = document.getElementById('btn-back-clubs');
        if (backBtn) backBtn.innerText = '← Back to CUCC Sub-Wings';
    }
}

// Smart Back Navigation
function backToClubsDirectory() {
    if (currentClubViewState === 'sub-wing-detail') {
        // Step back from Programming/Cyber/Research -> CUCC Sub-Wings View
        openClubPage(CUCC_NAME);
    } else {
        // Step back from CUCC or standard clubs -> All Clubs Directory Grid
        currentClubViewState = 'all';
        document.getElementById('club-detail-view').style.display = 'none';
        document.getElementById('clubs-directory-view').style.display = 'block';
    }
}

// Handle Event Publish Form Submit
async function handleEventSubmit(e) {
    e.preventDefault();
    const form = e.target;
    if (!db || !currentUser) {
        closeModal('event-modal');
        requireReady('host an event');
        return;
    }

    const title = document.getElementById('new-event-title').value.trim();
    const club = document.getElementById('new-event-club').value;
    const date = document.getElementById('new-event-date').value.trim();
    const location = document.getElementById('new-event-location').value.trim();
    const expiryValue = document.getElementById('new-event-expiry').value;   // "YYYY-MM-DD"

    // Expires at the very end of the chosen day, Dhaka time
    const expiresAt = new Date(expiryValue + 'T23:59:59+06:00').getTime();
    if (!expiryValue || isNaN(expiresAt) || expiresAt <= Date.now()) {
        showToast('Please choose an expiry date that is today or later.');
        return;
    }

    const cuccGroup = [CUCC_NAME, 'Programming Club', 'Cyber Security Club', 'Research Club'];
    await postDoc('events', {
        title,
        club,
        wing: cuccGroup.includes(club) ? 'CUCC' : 'OTHER',
        date,
        location,
        desc: 'Newly published club event.',
        expiresAt
    }, 'event-modal', form, 'Event published', 'event');
}

// ==========================================
// RESOURCE HUB
// ==========================================
// "CSE 2101", "cse-2101" and "cse2101" all count as the same course
function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

let lastResourceQuery = null;   // set once the student has searched

// Nothing is listed until the student searches with department + course name + year
function renderResources(list = null) {
    const container = document.getElementById('resources-grid');
    if (!container) return;

    if (list === null) {
        container.innerHTML = `<p style="grid-column: 1/-1; color: #64748b; text-align: center; padding: 40px 0;">🔎 Choose a <strong>department</strong>, type the <strong>course name</strong> and the <strong>year</strong>, then press Search.</p>`;
        return;
    }

    if (list.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; color: #64748b; text-align: center; padding: 40px 0;">No material found for this department, course and year. Check the spelling, or upload it yourself with "+ Upload Material".</p>`;
        return;
    }

    container.innerHTML = list.map(item => `
        <div class="card">
            <div class="card-meta">
                <span class="badge">${escapeHTML(item.dept)}</span>
                <span class="timestamp">${escapeHTML(item.type)}</span>
            </div>
            <h3>📖 ${escapeHTML(item.course)}</h3>
            <p style="color:#64748b; font-size:0.85rem; margin-top:4px;">Year: ${escapeHTML(item.year)}${item.desc ? ' | ' + escapeHTML(item.desc) : ''}</p>
            ${imageBlock(item)}
            <p class="notice-info" style="margin-top:6px;">👤 ${escapeHTML(item.authorName || 'Unknown')}${isOwner(item) ? ' (you)' : ''}</p>
            <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
                <button type="button" class="btn btn-secondary" style="padding:6px 12px; font-size:0.85rem;" onclick="openViewer('${(item.imageIds || []).map(escapeHTML).join(',')}', 0)">📖 View ${(item.imageIds || []).length} page${(item.imageIds || []).length === 1 ? '' : 's'}</button>
                ${isOwner(item) ? `<button type="button" class="notice-btn danger" onclick="deleteOwnItem('resources', '${escapeHTML(item.id)}')">🗑️ Delete</button>` : ''}
            </div>
        </div>
    `).join('');
}

function searchResources(q) {
    const wanted = normalizeText(q.course);
    return State.resources.filter(item =>
        item.dept === q.dept &&
        String(item.year) === String(Number(q.year)) &&
        normalizeText(item.course).includes(wanted) &&
        (q.type === 'All' || item.type === q.type)
    );
}

// Re-draw after the shared data or the signed-in user changes
function refreshResources() {
    renderResources(lastResourceQuery ? searchResources(lastResourceQuery) : null);
}

// Search needs all three: department, course name and year
function filterResources(e) {
    if (e) e.preventDefault();
    const dept = document.getElementById('resource-dept-filter')?.value || '';
    const course = document.getElementById('resource-course-search')?.value.trim() || '';
    const year = document.getElementById('resource-year-search')?.value.trim() || '';
    const type = document.getElementById('resource-type-filter')?.value || 'All';

    if (!dept || !course || !year) {
        lastResourceQuery = null;
        renderResources(null);
        showToast('Please choose a department, type the course name and the year.');
        return;
    }
    lastResourceQuery = { dept, course, year, type };
    refreshResources();
}

// "+ Upload Material" button
function openResourceModal() {
    if (!requireReady('upload material')) return;
    clearPicker('resource');
    openModal('resource-modal');
}

// Upload: department, course name, year and at least one picture are required
async function handleResourceSubmit(e) {
    e.preventDefault();
    const form = e.target;
    if (!db || !currentUser) {
        closeModal('resource-modal');
        requireReady('upload material');
        return;
    }

    const dept = document.getElementById('new-res-dept').value;
    const course = document.getElementById('new-res-course').value.trim();
    const year = Number(document.getElementById('new-res-year').value);
    const type = document.getElementById('new-res-type').value;
    const desc = document.getElementById('new-res-desc').value.trim();

    if (!dept || course.length < 2 || !Number.isInteger(year) || year < 1990 || year > 2100) {
        showToast('Please give the department, course name and a valid year.');
        return;
    }
    if (imagePickers.resource.length === 0) {
        showToast('Please add at least one picture of the paper or notes.');
        return;
    }

    await postDoc('resources', { dept, course, year, type, desc }, 'resource-modal', form,
        'Material uploaded. Students can find it by department, course and year.', 'resource');
}

// ==========================================
// PICTURES (shrunk in the browser, kept in the shared database, loaded only when seen)
// ==========================================
const MAX_IMAGE_CHARS = 380000;                              // size limit of one picture after shrinking
const IMAGE_LIMITS = { notice: 1, event: 1, resource: 4 };  // pictures allowed per post
const imagePickers = { notice: [], event: [], resource: [] };   // pictures chosen in each form (not saved yet)
let noticeExistingIds = [];                                 // pictures already on the notice being edited
const fileCache = {};                                       // picture id -> picture data

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Not a readable picture')); };
        img.src = url;
    });
}

// Shrinks a photo until it is small enough to store (still readable for exam papers)
async function compressImage(file) {
    const img = await loadImageFromFile(file);
    let maxSide = 1400;
    while (maxSide >= 500) {
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.8, 0.7, 0.6, 0.5]) {
            const data = canvas.toDataURL('image/jpeg', quality);
            if (data.length <= MAX_IMAGE_CHARS) return data;
        }
        maxSide = Math.round(maxSide * 0.8);
    }
    throw new Error('Picture is too big');
}

async function handleImagePick(kind, input) {
    const files = Array.from(input.files || []);
    input.value = '';   // lets the same file be chosen again later
    if (files.length === 0) return;
    const limit = IMAGE_LIMITS[kind];
    const list = imagePickers[kind];
    showToast('Preparing picture…');

    for (const file of files) {
        if (!file.type.startsWith('image/')) {
            showToast('Please choose a picture (JPG or PNG). PDF files are not supported.');
            continue;
        }
        if (limit === 1) list.length = 0;   // one picture only: the new one replaces the old one
        else if (list.length >= limit) {
            showToast(`You can add up to ${limit} pictures.`);
            break;
        }
        try {
            list.push(await compressImage(file));
            if (kind === 'notice') noticeExistingIds = [];   // a new picture replaces the one on the notice
        } catch (err) {
            console.error(err);
            showToast('Could not use that picture. Please try a different one.');
        }
    }
    renderImagePreview(kind);
}

function renderImagePreview(kind) {
    const box = document.getElementById(kind + '-image-preview');
    if (!box) return;
    const thumbs = [];
    if (kind === 'notice') {
        noticeExistingIds.forEach(id => thumbs.push(
            `<div class="thumb"><img data-file-id="${escapeHTML(id)}" alt=""><button type="button" title="Remove" onclick="removeExistingNoticeImage()">✕</button></div>`));
    }
    imagePickers[kind].forEach((src, i) => thumbs.push(
        `<div class="thumb"><img src="${src}" alt=""><button type="button" title="Remove" onclick="removePickedImage('${kind}', ${i})">✕</button></div>`));
    box.innerHTML = thumbs.join('');
}

function removePickedImage(kind, index) {
    imagePickers[kind].splice(index, 1);
    renderImagePreview(kind);
}

function removeExistingNoticeImage() {
    noticeExistingIds = [];
    renderImagePreview('notice');
}

function clearPicker(kind) {
    imagePickers[kind] = [];
    if (kind === 'notice') noticeExistingIds = [];
    renderImagePreview(kind);
}

// Saves the chosen pictures; returns their ids
async function uploadPickedImages(kind, expiresAt) {
    const ids = [];
    try {
        for (const data of imagePickers[kind]) {
            const ref = await db.collection('files').add({
                data,
                authorId: currentUser.uid,
                createdAt: Date.now(),
                expiresAt: expiresAt || null
            });
            ids.push(ref.id);
            fileCache[ref.id] = data;
        }
    } catch (err) {
        await deleteFiles(ids);
        throw err;
    }
    return ids;
}

function deleteFiles(ids) {
    if (!db) return Promise.resolve();
    return Promise.all((ids || []).map(id => db.collection('files').doc(id).delete().catch(() => { /* not allowed or already gone */ })));
}

async function getFileData(id) {
    if (fileCache[id]) return fileCache[id];
    const snap = await db.collection('files').doc(id).get();
    if (!snap.exists) return null;
    fileCache[id] = snap.data().data;
    return fileCache[id];
}

// Picture box shown on a notice / event / material card
function imageBlock(item) {
    const ids = item.imageIds || [];
    if (ids.length === 0) return '';
    return `<div class="post-img-wrap" onclick="openViewer('${ids.map(escapeHTML).join(',')}', 0)">
        <img class="post-img" data-file-id="${escapeHTML(ids[0])}" alt="Attached picture">
        ${ids.length > 1 ? `<span class="img-count">📷 ${ids.length}</span>` : ''}
    </div>`;
}

// Pictures are fetched only when a card is on screen, then remembered
function hydrateImages() {
    if (!db) return;
    document.querySelectorAll('img[data-file-id]:not([data-hydrated])').forEach(img => {
        img.dataset.hydrated = '1';
        const id = img.dataset.fileId;
        if (fileCache[id]) { img.src = fileCache[id]; return; }
        getFileData(id).then(data => {
            if (data) img.src = data;
            else (img.closest('.post-img-wrap') || img).style.display = 'none';
        }).catch(() => { /* try again after the next redraw */ });
    });
}

function startImageHydration() {
    hydrateImages();
    if (typeof MutationObserver === 'undefined') return;
    new MutationObserver(() => hydrateImages()).observe(document.body, { childList: true, subtree: true });
}

// Full-size picture viewer (with Previous / Next for multi-page papers)
let viewerIds = [];
let viewerIndex = 0;

function openViewer(idsCsv, index = 0) {
    viewerIds = String(idsCsv || '').split(',').filter(Boolean);
    if (viewerIds.length === 0) return;
    viewerIndex = Math.min(Math.max(index, 0), viewerIds.length - 1);
    openModal('viewer-modal');
    showViewerPage();
}

function viewerStep(delta) {
    const next = viewerIndex + delta;
    if (next < 0 || next >= viewerIds.length) return;
    viewerIndex = next;
    showViewerPage();
}

async function showViewerPage() {
    const id = viewerIds[viewerIndex];
    const img = document.getElementById('viewer-img');
    const link = document.getElementById('viewer-download');
    document.getElementById('viewer-count').textContent = `Picture ${viewerIndex + 1} of ${viewerIds.length}`;
    document.getElementById('viewer-prev').style.visibility = viewerIndex > 0 ? 'visible' : 'hidden';
    document.getElementById('viewer-next').style.visibility = viewerIndex < viewerIds.length - 1 ? 'visible' : 'hidden';
    img.classList.remove('zoomed');
    img.removeAttribute('src');
    try {
        const data = await getFileData(id);
        if (viewerIds[viewerIndex] !== id) return;   // the student already moved on
        if (!data) {
            showToast('This picture is no longer available.');
            closeModal('viewer-modal');
            return;
        }
        img.src = data;
        link.href = data;
        link.download = `campusos-${id}.jpg`;
    } catch (err) {
        console.error(err);
        showToast('Could not load the picture. Please try again.');
    }
}

// Render Bus Schedules
function renderBuses() {
    const container = document.getElementById('bus-routes-list') || document.getElementById('bus-grid');
    if (!container) return;
    container.innerHTML = State.buses.map(bus => `
        <div class="bus-card">
            <div class="bus-card-top">
                <h3>${bus.route} <span class="bus-shift">(${bus.shift})</span></h3>
                <span class="bus-plate">${bus.plate}</span>
            </div>
            <p class="bus-time">🕒 ${bus.startLabel} - ${bus.endLabel}</p>
            <div class="bus-stops-label">Route Stops:</div>
            <div class="bus-stops">${bus.stops.map(stop => `<span class="bus-stop">${stop}</span>`).join('')}</div>
            <a class="bus-call" href="tel:${bus.phone.replace(/[^\d+]/g, '')}">📞 ${bus.phone}</a>
        </div>
    `).join('');
}

// --- NEXT BUS REMINDER ---
// "07:30" -> minutes since midnight
function toMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

// Current time in Dhaka (minutes since midnight), independent of the device's time zone
function getDhakaMinutes() {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const h = Number(parts.find(p => p.type === 'hour').value);
    const m = Number(parts.find(p => p.type === 'minute').value);
    return h * 60 + m;
}

function formatDuration(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

// Find the next bus that starts from now on (wraps to tomorrow's first bus)
function findNextBus() {
    if (State.buses.length === 0) return null;
    const now = getDhakaMinutes();
    const sorted = [...State.buses].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    let bus = sorted.find(b => toMinutes(b.start) >= now);
    let tomorrow = false;
    if (!bus) {
        bus = sorted[0];
        tomorrow = true;
    }
    const diff = toMinutes(bus.start) - now + (tomorrow ? 1440 : 0);
    return { bus, diff, tomorrow };
}

function updateBusReminder() {
    const banner = document.getElementById('bus-reminder');
    const headerTimer = document.getElementById('header-bus-timer');
    const next = findNextBus();

    if (!next) {
        if (banner) banner.innerHTML = '';
        if (headerTimer) headerTimer.textContent = 'No buses';
        return;
    }

    const { bus, diff, tomorrow } = next;
    const countdown = diff <= 0 ? 'starting now' : `in ${formatDuration(diff)}`;
    const soon = !tomorrow && diff <= 15;

    if (headerTimer) {
        headerTimer.textContent = `${bus.route.replace(' Route', '')} (${bus.shift}) · ${countdown}`;
    }

    if (banner) {
        const isUttara = /uttara/i.test(bus.route);   // Uttara Route = blush pink reminder
        banner.className = 'bus-reminder' + (soon ? ' soon' : '') + (isUttara ? ' uttara' : '');
        banner.onclick = () => switchTab('helpdesk');
        banner.innerHTML = `
            <span class="bus-reminder-icon">${soon ? '⏰' : '🚌'}</span>
            <div>
                <div class="bus-reminder-main">Next bus: <strong>${bus.route} (${bus.shift})</strong> starts at <strong>${bus.startLabel}</strong>${tomorrow ? ' tomorrow' : ''} — <strong>${countdown}</strong></div>
                <div class="bus-reminder-sub">${bus.plate} · Starts from ${bus.stops[0]} · Driver: ${bus.phone}</div>
            </div>
        `;
    }
}

// Helpdesk FAQ Engine
function renderFAQs(faqsToRender = State.faqs) {
    const container = document.getElementById('faq-list');
    if (!container) return;

    if (faqsToRender.length === 0) {
        container.innerHTML = `<p style="color: #64748b;">No matching FAQ entries found.</p>`;
        return;
    }

    container.innerHTML = faqsToRender.map(faq => `
        <div class="faq-item" style="border-bottom: 1px solid #e2e8f0; padding: 10px 0;">
            <strong style="color: #1e293b;">Q: ${faq.q}</strong>
            <p style="color: #475569; font-size: 0.9rem; margin-top: 4px;">${faq.a}</p>
        </div>
    `).join('');
}

function filterFAQs() {
    const query = document.getElementById('faq-search')?.value.toLowerCase() || '';
    const filtered = State.faqs.filter(faq =>
        faq.q.toLowerCase().includes(query) || faq.a.toLowerCase().includes(query)
    );
    renderFAQs(filtered);
}

// ==========================================
// LOST & FOUND / COMPLAINTS
// ==========================================
function renderLostItems() {
    const container = document.getElementById('lost-grid');
    if (!container) return;
    if (State.lostItems.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; color: #64748b; padding: 10px 0;">No lost or found items reported yet.</p>`;
        return;
    }
    container.innerHTML = State.lostItems.map(i => `
        <div class="card">
            <span class="badge" style="background:${i.type === 'Lost' ? '#fee2e2' : '#dcfce7'}; color:${i.type === 'Lost' ? '#991b1b' : '#166534'}; padding:2px 6px; border-radius:4px; font-size:0.8rem; font-weight:bold;">${escapeHTML(i.type)}</span>
            <h4 style="margin-top:6px;">${escapeHTML(i.item)}</h4>
            <p style="font-size:0.85rem; color:#64748b;">📍 ${escapeHTML(i.location)}</p>
            <p style="font-size:0.85rem; color:#475569; margin-top:4px;">📞 ${escapeHTML(i.contact)}</p>
            <p class="notice-info" style="margin-top:6px;">👤 ${escapeHTML(i.authorName || 'Unknown')}${isOwner(i) ? ' (you)' : ''}</p>
            ${isOwner(i) ? `<div class="notice-actions" style="margin-top:8px;"><button type="button" class="notice-btn danger" onclick="deleteOwnItem('lostItems', '${escapeHTML(i.id)}')">🗑️ Delete</button></div>` : ''}
        </div>
    `).join('');
}

function renderComplaints() {
    const container = document.getElementById('complaints-grid');
    if (!container) return;
    if (State.complaints.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; color: #64748b; padding: 10px 0;">No complaints submitted yet.</p>`;
        return;
    }
    container.innerHTML = State.complaints.map(c => `
        <div class="card">
            <span class="badge" style="background:#f1f5f9; color:#334155; padding:2px 6px; border-radius:4px; font-size:0.8rem;">${escapeHTML(c.dept)}</span>
            <h4 style="margin-top:6px;">${escapeHTML(c.subject)}</h4>
            <p style="font-size:0.85rem; color:#475569; margin-top:4px;">${escapeHTML(c.desc)}</p>
            <p class="notice-info" style="margin-top:6px;">👤 ${escapeHTML(c.authorName || 'Unknown')}${isOwner(c) ? ' (you)' : ''}</p>
            ${isOwner(c) ? `<div class="notice-actions" style="margin-top:8px;"><button type="button" class="notice-btn danger" onclick="deleteOwnItem('complaints', '${escapeHTML(c.id)}')">🗑️ Delete</button></div>` : ''}
        </div>
    `).join('');
}

async function handleLostSubmit(e) {
    e.preventDefault();
    const form = e.target;
    if (!db || !currentUser) {
        closeModal('lost-modal');
        requireReady('report an item');
        return;
    }
    await postDoc('lostItems', {
        type: document.getElementById('new-lost-type').value,
        item: document.getElementById('new-lost-item').value.trim(),
        location: document.getElementById('new-lost-location').value.trim(),
        contact: document.getElementById('new-lost-contact').value.trim()
    }, 'lost-modal', form, 'Item posted');
}

async function handleComplaintSubmit(e) {
    e.preventDefault();
    const form = e.target;
    if (!db || !currentUser) {
        closeModal('complaint-modal');
        requireReady('file a complaint');
        return;
    }
    await postDoc('complaints', {
        subject: document.getElementById('new-comp-subject').value.trim(),
        dept: document.getElementById('new-comp-dept').value.trim(),
        desc: document.getElementById('new-comp-desc').value.trim()
    }, 'complaint-modal', form, 'Complaint submitted');
}

// ==========================================
// AI SEARCH ASSISTANT (client-side keyword matching)
// ==========================================
const aiKnowledgeBase = [
    // Shuttle / Bus timings
    { keywords: ['shuttle', 'bus', 'dhanmondi', 'morning bus', 'dhanmondi route'],
      answer: '🚌 <strong>Dhanmondi Route (Morning):</strong> Departs 07:30 AM → Arrives Campus 08:15 AM. Stops: Dhanmondi 27 → Asad Gate → College Gate → Campus.' },
    { keywords: ['mirpur', 'mirpur bus', 'mirpur route'],
      answer: '🚌 <strong>Mirpur Route (Morning):</strong> Departs 07:15 AM → Arrives Campus 08:20 AM. Stops: Mirpur 10 → Mirpur 1 → Gabtoli → Campus.' },
    { keywords: ['uttara', 'uttara bus', 'uttara route'],
      answer: '🚌 <strong>Uttara Route (Morning):</strong> Departs 07:00 AM → Arrives Campus 08:30 AM. Stops: Uttara House Building → Airport → Khilkhet → Campus.' },
    { keywords: ['evening bus', 'evening shuttle', 'return bus', 'going home'],
      answer: '🚌 <strong>Evening (Dhanmondi Route):</strong> Departs Campus 05:30 PM → Arrives Dhanmondi 27 at 06:15 PM. Stops: Campus → College Gate → Asad Gate → Dhanmondi 27.' },
    { keywords: ['bus time', 'bus schedule', 'shuttle time', 'all bus', 'bus list'],
      answer: '🚌 <strong>All Bus Schedules:</strong><br>• Dhanmondi Morning: 07:30–08:15 AM<br>• Mirpur Morning: 07:15–08:20 AM<br>• Uttara Morning: 07:00–08:30 AM<br>• Dhanmondi Evening: 05:30–06:15 PM<br>Check the Bus Timetable panel for driver contact numbers.' },
    { keywords: ['bus pass', 'bus rule', 'bus card', 'id card bus'],
      answer: '🪪 Students must carry their official <strong>Student ID card</strong> at all times when boarding university buses. No ID = no ride.' },

    // Office locations
    { keywords: ['registrar', 'registrar office'],
      answer: '🏢 The <strong>Registrar\'s Office</strong> is located on the <strong>2nd Floor, Admin Building</strong>. Office hours: Sun–Thu, 9:00 AM – 4:00 PM.' },
    { keywords: ['admission', 'admission office'],
      answer: '🏢 The <strong>Admission Office</strong> is on the <strong>Ground Floor, Admin Building</strong>. Open Sun–Thu, 9:00 AM – 5:00 PM.' },
    { keywords: ['library', 'library hour', 'library timing'],
      answer: '📚 The <strong>University Library</strong> is on the <strong>3rd Floor, Main Building</strong>. Open Sun–Thu 8:30 AM – 7:00 PM, Fri 10:00 AM – 5:00 PM. Closed on Saturdays.' },
    { keywords: ['account', 'accounts office', 'fee', 'tuition', 'payment'],
      answer: '💰 The <strong>Accounts Office</strong> is on the <strong>1st Floor, Admin Building</strong>. Tuition fees can be paid Sun–Thu, 10:00 AM – 3:00 PM. Online payment is also available through the student portal.' },
    { keywords: ['exam office', 'exam controller', 'controller of examination'],
      answer: '🏢 The <strong>Controller of Examinations</strong> office is on the <strong>2nd Floor, Admin Building</strong>. Open Sun–Thu, 9:00 AM – 4:00 PM.' },

    // Retake / Exams
    { keywords: ['retake', 'retake exam', 'retake apply', 'retake application'],
      answer: '📝 To apply for a <strong>midterm/final retake</strong>: Submit an official application to your <strong>Department Head within 3 working days</strong> of the exam schedule announcement. Attach medical certificates if applicable. Retake fees apply.' },
    { keywords: ['exam schedule', 'midterm', 'final exam'],
      answer: '📅 Exam schedules are posted on the <strong>Notices</strong> section of CampusOS and on the department notice boards. Check with your department for specific dates.' },
    { keywords: ['grade', 'result', 'cgpa', 'gpa'],
      answer: '📊 Semester results are published on the <strong>student portal</strong>. For grade-related queries, contact the <strong>Controller of Examinations</strong> office (2nd Floor, Admin Building).' },

    // Lost & Found
    { keywords: ['lost', 'found', 'lost and found', 'lost item', 'missing'],
      answer: '📦 <strong>Lost & Found Procedure:</strong><br>1. Report your lost item using the <strong>"+ Report Item"</strong> button in the Lost & Found section.<br>2. Include a clear description, last-seen location, and your contact info.<br>3. Found items are also listed there — check regularly.<br>4. Physical lost & found desk: <strong>Ground Floor, Security Office</strong>.' },

    // General campus info
    { keywords: ['wifi', 'internet', 'network'],
      answer: '📶 Connect to <strong>"CityU-WiFi"</strong>. Use your student ID as username and portal password. For issues, contact IT Support on the 1st Floor, Main Building.' },
    { keywords: ['club', 'student club', 'join club'],
      answer: '🎭 Browse all active clubs in the <strong>Club Directory</strong> tab. Each club card shows upcoming events — tap "Get QR Pass" to register for any event.' },
    { keywords: ['notice', 'post notice', 'announcement'],
      answer: '📢 Notices are posted in the <strong>Urgent Notices</strong> tab. Signed-in students can post notices using the "+ Post Notice" button. You can also save important notices for later.' },
    { keywords: ['account', 'sign in', 'register', 'login', 'create account'],
      answer: '🔐 Tap <strong>Sign In</strong> at the top → choose <strong>Register</strong> → enter your name → keep or customize your Personal ID → set a password (min 6 characters). No university email needed!' },
    { keywords: ['contact', 'helpline', 'emergency', 'phone'],
      answer: '📞 <strong>Emergency Contacts:</strong><br>• Campus Security: +880 1711-XXXXXX<br>• Admin Office: +880 2-XXXXXXX<br>• Bus Helpline: +880 1711-000001<br>For non-emergencies, use the Complaint Box in the Lost & Found section.' },
];

function handleAISearch() {
    const input = document.getElementById('ai-query-input');
    const responseBox = document.getElementById('ai-response-box');
    if (!input || !responseBox) return;

    const query = input.value.trim().toLowerCase();
    if (!query) {
        responseBox.style.display = 'block';
        responseBox.innerHTML = '⚠️ Please type a question first.';
        return;
    }

    // Score each knowledge-base entry by how many keywords match the query
    let bestMatch = null;
    let bestScore = 0;

    for (const entry of aiKnowledgeBase) {
        let score = 0;
        for (const kw of entry.keywords) {
            if (query.includes(kw)) {
                score += kw.split(' ').length; // multi-word keywords score higher
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = entry;
        }
    }

    responseBox.style.display = 'block';
    if (bestMatch) {
        responseBox.innerHTML = bestMatch.answer;
    } else {
        responseBox.innerHTML = '🤔 Sorry, I couldn\'t find an answer for "<strong>' + escapeHTML(input.value.trim()) + '</strong>". Try asking about shuttle timings, office locations, retake exams, lost & found, or campus services.';
    }
}
