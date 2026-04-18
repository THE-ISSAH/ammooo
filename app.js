import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, push, onValue, set, remove, get } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDakY0gWDAbWa2jnrF3NhAuvLFPdG4usgc",
    authDomain: "aether-e8da7.firebaseapp.com",
    databaseURL: "https://aether-e8da7-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "aether-e8da7"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const moviesRef = ref(db, "movies");

let contentData = [];
let currentUser = JSON.parse(localStorage.getItem('aether_session')) || null;
let isSignUpMode = false;
let isFirstLoad = true;

window.showToast = (msg, isError = false) => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : ''}`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('active'), 10);
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
};

const hideLoader = () => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.classList.add('hidden'), 1000);
    }
};

window.navigateTo = (view, params = null) => {
    const url = params ? `#details-${params}` : `#${view}`;
    window.history.pushState({view, params}, "", url);
    renderView(view, params);
    document.getElementById('main-scroll').scrollTop = 0;
};

window.onpopstate = () => routeCurrentHash();

function routeCurrentHash() {
    const hash = decodeURIComponent(window.location.hash.replace('#', ''));
    if (hash.startsWith('details-')) {
        const id = hash.split('details-')[1];
        renderView('details', id);
    } else {
        renderView(hash || 'home');
    }
}

window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
};

window.toggleAuthMode = () => {
    isSignUpMode = !isSignUpMode;
    document.getElementById('signup-fields').classList.toggle('hidden', !isSignUpMode);
    document.getElementById('auth-title').innerText = isSignUpMode ? "Create Account" : "Sign In";
    document.getElementById('auth-btn').innerText = isSignUpMode ? "Register Now" : "Sign In";
    document.getElementById('auth-toggle').innerText = isSignUpMode ? "Already have an account? Login" : "Don't have an account? Sign Up";
};

window.processAuth = async () => {
    const name = document.getElementById('auth-name').value;
    const user = document.getElementById('auth-user').value.trim();
    const pass = document.getElementById('auth-pass').value;
    if (!user || !pass || (isSignUpMode && !name)) return window.showToast("Please fill all fields", true);
    const uid = user.replace(/\W/g, '').toLowerCase();
    if (!isSignUpMode && btoa(user + pass) === "QGluZHV3YXJhQ2hhcmxpZWJybzEyMw==") {
        window.showToast("Access Granted, Administrator.");
        return saveSession("Induwara", "admin", "admin_root");
    }
    const userRef = ref(db, `users/${uid}`);
    const snap = await get(userRef);
    if (isSignUpMode) {
        if (snap.exists()) return window.showToast("Username already exists.", true);
        await set(userRef, { name, user, pass });
        window.showToast("Account created successfully!");
        saveSession(name, "user", uid);
    } else {
        if (!snap.exists() || snap.val().pass !== pass) return window.showToast("Incorrect username or password", true);
        window.showToast(`Welcome back, ${snap.val().name}`);
        saveSession(snap.val().name, "user", uid);
    }
};

function saveSession(name, role, uid) {
    localStorage.setItem('aether_session', JSON.stringify({ name, role, uid }));
    setTimeout(() => location.reload(), 1000);
}

window.triggerSearch = () => {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.toLowerCase().trim();
    if (!query) return window.navigateTo('home');
    
    const filtered = contentData.filter(item => item.title.toLowerCase().includes(query));
    const grid = document.getElementById('grid');
    if (grid) {
        grid.innerHTML = '';
        // Add "Exit Search" header
        const searchHeader = document.createElement('div');
        searchHeader.style.cssText = "grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--glass-border); margin-bottom: 20px;";
        searchHeader.innerHTML = `
            <p style="color:#888;">Showing results for: <span style="color:var(--accent-cyan); font-weight:800;">"${query}"</span></p>
            <button onclick="window.navigateTo('home')" class="btn-outline" style="width:auto; margin:0; padding: 8px 15px; font-size:0.8rem; border-color:var(--accent-hot); color:var(--accent-hot);">Exit Search</button>
        `;
        grid.appendChild(searchHeader);
        
        renderGrid(filtered, grid);
        if (filtered.length === 0) {
            const noRes = document.createElement('p');
            noRes.style.cssText = "padding:40px; color:#666; text-align:center; width:100%; grid-column: 1/-1;";
            noRes.innerText = `No results found for "${query}"`;
            grid.appendChild(noRes);
        }
    }
};

