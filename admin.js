// COMMUJ Admin Panel JavaScript

const XAMPP_BASE_URL = 'http://localhost/comahs/';
const API_URL = location.protocol === 'file:' ? XAMPP_BASE_URL + 'admin_api.php' : 'admin_api.php';
let currentAdmin = null;

const realFetch = window.fetch.bind(window);
const useStaticAdminApi = false;

function resolveAdminUrl(url) {
    if (!url) return '';
    if (/^(https?:|mailto:|tel:|data:|blob:)/i.test(url)) return url;
    const cleanUrl = url.replace(/^\/+/, '');
    if (location.protocol === 'file:') {
        return XAMPP_BASE_URL + cleanUrl;
    }
    return cleanUrl;
}

window.fetch = function(resource, options = {}) {
    const url = String(resource);
    if (!useStaticAdminApi || !url.includes(API_URL)) {
        return realFetch(resource, options);
    }

    const params = new URL(url, location.href).searchParams;
    const action = params.get('action');
    const method = (options.method || 'GET').toUpperCase();
    let payload = {};

    try {
        payload = options.body ? JSON.parse(options.body) : {};
    } catch (error) {
        payload = {};
    }

    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(handleStaticAdminApi(action, method, payload, params))
    });
};

function readStore(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function writeStore(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function addStoreItem(key, item) {
    const items = readStore(key);
    const savedItem = {
        id: Date.now(),
        created_at: new Date().toISOString(),
        ...item
    };
    items.push(savedItem);
    writeStore(key, items);
    return savedItem;
}

function deleteStoreItem(key, id) {
    const items = readStore(key).filter(item => Number(item.id) !== Number(id));
    writeStore(key, items);
}

function handleStaticAdminApi(action, method, payload, params) {
    switch (action) {
        case 'getAnnouncements':
            return { success: true, data: readStore('adminAnnouncements') };
        case 'createAnnouncement':
            addStoreItem('adminAnnouncements', payload);
            return { success: true, message: 'Saved locally' };
        case 'deleteAnnouncement':
            deleteStoreItem('adminAnnouncements', payload.announcement_id);
            return { success: true };

        case 'getEvents':
            return { success: true, data: readStore('adminEvents') };
        case 'getEventRegistrations':
            return { success: true, data: readStore('registeredEvents') };
        case 'createEvent':
            addStoreItem('adminEvents', payload);
            return { success: true, message: 'Saved locally' };
        case 'deleteEvent':
            deleteStoreItem('adminEvents', payload.event_id);
            return { success: true };

        case 'getLeaders':
            return { success: true, data: readStore('publicLeaders') };
        case 'addLeader':
            addStoreItem('publicLeaders', payload);
            return { success: true, message: 'Saved locally' };
        case 'deleteLeader':
            deleteStoreItem('publicLeaders', payload.leader_id);
            return { success: true };

        case 'getGallery':
            return { success: true, data: readStore('galleryItems') };
        case 'addGalleryItem':
            addStoreItem('galleryItems', {
                ...payload,
                imageData: payload.image_url,
                imageUrl: payload.image_url
            });
            return { success: true, message: 'Saved locally' };
        case 'deleteGalleryItem':
            deleteStoreItem('galleryItems', payload.gallery_id);
            return { success: true };

        case 'getHadiths':
            return { success: true, data: readStore('adminHadiths') };
        case 'addHadith':
            addStoreItem('adminHadiths', payload);
            return { success: true, message: 'Saved locally' };
        case 'deleteHadith':
            deleteStoreItem('adminHadiths', payload.hadith_id);
            return { success: true };
        case 'getDashboardStats':
            return {
                success: true,
                data: {
                    members: readStore('allMembers').length,
                    students: readStore('allMembers').filter(member => (member.role || 'student') === 'student').length,
                    active_students: readStore('allMembers').filter(member => member.status === 'Active' || member.status === 'active').length,
                    announcements: readStore('adminAnnouncements').length,
                    events: readStore('adminEvents').length,
                    upcoming_events: readStore('adminEvents').length,
                    welfare_requests: readStore('welfareRequests').length,
                    pending_welfare: readStore('welfareRequests').filter(item => item.status === 'Pending Review' || item.status === 'pending').length,
                    payments: readStore('payments').length,
                    completed_payments: readStore('payments').filter(item => item.status === 'Completed' || item.status === 'completed').length,
                    payment_total: readStore('payments').filter(item => item.status === 'Completed' || item.status === 'completed').reduce((sum, item) => sum + Number(item.amount || 0), 0),
                    donations: readStore('donations').length,
                    completed_donations: readStore('donations').length,
                    donation_total: readStore('donations').reduce((sum, item) => sum + Number(item.amount || 0), 0),
                    resources: readStore('adminResources').length,
                    gallery: readStore('galleryItems').length,
                    leaders: readStore('publicLeaders').length,
                    hadiths: readStore('adminHadiths').length,
                    prayer_days: localStorage.getItem('adminPrayerTimes') ? 1 : 0
                }
            };
        case 'getDashboardDetail':
            return getStaticDashboardDetail(params.get('type'));
        case 'getWelfareRequests':
            return { success: true, data: readStore('welfareRequests') };
        case 'updateWelfareStatus': {
            const requests = readStore('welfareRequests').map(item =>
                Number(item.id) === Number(payload.request_id) ? { ...item, status: payload.status, notes: payload.notes || '' } : item
            );
            writeStore('welfareRequests', requests);
            return { success: true };
        }
        case 'getPrayerTimes':
            return { success: true, data: JSON.parse(localStorage.getItem('adminPrayerTimes')) || null };
        case 'setPrayerTimes':
            localStorage.setItem('adminPrayerTimes', JSON.stringify(payload));
            return { success: true };
        case 'getResources':
            return { success: true, data: readStore('adminResources') };
        case 'addResource':
            addStoreItem('adminResources', payload);
            return { success: true };
        case 'deleteResource':
            deleteStoreItem('adminResources', payload.resource_id);
            return { success: true };
        case 'seedSampleData':
            addStoreItem('adminAnnouncements', {
                title: 'Welcome to COMMUJ',
                content: 'This is a sample announcement. Open through XAMPP/PHP to save sample records into MySQL.',
                priority: 'medium',
                author_name: 'Admin'
            });
            addStoreItem('adminResources', {
                title: 'Sample Student Resource',
                description: 'This sample resource is saved in browser storage because the page is not running through XAMPP/PHP.',
                resource_type: 'article',
                category: 'Student Support',
                url: 'https://www.commuj.org'
            });
            addStoreItem('galleryItems', {
                title: 'Sample Gallery Item',
                description: 'This sample gallery item is saved locally. Use XAMPP/PHP for database saving.',
                image_url: 'https://via.placeholder.com/800x500.png?text=COMMUJ+Gallery',
                imageData: 'https://via.placeholder.com/800x500.png?text=COMMUJ+Gallery',
                imageUrl: 'https://via.placeholder.com/800x500.png?text=COMMUJ+Gallery'
            });
            return { success: true, message: 'Saved sample records locally' };

        default:
            return { success: false, message: 'Unsupported static action' };
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    loadAllData();
    setInterval(loadAllData, 30000); // Refresh every 30 seconds
});

// Check if user is authenticated as admin
function checkAdminAuth() {
    const adminUser = localStorage.getItem('currentUser');
    const adminRole = localStorage.getItem('currentRole');
    
    if (!adminUser || (adminRole !== 'admin' && adminRole !== 'executive')) {
        currentAdmin = {
            id: 1,
            username: 'Admin',
            fullName: 'Admin',
            role: 'admin'
        };
        localStorage.setItem('currentUser', JSON.stringify(currentAdmin));
        localStorage.setItem('currentRole', 'admin');
        document.getElementById('adminName').textContent = currentAdmin.fullName;
        return;
    }
    
    currentAdmin = JSON.parse(adminUser);
    document.getElementById('adminName').textContent = currentAdmin.fullName || currentAdmin.username;
}

// Logout
function logoutAdmin() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentRole');
    window.location.href = 'index.html';
}

// Switch between admin views
function switchAdminView(viewName) {
    // Hide all views
    document.querySelectorAll('.admin-content').forEach(view => {
        view.classList.remove('active');
    });
    
    // Remove active class from nav links
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected view
    const viewElement = document.getElementById(viewName + 'View');
    if (viewElement) {
        viewElement.classList.add('active');
        
        // Add active class to nav link
        const activeEvent = typeof event !== 'undefined' ? event : null;
        if (activeEvent && activeEvent.target) {
            activeEvent.target.closest('a')?.classList.add('active');
        }
        
        // Update page title
        const titles = {
            'dashboard': '<i class="fas fa-chart-line"></i> Dashboard',
            'announcements': '<i class="fas fa-bell"></i> Announcements',
            'events': '<i class="fas fa-calendar"></i> Events',
            'leadership': '<i class="fas fa-users"></i> Leadership',
            'gallery': '<i class="fas fa-images"></i> Gallery',
            'welfare': '<i class="fas fa-hands-helping"></i> Welfare',
            'prayer': '<i class="fas fa-mosque"></i> Prayer Times',
            'resources': '<i class="fas fa-folder-open"></i> Resources',
            'hadiths': '<i class="fas fa-book"></i> Hadiths'
        };
        document.getElementById('pageTitle').innerHTML = titles[viewName] || '';
        
        // Load view-specific data
        loadViewData(viewName);
    }
}

function loadViewData(viewName) {
    switch(viewName) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
        case 'events':
            loadEvents();
            break;
        case 'leadership':
            loadLeadership();
            break;
        case 'gallery':
            loadGallery();
            break;
        case 'hadiths':
            loadHadiths();
            break;
        case 'welfare':
            loadWelfareRequests();
            break;
        case 'prayer':
            loadPrayerAdmin();
            break;
        case 'resources':
            loadResourcesAdmin();
            break;
    }
}

