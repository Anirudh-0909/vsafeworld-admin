// ============================================
// V-Safe Admin Portal - App Logic
// ============================================

// Use a different variable name to avoid shadowing window.supabase from CDN
let sbClient = null;
let currentTab = 'dashboard';
let galleryItems = [];
let videoItems = [];

// Default Supabase credentials
const DEFAULT_SUPA_URL = 'https://doqquwlomcaqtabwrqpy.supabase.co';
const DEFAULT_SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcXF1d2xvbWNhcXRhYndycXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTQ4NTcsImV4cCI6MjA5MzkzMDg1N30.bSX1gqAcR61yF_UXfXxrmNIi4P756fvU7D9WZzRQ4Dk';

// ============================================
// Initialize App — runs on DOMContentLoaded
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    console.log('[V-Safe Admin] Initializing...');

    // Render icons first
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
        console.log('[V-Safe Admin] Lucide icons rendered.');
    } else {
        console.warn('[V-Safe Admin] Lucide not loaded!');
    }

    // Initialize Supabase
    initSupabase();

    // Setup all event listeners
    setupLogin();
    setupNavigation();
    setupModals();
    setupConfigForm();
    setupUploadForm();
    setupVideoForm();
    setupFilters();
    setupLogout();

    // Check session
    checkSession();

    // Load data if connected
    if (sbClient) {
        console.log('[V-Safe Admin] Supabase connected. Loading data...');
        refreshData();
    } else {
        console.warn('[V-Safe Admin] No Supabase connection. Showing settings.');
        switchTab('settings');
    }
});

// ============================================
// Supabase Connection
// ============================================
function initSupabase() {
    let url = DEFAULT_SUPA_URL;
    let key = DEFAULT_SUPA_KEY;

    // Try to get from localStorage (user may have overridden)
    try {
        const storedUrl = localStorage.getItem('supa_url');
        const storedKey = localStorage.getItem('supa_key');
        if (storedUrl && storedKey) {
            url = storedUrl;
            key = storedKey;
        }
    } catch (e) {
        console.warn('[V-Safe Admin] localStorage not available:', e);
    }

    // Fill settings form fields
    const urlInput = document.getElementById('supa-url');
    const keyInput = document.getElementById('supa-key');
    if (urlInput) urlInput.value = url;
    if (keyInput) keyInput.value = key;

    // Create client
    try {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            sbClient = window.supabase.createClient(url, key);
            console.log('[V-Safe Admin] Supabase client created successfully.');
        } else {
            console.error('[V-Safe Admin] window.supabase is not available. CDN may have failed to load.');
        }
    } catch (e) {
        console.error('[V-Safe Admin] Supabase init failed:', e);
    }
}

// ============================================
// Authentication (Login/Logout)
// ============================================
function setupLogin() {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    if (!loginForm) return;

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        // User provided credentials
        if (email === 'admin@vsafe.com' && password === 'admin@2026') {
            sessionStorage.setItem('vsafe_auth', 'true');
            document.getElementById('login-overlay').style.display = 'none';
            if (sbClient) refreshData();
        } else {
            loginError.textContent = 'Invalid email or password. Please try again.';
        }
    });
}

function checkSession() {
    const isAuth = sessionStorage.getItem('vsafe_auth');
    const overlay = document.getElementById('login-overlay');
    if (isAuth === 'true') {
        if (overlay) overlay.style.display = 'none';
    } else {
        if (overlay) overlay.style.display = 'flex';
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            sessionStorage.removeItem('vsafe_auth');
            window.location.reload();
        });
    }
}

// ============================================
// Navigation
// ============================================
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(function (item) {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            var tab = this.getAttribute('data-tab');
            if (tab) switchTab(tab);
        });
    });
}