function renderView(view, params) {
    const container = document.getElementById('content-render');
    if(!container) return;
    container.innerHTML = '';
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebar-overlay').classList.remove('active');

    if (view === 'home' || !view) {
        container.innerHTML = `
            <div class="home-hero">
                <img src="https://i.ibb.co/sYqrnYZ/62e5a60b-c773-4795-8bd9-04c4639aa469.png" class="hero-branding">
            </div>
            <div class="search-bar-container" style="padding: 0 20px; margin-bottom: 25px; display: flex; gap: 10px; max-width: 800px; margin-left: auto; margin-right: auto;">
                <input type="text" id="search-input" placeholder="Search for movies..." style="flex: 1; margin: 0; background: var(--glass); border: 1px solid var(--glass-border); color: white; border-radius: 8px; padding: 12px;" onkeypress="if(event.key==='Enter') window.triggerSearch()">
                <button onclick="window.triggerSearch()" class="btn-glow" style="width: auto; padding: 0 25px; margin: 0; height: 45px;">Search</button>
            </div>
            <div class="movie-grid" id="grid"></div>`;
        renderGrid(contentData, document.getElementById('grid'));
    } else if (view === 'favorites') {
        if (!currentUser) return window.openAuth();
        container.innerHTML = `<h2 style="padding:20px;">Favorite Movies</h2><div class="movie-grid" id="grid"></div>`;
        get(ref(db, `users/${currentUser.uid}/favorites`)).then(snap => {
            const favs = snap.val() || {};
            renderGrid(contentData.filter(m => favs[m.id]), document.getElementById('grid'));
        });
    } else if (view === 'admin') {
        renderAdminConsole(container);
    } else if (view === 'details') renderDetails(container, params);
    else if (view === 'contact') renderContact(container);
}

function renderGrid(items, target) {
    if (!target) return;
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `<img src="${item.thumb}"><div class="card-meta">${item.title}</div>`;
        card.onclick = () => window.navigateTo('details', item.id);
        target.appendChild(card);
    });
}

function renderDetails(container, id) {
    const item = contentData.find(m => m.id == id);
    if (!item) {
        setTimeout(() => {
            const retry = contentData.find(m => m.id == id);
            if (retry) renderDetails(container, id);
            else renderView('home');
        }, 500);
        return;
    }
    const rawEmbeds = Array.isArray(item.links) ? item.links : [item.links];
    const cleanEmbeds = rawEmbeds.map(link => {
        if (link.includes('<iframe')) {
            const match = link.match(/src=["']([^"']+)["']/);
            return match ? match[1] : link;
        }
        return link.trim();
    });
    const watchLinks = item.watchLink ? (Array.isArray(item.watchLink) ? item.watchLink : [item.watchLink]) : [];
    const randomItems = [...contentData].filter(m => m.id !== id).sort(() => 0.5 - Math.random()).slice(0, 4);
    container.innerHTML = `
        <div class="player-container">
            <p style="color:var(--accent-hot); font-size:0.75rem; margin-bottom:8px; display:flex; align-items:center; gap:5px; font-weight:600;">
                ⚠️ If the video doesn't load, use the external buttons below.
            </p>
            <div class="video-wrapper"><iframe src="${cleanEmbeds[0]}" id="main-player" style="width:100%; height:100%; border:none;" allowfullscreen></iframe></div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:25px;">
                <div>
                    <h1 style="font-weight:800; font-size:1.8rem;">${item.title}</h1>
                    <p style="color:var(--accent-cyan); font-size:0.8rem; font-weight:600; margin-top:5px;">ID: ${item.fnmCode || 'FNM-0000'}</p>
                </div>
            </div>
            <p style="color:#888; margin:15px 0; line-height:1.6;">${item.desc || 'No description available.'}</p>
            <div style="display:flex; gap:10px; margin-bottom:15px; overflow-x:auto; padding-bottom:5px;">
                ${cleanEmbeds.map((l, i) => `<button class="btn-outline" style="width:auto; padding:10px 25px; white-space:nowrap;" onclick="document.getElementById('main-player').src='${l}'">Server ${i+1}</button>`).join('')}
                <button class="btn-glow" style="width:auto; padding:10px 25px; white-space:nowrap;" onclick="window.toggleFav('${item.id}')">★ Favorite</button>
            </div>
            ${watchLinks.length > 0 ? `
                <div style="margin: 30px 0;">
                    <p style="color:#666; font-size:0.7rem; text-align:center; margin-bottom:12px;">External Video Sources</p>
                    <div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center;">
                        ${watchLinks.map((link, idx) => {
                            const btnText = watchLinks.length === 1 ? "CLICK HERE TO WATCH" : `PART ${idx + 1}`;
                            return `<a href="${link}" target="_blank" class="btn-glow" style="display:block; text-decoration:none; text-align:center; flex: 1; min-width:140px;">${btnText}</a>`;
                        }).join('')}
                    </div>
                </div>
            ` : ''}
            <hr style="border:none; border-top:1px solid var(--glass-border); margin:40px 0;">
            <h3 style="margin-bottom:20px; font-weight:300; letter-spacing:2px;">MORE TO DISCOVER</h3>
            <div class="movie-grid" id="random-grid" style="padding:0;"></div>
        </div>`;
    renderGrid(randomItems, document.getElementById('random-grid'));
}

