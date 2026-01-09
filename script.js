// --- Store & Data Management ---
const STORE_KEY = 'dx_backlog_v7';

const initialData = {
    currentUser: { id: 'admin', name: '管理者太郎', role: 'admin' },
    config: {
        statuses: [
            { id: 'todo', label: '未着手', color: '#ffedd5', textColor: '#9a3412' }, /* Pastel Orange */
            { id: 'progress', label: '進行中', color: '#e9d5ff', textColor: '#6b21a8' }, /* Pastel Purple */
            { id: 'done', label: '対応済み', color: '#d1fae5', textColor: '#065f46' } /* Pastel Green */
        ],
        priorities: [
            { id: 'high', label: '高' },
            { id: 'medium', label: '中' },
            { id: 'low', label: '低' }
        ],
        categories: ['design', 'dev', 'mtg'],
        departments: ['管理部', '開発部', '営業部', '情報システム部']
    },
    projects: [
        { id: 'prj-1', name: 'テスト', dept: '管理部' }
    ],
    members: [
        { id: 'admin', name: '管理者太郎', dept: '管理部', role: 'admin', password: 'admin' }
    ],
    issues: [],
    wikis: []
};

class Store {
    constructor() {
        const saved = localStorage.getItem(STORE_KEY);
        this.data = saved ? JSON.parse(saved) : initialData;
        // Ensure config exists if migrating from old version
        if (!this.data.config) this.data.config = initialData.config;
        if (!this.data.config.departments) this.data.config.departments = initialData.config.departments; // Migration for new Departments feature
        // Migration: Ensure projects have members
        this.data.projects.forEach(p => {
            if (!p.members) {
                // Default to all members in that department
                p.members = this.data.members.filter(m => m.dept === p.dept).map(m => m.id);
            }
        });
        // Migration: Ensure wikis have projectId
        if (this.data.wikis.length > 0 && !this.data.wikis[0].projectId) {
            // Assign to first project for basic migration
            const defaultPrj = this.data.projects[0].id;
            this.data.wikis.forEach(w => w.projectId = defaultPrj);
        }
        // Ensure reactions exist
        this.data.issues.forEach(i => { if (!i.reactions) i.reactions = {}; });

        // Migration: Deduplicate Issue IDs to fix navigation issues
        const seenIds = new Set();
        this.data.issues.forEach(i => {
            if (seenIds.has(i.id)) {
                // Duplicate found. Modify ID to be unique.
                const newId = `${i.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                // Optionally verify i.key? 
                // Keep key as is for display reference, but ID must be unique for system.
                // If key is same as ID, update key too? No, Key is user-facing label. ID is system ref.
                // But navigation uses ID. 
                console.warn(`Duplicate Issue ID found: ${i.id}. Renaming to ${newId}`);
                i.id = newId;
            }
            seenIds.add(i.id);
        });
    }

    save() {
        localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
    }

    // Config
    getConfig() { return this.data.config; }
    updateConfig(newConfig) { this.data.config = newConfig; this.save(); }

    // Issues
    getIssues() { return this.data.issues; }
    getIssue(id) { return this.data.issues.find(i => i.id === id); }
    addIssue(issue) {
        if (!issue.reactions) issue.reactions = {};
        this.data.issues.push(issue);
        this.save();
    }
    updateIssue(id, updates, userId = 'system') {
        const idx = this.data.issues.findIndex(i => i.id === id);
        if (idx !== -1) {
            const oldIssue = this.data.issues[idx];
            // Record History
            if (!oldIssue.history) oldIssue.history = [];

            const changes = [];
            Object.keys(updates).forEach(key => {
                if (key === 'history' || key === 'comments' || key === 'reactions') return; // Skip these
                if (JSON.stringify(oldIssue[key]) !== JSON.stringify(updates[key])) {
                    changes.push({ field: key, oldValue: oldIssue[key], newValue: updates[key] });
                }
            });

            if (changes.length > 0) {
                oldIssue.history.push({
                    updatedAt: new Date().toISOString(),
                    updatedBy: userId,
                    changes: changes
                });
            }

            this.data.issues[idx] = { ...this.data.issues[idx], ...updates };
            this.save();
        }
    }

    // Members
    getMembers() { return this.data.members; }
    addMember(member) { this.data.members.push(member); this.save(); }
    updateMember(id, updates) {
        const idx = this.data.members.findIndex(m => m.id === id);
        if (idx !== -1) {
            this.data.members[idx] = { ...this.data.members[idx], ...updates };
            this.save();
        }
    }
    getMemberName(id) {
        const m = this.data.members.find(u => u.id === id);
        return m ? m.name : id;
    }

    // Wikis
    getWikis() { return this.data.wikis; }
    addWiki(wiki) { this.data.wikis.push(wiki); this.save(); }
    updateWiki(id, updates) {
        const idx = this.data.wikis.findIndex(w => w.id === id);
        if (idx !== -1) {
            this.data.wikis[idx] = { ...this.data.wikis[idx], ...updates };
            this.save();
        }
    }
    deleteWiki(id) {
        this.data.wikis = this.data.wikis.filter(w => w.id !== id);
        this.save();
    }

    // Projects
    getProjects() { return this.data.projects || []; }
    addProject(project) {
        if (!this.data.projects) this.data.projects = [];
        this.data.projects.push(project);
        this.save();
    }
    updateProject(id, updates) {
        const idx = this.data.projects.findIndex(p => p.id === id);
        if (idx !== -1) {
            this.data.projects[idx] = { ...this.data.projects[idx], ...updates };
            this.save();
        }
    }

    // Notifications
    getNotifications() { return this.data.notifications || []; }
    addNotification(note) {
        if (!this.data.notifications) this.data.notifications = [];
        this.data.notifications.unshift({ ...note, id: `notif-${Date.now()}`, read: false, date: new Date().toISOString() });
        this.save();
    }
    markNotificationRead(id) {
        if (!this.data.notifications) return;
        const n = this.data.notifications.find(x => x.id === id);
        if (n) {
            n.read = true;
            this.save();
        }
    }
}

const store = new Store();

// --- Utils ---
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    // Include time
    return new Date(dateStr).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const getStatusLabel = (statusId) => {
    // Attempt to get project specific config if app is initialized
    let config = store.getConfig();
    if (window.app && window.app.currentProject) {
        config = window.app.getProjectConfig();
    }
    const s = config.statuses.find(x => x.id === statusId);
    return s ? s.label : statusId;
};
const getPriorityLabel = (pId) => {
    const p = store.getConfig().priorities.find(x => x.id === pId);
    return p ? p.label : pId;
};
const parseDateLocal = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date(dateStr);
};

// --- View Rendering ---

class App {
    constructor() {
        this.ganttFilters = { category: 'all', assignee: 'all', due: 'all', duration: '1' };
        this.currentUser = null;
        this.currentProject = null;
        this.initLogin();
        this.bindNav();
    }

    getProjectConfig() {
        // Returns project specific config or falls back to global
        const globalConfig = store.getConfig();
        if (!this.currentProject) return globalConfig;

        return {
            ...globalConfig,
            categories: this.currentProject.categories || globalConfig.categories,
            statuses: this.currentProject.statuses || globalConfig.statuses
        };
    }

    renderAvatar(memberId, size = 24) {
        const m = store.getMembers().find(x => x.id === memberId);
        if (!m) return `<span style="display:inline-block; width:${size}px; height:${size}px; border-radius:50%; background:#ccc; text-align:center; line-height:${size}px; font-size:${size * 0.6}px; color:#fff;">?</span>`;
        const icon = m.icon || m.name.charAt(0);
        return `<span style="display:inline-block; width:${size}px; height:${size}px; border-radius:50%; background:var(--bg-body); border:1px solid var(--border); text-align:center; line-height:${size}px; font-size:${size * 0.6}px; margin-right:6px; vertical-align:middle;">${icon}</span>`;
    }

    initLogin() {
        // Restore login info if available
        const savedInfo = localStorage.getItem('loginInfo');
        if (savedInfo) {
            try {
                const info = JSON.parse(savedInfo);
                document.getElementById('login-id').value = info.id;
                document.getElementById('login-pass').value = info.pass; // In real app, avoid storing plain pass
                document.getElementById('login-remember').checked = true;
            } catch (e) {
                console.error("Failed to load saved login info", e);
            }
        }

        document.getElementById('btn-login').addEventListener('click', () => {
            const id = document.getElementById('login-id').value;
            const pass = document.getElementById('login-pass').value;
            this.login(id, pass);
        });
        // Support Enter key
        ['login-id', 'login-pass'].forEach(fieldId => {
            document.getElementById(fieldId).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('btn-login').click();
                }
            });
        });
    }

    openProfileModal() {
        if (document.getElementById('profile-modal')) document.getElementById('profile-modal').remove();

        const user = this.currentUser;
        const modalHtml = `
            <div id="profile-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; display:flex; align-items:center; justify-content:center; animation: fadeIn 0.2s;">
                <div class="pop-card" style="box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); background: white; padding: 3rem; border-radius: 24px; border: 1px solid #f1f5f9; width: 450px; max-width: 90%; animation: slideUp 0.2s; position:relative;">
                    
                    <button onclick="document.getElementById('profile-modal').remove()" style="position:absolute; top:1.5rem; right:1.5rem; background:none; border:none; font-size:1.5rem; color:#cbd5e1; cursor:pointer;"><i class="ph ph-x"></i></button>

                    <div style="text-align:center; margin-bottom:2rem;">
                        <div style="font-size:1.5rem; font-weight:700; color:#1e293b;">プロフィール設定</div>
                        <div style="font-size:0.9rem; color:#94a3b8;">アカウント情報を変更します</div>
                    </div>

                    <div style="display:flex; flex-direction:column; align-items:center; gap:2rem;">
                        <!-- Icon Section -->
                        <div style="display:flex; flex-direction:column; align-items:center; gap:1rem;">
                            <div id="profile-icon-preview" style="width:100px; height:100px; border-radius:50%; background:var(--primary); color:white; font-size:40px; display:flex; align-items:center; justify-content:center; font-weight:700; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                                ${user.icon || user.name.charAt(0)}
                            </div>
                            <div style="position:relative;">
                                <button id="btn-change-icon" class="btn btn-secondary" style="border-radius:20px; font-size:0.85rem; padding:0.4rem 1rem;" onclick="const el = document.getElementById('icon-picker-pop'); el.style.display = el.style.display === 'none' ? 'grid' : 'none';">
                                    <i class="ph ph-camera"></i> アイコンを変更
                                </button>
                                <!-- Simple Emoji/Char Picker -->
                                <div id="icon-picker-pop" style="display:none; position:absolute; top:110%; left:50%; transform:translateX(-50%); background:white; border:1px solid #e2e8f0; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); border-radius:12px; padding:0.5rem; grid-template-columns:repeat(4, 1fr); gap:0.5rem; width:180px; z-index:10;">
                                    ${['🐶', '🐱', '🐼', '🦊', '🦁', '🐷', '🐸', '🐵', '⭐', '🌙', '☀️', '☁️', '🌸', '🍀', '🍁', '❄️'].map(c => `
                                        <div onclick="document.getElementById('profile-icon-input').value='${c}'; document.getElementById('profile-icon-preview').innerText='${c}'; document.getElementById('icon-picker-pop').style.display='none';" style="cursor:pointer; font-size:1.5rem; text-align:center; padding:0.25rem; border-radius:4px; hover:bg-slate-100;">${c}</div>
                                    `).join('')}
                                </div>
                                <input type="hidden" id="profile-icon-input" value="${user.icon || user.name.charAt(0)}">
                            </div>
                        </div>

                        <!-- Name Section -->
                        <div style="width:100%;">
                            <label class="form-label" style="font-size:0.9rem; color:#64748b;">表示名</label>
                            <div style="position:relative;">
                                <input id="profile-name-input" class="form-input" value="${user.name}" style="padding-right:2.5rem; font-weight:600; color:#334155;">
                                <i class="ph ph-pencil-simple" style="position:absolute; right:1rem; top:50%; transform:translateY(-50%); color:#94a3b8; cursor:pointer;" onclick="document.getElementById('profile-name-input').focus()"></i>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div style="display:flex; gap:1rem; width:100%; margin-top:1rem;">
                            <button class="btn btn-primary" style="flex:1; border-radius:50px; justify-content:center;" onclick="window.app._saveUserProfile()">変更を保存</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    _saveUserProfile() {
        const name = document.getElementById('profile-name-input').value;
        const icon = document.getElementById('profile-icon-input').value;

        if (!name) return alert('名前を入力してください');

        // Update Store
        store.updateMember(this.currentUser.id, { name, icon });

        // Update Local State
        this.currentUser.name = name;
        this.currentUser.icon = icon;

        // Update Header
        document.getElementById('header-user-name').textContent = name;
        document.getElementById('header-user-avatar').textContent = icon;

        // Close Modal
        document.getElementById('profile-modal').remove();

        this.showToast('プロフィールを更新しました', 'success');
    }

    login(id, pass) {
        const members = store.getMembers();
        const user = members.find(m => m.id === id && m.password === pass);
        if (user) {
            this.currentUser = user;

            // Handle Remember Me
            const remember = document.getElementById('login-remember').checked;
            if (remember) {
                localStorage.setItem('loginInfo', JSON.stringify({ id, pass }));
            } else {
                localStorage.removeItem('loginInfo');
            }

            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';

            // Set App Header User Info (Static parts)
            document.getElementById('header-user-name').textContent = user.name;
            document.getElementById('header-user-name').textContent = user.name;
            document.getElementById('header-user-role').textContent = user.role === 'admin' ? '管理者' : 'ユーザー';
            document.getElementById('header-user-avatar').textContent = user.icon || user.name.charAt(0);

            // Admin: Add Create Project Button to Header
            const existingBtn = document.getElementById('header-create-prj-btn');
            if (existingBtn) existingBtn.remove();

            if (user.role === 'admin') {
                const header = document.querySelector('.header');
                const btn = document.createElement('button');
                btn.id = 'header-create-prj-btn';
                btn.className = 'btn btn-primary';
                btn.innerHTML = '<i class="ph ph-plus"></i> <span style="font-size:0.9rem;">プロジェクト作成</span>';
                btn.style.marginRight = '1rem';
                btn.onclick = () => window.app.navigate('project-settings', { mode: 'create' });

                // Insert before user profile
                const profile = document.querySelector('.user-profile');
                header.insertBefore(btn, profile);
            }

            // Hide/Show Admin Menus
            const membersNav = document.querySelector('.nav-item[data-route="members"]');
            if (membersNav) {
                membersNav.style.display = user.role === 'admin' ? '' : 'none';
            }


            // Auto-redirect or Show Selection
            // Find all projects where user is member
            const myProjects = store.getProjects().filter(p => user.role === 'admin' || (p.members || []).includes(user.id) || p.dept === user.dept);

            if (myProjects.length === 1) {
                this.enterProject(myProjects[0].id);
            } else {
                this.showProjectSelection();
            }
        } else {
            alert('IDまたはパスワードが間違っています');
        }
    }

    logout() {
        this.currentUser = null;
        this.currentProject = null;
        document.getElementById('main-app').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('login-id').value = '';
        document.getElementById('login-pass').value = '';
    }

    showProjectSelection() {
        const container = document.getElementById('view-container');
        document.getElementById('header-dept-name').textContent = 'プロジェクト選択';

        // Hide Sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.display = 'none';

        let projects = store.getProjects();
        // Request: Everyone (including Admin) only sees projects they are part of in Selection Screen
        projects = projects.filter(p => (p.members || []).includes(this.currentUser.id));

        container.innerHTML = `
            <div class="page-header"><h2 class="page-title">プロジェクト選択</h2></div>
            <div class="cool-project-grid">
                ${projects.map(p => `
                    <div class="cool-project-card" onclick="window.app.enterProject('${p.id}')">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div class="cool-icon-box">
                                <i class="ph ${p.icon || 'ph-folder'}"></i>
                            </div>
                            <div style="font-size:1.2rem; color:#cbd5e1; transition:color 0.2s;" class="chevron-icon">
                                <i class="ph ph-sign-in"></i>
                            </div>
                        </div>
                        
                        <div>
                            <div class="cool-project-title">${p.name}</div>
                            <div class="cool-project-meta">
                                <span style="display:flex; align-items:center; gap:0.3rem;"><i class="ph ph-users"></i> ${(p.members || []).length}名</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <style>
                .cool-project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; padding-bottom: 3rem; }
                .cool-project-card { 
                    position: relative; 
                    border-radius: 16px; 
                    padding: 1.5rem; 
                    background: white; 
                    border: 1px solid #eaecf0; 
                    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05); 
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
                    cursor: pointer; 
                    display: flex; 
                    flex-direction: column; 
                    justify-content: space-between; 
                    height: 160px; 
                }
                .cool-project-card:hover { 
                    transform: translateY(-4px); 
                    box-shadow: 0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03); 
                    border-color: #d0d5dd; 
                    z-index: 10;
                }
                .cool-project-card:hover .chevron-icon { color: var(--primary) !important; }
                .cool-project-card:hover .cool-icon-box { background: #eff6ff; color: var(--primary); border-color: #bfdbfe; }
                
                .cool-icon-box { 
                    width: 48px; height: 48px; 
                    background: #f8fafc; 
                    border-radius: 12px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-size: 1.5rem; 
                    color: #64748b; 
                    border: 1px solid #f1f5f9;
                    transition: all 0.2s;
                }
                .cool-project-title { font-weight: 700; font-size: 1.1rem; color: #1e293b; margin-bottom: 0.5rem; line-height: 1.3; }
                .cool-project-meta { font-size: 0.85rem; color: #64748b; display: flex; align-items: center; gap: 0.4rem; }
            </style>
        `;
    }

    renderCreateProject() {
        // Set Header Title Manual Override
        const headerTitleEl = document.getElementById('header-dept-name');
        if (headerTitleEl) {
            headerTitleEl.innerText = '新規プロジェクト作成';
            headerTitleEl.style.display = 'block';
        }

        const container = document.getElementById('view-container');
        const departments = store.getConfig().departments || [];
        const members = store.getMembers();

        container.innerHTML = `
            <!-- Page Title moved to Header -->
            <div class="form-container">
                <div class="form-group"><label class="form-label">プロジェクト名</label><input id="prj-name" class="form-input"></div>
                <!-- Dept selection removed -->
                
                <div class="form-group">
                    <label class="form-label">参加メンバー</label>
                    <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; padding: 0.5rem;">
                        ${members.map(m => `
                            <label style="display:flex; align-items:center; gap:0.5rem; padding:0.25rem 0; cursor:pointer;">
                                <input type="checkbox" class="prj-member-cb" value="${m.id}" checked>
                                ${this.renderAvatar(m.id, 20)}
                                <span>${m.name}</span>
                                <span style="font-size:0.8rem; color:var(--text-muted);">(${m.dept})</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:1rem;">
                    <button class="btn btn-secondary" onclick="window.app.showProjectSelection()">キャンセル</button>
                    <button class="btn btn-primary" id="btn-create-prj">作成</button>
                </div>
            </div>
        `;
        document.getElementById('btn-create-prj').addEventListener('click', () => {
            const name = document.getElementById('prj-name').value;
            // const dept = document.getElementById('prj-dept').value;
            const memberCbs = document.querySelectorAll('.prj-member-cb:checked');
            const members = Array.from(memberCbs).map(cb => cb.value);

            if (!name) return alert('必須項目です');
            if (members.length === 0) return alert('メンバーを選択してください');

            const newPrj = { id: `prj-${Date.now()}`, name, dept: '', members, icon: 'ph-folder' };
            store.addProject(newPrj);
            this.enterProject(newPrj.id);
        });
    }

    enterProject(projectId) {
        this.currentProject = store.getProjects().find(p => p.id === projectId);
        if (this.currentProject) {
            // Update Header to show Project Name with Switcher
            // Update Header with Dropdown
            let projects = store.getProjects();
            // Request: Always filter by membership for switcher
            projects = projects.filter(p => (p.members || []).includes(this.currentUser.id));

            const switcherHtml = `
                <div style="position:relative; width:100%;">
                    <div onclick="document.getElementById('prj-dropdown-side').style.display = document.getElementById('prj-dropdown-side').style.display === 'block' ? 'none' : 'block'" style="cursor:pointer; display:flex; align-items:center; gap:0.75rem; color:#64748b; padding:0.5rem; border-radius:8px; transition:background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                        <i class="ph ${this.currentProject.icon || 'ph-folder'}" style="font-size:1.3rem; color:#64748b;"></i>
                        <span style="font-size:0.95rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.currentProject.name}</span>
                        <i class="ph ph-caret-down" style="font-size:0.8rem; margin-left:auto; color:#64748b;"></i>
                    </div>
                    <div id="prj-dropdown-side" style="display:none; position:absolute; top:100%; left:0; width:100%; background:white; border:1px solid #e2e8f0; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); border-radius:8px; z-index:100; max-height: 300px; overflow-y: auto; margin-top:0.5rem;">
                        ${projects.map(p => `
                            <div style="padding:0.6rem 1rem; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; gap:0.5rem; color:${p.id === this.currentProject.id ? '#0284c7' : '#64748b'};" onclick="window.app.enterProject('${p.id}')" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                                <i class="ph ${p.icon || 'ph-folder'}" style="color:${p.id === this.currentProject.id ? '#0284c7' : '#64748b'};"></i>
                                <div style="font-weight:${p.id === this.currentProject.id ? '700' : '400'}; font-size:0.9rem;">${p.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Inject into Sidebar Brand area
            const brandEl = document.querySelector('.sidebar .brand');
            if (brandEl) {
                brandEl.innerHTML = switcherHtml;
                brandEl.style.overflow = 'visible';
                brandEl.style.marginBottom = '1rem';
            }
            document.getElementById('header-dept-name').innerHTML = ''; // Keep header clean

            // Inject Members into Header (Left of Create Project Button)
            const header = document.querySelector('.header');
            const existingMem = document.getElementById('header-project-members');
            if (existingMem) existingMem.remove();
            const projectMembers = store.getMembers().filter(m => (this.currentProject.members || []).includes(m.id));
            const displayMembers = projectMembers.slice(0, 5);
            const remainingCount = projectMembers.length - 5;

            // Render Member Popover to Body (Portal Pattern)
            const popId = 'header-mem-popover';
            let pop = document.getElementById(popId);
            if (!pop) {
                pop = document.createElement('div');
                pop.id = popId;
                pop.style.cssText = `
                    display:none; position:absolute; width:220px; 
                    background:white; border:1px solid #e2e8f0; 
                    box-shadow:0 10px 25px -5px rgba(0,0,0,0.15); 
                    border-radius:12px; z-index:9999; padding:1rem;
                `;
                document.body.appendChild(pop);
            }

            // Update Popup Content
            pop.innerHTML = `
                <div style="font-weight:700; color:#334155; margin-bottom:0.8rem; font-size:0.9rem;">プロジェクトメンバー (${projectMembers.length})</div>
                <div style="max-height:200px; overflow-y:auto; display:flex; flex-direction:column; gap:0.5rem;">
                    ${projectMembers.map(m => `
                        <div style="display:flex; align-items:center; gap:0.8rem;">
                            ${this.renderAvatar(m.id, 28)}
                            <div>
                                <div style="font-size:0.85rem; font-weight:600; color:#334155;">${m.name}</div>
                                <div style="font-size:0.75rem; color:#94a3b8;">${m.role === 'admin' ? '管理者' : 'ユーザー'}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            // Setup Trigger
            const memContainer = document.createElement('div');
            memContainer.id = 'header-project-members'; // Restore ID for cleanup
            memContainer.style.display = 'flex';
            memContainer.style.alignItems = 'center';
            memContainer.innerHTML = `
                <div id="header-mem-trigger" style="display:flex; align-items:center; margin-right:1rem; cursor:pointer;">
                    <div class="avatar-ring" style="display:flex;">
                        ${projectMembers.slice(0, 3).map((m, i) => `
                            <div style="width:32px; height:32px; margin-left:${i === 0 ? 0 : -10}px; border:2px solid rgba(255,255,255,0.3); border-radius:50%; position:relative; z-index:${3 - i}; overflow:hidden; background:white;">
                                <div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;">
                                     ${this.renderAvatar(m.id, 32)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.2); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; color:white; font-size:0.8rem; margin-left:-10px; position:relative; z-index:0; font-weight:600; border:1px solid rgba(255,255,255,0.3);">
                        +${Math.max(0, projectMembers.length - 3)}
                    </div>
                </div>
            `;


            // Insert location: Before 'user-profile'
            const userProfile = document.querySelector('.user-profile');
            if (userProfile) {
                header.insertBefore(memContainer, userProfile);
            }

            // Click Handler for Trigger
            const trigger = memContainer.querySelector('#header-mem-trigger');
            trigger.onclick = (e) => {
                e.stopPropagation();
                const rect = trigger.getBoundingClientRect();
                pop.style.top = (rect.bottom + 10) + 'px'; // 10px spacing
                pop.style.left = (rect.left + rect.width / 2 - 110) + 'px'; // Center horizontally (220/2 = 110)
                pop.style.display = pop.style.display === 'block' ? 'none' : 'block';
            };

            // Close mem popover when clicking outside
            if (!window.memPopoverListener) {
                window.addEventListener('click', (e) => {
                    if (pop && pop.style.display === 'block' && !pop.contains(e.target) && !trigger.contains(e.target)) {
                        pop.style.display = 'none';
                    }
                });
                window.memPopoverListener = true;
            }

            // Close dropdown when clicking outside
            if (!window.prjDropdownListener) {
                window.addEventListener('click', (e) => {
                    const dd = document.getElementById('prj-dropdown-side');
                    const sidebarBrand = document.querySelector('.sidebar .brand');
                    if (dd && dd.style.display === 'block' && sidebarBrand && !sidebarBrand.contains(e.target)) {
                        dd.style.display = 'none';
                    }
                });
                window.prjDropdownListener = true;
            }

            // Show Sidebar
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.style.display = '';
                this.updateSidebar();
            }

            // Apply Global Sidebar & Header Styles
            const styleId = 'global-theme-styles';
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.innerHTML = `
                    /* Global Compact Typography */
                    html { font-size: 13.5px; } /* Slightly smaller global scale */
                    body { font-weight: 400; color: #474a4d; font-size: 0.95rem; } 
                `;
                document.head.appendChild(style);
            }

            this.router();
        }
    }

    updateSidebar() {
        // Ensure "Project Management" is present for admins/managers
        const isAdminOrManager = this.currentUser.role === 'admin' || store.getProjects().some(p => p.managerId === this.currentUser.id);
        const navList = document.querySelector('.sidebar ul');

        let existing = document.querySelector('.nav-item[data-route="project-settings"]');

        if (isAdminOrManager) {
            if (!existing && navList) {
                const li = document.createElement('li');
                li.innerHTML = `
                    <a href="#" class="nav-item" data-route="project-settings">
                        <div style="line-height:1.2; width:100%; font-weight:700;">プロジェクト管理</div>
                    </a>
                `;
                li.querySelector('a').addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigate('project-settings');
                });
                navList.appendChild(li);
            } else if (existing && existing.parentElement.style.display == 'none') {
                existing.parentElement.style.display = '';
            }
        } else {
            if (existing) existing.parentElement.style.display = 'none';
        }
    }

    bindNav() {
        document.querySelectorAll('.nav-item').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.currentUser || !this.currentProject) return; // Block nav if not in project
                const route = el.dataset.route;
                if (route) this.navigate(route);
            });
        });
    }

    navigate(route, params = {}) {
        if (!this.currentUser) return; // Guard

        // Check for unsaved changes (Wiki only for now as requested)
        if (this.unsavedChanges) {
            // Custom Modal for Unsaved Changes
            const modalId = 'unsaved-changes-modal';
            const existing = document.getElementById(modalId);
            if (existing) return; // Already showing?

            const modalHtml = `
                <div id="${modalId}" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center; animation: fadeIn 0.2s;">
                    <div style="background:white; border-radius:16px; padding:2rem; width:450px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); animation: slideUp 0.2s;">
                        <div style="font-weight:700; font-size:1.1rem; color:#1e293b; margin-bottom:1rem;">編集内容を破棄しますか？</div>
                        <div style="color:#64748b; font-size:0.95rem; line-height:1.5; margin-bottom:2rem;">
                            変更が保存されていません。<br>このまま移動すると編集した内容は失われます。
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
                             <button id="modal-discard-btn" class="btn" style="border:1px solid #cbd5e1; color:#64748b; background:white; font-weight:600;">移動する</button>
                             <button id="modal-continue-btn" class="btn btn-primary" style="font-weight:600;">編集を続ける</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Handlers
            document.getElementById('modal-continue-btn').onclick = () => {
                document.getElementById(modalId).remove();
            };
            document.getElementById('modal-discard-btn').onclick = () => {
                this.unsavedChanges = false; // Reset flag
                document.getElementById(modalId).remove();
                this.navigate(route, params); // Retry navigation
            };

            return; // Stop current navigation
        }

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

        // Determine active sidebar item
        let activeRoute = route;
        if (route.startsWith('issue-')) activeRoute = 'issues';
        else if (route.startsWith('member-')) activeRoute = 'members';
        else if (route === 'wiki-edit') activeRoute = 'knowledge'; // Assuming similar pattern for wiki

        const activeNav = document.querySelector(`.nav-item[data-route="${activeRoute}"]`) ||
            document.querySelector(`.nav-item[data-route="issues"]`);
        if (activeNav) activeNav.classList.add('active');

        // Update Header Title based on Route
        // Update Header Title based on Route and Params
        const titleMap = {
            'dashboard': 'ダッシュボード',
            'issues': '課題一覧',
            'board': 'ボード',
            'gantt': 'ガントチャート',
            'knowledge': 'ナレッジ共有',
            'members': 'メンバー管理',
            'project-settings': 'プロジェクト管理設定',
            'settings': 'システム設定',
            'issue-detail': '課題詳細',
        };
        let pageTitle = titleMap[route] || 'DX Project Hub';

        // Dynamic Title Logic
        if (route === 'issue-edit') pageTitle = params.id ? '課題の編集' : '親課題の新規作成';
        if (route === 'wiki-edit') pageTitle = params.id ? 'ナレッジ編集' : 'ナレッジ作成';
        if (route === 'member-edit') pageTitle = params.id ? 'メンバー編集' : 'メンバー新規登録';

        const headerTitleEl = document.getElementById('header-dept-name');
        if (headerTitleEl) {
            headerTitleEl.innerText = pageTitle;
            headerTitleEl.style.display = 'block';
        }

        this.currentRoute = route;
        this.renderView(route, params);
    }

    router() { this.navigate('dashboard'); }

    renderView(route, params) {
        const container = document.getElementById('view-container');
        container.innerHTML = '';

        // Filter issues by Project
        const projectIssues = store.getIssues().filter(i => i.projectId === this.currentProject.id || (!i.projectId && this.currentProject.id === 'prj-1')); // Fallback for migration

        switch (route) {
            case 'dashboard': this.renderDashboard(container, projectIssues); break;
            case 'issues':
                if (params && params.assignee) this.issueListAssigneeFilter = params.assignee;
                this.renderIssueList(container, projectIssues);
                break;
            case 'issue-detail': this.renderIssueDetail(container, params.id); break;
            case 'issue-create': this.renderIssueForm(container); break;
            case 'issue-edit': this.renderIssueForm(container, params.id); break;
            case 'board': this.renderBoard(container, projectIssues); break;
            case 'gantt': this.renderGantt(container, projectIssues); break;
            case 'knowledge': if (params && params.id) this.selectedWikiId = params.id; this.renderWiki(container); break;
            case 'members': this.renderMembers(container); break;
            case 'member-edit': this.renderMemberForm(container, params.id); break;
            case 'project-settings': this.renderProjectSettings(container, params); break;
            case 'settings': this.renderDashboard(container, projectIssues); break; // Deprecated, redirect to dashboard or handle via modal
            default: this.renderDashboard(container, projectIssues);
        }
    }

    // --- Dashboard ---
    renderDashboard(container, issues) {
        // Data Preparation
        const myProjects = store.getProjects().filter(p => (p.members || []).includes(this.currentUser.id));
        const yourTasks = issues.filter(i => i.assignee === this.currentUser.id && i.status !== 'done');
        // Sort tasks by due date
        yourTasks.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

        // Filter Notifications: Current User + Unread + Current Project Context
        const notifications = store.getNotifications().filter(n => {
            if (n.userId !== this.currentUser.id || n.read) return false;

            // Context Check
            if (n.link && n.link.id) {
                const issue = store.getIssue(n.link.id);
                if (issue) return issue.projectId === this.currentProject.id || (!issue.projectId && this.currentProject.id === 'prj-1'); // Match issue project

                const wiki = store.getWikis().find(w => w.id === n.link.id);
                if (wiki) return wiki.projectId === this.currentProject.id || (!wiki.projectId && this.currentProject.id === 'prj-1'); // Match wiki project
            }
            return false;
        }).sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));


        container.innerHTML = `
            <style>
                .pop-dashboard-grid {
                    display: grid;
                    grid-template-columns: 2.5fr 1fr; /* Left side wider */
                    grid-template-rows: auto 1fr;
                    gap: 1.5rem;
                    height: calc(100vh - 140px); /* Fit screen minus header */
                    min-height: 600px;
                }
                
                /* Responsive: Stack on mobile */
                @media (max-width: 900px) {
                    .pop-dashboard-grid {
                        grid-template-columns: 1fr;
                        grid-template-rows: auto;
                        height: auto;
                    }
                }

                .dash-card {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #eaecf0;
                    box-shadow: 0 1px 3px rgba(16,24,40,0.05);
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .dash-card-header {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    min-height: 32px;
                }

                /* Project List Styles */
                .proj-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 1rem;
                }
                .proj-card {
                    padding: 1rem;
                    border: 1px solid #f1f5f9;
                    border-radius: 12px;
                    background: #f8fafc;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                }
                .proj-card:hover {
                    background: white;
                    border-color: var(--primary);
                    box-shadow: 0 4px 6px -2px rgba(0,0,0,0.05);
                    transform: translateY(-2px);
                }
                .proj-icon {
                    width: 40px; height: 40px;
                    background: white;
                    border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.4rem;
                    color: var(--primary);
                    border: 1px solid #e2e8f0;
                }

                /* Issue Table Styles */
                .dash-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.9rem;
                }
                .dash-table th {
                    text-align: left;
                    color: #64748b;
                    font-weight: 600;
                    padding: 0.75rem;
                    border-bottom: 2px solid #f1f5f9;
                    font-size: 0.8rem;
                }
                .dash-table td {
                    padding: 0.75rem;
                    border-bottom: 1px solid #f1f5f9;
                    color: #334155;
                }
                .dash-table tr:hover td {
                    background: #f8fafc;
                    cursor: pointer;
                }
                .status-badge-sm {
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                /* Notification Timeline */
                .notif-feed {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    overflow-y: auto;
                    padding-right: 0.5rem;
                    height: 100%;
                }
                .notif-item {
                    display: flex;
                    gap: 0.8rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #f1f5f9;
                }
                .notif-item:last-child { border-bottom: none; }
                .notif-time {
                    font-size: 0.75rem;
                    color: #94a3b8;
                    white-space: nowrap;
                    margin-top: 0.2rem;
                }
                .notif-content {
                    font-size: 0.9rem;
                    color: #0f172a; /* Darker text */
                    line-height: 1.5;
                }
            </style>

            <div class="pop-dashboard-grid">
                
                <!-- 1. LEFT TOP: Project List -->
                <div class="dash-card" style="grid-column: 1; grid-row: 1;">
                    <div class="dash-card-header">
                        <span>参加プロジェクト</span>
                    </div>
                    <div class="proj-grid">
                        ${myProjects.map(p => `
                            <div class="proj-card" onclick="window.app.enterProject('${p.id}')">
                                <div class="proj-icon"><i class="ph ${p.icon || 'ph-folder'}"></i></div>
                                <div>
                                    <div style="font-weight:600; color:#1e293b; font-size:0.95rem;">${p.name}</div>
                                    <div style="font-size:0.8rem; color:#64748b;">${p.members ? p.members.length : 0} メンバー</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- 2. LEFT BOTTOM: My Issues -->
                <div class="dash-card" style="grid-column: 1; grid-row: 2; overflow: hidden;">
                    <div class="dash-card-header">
                        <span>自分の課題</span>
                        <span style="font-size:0.85rem; color:#64748b; font-weight:400;">未完了: ${yourTasks.length}件</span>
                    </div>
                    <div style="overflow-y: auto; flex:1;">
                        <table class="dash-table">
                            <thead>
                                <tr>
                                    <th>状態</th>
                                    <th>優先度</th>
                                    <th>タイトル</th>
                                    <th>期限日</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${yourTasks.length > 0 ? yourTasks.map(i => `
                                    <tr onclick="window.app.navigate('issue-detail', {id:'${i.id}'})">
                                        <td><span class="status-badge-sm" style="background:#f1f5f9; color:#475569;">${getStatusLabel(i.status)}</span></td>
                                        <td>${getPriorityLabel(i.priority)}</td>
                                        <td style="font-weight:600;">${i.title}</td>
                                        <td style="color:${i.dueDate && new Date(i.dueDate) < new Date() ? '#ef4444' : '#64748b'}; font-weight:${i.dueDate && new Date(i.dueDate) < new Date() ? '700' : '400'};">
                                            ${i.dueDate ? formatDate(i.dueDate) : '-'}
                                        </td>
                                    </tr>
                                `).join('') : '<tr><td colspan="4" style="text-align:center; padding:2rem; color:#94a3b8;">割り当てられた課題はありません</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 3. RIGHT: Notifications & Updates -->
                <div class="dash-card" style="grid-column: 2; grid-row: 1 / span 2; height: 100%;">
                    <div class="dash-card-header">
                        <span>お知らせ・更新</span>
                        <button id="mark-read-btn" class="btn btn-sm btn-primary" style="display:none; font-size:0.8rem;" onclick="window.app.markSelectedNotificationsRead()">既読にする</button>
                    </div>
                    <div class="notif-feed">
                         ${notifications.length > 0 ? notifications.map(n => `
                            <div class="notif-item" style="cursor:pointer;" onclick="store.markNotificationRead('${n.id}'); window.app.renderView('dashboard'); window.app.navigate('${n.link.page}', {id:'${n.link.id}'})">
                                <div style="display:flex; align-items:center; padding:0 0.5rem 0 0.2rem;" onclick="event.stopPropagation();">
                                    <input type="checkbox" class="notif-cb" value="${n.id}" onchange="window.app.toggleNotifCheck()" style="cursor:pointer; transform:scale(1.2);">
                                </div>
                                <div style="flex:1;">
                                    <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.1rem; color:#1e293b;">${n.title}</div>
                                    <div class="notif-content">${n.message}</div>
                                    <div class="notif-time">${n.createdAt ? new Date(n.createdAt).toLocaleString() : '最近'}</div>
                                </div>
                            </div>
                         `).join('') : '<div style="text-align:center; color:#94a3b8; padding-top:2rem;">新しいお知らせはありません</div>'}
                    </div>
                </div>

            </div>
        `;
    }

    toggleNotifCheck() {
        const count = document.querySelectorAll('.notif-cb:checked').length;
        const btn = document.getElementById('mark-read-btn');
        if (btn) btn.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    markSelectedNotificationsRead() {
        const cbs = document.querySelectorAll('.notif-cb:checked');
        if (cbs.length === 0) return;

        cbs.forEach(cb => {
            store.markNotificationRead(cb.value);
        });

        // Refresh Dashboard
        this.renderView('dashboard');
    }

    // --- Issues ---
    renderIssueList(container, issues) {
        // Default Filters state
        const config = this.getProjectConfig();
        const categories = config.categories;
        const members = store.getMembers().filter(m => (this.currentProject.members || []).includes(m.id));

        // Initialize filter state if not present
        if (!this.issueListFilter) this.issueListFilter = 'all';

        // Filter logic
        let displayIssues = issues; // `issues` already contains project-filtered issues.

        if (this.issueListFilter === 'not_done') {
            displayIssues = displayIssues.filter(i => i.status !== 'done');
        } else if (this.issueListFilter !== 'all') {
            displayIssues = displayIssues.filter(i => i.status === this.issueListFilter);
        }

        // Filter by Assignee
        if (this.issueListAssigneeFilter && this.issueListAssigneeFilter !== 'all') {
            displayIssues = displayIssues.filter(i => i.assignee === this.issueListAssigneeFilter);
        }

        // Filter by Category
        if (this.issueListCategoryFilter && this.issueListCategoryFilter !== 'all') {
            displayIssues = displayIssues.filter(i => i.category === this.issueListCategoryFilter);
        }

        const renderStatusFilter = (label, filterKey) => {
            const isActive = this.issueListFilter === filterKey;
            const activeClass = isActive ? 'active' : '';
            return `<span class="pop-filter-pill ${activeClass}" onclick="window.app.setIssueFilter('${filterKey}')">${label}</span>`;
        };

        container.innerHTML = `
            <style>
                .pop-filter-card {
                    background: white; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); padding: 1.5rem 2rem; margin-bottom: 2rem; border: 1px solid #f8fafc;
                }
                .pop-filter-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-weight: 700; color: #334155; }
                .pop-filter-pill {
                    cursor: pointer; padding: 0.4rem 1rem; border-radius: 50px; font-size: 0.85rem; transition: all 0.2s; border: 1px solid transparent;
                }
                .pop-filter-pill:hover { background: #f1f5f9; }
                .pop-filter-pill.active { background: #0284c7; color: white; font-weight: 600; box-shadow: 0 4px 6px -2px rgba(2, 132, 199, 0.4); }
                
                .pop-list-wrapper {
                    background: white;
                    border-radius: 24px;
                    box-shadow: 0 4px 20px -5px rgba(0,0,0,0.05);
                    overflow: hidden; /* Clips the table corners */
                    border: 1px solid #f1f5f9;
                }
                .pop-issue-table { width: 100%; border-collapse: collapse; }
                .pop-issue-row td {
                    padding: 1.2rem 1.2rem; 
                    background: white; 
                    border-bottom: 1px solid #f1f5f9; 
                    vertical-align: middle;
                    transition: background 0.1s;
                }
                
                /* Button-like active feel on hover */
                .pop-issue-row { cursor: pointer; transition: all 0.1s; }
                .pop-issue-row:hover td { 
                    background: #f0f9ff; /* Active blue tint */
                }
                .pop-issue-row:active td {
                    background: #e0f2fe;    
                }
                .pop-issue-row:last-child td { border-bottom: none; }
                
                .pop-status-badge { padding: 4px 12px; border-radius: 50px; font-size: 0.75rem; font-weight: 700; display: inline-block; }
                .pop-add-btn {
                    background: var(--primary); color: white; border-radius: 50px; padding: 0.8rem 1.5rem; font-weight: bold; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3); transition: transform 0.2s; display: flex; align-items: center; gap: 0.5rem; border: none; cursor: pointer;
                }
                .pop-add-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 15px rgba(37, 99, 235, 0.4); }
                
                .filter-select { padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 12px; background: #f8fafc; font-size: 0.9rem; outline: none; }
                .filter-select:focus { border-color: var(--primary); background: white; }
            </style>


            <div class="pop-filter-card">
                <div class="pop-filter-header" style="justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:0.5rem;"> 検索条件</div>
                    <button class="pop-add-btn" style="padding: 0.6rem 1.2rem; font-size: 0.9rem;" onclick="window.app.navigate('issue-create')"><i class="ph ph-plus"></i> 課題の追加</button>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:1.5rem;">
                    <!-- Status Filter -->
                    <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
                        <span style="font-size:0.9rem; font-weight:600; color:#64748b;">状態:</span>
                        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; background:#f8fafc; padding:0.3rem; border-radius:30px; border:1px solid #f1f5f9;">
                            ${renderStatusFilter('すべて', 'all')}
                            ${config.statuses.map(s => renderStatusFilter(s.label, s.id)).join('')}
                            ${renderStatusFilter('未完了のみ', 'not_done')}
                        </div>
                    </div>
                    
                    <!-- Filters Grid -->
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                        <div style="display:flex; flex-direction:column; gap:0.5rem;">
                            <span style="font-size:0.85rem; font-weight:600; color:#64748b;">カテゴリー</span>
                             <select class="filter-select" onchange="window.app.setIssueCategoryFilter(this.value)">
                                <option value="all">すべて</option>
                                ${categories.map(c => `<option value="${c}" ${this.issueListCategoryFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                         <div style="display:flex; flex-direction:column; gap:0.5rem;">
                            <span style="font-size:0.85rem; font-weight:600; color:#64748b;">担当者</span>
                            <select class="filter-select" onchange="window.app.setIssueAssigneeFilter(this.value)">
                                 <option value="all">すべて</option>
                                 ${members.map(m => `<option value="${m.id}" ${this.issueListAssigneeFilter === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; padding:0 1rem;">
                <div style="color:#64748b; font-size:0.9rem; font-weight:600;">
                    全 ${displayIssues.length} 件
                </div>
                <div id="bulk-actions" style="display:none;">
                     <button class="btn btn-danger btn-sm" style="border-radius:20px;" onclick="window.app.deleteSelectedIssues()"><i class="ph ph-trash"></i> 選択削除</button>
                </div>
            </div>

            <div class="pop-list-wrapper"> <!-- Wrapped for rounded corners -->
                <div style="overflow-x: auto;">
                    <table class="pop-issue-table">
                        <thead>
                            <tr style="background:#eff6ff;">
                                <th style="width:40px; padding:0.5rem 0 0.5rem 1rem; text-align:left; border-bottom:2px solid #bfdbfe;"><input type="checkbox" onchange="window.app.toggleSelectAll(this.checked)" style="transform:scale(1.0); cursor:pointer;"></th>
                                <th style="text-align:left; color:#1e3a8a; font-size:0.75rem; padding:0.5rem 0.5rem; font-weight:700; border-bottom:2px solid #bfdbfe;">キー/タイトル</th>
                                <th style="text-align:left; color:#1e3a8a; font-size:0.75rem; padding:0.5rem 0.5rem; font-weight:700; border-bottom:2px solid #bfdbfe;">カテゴリ</th>
                                <th style="text-align:left; color:#1e3a8a; font-size:0.75rem; padding:0.5rem 0.5rem; font-weight:700; border-bottom:2px solid #bfdbfe;">ステータス</th>
                                <th style="text-align:left; color:#1e3a8a; font-size:0.75rem; padding:0.5rem 0.5rem; font-weight:700; border-bottom:2px solid #bfdbfe;">優先度</th>
                                <th style="text-align:left; color:#1e3a8a; font-size:0.75rem; padding:0.5rem 0.5rem; font-weight:700; border-bottom:2px solid #bfdbfe;">期限日</th>
                                <th style="text-align:left; color:#1e3a8a; font-size:0.75rem; padding:0.5rem 0.5rem; font-weight:700; border-bottom:2px solid #bfdbfe;">担当者</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${displayIssues.length > 0 ? displayIssues.map(i => {
            const statusLabel = getStatusLabel(i.status);
            const statusConfig = config.statuses.find(s => s.id === i.status);
            const statusColor = statusConfig?.color || '#e2e8f0';
            const statusText = statusConfig?.textColor || '#475569';
            // Simple date format (YYYY/MM/DD)
            const dueDateStr = i.dueDate ? new Date(i.dueDate).toLocaleDateString('ja-JP') : '-';

            return `
                                <tr class="pop-issue-row" onclick="window.app.navigate('issue-detail', {id:'${i.id}'})">
                                    <td onclick="event.stopPropagation()" style="padding-left:1rem;">
                                        <input type="checkbox" class="issue-select-cb" value="${i.id}" onchange="window.app.toggleIssueSelection()" style="transform:scale(1.0); cursor:pointer;">
                                    </td>
                                    
                                    <td>
                                        <div style="display:flex; flex-direction:column;">
                                            <span style="font-family:monospace; color:#94a3b8; font-size:0.7rem;">${i.key || i.id}</span>
                                            <span style="font-weight:700; color:#1e293b; font-size:0.85rem;">${i.title}</span>
                                        </div>
                                    </td>
                                    
                                    <td><span style="font-size:0.8rem; background:#f1f5f9; padding:2px 8px; border-radius:12px; color:#475569;">${i.category || '-'}</span></td>
                                    
                                    <td><span class="pop-status-badge" style="background:${statusColor}; color:${statusText}; padding:2px 8px; font-size:0.7rem;">${statusLabel}</span></td>
                                    
                                    <td>
                                        <div style="display:flex; align-items:center; gap:0.3rem;">
                                            ${i.priority === 'high' ? '<i class="ph ph-arrow-up" style="color:#ef4444; font-size:0.8rem;"></i>' : (i.priority === 'medium' ? '<i class="ph ph-arrow-right" style="color:#eab308; font-size:0.8rem;"></i>' : '<i class="ph ph-arrow-down" style="color:#3b82f6; font-size:0.8rem;"></i>')}
                                            <span style="font-size:0.8rem;">${getPriorityLabel(i.priority)}</span>
                                        </div>
                                    </td>
                                    
                                    <td>
                                        <div style="display:flex; align-items:center; gap:0.5rem; color:${i.dueDate ? '#475569' : '#cbd5e1'}; font-size:0.8rem;">
                                            <i class="ph ph-calendar-blank"></i>
                                            <span>${dueDateStr}</span>
                                        </div>
                                    </td>
                                    
                                    <td>
                                        <div style="display:flex; align-items:center; gap:0.5rem;">
                                            ${this.renderAvatar(i.assignee, 24)}
                                            <span style="font-weight:600; font-size:0.8rem; color:#334155;">${store.getMemberName(i.assignee)}</span>
                                        </div>
                                    </td>
                                </tr>
                            `}).join('') : '<tr><td colspan="7" style="text-align:center; padding:3rem; color:#94a3b8;">表示する課題がありません</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    setIssueFilter(filter) {
        this.issueListFilter = filter;
        // Re-render with current project issues
        const projectIssues = store.getIssues().filter(i => i.projectId === this.currentProject.id || (!i.projectId && this.currentProject.id === 'prj-1'));
        this.renderIssueList(document.getElementById('view-container'), projectIssues);
    }

    setIssueAssigneeFilter(assigneeId) {
        this.issueListAssigneeFilter = assigneeId;
        const projectIssues = store.getIssues().filter(i => i.projectId === this.currentProject.id || (!i.projectId && this.currentProject.id === 'prj-1'));
        this.renderIssueList(document.getElementById('view-container'), projectIssues);
    }

    setIssueCategoryFilter(cat) {
        this.issueListCategoryFilter = cat;
        const projectIssues = store.getIssues().filter(i => i.projectId === this.currentProject.id || (!i.projectId && this.currentProject.id === 'prj-1'));
        this.renderIssueList(document.getElementById('view-container'), projectIssues);
    }

    filterMyTasks() {
        // Reset status filter to 'not_done' usually implies active tasks, but user said "assigned to me".
        // Let's keep status filter as is or reset? Usually "My Tasks" implies checking what I have to do.
        // Let's set status to 'not_done' (implied active) and assignee to me.
        this.issueListFilter = 'not_done';
        this.issueListAssigneeFilter = this.currentUser.id;
        this.navigate('issues');
    }

    renderIssueDetail(container, id) {
        const issue = store.getIssue(id);
        const config = this.getProjectConfig();
        if (!issue) return this.navigate('issues');

        // Markdown Parser for Description and Comments
        const renderDesc = (text) => {
            if (!text) return '';

            // 1. Tables (Pre-process)
            const lines = text.split('\n');
            let inTable = false;
            let finalHtml = '';

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];

                if (line.trim().startsWith('|')) {
                    if (!inTable) { finalHtml += '<table class="wiki-table"><tbody>'; inTable = true; }
                    const cells = line.split('|').filter((c, idx, arr) => idx !== 0 && idx !== arr.length - 1);
                    if (cells.some(c => c.trim().match(/^-+$/))) continue; // Skip separator line
                    finalHtml += `<tr>${cells.map(c => `<td>${c.trim()}</td>`).join('')}</tr>`;
                    continue;
                } else if (inTable) {
                    finalHtml += '</tbody></table>';
                    inTable = false;
                }

                // Blockquote
                if (line.trim().startsWith('>')) {
                    const content = line.trim().substring(1).trim();
                    finalHtml += `<div style="border-left: 4px solid #cbd5e1; padding-left: 1rem; color: #64748b; font-style: italic; margin: 0.5rem 0;">${content}</div>`;
                    continue;
                }

                // Checkbox pattern: "- [ ] " or "- [x] "
                const match = line.match(/^-\s\[([ x])\]\s(.*)/);
                if (match) {
                    const checked = match[1] === 'x';
                    const content = match[2];
                    finalHtml += `
                        <div class="checklist-item ${checked ? 'checked' : ''}" onclick="window.app.toggleChecklist('${id}', ${i})">
                            <div class="checklist-box"><i class="ph ph-check" style="display:${checked ? 'block' : 'none'}"></i></div>
                            <span>${content}</span>
                        </div>`;
                    continue;
                }

                // Inline formatting
                let processedLine = line
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/!!(.*?)!!/g, '<span style="color:var(--danger); font-weight:bold;">!!$1!!</span>')
                    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%; border-radius:8px; margin:0.5rem 0;">')
                    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color:var(--primary); text-decoration:underline;">$1</a>');

                // Mention Highlighting
                store.getMembers().forEach(m => {
                    const regex = new RegExp(`@${m.name}`, 'g');
                    processedLine = processedLine.replace(regex, `<span style="color:var(--primary); font-weight:600;">@${m.name}</span>`);
                });

                finalHtml += `<div>${processedLine}</div>`;
            }
            if (inTable) finalHtml += '</tbody></table>';
            return finalHtml;
        };

        container.innerHTML = `
            <!-- Navigation & Actions Action Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <button class="btn btn-secondary btn-sm" onclick="window.app.navigate('issues')"><i class="ph ph-arrow-left"></i> 一覧へ戻る</button>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-secondary" onclick="window.app.navigate('issue-edit', {id:'${issue.id}'})"><i class="ph ph-pencil"></i> 編集</button>
                    <button class="btn btn-danger" onclick="window.app.deleteIssue('${issue.id}')"><i class="ph ph-trash"></i> 削除</button>
                </div>
            </div>

            <div class="detail-container" style="padding:0; background:transparent; border:none; box-shadow:none;">
                <!-- Issue Summary Card (Compact Frame) -->
                <div class="issue-summary-card">
                    <div class="issue-summary-header">
                        <span class="issue-key-badge" style="font-size:0.75rem;">${issue.key || issue.id}</span>
                        <span class="issue-title-text" style="font-size:1.1rem;">${issue.title}</span>
                    </div>
                    <div class="issue-summary-meta-row">
                         <!-- 2. Created At (Moved to 2nd position) -->
                         <div class="compact-meta-item">
                            <div class="compact-label">登録日</div>
                            <div class="compact-value">${formatDate(issue.createdAt)}</div>
                         </div>

                         <!-- 3. Status -->
                         <div class="compact-meta-item">
                            <div class="compact-label">ステータス</div>
                            <div class="compact-value">
                                 <span class="status-badge" style="background:${config.statuses.find(s => s.id === issue.status)?.color}; color:${config.statuses.find(s => s.id === issue.status)?.textColor}">${getStatusLabel(issue.status)}</span>
                            </div>
                         </div>

                         <!-- 4. Assignee -->
                         <div class="compact-meta-item">
                            <div class="compact-label">担当者</div>
                            <div class="compact-value" style="display:flex; align-items:center; gap:0.5rem;">
                                ${this.renderAvatar(issue.assignee, 24)}
                                <span>${store.getMemberName(issue.assignee)}</span>
                            </div>
                         </div>

                         <!-- 5. Category (New Position) -->
                         <div class="compact-meta-item">
                            <div class="compact-label">カテゴリ</div>
                            <div class="compact-value">${issue.category || '-'}</div>
                         </div>

                         <!-- 5. Priority -->
                         <div class="compact-meta-item">
                            <div class="compact-label">優先度</div>
                            <div class="compact-value">${getPriorityLabel(issue.priority)}</div>
                         </div>

                         <!-- 6. Start Date -->
                         <div class="compact-meta-item">
                            <div class="compact-label">開始日</div>
                            <div class="compact-value">${formatDate(issue.startDate)}</div>
                         </div>

                         <!-- 7. Due Date -->
                         <div class="compact-meta-item">
                            <div class="compact-label">期限日</div>
                            <div class="compact-value">${formatDate(issue.dueDate)}</div>
                         </div>
                    </div>
                    
                    <!-- Description INSIDE the same card -->
                    <div style="margin-top:1.5rem; padding-top:1.5rem; border-top:1px solid #f1f5f9; display: block;">
                         <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem; font-weight:600;">詳細</div>
                         <div class="description-body" style="font-size:0.9rem; line-height:1.6; color:#474a4d; display:flex !important; flex-direction:column !important; align-items:flex-start !important; text-align:left !important; margin:0 !important; padding:0 !important; width:100%;">
                             <style>
                                .compact-label { font-size: 0.8rem; color: #64748b; font-weight: 500; margin-bottom: 0.2rem; }
                                .compact-value { font-size: 0.9rem; color: #474a4d; font-weight: 400; }
                                .description-body div, .description-body p, .description-body span { margin-left: 0 !important; margin-right: auto !important; }
                                .description-body ul, .description-body ol { padding-left: 1.5rem; margin: 0.5rem 0; font-size: 0.9rem; }
                            </style>
                             ${issue.desc ? (issue.desc.includes('<') ? issue.desc.trim() : renderDesc(issue.desc.trim())) : '<span style="color:var(--text-muted)">詳細なし</span>'}
                        </div>
                    </div>
                </div>



                <!-- Reactions -->
                <div style="margin-top:2rem; border-top:1px solid #eee; padding-top:1rem;">
                    <div style="font-size:0.9rem; margin-bottom:0.5rem; color:var(--text-muted);">リアクション</div>
                    <div style="display:flex; gap:0.5rem;">
                        ${['👍', '❤️', '😄', '🎉', '👀'].map(emoji => {
            const users = issue.reactions[emoji] || [];
            const count = users.length;
            const isReacted = users.includes(this.currentUser.id);
            return `
                                <button class="reaction-btn ${isReacted ? 'active' : ''}" 
                                    onclick="window.app.handleIssueReactionClick(event, '${issue.id}', '${emoji}')">
                                    <span style="font-size:1.2rem;">${emoji}</span>
                                    <span class="count">${count > 0 ? count : ''}</span>
                                </button>
                            `;
        }).join('')}
                    </div>
                </div>
            </div>

                <!-- Comments -->
                <div style="margin-top:2rem; border-top:1px solid #eee; padding-top:1rem;">
                    <div style="font-size:1.1rem; font-weight:600; margin-bottom:1rem;">コメント</div>
                    
                    <div class="comment-list" style="margin-bottom:2rem;">
                        ${(issue.comments || []).map(c => {
            const isOwner = c.author === this.currentUser.id || this.currentUser.role === 'admin';

            return `
                            <div style="display:flex; gap:1rem; margin-bottom:1.5rem; padding-bottom:1.5rem; border-bottom:1px solid #f1f5f9;">
                                <div style="flex-shrink:0;">
                                    ${this.renderAvatar(c.author, 48)}
                                </div>
                                <div style="flex:1;">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                                        <div>
                                            <div style="font-weight:700; font-size:1rem; color:#1e293b;">${store.getMemberName(c.author)}</div>
                                            <div style="font-size:0.85rem; color:#94a3b8;">${formatDate(c.date)}</div>
                                        </div>
                                        <div style="display:flex; gap:0.5rem; align-items:center;">
                                            <!-- Reactions -->
                                            ${['⭐'].map(emoji => {
                const users = c.reactions ? (c.reactions[emoji] || []) : [];
                const count = users.length;
                const isReacted = users.includes(this.currentUser.id);
                return `
                                                    <button onclick="window.app.toggleCommentReaction('${issue.id}', '${c.id}', '${emoji}')" 
                                                        style="border:1px solid #cbd5e1; background:${isReacted ? '#fffbeb' : '#f1f5f9'}; border-radius:20px; padding:0.25rem 0.75rem; cursor:pointer; display:flex; gap:0.4rem; align-items:center; transition: all 0.2s; height:32px;">
                                                        <span style="font-size:0.9rem; color:${isReacted ? '#fbbf24' : '#64748b'};">★</span>
                                                        <span style="font-size:0.9rem; font-weight:600; color:${isReacted ? '#fbbf24' : '#64748b'};">${count}</span>
                                                    </button>
                                                `;
            }).join('')}

                                            <!-- Menu -->
                                             ${isOwner ? `
                                                <div style="position:relative; display:inline-block;">
                                                    <button onclick="const el = this.nextElementSibling; el.style.display = el.style.display==='block'?'none':'block'" style="width:32px; height:32px; border-radius:50%; background:var(--primary); border:none; color:white; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="メニュー">
                                                        <i class="ph ph-dots-three" style="font-size:1.2rem;"></i>
                                                    </button>
                                                    <div style="display:none; position:absolute; right:0; top:100%; background:white; border:1px solid #e2e8f0; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); border-radius:4px; min-width:120px; z-index:10; overflow:hidden;">
                                                        <div onclick="window.app.enableEditComment('${issue.id}', '${c.id}')" style="padding:0.5rem 1rem; cursor:pointer; font-size:0.9rem; color:#475569;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">編集</div>
                                                        <div onclick="window.app.deleteComment('${issue.id}', '${c.id}')" style="padding:0.5rem 1rem; cursor:pointer; font-size:0.9rem; color:#ef4444;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='white'">削除</div>
                                                    </div>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                    
                                    <div id="comment-content-${c.id}">
                                        ${c.content && c.content.includes('<') ?
                    `<div style="font-size:1rem; line-height:1.7; color:#334155;">${c.content}</div>` :
                    `<div style="font-size:1rem; line-height:1.7; color:#334155; white-space: pre-wrap;">${renderDesc(c.content)}</div>`
                }
                                        ${c.changes && c.changes.length > 0 ? `
                                            <div style="margin-top:1rem; padding:0.75rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; font-size:0.85rem; color:#64748b;">
                                                <div style="font-weight:600; margin-bottom:0.25rem;">変更履歴:</div>
                                                ${c.changes.map(ch => `<div>${ch}</div>`).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        `}).join('')}
                    </div>


                </div>

                    <div style="margin-top:2rem; border-top:1px solid #eee; padding-top:1rem;">
                        ${this._generateCommentFormHtml(
                    'comment-',
                    '',
                    issue,
                    store.getConfig(),
                    `<button class="btn btn-primary" style="width:100%; justify-content:center;" onclick="window.app.addIssueComment('${issue.id}')">登録</button>`
                )}
                    </div>

                <!-- History -->

                <!-- History -->

            </div>
        `;
        // Setup Table Interactions for New Comment Form
        this.setupWikiTableInteractions('comment-input');
    }



    /* Shared Comment Form Generator (New/Edit) - WYSIWYG Version */
    _generateCommentFormHtml(prefix, content, issue, config, buttonsHtml) {
        const inputId = `${prefix}input`;
        return `
            <div style="display:flex; gap:1.5rem; width:100%;">
                <div style="flex:1; display:flex; flex-direction:column;">
                    <div style="border:1px solid #cbd5e1; border-radius:4px; overflow:hidden; display:flex; flex-direction:column; flex:1;">
                         <div id="${inputId}" class="form-textarea" contenteditable="true" placeholder="コメント (@を入力してメンバーに通知)..." style="width:100%; border:none; border-bottom:1px solid #e2e8f0; resize:none; padding:0.75rem; outline:none; flex:1; min-height:150px; overflow-y:auto; background:white;">${content || ''}</div>
                         <div style="background:#f8fafc; padding:0.5rem; display:flex; align-items:center; gap:0.5rem;">
                            <button class="filter-toggle-btn rounded-pop-btn" title="太字" onmousedown="event.preventDefault(); window.app.insertFormat('bold', '${inputId}')"><i class="ph ph-text-b"></i></button>
                            <button class="filter-toggle-btn rounded-pop-btn" title="斜体" onmousedown="event.preventDefault(); window.app.insertFormat('italic', '${inputId}')"><i class="ph ph-text-italic"></i></button>
                            <button class="filter-toggle-btn rounded-pop-btn" title="取り消し線" onmousedown="event.preventDefault(); window.app.insertFormat('strike', '${inputId}')"><i class="ph ph-text-strikethrough"></i></button>
                            <div style="width:1px; height:20px; background:#e2e8f0; margin:0 0.25rem;"></div>
                            <button class="filter-toggle-btn rounded-pop-btn" title="リスト" onmousedown="event.preventDefault(); window.app.insertFormat('list', '${inputId}')"><i class="ph ph-list-bullets"></i></button>
                            <button class="filter-toggle-btn rounded-pop-btn" title="テーブル" onmousedown="event.preventDefault(); window.app.insertWikiFormatTable('${inputId}')"><i class="ph ph-table"></i></button>
                            <div style="width:1px; height:20px; background:#e2e8f0; margin:0 0.25rem;"></div>
                            <div style="font-size:0.8rem; color:var(--text-muted); display:flex; gap:0.25rem; flex-wrap:wrap; align-items:center;">
                                    ${store.getMembers().filter(m => (this.currentProject.members || []).includes(m.id)).map(m => `
                                    <span style="cursor:pointer; color:var(--primary); background:#eff6ff; padding:2px 8px; border-radius:12px; font-size:0.8rem;" onmousedown="event.preventDefault(); window.app.insertMention('${m.name}', '${inputId}')">@${m.name}</span>
                                    `).join('')}
                            </div>
                         </div>
                    </div>
                </div>
                <!-- Right: Issue Properties Update -->
                <div style="width:300px; display:flex; flex-direction:column; gap:1rem;">
                    <div>
                        <label class="form-label" style="font-size:0.85rem; margin-bottom:0.25rem;">状態</label>
                        <select id="${prefix}status" class="form-select" style="background:#f8fafc;">
                            ${config.statuses.map(s => `<option value="${s.id}" ${issue.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="form-label" style="font-size:0.85rem; margin-bottom:0.25rem;">担当者 <span style="font-size:0.75rem; color:var(--primary); cursor:pointer; float:right;" onclick="document.getElementById('${prefix}assignee').value = '${this.currentUser.id}'">私が担当</span></label>
                        <select id="${prefix}assignee" class="form-select" style="background:#f8fafc;">
                            <option value="">未定</option>
                            ${store.getMembers().filter(m => (this.currentProject.members || []).includes(m.id)).map(m => `<option value="${m.id}" ${issue.assignee === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                        </select>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <div style="flex:1;">
                            <label class="form-label" style="font-size:0.85rem; margin-bottom:0.25rem;">開始日</label>
                            <input type="date" id="${prefix}startDate" class="form-input" value="${issue.startDate || ''}" style="background:#f8fafc; font-size:0.85rem;">
                        </div>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                         <div style="flex:1;">
                            <label class="form-label" style="font-size:0.85rem; margin-bottom:0.25rem;">期限日</label>
                            <input type="date" id="${prefix}dueDate" class="form-input" value="${issue.dueDate || ''}" style="background:#f8fafc; font-size:0.85rem;">
                        </div>
                    </div>
                    <!-- Buttons -->
                    <div style="margin-top:auto; display:flex; justify-content:flex-end; gap:0.5rem;">
                        ${buttonsHtml}
                    </div>
                </div>
            </div>
        `;
    }

    insertMention(name, targetId) {
        const input = document.getElementById(targetId || 'comment-input');
        if (!input) return;
        input.focus();

        const span = document.createElement('span');
        span.style.color = 'var(--primary)';
        span.style.fontWeight = '600';
        span.contentEditable = 'false'; // Prevent editing inside the mention itself
        span.textContent = `@${name} `;

        // Insert HTML/Node at cursor
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(span);
            // Move cursor after
            range.setStartAfter(span);
            range.setEndAfter(span);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            input.appendChild(span);
        }
    }

    insertFormat(fmt, targetId) {
        const input = document.getElementById(targetId || 'comment-input');
        if (!input) return;
        input.focus(); // Ensure focus

        switch (fmt) {
            case 'bold': document.execCommand('bold', false, null); break;
            case 'italic': document.execCommand('italic', false, null); break;
            case 'strike': document.execCommand('strikeThrough', false, null); break;
            case 'list': document.execCommand('insertUnorderedList', false, null); break;
            case 'quote': document.execCommand('formatBlock', false, '<blockquote>'); break;
            case 'code':
                // Simple code block simulation
                const codeHtml = `<pre style="background:#f1f5f9; padding:0.5rem; border-radius:4px; font-family:monospace;"><code>Code...</code></pre><p><br></p>`;
                document.execCommand('insertHTML', false, codeHtml);
                break;
            // Table is handled by insertWikiFormatTable directly
        }
    }

    addIssueComment(issueId) {
        const contentDiv = document.getElementById('comment-input');
        const content = contentDiv.innerHTML; // Get HTML
        const status = document.getElementById('comment-status').value;
        const assignee = document.getElementById('comment-assignee').value;
        const startDate = document.getElementById('comment-startDate').value;
        const dueDate = document.getElementById('comment-dueDate').value;

        const issue = store.getIssue(issueId);
        const config = store.getConfig();

        // Update Issue Fields & Track Changes
        const updates = {};
        const changes = [];

        // Status
        if (status !== issue.status) {
            updates.status = status;
            const oldStatus = config.statuses.find(s => s.id === issue.status);
            const newStatus = config.statuses.find(s => s.id === status);
            changes.push(`状態: ${oldStatus ? oldStatus.label : '未設定'} → ${newStatus ? newStatus.label : '未設定'}`);
        }

        // Assignee
        if (assignee !== (issue.assignee || '')) {
            updates.assignee = assignee;
            const oldName = issue.assignee ? store.getMemberName(issue.assignee) : '未定';
            const newName = assignee ? store.getMemberName(assignee) : '未定';
            changes.push(`担当者: ${oldName} → ${newName}`);
        }

        // Dates
        if (startDate !== (issue.startDate || '')) {
            updates.startDate = startDate;
            changes.push(`開始日: ${issue.startDate || '未設定'} → ${startDate || '未設定'}`);
        }
        if (dueDate !== (issue.dueDate || '')) {
            updates.dueDate = dueDate;
            changes.push(`期限日: ${issue.dueDate || '未設定'} → ${dueDate || '未設定'}`);
        }

        // Add Comment if content is present OR there are changes
        // Strip HTML tags to check if empty
        const textContent = contentDiv.innerText.trim();
        if (textContent || content.includes('<img') || changes.length > 0) {
            const comments = issue.comments || [];
            comments.push({
                id: `c-${Date.now()}`,
                author: this.currentUser.id,
                content: content,
                date: new Date().toISOString(),
                changes: changes
            });
            updates.comments = comments;
        }

        // Only update if there are changes or comment
        if (Object.keys(updates).length > 0) {
            store.updateIssue(issueId, updates);
        } else {
            return; // No changes
        }

        // Check for mentions: simple includes check is safer now since we insert specific HTML span
        // or we can parse HTML. But simple text check usually works.
        // Actually, we inserted <span... >@Name </span>

        // For simplicity, we can regex the HTML or just check innerText
        const allMembers = store.getMembers();
        const mentionedMemberIds = new Set();
        const cleanText = contentDiv.innerText;

        allMembers.forEach(member => {
            if (cleanText.includes(`@${member.name}`) && member.id !== this.currentUser.id) {
                mentionedMemberIds.add(member.id);
                store.addNotification({
                    userId: member.id,
                    type: 'mention',
                    title: 'メンションされました',
                    link: { page: 'issue-detail', id: issueId },
                    message: `${store.getMemberName(this.currentUser.id)}さんが課題「${issue.title}」のコメントであなたをメンションしました。`
                });
            }
        });

        // Notify Issue Owner if not self and not already notified by mention
        if (issue.assignee && issue.assignee !== this.currentUser.id) {
            if (!mentionedMemberIds.has(issue.assignee)) {
                store.addNotification({
                    userId: issue.assignee,
                    type: 'comment',
                    title: '課題にコメントがありました',
                    link: { page: 'issue-detail', id: issueId },
                    message: `${store.getMemberName(this.currentUser.id)}さんがあなたの課題「${issue.title}」にコメントしました。`
                });
            }
        }


        this.renderIssueDetail(document.getElementById('view-container'), issueId);
    }

    deleteComment(issueId, commentId) {
        if (!confirm('コメントを削除しますか？')) return;
        const issue = store.getIssue(issueId);
        const comments = issue.comments.filter(c => c.id !== commentId);
        store.updateIssue(issueId, { comments });
        this.renderIssueDetail(document.getElementById('view-container'), issueId);
    }

    enableEditComment(issueId, commentId) {
        const issue = store.getIssue(issueId);
        const comment = issue.comments.find(c => c.id === commentId);
        const container = document.getElementById(`comment-content-${commentId}`);
        if (!container || !comment) return;

        const config = store.getConfig();
        const prefix = `edit-comment-${commentId}-`;

        container.innerHTML = this._generateCommentFormHtml(
            prefix,
            comment.content,
            issue,
            config,
            `
            <button class="btn btn-sm btn-secondary" onclick="window.app.renderIssueDetail(document.getElementById('view-container'), '${issue.id}')">キャンセル</button>
            <button class="btn btn-sm btn-primary" onclick="window.app.updateComment('${issue.id}', '${commentId}')">更新</button>
            `
        );
        // Setup Table Interactions for Edit Form
        this.setupWikiTableInteractions(`${prefix}input`);
    }


    updateComment(issueId, commentId) {
        const prefix = `edit-comment-${commentId}-`;
        const content = document.getElementById(`${prefix}input`).innerHTML;
        const status = document.getElementById(`${prefix}status`).value;
        const assignee = document.getElementById(`${prefix}assignee`).value;
        const startDate = document.getElementById(`${prefix}startDate`).value;
        const dueDate = document.getElementById(`${prefix}dueDate`).value;

        const issue = store.getIssue(issueId);
        const config = store.getConfig();

        const updates = {};
        const newChanges = [];

        // Identify Changes
        // Status
        if (status !== issue.status) {
            updates.status = status;
            const oldStatus = config.statuses.find(s => s.id === issue.status);
            const newStatus = config.statuses.find(s => s.id === status);
            newChanges.push(`状態: ${oldStatus ? oldStatus.label : '未設定'} → ${newStatus ? newStatus.label : '未設定'}`);
        }
        // Assignee
        if (assignee !== (issue.assignee || '')) {
            updates.assignee = assignee;
            const oldName = issue.assignee ? store.getMemberName(issue.assignee) : '未定';
            const newName = assignee ? store.getMemberName(assignee) : '未定';
            newChanges.push(`担当者: ${oldName} → ${newName}`);
        }
        // Dates
        if (startDate !== (issue.startDate || '')) {
            updates.startDate = startDate;
            newChanges.push(`開始日: ${issue.startDate || '未設定'} → ${startDate || '未設定'}`);
        }
        if (dueDate !== (issue.dueDate || '')) {
            updates.dueDate = dueDate;
            newChanges.push(`期限日: ${issue.dueDate || '未設定'} → ${dueDate || '未設定'}`);
        }

        // Update Comment Object
        const comments = issue.comments.map(c => {
            if (c.id === commentId) {
                // Merge existing changes with new changes
                const updatedChanges = (c.changes || []).concat(newChanges);
                return { ...c, content: content, changes: updatedChanges };
            }
            return c;
        });

        updates.comments = comments;

        store.updateIssue(issueId, updates);
        this.renderIssueDetail(document.getElementById('view-container'), issueId);
    }

    toggleReaction(id, emoji) {
        const issue = store.getIssue(id);
        const reactions = issue.reactions || {};
        // Use an array to track users who reached: reactions[emoji] = ['user1', 'user2']
        let users = reactions[emoji];
        if (!Array.isArray(users)) users = [];

        const userId = this.currentUser.id;
        const index = users.indexOf(userId);

        if (index === -1) {
            users.push(userId); // Add reaction
        } else {
            users.splice(index, 1); // Remove reaction
        }

        reactions[emoji] = users;
        store.updateIssue(id, { reactions });

        // Notify if reaction added and not self
        if (index === -1 && issue.assignee && issue.assignee !== this.currentUser.id) {
            store.addNotification({
                userId: issue.assignee,
                type: 'reaction',
                title: '課題にリアクションがつきました',
                link: { page: 'issue-detail', id: id },
                message: `${store.getMemberName(this.currentUser.id)}さんが課題「${issue.title}」に「${emoji}」をつけました。`
            });
        }

        this.renderIssueDetail(document.getElementById('view-container'), id);
    }

    toggleChecklist(id, checkIndex) {
        const issue = store.getIssue(id);
        if (!issue || !issue.desc) return;

        const lines = issue.desc.split('\n');
        let currentCheckIndex = 0;
        let lineIndexToUpdate = -1;

        // Find the N-th checklist item
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/^-\s\[([ x])\]\s(.*)/);
            if (match) {
                if (currentCheckIndex === checkIndex) {
                    lineIndexToUpdate = i;
                    break;
                }
                currentCheckIndex++;
            }
        }

        if (lineIndexToUpdate !== -1) {
            const line = lines[lineIndexToUpdate];
            // Toggle
            const isChecked = line.includes('[x]');
            lines[lineIndexToUpdate] = line.replace(/^-\s\[([ x])\]/, isChecked ? '- [ ]' : '- [x]');

            const newDesc = lines.join('\n');
            store.updateIssue(id, { desc: newDesc }, this.currentUser.id);
            this.renderIssueDetail(document.getElementById('view-container'), id);
        }
    }

    renderIssueForm(container, id = null) {
        const isEdit = !!id;
        const issue = isEdit ? store.getIssue(id) : {};
        // Filter members to only those in the current project
        const members = store.getMembers().filter(m => (this.currentProject.members || []).includes(m.id));
        const config = this.getProjectConfig(); // Load config

        container.innerHTML = `
            <!-- Page Title moved to Header -->
            <div class="form-container">
                <div class="form-group">
                    <label class="form-label">キー</label>
                    <input type="text" id="issue-key-manual" class="form-input" value="${issue.key || ''}" placeholder="任意のキー (例: PRJ-101)" ${isEdit ? 'disabled' : ''} style="${isEdit ? 'background-color:#f3f4f6; color:#9ca3bf;' : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">件名 (タイトル)</label>
                    <input type="text" id="issue-title" class="form-input" value="${issue.title || ''}">
                </div>
                <div class="form-row form-group" style="flex-wrap:wrap;">
                    <div class="form-col" style="min-width: 200px;"><label class="form-label">ステータス</label>
                        <select id="issue-status" class="form-select">
                            ${config.statuses.map(s => `
                                <option value="${s.id}" ${issue.status == s.id ? 'selected' : ''}>${s.label}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-col" style="min-width: 200px;"><label class="form-label">優先度</label>
                        <select id="issue-priority" class="form-select">
                            ${config.priorities.map(p => `
                                <option value="${p.id}" ${issue.priority == p.id ? 'selected' : ''}>${p.label}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-col" style="min-width: 200px;"><label class="form-label">担当者</label>
                        <select id="issue-assignee" class="form-select">
                            <option value="">未定</option>
                            ${members.map(m => `<option value="${m.id}" ${issue.assignee == m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-col" style="min-width: 200px;"><label class="form-label">カテゴリ</label>
                        <select id="issue-category" class="form-select">
                            <option value="">未選択</option>
                            ${config.categories.map(c => `
                                <option value="${c}" ${issue.category == c ? 'selected' : ''}>${c}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row form-group" style="flex-wrap:wrap;">
                    <div class="form-col" style="min-width: 200px;"><label class="form-label">開始日</label><input type="date" id="issue-start" class="form-input" value="${issue.startDate || ''}"></div>
                    <div class="form-col" style="min-width: 200px;"><label class="form-label">期限日</label><input type="date" id="issue-due" class="form-input" value="${issue.dueDate || ''}"></div>
                    <div class="form-col" style="min-width: 200px;"><label class="form-label">登録日 (作成日)</label><input type="datetime-local" id="issue-created" class="form-input" value="${issue.createdAt ? new Date(issue.createdAt).toISOString().slice(0, 16) : new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}"></div>
                </div>

                <div class="form-group">
                    <label class="form-label">詳細</label>
                    <div style="margin-bottom:0.5rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                         <!-- History -->
                         <button class="filter-toggle-btn rounded-pop-btn" title="元に戻す" onclick="document.execCommand('undo', false, null)"><i class="ph ph-arrow-u-up-left"></i></button>
                         <button class="filter-toggle-btn rounded-pop-btn" title="やり直し" onclick="document.execCommand('redo', false, null)"><i class="ph ph-arrow-u-up-right"></i></button>
                         <div style="width:1px; background:#e2e8f0; margin:0 0.5rem;"></div>

                         <button class="filter-toggle-btn rounded-pop-btn" onclick="window.app.insertCheckbox()"><i class="ph ph-check-square"></i></button>
                         
                         <!-- Formatting -->
                         <button class="filter-toggle-btn rounded-pop-btn" title="見出し1" onclick="document.execCommand('formatBlock', false, '<h1>')"><i class="ph ph-text-h-one"></i></button>
                         <button class="filter-toggle-btn rounded-pop-btn" title="見出し2" onclick="document.execCommand('formatBlock', false, '<h2>')"><i class="ph ph-text-h-two"></i></button>
                         <button class="filter-toggle-btn rounded-pop-btn" title="見出し3" onclick="document.execCommand('formatBlock', false, '<h3>')"><i class="ph ph-text-h-three"></i></button>
                         <button class="filter-toggle-btn rounded-pop-btn" title="標準テキストに戻す" onclick="document.execCommand('formatBlock', false, '<p>')"><i class="ph ph-text-t"></i></button>

                         <div style="width:1px; background:#e2e8f0; margin:0 0.5rem;"></div>

                         <button class="filter-toggle-btn rounded-pop-btn" onclick="document.execCommand('bold', false, null)"><i class="ph ph-text-b"></i></button>
                         <button class="filter-toggle-btn rounded-pop-btn" onclick="document.execCommand('strikeThrough', false, null)"><i class="ph ph-text-strikethrough"></i></button>
                         
                         <div style="width:1px; background:#e2e8f0; margin:0 0.5rem;"></div>

                         <button class="filter-toggle-btn rounded-pop-btn" onclick="document.execCommand('justifyLeft', false, null)"><i class="ph ph-text-align-left"></i></button>
                         <button class="filter-toggle-btn rounded-pop-btn" onclick="document.execCommand('justifyCenter', false, null)"><i class="ph ph-text-align-center"></i></button>
                         <button class="filter-toggle-btn rounded-pop-btn" onclick="document.execCommand('justifyRight', false, null)"><i class="ph ph-text-align-right"></i></button>
                         
                         <div style="width:1px; background:#e2e8f0; margin:0 0.5rem;"></div>
                         
                         <button class="filter-toggle-btn rounded-pop-btn" onclick="window.app.insertWikiFormatTable('issue-desc-editor')"><i class="ph ph-table"></i></button>
                    </div>
                    <div id="issue-desc-editor" class="form-textarea" contenteditable="true" style="overflow-y:auto; min-height:150px;">
                        ${issue.desc || ''}
                    </div>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:1rem;">
                    <button class="btn btn-secondary" onclick="window.app.navigate('issues')">キャンセル</button>
                    <button class="btn btn-primary" id="btn-submit-issue">${isEdit ? '更新する' : '登録する'}</button>
                </div>
            </div>
        `;

        document.getElementById('btn-submit-issue').addEventListener('click', () => {
            const data = {
                key: document.getElementById('issue-key-manual').value, // Manual Key
                title: document.getElementById('issue-title').value,
                desc: document.getElementById('issue-desc-editor').innerHTML,
                status: document.getElementById('issue-status').value,
                priority: document.getElementById('issue-priority').value,
                assignee: document.getElementById('issue-assignee').value,
                category: document.getElementById('issue-category').value,
                startDate: document.getElementById('issue-start').value,
                dueDate: document.getElementById('issue-due').value,
                createdAt: document.getElementById('issue-created').value ? new Date(document.getElementById('issue-created').value).toISOString() : new Date().toISOString(),
                projectId: this.currentProject.id
            };

            if (!data.title) return alert('件名は必須です');

            if (isEdit) {
                // Manual history generation removed. relying on store.updateIssue auto-detection.
                store.updateIssue(id, data, this.currentUser.id);
                this.navigate('issue-detail', { id });
            } else {

                const inputKey = data.key;
                // Generate a key if not provided
                const finalKey = inputKey || `PROJ-${Date.now()}`;

                // Check if key exists in THIS project ONLY.
                // We check against 'key' property, or fallback to 'id' if key is missing (legacy data).
                const isDuplicateInProject = store.getIssues().some(i =>
                    i.projectId === this.currentProject.id &&
                    ((i.key && i.key === finalKey) || (!i.key && i.id === finalKey))
                );

                if (isDuplicateInProject) {
                    return alert(`キー「${finalKey}」は既にこのプロジェクト内で使用されています。\n別のキーを指定してください。`);
                }

                // Generate a truly unique internal ID to avoid collisions in the global store
                // even if 'finalKey' is same as another project's key.
                const newUniqId = `iss-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

                // We store 'finalKey' as 'key'. 'id' is internal unique ID.
                // data.key might be empty string, but we want to save finalKey.
                store.addIssue({
                    ...data,
                    id: newUniqId,
                    key: finalKey,
                    projectId: this.currentProject.id,
                    createdAt: new Date().toISOString()
                });
                this.navigate('issues');
            }
        });
    }

    deleteIssue(id) {
        if (!confirm('この課題を削除しますか？')) return;
        const issues = store.getIssues().filter(i => i.id !== id);
        store.data.issues = issues;
        store.save();
        this.navigate('issues');
    }

    deleteSelectedIssues() {
        const cbs = document.querySelectorAll('.issue-select-cb:checked');
        if (cbs.length === 0) return;

        // Custom Modal Logic
        const modalId = 'custom-delete-modal';
        // Remove existing if any
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modalHtml = `
            <div id="${modalId}" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center; animation: fadeIn 0.2s;">
                <div style="background:white; border-radius:16px; padding:2rem; width:400px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); animation: slideUp 0.2s;">
                    <div style="font-weight:700; font-size:1.1rem; color:#1e293b; margin-bottom:1rem;">削除の確認</div>
                    <div style="color:#64748b; font-size:0.95rem; line-height:1.5; margin-bottom:2rem;">
                        選択した <b>${cbs.length}</b> 件の課題を削除しますか？<br>
                        この操作は取り消せません。
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
                        <button id="modal-cancel-btn" class="btn" style="border:1px solid #cbd5e1; color:#64748b; background:white; font-weight:600;">キャンセル</button>
                        <button id="modal-delete-btn" class="btn" style="background:#000000; color:white; border:none; font-weight:600; box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.3);">削除する</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Event Handlers
        const modal = document.getElementById(modalId);

        const close = () => {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 200);
        };

        document.getElementById('modal-cancel-btn').onclick = close;

        document.getElementById('modal-delete-btn').onclick = () => {
            const idsToRemove = Array.from(cbs).map(cb => cb.value);
            let issues = store.getIssues();
            issues = issues.filter(i => !idsToRemove.includes(i.id));
            store.data.issues = issues;
            store.save();
            close();
            this.navigate('issues'); // Refresh list
        };

        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) close();
        };
    }

    toggleSelectAll(checked) {
        document.querySelectorAll('.issue-select-cb').forEach(cb => cb.checked = checked);
        this.toggleIssueSelection();
    }

    toggleIssueSelection() {
        const count = document.querySelectorAll('.issue-select-cb:checked').length;
        const btn = document.getElementById('bulk-actions');
        if (btn) btn.style.display = count > 0 ? 'block' : 'none';
    }

    toggleCommentReaction(issueId, commentId, emoji) {
        const issue = store.getIssue(issueId);
        const comments = issue.comments || [];
        const comment = comments.find(c => c.id === commentId);

        if (comment) {
            comment.reactions = comment.reactions || {};
            let users = comment.reactions[emoji] || [];

            const userId = this.currentUser.id;
            const idx = users.indexOf(userId);
            if (idx === -1) users.push(userId);
            else users.splice(idx, 1);

            comment.reactions[emoji] = users;
            store.updateIssue(issueId, { comments });

            // Notify comment author if reaction added
            if (idx === -1 && comment.author !== this.currentUser.id) {
                store.addNotification({
                    userId: comment.author,
                    type: 'reaction',
                    title: 'コメントにリアクションがつきました',
                    link: { page: 'issue-detail', id: issueId },
                    message: `${store.getMemberName(this.currentUser.id)}さんが課題「${issue.title}」のコメントに「${emoji}」をつけました。`
                });
            }

            this.renderIssueDetail(document.getElementById('view-container'), issueId);
        }
    }

    handleIssueReactionClick(event, issueId, emoji) {
        this.triggerSparkle(event.clientX, event.clientY);

        const issue = store.getIssue(issueId);
        if (!issue) return;

        issue.reactions = issue.reactions || {};
        let users = issue.reactions[emoji] || [];

        const userId = this.currentUser.id;
        const index = users.indexOf(userId);

        if (index === -1) {
            users.push(userId);
        } else {
            users.splice(index, 1);
        }

        issue.reactions[emoji] = users;
        store.updateIssue(issueId, { reactions: issue.reactions });

        if (index === -1 && issue.assignee && issue.assignee !== this.currentUser.id) {
            store.addNotification({
                userId: issue.assignee,
                type: 'reaction',
                title: '課題にリアクションがつきました',
                link: { page: 'issue-detail', id: issueId },
                message: `${store.getMemberName(this.currentUser.id)}さんが課題「${issue.title}」に「${emoji}」をつけました。`
            });
        }
        this.renderIssueDetail(document.getElementById('view-container'), issueId);
    }

    // Helpers for Editor
    execCmd(cmd) {
        document.execCommand(cmd, false, null);
        document.getElementById('issue-desc-editor').focus();
    }

    insertCheckbox() {
        const editor = document.getElementById('issue-desc-editor');
        editor.focus();
        // Insert a checkbox input
        const checkbox = '<input type="checkbox" style="margin-right:5px;"> ';
        document.execCommand('insertHTML', false, checkbox);
    }

    // --- Board ---
    renderBoard(container, issues) {
        const statuses = this.getProjectConfig().statuses;
        // Helper to get random tag color based on string
        const getTagColor = (str) => {
            if (!str) return 'tag-grey';
            const colors = ['tag-blue', 'tag-purple', 'tag-green', 'tag-orange'];
            let hash = 0;
            for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
            return colors[Math.abs(hash) % colors.length];
        };

        container.innerHTML = `
            <style>
                .pop-board-layout {
                    display: flex; gap: 0.8rem; overflow-x: auto; padding-bottom: 2rem; height: calc(100vh - 180px); align-items: flex-start;
                }
                .kanban-column {
                    flex: 1;
                    min-width: 240px; /* narrowed for 4-col fit */
                    background: #f8fafc;
                    border-radius: 20px; /* Slightly reduced radius */
                    padding: 0.8rem; /* Compact padding */
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                    height: 100%;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
                    transition: background 0.2s;
                }
                .kanban-column:hover {
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
                }
                /* Column Colors */
                .col-color-0 { background: #eff6ff; border-color: #dbeafe; } /* Blue */
                .col-color-1 { background: #fff7ed; border-color: #ffedd5; } /* Orange */
                .col-color-2 { background: #f0fdf4; border-color: #dcfce7; } /* Green */
                .col-color-3 { background: #faf5ff; border-color: #f3e8ff; } /* Purple */
                
                .column-header {
                    display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; padding: 0 0.5rem;
                }
                .column-title {
                    font-weight: 800; font-size: 0.95rem; color: #334155;
                }
                .column-badge {
                    width: 24px; height: 24px; border-radius: 50%; background: white; color: #64748b; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                
                .task-list {
                    flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.6rem; padding: 0.2rem; scrollbar-width: thin;
                }
                
                .pop-card {
                    background: white;
                    border-radius: 8px; /* Reduced from 12px */
                    padding: 2.5rem;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* Reduced shadow */
                    border: 1px solid #f1f5f9; /* Thinned border */
                    margin-left: 40px; /* Align to left with 40px margin */
                }

                .pop-card input[type="text"],
                .pop-card input[type="email"],
                .pop-card input[type="password"],
                .pop-card select,
                .pop-card textarea {
                    border-width: 1px; /* Thinned input borders */
                    border-radius: 6px; /* Reduced border radius for inputs */
                }

                .kanban-card {
                    background: white;
                    border-radius: 12px;
                    padding: 0.8rem;
                    box-shadow: 0 2px 4px -1px rgba(0,0,0,0.05);
                    border: 1px solid #cbd5e1;
                    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                    cursor: grab;
                }
                .kanban-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 12px -3px rgba(0,0,0,0.1);
                    border-color: #f1f5f9;
                    z-index: 10;
                }
                .kanban-card.dragging {
                    opacity: 0.8;
                    transform: rotate(2deg) scale(1.02);
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
                    cursor: grabbing;
                    z-index: 100;
                }
                
                .card-tags { display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.4rem; margin-bottom: 0.4rem; }
                .card-tag { padding: 2px 6px; border-radius: 4px; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.02em; }
                /* Change round tags to slightly square for compact look */
                
                /* Compact Footer */
                .card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #f1f5f9; padding-top: 0.4rem; margin-top: 0.3rem; }
                .card-assignee { display: flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; font-weight: 600; color: #64748b; }
                .avatar-ring { border: 1px solid white; box-shadow: 0 1px 2px rgba(0,0,0,0.1); border-radius: 50%; }
                
                .add-issue-fab {
                    background: var(--primary); color: white; border-radius: 50px; padding: 0.8rem 1.5rem; font-weight: bold; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3); transition: transform 0.2s; display: flex; align-items: center; gap: 0.5rem;
                }
                .add-issue-fab:hover { transform: translateY(-2px); box-shadow: 0 10px 15px rgba(37, 99, 235, 0.4); }
            </style>
            

            
            <div class="pop-board-layout">
                ${statuses.map((status, idx) => `
                    <div class="kanban-column col-color-${idx % 4}" 
                         ondragover="window.app.onDragOver(event)" 
                         ondrop="window.app.onDrop(event, '${status.id}')">
                        <div class="column-header">
                            <span class="column-title">${status.label}</span>
                            <span class="column-badge">${issues.filter(i => i.status === status.id).length}</span>
                        </div>
                        <div class="task-list">
                            ${issues.filter(i => i.status === status.id).map(i => {
            const assigneeMember = store.getMembers().find(m => m.id === i.assignee);
            const assigneeName = assigneeMember ? assigneeMember.name : '未定';
            const commentCount = i.comments ? i.comments.length : 0;

            return `
                                <div id="card-${i.id}" class="kanban-card" draggable="true" 
                                     ondragstart="window.app.onDragStart(event, '${i.id}')" 
                                     ondragend="window.app.onDragEnd(event)"
                                     onclick="window.app.navigate('issue-detail', {id:'${i.id}'})">
                                    
                                    <div style="font-weight:700; font-size:0.85rem; color:#1e293b; line-height:1.3; margin-bottom:0.25rem;">${i.title}</div>

                                    ${(i.category && i.category !== '未選択') || i.priority ? `
                                    <div class="card-tags">
                                        <span class="card-tag tag-grey" style="opacity:0.9; background:#f1f5f9; color:#64748b;">${getPriorityLabel(i.priority)}</span>
                                        ${(i.category && i.category !== '未選択') ? `<span class="card-tag ${getTagColor(i.category)}">${i.category}</span>` : ''}
                                    </div>
                                    ` : ''}
                                    
                                    <div class="card-footer">
                                        <div class="card-assignee">
                                             <div class="avatar-ring" style="display:flex;">${this.renderAvatar(i.assignee, 20)}</div>
                                             <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px;">${assigneeName}</span>
                                        </div>
                                        ${commentCount > 0 ? `
                                        <div style="font-size:0.7rem; color:#94a3b8; display:flex; align-items:center; gap:0.2rem;">
                                            <i class="ph ph-chat-circle-dots" style="font-size:0.9rem; color:#cbd5e1;"></i> ${commentCount}
                                        </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `}).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    // DnD Helpers - Ensure they are attached to window.app
    onDragStart(e, id) {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging'); // Add class for visuals
        setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
    }

    onDragEnd(e) {
        e.target.classList.remove('dragging');
        e.target.style.opacity = '1';
        // Remove any placeholders if we added them
    }

    onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // Add visual cue logic here if needed (e.g., highlighting drop zone)
    }

    onDrop(e, status) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        e.target.classList.remove('dragging'); // Cleanup if needed here or in DragEnd

        const issue = store.getIssue(id);
        if (issue && issue.status !== status) {
            store.updateIssue(id, { status: status }, this.currentUser.id);
            // Re-render Board
            this.renderBoard(document.getElementById('view-container'), store.getIssues().filter(i => i.projectId === this.currentProject.id || (!i.projectId && this.currentProject.id === 'prj-1')));
        }
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            // Negative offset means we are above the center of the child
            // We want the closest negative offset (element directly below cursor)
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // --- Gantt Filters & Logic ---
    onGanttStartDrag(e, id, mode) {
        if (e.button !== 0) return; // Only left click
        e.preventDefault();
        const bar = document.getElementById(`gantt-bar-${id}`);
        const issue = store.getIssue(id);
        const cellWidth = 50;

        // Initial State
        this.ganttDragState = {
            id, mode,
            startX: e.clientX,
            originalLeft: parseFloat(bar.style.left) || 0,
            originalWidth: parseFloat(bar.style.width) || cellWidth,
            bar: bar,
            issue: issue,
            cellWidth: cellWidth
        };

        document.body.style.cursor = mode === 'move' ? 'move' : 'col-resize';

        // Bind global listeners
        this.onGanttDragRef = this.onGanttDrag.bind(this);
        this.onGanttEndDragRef = this.onGanttEndDrag.bind(this);
        window.addEventListener('mousemove', this.onGanttDragRef);
        window.addEventListener('mouseup', this.onGanttEndDragRef);
    }

    onGanttDrag(e) {
        if (!this.ganttDragState) return;
        const s = this.ganttDragState;
        const delta = e.clientX - s.startX;

        if (s.mode === 'move') {
            s.bar.style.left = `${s.originalLeft + delta}px`;
        } else if (s.mode === 'resize-l') {
            const newWidth = Math.max(s.originalWidth - delta, s.cellWidth);
            const newLeft = s.originalLeft + (s.originalWidth - newWidth); // Anchor right
            // Re-calculate based on delta for robustness
            // newLeft = originalLeft + delta. If delta is positive (drag right), left increases, width decreases.
            // Width = OriginalWidth - delta. 
            if (s.originalWidth - delta >= s.cellWidth) {
                s.bar.style.left = `${s.originalLeft + delta}px`;
                s.bar.style.width = `${s.originalWidth - delta}px`;
            }
        } else if (s.mode === 'resize-r') {
            const newWidth = Math.max(s.originalWidth + delta, s.cellWidth);
            s.bar.style.width = `${newWidth}px`;
        }
    }

    onGanttEndDrag(e) {
        if (!this.ganttDragState) return;
        const s = this.ganttDragState;

        window.removeEventListener('mousemove', this.onGanttDragRef);
        window.removeEventListener('mouseup', this.onGanttEndDragRef);
        document.body.style.cursor = '';

        // Calculate Changes
        const finalLeft = parseFloat(s.bar.style.left);
        const finalWidth = parseFloat(s.bar.style.width);

        // Convert pixels back to days (relative to current Gantt View Start)
        // Ensure we rely on the same Start View logic as renderGantt
        const today = new Date();
        const currentYear = this.ganttFilters.year ? parseInt(this.ganttFilters.year) : today.getFullYear();
        const currentMonth = this.ganttFilters.month ? parseInt(this.ganttFilters.month) : (today.getMonth() + 1);
        const viewStart = new Date(currentYear, currentMonth - 1, 1);

        const daysOffset = Math.round(finalLeft / s.cellWidth);
        const durationDays = Math.round(finalWidth / s.cellWidth);
        // durationDays includes start and end. e.g. 1 day width = 1 cell.

        const newStartDate = new Date(viewStart);
        newStartDate.setDate(viewStart.getDate() + daysOffset);

        const newDueDate = new Date(newStartDate);
        newDueDate.setDate(newStartDate.getDate() + (durationDays - 1)); // -1 because inclusive

        // Format YYYY-MM-DD
        const formatDate = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        if (s.issue) {
            store.updateIssue(s.id, {
                startDate: formatDate(newStartDate),
                dueDate: formatDate(newDueDate)
            }, this.currentUser.id);
            this.ganttDragState = null;
            // Refetch project filtered issues to ensure we only show current project's Gantt
            const projectIssues = store.getIssues().filter(i => i.projectId === this.currentProject.id || (!i.projectId && this.currentProject.id === 'prj-1'));
            this.renderGantt(document.getElementById('view-container'), projectIssues);
        }
    }

    // --- Gantt w/ Filter ---
    // --- Gantt Modern Redesign ---
    renderGantt(container, issues) {
        if (!issues) issues = store.getIssues();
        issues = issues.filter(i => i.startDate && i.dueDate);
        const categories = this.getProjectConfig().categories || [];

        // Filtering
        if (this.ganttFilters.category !== 'all') issues = issues.filter(i => i.category === this.ganttFilters.category);
        if (this.ganttFilters.assignee !== 'all') issues = issues.filter(i => i.assignee === this.ganttFilters.assignee);

        // Date Calculations
        const today = new Date();
        const currentYear = this.ganttFilters.year ? parseInt(this.ganttFilters.year) : today.getFullYear();
        const currentMonth = this.ganttFilters.month ? parseInt(this.ganttFilters.month) : (today.getMonth() + 1);

        // Ensure defaults are set
        this.ganttFilters.year = currentYear;
        this.ganttFilters.month = currentMonth;

        const startView = new Date(currentYear, currentMonth - 1, 1);
        const endView = new Date(currentYear, currentMonth, 1);
        const totalDays = Math.ceil((endView - startView) / (1000 * 60 * 60 * 24));

        // Layout Config
        const cellWidth = 50;
        const rowHeight = 60;
        const headerHeight = 40;

        // Filter visible issues
        issues = issues.filter(i => {
            const s = parseDateLocal(i.startDate);
            const e = parseDateLocal(i.dueDate);
            if (!s || !e) return false;
            return s < endView && e > startView;
        });

        // Current Day Line Calculation
        const diffToday = (today - startView) / (1000 * 60 * 60 * 24);
        const showTodayLine = diffToday >= 0 && diffToday <= totalDays;
        const todayLineLeft = diffToday * cellWidth;

        // --- Generate Right Side Components ---

        // Header (Dates)
        let headerHtml = '';
        const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
        for (let i = 0; i < totalDays; i++) {
            const d = new Date(startView); d.setDate(startView.getDate() + i);
            const day = d.getDay();
            let colorStyle = '';
            if (day === 0) colorStyle = 'color:#ef4444; background:rgba(239,68,68,0.05);'; // Sunday Red
            else if (day === 6) colorStyle = 'color:#3b82f6; background:rgba(59,130,246,0.05);'; // Saturday Blue

            headerHtml += `
                <div class="gantt-header-cell" style="width:${cellWidth}px; ${colorStyle}">
                    ${d.getDate()} <span style="font-size:0.6rem; opacity:0.8;">(${daysOfWeek[day]})</span>
                </div>`;
        }

        // Grid Lines
        const gridHtml = Array.from({ length: totalDays + 1 }, (_, i) => {
            return `<div class="gantt-grid-line" style="left:${i * cellWidth}px;"></div>`;
        }).join('');

        // Right Bars
        const barsHtml = issues.map(i => {
            const start = parseDateLocal(i.startDate);
            const end = parseDateLocal(i.dueDate);
            if (!start || !end) return '';

            const diffStart = (start - startView) / (1000 * 60 * 60 * 24);
            const diffDur = (end - start) / (1000 * 60 * 60 * 24);

            let left = diffStart < 0 ? 0 : diffStart;
            let rawWidth = diffDur + 1; // inclusive

            // Adjust visualization if out of bounds (but keep dragging logic robust)
            // Note: For dragging, we ideally want the real element to represent the real date range, 
            // but clipping applies. We will rely on visual updates during drag.

            const realLeftPx = diffStart * cellWidth;
            const realWidthPx = (diffDur + 1) * cellWidth;

            // Display clipping
            if (rawWidth <= 0) return '';

            const statusObj = this.getProjectConfig().statuses.find(s => s.id === i.status);
            let bgColor = statusObj ? statusObj.color : '#e2e8f0';

            return `
                <div class="gantt-row" style="height:${rowHeight}px;">
                    <div id="gantt-bar-${i.id}" class="gantt-bar-wrapper" 
                         style="left:${realLeftPx}px; width:${realWidthPx}px; height:${rowHeight - 16}px; top:8px;"
                         onmousedown="event.stopPropagation(); window.app.onGanttStartDrag(event, '${i.id}', 'move')">
                        
                        <div class="gantt-handle gantt-handle-l" onmousedown="event.stopPropagation(); window.app.onGanttStartDrag(event, '${i.id}', 'resize-l')"></div>
                        
                        <div class="gantt-bar-pill" style="background-color:${bgColor}; border:1px solid rgba(0,0,0,0.1); box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                             <div style="display:flex; flex-direction:column; justify-content:center; padding:0 0.5rem; width:100%;">
                                <span style="font-size:0.75rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${i.title}</span>
                                <span style="font-size:0.65rem; opacity:0.8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${i.startDate.split('T')[0].replace(/-/g, '/')} ~ ${i.dueDate.split('T')[0].replace(/-/g, '/')}</span>
                             </div>
                        </div>
                        
                        <div class="gantt-handle gantt-handle-r" onmousedown="event.stopPropagation(); window.app.onGanttStartDrag(event, '${i.id}', 'resize-r')"></div>
                    </div>
                </div>
            `;
        }).join('');

        // --- Generate Left Side Components (Task Info) ---
        const leftRowsHtml = issues.map(i => {
            const statusObj = this.getProjectConfig().statuses.find(s => s.id === i.status);
            const statusLabel = statusObj ? statusObj.label : i.status;
            const statusColor = statusObj ? statusObj.color : '#e2e8f0';
            const statusTextColor = statusObj ? statusObj.textColor : '#64748b';

            return `
                <div class="gantt-left-row" style="height:${rowHeight}px; display:flex; align-items:center; border-bottom:1px solid #f1f5f9; padding:0 1rem; gap:1rem; cursor:pointer;" onclick="window.app.navigate('issue-detail', {id:'${i.id}'})">
                     <div style="flex:1; font-weight:600; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${i.title}</div>
                     <div style="width:100px; display:flex; align-items:center; gap:0.5rem;">
                        ${this.renderAvatar(i.assignee, 24)}
                        <span style="font-size:0.8rem; color:#475569; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${store.getMemberName(i.assignee)}</span>
                     </div>
                     <div style="width:70px; text-align:center;">
                        <span style="font-size:0.75rem; background:${statusColor}; color:${statusTextColor}; padding:2px 8px; border-radius:12px; font-weight:600;">${statusLabel}</span>
                     </div>
                </div>
             `;
        }).join('');

        const yearOptions = [-2, -1, 0, 1, 2].map(offset => {
            const y = today.getFullYear() + offset;
            return `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}年</option>`;
        }).join('');

        const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            return `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${m}月</option>`;
        }).join('');

        // Store today position for scrolling
        this.todayScrollPos = todayLineLeft;

        container.innerHTML = `
             <style>
                .gantt-bar-wrapper {
                     position: absolute;
                     cursor: move;
                     display: flex;
                     align-items: center;
                     transition: box-shadow 0.2s;
                     z-index: 20;
                     min-width: 20px;
                }
                .gantt-bar-wrapper:hover { z-index: 30; }
                .gantt-bar-pill {
                    width: 100%; height: 100%; border-radius: 8px; display: flex; align-items: center; overflow: hidden;
                    pointer-events: none; /* Let clicks pass to wrapper usually, but here wrapper handles drag */
                }
                .gantt-handle {
                    position: absolute; top: 0; bottom: 0; width: 10px; cursor: col-resize; z-index: 40;
                }
                .gantt-handle-l { left: -5px; }
                .gantt-handle-r { right: -5px; }
                .gantt-bar-wrapper:hover .gantt-handle { background: rgba(0,0,0,0.1); }
                
                .gantt-wrapper {
                    display: flex;
                    height: calc(100vh - 220px);
                    background: #ffffff;
                    border-radius: 20px;
                    box-shadow: var(--shadow-md);
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                }
                .gantt-left-panel {
                    width: 450px;
                    flex-shrink: 0;
                    border-right: 1px solid #e2e8f0;
                    display: flex;
                    flex-direction: column;
                    background: #fff;
                    z-index: 10;
                }
                .gantt-left-header {
                    height: ${headerHeight}px;
                    border-bottom: 2px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 1rem;
                    background: #f8fafc;
                    font-weight: 600;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }
                .gantt-left-body {
                    flex: 1;
                    overflow: hidden; /* Scroll synced via JS */
                    background: #fff;
                }
                .gantt-right-panel {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                }
                .gantt-right-header {
                    height: ${headerHeight}px;
                    overflow: hidden; /* Scroll synced via JS */
                    border-bottom: 2px solid #f1f5f9;
                    background: #f8fafc;
                }
                .gantt-header-content {
                    display: flex;
                    height: 100%;
                    align-items: center;
                }
                .gantt-header-cell {
                    flex-shrink: 0;
                    text-align: center;
                    font-weight: 600;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    border-right: 1px solid #f1f5f9;
                }
                .gantt-right-body {
                    flex: 1;
                    overflow: auto;
                    position: relative;
                    scrollbar-width: thin;
                }
                .gantt-canvas {
                    position: relative;
                    width: ${totalDays * cellWidth}px;
                    min-height: 100%;
                    background: 
                        repeating-linear-gradient(90deg, transparent 0, transparent ${cellWidth - 1}px, #f1f5f9 ${cellWidth - 1}px, #f1f5f9 ${cellWidth}px);
                    background-size: ${cellWidth}px 100%;
                }
                .gantt-today-line {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: var(--primary);
                    z-index: 50; /* Raised above bars (z-index 20/30) */
                    pointer-events: none;
                    box-shadow: 0 0 4px rgba(0,0,0,0.3);
                }
                .gantt-row {
                    position: relative;
                    border-bottom: 1px solid #f1f5f9;
                    box-sizing: border-box;
                }
                .gantt-bar-wrapper {
                    position: absolute;
                    border-radius: 8px;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .gantt-bar-wrapper:hover {
                    opacity: 0.9;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    z-index: 20;
                }
                .gantt-bar-pill {
                    width: 100%;
                    height: 100%;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    padding: 0 0.5rem;
                    color: #1f2937;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
             </style>

            <div class="page-header" style="justify-content:flex-start; align-items: center; margin-bottom:1rem;">
               <div style="display:flex; align-items:center; gap:1rem;">
                    <!-- Title removed -->
                    <div style="display:flex; align-items:center; gap:0.5rem; background:white; padding:4px; border-radius:12px; border:1px solid #e2e8f0;">
                         <button class="btn btn-sm btn-secondary" onclick="window.app.shiftGantt(-1)"><i class="ph ph-caret-left"></i></button>
                         <div style="font-weight:700; padding:0 0.5rem; font-size:1rem; min-width:100px; text-align:center;">${currentYear}年 ${currentMonth}月</div>
                         <button class="btn btn-sm btn-secondary" onclick="window.app.shiftGantt(1)"><i class="ph ph-caret-right"></i></button>
                    </div>
               </div>
            </div>

            <div class="gantt-wrapper">
                <!-- LEFT PANEL (FIXED) -->
                <div class="gantt-left-panel">
                    <div class="gantt-left-header">
                        <span>タスク一覧</span>
                        <button class="btn btn-sm btn-primary" onclick="window.app.navigate('issue-create')" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;"><i class="ph ph-plus"></i> 追加</button>
                    </div>
                    <div class="gantt-left-body" id="gantt-left-body">
                        ${leftRowsHtml}
                    </div>
                </div>

                <!-- RIGHT PANEL (SCROLLABLE) -->
                <div class="gantt-right-panel">
                    <div class="gantt-right-header" id="gantt-right-header">
                        <div class="gantt-header-content" style="width:${totalDays * cellWidth}px">
                            ${headerHtml}
                        </div>
                    </div>
                    <div class="gantt-right-body" id="gantt-right-body" onscroll="window.app.syncGanttScroll()">
                        <div class="gantt-canvas" style="width:${totalDays * cellWidth}px">
                             ${showTodayLine ? `<div class="gantt-today-line" style="left:${todayLineLeft}px;"></div>` : ''}
                             ${barsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initial Scroll Sync
        setTimeout(() => this.scrollToToday(), 100);
    }

    syncGanttScroll() {
        const rightBody = document.getElementById('gantt-right-body');
        const leftBody = document.getElementById('gantt-left-body');
        const rightHeader = document.getElementById('gantt-right-header');

        if (rightBody && leftBody) leftBody.scrollTop = rightBody.scrollTop;
        if (rightBody && rightHeader) rightHeader.scrollLeft = rightBody.scrollLeft;
    }

    shiftGantt(offset) {
        let m = this.ganttFilters.month + offset;
        let y = this.ganttFilters.year;
        if (m > 12) { m = 1; y++; }
        if (m < 1) { m = 12; y--; }
        this.updateGanttFilter('year', y);
        this.updateGanttFilter('month', m);
    }

    scrollToToday() {
        const rightBody = document.getElementById('gantt-right-body');
        if (rightBody && this.todayScrollPos !== undefined) {
            const containerWidth = rightBody.clientWidth;
            rightBody.scrollLeft = this.todayScrollPos - (containerWidth / 2);
        }
    }

    updateGanttFilter(key, val) {
        this.ganttFilters[key] = val;
        // Pass current project issues
        const issues = store.getIssues().filter(i => i.projectId === this.currentProject.id || (!i.projectId && this.currentProject.id === 'prj-1'));
        this.renderGantt(document.getElementById('view-container'), issues);
    }

    // --- Wiki ---
    renderWiki(container) {
        // Filter Wikis by Project
        const allWikis = store.getWikis();
        const wikis = allWikis.filter(w => w.projectId === this.currentProject.id || (!w.projectId && this.currentProject.id === 'prj-1'));

        // Ensure selected ID is valid
        if (this.selectedWikiId && !wikis.find(w => w.id === this.selectedWikiId)) {
            this.selectedWikiId = null;
        }
        this.selectedWikiId = this.selectedWikiId || (wikis[0] ? wikis[0].id : null);
        const currentWiki = wikis.find(w => w.id === this.selectedWikiId);

        // Collect all tags
        const allTags = [...new Set(wikis.flatMap(w => w.tags || []))];

        const headings = [];
        const renderContent = (content) => {
            if (!content) return '';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;

            let counter = 0;
            tempDiv.querySelectorAll('h1, h2, h3').forEach(header => {
                const id = `header-${counter++}`;
                header.id = id;
                // Add class for styling if missing
                if (header.tagName === 'H1') header.classList.add('wiki-h1');
                if (header.tagName === 'H2') header.classList.add('wiki-h2');
                if (header.tagName === 'H3') header.classList.add('wiki-h3');

                headings.push({
                    id: id,
                    text: header.textContent,
                    level: parseInt(header.tagName.substring(1))
                });
            });
            return tempDiv.innerHTML;
        };

        const contentHtml = currentWiki ? renderContent(currentWiki.content) : '';

        container.innerHTML = `
            <style>
                .wiki-layout { display: flex; height: calc(100vh - 100px); gap: 1.5rem; }
                .wiki-sidebar { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; }
                .wiki-main { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
                .wiki-paper { background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--shadow-sm); flex: 1; display:flex; flex-direction:column; overflow:hidden; }
                
                .wiki-section-title { font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
                .wiki-section-content { background: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 0.8rem; min-height: 60px; font-size: 0.85rem; color: #64748b; }
                
                .wiki-list-item { padding: 0.4rem 0.8rem; color: var(--text-main); cursor: pointer; border-bottom:1px solid #f1f5f9; display:block; text-decoration:none; font-size: 0.85rem; }
                .wiki-list-item:hover { text-decoration: underline; background-color: #f8fafc; }
                .wiki-list-item.active { background-color: #f3f4f6; font-weight: 600; border-left: 3px solid var(--primary); padding-left: calc(0.8rem - 3px); }

                .wiki-header-bar { padding: 1.2rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; flex-wrap:wrap; gap:1rem; justify-content: space-between; align-items: center; background:white; }
                .wiki-content-body { padding: 2rem 3rem; overflow-y: auto; line-height: 1.8; color: #334155; font-size: 0.95rem; }
                
                .wiki-h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; border-bottom: 3px solid #808080; padding-bottom: 0.5rem; color: #1e293b; }
                .wiki-h2 { font-size: 1.25rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 2px solid #808080; padding-bottom: 0.25rem; color: #1e293b; }
                .wiki-h3 { font-size: 1.1rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.8rem; color: #1e293b; }
                
                .wiki-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
                .wiki-table td, .wiki-table th { border: 1px solid #cbd5e1; padding: 8px; }

                .wiki-toolbar-btn { background: white; border: 1px solid #cbd5e1; padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.9rem; color: #475569; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.2s;}
                .wiki-toolbar-btn:hover { background: #f1f5f9; border-color: #94a3b8; }
                .wiki-menu-dropdown { position:absolute; top:100%; right:0; background:white; border:1px solid #cbd5e1; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); border-radius:4px; display:none; flex-direction:column; min-width:120px; z-index:10; }
                .wiki-menu-item { padding: 0.5rem 1rem; cursor: pointer; font-size:0.9rem; color:#ef4444; }
                .wiki-menu-item:hover { background:#ffeeec; }

                /* Reaction Button Styles */
                /* See style.css for shared .reaction-btn and .sparkle-particle styles */
            </style>


            <div class="wiki-layout" style="margin-top: 1rem;">
                <!-- Main Content -->
                <div class="wiki-main">
                    <div class="wiki-paper">
                        ${currentWiki ? `
                            <div class="wiki-header-bar" style="align-items:flex-start;">
                                <div style="flex:1;">
                                     <div style="font-size:1.5rem; font-weight:700; margin-bottom:0.5rem;">${currentWiki.title}</div>
                                     <div style="font-size:0.85rem; color:var(--text-muted); display:flex; align-items:center; gap:0.5rem;">
                                        ${this.renderAvatar(currentWiki.author || 'admin')}
                                        <span>${store.getMemberName(currentWiki.author || 'admin')}</span>
                                        <span>•</span>
                                        <span>${currentWiki.createdAt ? formatDate(currentWiki.createdAt) : ''}</span>
                                        <span>•</span>
                                        <span>${currentWiki.tags ? currentWiki.tags.join(', ') : 'タグなし'}</span>
                                     </div>
                                </div>
                                <div style="display:flex; gap:0.5rem; position:relative;">
                                    <button class="wiki-toolbar-btn" onclick="window.app.renderWikiEdit('${currentWiki.id}')"><i class="ph ph-pencil-simple"></i> 編集</button>
                                    <div style="position:relative;">
                                        <button class="wiki-toolbar-btn" style="padding:0.4rem 0.8rem;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display==='flex'?'none':'flex'"><i class="ph ph-dots-three"></i></button>
                                        <div class="wiki-menu-dropdown">
                                             <div class="wiki-menu-item" onclick="if(confirm('削除しますか？')) { store.deleteWiki('${currentWiki.id}'); window.app.renderWiki(document.getElementById('view-container')); }">削除</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="wiki-content-body">
                                ${contentHtml}
                                <div style="margin-top:3rem; border-top:1px solid #eee; padding-top:1.5rem;">
                                    <div style="display:flex; gap:0.5rem;">
                                    <div style="display:flex; gap:0.5rem;">
                                        ${['👍', '❤️', '😄', '🎉', '👀'].map(emoji => {
            const reactions = currentWiki.reactions || {};
            const users = reactions[emoji] || [];
            const count = users.length;
            const isReacted = users.includes(this.currentUser.id);
            return `
                                                <button class="reaction-btn ${isReacted ? 'active' : ''}" 
                                                    onclick="window.app.handleWikiReactionClick(event, '${currentWiki.id}', '${emoji}')">
                                                    <span style="font-size:1.2rem;">${emoji}</span>
                                                    <span class="count">${count > 0 ? count : ''}</span>
                                                </button>
                                            `;
        }).join('')}
                                    </div>
                                    </div>
                                </div>
                            </div>
                        ` : '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#94a3b8;">ページを選択してください</div>'}
                    </div>
                </div>

                <!-- Right Sidebar -->
                <div class="wiki-sidebar">
                    <button class="btn btn-primary" style="width:100%; margin-bottom:1rem; border:1px solid #cbd5e1;" onclick="window.app.renderWikiEdit('new')"><i class="ph ph-plus"></i> ナレッジの追加</button>
                    <div>
                        <div class="wiki-section-title"><i class="ph ph-caret-down"></i> タグ一覧 (${allTags.length})</div>
                        <div class="wiki-section-content" style="background:#fff; padding:0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            ${allTags.length > 0 ? allTags.map(t => `<span class="wiki-list-item" style="border-radius: 9999px; background-color: #f1f5f9; padding: 0.25rem 0.75rem; border: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;" onclick="window.app.filterWikiByTag('${t}')"><i class="ph ph-tag"></i> ${t}</span>`).join('') : '<div style="padding:0.5rem; color:#ccc;">タグなし</div>'}
                        </div>
                    </div>

                    <div>
                        <div class="wiki-section-title">
                            <i class="ph ph-caret-down"></i> ページ一覧 (${wikis.length}) 
                            <i class="ph ph-magnifying-glass" style="margin-left:auto; cursor:pointer;" onclick="const el = document.getElementById('wiki-search-container'); el.style.display = el.style.display === 'none' ? 'block' : 'none'; if(el.style.display==='block') document.getElementById('wiki-search-input').focus();"></i>
                        </div>
                        <div id="wiki-search-container" style="display:none; padding:0.5rem; border-bottom:1px solid #e2e8f0;">
                            <input id="wiki-search-input" type="text" class="form-input" placeholder="検索..." style="width:100%; font-size:0.85rem;" onkeyup="window.app.renderWikiPageList(this.value)">
                        </div>
                        <div id="wiki-page-list-container" class="wiki-section-content" style="padding:0; overflow:hidden;">
                            ${wikis.map(w => `
                                <div class="wiki-list-item ${w.id === this.selectedWikiId ? 'active' : ''}" onclick="window.app.selectWiki('${w.id}')">
                                    <div style="display:flex; justify-content:space-between;">
                                        <span>${w.title}</span>
                                        <span style="font-size:0.75rem; color:#94a3b8;">${formatDate(w.createdAt)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <div class="wiki-section-title">見出し</div>
                        <div class="wiki-section-content" style="background:#f8fafc; border:none; padding:1rem;">
                            <ul style="padding-left:1.5rem; margin:0; font-size:0.85rem; color:var(--text-muted); line-height:1.6;">
                                ${headings.length > 0 ? headings.map(h => `
                                    <li class="toc-level-${h.level}" style="cursor:pointer;" onclick="document.getElementById('${h.id}').scrollIntoView({behavior:'smooth'})">
                                        ${h.text}
                                    </li>`).join('')
                : '<li style="color:#94a3b8; list-style:none;">見出しなし</li>'}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderWikiPageList(searchTerm = '') {
        const wikis = store.getWikis().filter(w => w.projectId === this.currentProject.id || (!w.projectId && this.currentProject.id === 'prj-1'));
        const filtered = searchTerm ? wikis.filter(w => w.title.toLowerCase().includes(searchTerm.toLowerCase()) || (w.tags && w.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())))) : wikis;

        const container = document.getElementById('wiki-page-list-container');
        if (!container) return;

        container.innerHTML = filtered.map(w => `
            <div class="wiki-list-item ${w.id === this.selectedWikiId ? 'active' : ''}" onclick="window.app.selectWiki('${w.id}')">
                <div style="display:flex; justify-content:space-between;">
                    <span>${w.title}</span>
                    <span style="font-size:0.75rem; color:#94a3b8;">${formatDate(w.createdAt)}</span>
                </div>
            </div>
        `).join('');
    }

    selectWiki(id) {
        this.selectedWikiId = id;
        this.renderWiki(document.getElementById('view-container'));
    }

    filterWikiByTag(tag) {
        // Just select the first wiki with the tag for now, or filter the list?
        // User behavior "filterWikiByTag" implies filtering the list or showing a view.
        // Current impl selects the wiki.
        // Let's keep it but maybe also filter the list if we wanted to be fancy.
        // For now, keep original behavior of jumping to it.
        const wikis = store.getWikis();
        const matched = wikis.find(w => w.tags && w.tags.includes(tag));
        if (matched) this.selectWiki(matched.id);
    }

    handleWikiReactionClick(event, id, emoji) {
        // Trigger sparkle effect at click coordinates
        this.triggerSparkle(event.clientX, event.clientY);

        // Optimistically toggle UI or just let the re-render handle it?
        // Re-render is fast enough usually.
        this.toggleWikiReaction(id, emoji);
    }

    triggerSparkle(x, y) {
        const particleCount = 10;
        const colors = ['#FFD700', '#FFA500', '#00BFFF', '#FF69B4', '#32CD32']; // Sparkle colors

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('sparkle-particle');
            document.body.appendChild(particle);

            // Randomize styling
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 5 + 3; // 3px to 8px
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 40 + 20; // Distance to travel

            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.backgroundColor = color;
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;

            // Set custom properties for animation
            particle.style.setProperty('--tx', `${Math.cos(angle) * velocity}px`);
            particle.style.setProperty('--ty', `${Math.sin(angle) * velocity}px`);

            // Clean up
            setTimeout(() => particle.remove(), 800);
        }
    }

    toggleWikiReaction(id, emoji) {
        const wikis = store.getWikis();
        const wiki = wikis.find(w => w.id === id);
        if (!wiki) return;

        wiki.reactions = wiki.reactions || {};
        let users = wiki.reactions[emoji] || [];

        const userId = this.currentUser.id;
        const index = users.indexOf(userId);

        if (index === -1) {
            users.push(userId);
        } else {
            users.splice(index, 1);
        }

        wiki.reactions[emoji] = users;
        store.updateWiki(id, { reactions: wiki.reactions });

        if (index === -1 && wiki.author && wiki.author !== this.currentUser.id) {
            store.addNotification({
                userId: wiki.author,
                type: 'reaction',
                title: 'ナレッジにリアクションがつきました',
                link: { page: 'knowledge', id: id },
                message: `${store.getMemberName(this.currentUser.id)}さんがナレッジ「${wiki.title}」に「${emoji}」をつけました。`
            });
        }
        this.selectWiki(id);
    }

    renderWikiEdit(id) { // id is 'new' or wikiId
        const container = document.getElementById('view-container');
        const wikis = store.getWikis();
        // Request: Wiki author selection limited to project members
        const members = store.getMembers().filter(m => (this.currentProject.members || []).includes(m.id));
        const isNew = id === 'new';
        const wiki = isNew ? {} : wikis.find(w => w.id === id);

        // Default author to current user if new
        const currentAuthor = wiki.author || this.currentUser.id;

        container.innerHTML = `
            <!-- Page Title moved to Header -->
            <div class="form-container" style="max-width: 100%;">
                <div id="wiki-edit-form">
                    <div class="form-group"><label class="form-label">タイトル</label><input id="wiki-title" class="form-input" value="${wiki.title || ''}"></div>
                    <div class="form-group">
                         <label class="form-label">投稿者</label>
                         <select id="wiki-author" class="form-select">
                            ${members.map(m => `<option value="${m.id}" ${currentAuthor === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                         </select>
                    </div>
                    <div class="form-group"><label class="form-label">タグ (カンマ区切り)</label><input id="wiki-tags" class="form-input" value="${(wiki.tags || []).join(',')}"></div>
                    <div class="form-group">
                        <label class="form-label">内容</label>
                        <div style="margin-bottom:0.5rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                            <!-- History -->
                            <button class="filter-toggle-btn rounded-pop-btn" title="元に戻す" onclick="document.execCommand('undo', false, null)"><i class="ph ph-arrow-u-up-left"></i></button>
                            <button class="filter-toggle-btn rounded-pop-btn" title="やり直し" onclick="document.execCommand('redo', false, null)"><i class="ph ph-arrow-u-up-right"></i></button>
                            <div style="width:1px; background:#e2e8f0; margin:0 0.5rem;"></div>
                            
                            <!-- Formatting -->
                            <button class="filter-toggle-btn rounded-pop-btn" title="見出し1" onclick="document.execCommand('formatBlock', false, '<h1>')"><i class="ph ph-text-h-one"></i></button>
                            <button class="filter-toggle-btn rounded-pop-btn" title="見出し2" onclick="document.execCommand('formatBlock', false, '<h2>')"><i class="ph ph-text-h-two"></i></button>
                            <button class="filter-toggle-btn rounded-pop-btn" title="見出し3" onclick="document.execCommand('formatBlock', false, '<h3>')"><i class="ph ph-text-h-three"></i></button>
                            <button class="filter-toggle-btn rounded-pop-btn" title="標準テキストに戻す" onclick="document.execCommand('formatBlock', false, '<p>')"><i class="ph ph-text-t"></i></button>
                            
                            <div style="width:1px; background:#e2e8f0; margin:0 0.5rem;"></div>

                            <button class="filter-toggle-btn rounded-pop-btn" title="太字" onclick="document.execCommand('bold', false, null)"><i class="ph ph-text-b"></i></button>
                            <button class="filter-toggle-btn rounded-pop-btn" title="取り消し線" onclick="document.execCommand('strikeThrough', false, null)"><i class="ph ph-text-strikethrough"></i></button>
                            
                            <div style="width:1px; background:#e2e8f0; margin:0 0.5rem;"></div>

                            <button class="filter-toggle-btn rounded-pop-btn" title="テーブル挿入" onclick="window.app.insertWikiFormatTable('wiki-desc-editor')"><i class="ph ph-table"></i></button>
                            <button class="filter-toggle-btn rounded-pop-btn" title="リンク挿入" onclick="window.app.insertWikiFormatLink()"><i class="ph ph-link"></i></button>
                            <button class="filter-toggle-btn rounded-pop-btn" title="画像挿入" onclick="window.app.insertWikiFormatImage()"><i class="ph ph-image"></i></button>
                        </div>
                        <!-- ContentEditable Div pre-filled with rendered content (assuming legacy content is compatible or just text) -->
                        <div id="wiki-desc-editor" class="form-textarea" contenteditable="true" style="overflow-y:auto; min-height:400px;">
                            ${wiki.content || ''}
                        </div>
                    </div>
                </div>
                <div id="wiki-preview-area" style="display:none; background:white; border:1px solid #e2e8f0; padding:2rem; border-radius:8px; min-height:400px;">
                    <!-- Preview content goes here -->
                </div>

                <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top: 1rem;">
                    <button class="btn btn-secondary" onclick="window.app.navigate('knowledge')">キャンセル</button>
                    <!-- Preview button removed -->
                    <button class="btn btn-primary" id="btn-save-wiki">保存</button>
                </div>
            </div>
        `;

        this.unsavedChanges = false;
        const markUnsaved = () => { this.unsavedChanges = true; };

        ['wiki-title', 'wiki-tags', 'wiki-author'].forEach(id => {
            document.getElementById(id).addEventListener('input', markUnsaved);
            document.getElementById(id).addEventListener('change', markUnsaved);
        });
        document.getElementById('wiki-desc-editor').addEventListener('input', markUnsaved);


        document.getElementById('btn-save-wiki').addEventListener('click', () => {
            const title = document.getElementById('wiki-title').value;
            const content = document.getElementById('wiki-desc-editor').innerHTML;
            const author = document.getElementById('wiki-author').value;
            const tagsStr = document.getElementById('wiki-tags').value;
            const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);

            if (!title) return alert('タイトルは必須です');

            if (isNew) {
                const newId = `WK-${Date.now()}`;
                store.addWiki({ id: newId, title, content, tags, author, createdAt: new Date().toISOString(), projectId: this.currentProject.id });
                this.selectedWikiId = newId;
            } else {
                store.updateWiki(id, { content, tags, title, author });
            }
            this.unsavedChanges = false;
            this.renderWiki(document.getElementById('view-container'));
        });

        // Image Paste Handler
        const wikiContent = document.getElementById('wiki-desc-editor');
        if (wikiContent) {
            wikiContent.addEventListener('paste', (e) => {
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (let index in items) {
                    const item = items[index];
                    if (item.kind === 'file') {
                        const blob = item.getAsFile();
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const base64 = event.target.result;
                            document.execCommand('insertImage', false, base64);
                        };
                        reader.readAsDataURL(blob);
                        e.preventDefault(); // Prevent default paste if it was an image
                    }
                }
            });
        }

        this.setupWikiTableInteractions('wiki-desc-editor');
    }

    toggleWikiPreview() {
        const form = document.getElementById('wiki-edit-form');
        const preview = document.getElementById('wiki-preview-area');
        const previewButton = document.querySelector('.form-container > div:last-child > button:nth-child(2)'); // The "プレビュー" button

        if (form.style.display === 'none') {
            form.style.display = 'block';
            preview.style.display = 'none';
            previewButton.textContent = 'プレビュー';
        } else {
            const content = document.getElementById('wiki-content').value;

            const renderContent = (text) => {
                if (!text) return '';
                const lines = text.split('\n');
                let inTable = false;
                let html = '';

                lines.forEach(line => {
                    if (line.trim().startsWith('|')) {
                        if (!inTable) { html += '<table class="wiki-table"><tbody>'; inTable = true; }
                        const cells = line.split('|').filter((c, i, arr) => i !== 0 && i !== arr.length - 1);
                        if (cells.some(c => c.trim().match(/^-+$/))) return;
                        html += `<tr>${cells.map(c => `<td>${c.trim()}</td>`).join('')}</tr>`;
                    } else {
                        if (inTable) { html += '</tbody></table>'; inTable = false; }

                        let lineHtml = line
                            .replace(/^# (.*)/, '<h1 class="wiki-h1">$1</h1>')
                            .replace(/^## (.*)/, '<h2 class="wiki-h2">$1</h2>')
                            .replace(/^### (.*)/, '<h3 class="wiki-h3">$1</h3>')
                            .replace(/\*\*(.*)\*\*/, '<b>$1</b>')
                            .replace(/<span style="color:(.*?)">(.*?)<\/span>/g, '<span style="color:$1">$2</span>')
                            .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%;">')
                            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

                        if (!lineHtml.startsWith('<h') && lineHtml.trim() !== '') lineHtml += '<br>';
                        html += lineHtml;
                    }
                });
                if (inTable) html += '</tbody></table>';
                return html;
            };

            preview.innerHTML = `<style>.wiki-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; } .wiki-table td, .wiki-table th { border: 1px solid #cbd5e1; padding: 8px; }</style>` + renderContent(content);

            form.style.display = 'none';
            preview.style.display = 'block';
            previewButton.textContent = '編集に戻る';
        }
    }

    insertWikiFormat(prefix, suffix = '', targetId = 'wiki-content') {
        const textarea = document.getElementById(targetId);
        if (!textarea && targetId === 'issue-desc-editor') {
            // Div contenteditable special case
            document.execCommand('insertText', false, prefix + suffix);
            return;
        }
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end, text.length);
        textarea.value = before + prefix + (selection || '') + suffix + after;
        textarea.focus();
        // Adjust cursor position
        if (!selection) {
            textarea.selectionEnd = start + prefix.length;
        }
    }
    insertWikiFormatTable(targetId = 'wiki-content') {
        const tableTemplate = `\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n`;
        this.insertWikiFormat(tableTemplate, '', targetId);
    }
    insertWikiFormatLink() {
        const url = prompt('URLを入力してください:');
        if (!url) return;
        const text = prompt('リンクのテキストを入力してください:', 'リンク');
        if (!text) return;
        this.insertWikiFormat(`[${text}](${url})`);
    }
    insertWikiFormatImage() {
        this.insertWikiFormat('![', '](url)');
    }
    insertWikiColor() {
        const color = prompt('カラーコードを入力してください (e.g., #ff0000 or red):', 'red');
        if (color) {
            this.insertWikiFormat(`<span style="color:${color}">`, '</span>');
        }
    }

    // --- Members ---
    renderMembers(container) {
        if (this.currentUser.role !== 'admin') {
            container.innerHTML = `<div>管理者権限が必要です。</div>`;
            return;
        }
        const members = store.getMembers();

        container.innerHTML = `
            <style>
                .floating-table-container {
                    background-color: white; 
                    padding: 0;
                    border-radius: 20px;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                    overflow: hidden;
                    margin: 1rem 0;
                }
                .floating-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .floating-table th {
                    background-color: #f8fafc;
                    color: #475569;
                    font-weight: 700;
                    padding: 0.8rem 1.5rem;
                    text-align: left;
                    border-bottom: 2px solid #e2e8f0;
                    font-size: 0.85rem;
                }
                
                .floating-row td {
                    background-color: white;
                    padding: 0.8rem 1.5rem; /* Reduced height */
                    color: #334155;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                    transition: background 0.1s;
                }
                .floating-row:last-child td { border-bottom: none; }
                .floating-row:hover td { background-color: #f8fafc; }
                
                .member-avatar { display:flex; align-items:center; gap:0.8rem; font-weight:600; }
                .role-badge { 
                    padding:0.2rem 0.8rem; border-radius:12px; font-size:0.75rem; font-weight:700; display:inline-block;
                }
                .role-admin { background:#dbeafe; color:#1e40af; }
                .role-user { background:#f1f5f9; color:#64748b; }
                
                .action-btn {
                    width: 32px; height: 32px; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; border: none; outline: none;
                }
                .action-btn.edit { background: #e0e7ff; color: #4338ca; }
                .action-btn.edit:hover { background: #c7d2fe; color: #3730a3; }
                
                .action-btn.delete { background: #fee2e2; color: #ef4444; }
                .action-btn.delete:hover { background: #fecaca; color: #dc2626; }
            </style>

            <div class="page-header" style="justify-content: flex-end;">
                <button class="btn btn-primary" style="border-radius: 50px; padding: 0.8rem 2rem; font-weight:bold; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);" onclick="window.app.openMemberModal('new')"><i class="ph ph-plus" style="margin-right:0.5rem;"></i> 新規登録</button>
            </div>
            
            <div class="floating-table-container">
                <table class="floating-table">
                    <thead>
                        <tr>
                            <th style="width:10%;">ID</th>
                            <th style="width:25%;">名前</th>
                            <th style="width:20%;">部署</th>
                            <th style="width:15%;">権限</th>
                            <th style="text-align:right;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${members.map(m => `
                            <tr class="floating-row" style="height: auto;">
                                <td style="color:#64748b; font-weight:600; font-size:0.8rem; padding:0.5rem 1rem;">${m.id}</td>
                                <td style="padding:0.5rem 1rem;">
                                    <div style="display:flex; align-items:center; gap:0.6rem;">
                                        ${this.renderAvatar(m.id, 32)}
                                        <span style="font-weight:600; font-size:0.9rem; color:#1e293b;">${m.name}</span>
                                    </div>
                                </td>
                                <td style="padding:0.5rem 1rem;"><span style="background:#f1f5f9; padding:0.25rem 0.8rem; border-radius:12px; font-size:0.8rem; color:#475569;">${m.dept || '-'}</span></td>
                                <td style="padding:0.5rem 1rem;">
                                    ${m.role === 'admin'
                ? `<span style="background:#dbeafe; color:#1e40af; padding:0.4rem 1rem; border-radius:20px; font-weight:700; font-size:0.85rem;"><i class="ph ph-shield-check"></i> 管理者</span>`
                : `<span style="background:#f1f5f9; color:#64748b; padding:0.4rem 1rem; border-radius:20px; font-size:0.85rem;">ユーザー</span>`
            }
                                </td>
                                <td style="padding:0.5rem 1rem;">
                                    <div style="display:flex; gap:8px; justify-content:flex-end;">
                                        <button class="action-btn edit" onclick="window.app.openMemberModal('${m.id}')"><i class="ph ph-pencil-simple"></i></button>
                                        <button class="action-btn delete" onclick="window.app.deleteMember('${m.id}')"><i class="ph ph-trash"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    deleteMember(id) {
        if (!confirm('本当にこのメンバーを削除しますか？\n(注意: この操作は元に戻せません)')) return;

        // Remove from store
        const members = store.getMembers().filter(m => m.id !== id);
        store.data.members = members;
        store.save(); // Direct save as store doesn't have deleteMember method exposed simply

        // Also remove from current project if necessary? Maybe not strictly required by task, but safer.
        // For now, just refresh view.
        this.renderMembers(document.getElementById('view-container'));
    }

    openMemberModal(id) {
        const isNew = id === 'new';
        const member = isNew ? {} : store.getMembers().find(m => m.id === id);

        // Remove existing if any
        if (document.getElementById('member-modal')) document.getElementById('member-modal').remove();

        const modalHtml = `
            <div id="member-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; display:flex; align-items:center; justify-content:center; animation: fadeIn 0.1s;">
                <div class="pop-card" style="box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); background: white; padding: 3rem 2rem; border-radius: 24px; border: 1px solid #f1f5f9; width: 600px; max-width: 90%; animation: slideUp 0.2s;">
                    <style>
                        .pop-input { 
                            background-color: #f9fafb; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.8rem 1rem; width: 100%; font-size: 1rem; transition: all 0.2s; 
                        }
                        .pop-input:disabled { background-color: #f3f4f6; color: #9ca3af; }
                        .pop-input:focus { border-color: #a5b4fc; box-shadow: 0 0 0 4px rgba(165, 180, 252, 0.2); outline: none; background: white; }
                        .pop-label { font-weight: 700; color: #474a4d; display: block; margin-bottom: 0.5rem; font-size: 0.95rem; }
                        
                        .pop-btn-save {
                            border-radius: 50px; padding: 0.8rem 3rem; font-weight: bold; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2); transition: transform 0.2s; border: none; color: white; background: var(--primary);
                        }
                        .pop-btn-save:hover { transform: translateY(-2px); box-shadow: 0 15px 20px -3px rgba(37, 99, 235, 0.3); }
                        
                        .pop-btn-cancel {
                            background: transparent; border: 2px solid #cbd5e1; border-radius: 50px; padding: 0.8rem 2rem; color: #64748b; font-weight: bold; transition: all 0.2s;
                        }
                        .pop-btn-cancel:hover { background: #f1f5f9; color: #334155; border-color: #94a3b8; }
                    </style>
                    
                    <div style="font-size:1.5rem; font-weight:700; margin-bottom:2rem; text-align:center; color:#1e293b;">${isNew ? 'メンバー新規登録' : 'メンバー情報を編集'}</div>
                    
                    <div style="display:flex; gap: 2rem; margin-bottom:1.5rem;">
                        <div style="flex:1;">
                            <label class="pop-label">ID (変更不可)</label>
                            <input id="mem-modal-id" class="pop-input" value="${member.id || ''}" ${!isNew ? 'disabled' : ''} placeholder="例: user101">
                        </div>
                        <div style="flex:1;">
                            <label class="pop-label">パスワード</label>
                            <input type="password" id="mem-modal-pass" class="pop-input" value="${member.password || ''}" placeholder="••••••••">
                        </div>
                    </div>

                    <div style="display:flex; gap: 2rem; margin-bottom:1.5rem;">
                         <div style="flex:1;">
                            <label class="pop-label">名前</label>
                            <input id="mem-modal-name" class="pop-input" value="${member.name || ''}" placeholder="山田 太郎">
                        </div>
                        <div style="flex:1;">
                            <label class="pop-label">部署名</label>
                            <select id="mem-modal-dept" class="pop-input">
                                <option value="">未設定</option>
                                ${(store.getConfig().departments || []).map(d => `<option value="${d}" ${member.dept === d ? 'selected' : ''}>${d}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                     <div style="margin-bottom:3rem;">
                        <label class="pop-label">権限</label>
                        <select id="mem-modal-role" class="pop-input">
                            <option value="user" ${member.role == 'user' ? 'selected' : ''}>ユーザー</option>
                            <option value="admin" ${member.role == 'admin' ? 'selected' : ''}>管理者</option>
                        </select>
                    </div>

                    <div style="display:flex; justify-content:center; gap:1.5rem;">
                        <button class="btn pop-btn-cancel" onclick="document.getElementById('member-modal').remove()">キャンセル</button>
                        <button class="btn pop-btn-save" onclick="window.app._saveMemberFromModal(${isNew})">保存する</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    _saveMemberFromModal(isNew) {
        const mid = document.getElementById('mem-modal-id').value;
        const data = {
            password: document.getElementById('mem-modal-pass').value,
            name: document.getElementById('mem-modal-name').value,
            dept: document.getElementById('mem-modal-dept').value,
            role: document.getElementById('mem-modal-role').value
        };

        if (isNew) {
            if (!mid) return alert('IDは必須です');
            if (store.getMemberName(mid) !== mid) return alert('このIDは既に使用されています');
            store.addMember({ id: mid, ...data });
        } else {
            store.updateMember(mid, data);
        }

        document.getElementById('member-modal').remove();
        this.renderMembers(document.getElementById('view-container'));
    }

    switchSettingsTab(tabName, btn) {
        // Update buttons
        document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');

        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // Show target tab
        const target = document.getElementById('tab-' + tabName);
        if (target) target.classList.add('active');
    }

    renderProjectSettings(container, params = {}) {
        const isAdmin = this.currentUser.role === 'admin';
        const managedProjects = store.getProjects().filter(p => p.managerId === this.currentUser.id);
        const isProjectManager = managedProjects.length > 0;

        if (!isAdmin && !isProjectManager) {
            return this.navigate('dashboard');
        }

        const projectId = params.projectId;
        const mode = params.mode || (projectId ? 'edit' : 'list');

        if (mode === 'list') {
            let projects = store.getProjects();


            // Filter: Admin sees all. PM sees only managed projects.
            if (!isAdmin) {
                projects = projects.filter(p => p.managerId === this.currentUser.id);
            }

            container.innerHTML = `
                <!-- Title removed -->
                <div class="cool-project-grid">
                    ${projects.map(p => `
                        <div class="cool-project-card" 
                             onclick="window.app.navigate('project-settings', {projectId: '${p.id}', mode: 'edit'})">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                <div class="cool-icon-box">
                                    <i class="ph ${p.icon || 'ph-folder'}"></i>
                                </div>
                                <div style="font-size:1.2rem; color:#cbd5e1; transition:color 0.2s;" class="chevron-icon">
                                    <i class="ph ph-caret-right"></i>
                                </div>
                            </div>
                            
                            <div>
                                <div class="cool-project-title">${p.name}</div>
                                <div class="cool-project-meta">
                                    <i class="ph ph-users"></i> ${(p.members || []).length}名のメンバー
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    
                    ${isAdmin ? `
                    <div class="cool-project-card new-project-card" 
                         onclick="window.app.openCreateProjectModal()">
                        <div style="font-size:2rem; margin-bottom:0.25rem;"><i class="ph ph-plus"></i></div>
                        <div style="font-weight:700; font-size:1rem;">新規作成</div>
                    </div>
                    ` : ''}
                </div>
                <style>
                    .cool-project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; padding-bottom: 3rem; }
                    .cool-project-card { 
                        position: relative; 
                        border-radius: 16px; 
                        padding: 1.5rem; 
                        background: white; 
                        border: 1px solid #eaecf0; 
                        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05); 
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
                        cursor: pointer; 
                        display: flex; 
                        flex-direction: column; 
                        justify-content: space-between; 
                        height: 160px; /* Fixed smaller height for sleek look */
                    }
                    .cool-project-card:hover { 
                        transform: translateY(-4px); 
                        box-shadow: 0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03); 
                        border-color: #d0d5dd; 
                        z-index: 10;
                    }
                    .cool-project-card:hover .chevron-icon { color: var(--primary) !important; }
                    .cool-project-card:hover .cool-icon-box { background: #eff6ff; color: var(--primary); border-color: #bfdbfe; }
                    
                    .cool-icon-box { 
                        width: 48px; height: 48px; 
                        background: #f8fafc; 
                        border-radius: 12px; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        font-size: 1.5rem; 
                        color: #64748b; 
                        border: 1px solid #f1f5f9;
                        transition: all 0.2s;
                    }
                    .cool-project-title { font-weight: 700; font-size: 1.1rem; color: #1e293b; margin-bottom: 0.5rem; line-height: 1.3; }
                    .cool-project-meta { font-size: 0.85rem; color: #64748b; display: flex; align-items: center; gap: 0.4rem; }
                    
                    .new-project-card { 
                        border: 2px dashed #e2e8f0; 
                        background: #fdfdfd; 
                        color: #94a3b8; 
                        justify-content: center; 
                        align-items: center; 
                        gap: 0.5rem; 
                        box-shadow: none;
                    }
                    .new-project-card:hover { 
                        border-color: #94a3b8; 
                        color: #64748b; 
                        background: #f8fafc; 
                        transform: translateY(-2px);
                        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                    }
                </style>
            `;
            return;
        }



        // Edit Mode
        const project = store.getProjects().find(p => p.id === projectId);
        if (!project) return this.navigate('project-settings'); // Fallback to list

        // Access Control: Manager can only edit projects they are part of
        if (this.currentUser.role !== 'admin' && !(project.members || []).includes(this.currentUser.id)) {
            alert('権限がありません。');
            return this.navigate('project-settings');
        }

        const members = store.getMembers();
        const projectMembers = project.members || [];
        const departments = store.getConfig().departments || [];



        // Permission Check

        const isManager = project.managerId === this.currentUser.id;

        if (!isAdmin && !isManager) {
            alert('権限がありません。');
            return this.navigate('project-settings');
        }

        container.innerHTML = `
            <!-- Title removed -->
            <style>
                .settings-layout { display: flex; flex-direction: column; gap: 1rem; min-height: 500px; }
                .settings-sidebar { width: 100%; padding-bottom: 0.5rem; margin-bottom: 1rem; }
                
                .settings-nav-container {
                    display: inline-flex;
                    background: white;
                    padding: 6px;
                    border-radius: 50px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }

                .settings-nav-item { 
                    padding: 0.6rem 1.2rem; 
                    background: transparent; 
                    color: #64748b;
                    border: none; 
                    font-weight: 600; 
                    cursor: pointer; 
                    transition: all 0.2s; 
                    border-radius: 50px;
                    margin: 0 2px;
                    font-size: 0.9rem;
                }
                .settings-nav-item:hover { background: #f1f5f9; color: #334155; }
                .settings-nav-item.active { 
                    background: #0284c7; 
                    color: white; 
                    box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);
                }
                
                .settings-content-area { flex: 1; margin: 0; background: white; padding: 2rem; border-radius: 24px; box-shadow: var(--shadow-sm); border: 1px solid #e2e8f0; }
                
                .tab-content { display: none; animation: fadeIn 0.3s; }
                .tab-content.active { display: block; }
                
                .pop-status-row {
                    display: flex; align-items: center; gap: 1rem; background: white; padding: 0.8rem 1.2rem; border-radius: 20px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); margin-bottom: 0.8rem;
                }
                input[type="color"].round-color-input {
                    -webkit-appearance: none; border: none; width: 40px; height: 40px; padding: 0; margin: 0; background: none; cursor: pointer;
                }
                input[type="color"].round-color-input::-webkit-color-swatch-wrapper { padding: 0; }
                input[type="color"].round-color-input::-webkit-color-swatch { border: 2px solid rgba(0,0,0,0.1); border-radius: 50%; }
            </style>
            
            <div style="width: 95%; margin: 0 auto; padding: 2rem;">
                <div class="settings-layout">
                    <!-- SIDEBAR -->
                    <!-- TOP TABS & ACTIONS Combined -->
                    <div class="settings-sidebar" style="border:none; margin-bottom: 2rem;">
                        <div style="display:flex; align-items:center; width:100%; gap:1.5rem;">
                            
                            <!-- Pill Container -->
                            <div class="settings-nav-container">
                                <button class="settings-nav-item active" onclick="window.app.switchSettingsTab('basic', this)">基本設定</button>
                                <button class="settings-nav-item" onclick="window.app.switchSettingsTab('members', this)">メンバー管理</button>
                                <button class="settings-nav-item" onclick="window.app.switchSettingsTab('config', this)">ステータス・カテゴリ設定</button>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div style="display:flex; gap:0.5rem; margin-left: 0;">
                                <button class="btn btn-secondary" style="background: white; border: none; color: #1e293b; font-weight: 700; border-radius: 20px;" onclick="window.app.navigate('project-settings')">一覧に戻る</button>
                                <button class="btn btn-primary" id="btn-save-prj-settings" style="background: #0f172a; border: none; font-weight: 700; border-radius: 20px;">設定を保存</button>
                            </div>
                        </div>
                    </div>

                    <!-- CONTENT Area -->
                    <div class="settings-content-area">
                        <!-- TAB 1: BASIC -->
                        <div id="tab-basic" class="tab-content active">
                            <h3 style="margin-bottom:1.5rem; font-size:1.2rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">基本設定</h3>
                            <div class="form-group"><label class="form-label pop-label">プロジェクト名</label><input id="prj-edit-name" class="form-input pop-input" value="${project.name}"></div>
                            
                            <div class="form-group">
                                <label class="form-label pop-label">アイコン</label>
                                <div style="display:flex; align-items:center; gap:1rem;">
                                    <div id="prj-icon-preview" style="font-size:3rem; color:var(--primary); background:#eff6ff; width:64px; height:64px; border-radius:20px; display:flex; align-items:center; justify-content:center;"><i class="ph ${project.icon || 'ph-folder'}"></i></div>
                                    <input type="hidden" id="prj-edit-icon" value="${project.icon || 'ph-folder'}">
                                    <button class="btn btn-sm btn-secondary" style="border-radius:20px;" onclick="window.app.openProjectIconModal()">変更する</button>
                                </div>
                            </div>
                        </div>

                        <!-- TAB 2: MEMBERS -->
                        <div id="tab-members" class="tab-content">
                             <h3 style="margin-bottom:1.5rem; font-size:1.2rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">メンバー管理</h3>
                             <div class="form-group" style="height: 500px; display: flex; flex-direction: column;">
                                <label class="form-label pop-label">参加メンバー設定</label>
                                <div style="margin-bottom:0.5rem; display:flex; gap:0.5rem; padding:0.5rem; background:#f8fafc; border-radius:12px;">
                                     <input type="text" id="member-search" class="form-input pop-input" placeholder="メンバーを検索..." style="font-size:0.9rem;" onkeyup="window.app.filterProjectMembers(this.value)">
                                </div>
                                <div id="prj-member-list" style="flex: 1; overflow-y: auto; border: 1px solid #f1f5f9; border-radius: 16px; padding: 1rem;">
                                    <table style="width:100%; border-collapse:separate; border-spacing:0 8px;">
                                        <tbody>
                                        ${members.map(m => `
                                            <tr class="prj-member-item" style="background:white;">
                                                <td style="padding:0.5rem; width:40px;"><input type="checkbox" class="prj-edit-member-cb" value="${m.id}" ${projectMembers.includes(m.id) ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;"></td>
                                                <td style="padding:0.5rem; width:80px; text-align:center;">
                                                    <label style="display:flex; flex-direction:column; align-items:center; font-size:0.7rem; cursor:pointer;">
                                                        <input type="radio" name="prj-edit-manager" value="${m.id}" ${project.managerId === m.id ? 'checked' : ''} ${isAdmin ? '' : 'disabled'} style="margin-bottom:2px;">
                                                        管理者
                                                    </label>
                                                </td>
                                                <td style="padding:0.5rem;">
                                                    <div style="display:flex; align-items:center; gap:0.8rem;">
                                                        ${this.renderAvatar(m.id, 32)} 
                                                        <div>
                                                            <div style="font-weight:700; font-size:0.95rem;">${m.name}</div>
                                                            <div style="font-size:0.8rem; color:var(--text-muted);">${m.role === 'admin' ? 'システム管理者' : 'ユーザー'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- TAB 3: CONFIG -->
                        <div id="tab-config" class="tab-content">
                            <h3 style="margin-bottom:1.5rem; font-size:1.2rem; border-bottom:1px solid #e2e8f0; padding-bottom:1rem;">ステータス・カテゴリ設定</h3>
                            <div class="form-group">
                                <label class="form-label pop-label">カテゴリ設定</label>
                                <div id="prj-category-list" style="margin-bottom:1rem; display:flex; flex-wrap:wrap; gap:0.8rem;">
                                    <!-- Categories injected here -->
                                </div>
                                <div style="display:flex; gap:0.5rem;">
                                    <input id="prj-new-category" class="form-input pop-input" placeholder="新しいカテゴリ名" style="max-width:250px;">
                                    <button class="btn btn-secondary" style="border-radius:20px;" id="btn-add-category"><i class="ph ph-plus"></i> 追加</button>
                                </div>
                            </div>
                            
                            <div class="form-group" style="margin-top:2.5rem; border-top:2px dashed #f1f5f9; padding-top:2rem;">
                                <label class="form-label pop-label">状態 (ステータス) 設定</label>
                                <div id="prj-status-list" style="display:flex; flex-direction:column; gap:0.5rem;">
                                     <!-- Rows injected by JS via div structure now -->
                                </div>
                                <button class="btn btn-secondary" style="margin-top:1rem; border-radius:20px; width:100%;" id="btn-add-status-row"><i class="ph ph-plus"></i> 状態を追加する</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Helper: Category Management
        const categoryContainer = document.getElementById('prj-category-list');
        // Request: "Default items for category settings should be none"
        // So we only use project.categories if it exists, otherwise empty array.
        let currentCategories = [...(project.categories || [])];

        const renderCategories = () => {
            if (!categoryContainer) return;
            categoryContainer.innerHTML = currentCategories.map((c, idx) => `
                <div class="pop-mini-card">
                    <span>${c}</span>
                    <button id="cat-remover-${idx}" onclick="window.app._removePrjCategory(${idx})" style="background:white; border:none; width:24px; height:24px; border-radius:50%; color:#ef4444; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.05); font-size:0.8rem;"><i class="ph ph-x"></i></button>
                </div>
            `).join('');
        };

        // Attach to window.app for onclick access (temporary hack or cleaner binding needed)
        this._removePrjCategory = (idx) => {
            currentCategories.splice(idx, 1);
            renderCategories();
        };

        if (categoryContainer) {
            renderCategories();
            document.getElementById('btn-add-category').addEventListener('click', () => {
                const input = document.getElementById('prj-new-category');
                const val = input.value.trim();
                if (val && !currentCategories.includes(val)) {
                    currentCategories.push(val);
                    input.value = '';
                    renderCategories();
                } else if (currentCategories.includes(val)) {
                    alert('既に存在するカテゴリです');
                }
            });
        }


        // Helper: Status Management
        if (isAdmin || isManager) {
            const statusContainer = document.getElementById('prj-status-list');
            const initialStatuses = project.statuses || JSON.parse(JSON.stringify(store.getConfig().statuses));

            const addRow = (s = { id: `st-${Date.now()}`, label: '新規', color: '#e2e8f0', textColor: '#000000' }) => {
                const div = document.createElement('div');
                div.className = 'pop-status-row status-row';
                div.innerHTML = `
                    <input type="hidden" class="status-id" value="${s.id}">
                    <div style="flex:1;">
                        <input type="text" class="form-input pop-input status-label" value="${s.label}" style="width:100%;">
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center; gap:0.25rem;">
                        <span style="font-size:0.75rem; color:#64748b;">背景</span>
                        <input type="color" class="status-color round-color-input" value="${s.color}">
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center; gap:0.25rem;">
                         <span style="font-size:0.75rem; color:#64748b;">文字</span>
                        <input type="color" class="status-text-color round-color-input" value="${s.textColor || '#000000'}">
                    </div>
                    <div>
                        <button class="btn btn-sm btn-danger status-delete-btn" style="border-radius:50%; width:36px; height:36px; padding:0; display:flex; align-items:center; justify-content:center;"><i class="ph ph-trash"></i></button>
                    </div>
                `;
                div.querySelector('.status-delete-btn').addEventListener('click', () => div.remove());
                statusContainer.appendChild(div);
            };

            initialStatuses.forEach(s => addRow(s));

            document.getElementById('btn-add-status-row').addEventListener('click', () => {
                addRow({ id: `st-${Date.now()}`, label: '新規', color: '#e2e8f0', textColor: '#000000' });
            });
        }



        document.getElementById('btn-save-prj-settings').addEventListener('click', () => {
            const updates = {};
            const isManager = project.managerId === this.currentUser.id;

            if (isAdmin || isManager) {
                const newName = document.getElementById('prj-edit-name').value;
                if (!newName) return alert('プロジェクト名は必須です');
                updates.name = newName;
                updates.icon = document.getElementById('prj-edit-icon').value; // Save icon

                // Only Admin can change Manager
                if (isAdmin) {
                    const managerRadio = document.querySelector('input[name="prj-edit-manager"]:checked');
                    if (managerRadio) updates.managerId = managerRadio.value;
                }
            }
            if (isAdmin || isManager) {
                const memberCbs = document.querySelectorAll('.prj-edit-member-cb:checked');
                const newMembers = Array.from(memberCbs).map(cb => cb.value);
                if (newMembers.length === 0) return alert('メンバーを選択してください');
                const targetManagerId = updates.managerId || project.managerId;
                if (!newMembers.includes(targetManagerId)) return alert('プロジェクト管理者は参加メンバーに含まれている必要があります。');
                updates.members = newMembers;

                // Config Updates
                updates.categories = currentCategories; // Used from closure

                const statusRows = document.querySelectorAll('#prj-status-list .status-row');
                const newStatuses = [];
                statusRows.forEach(tr => {
                    newStatuses.push({
                        id: tr.querySelector('.status-id').value,
                        label: tr.querySelector('.status-label').value,
                        color: tr.querySelector('.status-color').value,
                        textColor: tr.querySelector('.status-text-color').value
                    });
                });
                if (newStatuses.length === 0) return alert('状態は少なくとも1つ必要です');
                updates.statuses = newStatuses;
            }
            store.updateProject(project.id, updates);
            if (updates.name && this.currentProject && this.currentProject.id === project.id) {
                this.currentProject = store.getProjects().find(p => p.id === project.id);
                const headerSwitcher = document.querySelector('#header-dept-name span');
                if (headerSwitcher) headerSwitcher.textContent = updates.name;
            } else if (!updates.name && this.currentProject && this.currentProject.id === project.id) {
                this.currentProject = store.getProjects().find(p => p.id === project.id);
            }
            alert('プロジェクト設定を保存しました');
            this.navigate('project-settings');
        });
    }

    // Helper: Project Icon Picker
    openProjectIconModal() {
        const icons = [
            'ph-folder', 'ph-briefcase', 'ph-kanban', 'ph-chart-bar', 'ph-list-checks',
            'ph-notebook', 'ph-article', 'ph-chat-circle-text', 'ph-users', 'ph-buildings',
            'ph-house', 'ph-globe', 'ph-cloud', 'ph-lightning', 'ph-star',
            'ph-heart', 'ph-flag', 'ph-trophy', 'ph-medal', 'ph-crown',
            'ph-target', 'ph-rocket', 'ph-airplane', 'ph-car', 'ph-bicycle',
            'ph-shopping-cart', 'ph-coffee', 'ph-pizza', 'ph-hamburger', 'ph-wine',
            'ph-pencil', 'ph-pen-nib', 'ph-paint-brush', 'ph-palette', 'ph-camera'
        ];

        const modal = document.createElement('div');
        modal.id = 'icon-picker-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:10000;';

        window.app._tempSelectedIcon = null;

        modal.innerHTML = `
            <div class="card" style="width:500px; max-width:90%; background:white; padding:2rem; max-height:80vh; display:flex; flex-direction:column;">
                <h3 style="margin-bottom:1.5rem;">プロジェクトアイコンを選択</h3>
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:1rem; margin-bottom:2rem; overflow-y:auto; padding:0.5rem;">
                    ${icons.map(icon => `
                        <button class="icon-option-btn" onclick="window.app._selectProjectIcon(this, '${icon}')" style="font-size:1.8rem; background:none; border:2px solid transparent; border-radius:8px; cursor:pointer; padding:0.5rem; display:flex; align-items:center; justify-content:center; color:var(--text-main);">
                            <i class="ph ${icon}"></i>
                        </button>
                    `).join('')}
                </div>
                <div style="display:flex; justify-content:flex-end; gap:1rem;">
                    <button class="btn btn-secondary" onclick="document.getElementById('icon-picker-modal').remove()">キャンセル</button>
                    <button class="btn btn-primary" onclick="window.app._confirmProjectIcon()">決定</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    _selectProjectIcon(btn, icon) {
        document.querySelectorAll('.icon-option-btn').forEach(b => {
            b.style.borderColor = 'transparent';
            b.style.background = 'none';
        });
        btn.style.borderColor = 'var(--primary)';
        btn.style.background = 'var(--primary-light)';
        window.app._tempSelectedIcon = icon;
    }

    _confirmProjectIcon() {
        const icon = window.app._tempSelectedIcon;
        if (icon) {
            if (this.createProjectState) {
                this.createProjectState.data.icon = icon;
                const preview = document.getElementById('cp-icon-preview');
                if (preview) preview.innerHTML = `<i class="ph ${icon}"></i>`;
            } else {
                const input = document.getElementById('prj-edit-icon');
                const preview = document.getElementById('prj-icon-preview');
                if (input && preview) {
                    input.value = icon;
                    preview.innerHTML = `<i class="ph ${icon}"></i>`;
                }
            }
        }
        document.getElementById('icon-picker-modal').remove();
    }
    /*
    document.getElementById('btn-save-prj-settings').addEventListener('click', () => {
        const newName = document.getElementById('prj-edit-name').value;
        const memberCbs = document.querySelectorAll('.prj-edit-member-cb:checked');
        const newMembers = Array.from(memberCbs).map(cb => cb.value);
     
        const catStr = document.getElementById('prj-edit-categories').value;
        const statusStr = document.getElementById('prj-edit-statuses').value;
     
        let newCategories = null;
        let newStatuses = null;
     
        if (catStr.trim()) {
            newCategories = catStr.split(',').map(s => s.trim()).filter(Boolean);
        }
     
        try {
            if (statusStr.trim()) {
                newStatuses = JSON.parse(statusStr);
            }
        } catch (e) {
            return alert('ステータスのJSON形式が正しくありません');
        }
     
        if (!newName) return alert('プロジェクト名は必須です');
        if (newMembers.length === 0) return alert('メンバーを選択してください');
     
        store.updateProject(project.id, {
            name: newName,
            members: newMembers,
            categories: newCategories || undefined,
            statuses: newStatuses || undefined
        });
     
        // If we are editing the CURRENT project, update current reference
        if (this.currentProject && this.currentProject.id === project.id) {
            this.currentProject = store.getProjects().find(p => p.id === project.id);
            // Update header partially if we can, or just re-render
            const headerSwitcher = document.querySelector('#header-dept-name span');
            if (headerSwitcher) headerSwitcher.textContent = newName;
        }
     
        alert('プロジェクト設定を保存しました');
    */
    /* Old Save Logic Removed/Commented */

    filterProjectMembers(query) {
        const term = query.toLowerCase();
        document.querySelectorAll('.prj-member-item').forEach(el => {
            const text = el.textContent.toLowerCase();
            el.style.display = text.includes(term) ? 'flex' : 'none';
        });
    }

    // --- Settings ---
    renderSettings(container) {
        const config = store.getConfig();
        const isAdmin = this.currentUser.role === 'admin';
        const user = store.getMembers().find(m => m.id === this.currentUser.id);

        const renderSection = (title, items, type) => `
            <div class="card" style="margin-bottom:2rem;">
                <div class="card-header">
                    <span>${title}</span>
                    <button class="btn btn-sm btn-primary" onclick="window.app.addConfigItem('${type}')"><i class="ph ph-plus"></i> 追加</button>
                </div>
                <ul style="list-style:none;">
                    ${items.map((item, idx) => {
            const label = typeof item === 'string' ? item : item.label;
            const extra = type === 'statuses' ? `<span style="display:inline-block; width:12px; height:12px; background:${item.color}; border-radius:50%; margin-right:0.5rem;"></span>` : '';
            return `
                        <li style="padding:0.5rem; border-bottom:1px solid #eee; display:flex; align-items:center; justify-content:space-between;">
                            <div style="display:flex; align-items:center;">${extra}${label}</div>
                            <div style="display:flex; gap:0.5rem;">
                                <button class="btn btn-sm btn-secondary" onclick="window.app.editConfigItem('${type}', ${idx})"><i class="ph ph-pencil-simple"></i></button>
                                <button class="btn btn-sm btn-danger" onclick="window.app.removeConfigItem('${type}', ${idx})"><i class="ph ph-trash"></i></button>
                            </div>
                        </li>`;
        }).join('')}
                </ul>
            </div>
        `;

        container.innerHTML = `
            <!-- Title removed -->
            <div style="max-width:800px;">
                <!-- Profile Settings -->
                <div class="card" style="margin-bottom:2rem; border:2px solid var(--primary);">
                    <div class="card-header">プロフィール設定</div>
                    <div style="display:flex; align-items:center; gap:1.5rem;">
                        <div style="width:64px; height:64px; border-radius:50%; background:var(--bg-body); display:flex; align-items:center; justify-content:center; font-size:2.5rem; border:1px solid var(--border);">
                            ${user.icon || user.name.charAt(0)}
                        </div>
                        <div style="flex:1;">
                            <div class="form-group" style="margin-bottom:0.5rem;">
                                <label class="form-label">名前</label>
                                <div style="display:flex; gap:0.5rem; align-items:center;">
                                    <input id="profile-name-input" class="form-input" value="${user.name}" disabled style="background:#f3f4f6; color:#6b7280;">
                                    <button id="btn-edit-profile-name" class="btn btn-secondary btn-sm" onclick="window.app.enableProfileEdit()"><i class="ph ph-pencil-simple"></i></button>
                                    <button id="btn-save-profile-name" class="btn btn-primary btn-sm" onclick="window.app.saveProfileName()" style="display:none;">保存</button>
                                </div>
                            </div>
                            <div style="color:var(--text-muted); font-size:0.9rem; margin-bottom:0.5rem;">${user.dept} / ${user.role}</div>
                            <button class="btn btn-sm btn-secondary" onclick="window.app.openIconModal()"><i class="ph ph-paw-print"></i> アイコンを変更</button>
                        </div>
                    </div>
                </div>

            </div>
        `;
        // Removed Project Config Section Logic
    }

    enableProfileEdit() {
        const input = document.getElementById('profile-name-input');
        const editBtn = document.getElementById('btn-edit-profile-name');
        const saveBtn = document.getElementById('btn-save-profile-name');
        if (input && editBtn && saveBtn) {
            input.disabled = false;
            input.style.background = 'white';
            input.style.color = 'var(--text-main)';
            input.focus();
            editBtn.style.display = 'none';
            saveBtn.style.display = '';
        }
    }

    saveProfileName() {
        const newName = document.getElementById('profile-name-input').value;
        if (!newName) return alert('名前を入力してください');
        store.updateMember(this.currentUser.id, { name: newName });
        // Update header
        document.getElementById('header-user-name').textContent = newName;
        // Re-render
        this.renderSettings(document.getElementById('view-container'));
    }

    openIconModal() {
        const icons = [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
            '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
            '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
            '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🐢', '🐍', '🦎', '🦖'
        ];

        const modal = document.createElement('div');
        modal.id = 'icon-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:10000;';

        // Use a persistent variable for selection or just DOM class
        window.app.currentIconSelection = null;

        modal.innerHTML = `
            <div class="card" style="width:400px; max-width:90%; background:white; padding:2rem; max-height:80vh; display:flex; flex-direction:column;">
                <h3 style="margin-bottom:1.5rem;">アイコンを選択</h3>
                <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:1rem; margin-bottom:2rem; overflow-y:auto; padding:0.5rem; border:1px solid #f1f5f9; border-radius:8px; max-height: 400px;">
                    ${icons.map(a => `
                        <button class="icon-btn" onclick="window.app.selectIcon(this, '${a}')" style="font-size:2rem; background:none; border:2px solid transparent; border-radius:8px; cursor:pointer; padding:0.5rem; transition:all 0.2s;">${a}</button>
                    `).join('')}
                </div>
                <div style="display:flex; justify-content:flex-end; gap:1rem;">
                    <button class="btn btn-secondary" onclick="document.getElementById('icon-modal').remove()">キャンセル</button>
                    <button class="btn btn-primary" onclick="window.app.saveSelectedIcon()">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    selectIcon(btn, icon) {
        // Clear previous
        document.querySelectorAll('.icon-btn').forEach(b => {
            b.style.borderColor = 'transparent';
            b.style.background = 'none';
        });
        // Select
        btn.style.borderColor = 'var(--primary)';
        btn.style.background = '#f0f9ff';
        window.app.currentIconSelection = icon;
    }

    saveSelectedIcon() {
        const icon = window.app.currentIconSelection;
        if (!icon) return alert('アイコンを選択してください');
        this.updateMemberIcon(icon);
    }

    updateMemberIcon(icon) {
        store.updateMember(this.currentUser.id, { icon });
        // Update header immediate
        document.getElementById('header-user-avatar').textContent = icon;
        // Close modal and re-render settings
        document.getElementById('icon-modal').remove();
        this.renderSettings(document.getElementById('view-container'));
    }

    // --- Rich Text Editing Helpers ---

    insertWikiFormatTable(targetId) {
        // Default 3x3 Table
        const rows = 3;
        const cols = 3;
        let html = '<table class="wiki-table" style="width:100%; border-collapse:collapse; margin-bottom:1rem; border:1px solid #e2e8f0;"><thead style="background:#f8fafc;"><tr>';
        for (let j = 0; j < cols; j++) html += '<th style="border:1px solid #e2e8f0; padding:0.5rem;">Header</th>';
        html += '</tr></thead><tbody>';
        for (let i = 0; i < rows; i++) {
            html += '<tr>';
            for (let j = 0; j < cols; j++) html += '<td style="border:1px solid #e2e8f0; padding:0.5rem;">Cell</td>';
            html += '</tr>';
        }
        html += '</tbody></table><p><br></p>';

        this._insertHtmlAtCursor(targetId, html);
    }

    insertWikiFormatLink() {
        const url = prompt('URL', 'https://');
        const text = prompt('リンクテキスト', 'リンク');
        if (url && text) {
            const html = `<a href="${url}" target="_blank" style="color:var(--primary); text-decoration:underline;">${text}</a>`;
            document.execCommand('insertHTML', false, html);
        }
    }

    insertWikiFormatImage() {
        const url = prompt('画像URL', 'https://');
        if (url) {
            const html = `<img src="${url}" style="max-width:100%; border-radius:8px; margin:0.5rem 0;">`;
            document.execCommand('insertHTML', false, html);
        }
    }

    _insertHtmlAtCursor(targetId, html) {
        const editor = document.getElementById(targetId);
        if (editor) {
            editor.focus();
            const success = document.execCommand('insertHTML', false, html);
            if (!success) {
                editor.innerHTML += html;
            }
        }
    }

    addConfigItem(type) {
        this.openConfigModal(type, null);
    }

    editConfigItem(type, idx) {
        this.openConfigModal(type, idx);
    }

    openConfigModal(type, idx) {
        const isEdit = idx !== null;
        const config = store.getConfig();
        const item = isEdit ? config[type][idx] : null;

        let contentHtml = '';

        if (type === 'statuses') {
            contentHtml = `
                <div class="form-group"><label class="form-label">ステータス名</label><input id="cfg-label" class="form-input" value="${item ? item.label : ''}"></div>
                <div class="form-group"><label class="form-label">背景色</label><input type="color" id="cfg-color" class="form-input" value="${item ? item.color : '#e2e8f0'}" style="height:50px;"></div>
                <div class="form-group"><label class="form-label">文字色</label><input type="color" id="cfg-text" class="form-input" value="${item ? item.textColor : '#000000'}" style="height:50px;"></div>
            `;
        } else if (type === 'priorities') {
            contentHtml = `
                <div class="form-group"><label class="form-label">優先度名</label><input id="cfg-label" class="form-input" value="${item ? item.label : ''}"></div>
            `;
            contentHtml = `
                <div class="form-group"><label class="form-label">カテゴリ名</label><input id="cfg-val" class="form-input" value="${item ? item : ''}"></div>
            `;
        } else if (type === 'departments') {
            contentHtml = `
                <div class="form-group"><label class="form-label">部署名</label><input id="cfg-val" class="form-input" value="${item ? item : ''}"></div>
            `;
        }

        // Create Modal
        const modal = document.createElement('div');
        modal.id = 'config-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:10000;';
        modal.innerHTML = `
            <div class="card" style="width:400px; max-width:90%; background:white; padding:2rem;">
                <h3 style="margin-bottom:1.5rem;">${isEdit ? '設定の編集' : '設定の追加'}</h3>
                ${contentHtml}
                <div style="display:flex; justify-content:flex-end; gap:1rem; margin-top:2rem;">
                    <button class="btn btn-secondary" onclick="window.app.closeConfigModal()">キャンセル</button>
                    <button class="btn btn-primary" onclick="window.app.saveConfigFromModal('${type}', ${idx})">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    closeConfigModal() {
        const m = document.getElementById('config-modal');
        if (m) m.remove();
    }

    saveConfigFromModal(type, idx) {
        const config = store.getConfig();
        let newItem;
        const currentItem = idx !== null ? config[type][idx] : null;

        if (type === 'statuses') {
            const label = document.getElementById('cfg-label').value;
            const color = document.getElementById('cfg-color').value;
            const textColor = document.getElementById('cfg-text').value;
            if (!label) return alert('名前は必須です');
            // ID auto-generation or reuse
            const id = currentItem ? currentItem.id : 'status-' + Date.now();
            newItem = { id, label, color, textColor };
        } else if (type === 'priorities') {
            const label = document.getElementById('cfg-label').value;
            if (!label) return alert('名前は必須です');
            const id = currentItem ? currentItem.id : 'p-' + Date.now();
            newItem = { id, label };
            newItem = val;
        } else if (type === 'departments') {
            const val = document.getElementById('cfg-val').value;
            if (!val) return alert('値は必須です');
            newItem = val;
        }

        if (idx !== null) {
            config[type][idx] = newItem;
        } else {
            config[type].push(newItem);
        }

        store.updateConfig(config);
        this.closeConfigModal();
        this.renderSettings(document.getElementById('view-container'));
    }

    removeConfigItem(type, idx) {
        if (!confirm('本当に削除しますか？')) return;
        const config = store.getConfig();
        config[type].splice(idx, 1);
        store.updateConfig(config);
        this.renderSettings(document.getElementById('view-container'));
    }
    setupWikiTableInteractions(editorId) {
        const editor = document.getElementById(editorId);
        if (!editor) return;

        // Context Menu / Toolbar for Table
        const existingToolbar = document.getElementById('wiki-table-toolbar');
        if (existingToolbar) existingToolbar.remove();

        const toolbar = document.createElement('div');
        toolbar.id = 'wiki-table-toolbar';
        toolbar.style.cssText = 'position:absolute; display:none; background:white; border:1px solid #cbd5e1; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); border-radius:4px; padding:0.25rem; gap:0.25rem; z-index:100; align-items:center;';
        toolbar.innerHTML = `
            <button title="行を上に追加" onclick="window.app.tableAction('addRowAbove')"><i class="ph ph-arrow-fat-line-up"></i></button>
            <button title="行を下に追加" onclick="window.app.tableAction('addRowBelow')"><i class="ph ph-arrow-fat-line-down"></i></button>
            <button title="列を左に追加" onclick="window.app.tableAction('addColLeft')"><i class="ph ph-arrow-fat-line-left"></i></button>
            <button title="列を右に追加" onclick="window.app.tableAction('addColRight')"><i class="ph ph-arrow-fat-line-right"></i></button>
            <div style="width:1px; height:20px; background:#e2e8f0; margin:0 2px;"></div>
            <button title="行を削除" onclick="window.app.tableAction('deleteRow')" style="color:#ef4444;"><i class="ph ph-trash"></i> 行</button>
            <button title="列を削除" onclick="window.app.tableAction('deleteCol')" style="color:#ef4444;"><i class="ph ph-trash"></i> 列</button>
        `;
        document.body.appendChild(toolbar);

        const style = document.createElement('style');
        style.textContent = `#wiki-table-toolbar button { background:none; border:none; padding:6px; cursor:pointer; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#64748b; } #wiki-table-toolbar button:hover { background:#f1f5f9; color:var(--primary); }`;
        document.head.appendChild(style);

        editor.addEventListener('click', (e) => {
            const cell = e.target.closest('td, th');
            if (cell && editor.contains(cell)) {
                window.app.activeTableCell = cell;

                const rect = cell.getBoundingClientRect();
                toolbar.style.display = 'flex';
                toolbar.style.top = `${rect.top - 45 + window.scrollY}px`;
                toolbar.style.left = `${rect.left + window.scrollX}px`;
            } else {
                toolbar.style.display = 'none';
                window.app.activeTableCell = null;
            }
        });

        // Resize Logic
        let isResizing = false;
        let resizingCol = null;
        let startX = 0;
        let startWidth = 0;

        editor.addEventListener('mousemove', (e) => {
            if (isResizing) return;
            const cell = e.target.closest('td, th');
            if (cell && editor.contains(cell)) {
                const rect = cell.getBoundingClientRect();
                if (Math.abs(rect.right - e.clientX) < 5) {
                    cell.style.cursor = 'col-resize';
                } else {
                    cell.style.cursor = 'default';
                }
            }
        });

        editor.addEventListener('mousedown', (e) => {
            const cell = e.target.closest('td, th');
            if (cell && editor.contains(cell)) {
                const rect = cell.getBoundingClientRect();
                if (Math.abs(rect.right - e.clientX) < 5) {
                    isResizing = true;
                    resizingCol = cell;
                    startX = e.clientX;
                    startWidth = cell.offsetWidth;
                    e.preventDefault();
                }
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isResizing && resizingCol) {
                const diff = e.clientX - startX;
                const newWidth = Math.max(20, startWidth + diff); // Min width 20px
                resizingCol.style.width = `${newWidth}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
            resizingCol = null;
        });

        document.addEventListener('click', (e) => {
            if (!toolbar.contains(e.target) && !editor.contains(e.target)) {
                toolbar.style.display = 'none';
            }
        });
    }

    tableAction(action) {
        const cell = window.app.activeTableCell;
        if (!cell) return;
        const row = cell.parentElement;
        const table = cell.closest('table');

        const cellIndex = Array.from(row.children).indexOf(cell);
        const rowIndex = Array.from(table.rows).indexOf(row);

        if (action === 'addRowAbove') {
            const newRow = table.insertRow(rowIndex);
            for (let i = 0; i < row.children.length; i++) {
                const newCell = newRow.insertCell(i);
                newCell.innerHTML = '<br>';
                newCell.style.cssText = row.children[i].style.cssText;
            }
        } else if (action === 'addRowBelow') {
            const newRow = table.insertRow(rowIndex + 1);
            for (let i = 0; i < row.children.length; i++) {
                const newCell = newRow.insertCell(i);
                newCell.innerHTML = '<br>';
                newCell.style.cssText = row.children[i].style.cssText;
            }
        } else if (action === 'addColLeft') {
            for (let i = 0; i < table.rows.length; i++) {
                const tr = table.rows[i];
                if (tr.children.length > cellIndex) {
                    const refCell = tr.children[cellIndex];
                    const tagName = refCell.tagName.toLowerCase();
                    const newCell = document.createElement(tagName);
                    newCell.innerHTML = tagName === 'th' ? 'Header' : '<br>';
                    newCell.style.cssText = refCell.style.cssText;
                    tr.insertBefore(newCell, refCell);
                }
            }
        } else if (action === 'addColRight') {
            for (let i = 0; i < table.rows.length; i++) {
                const tr = table.rows[i];
                if (tr.children.length > cellIndex) {
                    const refCell = tr.children[cellIndex];
                    const tagName = refCell.tagName.toLowerCase();
                    const newCell = document.createElement(tagName);
                    newCell.innerHTML = tagName === 'th' ? 'Header' : '<br>';
                    newCell.style.cssText = refCell.style.cssText;
                    if (cellIndex + 1 < tr.children.length) {
                        tr.insertBefore(newCell, tr.children[cellIndex + 1]);
                    } else {
                        tr.appendChild(newCell);
                    }
                }
            }
        } else if (action === 'deleteRow') {
            table.deleteRow(rowIndex);
        } else if (action === 'deleteCol') {
            for (let i = 0; i < table.rows.length; i++) {
                if (table.rows[i].children.length > cellIndex) {
                    table.rows[i].deleteCell(cellIndex);
                }
            }
        }
    }

    // --- New Project Creation Modal ---
    openCreateProjectModal() {
        if (document.getElementById('create-project-modal')) return;

        // Initialize State
        this.createProjectState = {
            step: 1,
            data: {
                name: '',
                icon: 'ph-folder',
                team: '',
                members: [],
                managerId: this.currentUser.id,
                categories: [],
                statuses: JSON.parse(JSON.stringify(store.getConfig().statuses))
            },
            hasInput: false
        };

        const modalHtml = `
            <div id="create-project-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9000; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;">
                <div class="modal-card" style="width:700px; max-width:90%; background:white; border-radius:16px; display:flex; flex-direction:column; max-height:90vh; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); transform:scale(0.95); transition:transform 0.2s;">
                    
                    <div style="padding:1.5rem; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-weight:700; font-size:1.1rem; color:#1e293b;">新規プロジェクト作成</div>
                        <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:#64748b;">
                            <span id="cp-step-indicator-1" class="step-badge active">1.基本情報</span>
                            <i class="ph ph-caret-right"></i>
                            <span id="cp-step-indicator-2" class="step-badge">2.メンバー・権限</span>
                            <i class="ph ph-caret-right"></i>
                            <span id="cp-step-indicator-3" class="step-badge">3.詳細設定</span>
                        </div>
                    </div>

                    <div id="cp-modal-body" style="padding:2rem; overflow-y:auto; flex:1;">
                        <div id="cp-step-1" class="cp-step">
                            <div class="form-group">
                                <label class="form-label pop-label">プロジェクト名 <span style="color:#ef4444">*</span></label>
                                <input id="cp-name" class="form-input pop-input" placeholder="例: 新規プロダクト開発" style="font-size:1rem;">
                            </div>
                            <div class="form-group">
                                <label class="form-label pop-label">アイコン</label>
                                <div style="display:flex; align-items:center; gap:1rem;">
                                    <div id="cp-icon-preview" style="width:64px; height:64px; background:#f8fafc; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:2rem; color:var(--primary); border:1px solid #e2e8f0;">
                                        <i class="ph ph-folder"></i>
                                    </div>
                                    <button class="btn btn-secondary" onclick="window.app._openIconPickerForCreate()">アイコンを変更</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label pop-label">部署/チーム（任意）</label>
                                <input id="cp-team" class="form-input pop-input" placeholder="例: 開発部">
                            </div>
                        </div>

                        <div id="cp-step-2" class="cp-step" style="display:none; height:100%;">
                            <label class="form-label pop-label" style="margin-bottom:1rem; display:block;">メンバーと権限の設定</label>
                            <div style="display:flex; gap:1.5rem; height:400px;">
                                <!-- LEFT COL -->
                                <div style="flex:1; display:flex; flex-direction:column; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; background:white;">
                                    <div style="padding:1rem; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                                        <div style="font-weight:600; margin-bottom:0.5rem; color:#475569; font-size:0.9rem;">すべてのメンバー</div>
                                        <input id="cp-member-search" type="text" class="form-input pop-input" placeholder="名前で検索" style="font-size:0.85rem;" onkeyup="window.app._filterCreateProjectMembers(this.value)">
                                    </div>
                                    <div id="cp-member-list-all" style="flex:1; overflow-y:auto; padding:0.5rem; display:flex; flex-direction:column; gap:0.5rem;">
                                        <!-- List Items -->
                                    </div>
                                </div>
                                
                                <!-- ARROW ICONS -->
                                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem;">
                                    <button class="btn btn-secondary" style="border-radius:50%; width:40px; height:40px; padding:0; display:flex; align-items:center; justify-content:center;" onclick="window.app._moveMember('add')"><i class="ph ph-arrow-right" style="font-size:1.2rem;"></i></button>
                                    <button class="btn btn-secondary" style="border-radius:50%; width:40px; height:40px; padding:0; display:flex; align-items:center; justify-content:center;" onclick="window.app._moveMember('remove')"><i class="ph ph-arrow-left" style="font-size:1.2rem;"></i></button>
                                </div>

                                <!-- RIGHT COL -->
                                <div style="flex:1; display:flex; flex-direction:column; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; background:#fffbeb;">
                                    <div style="padding:1rem; background:#fff7ed; border-bottom:1px solid #fed7aa; color:#9a3412; display:flex; justify-content:space-between; align-items:center;">
                                        <div style="font-weight:600; font-size:0.9rem;">参加メンバー (管理者設定)</div>
                                        <span id="cp-member-count" style="font-size:0.8rem; background:white; padding:2px 8px; border-radius:10px; font-weight:700;">0</span>
                                    </div>
                                    <div id="cp-member-list-selected" style="flex:1; overflow-y:auto; padding:0.5rem; display:flex; flex-direction:column; gap:0.5rem;">
                                        <!-- List Items -->
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="cp-step-3" class="cp-step" style="display:none;">
                            <div class="form-group">
                                <label class="form-label pop-label">カテゴリ設定</label>
                                <div style="display:flex; gap:0.5rem; margin-bottom:1rem;">
                                    <input id="cp-new-cat" class="form-input pop-input" placeholder="カテゴリ名">
                                    <button class="btn btn-secondary" onclick="window.app._addCreateProjectCategory()">追加</button>
                                </div>
                                <div id="cp-cat-list" style="display:flex; flex-wrap:wrap; gap:0.5rem;"></div>
                            </div>

                            <div class="form-group" style="margin-top:2rem;">
                                <label class="form-label pop-label">ステータス設定</label>
                                <div id="cp-status-list" style="display:flex; flex-direction:column; gap:0.5rem;"></div>
                                <button class="btn btn-sm btn-secondary" style="margin-top:0.5rem; width:100%;" onclick="window.app._addCreateProjectStatus()">+ ステータス追加</button>
                            </div>
                        </div>
                    </div>

                    <div style="padding:1.5rem; border-top:1px solid #f1f5f9; display:flex; justify-content:space-between;">
                        <button class="btn btn-secondary" onclick="window.app._closeCreateProjectModal()">キャンセル</button>
                        <div style="display:flex; gap:1rem;">
                            <button class="btn btn-secondary" id="cp-btn-back" style="display:none;" onclick="window.app._prevCreateProjectStep()">戻る</button>
                            <button class="btn btn-primary" id="cp-btn-next" onclick="window.app._nextCreateProjectStep()">次へ</button>
                            <button class="btn btn-primary" id="cp-btn-create" style="display:none;" onclick="window.app._submitCreateProject()">プロジェクトを作成</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .step-badge { padding: 4px 10px; border-radius: 20px; background: #f1f5f9; color: #94a3b8; font-weight: 600; font-size: 0.8rem; }
                .step-badge.active { background: var(--primary); color: white; }
                
                .cp-mem-item { display:flex; align-items:center; gap:0.8rem; padding:0.6rem; border-radius:8px; transition:border 0.2s; border:1px solid transparent; background:white; }
                .cp-mem-item:hover { border-color:#cbd5e1; }
                .cp-mem-btn-add { width:28px; height:28px; border-radius:50%; border:1px solid #cbd5e1; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#64748b; background:white; transition:all 0.2s; }
                .cp-mem-btn-add:hover { background:var(--primary); color:white; border-color:var(--primary); }

                .cp-selected-item { display:flex; align-items:center; gap:0.8rem; padding:0.6rem; background:white; border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,0.05); }
                .cp-avatar-wrapper { position:relative; }
                .cp-crown-badge { position:absolute; top:-4px; right:-4px; background:#fbbf24; color:white; width:16px; height:16px; border-radius:50%; font-size:10px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 1px 2px rgba(0,0,0,0.1); }
                
                .cp-status-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border: 1px solid #f1f5f9; border-radius: 8px; background: white; }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        setTimeout(() => {
            const el = document.getElementById('create-project-modal');
            if (el) { el.style.opacity = '1'; el.querySelector('.modal-card').style.transform = 'scale(1)'; }
        }, 10);

        this.createProjectState.data.members.push(this.currentUser.id);

        this._renderCreateProjectStatuses();
        this._renderCreateProjectMemberLists();

        document.getElementById('cp-name').addEventListener('input', () => this.createProjectState.hasInput = true);
    }

    _closeCreateProjectModal() {
        if (this.createProjectState.hasInput) {
            this._showCloseConfirmation();
            return;
        }
        this._forceCloseCreateProjectModal();
    }

    _forceCloseCreateProjectModal() {
        const el = document.getElementById('create-project-modal');
        if (el) el.remove();
        this.createProjectState = null;
    }

    _showCloseConfirmation() {
        if (document.getElementById('cp-confirm-modal')) return;
        const html = `
           <div id="cp-confirm-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9200; display:flex; align-items:center; justify-content:center; animation: fadeIn 0.2s;">
               <div style="background:white; padding:2rem; border-radius:16px; width:400px; max-width:90%; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); text-align:center; transform:scale(0.95); animation: popIn 0.2s forwards;">
                   <div style="font-size:3rem; color:#f59e0b; margin-bottom:1rem;"><i class="ph ph-warning-circle"></i></div>
                   <h3 style="font-weight:700; margin-bottom:0.5rem; color:#1e293b;">入力内容を破棄しますか？</h3>
                   <p style="color:#64748b; margin-bottom:1.5rem; font-size:0.9rem;">現在入力中の内容は保存されません。</p>
                   <div style="display:flex; justify-content:center; gap:1rem;">
                       <button class="btn btn-secondary" onclick="document.getElementById('cp-confirm-modal').remove()">キャンセル</button>
                       <button class="btn btn-danger" onclick="document.getElementById('cp-confirm-modal').remove(); window.app._forceCloseCreateProjectModal()">破棄して閉じる</button>
                   </div>
               </div>
           </div>
           <style>
               @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
               @keyframes popIn { from { transform:scale(0.95); opacity:0; } to { transform:scale(1); opacity:1; } }
           </style>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    _nextCreateProjectStep() {
        const s = this.createProjectState;
        if (s.step === 1) {
            const nameFn = document.getElementById('cp-name');
            const name = nameFn.value;
            if (!name) {
                this.showToast('プロジェクト名は必須です', 'danger');
                nameFn.style.borderColor = '#ef4444';
                nameFn.style.background = '#fef2f2';
                setTimeout(() => { nameFn.style.borderColor = ''; nameFn.style.background = ''; }, 2000);
                return;
            }
            s.data.name = name;
            s.data.team = document.getElementById('cp-team').value;
        }

        if (s.step === 2) {
            if (s.data.members.length === 0) {
                this.showToast('少なくとも1人のメンバーを選択してください', 'danger');
                return;
            }
            if (!s.data.managerId) {
                this.showToast('管理者を設定してください', 'danger');
                // Visual cue: Red border on right column
                const rightCol = document.getElementById('cp-member-list-selected').parentElement;
                rightCol.style.borderColor = '#ef4444';
                rightCol.style.boxShadow = '0 0 0 4px #fee2e2';
                setTimeout(() => {
                    rightCol.style.borderColor = '#e2e8f0';
                    rightCol.style.boxShadow = 'none';
                }, 2000);
                return;
            }
        }

        s.step++;
        this._updateCreateProjectView();
    }

    _prevCreateProjectStep() {
        if (this.createProjectState.step > 1) {
            this.createProjectState.step--;
            this._updateCreateProjectView();
        }
    }

    _updateCreateProjectView() {
        const step = this.createProjectState.step;
        document.querySelectorAll('.cp-step').forEach(el => el.style.display = 'none');
        document.getElementById(`cp-step-${step}`).style.display = 'block';

        for (let i = 1; i <= 3; i++) {
            const badge = document.getElementById(`cp-step-indicator-${i}`);
            if (i === step) { badge.classList.add('active'); badge.style.background = 'var(--primary)'; badge.style.color = 'white'; }
            else { badge.classList.remove('active'); badge.style.background = '#f1f5f9'; badge.style.color = '#94a3b8'; }
        }

        document.getElementById('cp-btn-back').style.display = step > 1 ? 'inline-block' : 'none';
        document.getElementById('cp-btn-next').style.display = step < 3 ? 'inline-block' : 'none';
        document.getElementById('cp-btn-create').style.display = step === 3 ? 'inline-block' : 'none';
    }

    _selectMemberForMove(id, listType) {
        if (listType === 'all') {
            this.createProjectState.selectedAllId = id;
            this.createProjectState.selectedSelectedId = null;
        } else {
            this.createProjectState.selectedAllId = null;
            this.createProjectState.selectedSelectedId = id;
        }
        this._renderCreateProjectMemberLists();
    }

    _moveMember(direction) {
        const s = this.createProjectState;
        if (direction === 'add') {
            if (s.selectedAllId) {
                if (!s.data.members.includes(s.selectedAllId)) {
                    s.data.members.push(s.selectedAllId);
                    s.selectedAllId = null;
                    s.hasInput = true;
                    this._renderCreateProjectMemberLists();
                }
            }
        } else {
            if (s.selectedSelectedId) {
                const index = s.data.members.indexOf(s.selectedSelectedId);
                if (index !== -1) {
                    s.data.members.splice(index, 1);
                    if (s.data.managerId === s.selectedSelectedId) s.data.managerId = null;
                    s.selectedSelectedId = null;
                    s.hasInput = true;
                    this._renderCreateProjectMemberLists();
                }
            }
        }
    }

    _setCreateProjectManager(id) {
        const s = this.createProjectState;
        if (s.data.managerId !== id) {
            s.data.managerId = id;
            if (!s.data.members.includes(id)) s.data.members.push(id);
        }
        this._renderCreateProjectMemberLists();
    }

    _filterCreateProjectMembers(query) {
        query = query.toLowerCase();
        document.querySelectorAll('#cp-member-list-all .cp-mem-item').forEach(el => {
            const name = el.dataset.name;
            el.style.display = name.includes(query) ? 'flex' : 'none';
        });
    }

    _renderCreateProjectMemberLists() {
        const allList = document.getElementById('cp-member-list-all');
        const selectedList = document.getElementById('cp-member-list-selected');
        const countSpan = document.getElementById('cp-member-count');
        if (!allList || !selectedList) return;

        allList.innerHTML = '';
        selectedList.innerHTML = '';

        const members = store.getMembers();
        const selectedIds = this.createProjectState.data.members;
        const managerId = this.createProjectState.data.managerId;

        // initialize temp state if needed
        if (this.createProjectState.selectedAllId === undefined) this.createProjectState.selectedAllId = null;
        if (this.createProjectState.selectedSelectedId === undefined) this.createProjectState.selectedSelectedId = null;

        if (countSpan) countSpan.innerText = selectedIds.length;

        members.forEach(m => {
            if (selectedIds.includes(m.id)) {
                // To Selected List
                const isManager = m.id === managerId;
                const isSelected = this.createProjectState.selectedSelectedId === m.id;
                const div = document.createElement('div');
                div.className = `cp-selected-item ${isSelected ? 'list-selected' : ''}`;
                div.style.cursor = 'pointer';
                if (isSelected) { div.style.background = '#e0f2fe'; div.style.borderColor = '#38bdf8'; } // Highlight style
                div.onclick = () => this._selectMemberForMove(m.id, 'selected');
                div.innerHTML = `
                    <div class="cp-avatar-wrapper">
                        ${this.renderAvatar(m.id, 32)}
                        ${isManager ? '<div class="cp-crown-badge"><i class="ph ph-crown-fill"></i></div>' : ''}
                    </div>
                    <div style="flex:1;">
                        <div style="font-weight:700; font-size:0.9rem; color:#d97706;">${m.name}</div>
                        <div style="font-size:0.75rem; color:#b45309;">${m.dept || ''}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem;" onclick="event.stopPropagation()">
                         <div style="font-size:0.7rem; color:#d97706; font-weight:600;">${isManager ? '管理者' : '管理者設定'}</div>
                         <div class="toggle-switch form-switch">
                            <input type="checkbox" id="cp-mgr-${m.id}" ${isManager ? 'checked' : ''} onchange="window.app._setCreateProjectManager('${m.id}')">
                            <label for="cp-mgr-${m.id}"></label>
                        </div>
                    </div>
                `;
                selectedList.appendChild(div);
            } else {
                // To All List
                const isSelected = this.createProjectState.selectedAllId === m.id;
                const div = document.createElement('div');
                div.className = `cp-mem-item ${isSelected ? 'list-selected' : ''}`;
                div.dataset.name = m.name.toLowerCase();
                div.style.cursor = 'pointer';
                if (isSelected) { div.style.background = '#eff6ff'; div.style.borderColor = '#3b82f6'; } // Highlight style
                div.onclick = () => this._selectMemberForMove(m.id, 'all');

                div.innerHTML = `
                    ${this.renderAvatar(m.id, 32)}
                    <div style="flex:1;">
                        <div style="font-weight:600; font-size:0.9rem; color:#334155;">${m.name}</div>
                        <div style="font-size:0.75rem; color:#94a3b8;">${m.dept || ''}</div>
                    </div>
                `;
                allList.appendChild(div);
            }
        });

        const searchInput = document.getElementById('cp-member-search');
        if (searchInput && searchInput.value) {
            this._filterCreateProjectMembers(searchInput.value);
        }
    }

    _openIconPickerForCreate() {
        window.app._tempSelectedIcon = null;
        this.openProjectIconModal();
    }

    _addCreateProjectCategory() {
        const input = document.getElementById('cp-new-cat');
        const val = input.value.trim();
        if (val) {
            if (!this.createProjectState.data.categories.includes(val)) {
                this.createProjectState.data.categories.push(val);
                this._renderCreateProjectCategories();
                input.value = '';
            }
        }
    }

    _renderCreateProjectCategories() {
        const container = document.getElementById('cp-cat-list');
        container.innerHTML = this.createProjectState.data.categories.map((c, i) => `
            <span style="background:#f1f5f9; padding:4px 10px; border-radius:12px; font-size:0.8rem; display:flex; align-items:center; gap:4px;">
                ${c} <i class="ph ph-x" style="cursor:pointer;" onclick="window.app.createProjectState.data.categories.splice(${i},1); window.app._renderCreateProjectCategories()"></i>
            </span>
        `).join('');
    }

    _addCreateProjectStatus() {
        this.createProjectState.data.statuses.push({ id: `st-${Date.now()}`, label: '新規', color: '#e2e8f0', textColor: '#000000' });
        this._renderCreateProjectStatuses();
    }

    _renderCreateProjectStatuses() {
        const container = document.getElementById('cp-status-list');
        container.innerHTML = '';
        this.createProjectState.data.statuses.forEach((s, idx) => {
            const div = document.createElement('div');
            div.className = 'cp-status-row';
            div.innerHTML = `
                <input class="form-input pop-input" value="${s.label}" style="flex:1; padding:4px 8px;" onchange="window.app.createProjectState.data.statuses[${idx}].label = this.value">
                <input type="color" value="${s.color}" style="border:none; width:30px; height:30px; cursor:pointer;" onchange="window.app.createProjectState.data.statuses[${idx}].color = this.value">
                <button class="btn btn-sm btn-danger" style="border-radius:50%; width:24px; height:24px; padding:0; display:flex; align-items:center; justify-content:center;" onclick="window.app.createProjectState.data.statuses.splice(${idx},1); window.app._renderCreateProjectStatuses()"><i class="ph ph-trash"></i></button>
            `;
            container.appendChild(div);
        });
    }

    _submitCreateProject() {
        const s = this.createProjectState;

        if (!s.data.managerId) {
            if (s.data.members.includes(this.currentUser.id)) {
                s.data.managerId = this.currentUser.id;
            } else if (s.data.members.length > 0) {
                s.data.managerId = s.data.members[0];
            }
        }

        const newPrj = {
            id: `prj-${Date.now()}`,
            name: s.data.name,
            dept: s.data.team,
            members: s.data.members,
            managerId: s.data.managerId,
            icon: s.data.icon,
            categories: s.data.categories,
            statuses: s.data.statuses
        };

        store.addProject(newPrj);

        this.showToast('プロジェクトを作成しました', 'success');
        this._forceCloseCreateProjectModal();

        if (this.currentRoute === 'project-settings') {
            this.renderProjectSettings(document.getElementById('view-container'));
        }
    }

    showToast(message, type = 'info') {
        const id = 'toast-' + Date.now();
        const colors = type === 'danger' ? '#ef4444' : (type === 'success' ? '#10b981' : '#3b82f6');
        const icon = type === 'danger' ? 'ph-warning-circle' : (type === 'success' ? 'ph-check-circle' : 'ph-info');

        const html = `
            <div id="${id}" style="position:fixed; top:20px; right:20px; background:${colors}; color:white; padding:12px 20px; border-radius:12px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); z-index:9999; display:flex; align-items:center; gap:0.8rem; min-width:300px; transform:translateX(120%); transition:transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                <i class="ph ${icon}" style="font-size:1.4rem;"></i>
                <div style="font-weight:600; font-size:0.95rem;">${message}</div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        // Trigger animation
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.style.transform = 'translateX(0)';
        }, 50);

        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) {
                el.style.transform = 'translateX(120%)';
                setTimeout(() => el.remove(), 300);
            }
        }, 3000);
    }
}

window.onload = () => { window.app = new App(); };
