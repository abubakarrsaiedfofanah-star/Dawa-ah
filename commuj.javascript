// COMMUJ - Complete JavaScript Implementation

// Global Variables
let currentUser = null;
let currentRole = null;
let registeredEvents = [];
let welfareRequests = [];
let donations = [];
let payments = [];
let leadershipRoles = [];
let allMembers = [];
let allEvents = [];

const frontendOnly = true;

function readList(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function getStaticApiData(action) {
    switch (action) {
        case 'getLeaders':
            return { success: true, data: readList('publicLeaders') };
        case 'getGallery':
            return { success: true, data: readList('galleryItems') };
        case 'getAllHadiths':
            return { success: true, data: readList('adminHadiths') };
        case 'getDailyHadith': {
            const hadiths = readList('adminHadiths');
            if (hadiths.length === 0) {
                return { success: false, data: null };
            }
            const index = new Date().getDate() % hadiths.length;
            return {
                success: true,
                data: hadiths[index],
                position: index + 1,
                total: hadiths.length
            };
        }
        default:
            return { success: false, data: [] };
    }
}

// PAGE NAVIGATION FUNCTIONS
function showLanding() {
    document.getElementById('landingPage').classList.add('active');
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('dashboardPage').classList.remove('active');
}

function showLoginPage() {
    document.getElementById('landingPage').classList.remove('active');
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('dashboardPage').classList.remove('active');
}

function activateAuthTab(tabName) {
    showLoginPage();
    const loginTrigger = document.querySelector('#loginTabBtn');
    const registerTrigger = document.querySelector('#registerTabBtn');
    if (!loginTrigger || !registerTrigger) return;
    if (tabName === 'register') {
        bootstrap.Tab.getOrCreateInstance(registerTrigger).show();
    } else {
        bootstrap.Tab.getOrCreateInstance(loginTrigger).show();
    }
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// LEADERSHIP AND GALLERY FUNCTIONS
function showLeaderDetails(name, position, bio, description, email, phone) {
    document.getElementById('leaderModalTitle').textContent = name + ' - ' + position;
    document.getElementById('leaderName').textContent = name;
    document.getElementById('leaderPosition').textContent = position;
    document.getElementById('leaderBio').textContent = bio;
    document.getElementById('leaderDescription').textContent = description;
    document.getElementById('leaderEmail').textContent = email;
    document.getElementById('leaderPhone').textContent = phone;

    const modal = new bootstrap.Modal(document.getElementById('leaderDetailsModal'));
    modal.show();
}

function showGalleryImage(title, description, imageUrl) {
    document.getElementById('galleryModalTitle').textContent = title;
    document.getElementById('galleryTitle').textContent = title;
    document.getElementById('galleryDescription').textContent = description;
    document.getElementById('galleryImage').src = imageUrl;

    const modal = new bootstrap.Modal(document.getElementById('galleryImageModal'));
    modal.show();
}

// LOAD DYNAMIC CONTENT FOR LANDING PAGE
function loadLandingPageContent() {
    loadLeadershipContent();
    loadGalleryContent();
}

function loadLeadershipContent() {
    const leadershipContainer = document.getElementById('leadershipContainer');
    if (!leadershipContainer) return;

    const leadershipRequest = frontendOnly
        ? Promise.resolve(getStaticApiData('getLeaders'))
        : fetch('admin_api.php?action=getLeaders').then(response => response.json());

    leadershipRequest
    .then(result => {
        let leaders = result.data || [];

        // Fallback to localStorage if no database results
        if (leaders.length === 0) {
            leaders = JSON.parse(localStorage.getItem('publicLeaders')) || [];
        }

        if (leaders.length === 0) {
            leadershipContainer.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">Leadership information will be updated soon.</p>
                </div>
            `;
            return;
        }

        leadershipContainer.innerHTML = leaders.map(leader => `
            <div class="col-md-6 col-lg-3 mb-4">
                <div class="leadership-card" onclick="showLeaderDetails('${leader.name}', '${leader.position}', '${leader.bio || ''}', '${leader.description || ''}', '${leader.email || ''}', '${leader.phone || ''}')">
                    <div class="leader-photo">
                        ${leader.photo_url ? `<img src="${leader.photo_url}" alt="${leader.name}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` : ''}
                        <i class="fas fa-user-circle fa-5x" ${leader.photo_url ? 'style="display: none;"' : ''}></i>
                    </div>
                    <h6>${leader.name}</h6>
                    <p class="position">${leader.position}</p>
                    <p class="bio">${leader.bio || ''}</p>
                </div>
            </div>
        `).join('');
    })
    .catch(error => {
        console.log('Dynamic content unavailable, using local data:', error);
        // Fallback to localStorage
        const publicLeaders = JSON.parse(localStorage.getItem('publicLeaders')) || [];

        if (publicLeaders.length === 0) {
            leadershipContainer.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">Leadership information will be updated soon.</p>
                </div>
            `;
            return;
        }

        leadershipContainer.innerHTML = publicLeaders.map(leader => `
            <div class="col-md-6 col-lg-3 mb-4">
                <div class="leadership-card" onclick="showLeaderDetails('${leader.name}', '${leader.position}', '${leader.bio}', '${leader.description}', '${leader.email}', '${leader.phone}')">
                    <div class="leader-photo">
                        ${leader.photoData ? `<img src="${leader.photoData}" alt="${leader.name}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` : ''}
                        <i class="fas fa-user-circle fa-5x" ${leader.photoData ? 'style="display: none;"' : ''}></i>
                    </div>
                    <h6>${leader.name}</h6>
                    <p class="position">${leader.position}</p>
                    <p class="bio">${leader.bio}</p>
                </div>
            </div>
        `).join('');
    });
}

function loadGalleryContent() {
    const galleryContainer = document.getElementById('galleryContainer');
    if (!galleryContainer) return;

    const galleryRequest = frontendOnly
        ? Promise.resolve(getStaticApiData('getGallery'))
        : fetch('admin_api.php?action=getGallery').then(response => response.json());

    galleryRequest
    .then(result => {
        let galleryItems = result.data || [];

        // Fallback to localStorage if no database results
        if (galleryItems.length === 0) {
            galleryItems = JSON.parse(localStorage.getItem('galleryItems')) || [];
        }

        if (galleryItems.length === 0) {
            galleryContainer.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">Gallery items will be added soon.</p>
                </div>
            `;
            return;
        }

        galleryContainer.innerHTML = galleryItems.map(item => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="gallery-item" onclick="showGalleryImage('${item.title}', '${item.description || ''}', '${item.image_url || item.imageData || item.imageUrl || ''}')">
                    <div class="gallery-image">
                        ${item.image_url ? `<img src="${item.image_url}" alt="${item.title}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` : ''}
                        <i class="fas ${item.icon || 'fa-images'} fa-4x" ${item.image_url ? 'style="display: none;"' : ''}></i>
                    </div>
                    <h6>${item.title}</h6>
                    <p class="text-muted">${(item.description || '').substring(0, 50)}${(item.description || '').length > 50 ? '...' : ''}</p>
                </div>
            </div>
        `).join('');
    })
    .catch(error => {
        console.log('Dynamic content unavailable, using local data:', error);
        // Fallback to localStorage
        const galleryItems = JSON.parse(localStorage.getItem('galleryItems')) || [];

        if (galleryItems.length === 0) {
            galleryContainer.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">Gallery items will be added soon.</p>
                </div>
            `;
            return;
        }

        galleryContainer.innerHTML = galleryItems.map(item => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="gallery-item" onclick="showGalleryImage('${item.title}', '${item.description}', '${item.imageData || item.imageUrl || ''}')">
                    <div class="gallery-image">
                        ${item.imageData ? `<img src="${item.imageData}" alt="${item.title}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` : ''}
                        <i class="fas ${item.icon || 'fa-images'} fa-4x" ${item.imageData ? 'style="display: none;"' : ''}></i>
                    </div>
                    <h6>${item.title}</h6>
                    <p class="text-muted">${item.description.substring(0, 50)}${item.description.length > 50 ? '...' : ''}</p>
                </div>
            </div>
        `).join('');
    });
}

// PUBLIC LEADERSHIP MANAGEMENT FUNCTIONS
function showPublicLeadershipModal() {
    loadPublicLeadershipList();
    const modal = new bootstrap.Modal(document.getElementById('publicLeadershipModal'));
    modal.show();
}

function showAddPublicLeaderModal() {
    // Clear form
    document.getElementById('addPublicLeaderForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('addPublicLeaderModal'));
    modal.show();
}

function savePublicLeader() {
    const name = document.getElementById('publicLeaderName').value.trim();
    const position = document.getElementById('publicLeaderPosition').value.trim();
    const bio = document.getElementById('publicLeaderBio').value.trim();
    const description = document.getElementById('publicLeaderDescription').value.trim();
    const email = document.getElementById('publicLeaderEmail').value.trim();
    const phone = document.getElementById('publicLeaderPhone').value.trim();
    const photoInput = document.getElementById('publicLeaderPhoto');

    if (!name || !position || !bio || !description || !email || !phone) {
        showNotification('Please fill in all required fields.', 'warning');
        return;
    }

    let publicLeaders = JSON.parse(localStorage.getItem('publicLeaders')) || [];

    const newLeader = {
        id: Date.now(),
        name: name,
        position: position,
        bio: bio,
        description: description,
        email: email,
        phone: phone,
        photoData: null
    };

    // Handle photo upload if provided
    if (photoInput && photoInput.files && photoInput.files.length > 0) {
        const file = photoInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            newLeader.photoData = e.target.result;
            publicLeaders.push(newLeader);
            localStorage.setItem('publicLeaders', JSON.stringify(publicLeaders));
            bootstrap.Modal.getInstance(document.getElementById('addPublicLeaderModal')).hide();
            loadPublicLeadershipList();
            loadLeadershipContent(); // Refresh landing page
            showNotification('Leader added successfully!', 'success');
        };
        reader.readAsDataURL(file);
    } else {
        publicLeaders.push(newLeader);
        localStorage.setItem('publicLeaders', JSON.stringify(publicLeaders));
        bootstrap.Modal.getInstance(document.getElementById('addPublicLeaderModal')).hide();
        loadPublicLeadershipList();
        loadLeadershipContent(); // Refresh landing page
        showNotification('Leader added successfully!', 'success');
    }
}

function loadPublicLeadershipList() {
    const container = document.getElementById('publicLeadershipList');
    const publicLeaders = JSON.parse(localStorage.getItem('publicLeaders')) || [];

    if (publicLeaders.length === 0) {
        container.innerHTML = '<p class="text-muted">No public leaders added yet.</p>';
        return;
    }

    container.innerHTML = publicLeaders.map(leader => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="card-title">${leader.name}</h6>
                        <p class="card-subtitle mb-2 text-muted">${leader.position}</p>
                        <p class="card-text small">${leader.bio}</p>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-danger" onclick="deletePublicLeader(${leader.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function deletePublicLeader(id) {
    if (!confirm('Are you sure you want to delete this leader?')) return;

    let publicLeaders = JSON.parse(localStorage.getItem('publicLeaders')) || [];
    publicLeaders = publicLeaders.filter(leader => leader.id !== id);
    localStorage.setItem('publicLeaders', JSON.stringify(publicLeaders));
    loadPublicLeadershipList();
    loadLeadershipContent(); // Refresh landing page
    showNotification('Leader deleted successfully!', 'success');
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    attachEventListeners();
    loadLandingPageContent(); // Load dynamic content for landing page
});

// INITIALIZATION
function initializeApp() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        currentRole = localStorage.getItem('currentRole');
        showDashboard();
    }

    // Load stored data
    registeredEvents = JSON.parse(localStorage.getItem('registeredEvents')) || [];
    welfareRequests = JSON.parse(localStorage.getItem('welfareRequests')) || [];
    donations = JSON.parse(localStorage.getItem('donations')) || [];
    payments = JSON.parse(localStorage.getItem('payments')) || [];
    leadershipRoles = JSON.parse(localStorage.getItem('leadershipRoles')) || [];
    allMembers = JSON.parse(localStorage.getItem('allMembers')) || [];
    allEvents = JSON.parse(localStorage.getItem('allEvents')) || [];
}

function attachEventListeners() {
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registrationForm')?.addEventListener('submit', handleRegistration);
    document.getElementById('forgotPasswordForm')?.addEventListener('submit', handleForgotPassword);
    document.getElementById('togglePassword')?.addEventListener('click', togglePasswordVisibility);
    document.getElementById('loginUsername')?.addEventListener('blur', populateLoginRoleFromUsername);
}

function populateLoginRoleFromUsername() {
    const username = document.getElementById('loginUsername').value.trim();
    const user = getRegisteredUser(username);
    if (user) {
        document.getElementById('userRole').value = user.role;
    }
}

// AUTHENTICATION
function getRegisteredUser(identifier) {
    return allMembers.find(member =>
        member.studentId === identifier ||
        member.email === identifier ||
        member.username === identifier
    );
}

function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('userRole').value;

    if (!username || !password || !role) {
        alert('Please fill in all fields.');
        return;
    }

    const user = getRegisteredUser(username);
    if (!user) {
        alert('No registered account found. Please register first.');
        return;
    }

    if (user.password !== password) {
        alert('Invalid password.');
        return;
    }

    if (user.role !== role) {
        alert('Role mismatch. Please login with the role you registered as: ' + (user.role || 'student') + '.');
        return;
    }

    currentUser = user;
    currentRole = role;

    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('currentRole', role);

    document.getElementById('loginForm').reset();
    showDashboard();
}

function handleRegistration(e) {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const studentId = document.getElementById('studentId').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const email = document.getElementById('email').value.trim();
    const role = document.getElementById('regRole').value;

    if (!role) {
        alert('Please select a role for registration.');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
    }

    if (getRegisteredUser(studentId) || getRegisteredUser(email)) {
        alert('A user with this Student ID or email is already registered.');
        return;
    }

    const newUser = {
        username: studentId,
        fullName: fullName,
        studentId: studentId,
        password: password,
        role: role,
        degreeType: document.getElementById('degreeType').value,
        course: document.getElementById('course').value,
        yearOfStudy: document.getElementById('yearOfStudy').value,
        gender: document.getElementById('gender').value,
        phone: document.getElementById('phone').value,
        email: email,
        nationality: document.getElementById('nationality').value,
        homeAddress: document.getElementById('homeAddress').value,
        emergencyContact: document.getElementById('emergencyContact').value,
        localGuardian: document.getElementById('localGuardian').value,
        passportPhoto: document.getElementById('passportPhoto').value ? document.getElementById('passportPhoto').value.split('\\').pop() : ''
    };

    allMembers.push(newUser);
    localStorage.setItem('allMembers', JSON.stringify(allMembers));

    alert('Registration successful! Please login using the role you registered with.');
    document.getElementById('registrationForm').reset();
    document.querySelector('[data-bs-target="#loginTab"]').click();
}

function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    alert('Password reset link sent to ' + email);
    document.getElementById('forgotPasswordForm').reset();
    const modal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
    modal?.hide();
}

function showForgotPassword() {
    const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
    modal.show();
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('loginPassword');
    const toggleBtn = document.getElementById('togglePassword');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        passwordInput.type = 'password';
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

function sendResetLink() {
    const email = document.getElementById('forgotEmail').value;
    alert('Password reset link sent to ' + email);
    bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal')).hide();
}

// DASHBOARD
function showDashboard() {
    document.getElementById('landingPage').classList.remove('active');
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('dashboardPage').classList.add('active');
    document.getElementById('userNameDisplay').textContent = currentUser.name || currentUser.username;

    if (currentRole === 'executive' || currentRole === 'admin') {
        document.getElementById('adminMenu').style.display = 'block';
    } else {
        document.getElementById('adminMenu').style.display = 'none';
    }

    switchView('dashboard');
    setTimeout(() => {
        loadDashboardData();
        initializeCharts();
    }, 500);
}

// VIEW SWITCHING
function switchView(viewName) {
    // Role-based access control
    const adminViews = ['memberDatabase', 'adminEvents', 'adminWelfare', 'leadership', 'reports'];
    if (adminViews.includes(viewName) && currentRole !== 'executive' && currentRole !== 'admin') {
        alert('Access denied. Admin privileges required.');
        return;
    }

    document.querySelectorAll('.view-container').forEach(view => {
        view.classList.remove('active');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const viewElement = document.getElementById(viewName + 'View');
    if (viewElement) {
        viewElement.classList.add('active');
    }

    const activeEvent = typeof event !== 'undefined' ? event : null;
    if (activeEvent && activeEvent.target) {
        activeEvent.target.classList.add('active');
    }

    loadViewData(viewName);
}

function loadViewData(viewName) {
    switch(viewName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'profile':
            loadProfileData();
            break;
        case 'membershipStatus':
            loadMembershipStatus();
            break;
        case 'prayer':
            loadPrayerTimes();
            break;
        case 'events':
            loadEventsData();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
        case 'resources':
            loadResources();
            break;
        case 'welfare':
            loadWelfareData();
            break;
        case 'dues':
            loadDuesData();
            break;
        case 'donations':
            loadDonationsData();
            break;
        case 'volunteer':
            loadVolunteerData();
            break;
        case 'memberDatabase':
            loadMemberDatabase();
            break;
        case 'adminEvents':
            loadAdminEvents();
            break;
        case 'adminWelfare':
            loadAdminWelfare();
            break;
        case 'leadership':
            loadLeadership();
            break;
        case 'reports':
            setTimeout(() => initializeCharts(), 300);
            break;
        case 'adminGallery':
            loadAdminGallery();
            break;
        case 'adminContact':
            loadAdminContact();
            break;
    }
}

// PROFILE
function loadProfileData() {
    const storedProfile = JSON.parse(localStorage.getItem('profileData')) || {};
    const profileData = currentUser || storedProfile || {};

    document.getElementById('profileName').textContent = profileData.fullName || profileData.name || 'Student Name';
    document.getElementById('profileFullName').textContent = profileData.fullName || profileData.name || '-';
    document.getElementById('profileStudentId').textContent = profileData.studentId || profileData.username || '-';
    document.getElementById('profileStudentIdDetail').textContent = profileData.studentId || profileData.username || '-';
    document.getElementById('profileUniversity').textContent = profileData.degreeType || '-';
    document.getElementById('profileDepartment').textContent = profileData.course || '-';
    document.getElementById('profileYear').textContent = profileData.yearOfStudy || '-';
    document.getElementById('profileGender').textContent = profileData.gender || '-';
    document.getElementById('profileEmail').textContent = profileData.email || '-';
    document.getElementById('profilePhone').textContent = profileData.phone || '-';
    document.getElementById('profileAddress').textContent = profileData.homeAddress || '-';
    document.getElementById('profileNationality').textContent = profileData.nationality || '-';
    document.getElementById('profileEmergencyContact').textContent = profileData.emergencyContact || '-';
    document.getElementById('profileLocalGuardian').textContent = profileData.localGuardian || '-';
}

function editProfile() {
    alert('Profile editing feature will be available soon.');
}

// MEMBERSHIP
function loadMembershipStatus() {
    const membershipInfo = {
        status: 'Active',
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString(),
        joinDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toLocaleDateString(),
        tier: 'Full Member'
    };

    const container = document.getElementById('membershipStatusDetails');
    if (container) {
        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <p><strong>Status:</strong> <span class="badge bg-success">${membershipInfo.status}</span></p>
                    <p><strong>Membership Expiry:</strong> ${membershipInfo.expiryDate}</p>
                    <p><strong>Member Since:</strong> ${membershipInfo.joinDate}</p>
                    <p><strong>Tier:</strong> ${membershipInfo.tier}</p>
                    <button class="btn btn-primary mt-3" onclick="renewMembership()">Renew Membership</button>
                </div>
            </div>
        `;
    }
}

function renewMembership() {
    alert('Membership renewal processed. Thank you!');
    document.getElementById('membershipStatusValue').textContent = 'Active';
}

// PRAYER TIMES
function loadPrayerTimes() {
    const prayerTimes = [
        { name: 'Fajr', time: '5:30 AM' },
        { name: 'Dhuhr', time: '1:15 PM' },
        { name: 'Asr', time: '4:45 PM' },
        { name: 'Maghrib', time: '7:20 PM' },
        { name: 'Isha', time: '9:00 PM' },
        { name: 'Jumu\'ah', time: '1:30 PM (Friday)' }
    ];

    const container = document.getElementById('prayerTimesDetails');
    if (container) {
        container.innerHTML = `<div class="row">${prayerTimes.map(prayer => `
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body text-center">
                        <h6>${prayer.name}</h6>
                        <p class="stat-value">${prayer.time}</p>
                    </div>
                </div>
            </div>
        `).join('')}</div>`;
    }
}

// EVENTS
function loadEventsData() {
    renderAvailableEvents();
    populateEventSelect();
    updateRegisteredEventsList();
}

function getAvailableEvents() {
    return [...allEvents, ...readList('adminEvents')].filter((event, index, list) => {
        const key = event.id || event.eventId || event.title || event.name;
        return index === list.findIndex(item => (item.id || item.eventId || item.title || item.name) === key);
    });
}

function renderAvailableEvents() {
    const container = document.getElementById('eventsList');
    if (!container) return;

    const events = getAvailableEvents();
    if (events.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted">No events have been added yet.</div>';
        return;
    }

    container.innerHTML = events.map(event => {
        const id = event.id || event.eventId || Date.now();
        const title = event.title || event.name || 'Untitled event';
        const date = event.event_date || event.date || 'Date not set';
        const location = event.location || 'Location not set';
        const description = event.description || '';

        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card event-card">
                    <div class="card-header event-header">
                        <h6 class="mb-0">${title}</h6>
                        <small>${date}</small>
                    </div>
                    <div class="card-body">
                        <p><i class="fas fa-map-marker-alt"></i> ${location}</p>
                        <p class="text-muted">${description}</p>
                        <button class="btn btn-sm btn-primary" onclick="registerEvent('${id}')">Register</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function populateEventSelect() {
    const select = document.getElementById('eventSelect');
    if (!select) return;

    const events = getAvailableEvents();
    select.innerHTML = '<option value="">Choose an event</option>' + events.map(event => {
        const id = event.id || event.eventId || event.title || event.name;
        const title = event.title || event.name || 'Untitled event';
        const date = event.event_date || event.date || '';
        return `<option value="${id}">${title}${date ? ' - ' + date : ''}</option>`;
    }).join('');
}

function showEventModal() {
    populateEventSelect();
    const modal = new bootstrap.Modal(document.getElementById('eventModal'));
    modal.show();
}

function registerEvent(eventId) {
    document.getElementById('eventSelect').value = eventId;
    const modal = new bootstrap.Modal(document.getElementById('eventModal'));
    modal.show();
}

function submitEventRegistration() {
    const eventSelect = document.getElementById('eventSelect').value;
    const attendeeCount = document.getElementById('attendeeCount').value;
    const requirements = document.getElementById('eventRequirements').value;

    if (!eventSelect) {
        showNotification('Please select an event', 'warning');
        return;
    }

    const selectedEvent = getAvailableEvents().find(event =>
        String(event.id || event.eventId || event.title || event.name) === String(eventSelect)
    );
    const eventName = selectedEvent ? (selectedEvent.title || selectedEvent.name) : eventSelect;

    const registration = {
        eventName: eventName,
        eventId: eventSelect,
        attendees: attendeeCount,
        requirements: requirements,
        date: selectedEvent ? (selectedEvent.event_date || selectedEvent.date || new Date().toLocaleDateString()) : new Date().toLocaleDateString(),
        registrationDate: new Date().toLocaleDateString(),
        status: 'Registered'
    };

    registeredEvents.push(registration);
    localStorage.setItem('registeredEvents', JSON.stringify(registeredEvents));

    showNotification('Event registration successful! ' + eventName, 'success');

    document.getElementById('eventForm').reset();
    bootstrap.Modal.getInstance(document.getElementById('eventModal')).hide();
    updateRegisteredEventsList();
}

function cancelEventRegistration(eventId) {
    registeredEvents = registeredEvents.filter(e => e.eventId !== eventId);
    localStorage.setItem('registeredEvents', JSON.stringify(registeredEvents));
    updateRegisteredEventsList();
    showNotification('Event registration cancelled.', 'info');
}

function updateRegisteredEventsList() {
    const tbody = document.getElementById('registeredEventsList');

    if (registeredEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No registered events</td></tr>';
        return;
    }

    tbody.innerHTML = registeredEvents.map(event => `
        <tr>
            <td>${event.eventName}</td>
            <td>${event.date}</td>
            <td><span class="badge bg-success">${event.status}</span></td>
            <td><button class="btn btn-sm btn-danger" onclick="cancelEventRegistration('${event.eventId}')">Cancel</button></td>
        </tr>
    `).join('');
}

function showCreateEventModal() {
    const modal = new bootstrap.Modal(document.getElementById('createEventModal'));
    modal.show();
}

function saveEvent() {
    const eventName = document.getElementById('createEventName').value;
    const eventDate = document.getElementById('createEventDate').value;
    const eventTime = document.getElementById('createEventTime').value;
    const eventLocation = document.getElementById('createEventLocation').value;
    const eventDescription = document.getElementById('createEventDescription').value;

    allEvents.push({
        name: eventName,
        date: eventDate,
        time: eventTime,
        location: eventLocation,
        description: eventDescription,
        createdDate: new Date().toLocaleDateString(),
        status: 'Upcoming'
    });

    localStorage.setItem('allEvents', JSON.stringify(allEvents));
    alert('Event created successfully!');
    bootstrap.Modal.getInstance(document.getElementById('createEventModal')).hide();
}

function viewEventDetails(eventName) {
    const event = allEvents.find(item => item.name === eventName || item.title === eventName);
    const details = event
        ? `${event.name || event.title}\nDate: ${event.date || event.event_date || 'Not set'}\nLocation: ${event.location || 'Not set'}\n${event.description || ''}`
        : 'Event details for: ' + eventName;
    alert(details);
}

function editEvent(eventName) {
    const event = allEvents.find(item => item.name === eventName || item.title === eventName);
    if (!event) {
        showNotification('Use Create New Event to add updated details.', 'info');
        return;
    }

    document.getElementById('newEventName').value = event.name || event.title || '';
    document.getElementById('newEventDate').value = event.date || '';
    document.getElementById('newEventTime').value = event.time || '';
    document.getElementById('newEventLocation').value = event.location || '';
    document.getElementById('newEventDescription').value = event.description || '';
    showCreateEventModal();
}

// ANNOUNCEMENTS
function loadAnnouncements() {
    const savedAnnouncements = readList('adminAnnouncements').map(ann => ({
        title: ann.title,
        text: ann.content,
        time: ann.created_at ? new Date(ann.created_at).toLocaleDateString() : 'Recently',
        icon: 'bell'
    }));

    const announcements = savedAnnouncements;

    const container = document.getElementById('announcementsContainer');
    if (container) {
        if (announcements.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No announcements have been added yet.</p>';
            return;
        }

        container.innerHTML = announcements.map(ann => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h5><i class="fas fa-${ann.icon}"></i> ${ann.title}</h5>
                        <small class="text-muted">${ann.time}</small>
                    </div>
                    <p>${ann.text}</p>
                </div>
            </div>
        `).join('');
    }
}

// RESOURCES
function loadResources() {
    const resources = [
        { title: 'Islamic Books', description: 'Digital collection of Islamic literature', icon: 'book', link: '#' },
        { title: 'Prayer Guides', description: 'Step-by-step prayer instruction videos', icon: 'video', link: '#' },
        { title: 'Quran Resources', description: 'Online Quran reading and study materials', icon: 'scroll', link: '#' },
        { title: 'Hadith Collection', description: 'Authentic Hadith compilations', icon: 'scroll', link: '#' },
        { title: 'Islamic Articles', description: 'Curated articles on Islamic topics', icon: 'newspaper', link: '#' },
        { title: 'Lectures', description: 'Recorded lectures by Islamic scholars', icon: 'microphone', link: '#' }
    ];

    const container = document.getElementById('resourcesGrid');
    if (container) {
        container.innerHTML = `<div class="row">${resources.map(res => `
            <div class="col-md-4 mb-3">
                <div class="card resource-card h-100">
                    <div class="card-body text-center">
                        <i class="fas fa-${res.icon} fa-3x mb-3" style="color: var(--primary-color);"></i>
                        <h6>${res.title}</h6>
                        <p class="text-muted small">${res.description}</p>
                        <a href="${res.link}" class="btn btn-sm btn-primary">Access</a>
                    </div>
                </div>
            </div>
        `).join('')}</div>`;
    }
}

// WELFARE
function loadWelfareData() {
    updateWelfareRequestsList();
}

function showWelfareModal() {
    const modal = new bootstrap.Modal(document.getElementById('welfareModal'));
    modal.show();
}

function submitWelfareRequest() {
    const type = document.getElementById('welfareType').value;
    const description = document.getElementById('welfareDescription').value;
    const amount = document.getElementById('welfareAmount').value;

    if (!type || !description) {
        alert('Please fill in all required fields');
        return;
    }

    welfareRequests.push({
        type: type,
        description: description,
        amount: amount || 'Not specified',
        dateSubmitted: new Date().toLocaleDateString(),
        status: 'Pending Review',
        submittedBy: currentUser.name
    });

    localStorage.setItem('welfareRequests', JSON.stringify(welfareRequests));
    alert('Welfare request submitted successfully!');

    document.getElementById('welfareForm').reset();
    bootstrap.Modal.getInstance(document.getElementById('welfareModal')).hide();
}

function updateWelfareRequestsList() {
    // Updates welfare list
}

function approveWelfare() {
    alert('Welfare request approved!');
}

function rejectWelfare() {
    if (confirm('Are you sure you want to reject this welfare request?')) {
        alert('Welfare request rejected.');
    }
}

// DUES & PAYMENTS
function loadDuesData() {
    const duesInfo = {
        amount: '$50',
        dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString(),
        status: 'Pending',
        description: 'Annual membership dues'
    };

    const container = document.getElementById('duesDetails');
    if (container) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Dues Payment Information</h5>
                </div>
                <div class="card-body">
                    <p><strong>Amount Due:</strong> ${duesInfo.amount}</p>
                    <p><strong>Due Date:</strong> ${duesInfo.dueDate}</p>
                    <p><strong>Status:</strong> <span class="badge bg-warning">${duesInfo.status}</span></p>
                    <p><strong>Description:</strong> ${duesInfo.description}</p>
                    <button class="btn btn-primary mt-3" onclick="showPaymentModal()">Pay Now</button>
                </div>
            </div>
        `;
    }
}

function showPaymentModal() {
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}

function processPayment() {
    const paymentType = document.getElementById('paymentType').value;
    const amount = document.getElementById('paymentAmount').value;

    if (!paymentType || !amount) {
        alert('Please fill in all payment details');
        return;
    }

    payments.push({
        type: paymentType,
        amount: amount,
        date: new Date().toLocaleDateString(),
        status: 'Completed',
        paymentMethod: 'Online',
        receiptNumber: 'RCP' + Date.now()
    });

    localStorage.setItem('payments', JSON.stringify(payments));
    alert('Payment processed successfully! Amount: $' + amount);

    document.getElementById('paymentForm').reset();
    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
}

// DONATIONS
function loadDonationsData() {
    const donationStats = [
        { name: 'Zakat', amount: '$500', description: 'Obligatory Charity', color: 'primary' },
        { name: 'Sadaqah', amount: '$250', description: 'Voluntary Charity', color: 'success' },
        { name: 'Community Fund', amount: '$150', description: 'Community Support', color: 'info' }
    ];

    const container = document.getElementById('donationStats');
    if (container) {
        container.innerHTML = donationStats.map(stat => `
            <div class="col-md-4 mb-3">
                <div class="card">
                    <div class="card-body text-center">
                        <h6>${stat.name}</h6>
                        <p class="stat-value" style="color: var(--primary-color);">${stat.amount}</p>
                        <p class="text-muted small">${stat.description}</p>
                        <button class="btn btn-sm btn-outline-primary" onclick="showDonationModal('${stat.name}')">Donate</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function showDonationModal(donationType) {
    document.getElementById('donationModalTitle').textContent = 'Make ' + donationType + ' Donation';
    const modal = new bootstrap.Modal(document.getElementById('donationModal'));
    modal.show();
}

function submitDonation() {
    const amount = document.getElementById('donationAmount').value;
    const isAnonymous = document.getElementById('anonymousDonation').checked;

    if (!amount) {
        alert('Please enter a donation amount');
        return;
    }

    donations.push({
        amount: amount,
        date: new Date().toLocaleDateString(),
        anonymous: isAnonymous,
        donor: isAnonymous ? 'Anonymous' : currentUser.name,
        receiptNumber: 'DRT' + Date.now()
    });

    localStorage.setItem('donations', JSON.stringify(donations));
    alert('Thank you for your donation of $' + amount + '!');

    document.getElementById('donationForm').reset();
    bootstrap.Modal.getInstance(document.getElementById('donationModal')).hide();
}

// ADMIN FUNCTIONS
function loadMemberDatabase() {
    const tbody = document.getElementById('membersList');
    if (!tbody) return;

    if (allMembers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No registered members yet</td></tr>';
        return;
    }

    tbody.innerHTML = allMembers.map(member => `
        <tr>
            <td>${member.studentId || member.username || 'N/A'}</td>
            <td>${member.fullName || member.name || member.username || 'N/A'}</td>
            <td>${member.email || 'N/A'}</td>
            <td>${member.phone || 'N/A'}</td>
            <td><span class="badge bg-success">${member.status || 'Active'}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewMemberDetails('${member.studentId || member.username}')">View</button>
                <button class="btn btn-sm btn-warning" onclick="editMember('${member.studentId || member.username}')">Edit</button>
            </td>
        </tr>
    `).join('');
}

function searchMembers() {
    const searchTerm = document.getElementById('memberSearchBox').value.toLowerCase();
    const tbody = document.getElementById('membersList');
    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function viewMemberDetails(studentId) {
    const member = allMembers.find(item => item.studentId === studentId || item.username === studentId);
    if (!member) {
        showNotification('Member record not found.', 'warning');
        return;
    }
    alert(`Member: ${member.fullName || member.username}\nEmail: ${member.email || 'N/A'}\nRole: ${member.role || 'student'}\nPhone: ${member.phone || 'N/A'}`);
}

function editMember(studentId) {
    const member = allMembers.find(item => item.studentId === studentId || item.username === studentId);
    if (!member) {
        showNotification('Member record not found.', 'warning');
        return;
    }
    currentUser = member;
    loadProfileData();
    switchView('profile');
    showNotification('Member loaded in the profile view.', 'info');
}

function loadAdminEvents() {
    const adminEvents = readList('adminEvents');
    allEvents = [...allEvents, ...adminEvents].filter((event, index, list) =>
        index === list.findIndex(item => (item.id || item.eventId || item.title || item.name) === (event.id || event.eventId || event.title || event.name))
    );
    localStorage.setItem('allEvents', JSON.stringify(allEvents));

    const tbody = document.getElementById('adminEventsList');
    if (!tbody) return;

    if (allEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No events have been added yet</td></tr>';
        return;
    }

    tbody.innerHTML = allEvents.map(event => {
        const title = event.title || event.name || 'Untitled event';
        const date = event.event_date || event.date || 'Not set';
        const location = event.location || 'Not set';
        const status = event.status || 'Upcoming';
        return `
            <tr>
                <td>${title}</td>
                <td>${date}</td>
                <td>${location}</td>
                <td>${registeredEvents.filter(reg => reg.eventId === String(event.id || event.eventId || title)).length}</td>
                <td><span class="badge bg-info">${status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewEventDetails('${title}')">View</button>
                    <button class="btn btn-sm btn-warning" onclick="editEvent('${title}')">Edit</button>
                </td>
            </tr>
        `;
    }).join('');
}

function loadAdminWelfare() {
    const tbody = document.getElementById('adminWelfareList');
    if (!tbody) return;

    if (welfareRequests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No welfare requests have been submitted yet.</td></tr>';
        return;
    }

    tbody.innerHTML = welfareRequests.map(request => `
        <tr>
            <td>${request.name || currentUser?.name || currentUser?.username || 'Member'}</td>
            <td>${request.type || request.category || 'Support request'}</td>
            <td>${request.amount || 'Not specified'}</td>
            <td>${request.date || request.submittedDate || 'Recently'}</td>
            <td><span class="badge bg-warning text-dark">${request.status || 'Pending Review'}</span></td>
            <td>
                <button class="btn btn-sm btn-success" onclick="approveWelfare()">Approve</button>
                <button class="btn btn-sm btn-danger" onclick="rejectWelfare()">Reject</button>
            </td>
        </tr>
    `).join('');
}

function loadLeadership() {
    const container = document.getElementById('leadershipRolesList');
    if (!container) return;

    if (leadershipRoles.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted">No leadership roles have been added yet.</div>';
        return;
    }

    container.innerHTML = leadershipRoles.map(role => `
        <div class="col-md-6 col-lg-4 mb-3">
            <div class="card leadership-card">
                <div class="card-body text-center">
                    <div class="leadership-icon">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <h6>${role.position}</h6>
                    <p class="text-muted">Name: ${role.name}</p>
                    <p class="text-muted">Term: ${role.startDate} - ${role.endDate}</p>
                    <button class="btn btn-sm btn-warning" onclick="editLeadership('${role.position}')">Edit</button>
                </div>
            </div>
        </div>
    `).join('');
}

function showLeadershipModal() {
    const modal = new bootstrap.Modal(document.getElementById('leadershipModal'));
    modal.show();
}

function saveLeadership() {
    const position = document.getElementById('leadershipPosition').value;
    const name = document.getElementById('leadershipName').value;
    const startDate = document.getElementById('leadershipStart').value;
    const endDate = document.getElementById('leadershipEnd').value;

    if (!position || !name || !startDate || !endDate) {
        alert('Please fill in all fields');
        return;
    }

    leadershipRoles.push({
        position: position,
        name: name,
        startDate: startDate,
        endDate: endDate,
        createdDate: new Date().toLocaleDateString()
    });

    localStorage.setItem('leadershipRoles', JSON.stringify(leadershipRoles));
    alert('Leadership role saved successfully!');
    bootstrap.Modal.getInstance(document.getElementById('leadershipModal')).hide();
    loadLeadership();
}

function editLeadership(position) {
    const modal = new bootstrap.Modal(document.getElementById('leadershipModal'));
    modal.show();
}

// CHARTS
function initializeCharts() {
    // Membership Chart
    const membershipCtx = document.getElementById('membershipChart');
    if (membershipCtx && !membershipCtx.hasAttribute('data-chart-initialized')) {
        new Chart(membershipCtx, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Inactive', 'Pending'],
                datasets: [{
                    data: [240, 12, 4],
                    backgroundColor: ['#28a745', '#dc3545', '#ffc107']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
        membershipCtx.setAttribute('data-chart-initialized', 'true');
    }

    // Donation Chart
    const donationCtx = document.getElementById('donationChart');
    if (donationCtx && !donationCtx.hasAttribute('data-chart-initialized')) {
        new Chart(donationCtx, {
            type: 'pie',
            data: {
                labels: ['Zakat', 'Sadaqah', 'Community Fund'],
                datasets: [{
                    data: [5240, 4500, 5500],
                    backgroundColor: ['#d946a6', '#2d7a5e', '#d4af37']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
        donationCtx.setAttribute('data-chart-initialized', 'true');
    }
}

// UTILITY FUNCTIONS
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentRole');

        currentUser = null;
        currentRole = null;

        document.getElementById('dashboardPage').classList.remove('active');
        document.getElementById('loginPage').classList.add('active');

        document.getElementById('loginForm').reset();
        document.getElementById('registrationForm').reset();
    }
}

// Validation
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validatePhoneNumber(phone) {
    const regex = /^[\d\s\-\+\(\)]+$/;
    return regex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// LocalStorage Helpers
function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getFromLocalStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

function clearLocalStorage(key) {
    localStorage.removeItem(key);
}

// Notifications
function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Role-Based Access Control
function hasPermission(permission) {
    const rolePermissions = {
        'student': ['view_profile', 'register_events', 'view_prayer_times', 'welfare_request', 'view_payments'],
        'executive': ['view_profile', 'manage_members', 'manage_events', 'view_reports', 'manage_welfare', 'manage_leadership'],
        'imam': ['view_profile', 'manage_prayer_times', 'manage_lectures', 'view_announcements'],
        'finance': ['view_profile', 'manage_payments', 'generate_reports', 'view_donations']
    };

    return rolePermissions[currentRole]?.includes(permission) || false;
}

// Export & Download
function downloadReport(reportName) {
    const data = getReportData(reportName);
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName}.csv`;
    a.click();
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    return `${headers}\n${rows}`;
}

function getReportData(reportName) {
    switch(reportName) {
        case 'members':
            return allMembers;
        case 'donations':
            return donations;
        case 'payments':
            return payments;
        case 'welfare':
            return welfareRequests;
        case 'events':
            return allEvents;
        default:
            return [];
    }
}

// Search & Filter
function searchItems(items, query, searchFields) {
    return items.filter(item =>
        searchFields.some(field =>
            String(item[field]).toLowerCase().includes(query.toLowerCase())
        )
    );
}

function filterByDate(items, startDate, endDate) {
    return items.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
    });
}

// Form Helpers
function resetForm(formId) {
    document.getElementById(formId).reset();
}

function getFormData(formId) {
    const form = document.getElementById(formId);
    const formData = new FormData(form);
    const data = {};

    formData.forEach((value, key) => {
        data[key] = value;
    });

    return data;
}

// Modal Helpers
function openModal(modalId) {
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
}

function closeModal(modalId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
    modal?.hide();
}

// Error Handling
function handleError(error) {
    console.error('Error:', error);
}

window.addEventListener('error', (event) => {
    handleError(event.error);
});

// Responsive Utilities
function isMobileView() {
    return window.innerWidth < 768;
}

function isTabletView() {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
}

function isDesktopView() {
    return window.innerWidth >= 1024;
}

// Accessibility
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
            bootstrap.Modal.getInstance(modal)?.hide();
        });
    }
});

// Performance Optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// DASHBOARD DATA LOADING
function loadDashboardData() {
    if (!currentUser) return;

    // Update date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('en-US', options);
    const dashboardDateEl = document.getElementById('dashboardDate');
    if (dashboardDateEl) dashboardDateEl.textContent = dateStr;

    // Profile Summary
    document.getElementById('dashName').textContent = currentUser.name || currentUser.username;
    document.getElementById('dashStudentId').textContent = currentUser.studentId || currentUser.id || 'Not set';
    document.getElementById('dashCourse').textContent = currentUser.course || 'Not set';
    document.getElementById('dashYear').textContent = currentUser.year || 'Not set';

    // Membership Status
    document.getElementById('membershipStatusValue').textContent = 'Active';

    // Upcoming Events Count
    const upcomingCount = getAvailableEvents().length;
    document.getElementById('upcomingEventsCount').textContent = upcomingCount;

    // Dues Status
    const duesPaid = payments.filter(p => p.status === 'Completed').length > 0 ? 'Paid' : 'Pending';
    document.getElementById('duesStatusValue').textContent = duesPaid;

    // Welfare Status
    const welfareCount = welfareRequests.filter(w => w.status === 'Pending').length;
    document.getElementById('welfareStatusValue').textContent = welfareCount || '0';

    // Load Announcements
    const announcementsList = document.getElementById('announcementsList');
    if (announcementsList) {
        const announcements = readList('adminAnnouncements').map(ann => ({
            title: ann.title,
            text: ann.content,
            time: ann.created_at ? new Date(ann.created_at).toLocaleDateString() : 'Recently'
        }));

        if (announcements.length === 0) {
            announcementsList.innerHTML = '<p class="text-center text-muted mb-0">No announcements have been added yet.</p>';
        } else {
            announcementsList.innerHTML = announcements.map(ann => `
                <div class="announcement-item">
                    <small class="text-muted"><i class="fas fa-clock"></i> ${ann.time}</small>
                    <p class="mb-1"><strong>${ann.title}</strong></p>
                    <p class="text-muted small">${ann.text}</p>
                </div>
            `).join('<hr>');
        }
    }

    // Load Meetings
    const meetingsList = document.getElementById('meetingsList');
    if (meetingsList) {
        meetingsList.innerHTML = '<p class="text-center text-muted mb-0">No meetings have been added yet.</p>';
    }
}

// TOGGLE/COLLAPSE FUNCTIONS FOR HIDING/SHOWING FEATURES
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
    }
}

function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
    }
}

function hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'none';
    }
}

function toggleDetails(detailsId) {
    const details = document.getElementById(detailsId);
    if (details) {
        details.classList.toggle('hidden');
        const icon = event.target.closest('.toggle-btn')?.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
        }
    }
}

// VOLUNTEER FUNCTIONS
function showVolunteerModal() {
    const modal = new bootstrap.Modal(document.getElementById('volunteerModal'));
    modal.show();
}

function submitVolunteerSignup() {
    const opportunity = document.getElementById('volunteerOpportunity').value;
    const skills = document.getElementById('volunteerSkills').value;
    const availability = document.getElementById('volunteerAvailability').value;
    const commitment = document.getElementById('volunteerCommit').checked;

    if (!opportunity || !availability || !commitment) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }

    // Add to volunteer records
    const volunteerRecord = {
        opportunity: opportunity,
        skills: skills,
        availability: availability,
        dateSignedUp: new Date().toLocaleDateString(),
        status: 'Active'
    };

    let volunteerRecords = JSON.parse(localStorage.getItem('volunteerRecords')) || [];
    volunteerRecords.push(volunteerRecord);
    localStorage.setItem('volunteerRecords', JSON.stringify(volunteerRecords));

    bootstrap.Modal.getInstance(document.getElementById('volunteerModal')).hide();
    showNotification('Successfully signed up for volunteering!', 'success');

    // Clear form
    document.getElementById('volunteerForm').reset();
}