function renderContact(container) {
    container.innerHTML = `
        <div style="padding:40px; max-width:600px; margin:auto;">
            <h2>Contact Support</h2>
            <div id="chat-history" style="height:300px; overflow-y:auto; margin:20px 0; border:1px solid var(--glass-border); border-radius:14px; padding:15px; background:rgba(0,0,0,0.3);">
                <p style="color:#555; font-size:0.8rem;">Loading messages...</p>
            </div>
            <textarea id="msg-body" placeholder="Type your message here..." style="height:100px; margin-top:10px;"></textarea>
            <button onclick="window.sendMsg()" class="btn-glow">Send Message</button>
        </div>`;
    if (currentUser) {
        onValue(ref(db, `messages/${currentUser.uid}`), (snap) => {
            const hist = document.getElementById('chat-history');
            if (!hist) return;
            hist.innerHTML = '';
            const data = snap.val();
            if (data) {
                Object.values(data).forEach(m => {
                    const isMe = m.from === currentUser.name;
                    hist.innerHTML += `<div style="margin-bottom:10px; text-align:${isMe ? 'right' : 'left'};">
                        <span style="background:${isMe ? 'var(--accent-violet)' : '#333'}; padding:8px 12px; border-radius:10px; display:inline-block; font-size:0.9rem;">
                            ${m.text}
                        </span>
                    </div>`;
                });
                hist.scrollTop = hist.scrollHeight;
            } else {
                hist.innerHTML = '<p style="color:#555;">No messages yet.</p>';
            }
        });
    }
}

function renderAdminConsole(container) {
    if (currentUser?.role !== 'admin') return renderView('home');
    container.innerHTML = `
        <div style="padding:20px; max-width:1000px; margin:auto; display:grid; grid-template-columns: 1fr 1fr; gap:40px;">
            <div>
                <h3>Upload New Content</h3>
                <input id="adm-t" placeholder="Movie Title">
                <input id="adm-i" placeholder="Thumbnail Image URL">
                <textarea id="adm-w" placeholder="External Watch Links (One per line for Parts)"></textarea>
                <textarea id="adm-links" placeholder="Embed/Iframe Links (One per line)"></textarea>
                <textarea id="adm-x" placeholder="Movie Description"></textarea>
                <button onclick="window.saveContent()" class="btn-glow">Save Movie</button>
                <div id="adm-list" style="margin-top:30px; max-height:400px; overflow-y:auto;"></div>
            </div>
            <div>
                <h3>User Messages</h3>
                <div id="admin-chat-list" style="max-height:800px; overflow-y:auto;"></div>
            </div>
        </div>`;
    contentData.forEach(i => {
        document.getElementById('adm-list').innerHTML += `
        <div style="padding:10px; border-bottom:1px solid #222; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <span style="display:block; font-size:0.9rem;">${i.title}</span>
                <span style="font-size:0.7rem; color:var(--accent-cyan);">${i.fnmCode || 'FNM-0000'}</span>
            </div>
            <span onclick="window.del('${i.id}')" style="color:red; cursor:pointer; font-size:0.8rem;">Delete</span>
        </div>`;
    });
    onValue(ref(db, "messages"), (snap) => {
        const chatList = document.getElementById('admin-chat-list');
        if (!chatList) return;
        chatList.innerHTML = '';
        const data = snap.val();
        if (data) {
            Object.keys(data).forEach(uid => {
                const msgs = Object.values(data[uid]);
                const last = msgs[msgs.length - 1];
                chatList.innerHTML += `
                    <div style="background:var(--glass); padding:15px; border-radius:14px; margin-bottom:10px; border:1px solid var(--glass-border);">
                        <p><strong>User ID: ${uid}</strong></p>
                        <p style="font-size:0.8rem; color:#888; margin:5px 0;">${last.text}</p>
                        <input id="reply-${uid}" placeholder="Type reply..." style="padding:8px; font-size:0.8rem;">
                        <button class="btn-glow" style="padding:8px; width:auto; font-size:0.7rem;" onclick="window.adminReply('${uid}')">Send Reply</button>
                    </div>`;
            });
        }
    });
}

