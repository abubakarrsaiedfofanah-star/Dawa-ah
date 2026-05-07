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
let loginFailedAttempts = 0;
let loginLockedUntil = 0;
const paymentAccounts = {
    mpesaStk: {
        label: 'M-Pesa STK Push',
        html: '<strong>M-Pesa STK Push:</strong><br>Enter your M-Pesa phone number, then check your phone for the Safaricom PIN prompt. Receipt is generated only after M-Pesa confirms success.'
    },
    bankTransfer: {
        label: 'Bank Transfer',
        html: '<strong>Bank Transfer:</strong><br>Bank Name: COMMUJ Official Bank<br>Account Name: COMMUJ Association<br>Account Number: 1234567890<br>After transfer, keep your transaction reference for confirmation.'
    },
    numberTransfer: {
        label: 'Normal Transfer Number',
        html: '<strong>Normal Transfer:</strong><br>Send the money to: 0700000000<br>Receiver Name: COMMUJ Treasurer<br>Use your full name as the transfer narration.'
    },
    cash: {
        label: 'Cash Payment',
        html: '<strong>Cash Payment:</strong><br>Pay physically to the COMMUJ Treasurer or Finance Officer and collect/keep your receipt.'
    }
};

const XAMPP_BASE_URL = 'http://localhost/comahs/';
const frontendOnly = false;
const realAppFetch = window.fetch.bind(window);

window.fetch = function(resource, options = {}) {
    if (location.protocol === 'file:' && typeof resource === 'string' && /^(api|admin_api|commuj|mpesa_api)\.php/.test(resource)) {
        return realAppFetch(XAMPP_BASE_URL + resource, options);
    }
    return realAppFetch(resource, options);
};

function readList(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function getStaticApiData(action) {
    switch (action) {
        case 'getLeaders':
            return { success: true, data: readList('publicLeaders') };
        case 'getGallery':
            return { success: true, data: readList('galleryItems') };
        case 'getAnnouncements':
            return { success: true, data: readList('adminAnnouncements') };
        case 'getEvents':
            return { success: true, data: readList('adminEvents') };
        case 'getPrayerTimes':
            return { success: true, data: JSON.parse(localStorage.getItem('adminPrayerTimes')) || null };
        case 'getResources':
            return { success: true, data: readList('adminResources') };
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

    const now = Date.now();
    if (loginLockedUntil > now) {
        const secondsLeft = Math.ceil((loginLockedUntil - now) / 1000);
        alert(`Too many failed login attempts. Please wait ${secondsLeft} seconds before trying again.`);
        return;
    }

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('userRole').value;

    if (!username || !password || !role) {
        alert('Please fill in all fields.');
        return;
    }

    const user = getRegisteredUser(username);
    if (!user) {
        recordFailedLoginAttempt('No registered account found. Please register first.');
        return;
    }

    if (user.password !== password) {
        recordFailedLoginAttempt('Invalid password.');
        return;
    }

    if (user.role !== role) {
        recordFailedLoginAttempt('Role mismatch. Please login with the role you registered as: ' + (user.role || 'student') + '.');
        return;
    }

    loginFailedAttempts = 0;
    loginLockedUntil = 0;
    currentUser = user;
    currentRole = role;

    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('currentRole', role);

    document.getElementById('loginForm').reset();
    showDashboard();
}

function recordFailedLoginAttempt(message) {
    loginFailedAttempts += 1;

    if (loginFailedAttempts >= 3) {
        loginLockedUntil = Date.now() + 10000;
        loginFailedAttempts = 0;
        alert(`${message}\nToo many failed attempts. Please wait 10 seconds before trying again.`);
        updateLoginLockoutButton();
        return;
    }

    alert(`${message}\nAttempt ${loginFailedAttempts} of 3.`);
}

function updateLoginLockoutButton() {
    const button = document.getElementById('loginSubmitBtn');
    if (!button) return;

    const remaining = Math.ceil((loginLockedUntil - Date.now()) / 1000);
    if (remaining <= 0) {
        button.disabled = false;
        button.textContent = 'Login';
        return;
    }

    button.disabled = true;
    button.textContent = `Wait ${remaining}s`;
    setTimeout(updateLoginLockoutButton, 250);
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

    if (!frontendOnly) {
        saveRegistrationToDatabase(newUser, fullName, password)
            .then(savedUser => completeLocalRegistration(savedUser))
            .catch(error => {
                console.error('Registration database error:', error);
                alert(error.message || 'Registration could not be saved to the database.');
            });
        return;
    }

    completeLocalRegistration(newUser);
}

function completeLocalRegistration(newUser) {
    allMembers.push(newUser);
    localStorage.setItem('allMembers', JSON.stringify(allMembers));

    alert('Registration successful! Please login using the role you registered with.');
    document.getElementById('registrationForm').reset();
    document.querySelector('[data-bs-target="#loginTab"]').click();
}

function saveRegistrationToDatabase(newUser, fullName, password) {
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ') || '-';

    return fetch('api.php?action=registerUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: newUser.studentId,
            email: newUser.email,
            password: password,
            role: newUser.role
        })
    })
    .then(response => response.json())
    .then(userResult => {
        if (!userResult.success) {
            throw new Error(userResult.message || 'Could not create user in database');
        }
        const userId = userResult.data.user_id;
        return fetch('api.php?action=registerStudent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                first_name: firstName || fullName,
                last_name: lastName,
                student_id: newUser.studentId,
                email: newUser.email,
                phone: newUser.phone,
                gender: newUser.gender,
                nationality: newUser.nationality,
                course: newUser.course,
                year_of_study: newUser.yearOfStudy,
                degree_type: newUser.degreeType,
                home_address: newUser.homeAddress,
                emergency_contact: newUser.emergencyContact,
                emergency_contact_phone: '',
                local_guardian: newUser.localGuardian,
                local_guardian_phone: ''
            })
        })
        .then(response => response.json())
        .then(studentResult => {
            if (!studentResult.success) {
                throw new Error(studentResult.message || 'Could not create student record in database');
            }
            return {
                ...newUser,
                dbUserId: userId,
                dbStudentId: studentResult.data.student_id
            };
        });
    });
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

    switchView('dashboard');
    setTimeout(() => {
        loadDashboardData();
        initializeCharts();
    }, 500);
}