// Load all data for dashboard
function loadAllData() {
    loadDashboardStats();
}

function loadDashboardStats() {
    fetch(`${API_URL}?action=getDashboardStats`)
    .then(response => response.json())
    .then(result => {
        const stats = result.data || {};
        setText('memberCount', stats.members || 0);
        setText('studentCount', stats.students || 0);
        setText('donationTotal', formatMoney(stats.donation_total || 0));
        setText('donationCount', stats.donations || 0);
        setText('paymentTotal', formatMoney(stats.payment_total || 0));
        setText('paymentCount', stats.payments || 0);
        setText('welfareCount', stats.welfare_requests || 0);
        setText('pendingWelfareCount', stats.pending_welfare || 0);
        setText('eventCount', stats.events || 0);
        setText('announcementCount', stats.announcements || 0);
        setText('resourceCount', stats.resources || 0);
        setText('galleryCount', stats.gallery || 0);
        setText('leaderCount', stats.leaders || 0);
        setText('hadithCount', stats.hadiths || 0);
        setText('prayerCount', stats.prayer_days || 0);
    })
    .catch(error => {
        console.error('Error loading dashboard stats:', error);
        showNotification('Error loading database dashboard stats', 'warning');
    });
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function formatMoney(value) {
    return '$' + Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function loadDashboardDetail(type) {
    setActiveDashboardCard(type);
    fetch(`${API_URL}?action=getDashboardDetail&type=${encodeURIComponent(type)}`)
    .then(response => response.json())
    .then(result => {
        if (!result.success) {
            throw new Error(result.message || 'Could not load database records');
        }
        renderDashboardDetail(type, result.data.rows || []);
    })
    .catch(error => {
        console.error('Error loading dashboard detail:', error);
        showNotification(error.message || 'Error loading database records', 'danger');
    });
}

function setActiveDashboardCard(type) {
    document.querySelectorAll('.dashboard-stat-card').forEach(card => {
        card.classList.remove('active');
    });
    const activeCard = document.querySelector(`.dashboard-stat-card[onclick*="'${type}'"]`);
    if (activeCard) {
        activeCard.classList.add('active');
    }
}

function renderDashboardDetail(type, rows) {
    const title = document.getElementById('dashboardDetailTitle');
    const container = document.getElementById('dashboardDetailTable');
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    title.innerHTML = `<i class="fas fa-table"></i> ${label} Records`;

    if (!rows.length) {
        container.innerHTML = '<p class="text-muted">No records found in the database for this section.</p>';
        return;
    }

    const columns = Object.keys(rows[0]);
    const showApprovalActions = type === 'payments' || type === 'donations';
    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-striped table-sm">
                <thead><tr>${columns.map(col => `<th>${col.replaceAll('_', ' ')}</th>`).join('')}${showApprovalActions ? '<th>Action</th>' : ''}</tr></thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>${columns.map(col => `<td>${formatCell(row[col])}</td>`).join('')}${showApprovalActions ? `<td>${renderApprovalAction(type, row)}</td>` : ''}</tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderApprovalAction(type, row) {
    const status = String(row.status || '').toLowerCase();
    if (status === 'completed') {
        return '<span class="badge bg-success">Approved</span>';
    }

    if (type === 'payments') {
        return `<button class="btn btn-sm btn-success" onclick="approvePaymentRecord(${row.id})">Approve</button>`;
    }

    if (type === 'donations') {
        return `<button class="btn btn-sm btn-success" onclick="approveDonationRecord(${row.id})">Approve</button>`;
    }

    return '-';
}

function approvePaymentRecord(paymentId) {
    if (!confirm('Approve this payment only after confirming the money was received. Continue?')) return;
    fetch(`${API_URL}?action=approvePayment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId })
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not approve payment');
        showNotification('Payment approved. Receipt can now be issued.', 'success');
        loadDashboardStats();
        loadDashboardDetail('payments');
    })
    .catch(error => showNotification(error.message, 'danger'));
}

function approveDonationRecord(donationId) {
    if (!confirm('Approve this donation only after confirming the money was received. Continue?')) return;
    fetch(`${API_URL}?action=approveDonation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donation_id: donationId })
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not approve donation');
        showNotification('Donation approved. Receipt can now be issued.', 'success');
        loadDashboardStats();
        loadDashboardDetail('donations');
    })
    .catch(error => showNotification(error.message, 'danger'));
}