onValue(moviesRef, (snap) => {
    const data = snap.val();
    contentData = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })).reverse() : [];
    if (!sessionStorage.getItem('aether_verified')) {
        const ageGate = document.getElementById('age-gate');
        if (ageGate) ageGate.classList.remove('hidden');
    } else {
        const shell = document.getElementById('app-shell');
        if (shell) {
            shell.classList.add('visible');
            shell.classList.remove('hidden');
        }
        if (isFirstLoad) {
            setTimeout(routeCurrentHash, 100);
            isFirstLoad = false;
        }
    }
    if (currentUser) {
        const display = document.getElementById('user-display');
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const adminNav = document.getElementById('admin-nav');
        if (display) display.innerText = `Logged in as: ${currentUser.name}`;
        if (loginBtn) loginBtn.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (currentUser.role === 'admin' && adminNav) adminNav.classList.remove('hidden');
    }
    hideLoader();
});

window.confirmAge = () => { sessionStorage.setItem('aether_verified', 'true'); location.reload(); };
window.logout = () => { localStorage.removeItem('aether_session'); window.showToast("Logged out successfully"); setTimeout(()=>location.reload(), 1000); };
window.openAuth = () => document.getElementById('auth-modal').classList.remove('hidden');
window.closeAuth = () => document.getElementById('auth-modal').classList.add('hidden');
window.toggleFav = async (id) => {
    if (!currentUser) return window.openAuth();
    const fRef = ref(db, `users/${currentUser.uid}/favorites/${id}`);
    const s = await get(fRef);
    if (s.exists()) { await remove(fRef); window.showToast("Removed from Favorites"); }
    else { await set(fRef, true); window.showToast("Added to Favorites"); }
};
window.saveContent = async () => {
    const t = document.getElementById('adm-t').value, i = document.getElementById('adm-i').value, 
          lText = document.getElementById('adm-links').value, x = document.getElementById('adm-x').value,
          wText = document.getElementById('adm-w').value;
    if (!t || !i || !lText) return window.showToast("Please provide required fields", true);
    const l = lText.split('\n').filter(link => link.trim() !== '');
    const w = wText.split('\n').filter(link => link.trim() !== '');
    const fnmCode = `FNM-${String(contentData.length + 1).padStart(4, '0')}`;
    await push(moviesRef, { title: t, thumb: i, links: l, desc: x, watchLink: w, fnmCode: fnmCode });
    window.showToast(`Movie saved: ${fnmCode}`);
    renderView('admin');
};
window.del = (id) => confirm("Permanently delete this item?") && remove(ref(db, `movies/${id}`));
window.sendMsg = () => {
    if (!currentUser) return window.showToast("Please Sign In first", true);
    const text = document.getElementById('msg-body').value;
    if (!text) return;
    push(ref(db, `messages/${currentUser.uid}`), { from: currentUser.name, text, time: Date.now() });
    document.getElementById('msg-body').value = '';
    window.showToast("Message sent to support.");
};
window.adminReply = (uid) => {
    const text = document.getElementById(`reply-${uid}`).value;
    if (!text) return;
    push(ref(db, `messages/${uid}`), { from: "Admin", text, time: Date.now() });
    document.getElementById(`reply-${uid}`).value = '';
    window.showToast("Reply sent successfully.");
};