// VIEW SWITCHING
function switchView(viewName) {
    const adminViews = ['memberDatabase', 'adminEvents', 'adminWelfare', 'leadership', 'reports', 'adminGallery', 'adminContact'];
    if (adminViews.includes(viewName)) {
        alert('Please use admin.html for admin panel features.');
        switchView('dashboard');
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
    const profileData = currentUser || {};
    document.getElementById('editFullName').value = profileData.fullName || profileData.name || '';
    document.getElementById('editStudentId').value = profileData.studentId || profileData.username || '';
    document.getElementById('editEmail').value = profileData.email || '';
    document.getElementById('editPhone').value = profileData.phone || '';
    document.getElementById('editDegreeType').value = profileData.degreeType || 'degree';
    document.getElementById('editCourse').value = profileData.course || '';
    document.getElementById('editYearOfStudy').value = profileData.yearOfStudy || '';
    document.getElementById('editGender').value = profileData.gender || 'male';
    document.getElementById('editNationality').value = profileData.nationality || '';
    document.getElementById('editEmergencyContact').value = profileData.emergencyContact || '';
    document.getElementById('editLocalGuardian').value = profileData.localGuardian || '';
    document.getElementById('editHomeAddress').value = profileData.homeAddress || '';

    const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
    modal.show();
}

function saveProfileChanges() {
    const fullName = document.getElementById('editFullName').value.trim();
    const studentId = document.getElementById('editStudentId').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();

    if (!fullName || !studentId || !email || !phone) {
        alert('Please fill in full name, student ID, email, and phone.');
        return;
    }

    const updatedProfile = {
        ...currentUser,
        name: fullName,
        fullName: fullName,
        studentId: studentId,
        username: currentUser?.username || studentId,
        email: email,
        phone: phone,
        degreeType: document.getElementById('editDegreeType').value,
        course: document.getElementById('editCourse').value.trim(),
        yearOfStudy: document.getElementById('editYearOfStudy').value.trim(),
        gender: document.getElementById('editGender').value,
        nationality: document.getElementById('editNationality').value.trim(),
        emergencyContact: document.getElementById('editEmergencyContact').value.trim(),
        localGuardian: document.getElementById('editLocalGuardian').value.trim(),
        homeAddress: document.getElementById('editHomeAddress').value.trim()
    };

    if (!frontendOnly) {
        saveProfileToDatabase(updatedProfile)
            .then(() => completeProfileSave(updatedProfile))
            .catch(error => {
                console.error('Profile update error:', error);
                alert(error.message || 'Profile could not be saved to the database.');
            });
        return;
    }

    completeProfileSave(updatedProfile);
}

function saveProfileToDatabase(profile) {
    const [firstName, ...lastParts] = profile.fullName.split(/\s+/);
    return getCurrentStudentId()
        .then(studentDbId => fetch('api.php?action=updateStudentProfile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_db_id: studentDbId,
                first_name: firstName || profile.fullName,
                last_name: lastParts.join(' ') || '-',
                student_id: profile.studentId,
                email: profile.email,
                phone: profile.phone,
                degree_type: profile.degreeType,
                course: profile.course,
                year_of_study: profile.yearOfStudy,
                gender: profile.gender,
                nationality: profile.nationality,
                emergency_contact: profile.emergencyContact,
                local_guardian: profile.localGuardian,
                home_address: profile.homeAddress
            })
        }))
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.message || 'Could not update profile');
            }
            return result;
        });
}

function completeProfileSave(updatedProfile) {
    currentUser = updatedProfile;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('profileData', JSON.stringify(currentUser));

    allMembers = allMembers.map(member => {
        const sameMember = member.studentId === updatedProfile.studentId ||
            member.username === updatedProfile.username ||
            member.email === updatedProfile.email ||
            member.dbStudentId === updatedProfile.dbStudentId;
        return sameMember ? { ...member, ...updatedProfile } : member;
    });
    localStorage.setItem('allMembers', JSON.stringify(allMembers));

    loadProfileData();
    const nameDisplay = document.getElementById('userNameDisplay');
    if (nameDisplay) {
        nameDisplay.textContent = currentUser.name || currentUser.fullName || currentUser.username;
    }
    updateDashboardStats();
    bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
    showNotification('Profile updated successfully.', 'success');
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
    const container = document.getElementById('prayerTimesDetails');
    if (!container) return;

    const today = new Date().toISOString().slice(0, 10);
    const prayerRequest = frontendOnly
        ? Promise.resolve(getStaticApiData('getPrayerTimes'))
        : fetch(`admin_api.php?action=getPrayerTimes&date=${today}`).then(response => response.json());

    prayerRequest
    .then(result => {
        const data = result.data || {};
        const prayerTimes = [
            { name: 'Fajr', time: data.fajr },
            { name: 'Dhuhr', time: data.dhuhr },
            { name: 'Asr', time: data.asr },
            { name: 'Maghrib', time: data.maghrib },
            { name: 'Isha', time: data.isha },
            { name: 'Jumu\'ah', time: data.jummah_time }
        ];
        container.innerHTML = `<div class="prayer-schedule">${prayerTimes.map(prayer => `
            <div class="prayer-item">
                <span class="prayer-label">${prayer.name}</span>
                <span class="prayer-time">${prayer.time || 'Not set'}</span>
            </div>
        `).join('')}</div>`;
    })
    .catch(() => {
        container.innerHTML = '<p class="text-muted">Prayer timetable has not been added yet.</p>';
    });
}