function registerVolunteer(opportunity) {
    document.getElementById('volunteerOpportunity').value = opportunity;
    showVolunteerModal();
}

// Update loadViewData to include volunteer view
const originalLoadViewData = window.loadViewData;
window.loadViewData = function(viewName) {
    if (viewName === 'dashboard') {
        loadDashboardData();
    } else if (viewName === 'volunteer') {
        loadVolunteerData();
    } else if (originalLoadViewData) {
        originalLoadViewData(viewName);
    }
};

function loadVolunteerData() {
    const volunteerRecords = JSON.parse(localStorage.getItem('volunteerRecords')) || [];
    // Data is already shown in HTML, this function can be used for dynamic updates if needed
}
// ============================================
// HADITH MANAGEMENT SYSTEM
// ============================================

let currentHadithIndex = 0;
let allHadiths = [];
let hadithsLoaded = false;

// Initialize Hadiths on Dashboard Load
function initializeHadiths() {
    if (allHadiths.length === 0) {
        loadLocalHadiths();
    }

    Promise.all([loadAllHadiths(), loadDailyHadith()]).catch(() => {
        console.warn('Hadith initialization encountered an issue.');
    });
}

// Load all hadiths
function loadAllHadiths() {
    const hadithRequest = frontendOnly
        ? Promise.resolve(getStaticApiData('getAllHadiths'))
        : fetch('commuj.php?action=getAll').then(response => response.json());

    return hadithRequest
        .then(data => {
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                allHadiths = data.data;
                hadithsLoaded = true;
                console.log('Hadiths loaded:', allHadiths.length);
                return allHadiths;
            }
            throw new Error('Invalid hadith list returned');
        })
        .catch(error => {
            console.log('Hadith API unavailable, using local hadiths:', error);
            loadLocalHadiths();
            hadithsLoaded = true;
            return allHadiths;
        });
}