function formatCell(value) {
    if (value === null || value === undefined || value === '') return '-';
    const text = String(value);
    if (text.startsWith('uploads/') || text.startsWith('http')) {
        return `<a href="${resolveAdminUrl(text)}" target="_blank">Open</a>`;
    }
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
}

function getStaticDashboardDetail(type) {
    const stores = {
        members: readStore('allMembers'),
        students: readStore('allMembers').filter(member => (member.role || 'student') === 'student'),
        donations: readStore('donations'),
        payments: readStore('payments'),
        welfare: readStore('welfareRequests'),
        events: readStore('adminEvents'),
        announcements: readStore('adminAnnouncements'),
        resources: readStore('adminResources'),
        gallery: readStore('galleryItems'),
        leadership: readStore('publicLeaders'),
        hadiths: readStore('adminHadiths'),
        prayer: localStorage.getItem('adminPrayerTimes') ? [JSON.parse(localStorage.getItem('adminPrayerTimes'))] : []
    };
    return { success: true, data: { type: type, rows: stores[type] || [] } };
}

// ============================================
// ANNOUNCEMENT FUNCTIONS
// ============================================

function createAnnouncement() {
    const title = document.getElementById('announcementTitle').value.trim();
    const content = document.getElementById('announcementContent').value.trim();
    const priority = document.getElementById('announcementPriority').value;
    const expires = document.getElementById('announcementExpires').value;
    
    if (!title || !content) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    const data = {
        title: title,
        content: content,
        priority: priority,
        author_id: currentAdmin.id || 1,
        expires_at: expires ? expires.replace('T', ' ') : null
    };
    
    fetch(`${API_URL}?action=createAnnouncement`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification('Announcement created successfully!', 'success');
            document.getElementById('announcementTitle').value = '';
            document.getElementById('announcementContent').value = '';
            document.getElementById('announcementExpires').value = '';
            loadAnnouncements();
            loadAnnouncementCount();
        } else {
            showNotification('Error creating announcement: ' + result.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error creating announcement', 'danger');
    });
}