// EVENTS
function loadEventsData() {
    loadEventsFromApi().finally(() => {
        renderAvailableEvents();
        populateEventSelect();
        updateRegisteredEventsList();
        const eventsList = document.getElementById('eventsList');
        if (eventsList) {
            eventsList.style.display = '';
        }
    });
}

function getAvailableEvents() {
    return [...allEvents, ...readList('adminEvents')].filter((event, index, list) => {
        const key = event.id || event.eventId || event.title || event.name;
        return index === list.findIndex(item => (item.id || item.eventId || item.title || item.name) === key);
    });
}

function mergeEvents(events) {
    allEvents = [...allEvents, ...events].filter((event, index, list) => {
        const key = event.id || event.eventId || event.title || event.name;
        return index === list.findIndex(item => (item.id || item.eventId || item.title || item.name) === key);
    });
}

function loadEventsFromApi() {
    const eventsRequest = frontendOnly
        ? Promise.resolve(getStaticApiData('getEvents'))
        : fetch('admin_api.php?action=getEvents&limit=100').then(response => response.json());

    return eventsRequest
        .then(result => {
            if (result.success && Array.isArray(result.data)) {
                mergeEvents(result.data);
            }
            return allEvents;
        })
        .catch(error => {
            console.log('Event API unavailable, using local data:', error);
            return allEvents;
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

    if (!frontendOnly && selectedEvent && selectedEvent.id) {
        getCurrentStudentId()
        .then(studentId => fetch('api.php?action=registerEvent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: selectedEvent.id,
                student_id: studentId
            })
        }))
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.message || 'Could not register for event in the database');
            }
            saveEventRegistrationLocally(registration);
        })
        .catch(error => {
            console.error('Event registration database error:', error);
            alert(error.message || 'Event registration could not be saved to the database.');
        });
        return;
    }

    saveEventRegistrationLocally(registration);
}

function saveEventRegistrationLocally(registration) {
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

    const eventData = {
        name: eventName,
        title: eventName,
        date: eventDate,
        time: eventTime,
        event_date: eventTime ? `${eventDate} ${eventTime}` : eventDate,
        location: eventLocation,
        description: eventDescription,
        createdDate: new Date().toLocaleDateString(),
        status: 'Upcoming'
    };

    if (!frontendOnly) {
        fetch('admin_api.php?action=createEvent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: eventName,
                description: eventDescription,
                event_date: eventData.event_date,
                location: eventLocation,
                category: 'general',
                status: 'upcoming',
                max_participants: 100
            })
        })
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.message || 'Error creating event');
            }
            mergeEvents([eventData]);
            loadEventsData();
            alert('Event created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('createEventModal')).hide();
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error creating event. Please try again.', 'danger');
        });
        return;
    }

    allEvents.push(eventData);

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
    const container = document.getElementById('announcementsContainer');
    if (!container) return;

    const announcementRequest = frontendOnly
        ? Promise.resolve(getStaticApiData('getAnnouncements'))
        : fetch('admin_api.php?action=getAnnouncements').then(response => response.json());

    announcementRequest
    .then(result => {
        const announcements = (result.data || []).map(ann => ({
            title: ann.title,
            text: ann.content,
            time: ann.created_at || ann.published_at ? new Date(ann.created_at || ann.published_at).toLocaleDateString() : 'Recently',
            icon: 'bell'
        }));

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
    })
    .catch(error => {
        console.log('Announcement API unavailable, using local data:', error);
        const announcements = readList('adminAnnouncements').map(ann => ({
            title: ann.title,
            text: ann.content,
            time: ann.created_at ? new Date(ann.created_at).toLocaleDateString() : 'Recently',
            icon: 'bell'
        }));

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
    });
}

// RESOURCES
function loadResources() {
    const container = document.getElementById('resourcesGrid');
    if (!container) return;

    const resourceRequest = frontendOnly
        ? Promise.resolve(getStaticApiData('getResources'))
        : fetch('admin_api.php?action=getResources').then(response => response.json());

    resourceRequest
    .then(result => {
        const resources = result.data || [];
        if (!resources.length) {
            container.innerHTML = '<p class="text-center text-muted">No resources have been added yet.</p>';
            return;
        }
        window.currentResources = resources;
        container.innerHTML = `<div class="row">${resources.map(res => `
            <div class="col-md-4 mb-3">
                <div class="card resource-card h-100">
                    <div class="card-body text-center">
                        <i class="fas fa-${getResourceIcon(res.resource_type || res.type)} fa-3x mb-3" style="color: var(--primary-color);"></i>
                        <h6>${res.title}</h6>
                        <p class="text-muted small">${res.description || ''}</p>
                        <button class="btn btn-sm btn-primary" onclick="openResource(${resources.indexOf(res)})">View</button>
                    </div>
                </div>
            </div>
        `).join('')}</div>`;
    })
    .catch(error => {
        console.error('Resource loading error:', error);
        container.innerHTML = '<p class="text-center text-danger">Resources could not load. Please open the site through http://localhost/comahs/index.html and try again.</p>';
    });
}