// Load today''s hadith
function loadDailyHadith() {
    const dailyRequest = frontendOnly
        ? Promise.resolve(getStaticApiData('getDailyHadith'))
        : fetch('commuj.php?action=getDaily').then(response => response.json());

    return dailyRequest
        .then(data => {
            if (data.success && data.data) {
                currentHadithIndex = data.position - 1;
                if (allHadiths.length === 0) {
                    allHadiths = [data.data];
                }
                displayHadith(data.data, data.position, data.total);
                hadithsLoaded = true;
                return data.data;
            }
            throw new Error('Invalid daily hadith returned');
        })
        .catch(error => {
            console.log('Daily hadith API unavailable, using local hadith:', error);
            if (allHadiths.length > 0) {
                const today = new Date().getDate();
                currentHadithIndex = today % allHadiths.length;
                displayHadith(allHadiths[currentHadithIndex], currentHadithIndex + 1, allHadiths.length);
                hadithsLoaded = true;
            } else {
                loadLocalHadiths();
            }
            return null;
        });
}

// Display hadith in the UI
function displayHadith(hadith, position, total) {
    const textElement = document.getElementById('hadithText');
    const referenceElement = document.getElementById('hadithReference');
    const translationElement = document.getElementById('hadithTranslation');
    const counterElement = document.getElementById('hadithCounter');
    const totalElement = document.getElementById('hadithTotal');

    if (textElement) {
        textElement.innerHTML = hadith.arabic || 'Hadith not found';
        textElement.style.animation = 'none';
        setTimeout(() => {
            textElement.style.animation = 'welcomeFadeInScale 0.6s ease-out';
        }, 10);
    }

    if (referenceElement) {
        referenceElement.textContent = hadith.reference || '';
    }

    if (translationElement) {
        translationElement.innerHTML = `<strong>Translation:</strong> ${hadith.english || 'Translation not available'}`;
    }

    if (counterElement) {
        counterElement.textContent = position;
    }

    if (totalElement) {
        totalElement.textContent = total;
    }

    currentHadithIndex = position - 1;
}