function switchTab(tabId) {
    currentTab = tabId;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(function (item) {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update tab content visibility
    document.querySelectorAll('.tab-content').forEach(function (tab) {
        if (tab.id === tabId + '-tab') {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update page title
    var title = document.getElementById('page-title');
    if (title) {
        title.textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
    }
}

// ============================================
// Modals
// ============================================
function setupModals() {
    var uploadModal = document.getElementById('upload-modal');
    var videoModal = document.getElementById('video-modal');

    var openUploadBtn = document.getElementById('open-upload-modal');
    var openVideoBtn = document.getElementById('open-video-modal');

    if (openUploadBtn && uploadModal) {
        openUploadBtn.addEventListener('click', function () {
            uploadModal.classList.add('active');
        });
    }

    if (openVideoBtn && videoModal) {
        openVideoBtn.addEventListener('click', function () {
            videoModal.classList.add('active');
        });
    }

    // Close buttons
    document.querySelectorAll('.close-modal').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (uploadModal) uploadModal.classList.remove('active');
            if (videoModal) videoModal.classList.remove('active');
        });
    });

    // Close on backdrop click
    [uploadModal, videoModal].forEach(function (modal) {
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    });
}

// ============================================
// Settings / Config Form
// ============================================
function setupConfigForm() {
    var form = document.getElementById('config-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var url = document.getElementById('supa-url').value.trim();
        var key = document.getElementById('supa-key').value.trim();

        if (!url || !key) {
            alert('Please fill in both URL and Key.');
            return;
        }

        try {
            localStorage.setItem('supa_url', url);
            localStorage.setItem('supa_key', key);
        } catch (err) {
            console.warn('Could not save to localStorage');
        }

        alert('Configuration saved! Refreshing...');
        window.location.reload();
    });
}

// ============================================
// Image Upload Form
// ============================================
function setupUploadForm() {
    var form = document.getElementById('upload-form');
    var fileInput = document.getElementById('file-input');
    var dropArea = document.getElementById('drop-area');
    var filePreview = document.getElementById('file-preview');

    if (!form || !fileInput || !dropArea) return;

    // Click to select file
    dropArea.addEventListener('click', function () {
        fileInput.click();
    });

    // Show preview when file selected
    fileInput.addEventListener('change', function () {
        var file = fileInput.files[0];
        if (file && filePreview) {
            var reader = new FileReader();
            reader.onload = function (ev) {
                filePreview.innerHTML = '<img src="' + ev.target.result + '" alt="Preview">';
            };
            reader.readAsDataURL(file);
        }
    });

    // Submit
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!sbClient) {
            alert('Please configure Supabase first (go to Settings tab).');
            return;
        }

        var title = document.getElementById('img-title').value.trim();
        var category = document.getElementById('img-category').value;
        var file = fileInput.files[0];

        if (!file) {
            alert('Please select an image file.');
            return;
        }

        var submitBtn = document.getElementById('submit-upload');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Uploading...';
        }

        try {
            // 1. Upload to Storage
            var fileExt = file.name.split('.').pop();
            var fileName = Date.now() + '_' + Math.random().toString(36).substring(7) + '.' + fileExt;
            var filePath = 'gallery/' + fileName;

            var uploadResult = await sbClient.storage
                .from('gallery')
                .upload(filePath, file);

            if (uploadResult.error) throw uploadResult.error;

            // 2. Get Public URL
            var urlResult = sbClient.storage
                .from('gallery')
                .getPublicUrl(filePath);

            var publicUrl = urlResult.data.publicUrl;

            // 3. Save to Database
            var dbResult = await sbClient
                .from('site_images')
                .insert([{
                    name: title,
                    url: publicUrl,
                    category: category,
                    is_video: false
                }]);

            if (dbResult.error) throw dbResult.error;

            alert('Image uploaded successfully!');
            var uploadModal = document.getElementById('upload-modal');
            if (uploadModal) uploadModal.classList.remove('active');
            form.reset();
            if (filePreview) filePreview.innerHTML = '';
            refreshData();

        } catch (error) {
            console.error('[V-Safe Admin] Upload error:', error);
            alert('Upload error: ' + (error.message || JSON.stringify(error)));
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Upload to Supabase';
            }
        }
    });
}

// ============================================
// Video Form
// ============================================
function setupVideoForm() {
    var form = document.getElementById('video-form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!sbClient) {
            alert('Please configure Supabase first (go to Settings tab).');
            return;
        }

        var title = document.getElementById('video-title').value.trim();
        var url = document.getElementById('video-url').value.trim();

        if (!title || !url) {
            alert('Please fill in both title and URL.');
            return;
        }

        try {
            var result = await sbClient
                .from('site_images')
                .insert([{
                    name: title,
                    url: url,
                    category: 'training-videos',
                    is_video: true
                }]);

            if (result.error) throw result.error;

            alert('Video link saved!');
            var videoModal = document.getElementById('video-modal');
            if (videoModal) videoModal.classList.remove('active');
            form.reset();
            refreshData();

        } catch (error) {
            console.error('[V-Safe Admin] Video save error:', error);
            alert('Error: ' + (error.message || JSON.stringify(error)));
        }
    });
}

// ============================================
// Filter Buttons
// ============================================
function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(function (b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            renderGallery(btn.getAttribute('data-category'));
        });
    });
}