function getResourceIcon(type) {
    if (type === 'video') return 'video';
    if (type === 'download') return 'download';
    if (type === 'article') return 'newspaper';
    return 'link';
}

function openResource(resourceIndex) {
    const resource = Array.isArray(window.currentResources) ? window.currentResources[resourceIndex] : null;
    if (!resource) {
        alert('Resource was not found. Please refresh and try again.');
        return;
    }

    const resourceUrl = resource.url || resource.file_path || '';
    if (resourceUrl) {
        window.open(resolveAppUrl(resourceUrl), '_blank');
        return;
    }
    alert(`${resource.title}\n\n${resource.description || 'No details available.'}`);
}

function resolveAppUrl(url) {
    if (!url) return '';
    if (/^(https?:|mailto:|tel:|data:|blob:)/i.test(url)) return url;
    const cleanUrl = url.replace(/^\/+/, '');
    if (location.protocol === 'file:') {
        return XAMPP_BASE_URL + cleanUrl;
    }
    return cleanUrl;
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

    const request = {
        id: Date.now(),
        type: type,
        description: description,
        amount: amount || 'Not specified',
        dateSubmitted: new Date().toLocaleDateString(),
        status: 'Pending Review',
        submittedBy: currentUser.name || currentUser.fullName || currentUser.username
    };

    if (!frontendOnly) {
        getCurrentStudentId()
        .then(studentId => fetch('api.php?action=createWelfareRequest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                category: type,
                description: description,
                amount: amount || 0
            })
        }))
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.message || 'Could not save welfare request to database');
            }
            saveWelfareRequestLocally(request);
        })
        .catch(error => {
            console.error('Welfare database error:', error);
            alert(error.message || 'Welfare request could not be saved to the database.');
        });
        return;
    }

    saveWelfareRequestLocally(request);
}

function saveWelfareRequestLocally(request) {
    welfareRequests.push(request);
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
    renderPaymentStatusSummary();
    renderPaymentHistory();
}