// Navigate to next hadith
function nextHadith() {
    if (!hadithsLoaded && allHadiths.length === 0) {
        showNotification('Hadith data is still loading, please wait.', 'warning');
        return;
    }
    if (allHadiths.length === 0) return;

    currentHadithIndex = (currentHadithIndex + 1) % allHadiths.length;
    displayHadith(allHadiths[currentHadithIndex], currentHadithIndex + 1, allHadiths.length);
}

// Navigate to previous hadith
function previousHadith() {
    if (!hadithsLoaded && allHadiths.length === 0) {
        showNotification('Hadith data is still loading, please wait.', 'warning');
        return;
    }
    if (allHadiths.length === 0) return;

    currentHadithIndex = (currentHadithIndex - 1 + allHadiths.length) % allHadiths.length;
    displayHadith(allHadiths[currentHadithIndex], currentHadithIndex + 1, allHadiths.length);
}

// Load hadiths locally if PHP is not available
function loadLocalHadiths() {
    allHadiths = [
        {
            id: 1,
            arabic: '?? ??? ????? ??? ???? ??? ???: ??? ???? ???? ??? ???? ???? ????: "?? ??? ???? ????? ??????? ????????? ??? ?? ?? ???? ?? ????"',
            english: 'Whoever stands (in prayer) during the Night of Power, with faith and hoping for its reward, will have all of their previous sins forgiven.',
            reference: 'Sahih Bukhari 1901 & Muslim 760',
            source: 'Prophet Muhammad (Peace Be Upon Him)'
        },
        {
            id: 2,
            arabic: '?? ??? ????? ?? ???? ???? ??? ???? ???? ???? ???: "?????? ???? ?????? ????? ?????"',
            english: 'Supplication is the weapon of the believer and the pillar of the religion.',
            reference: 'Sunan At-Tirmidhi 3373',
            source: 'Prophet Muhammad (Peace Be Upon Him)'
        },
        {
            id: 3,
            arabic: '??? ???? ???? ??? ???? ???? ????: "??? ????? ?????? ?????"',
            english: 'The best of people are those who are most beneficial to others.',
            reference: 'Sunan Ibn Majah 4106',
            source: 'Prophet Muhammad (Peace Be Upon Him)'
        }
    ];

    const today = new Date().getDate();
    currentHadithIndex = today % allHadiths.length;
    displayHadith(allHadiths[currentHadithIndex], currentHadithIndex + 1, allHadiths.length);
    hadithsLoaded = true;
}

