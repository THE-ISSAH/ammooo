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

const ADMIN_CRED = { user: "@induwara", pass: "Charliebro123" };
let contentData = [];
let currentUser = JSON.parse(localStorage.getItem('aether_session')) || null;
let isSignUpMode = false;
let isFirstLoad = true;

const hideLoader = () => {
    document.getElementById('loading-screen').style.opacity = '0';
    setTimeout(() => document.getElementById('loading-screen').classList.add('hidden'), 1000);
};

// --- NAVIGATION CORE ---
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

// --- AUTH LOGIC ---
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
    if (!user || !pass || (isSignUpMode && !name)) return alert("Please fill all fields");

    if (!isSignUpMode && user === ADMIN_CRED.user && pass === ADMIN_CRED.pass) {
        return saveSession("Induwara", "admin", "admin_root");
    }

    const uid = user.replace(/\W/g, '');
    const userRef = ref(db, `users/${uid}`);
    const snap = await get(userRef);

    if (isSignUpMode) {
        if (snap.exists()) return alert("Username already taken");
        await set(userRef, { name, user, pass });
        saveSession(name, "user", uid);
    } else {
        if (!snap.exists() || snap.val().pass !== pass) return alert("Incorrect username or password");
        saveSession(snap.val().name, "user", uid);
    }
};

function saveSession(name, role, uid) {
    localStorage.setItem('aether_session', JSON.stringify({ name, role, uid }));
    location.reload();
}

// --- RENDER ENGINE ---
function renderView(view, params) {
    const container = document.getElementById('content-render');
    if(!container) return;
    container.innerHTML = '';
    document.getElementById('sidebar').classList.remove('active');

    if (view === 'home' || !view) {
        container.innerHTML = `<div class="movie-grid" id="grid"></div>`;
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

    const rawLinks = Array.isArray(item.links) ? item.links : [item.links];
    const cleanLinks = rawLinks.map(link => {
        if (link.includes('<iframe')) {
            const match = link.match(/src=["']([^"']+)["']/);
            return match ? match[1] : link;
        }
        return link.trim();
    });

    const randomItems = [...contentData].filter(m => m.id !== id).sort(() => 0.5 - Math.random()).slice(0, 4);

    container.innerHTML = `
        <div class="player-container">
            <p style="color:var(--accent-hot); font-size:0.75rem; margin-bottom:8px; display:flex; align-items:center; gap:5px; font-weight:600;">
                ⚠️ If the video doesn't load, scroll down and click the "CLICK HERE TO WATCH" button
            </p>
            <div class="video-wrapper"><iframe src="${cleanLinks[0]}" id="main-player" style="width:100%; height:100%; border:none;" allowfullscreen></iframe></div>
            
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:25px;">
                <div>
                    <h1 style="font-weight:800; font-size:1.8rem;">${item.title}</h1>
                    <p style="color:var(--accent-cyan); font-size:0.8rem; font-weight:600; margin-top:5px;">ID: ${item.fnmCode || 'FNM-0000'}</p>
                </div>
            </div>

            <p style="color:#888; margin:15px 0; line-height:1.6;">${item.desc || 'No description available for this title.'}</p>
            
            <div style="display:flex; gap:10px; margin-bottom:15px; overflow-x:auto;">
                ${cleanLinks.map((l, i) => `<button class="btn-outline" style="width:auto; padding:10px 25px;" onclick="document.getElementById('main-player').src='${l}'">Server ${i+1}</button>`).join('')}
                <button class="btn-glow" style="width:auto; padding:10px 25px;" onclick="window.toggleFav('${item.id}')">★ Favorite</button>
            </div>

            ${item.watchLink ? `
                <div style="margin: 30px 0;">
                    <p style="color:#666; font-size:0.7rem; text-align:center; margin-bottom:8px;">Having trouble watching? Click below</p>
                    <a href="${item.watchLink}" target="_blank" class="btn-glow" style="display:block; text-decoration:none; text-align:center;">CLICK HERE TO WATCH</a>
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
                hist.innerHTML = '<p style="color:#555;">No messages yet. Send a message to start a conversation.</p>';
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
                <input id="adm-w" placeholder="External Watch Link (Optional)">
                <textarea id="adm-links" placeholder="Stream Links (One per line)"></textarea>
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

// --- INITIALIZATION & SYNC ---
onValue(moviesRef, (snap) => {
    const data = snap.val();
    contentData = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })).reverse() : [];
    
    if (!sessionStorage.getItem('aether_verified')) {
        document.getElementById('age-gate').classList.remove('hidden');
    } else {
        document.getElementById('app-shell').classList.add('visible');
        document.getElementById('app-shell').classList.remove('hidden');
        if (isFirstLoad) {
            setTimeout(routeCurrentHash, 100);
            isFirstLoad = false;
        }
    }

    if (currentUser) {
        document.getElementById('user-display').innerText = `Logged in as: ${currentUser.name}`;
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
        if (currentUser.role === 'admin') document.getElementById('admin-nav').classList.remove('hidden');
    }
    hideLoader();
});