function renderPaymentStatusSummary() {
    const statusContainer = document.getElementById('paymentStatusSummary');
    const summaryContainer = document.getElementById('paymentSummaryDetails');
    const completedPayments = payments.filter(payment => payment.status === 'Completed');
    const totalPaid = completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    if (statusContainer) {
        if (!completedPayments.length) {
            statusContainer.innerHTML = '<p class="text-muted mb-0">No payment has been made yet.</p>';
        } else {
            statusContainer.innerHTML = completedPayments.map(payment => `
                <div class="payment-status-item">
                    <p><strong>${formatPaymentType(payment.type)}</strong></p>
                    <div class="progress mb-2">
                        <div class="progress-bar bg-success" style="width: 100%">Paid</div>
                    </div>
                    <small class="text-muted">Amount: $${payment.amount} | Paid: ${payment.date} | ${payment.paymentMethod || 'Method not specified'}</small>
                </div>
            `).join('<hr>');
        }
    }

    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <table class="table table-borderless">
                <tr>
                    <td><strong>Total Due:</strong></td>
                    <td>${completedPayments.length ? '$0' : 'Not paid yet'}</td>
                </tr>
                <tr>
                    <td><strong>Total Paid:</strong></td>
                    <td>$${totalPaid.toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>Next Due Date:</strong></td>
                    <td>Not set</td>
                </tr>
            </table>
            <button class="btn btn-primary w-100" onclick="showPaymentModal()">Make Payment</button>
        `;
    }
}

function formatPaymentType(type) {
    const labels = {
        membershipDues: 'Membership Dues',
        activityFee: 'Activity Fee',
        specialEvents: 'Special Events Fee',
        other: 'Other Payment'
    };
    return labels[type] || type || 'Payment';
}

function showPaymentModal() {
    updatePaymentInstructions('payment');
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}

function normalizeMpesaPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('254') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
    if (digits.startsWith('7') && digits.length === 9) return '254' + digits;
    return digits;
}

function updatePaymentInstructions(context) {
    const selectId = context === 'donation' ? 'donationPaymentMethod' : 'paymentMethod';
    const boxId = context === 'donation' ? 'donationPaymentInstructions' : 'paymentInstructions';
    const select = document.getElementById(selectId);
    const box = document.getElementById(boxId);
    if (!select || !box) return;

    const phoneGroupId = context === 'donation' ? 'donationMpesaPhoneGroup' : 'paymentMpesaPhoneGroup';
    const phoneGroup = document.getElementById(phoneGroupId);
    if (phoneGroup) {
        phoneGroup.classList.toggle('d-none', select.value !== 'mpesaStk');
    }

    const account = paymentAccounts[select.value];
    if (!account) {
        box.classList.add('d-none');
        box.innerHTML = '';
        return;
    }

    const note = select.value === 'mpesaStk'
        ? 'Receipt is generated only after Safaricom confirms the M-Pesa payment.'
        : 'Click Send after entering the amount. A receipt will be generated immediately.';
    box.innerHTML = `${account.html}<hr class="my-2"><strong>Important:</strong> ${note}`;
    box.classList.remove('d-none');
}

function processPayment() {
    const paymentType = document.getElementById('paymentType').value;
    const amount = document.getElementById('paymentAmount').value;
    const paymentMethod = document.getElementById('paymentMethod').value;

    if (!paymentType || !amount || !paymentMethod) {
        alert('Please fill in all payment details');
        return;
    }

    if (paymentMethod === 'mpesaStk') {
        startMpesaPayment({
            source: 'payment',
            type: paymentType,
            amount: amount,
            phone: document.getElementById('paymentMpesaPhone').value
        });
        return;
    }

    const receiptNumber = 'RCP' + Date.now();
    const payment = {
        type: paymentType,
        amount: amount,
        date: new Date().toLocaleDateString(),
        status: 'Completed',
        paymentMethod: paymentAccounts[paymentMethod].label,
        transactionRef: receiptNumber,
        receiptNumber: receiptNumber
    };
    if (!frontendOnly) {
        getCurrentStudentId()
        .then(studentId => fetch('api.php?action=recordPayment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                payment_type: paymentType,
                amount: amount,
                due_date: new Date().toISOString().slice(0, 10),
                payment_method: payment.paymentMethod,
                transaction_id: receiptNumber,
                notes: 'Student clicked Send Payment. Receipt generated immediately.'
            })
        }))
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.message || 'Could not save payment to database');
            }
            payment.dbPaymentId = result.data.payment_id;
            return fetch('api.php?action=completePayment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payment_id: payment.dbPaymentId,
                    transaction_id: receiptNumber
                })
            });
        })
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.message || 'Could not complete payment in database');
            }
            savePaymentLocally(payment);
        })
        .catch(error => {
            console.error('Payment database error:', error);
            alert(error.message || 'Payment could not be saved to the database.');
        });
        return;
    }

    savePaymentLocally(payment);
}

function startMpesaPayment(details) {
    const phone = normalizeMpesaPhone(details.phone);
    if (!phone || phone.length !== 12 || !phone.startsWith('254')) {
        alert('Please enter a valid M-Pesa phone number, for example 254712345678.');
        return;
    }

    const payload = {
        source: details.source,
        amount: details.amount,
        phone: phone
    };

    if (details.source === 'payment') {
        payload.payment_type = details.type;
    } else {
        payload.donation_type = details.type;
        payload.purpose = 'COMMUJ donation';
        payload.donor_id = currentUser?.dbUserId || 0;
        payload.donor_name = details.anonymous ? 'Anonymous' : (currentUser?.name || currentUser?.fullName || currentUser?.username || 'Donor');
        payload.donor_email = currentUser?.email || 'anonymous@commuj.local';
    }

    const ready = details.source === 'payment'
        ? getCurrentStudentId().then(studentId => ({ ...payload, student_id: studentId }))
        : Promise.resolve(payload);

    ready
        .then(body => fetch('mpesa_api.php?action=initiateStkPush', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }))
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.message || 'Could not start M-Pesa STK Push');
            }

            const localRecord = {
                type: details.type,
                amount: details.amount,
                date: new Date().toLocaleDateString(),
                status: 'Pending M-Pesa',
                paymentMethod: 'M-Pesa STK Push',
                transactionRef: result.data.checkout_request_id,
                receiptNumber: '',
                checkoutRequestId: result.data.checkout_request_id
            };

            if (details.source === 'payment') {
                localRecord.dbPaymentId = result.data.payment_id;
                payments.push(localRecord);
                localStorage.setItem('payments', JSON.stringify(payments));
                bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
                renderPaymentHistory();
            } else {
                localRecord.purpose = 'COMMUJ donation';
                localRecord.anonymous = details.anonymous;
                localRecord.donor = payload.donor_name;
                localRecord.dbDonationId = result.data.donation_id;
                donations.push(localRecord);
                localStorage.setItem('donations', JSON.stringify(donations));
                bootstrap.Modal.getInstance(document.getElementById('donationModal')).hide();
                renderDonationHistory();
            }

            alert('STK Push sent. Enter your M-Pesa PIN on your phone. Receipt will appear after Safaricom confirms payment.');
            pollMpesaStatus(result.data.checkout_request_id, details.source);
        })
        .catch(error => {
            console.error('M-Pesa STK error:', error);
            alert(error.message || 'M-Pesa STK Push failed.');
        });
}

function pollMpesaStatus(checkoutRequestId, source, attempts = 0) {
    if (attempts > 20) {
        alert('M-Pesa confirmation is taking longer than expected. Check the admin panel or refresh later.');
        return;
    }

    setTimeout(() => {
        fetch(`mpesa_api.php?action=getTransactionStatus&checkout_request_id=${encodeURIComponent(checkoutRequestId)}`)
            .then(response => response.json())
            .then(result => {
                if (!result.success || !result.data) {
                    pollMpesaStatus(checkoutRequestId, source, attempts + 1);
                    return;
                }

                const tx = result.data;
                if (tx.status === 'completed') {
                    markLocalMpesaCompleted(checkoutRequestId, source, tx.mpesa_receipt || tx.transaction_id);
                    alert('M-Pesa payment confirmed. Receipt is now available.');
                    return;
                }

                if (tx.status === 'failed') {
                    markLocalMpesaFailed(checkoutRequestId, source);
                    alert('M-Pesa payment was not completed.');
                    return;
                }

                pollMpesaStatus(checkoutRequestId, source, attempts + 1);
            })
            .catch(() => pollMpesaStatus(checkoutRequestId, source, attempts + 1));
    }, 3000);
}

function markLocalMpesaCompleted(checkoutRequestId, source, receiptNumber) {
    const updateRecord = record => record.checkoutRequestId === checkoutRequestId
        ? { ...record, status: 'Completed', receiptNumber: receiptNumber || ('MPESA-' + Date.now()), transactionRef: receiptNumber || checkoutRequestId }
        : record;

    if (source === 'payment') {
        payments = payments.map(updateRecord);
        localStorage.setItem('payments', JSON.stringify(payments));
        renderPaymentStatusSummary();
        renderPaymentHistory();
    } else {
        donations = donations.map(updateRecord);
        localStorage.setItem('donations', JSON.stringify(donations));
        renderDonationHistory();
    }
}

function markLocalMpesaFailed(checkoutRequestId, source) {
    const updateRecord = record => record.checkoutRequestId === checkoutRequestId ? { ...record, status: 'Failed' } : record;
    if (source === 'payment') {
        payments = payments.map(updateRecord);
        localStorage.setItem('payments', JSON.stringify(payments));
        renderPaymentHistory();
    } else {
        donations = donations.map(updateRecord);
        localStorage.setItem('donations', JSON.stringify(donations));
        renderDonationHistory();
    }
}

function savePaymentLocally(payment) {
    payments.push(payment);
    localStorage.setItem('payments', JSON.stringify(payments));
    alert('Payment sent successfully. Receipt is now available.');

    document.getElementById('paymentForm').reset();
    updatePaymentInstructions('payment');
    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
    renderPaymentStatusSummary();
    renderPaymentHistory();
}

function getCurrentStudentId() {
    if (currentUser?.dbStudentId) {
        return Promise.resolve(currentUser.dbStudentId);
    }

    const identifier = currentUser?.studentId || currentUser?.email || currentUser?.username;
    if (!identifier) {
        return Promise.reject(new Error('Student record is missing. Please register/login again.'));
    }

    return fetch(`api.php?action=getStudentByIdentifier&identifier=${encodeURIComponent(identifier)}`)
        .then(response => response.json())
        .then(result => {
            if (!result.success || !result.data?.id) {
                return ensureCurrentUserStudentRecord();
            }
            currentUser.dbStudentId = result.data.id;
            currentUser.dbUserId = result.data.user_id;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            return result.data.id;
        });
}

function ensureCurrentUserStudentRecord() {
    return fetch('api.php?action=ensureStudentRecord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: currentUser?.username || currentUser?.studentId || currentUser?.email,
            student_id: currentUser?.studentId || currentUser?.username,
            email: currentUser?.email,
            password: currentUser?.password,
            role: currentUser?.role || currentRole || 'student',
            full_name: currentUser?.fullName || currentUser?.name || currentUser?.username,
            phone: currentUser?.phone,
            gender: currentUser?.gender,
            nationality: currentUser?.nationality,
            course: currentUser?.course,
            year_of_study: currentUser?.yearOfStudy,
            degree_type: currentUser?.degreeType,
            home_address: currentUser?.homeAddress,
            emergency_contact: currentUser?.emergencyContact,
            local_guardian: currentUser?.localGuardian
        })
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success || !result.data?.student_id) {
            throw new Error(result.message || 'Could not create student record in the database.');
        }
        currentUser.dbStudentId = result.data.student_id;
        currentUser.dbUserId = result.data.user_id;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        return result.data.student_id;
    });
}

function renderPaymentHistory() {
    const tbody = document.getElementById('paymentHistoryList');
    if (!tbody) return;

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No payments made yet.</td></tr>';
        return;
    }

    tbody.innerHTML = payments.map((payment, index) => `
        <tr>
            <td>${payment.date}</td>
            <td>${formatPaymentType(payment.type)}</td>
            <td>$${payment.amount}</td>
            <td>${payment.paymentMethod || 'Not specified'}</td>
            <td><span class="badge ${payment.status === 'Completed' ? 'bg-success' : 'bg-warning text-dark'}">${payment.status}</span></td>
            <td>${payment.status === 'Completed' ? `<button class="btn btn-sm btn-outline-primary" onclick="downloadReceipt(${index})">Download</button>` : '<span class="text-muted">Pending approval</span>'}</td>
        </tr>
    `).join('');
}

function downloadReceipt(index) {
    const payment = payments[index];
    if (!payment) return;
    const userName = currentUser?.fullName || currentUser?.name || currentUser?.username || 'Member';
    const receipt = [
        'COMMUJ Payment Receipt',
        '----------------------',
        `Receipt No: ${payment.receiptNumber}`,
        `Name: ${userName}`,
        `Payment Type: ${payment.type}`,
        `Amount: $${payment.amount}`,
        `Method: ${payment.paymentMethod || 'Online'}`,
        `Status: ${payment.status}`,
        `Date: ${payment.date}`
    ].join('\n');
    const blob = new Blob([receipt], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${payment.receiptNumber}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
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
    renderDonationHistory();
}

function showDonationModal(donationType) {
    document.getElementById('donationModalTitle').textContent = 'Make ' + donationType + ' Donation';
    updatePaymentInstructions('donation');
    const modal = new bootstrap.Modal(document.getElementById('donationModal'));
    modal.show();
}

function submitDonation() {
    const amount = document.getElementById('donationAmount').value;
    const paymentMethod = document.getElementById('donationPaymentMethod').value;
    const isAnonymous = document.getElementById('anonymousDonation').checked;

    if (!amount || !paymentMethod) {
        alert('Please enter the donation amount and payment method');
        return;
    }

    if (paymentMethod === 'mpesaStk') {
        startMpesaPayment({
            source: 'donation',
            type: document.getElementById('donationModalTitle').textContent.replace('Make ', '').replace(' Donation', ''),
            amount: amount,
            phone: document.getElementById('donationMpesaPhone').value,
            anonymous: isAnonymous
        });
        return;
    }

    const receiptNumber = 'DRT' + Date.now();
    const donation = {
        type: document.getElementById('donationModalTitle').textContent.replace('Make ', '').replace(' Donation', ''),
        purpose: 'COMMUJ donation',
        amount: amount,
        date: new Date().toLocaleDateString(),
        paymentMethod: paymentAccounts[paymentMethod].label,
        transactionRef: receiptNumber,
        status: 'Completed',
        anonymous: isAnonymous,
        donor: isAnonymous ? 'Anonymous' : (currentUser.name || currentUser.fullName || currentUser.username),
        receiptNumber: receiptNumber
    };

    if (!frontendOnly) {
        fetch('api.php?action=recordDonation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                donor_id: currentUser?.dbUserId || 0,
                donor_name: donation.donor,
                donor_email: currentUser?.email || 'anonymous@commuj.local',
                amount: amount,
                donation_type: donation.type,
                purpose: donation.purpose,
                payment_method: donation.paymentMethod,
                transaction_id: receiptNumber
            })
        })
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.message || 'Could not save donation to database');
            }
            donation.dbDonationId = result.data.donation_id;
            saveDonationLocally(donation);
        })
        .catch(error => {
            console.error('Donation database error:', error);
            alert(error.message || 'Donation could not be saved to the database.');
        });
        return;
    }

    saveDonationLocally(donation);
}

function saveDonationLocally(donation) {
    donations.push(donation);
    localStorage.setItem('donations', JSON.stringify(donations));
    alert('Donation sent successfully. Receipt is now available.');

    document.getElementById('donationForm').reset();
    updatePaymentInstructions('donation');
    bootstrap.Modal.getInstance(document.getElementById('donationModal')).hide();
    renderDonationHistory();
}

function renderDonationHistory() {
    const tbody = document.getElementById('donationHistoryList');
    if (!tbody) return;

    if (donations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No donations made yet.</td></tr>';
        return;
    }

    tbody.innerHTML = donations.map((donation, index) => `
        <tr>
            <td>${donation.date || 'Recently'}</td>
            <td>${donation.type || 'Donation'}</td>
            <td>$${donation.amount}</td>
            <td>${donation.purpose || 'COMMUJ donation'}</td>
            <td>${donation.paymentMethod || 'Not specified'}</td>
            <td>${donation.status === 'Completed' ? `<button class="btn btn-sm btn-outline-primary" onclick="downloadDonationReceipt(${index})">Download</button>` : '<span class="text-muted">Pending approval</span>'}</td>
        </tr>
    `).join('');
}

function downloadDonationReceipt(index) {
    const donation = donations[index];
    if (!donation) return;
    const userName = donation.donor || currentUser?.fullName || currentUser?.name || currentUser?.username || 'Donor';
    const receipt = [
        'COMMUJ Donation Receipt',
        '-----------------------',
        `Receipt No: ${donation.receiptNumber}`,
        `Donor: ${userName}`,
        `Donation Type: ${donation.type || 'Donation'}`,
        `Purpose: ${donation.purpose || 'COMMUJ donation'}`,
        `Payment Method: ${donation.paymentMethod || 'Not specified'}`,
        `Amount: $${donation.amount}`,
        `Date: ${donation.date || new Date().toLocaleDateString()}`
    ].join('\n');
    const blob = new Blob([receipt], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${donation.receiptNumber || 'donation-receipt'}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
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
    loadEventsFromApi().finally(() => renderAdminEventsTable());
}

function renderAdminEventsTable() {
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
    const welfareCount = welfareRequests.filter(w => w.status === 'Pending' || w.status === 'Pending Review').length;
    document.getElementById('welfareStatusValue').textContent = welfareCount || '0';
    loadDashboardPrayerTimes();

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

function loadDashboardPrayerTimes() {
    const container = document.getElementById('prayerTimesList');
    if (!container) return;
    const today = new Date().toISOString().slice(0, 10);
    const prayerRequest = frontendOnly
        ? Promise.resolve(getStaticApiData('getPrayerTimes'))
        : fetch(`admin_api.php?action=getPrayerTimes&date=${today}`).then(response => response.json());
    prayerRequest.then(result => {
        const data = result.data || {};
        const prayers = [
            ['Fajr', data.fajr],
            ['Dhuhr', data.dhuhr],
            ['Asr', data.asr],
            ['Maghrib', data.maghrib],
            ['Isha', data.isha]
        ];
        container.innerHTML = prayers.map(([name, time]) => `
            <div class="prayer-time">
                <span class="prayer-name">${name}</span>
                <span class="prayer-time-value">${time || 'Not set'}</span>
            </div>
        `).join('');
    }).catch(() => {
        container.innerHTML = '<p class="text-muted mb-0">Prayer times have not been added yet.</p>';
    });
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
            console.log('Hadith API unavailable or no hadiths added:', error);
            allHadiths = [];
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
            console.log('Daily hadith API unavailable or no hadith added:', error);
            if (allHadiths.length > 0) {
                const today = new Date().getDate();
                currentHadithIndex = today % allHadiths.length;
                displayHadith(allHadiths[currentHadithIndex], currentHadithIndex + 1, allHadiths.length);
                hadithsLoaded = true;
            } else {
                displayHadith(null, 0, 0);
                hadithsLoaded = true;
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

    if (!hadith) {
        if (textElement) textElement.textContent = 'No hadith has been added yet.';
        if (referenceElement) referenceElement.textContent = '';
        if (translationElement) translationElement.textContent = '';
        if (counterElement) counterElement.textContent = '0';
        if (totalElement) totalElement.textContent = '0';
        currentHadithIndex = 0;
        return;
    }

    if (textElement) {
        textElement.textContent = hadith.arabic || 'Hadith not found';
        textElement.style.animation = 'none';
        setTimeout(() => {
            textElement.style.animation = 'welcomeFadeInScale 0.6s ease-out';
        }, 10);
    }

    if (referenceElement) {
        referenceElement.textContent = hadith.reference || '';
    }

    if (translationElement) {
        translationElement.textContent = hadith.english ? `Translation: ${hadith.english}` : 'Translation not available';
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

// Keep the user view empty until admins add hadiths.
function loadLocalHadiths() {
    allHadiths = [];
    currentHadithIndex = 0;
    displayHadith(null, 0, 0);
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
    const galleryList = document.getElementById('galleryItemsList');
    if (!galleryList) return;

    const galleryRequest = frontendOnly
        ? Promise.resolve(getStaticApiData('getGallery'))
        : fetch('admin_api.php?action=getGallery').then(response => response.json());

    galleryRequest
    .then(result => {
        let galleryItems = result.data || [];

        if (galleryItems.length === 0) {
            galleryList.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No gallery items yet</td></tr>';
            return;
        }

        galleryList.innerHTML = galleryItems.map((item, index) => {
            const imageUrl = item.image_url || item.imageData || item.imageUrl || '';
            const removeId = item.id || index;
            return `
                <tr>
                    <td>${item.title}</td>
                    <td>${item.description || ''}</td>
                    <td>${imageUrl ? `<img src="${imageUrl}" alt="${item.title}" style="max-height:80px; max-width:120px; object-fit:cover; border-radius:6px;">` : '<span class="text-muted">No image</span>'}</td>
                    <td><i class="${item.icon || 'fas fa-images'}"></i></td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="removeGalleryItem(${removeId})">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    })
    .catch(error => {
        console.error('Error loading gallery:', error);
        galleryList.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading gallery items</td></tr>';
    });
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

        if (!frontendOnly) {
            fetch('admin_api.php?action=addGalleryItem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title,
                    description: description,
                    image_url: imageData,
                    uploaded_by: currentUser?.id || 0
                })
            })
            .then(response => response.json())
            .then(result => {
                if (!result.success) {
                    throw new Error(result.message || 'Error saving gallery item');
                }

                clearGalleryForm(imageInput);
                bootstrap.Modal.getInstance(document.getElementById('addGalleryModal')).hide();
                loadAdminGallery();
                loadGalleryContent();
                showNotification('Gallery item added successfully!', 'success');
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification(error.message || 'Error saving gallery item', 'danger');
            });
            return;
        }

        let galleryItems = JSON.parse(localStorage.getItem('galleryItems')) || [];

        galleryItems.push({
            title: title,
            description: description,
            icon: icon,
            imageData: imageData
        });

        localStorage.setItem('galleryItems', JSON.stringify(galleryItems));

        clearGalleryForm(imageInput);

        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('addGalleryModal')).hide();

        // Refresh gallery display
        loadAdminGallery();
        loadGalleryContent(); // Refresh landing page gallery

        showNotification('Gallery item added successfully!', 'success');
    };
    reader.readAsDataURL(file);
}

function clearGalleryForm(imageInput) {
    document.getElementById('galleryTitle').value = '';
    document.getElementById('galleryDescription').value = '';
    document.getElementById('galleryIcon').value = '';
    imageInput.value = '';
    const preview = document.getElementById('galleryImagePreview');
    preview.src = '';
    preview.classList.add('d-none');
}

function removeGalleryItem(index) {
    if (!confirm('Are you sure you want to remove this gallery item?')) return;

    if (!frontendOnly) {
        fetch('admin_api.php?action=deleteGalleryItem', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gallery_id: index })
        })
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.message || 'Error removing gallery item');
            }
            loadAdminGallery();
            loadGalleryContent();
            showNotification('Gallery item removed!', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification(error.message || 'Error removing gallery item', 'danger');
        });
        return;
    }

    let galleryItems = JSON.parse(localStorage.getItem('galleryItems')) || [];
    galleryItems.splice(index, 1);
    localStorage.setItem('galleryItems', JSON.stringify(galleryItems));

    loadAdminGallery();
    loadGalleryContent(); // Refresh landing page gallery
    showNotification('Gallery item removed!', 'success');
}