// Call initialize hadiths when dashboard shows
const originalShowDashboard = window.showDashboard;
window.showDashboard = function() {
    originalShowDashboard();
    setTimeout(() => initializeHadiths(), 600);
};

// CONTACT MANAGEMENT
function loadAdminContact() {
    // Load contact info from localStorage
    let contactInfo = JSON.parse(localStorage.getItem('contactInfo')) || {
        location: '',
        phone: '',
        email: '',
        hours: ''
    };

    // Populate form fields
    document.getElementById('contactLocation').value = contactInfo.location || '';
    document.getElementById('contactPhone').value = contactInfo.phone || '';
    document.getElementById('contactEmail').value = contactInfo.email || '';
    document.getElementById('contactHours').value = contactInfo.hours || '';
}

function updateContactInfo(type) {
    let contactInfo = JSON.parse(localStorage.getItem('contactInfo')) || {
        location: '',
        phone: '',
        email: '',
        hours: ''
    };

    let value = '';
    let fieldName = '';

    switch(type) {
        case 'location':
            value = document.getElementById('contactLocation').value.trim();
            fieldName = 'Location';
            if (value) contactInfo.location = value;
            break;
        case 'phone':
            value = document.getElementById('contactPhone').value.trim();
            fieldName = 'Phone Number';
            if (value) contactInfo.phone = value;
            break;
        case 'email':
            value = document.getElementById('contactEmail').value.trim();
            fieldName = 'Email Address';
            if (value) contactInfo.email = value;
            break;
        case 'hours':
            value = document.getElementById('contactHours').value.trim();
            fieldName = 'Office Hours';
            if (value) contactInfo.hours = value;
            break;
    }

    if (!value) {
        showNotification('Please enter a value for ' + fieldName, 'warning');
        return;
    }

    // Save to localStorage
    localStorage.setItem('contactInfo', JSON.stringify(contactInfo));
    showNotification(fieldName + ' updated successfully!', 'success');
}