// --- HELPERS ---
window.confirmAge = () => { sessionStorage.setItem('aether_verified', 'true'); location.reload(); };
window.logout = () => { localStorage.removeItem('aether_session'); location.reload(); };
window.openAuth = () => document.getElementById('auth-modal').classList.remove('hidden');
window.closeAuth = () => document.getElementById('auth-modal').classList.add('hidden');

window.toggleFav = async (id) => {
    if (!currentUser) return window.openAuth();
    const fRef = ref(db, `users/${currentUser.uid}/favorites/${id}`);
    const s = await get(fRef);
    if (s.exists()) { await remove(fRef); alert("Removed from Favorites"); }
    else { await set(fRef, true); alert("Added to Favorites"); }
};

// AUTO CODE GENERATOR HELPER
function generateFnmCode() {
    // We base the number on the length of contentData
    // We add 1 because this is for the next item being uploaded
    const nextNum = contentData.length + 1;
    // Pad with zeros to keep the 4-digit format
    return `FNM-${String(nextNum).padStart(4, '0')}`;
}

window.saveContent = async () => {
    const t = document.getElementById('adm-t').value, i = document.getElementById('adm-i').value, 
          lText = document.getElementById('adm-links').value, x = document.getElementById('adm-x').value,
          w = document.getElementById('adm-w').value;
    
    if (!t || !i || !lText) return alert("Please provide title, image, and links");
    
    const l = lText.split('\n').filter(link => link.trim() !== '');
    const fnmCode = generateFnmCode(); // Generate the code here
    
    await push(moviesRef, { 
        title: t, 
        thumb: i, 
        links: l, 
        desc: x, 
        watchLink: w,
        fnmCode: fnmCode // Save the code to DB
    });
    
    alert(`Movie added successfully! Generated ID: ${fnmCode}`); 
    renderView('admin');
};

window.del = (id) => confirm("Are you sure you want to delete this?") && remove(ref(db, `movies/${id}`));

window.sendMsg = () => {
    if (!currentUser) return alert("Please Sign In first");
    const text = document.getElementById('msg-body').value;
    if (!text) return;
    push(ref(db, `messages/${currentUser.uid}`), { from: currentUser.name, text, time: Date.now() });
    document.getElementById('msg-body').value = '';
};

window.adminReply = (uid) => {
    const text = document.getElementById(`reply-${uid}`).value;
    if (!text) return;
    push(ref(db, `messages/${uid}`), { from: "Admin", text, time: Date.now() });
    document.getElementById(`reply-${uid}`).value = '';
    alert("Reply sent successfully");
};

window.handleSearch = (v) => {
    const f = contentData.filter(i => 
        i.title.toLowerCase().includes(v.toLowerCase()) || 
        (i.fnmCode && i.fnmCode.toLowerCase().includes(v.toLowerCase()))
    );
    const g = document.getElementById('grid');
    if (g) { g.innerHTML = ''; renderGrid(f, g); }
};