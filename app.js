// State management
let supabase = null;
let currentTab = 'dashboard';
let galleryItems = [];
let videoItems = [];

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const pageTitle = document.getElementById('page-title');
const uploadModal = document.getElementById('upload-modal');
const videoModal = document.getElementById('video-modal');
const configForm = document.getElementById('config-form');
const uploadForm = document.getElementById('upload-form');
const videoForm = document.getElementById('video-form');
const fileInput = document.getElementById('file-input');
const dropArea = document.getElementById('drop-area');
const filePreview = document.getElementById('file-preview');

// Initialize App
function init() {
    loadConfig();
    setupEventListeners();
    if (supabase) {
        refreshData();
    } else {
        switchTab('settings');
        alert('Please configure your Supabase settings first.');
    }
}

// Load Supabase Config from LocalStorage
function loadConfig() {
    let url = null;
    let key = null;
    
    try {
        url = localStorage.getItem('supa_url');
        key = localStorage.getItem('supa_key');
    } catch (e) {
        console.warn('localStorage not accessible', e);
    }
    
    // Fallback to configured keys if not in localStorage
    if (!url || !key) {
        url = 'https://doqquwlomcaqtabwrqpy.supabase.co';
        key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcXF1d2xvbWNhcXRhYndycXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTQ4NTcsImV4cCI6MjA5MzkzMDg1N30.bSX1gqAcR61yF_UXfXxrmNIi4P756fvU7D9WZzRQ4Dk';
        try {
            localStorage.setItem('supa_url', url);
            localStorage.setItem('supa_key', key);
        } catch (e) {
            console.warn('Could not save to localStorage', e);
        }
    }
    
    if (url && key) {
        document.getElementById('supa-url').value = url;
        document.getElementById('supa-key').value = key;
        try {
            supabase = window.supabase.createClient(url, key);
        } catch (e) {
            console.error('Supabase initialization failed', e);
        }
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    // Modals
    document.getElementById('open-upload-modal').onclick = () => uploadModal.classList.add('active');
    document.getElementById('open-video-modal').onclick = () => videoModal.classList.add('active');
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => {
            uploadModal.classList.remove('active');
            videoModal.classList.remove('active');
        };
    });

    // Config Form
    configForm.onsubmit = (e) => {
        e.preventDefault();
        const url = document.getElementById('supa-url').value;
        const key = document.getElementById('supa-key').value;
        localStorage.setItem('supa_url', url);
        localStorage.setItem('supa_key', key);
        alert('Configuration saved! Refreshing...');
        window.location.reload();
    };

    // File Upload handling
    dropArea.onclick = () => fileInput.click();
    
    fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                filePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    };

    // Upload Form Submit
    uploadForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!supabase) return alert('Config Supabase first');
        
        const title = document.getElementById('img-title').value;
        const category = document.getElementById('img-category').value;
        const file = fileInput.files[0];
        
        if (!file) return alert('Please select a file');

        const submitBtn = document.getElementById('submit-upload');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';

        try {
            // 1. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `gallery/${fileName}`;

            let { error: uploadError, data } = await supabase.storage
                .from('gallery')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('gallery')
                .getPublicUrl(filePath);

            // 3. Save to Database
            const { error: dbError } = await supabase
                .from('site_images')
                .insert([{
                    name: title,
                    url: publicUrl,
                    category: category,
                    is_video: false
                }]);

            if (dbError) throw dbError;

            alert('Uploaded successfully!');
            uploadModal.classList.remove('active');
            uploadForm.reset();
            filePreview.innerHTML = '';
            refreshData();
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload to Supabase';
        }
    };

    // Video Form Submit
    videoForm.onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('video-title').value;
        const url = document.getElementById('video-url').value;

        try {
            const { error } = await supabase
                .from('site_images')
                .insert([{
                    name: title,
                    url: url,
                    category: 'training-videos',
                    is_video: true
                }]);

            if (error) throw error;
            alert('Video link saved!');
            videoModal.classList.remove('active');
            videoForm.reset();
            refreshData();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    // Filter handling
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderGallery(btn.getAttribute('data-category'));
        };
    });
}

// Switch Tabs
function switchTab(tabId) {
    currentTab = tabId;
    navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
    });
    tabContents.forEach(tab => {
        tab.classList.toggle('active', tab.id === `${tabId}-tab`);
    });
    pageTitle.textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
}

// Refresh all data
async function refreshData() {
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('site_images')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        galleryItems = data.filter(item => !item.is_video);
        videoItems = data.filter(item => item.is_video || item.category === 'training-videos');

        updateDashboard();
        renderGallery('all');
        renderVideos();
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

function updateDashboard() {
    document.getElementById('total-images').textContent = galleryItems.length;
    document.getElementById('total-videos').textContent = videoItems.length;
    
    const recentGrid = document.getElementById('recent-grid');
    if (galleryItems.length === 0) {
        recentGrid.innerHTML = '<div class="empty-state">No uploads yet.</div>';
        return;
    }

    recentGrid.innerHTML = galleryItems.slice(0, 4).map(item => `
        <div class="gallery-card">
            <img src="${item.url}" class="card-img" alt="${item.name}">
            <div class="card-body">
                <h4>${item.name}</h4>
                <span class="card-tag">${item.category}</span>
            </div>
        </div>
    `).join('');
}

function renderGallery(filter = 'all') {
    const grid = document.getElementById('gallery-grid');
    const filtered = filter === 'all' 
        ? galleryItems 
        : galleryItems.filter(i => i.category === filter);

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state">No images found in this category.</div>';
        return;
    }

    grid.innerHTML = filtered.map(item => `
        <div class="gallery-card">
            <img src="${item.url}" class="card-img" alt="${item.name}">
            <div class="card-body">
                <h4>${item.name}</h4>
                <span class="card-tag">${item.category}</span>
            </div>
            <div class="card-actions">
                <button class="action-btn delete" onclick="deleteItem('${item.id}', '${item.url}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderVideos() {
    const grid = document.getElementById('video-grid');
    if (videoItems.length === 0) {
        grid.innerHTML = '<div class="empty-state">No videos found.</div>';
        return;
    }

    grid.innerHTML = videoItems.map(item => `
        <div class="gallery-card">
            <div class="card-img" style="background: #1e293b; display: flex; align-items: center; justify-content: center; color: white;">
                <i data-lucide="video" style="width: 48px; height: 48px;"></i>
            </div>
            <div class="card-body">
                <h4>${item.name}</h4>
                <a href="${item.url}" target="_blank" style="font-size: 0.7rem; color: #3b82f6; text-decoration: none; word-break: break-all;">${item.url}</a>
            </div>
            <div class="card-actions">
                <button class="action-btn delete" onclick="deleteItem('${item.id}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

async function deleteItem(id, url) {
    if (!confirm('Are you sure you want to delete this?')) return;

    try {
        // Delete from DB
        const { error: dbError } = await supabase
            .from('site_images')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        // If it's an image, we should ideally delete from storage too
        // But we need the file path. For now, DB deletion is primary.

        alert('Deleted successfully');
        refreshData();
    } catch (err) {
        alert('Delete failed: ' + err.message);
    }
}

// Start app
document.addEventListener('DOMContentLoaded', init);