// GALLERY MANAGEMENT
function loadAdminGallery() {
    let galleryItems = JSON.parse(localStorage.getItem('galleryItems')) || [];

    const galleryList = document.getElementById('galleryItemsList');
    if (!galleryList) return;

    if (galleryItems.length === 0) {
        galleryList.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No gallery items yet</td></tr>';
        return;
    }

    galleryList.innerHTML = galleryItems.map((item, index) => `
        <tr>
            <td>${item.title}</td>
            <td>${item.description}</td>
            <td>${item.imageData ? `<img src="${item.imageData}" alt="${item.title}" style="max-height:80px; max-width:120px; object-fit:cover; border-radius:6px;">` : '<span class="text-muted">No image</span>'}</td>
            <td><i class="${item.icon}"></i></td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="removeGalleryItem(${index})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </td>
        </tr>
    `).join('');
}

function showAddGalleryModal() {
    const modal = new bootstrap.Modal(document.getElementById('addGalleryModal'));
    modal.show();
}

function previewGalleryImage() {
    const imageInput = document.getElementById('galleryImage');
    const preview = document.getElementById('galleryImagePreview');

    if (imageInput && imageInput.files && imageInput.files[0]) {
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

function saveGalleryItem() {
    const title = document.getElementById('galleryTitle').value.trim();
    const description = document.getElementById('galleryDescription').value.trim();
    const icon = document.getElementById('galleryIcon').value.trim() || 'fas fa-images';
    const imageInput = document.getElementById('galleryImage');

    if (!title || !description || !imageInput || !imageInput.files || imageInput.files.length === 0) {
        showNotification('Please fill in all gallery fields and choose an image.', 'warning');
        return;
    }

    const file = imageInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        let galleryItems = JSON.parse(localStorage.getItem('galleryItems')) || [];

        galleryItems.push({
            title: title,
            description: description,
            icon: icon,
            imageData: imageData
        });

        localStorage.setItem('galleryItems', JSON.stringify(galleryItems));

        // Clear form
        document.getElementById('galleryTitle').value = '';
        document.getElementById('galleryDescription').value = '';
        document.getElementById('galleryIcon').value = '';
        imageInput.value = '';
        const preview = document.getElementById('galleryImagePreview');
        preview.src = '';
        preview.classList.add('d-none');

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('addGalleryModal')).hide();

        // Refresh gallery display
        loadAdminGallery();
        loadGalleryContent(); // Refresh landing page gallery

        showNotification('Gallery item added successfully!', 'success');
    };
    reader.readAsDataURL(file);
}

function removeGalleryItem(index) {
    if (!confirm('Are you sure you want to remove this gallery item?')) return;

    let galleryItems = JSON.parse(localStorage.getItem('galleryItems')) || [];
    galleryItems.splice(index, 1);
    localStorage.setItem('galleryItems', JSON.stringify(galleryItems));

    loadAdminGallery();
    loadGalleryContent(); // Refresh landing page gallery
    showNotification('Gallery item removed!', 'success');
}