function loadAnnouncements() {
    fetch(`${API_URL}?action=getAnnouncements`)
    .then(response => response.json())
    .then(result => {
        const container = document.getElementById('announcementsList');
        if (!result.data || result.data.length === 0) {
            container.innerHTML = '<p class="text-muted">No announcements yet.</p>';
            return;
        }
        
        container.innerHTML = result.data.map(ann => `
            <div class="item-card">
                <div class="item-info flex-grow-1">
                    <h5>${ann.title}</h5>
                    <p><strong>Priority:</strong> <span class="badge bg-${getPriorityColor(ann.priority)}">${ann.priority}</span></p>
                    <p>${ann.content.substring(0, 100)}${ann.content.length > 100 ? '...' : ''}</p>
                    <small class="text-muted">by ${ann.author_name || 'Admin'}</small>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAnnouncementItem(${ann.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('announcementsList').innerHTML = '<p class="text-danger">Error loading announcements</p>';
    });
}

function deleteAnnouncementItem(announcementId) {
    if (!confirm('Delete this announcement?')) return;
    
    fetch(`${API_URL}?action=deleteAnnouncement`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ announcement_id: announcementId })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification('Announcement deleted!', 'success');
            loadAnnouncements();
            loadAnnouncementCount();
        } else {
            showNotification('Error deleting announcement', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error deleting announcement', 'danger');
    });
}

function loadAnnouncementCount() {
    fetch(`${API_URL}?action=getAnnouncements`)
    .then(response => response.json())
    .then(result => {
        document.getElementById('announcementCount').textContent = (result.data || []).length;
    })
    .catch(error => console.error('Error:', error));
}

// ============================================
// EVENT FUNCTIONS
// ============================================

function createEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const eventDate = document.getElementById('eventDate').value;
    const location = document.getElementById('eventLocation').value.trim();
    const category = document.getElementById('eventCategory').value.trim() || 'general';
    const capacity = parseInt(document.getElementById('eventCapacity').value, 10) || 100;
    
    if (!title || !description || !eventDate) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    const data = {
        title: title,
        description: description,
        event_date: eventDate.replace('T', ' '),
        location: location,
        organizer_id: currentAdmin.id || 1,
        category: category,
        status: 'upcoming',
        max_participants: capacity
    };
    
    fetch(`${API_URL}?action=createEvent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification('Event created successfully!', 'success');
            document.getElementById('eventTitle').value = '';
            document.getElementById('eventDescription').value = '';
            document.getElementById('eventDate').value = '';
            document.getElementById('eventLocation').value = '';
            document.getElementById('eventCategory').value = '';
            document.getElementById('eventCapacity').value = '';
            loadEvents();
            loadEventCount();
        } else {
            showNotification('Error creating event: ' + result.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error creating event', 'danger');
    });
}

function loadEvents() {
    fetch(`${API_URL}?action=getEvents`)
    .then(response => response.json())
    .then(result => {
        const container = document.getElementById('eventsList');
        if (!result.data || result.data.length === 0) {
            container.innerHTML = '<p class="text-muted">No events scheduled yet.</p>';
            return;
        }
        
        container.innerHTML = result.data.map(evt => `
            <div class="item-card">
                <div class="item-info flex-grow-1">
                    <h5>${evt.title}</h5>
                    <p><strong>Date:</strong> ${new Date(evt.event_date).toLocaleString()}</p>
                    <p><strong>Location:</strong> ${evt.location || 'Not specified'}</p>
                    <p><strong>Category:</strong> ${evt.category || 'general'} | <strong>Capacity:</strong> ${evt.max_participants || 100}</p>
                    <p>${evt.description.substring(0, 100)}${evt.description.length > 100 ? '...' : ''}</p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteEventItem(${evt.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('eventsList').innerHTML = '<p class="text-danger">Error loading events</p>';
    });

    loadEventRegistrations();
}

function loadEventRegistrations() {
    fetch(`${API_URL}?action=getEventRegistrations`)
    .then(response => response.json())
    .then(result => {
        const container = document.getElementById('eventRegistrationsList');
        if (!container) return;

        const registrations = result.data || [];
        if (!registrations.length) {
            container.innerHTML = '<p class="text-muted">No students have registered for events yet.</p>';
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Event</th>
                            <th>Student</th>
                            <th>Student ID</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Registered At</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${registrations.map(reg => {
                            const studentName = reg.first_name
                                ? `${reg.first_name} ${reg.last_name || ''}`.trim()
                                : (reg.submittedBy || reg.studentName || 'Student');
                            return `
                                <tr>
                                    <td>${reg.event_title || reg.eventName || 'Event'}</td>
                                    <td>${studentName}</td>
                                    <td>${reg.student_number || reg.student_id || '-'}</td>
                                    <td>${reg.email || '-'}</td>
                                    <td><span class="badge bg-success">${reg.status || 'registered'}</span></td>
                                    <td>${reg.registered_at ? new Date(reg.registered_at).toLocaleString() : (reg.registrationDate || '-')}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    })
    .catch(error => {
        console.error('Event registration loading error:', error);
        const container = document.getElementById('eventRegistrationsList');
        if (container) {
            container.innerHTML = '<p class="text-danger">Error loading event registrations.</p>';
        }
    });
}

function deleteEventItem(eventId) {
    if (!confirm('Delete this event?')) return;
    
    fetch(`${API_URL}?action=deleteEvent`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ event_id: eventId })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification('Event deleted!', 'success');
            loadEvents();
            loadEventCount();
        } else {
            showNotification('Error deleting event', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error deleting event', 'danger');
    });
}

function loadEventCount() {
    fetch(`${API_URL}?action=getEvents`)
    .then(response => response.json())
    .then(result => {
        document.getElementById('eventCount').textContent = (result.data || []).length;
    })
    .catch(error => console.error('Error:', error));
}

// ============================================
// LEADERSHIP FUNCTIONS
// ============================================

function addLeader() {
    const name = document.getElementById('leaderName').value.trim();
    const position = document.getElementById('leaderPosition').value.trim();
    const bio = document.getElementById('leaderBio').value.trim();
    const description = document.getElementById('leaderDescription').value.trim();
    const email = document.getElementById('leaderEmail').value.trim();
    const phone = document.getElementById('leaderPhone').value.trim();
    const photoUrl = document.getElementById('leaderPhotoUrl').value.trim();
    
    if (!name || !position) {
        showNotification('Name and position are required', 'warning');
        return;
    }
    
    const data = {
        name: name,
        position: position,
        bio: bio,
        description: description,
        email: email,
        phone: phone,
        photo_url: photoUrl,
        user_id: currentAdmin.id || 0
    };
    
    fetch(`${API_URL}?action=addLeader`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification('Leadership member added successfully!', 'success');
            document.getElementById('leaderName').value = '';
            document.getElementById('leaderPosition').value = '';
            document.getElementById('leaderBio').value = '';
            document.getElementById('leaderDescription').value = '';
            document.getElementById('leaderEmail').value = '';
            document.getElementById('leaderPhone').value = '';
            document.getElementById('leaderPhotoUrl').value = '';
            loadLeadership();
            loadLeadershipCount();
        } else {
            showNotification('Error adding leader: ' + result.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error adding leader', 'danger');
    });
}

function loadLeadership() {
    fetch(`${API_URL}?action=getLeaders`)
    .then(response => response.json())
    .then(result => {
        const container = document.getElementById('leadershipList');
        if (!result.data || result.data.length === 0) {
            container.innerHTML = '<p class="text-muted">No leadership members added yet.</p>';
            return;
        }
        
        container.innerHTML = result.data.map(leader => `
            <div class="item-card">
                <div class="item-info flex-grow-1">
                    <h5>${leader.name}</h5>
                    <p><strong>Position:</strong> ${leader.position}</p>
                    <p><strong>Email:</strong> ${leader.email || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${leader.phone || 'N/A'}</p>
                    <p>${leader.bio}</p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteLeaderItem(${leader.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('leadershipList').innerHTML = '<p class="text-danger">Error loading leaders</p>';
    });
}

function deleteLeaderItem(leaderId) {
    if (!confirm('Delete this leadership member?')) return;
    
    fetch(`${API_URL}?action=deleteLeader`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ leader_id: leaderId })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification('Leader deleted!', 'success');
            loadLeadership();
            loadLeadershipCount();
        } else {
            showNotification('Error deleting leader', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error deleting leader', 'danger');
    });
}

function loadLeadershipCount() {
    fetch(`${API_URL}?action=getLeaders`)
    .then(response => response.json())
    .then(result => {
        document.getElementById('leaderCount').textContent = (result.data || []).length;
    })
    .catch(error => console.error('Error:', error));
}

// ============================================
// GALLERY FUNCTIONS
// ============================================

function addGalleryItem() {
    const title = document.getElementById('galleryTitle').value.trim();
    const description = document.getElementById('galleryDescription').value.trim();
    const imageUrl = document.getElementById('galleryImageUrl').value.trim();
    const imageInput = document.getElementById('galleryImageUpload');
    
    if (!title || (!imageUrl && (!imageInput || !imageInput.files || imageInput.files.length === 0))) {
        showNotification('Title and an uploaded image or image URL are required', 'warning');
        return;
    }

    if (imageInput && imageInput.files && imageInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(e) {
            saveGalleryItemData(title, description, e.target.result);
        };
        reader.readAsDataURL(imageInput.files[0]);
        return;
    }

    saveGalleryItemData(title, description, imageUrl);
}

function saveGalleryItemData(title, description, imageUrl) {
    
    const data = {
        title: title,
        description: description,
        image_url: imageUrl,
        uploaded_by: currentAdmin.id || 0
    };
    
    fetch(`${API_URL}?action=addGalleryItem`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification('Gallery item added successfully!', 'success');
            document.getElementById('galleryTitle').value = '';
            document.getElementById('galleryDescription').value = '';
            document.getElementById('galleryImageUrl').value = '';
            const imageInput = document.getElementById('galleryImageUpload');
            const preview = document.getElementById('galleryImagePreview');
            if (imageInput) imageInput.value = '';
            if (preview) {
                preview.src = '';
                preview.classList.add('d-none');
            }
            loadGallery();
            loadGalleryCount();
        } else {
            showNotification('Error adding gallery item: ' + result.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error adding gallery item', 'danger');
    });
}

function previewAdminGalleryImage() {
    const imageInput = document.getElementById('galleryImageUpload');
    const preview = document.getElementById('galleryImagePreview');
    if (!imageInput || !preview) return;

    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('d-none');
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        preview.src = '';
        preview.classList.add('d-none');
    }
}

function loadGallery() {
    fetch(`${API_URL}?action=getGallery`)
    .then(response => response.json())
    .then(result => {
        const container = document.getElementById('galleryList');
        if (!result.data || result.data.length === 0) {
            container.innerHTML = '<p class="text-muted">No gallery items yet.</p>';
            return;
        }
        
        container.innerHTML = result.data.map(item => `
            <div class="item-card">
                <div style="width: 60px; height: 60px; margin-right: 15px; overflow: hidden; border-radius: 5px; flex-shrink: 0;">
                    <img src="${item.image_url}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="item-info flex-grow-1">
                    <h5>${item.title}</h5>
                    <p>${item.description || 'No description'}</p>
                    <small class="text-muted">${new Date(item.created_at).toLocaleDateString()}</small>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteGalleryItem(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('galleryList').innerHTML = '<p class="text-danger">Error loading gallery items</p>';
    });
}

function deleteGalleryItem(galleryId) {
    if (!confirm('Delete this gallery item?')) return;
    
    fetch(`${API_URL}?action=deleteGalleryItem`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gallery_id: galleryId })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification('Gallery item deleted!', 'success');
            loadGallery();
            loadGalleryCount();
        } else {
            showNotification('Error deleting gallery item', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error deleting gallery item', 'danger');
    });
}

function loadGalleryCount() {
    fetch(`${API_URL}?action=getGallery`)
    .then(response => response.json())
    .then(result => {
        document.getElementById('galleryCount').textContent = (result.data || []).length;
    })
    .catch(error => console.error('Error:', error));
}

// ============================================
// HADITH FUNCTIONS
// ============================================

function addHadith() {
    const arabic = document.getElementById('hadithArabic').value.trim();
    const english = document.getElementById('hadithEnglish').value.trim();
    const reference = document.getElementById('hadithReference').value.trim();
    const source = document.getElementById('hadithSource').value.trim();
    const category = document.getElementById('hadithCategory').value.trim();
    
    if (!arabic || !english) {
        showNotification('Arabic and English texts are required', 'warning');
        return;
    }
    
    const data = {
        arabic: arabic,
        english: english,
        reference: reference,
        source: source,
        category: category,
        added_by: currentAdmin.id || 1
    };
    
    fetch(`${API_URL}?action=addHadith`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification('Hadith added successfully!', 'success');
            document.getElementById('hadithArabic').value = '';
            document.getElementById('hadithEnglish').value = '';
            document.getElementById('hadithReference').value = '';
            document.getElementById('hadithSource').value = '';
            document.getElementById('hadithCategory').value = '';
            loadHadiths();
        } else {
            showNotification('Error adding hadith: ' + result.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error adding hadith', 'danger');
    });
}

function loadHadiths() {
    fetch(`${API_URL}?action=getHadiths`)
    .then(response => response.json())
    .then(result => {
        const container = document.getElementById('hadithsList');
        if (!result.data || result.data.length === 0) {
            container.innerHTML = '<p class="text-muted">No hadiths added yet.</p>';
            return;
        }
        
        container.innerHTML = result.data.map(hadith => `
            <div class="item-card">
                <div class="item-info flex-grow-1">
                    <p style="font-size: 16px; margin: 10px 0; direction: rtl; font-weight: bold; color: #333;">
                        <i class="fas fa-quote-left"></i> ${hadith.arabic}
                    </p>
                    <p style="margin: 10px 0;"><strong>English:</strong> ${hadith.english}</p>
                    ${hadith.reference ? `<p style="margin: 5px 0;"><strong>Reference:</strong> ${hadith.reference}</p>` : ''}
                    ${hadith.source ? `<p style="margin: 5px 0;"><strong>Source:</strong> ${hadith.source}</p>` : ''}
                    ${hadith.category ? `<p style="margin: 5px 0;"><strong>Category:</strong> <span class="badge bg-info">${hadith.category}</span></p>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteHadithItem(${hadith.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('hadithsList').innerHTML = '<p class="text-danger">Error loading hadiths</p>';
    });
}

function deleteHadithItem(hadithId) {
    if (!confirm('Delete this hadith?')) return;
    
    fetch(`${API_URL}?action=deleteHadith`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hadith_id: hadithId })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification('Hadith deleted!', 'success');
            loadHadiths();
        } else {
            showNotification('Error deleting hadith', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error deleting hadith', 'danger');
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getPriorityColor(priority) {
    const colors = {
        'high': 'danger',
        'normal': 'primary',
        'low': 'secondary'
    };
    return colors[priority] || 'primary';
}

function showNotification(message, type) {
    const container = document.getElementById('notificationContainer');
    const alertId = 'alert-' + Date.now();
    
    const alert = document.createElement('div');
    alert.id = alertId;
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    container.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.remove();
        }
    }, 5000);
}

function loadWelfareRequests() {
    fetch(`${API_URL}?action=getWelfareRequests`)
    .then(response => response.json())
    .then(result => {
        const container = document.getElementById('welfareRequestsList');
        const requests = result.data || [];
        if (!requests.length) {
            container.innerHTML = '<p class="text-muted">No welfare requests submitted yet.</p>';
            return;
        }
        container.innerHTML = requests.map(req => `
            <div class="item-card">
                <div class="item-info flex-grow-1">
                    <h5>${req.type || req.category || 'Welfare Request'}</h5>
                    <p>${req.description || ''}</p>
                    <p><strong>Amount:</strong> ${req.amount || 'Not specified'}</p>
                    <p><strong>Submitted by:</strong> ${req.submittedBy || req.name || 'Member'}</p>
                    <span class="badge bg-${getWelfareColor(req.status)}">${req.status || 'Pending Review'}</span>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-success" onclick="updateWelfareStatus(${req.id}, 'Approved')">Approve</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="updateWelfareStatus(${req.id}, 'Rejected')">Reject</button>
                </div>
            </div>
        `).join('');
    });
}

function updateWelfareStatus(requestId, status) {
    fetch(`${API_URL}?action=updateWelfareStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, status: status, notes: '' })
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not update request');
        showNotification(`Welfare request ${status.toLowerCase()}.`, 'success');
        loadWelfareRequests();
    })
    .catch(error => showNotification(error.message, 'danger'));
}

function getWelfareColor(status) {
    if (status === 'Approved') return 'success';
    if (status === 'Rejected') return 'danger';
    return 'warning text-dark';
}

function loadPrayerAdmin() {
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('prayerDate').value = today;
    fetch(`${API_URL}?action=getPrayerTimes&date=${today}`)
    .then(response => response.json())
    .then(result => {
        const data = result.data || {};
        document.getElementById('prayerFajr').value = (data.fajr || '').slice(0, 5);
        document.getElementById('prayerDhuhr').value = (data.dhuhr || '').slice(0, 5);
        document.getElementById('prayerAsr').value = (data.asr || '').slice(0, 5);
        document.getElementById('prayerMaghrib').value = (data.maghrib || '').slice(0, 5);
        document.getElementById('prayerIsha').value = (data.isha || '').slice(0, 5);
        document.getElementById('prayerJummah').value = (data.jummah_time || '').slice(0, 5);
        renderPrayerPreview(data);
    });
}

function savePrayerTimes() {
    const data = {
        date: document.getElementById('prayerDate').value || new Date().toISOString().slice(0, 10),
        fajr: document.getElementById('prayerFajr').value,
        dhuhr: document.getElementById('prayerDhuhr').value,
        asr: document.getElementById('prayerAsr').value,
        maghrib: document.getElementById('prayerMaghrib').value,
        isha: document.getElementById('prayerIsha').value,
        jummah_time: document.getElementById('prayerJummah').value
    };
    fetch(`${API_URL}?action=setPrayerTimes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not save prayer times');
        showNotification('Prayer timetable saved.', 'success');
        renderPrayerPreview(data);
    })
    .catch(error => showNotification(error.message, 'danger'));
}

function renderPrayerPreview(data) {
    document.getElementById('prayerPreview').innerHTML = `
        <div class="row">
            ${['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah_time'].map(key => `
                <div class="col-md-4 mb-2"><strong>${key.replace('_time', '').toUpperCase()}:</strong> ${data[key] || 'Not set'}</div>
            `).join('')}
        </div>
    `;
}

function addResource() {
    const title = document.getElementById('resourceTitle').value.trim();
    const resourceType = document.getElementById('resourceType').value;
    const resourceFile = document.getElementById('resourceFile').files[0];
    const resourceUrl = document.getElementById('resourceUrl').value.trim();

    if (!title || !resourceType) {
        showNotification('Title and type are required.', 'warning');
        return;
    }
    if (!resourceFile && !resourceUrl) {
        showNotification('Please upload a file or enter a URL.', 'warning');
        return;
    }

    const data = new FormData();
    data.append('title', title);
    data.append('description', document.getElementById('resourceDescription').value.trim());
    data.append('resource_type', resourceType);
    data.append('category', document.getElementById('resourceCategory').value.trim());
    data.append('url', resourceUrl);
    if (resourceFile) {
        data.append('resource_file', resourceFile);
    }

    fetch(`${API_URL}?action=addResource`, {
        method: 'POST',
        body: data
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not add resource');
        ['resourceTitle', 'resourceDescription', 'resourceCategory', 'resourceUrl'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('resourceFile').value = '';
        showNotification('Resource added.', 'success');
        loadResourcesAdmin();
    })
    .catch(error => showNotification(error.message, 'danger'));
}

function loadResourcesAdmin() {
    fetch(`${API_URL}?action=getResources`)
    .then(response => response.json())
    .then(result => {
        const container = document.getElementById('resourcesList');
        const resources = result.data || [];
        if (!resources.length) {
            container.innerHTML = '<p class="text-muted">No resources added yet.</p>';
            return;
        }
        container.innerHTML = resources.map(res => `
            <div class="item-card">
                <div class="item-info flex-grow-1">
                    <h5>${res.title}</h5>
                    <p>${res.description || ''}</p>
                    <small>${res.resource_type || res.type || 'resource'} ${res.category ? '- ' + res.category : ''}</small>
                </div>
                <div class="item-actions">
                    ${res.url || res.file_path ? `<a class="btn btn-sm btn-outline-primary" href="${resolveAdminUrl(res.url || res.file_path)}" target="_blank">Open</a>` : ''}
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteResource(${res.id})">Delete</button>
                </div>
            </div>
        `).join('');
    });
}

function deleteResource(resourceId) {
    fetch(`${API_URL}?action=deleteResource`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resourceId })
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not delete resource');
        showNotification('Resource deleted.', 'success');
        loadResourcesAdmin();
    })
    .catch(error => showNotification(error.message, 'danger'));
}

function seedSampleDatabaseData() {
    fetch(`${API_URL}?action=seedSampleData`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) {
            throw new Error(result.message || 'Could not add sample database records');
        }
        showNotification('Sample database records added. Refresh phpMyAdmin Browse tab to see them.', 'success');
        loadDashboardStats();
    })
    .catch(error => {
        console.error('Sample data error:', error);
        showNotification(error.message || 'Could not add sample database records', 'danger');
    });
}