// ============================================
// Data Loading
// ============================================
async function refreshData() {
    if (!sbClient) return;

    try {
        var result = await sbClient
            .from('site_images')
            .select('*')
            .order('created_at', { ascending: false });

        if (result.error) throw result.error;

        var data = result.data || [];
        galleryItems = data.filter(function (item) { return !item.is_video; });
        videoItems = data.filter(function (item) { return item.is_video || item.category === 'training-videos'; });

        console.log('[V-Safe Admin] Loaded ' + galleryItems.length + ' images, ' + videoItems.length + ' videos.');

        updateDashboard();
        renderGallery('all');
        renderVideos();

    } catch (err) {
        console.error('[V-Safe Admin] Fetch error:', err);
    }
}

// ============================================
// Dashboard
// ============================================
function updateDashboard() {
    var totalImages = document.getElementById('total-images');
    var totalVideos = document.getElementById('total-videos');
    if (totalImages) totalImages.textContent = galleryItems.length;
    if (totalVideos) totalVideos.textContent = videoItems.length;

    var recentGrid = document.getElementById('recent-grid');
    if (!recentGrid) return;

    if (galleryItems.length === 0) {
        recentGrid.innerHTML = '<div class="empty-state">No uploads yet.</div>';
        return;
    }

    recentGrid.innerHTML = galleryItems.slice(0, 4).map(function (item) {
        return '<div class="gallery-card">' +
            '<img src="' + item.url + '" class="card-img" alt="' + (item.name || '') + '">' +
            '<div class="card-body">' +
                '<h4>' + (item.name || 'Untitled') + '</h4>' +
                '<span class="card-tag">' + (item.category || '') + '</span>' +
            '</div>' +
        '</div>';
    }).join('');
}

// ============================================
// Gallery Rendering
// ============================================
function renderGallery(filter) {
    var grid = document.getElementById('gallery-grid');
    if (!grid) return;

    var filtered = (filter === 'all')
        ? galleryItems
        : galleryItems.filter(function (i) { return i.category === filter; });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state">No images found in this category.</div>';
        return;
    }

    grid.innerHTML = filtered.map(function (item) {
        return '<div class="gallery-card">' +
            '<img src="' + item.url + '" class="card-img" alt="' + (item.name || '') + '">' +
            '<div class="card-body">' +
                '<h4>' + (item.name || 'Untitled') + '</h4>' +
                '<span class="card-tag">' + (item.category || '') + '</span>' +
            '</div>' +
            '<div class="card-actions">' +
                '<button class="action-btn delete" onclick="deleteItem(\'' + item.id + '\', \'' + item.url + '\')">' +
                    '&#128465;' +
                '</button>' +
            '</div>' +
        '</div>';
    }).join('');

    // Re-render lucide icons if available
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

// ============================================
// Videos Rendering
// ============================================
function renderVideos() {
    var grid = document.getElementById('video-grid');
    if (!grid) return;

    if (videoItems.length === 0) {
        grid.innerHTML = '<div class="empty-state">No videos found.</div>';
        return;
    }

    grid.innerHTML = videoItems.map(function (item) {
        return '<div class="gallery-card">' +
            '<div class="card-img" style="background:#1e293b;display:flex;align-items:center;justify-content:center;color:white;font-size:2rem;">&#9658;</div>' +
            '<div class="card-body">' +
                '<h4>' + (item.name || 'Untitled') + '</h4>' +
                '<a href="' + item.url + '" target="_blank" style="font-size:0.7rem;color:#3b82f6;text-decoration:none;word-break:break-all;">' + item.url + '</a>' +
            '</div>' +
            '<div class="card-actions">' +
                '<button class="action-btn delete" onclick="deleteItem(\'' + item.id + '\')">' +
                    '&#128465;' +
                '</button>' +
            '</div>' +
        '</div>';
    }).join('');

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

// ============================================
// Delete Item
// ============================================
async function deleteItem(id, url) {
    if (!confirm('Are you sure you want to delete this?')) return;
    if (!sbClient) {
        alert('Supabase not connected.');
        return;
    }

    try {
        var result = await sbClient
            .from('site_images')
            .delete()
            .eq('id', id);

        if (result.error) throw result.error;

        alert('Deleted successfully!');
        refreshData();
    } catch (err) {
        console.error('[V-Safe Admin] Delete error:', err);
        alert('Delete failed: ' + (err.message || JSON.stringify(err)));
    }
}
