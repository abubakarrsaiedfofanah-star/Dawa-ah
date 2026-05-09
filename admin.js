// Dawa'ah Admin Panel JavaScript

const XAMPP_BASE_URL = 'http://localhost/comahs/';
const API_URL = location.protocol === 'file:' ? XAMPP_BASE_URL + 'admin_api.php' : 'admin_api.php';
let currentAdmin = null;
let editingReligiousActivity = null;
let adminStudentRequesters = [];

const realFetch = window.fetch.bind(window);
const useStaticAdminApi = location.hostname.endsWith('github.io') || location.protocol === 'file:';
const LOCAL_ADMIN_ACCOUNTS_KEY = 'DawaahAdminAccounts';
const LOCAL_ADMIN_CLEANUP_KEY = 'DawaahAdminAccountsMainOnlyCleanup20260509';
const LOCAL_ADMIN_FULL_RESET_KEY = 'DawaahAdminFullReset20260509';
const ADMIN_LOGIN_FAILURE_KEY = 'DawaahAdminLoginFailures';
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_EMAIL = 'dawaah.admin@dawaah.local';
const DEFAULT_ADMIN_PASSWORD = 'DawaahAdmin@2026';
const ADMIN_HASH_ALGORITHM = 'PBKDF2-SHA-256';
const ADMIN_HASH_ITERATIONS = 150000;
const ADMIN_ACCOUNT_LIMIT = 3;
const ADMIN_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const ADMIN_LOGIN_LOCKOUT_MS = 5 * 60 * 1000;
const ADMIN_MAX_FAILED_LOGINS = 5;
let adminSessionTimeoutId = null;

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
            .then(result => {
                logStaticContentActivity(action, method, payload, result);
                return result;
            })
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

function logStaticContentActivity(action, method, payload, result) {
    const trackedActions = [
        'createAnnouncement',
        'deleteAnnouncement',
        'createEvent',
        'deleteEvent',
        'addLeader',
        'deleteLeader',
        'addGalleryItem',
        'deleteGalleryItem',
        'addHadith',
        'deleteHadith',
        'updateWelfareStatus',
        'setPrayerTimes',
        'saveReligiousActivity',
        'deleteReligiousActivity',
        'addResource',
        'deleteResource',
        'approvePayment',
        'approveDonation',
        'seedSampleData'
    ];
    if (!result?.success || !trackedActions.includes(action) || !['POST', 'PUT', 'DELETE'].includes(method)) {
        return;
    }
    logLocalAdminActivity(action, {
        method,
        message: result.message || 'Saved locally',
        request: payload,
        response: result.data || {}
    });
}

function shouldQueueLocalApproval(action, method) {
    return ['POST', 'PUT', 'DELETE'].includes(method) && [
        'createAnnouncement',
        'deleteAnnouncement',
        'createEvent',
        'deleteEvent',
        'addLeader',
        'deleteLeader',
        'addGalleryItem',
        'deleteGalleryItem',
        'addHadith',
        'deleteHadith',
        'updateWelfareStatus',
        'setPrayerTimes',
        'saveReligiousActivity',
        'deleteReligiousActivity',
        'addResource',
        'deleteResource',
        'approvePayment',
        'approveDonation',
        'seedSampleData'
    ].includes(action);
}

function approveLocalPendingAdminActivity(logId) {
    const log = readStore('adminActivityLogs').find(item => Number(item.id) === Number(logId));
    if (!log || log.action !== 'pendingAdminApproval') {
        return { success: false, message: 'Pending approval item not found.' };
    }
    const details = log.details || {};
    const requestedAction = details.requested_action;
    const request = details.request || {};
    const result = runApprovedLocalAction(requestedAction, request);
    if (!result.success) return result;
    logLocalAdminActivity('approvePendingAdminActivity', {
        log_id: logId,
        approved_admin: log.username || '',
        approved_action: requestedAction,
        result: result.data || {}
    });
    return { success: true, message: 'Pending action approved and applied', data: result.data || {} };
}

function runApprovedLocalAction(actionName, request) {
    if (actionName === 'createAnnouncement') {
        const item = addStoreItem('adminAnnouncements', request);
        return { success: true, data: { announcement_id: item.id, id: item.id } };
    }
    if (actionName === 'deleteAnnouncement') {
        deleteStoreItem('adminAnnouncements', request.announcement_id);
        return { success: true };
    }
    if (actionName === 'createEvent') {
        const item = addStoreItem('adminEvents', request);
        return { success: true, data: { event_id: item.id, id: item.id } };
    }
    if (actionName === 'deleteEvent') {
        deleteStoreItem('adminEvents', request.event_id);
        return { success: true };
    }
    if (actionName === 'addLeader') {
        const item = addStoreItem('publicLeaders', request);
        return { success: true, data: { leader_id: item.id, id: item.id } };
    }
    if (actionName === 'deleteLeader') {
        deleteStoreItem('publicLeaders', request.leader_id);
        return { success: true };
    }
    if (actionName === 'addGalleryItem') {
        const item = addStoreItem('galleryItems', { ...request, imageData: request.image_url, imageUrl: request.image_url });
        return { success: true, data: { gallery_id: item.id, id: item.id } };
    }
    if (actionName === 'deleteGalleryItem') {
        deleteStoreItem('galleryItems', request.gallery_id);
        return { success: true };
    }
    if (actionName === 'addHadith') {
        const item = addStoreItem('adminHadiths', request);
        return { success: true, data: { hadith_id: item.id, id: item.id } };
    }
    if (actionName === 'deleteHadith') {
        deleteStoreItem('adminHadiths', request.hadith_id);
        return { success: true };
    }
    if (actionName === 'addResource') {
        const item = addStoreItem('adminResources', request);
        return { success: true, data: { resource_id: item.id, id: item.id } };
    }
    if (actionName === 'deleteResource') {
        deleteStoreItem('adminResources', request.resource_id);
        return { success: true };
    }
    if (actionName === 'setPrayerTimes') {
        localStorage.setItem('adminPrayerTimes', JSON.stringify(request));
        return { success: true };
    }
    if (actionName === 'saveReligiousActivity') {
        applyReligiousActivityRequest(request);
        return { success: true };
    }
    if (actionName === 'deleteReligiousActivity') {
        applyReligiousDeleteRequest(request);
        return { success: true };
    }
    return { success: false, message: 'This pending action cannot be approved automatically.' };
}

function deleteLocalAdminActivityItem(logId) {
    const log = readStore('adminActivityLogs').find(item => Number(item.id) === Number(logId));
    if (!log) {
        return { success: false, message: 'Activity log not found.' };
    }

    const details = log.details || {};
    const target = getActivityTarget(log.action, details);
    if (!target) {
        return { success: false, message: 'This activity cannot be deleted automatically.' };
    }

    deleteStoreItem(target.store, target.id);
    logLocalAdminActivity('deleteAdminActivityItem', {
        log_id: logId,
        opposed_admin: log.username || '',
        opposed_action: log.action
    });
    return { success: true, message: 'Item deleted and action recorded.' };
}

function undoLocalAdminActivityItem(logId) {
    const sessionAdmin = JSON.parse(sessionStorage.getItem('currentAdminUser') || 'null');
    const log = readStore('adminActivityLogs').find(item => Number(item.id) === Number(logId));
    if (!log) {
        return { success: false, message: 'Activity log not found.' };
    }
    if (Number(log.admin_id) !== Number(sessionAdmin?.id)) {
        return { success: false, message: 'You can only undo your own admin actions.' };
    }

    const religiousUndo = undoLocalReligiousActivity(log.action, log.details || {});
    if (religiousUndo) {
        logLocalAdminActivity('undoMyAdminActivityItem', {
            log_id: logId,
            undone_action: log.action
        });
        return { success: true, message: 'Your action was undone and recorded.' };
    }

    const prayerUndo = undoLocalPrayerTimes(log.action, log.details || {});
    if (prayerUndo) {
        logLocalAdminActivity('undoMyAdminActivityItem', {
            log_id: logId,
            undone_action: log.action
        });
        return { success: true, message: 'Your action was undone and recorded.' };
    }

    if (undoLocalReligiousActivity(log.action, log.details || {}) || undoLocalPrayerTimes(log.action, log.details || {})) {
        logLocalAdminActivity('deleteAdminActivityItem', {
            log_id: logId,
            opposed_admin: log.username || '',
            opposed_action: log.action
        });
        return { success: true, message: 'Item deleted and action recorded.' };
    }

    const target = getActivityTarget(log.action, log.details || {});
    if (!target) {
        return { success: false, message: 'This activity cannot be undone automatically.' };
    }

    deleteStoreItem(target.store, target.id);
    logLocalAdminActivity('undoMyAdminActivityItem', {
        log_id: logId,
        undone_action: log.action
    });
    return { success: true, message: 'Your action was undone and recorded.' };
}

function undoLocalReligiousActivity(actionName, details) {
    if (!['saveReligiousActivity', 'deleteReligiousActivity'].includes(actionName)) {
        return false;
    }
    const request = details.request || details;
    const type = request.type;
    const key = type === 'lecture' ? 'lectures' : type;
    if (!['jummah', 'ramadan', 'lectures'].includes(key)) return false;

    const data = getReligiousActivities();
    const item = request.item || null;
    const previousItem = request.previous_item || null;

    if (actionName === 'deleteReligiousActivity' && previousItem) {
        data[key] = upsertReligiousActivity(data[key] || [], previousItem, previousItem.id);
    } else if (previousItem) {
        data[key] = upsertReligiousActivity(data[key] || [], previousItem, previousItem.id);
    } else if (item?.id) {
        data[key] = (data[key] || []).filter(existing => Number(existing.id) !== Number(item.id));
    } else {
        return false;
    }

    saveReligiousActivities(data);
    renderReligiousActivitiesAdmin();
    return true;
}

function undoLocalPrayerTimes(actionName, details) {
    if (actionName !== 'setPrayerTimes') return false;
    const request = details.request || details;
    const previous = request._previous_prayer_times;
    if (!previous || !previous.date) return false;
    localStorage.setItem('adminPrayerTimes', JSON.stringify(previous));
    renderPrayerPreview(previous);
    return true;
}

function getActivityTarget(actionName, details) {
    const response = details.response || {};
    const request = details.request || {};
    const mappings = {
        createAnnouncement: { store: 'adminAnnouncements', keys: ['announcement_id', 'id'] },
        createEvent: { store: 'adminEvents', keys: ['event_id', 'id'] },
        addLeader: { store: 'publicLeaders', keys: ['leader_id', 'id'] },
        addGalleryItem: { store: 'galleryItems', keys: ['gallery_id', 'id'] },
        addHadith: { store: 'adminHadiths', keys: ['hadith_id', 'id'] },
        addResource: { store: 'adminResources', keys: ['resource_id', 'id'] },
        saveReligiousActivity: { store: null, keys: ['id'] },
        setPrayerTimes: { store: null, keys: ['date'] }
    };
    const mapping = mappings[actionName];
    if (!mapping) return null;
    if (actionName === 'saveReligiousActivity') {
        const request = details.request || details;
        return request.item?.id ? { store: 'religious', id: request.item.id } : null;
    }
    if (actionName === 'setPrayerTimes') {
        const request = details.request || details;
        return request._previous_prayer_times?.date ? { store: 'prayerTimes', id: request._previous_prayer_times.date } : null;
    }

    const id = mapping.keys.map(key => response[key] || request[key] || details[key]).find(Boolean);
    return id ? { store: mapping.store, id } : null;
}

function handleStaticAdminApi(action, method, payload, params) {
    if (
        !isCurrentLocalMainAdmin() &&
        shouldQueueLocalApproval(action, method)
    ) {
        logLocalAdminActivity('pendingAdminApproval', {
            requested_action: action,
            method,
            request: payload
        });
        return { success: true, message: 'Sent to main admin for approval', data: { pending_approval: true } };
    }

    switch (action) {
        case 'checkAdminSession': {
            const sessionAdmin = JSON.parse(sessionStorage.getItem('currentAdminUser') || 'null');
            if (!sessionAdmin) {
                return { success: false, message: 'Admin login required' };
            }
            const storedAdmin = findLocalAdminAccount(sessionAdmin);
            return { success: true, data: storedAdmin ? publicAdminAccount(storedAdmin) : sessionAdmin };
        }
        case 'getAdminSetupStatus': {
            const adminCount = getLocalAdminAccounts().length;
            return {
                success: true,
                data: {
                    admin_count: adminCount,
                    admin_limit: ADMIN_ACCOUNT_LIMIT,
                    can_register_first_admin: adminCount === 0
                }
            };
        }
        case 'registerAdmin':
            return registerLocalAdmin(payload);
        case 'loginAdmin':
            return loginLocalAdmin(payload);
        case 'logoutAdmin':
            sessionStorage.removeItem('currentAdminUser');
            return { success: true };
        case 'listAdminAccounts':
            if (!isCurrentLocalMainAdmin()) return { success: false, message: 'Only the main admin can manage admin accounts.' };
            return listLocalAdminAccounts();
        case 'createAdminAccount':
            if (!isCurrentLocalMainAdmin()) return { success: false, message: 'Only the main admin can manage admin accounts.' };
            return createLocalAdminByAdmin(payload);
        case 'deleteAdminAccount':
            if (!isCurrentLocalMainAdmin()) return { success: false, message: 'Only the main admin can manage admin accounts.' };
            return deleteLocalAdminAccount(payload.admin_id);
        case 'changeAdminPassword':
            return changeLocalAdminPassword(payload);
        case 'resetAdminPassword':
            return resetLocalAdminPassword(payload);
        case 'getAdminActivityLogs':
            if (!isCurrentLocalMainAdmin()) return { success: false, message: 'Only the main admin can view admin activity.' };
            return { success: true, data: readStore('adminActivityLogs').slice(-100).reverse() };
        case 'getMyAdminActivityLogs': {
            const sessionAdmin = JSON.parse(sessionStorage.getItem('currentAdminUser') || 'null');
            const logs = readStore('adminActivityLogs')
                .filter(log => Number(log.admin_id) === Number(sessionAdmin?.id))
                .slice(-50)
                .reverse();
            return { success: true, data: logs };
        }
        case 'opposeAdminActivity':
            if (!isCurrentLocalMainAdmin()) return { success: false, message: 'Only the main admin can oppose admin activity.' };
            logLocalAdminActivity('opposeAdminActivity', {
                log_id: payload.log_id,
                reason: payload.reason || ''
            });
            return { success: true, message: 'Activity opposed and recorded' };
        case 'deleteAdminActivityItem':
            if (!isCurrentLocalMainAdmin()) return { success: false, message: 'Only the main admin can delete admin activity items.' };
            return deleteLocalAdminActivityItem(payload.log_id);
        case 'approvePendingAdminActivity':
            if (!isCurrentLocalMainAdmin()) return { success: false, message: 'Only the main admin can approve pending actions.' };
            return approveLocalPendingAdminActivity(payload.log_id);
        case 'rejectPendingAdminActivity':
            if (!isCurrentLocalMainAdmin()) return { success: false, message: 'Only the main admin can reject pending actions.' };
            logLocalAdminActivity('rejectPendingAdminActivity', {
                log_id: payload.log_id,
                reason: payload.reason || ''
            });
            return { success: true, message: 'Pending action rejected and recorded' };
        case 'undoMyAdminActivityItem':
            return undoLocalAdminActivityItem(payload.log_id);

        case 'getAnnouncements':
            return { success: true, data: readStore('adminAnnouncements') };
        case 'createAnnouncement': {
            const item = addStoreItem('adminAnnouncements', payload);
            return { success: true, message: 'Saved locally', data: { announcement_id: item.id, id: item.id } };
        }
        case 'deleteAnnouncement':
            deleteStoreItem('adminAnnouncements', payload.announcement_id);
            return { success: true };

        case 'getEvents':
            return { success: true, data: readStore('adminEvents') };
        case 'getEventRegistrations':
            return { success: true, data: readStore('registeredEvents') };
        case 'createEvent': {
            const item = addStoreItem('adminEvents', payload);
            return { success: true, message: 'Saved locally', data: { event_id: item.id, id: item.id } };
        }
        case 'deleteEvent':
            deleteStoreItem('adminEvents', payload.event_id);
            return { success: true };

        case 'getLeaders':
            return { success: true, data: readStore('publicLeaders') };
        case 'addLeader': {
            const item = addStoreItem('publicLeaders', payload);
            return { success: true, message: 'Saved locally', data: { leader_id: item.id, id: item.id } };
        }
        case 'deleteLeader':
            deleteStoreItem('publicLeaders', payload.leader_id);
            return { success: true };

        case 'getGallery':
            return { success: true, data: readStore('galleryItems') };
        case 'addGalleryItem': {
            const item = addStoreItem('galleryItems', {
                ...payload,
                imageData: payload.image_url,
                imageUrl: payload.image_url
            });
            return { success: true, message: 'Saved locally', data: { gallery_id: item.id, id: item.id } };
        }
        case 'deleteGalleryItem':
            deleteStoreItem('galleryItems', payload.gallery_id);
            return { success: true };

        case 'getHadiths':
            return { success: true, data: readStore('adminHadiths') };
        case 'addHadith': {
            const item = addStoreItem('adminHadiths', payload);
            return { success: true, message: 'Saved locally', data: { hadith_id: item.id, id: item.id } };
        }
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
        case 'addResource': {
            const item = addStoreItem('adminResources', payload);
            return { success: true, message: 'Saved locally', data: { resource_id: item.id, id: item.id } };
        }
        case 'deleteResource':
            deleteStoreItem('adminResources', payload.resource_id);
            return { success: true };
        case 'seedSampleData':
            addStoreItem('adminAnnouncements', {
                title: "Welcome to Dawa'ah",
                content: 'This is a sample announcement. Open through XAMPP/PHP to save sample records into MySQL.',
                priority: 'medium',
                author_name: 'Admin'
            });
            addStoreItem('adminResources', {
                title: 'Sample Student Resource',
                description: 'This sample resource is saved in browser storage because the page is not running through XAMPP/PHP.',
                resource_type: 'article',
                category: 'Student Support',
                url: 'https://www.dawaah.org'
            });
            addStoreItem('galleryItems', {
                title: 'Sample Gallery Item',
                description: 'This sample gallery item is saved locally. Use XAMPP/PHP for database saving.',
                image_url: 'https://via.placeholder.com/800x500.png?text=Dawaah+Gallery',
                imageData: 'https://via.placeholder.com/800x500.png?text=Dawaah+Gallery',
                imageUrl: 'https://via.placeholder.com/800x500.png?text=Dawaah+Gallery'
            });
            return { success: true, message: 'Saved sample records locally' };

        default:
            return { success: false, message: 'Unsupported static action' };
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', async function() {
    normalizeLocalAdminAccountsOnce();
    document.getElementById('adminLoginForm')?.addEventListener('submit', handleAdminLogin);
    document.getElementById('adminRegisterForm')?.addEventListener('submit', handleAdminRegistration);
    document.getElementById('adminCreateForm')?.addEventListener('submit', handleManagedAdminCreate);
    document.getElementById('adminChangePasswordForm')?.addEventListener('submit', handleAdminPasswordChange);
    await refreshAdminSetupUi();
    const isAuthenticated = await checkAdminAuth();
    if (isAuthenticated) {
        startAdminSessionTimer();
        loadAllData();
        setInterval(loadAllData, 30000); // Refresh every 30 seconds
    }
});

['click', 'keydown', 'mousemove', 'touchstart'].forEach(eventName => {
    document.addEventListener(eventName, () => {
        if (currentAdmin) startAdminSessionTimer();
    }, { passive: true });
});

// Check if user is authenticated as admin
async function checkAdminAuth() {
    try {
        const response = await fetch(`${API_URL}?action=checkAdminSession`);
        const result = await response.json();
        if (!result.success || !result.data) {
            showAdminLogin(useStaticAdminApi ? getLocalAdminPrompt() : '');
            return false;
        }

        setAdminUser(result.data);
        showAdminPanel();
        return true;
    } catch (error) {
        showAdminLogin(getLocalAdminPrompt());
        return false;
    }
}

function getLocalAdminPrompt() {
    const count = getLocalAdminAccounts().length;
    if (count === 0) {
        return 'Create the first admin account. After that, admins are added inside the panel.';
    }
    return 'Login with an admin account. New admins must be added inside the panel.';
}

async function refreshAdminSetupUi() {
    const registerItem = document.getElementById('adminRegisterTabItem');
    const registerButton = document.getElementById('adminRegisterTabBtn');
    const loginButton = document.getElementById('adminLoginTabBtn');
    try {
        const response = await fetch(`${API_URL}?action=getAdminSetupStatus`);
        const result = await response.json();
        const canRegister = Boolean(result.success && result.data?.can_register_first_admin);
        registerItem?.classList.toggle('d-none', !canRegister);
        if (!canRegister && loginButton) {
            bootstrap.Tab.getOrCreateInstance(loginButton).show();
        } else if (registerButton) {
            bootstrap.Tab.getOrCreateInstance(registerButton).show();
        }
    } catch (error) {
        const canRegister = useStaticAdminApi && getLocalAdminAccounts().length === 0;
        registerItem?.classList.toggle('d-none', !canRegister);
    }
}

function getLocalAdminAccounts() {
    return JSON.parse(localStorage.getItem(LOCAL_ADMIN_ACCOUNTS_KEY) || '[]');
}

function saveLocalAdminAccounts(accounts) {
    localStorage.setItem(LOCAL_ADMIN_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getLocalMainAdminId() {
    const accounts = getLocalAdminAccounts();
    const defaultAdmin = accounts.find(account =>
        account.username?.toLowerCase() === DEFAULT_ADMIN_USERNAME ||
        account.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL
    );
    return Number((defaultAdmin || accounts[0] || {}).id || 0);
}

function normalizeLocalAdminAccountsOnce() {
    if (useStaticAdminApi && !localStorage.getItem(LOCAL_ADMIN_FULL_RESET_KEY)) {
        localStorage.removeItem(LOCAL_ADMIN_ACCOUNTS_KEY);
        localStorage.removeItem('adminActivityLogs');
        sessionStorage.removeItem('currentAdminUser');
        localStorage.setItem(LOCAL_ADMIN_FULL_RESET_KEY, '1');
        return;
    }
    if (!useStaticAdminApi || localStorage.getItem(LOCAL_ADMIN_CLEANUP_KEY)) return;
    const accounts = getLocalAdminAccounts();
    if (!accounts.length) {
        localStorage.setItem(LOCAL_ADMIN_CLEANUP_KEY, '1');
        return;
    }
    const mainAdmin = accounts.find(account =>
        account.username?.toLowerCase() === DEFAULT_ADMIN_USERNAME ||
        account.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL
    ) || accounts[0];
    saveLocalAdminAccounts([mainAdmin]);
    sessionStorage.removeItem('currentAdminUser');
    localStorage.setItem(LOCAL_ADMIN_CLEANUP_KEY, '1');
}

function isCurrentLocalMainAdmin() {
    const sessionAdmin = JSON.parse(sessionStorage.getItem('currentAdminUser') || 'null');
    return isLocalMainAdminCandidate(sessionAdmin);
}

function findLocalAdminAccount(adminLike) {
    const accounts = getLocalAdminAccounts();
    return accounts.find(admin => Number(admin.id) === Number(adminLike.id)) ||
        accounts.find(admin =>
            String(admin.username || '').toLowerCase() === String(adminLike.username || '').toLowerCase() ||
            String(admin.email || '').toLowerCase() === String(adminLike.email || '').toLowerCase()
        );
}

function isLocalMainAdminCandidate(adminLike) {
    if (!adminLike) return false;
    const accounts = getLocalAdminAccounts();
    if (accounts.length <= 1) return true;
    const username = String(adminLike.username || '').toLowerCase();
    const email = String(adminLike.email || '').toLowerCase();
    return Number(adminLike.id) === getLocalMainAdminId() ||
        username === DEFAULT_ADMIN_USERNAME ||
        email === DEFAULT_ADMIN_EMAIL;
}

function isKnownMainAdminIdentity(adminLike) {
    if (!adminLike) return false;
    const username = String(adminLike.username || '').toLowerCase();
    const email = String(adminLike.email || '').toLowerCase();
    return username === DEFAULT_ADMIN_USERNAME ||
        email === DEFAULT_ADMIN_EMAIL;
}

function logLocalAdminActivity(actionName, details = {}) {
    const sessionAdmin = JSON.parse(sessionStorage.getItem('currentAdminUser') || 'null');
    if (!sessionAdmin) return;
    addStoreItem('adminActivityLogs', {
        admin_id: sessionAdmin.id,
        username: sessionAdmin.username,
        email: sessionAdmin.email || '',
        action: actionName,
        details,
        ip_address: 'local browser'
    });
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

function createPasswordSalt() {
    const salt = new Uint8Array(16);
    if (window.crypto?.getRandomValues) {
        window.crypto.getRandomValues(salt);
        return bytesToHex(salt);
    }
    for (let i = 0; i < salt.length; i += 1) {
        salt[i] = Math.floor(Math.random() * 256);
    }
    return bytesToHex(salt);
}

async function legacyHashAdminPassword(password) {
    if (window.crypto?.subtle) {
        const data = new TextEncoder().encode(password);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return bytesToHex(new Uint8Array(digest));
    }
    return btoa(unescape(encodeURIComponent(password)));
}

async function hashAdminPassword(password, salt = createPasswordSalt()) {
    if (!window.crypto?.subtle) {
        return {
            passwordHash: await legacyHashAdminPassword(`${salt}:${password}`),
            passwordSalt: salt,
            passwordIterations: 1,
            passwordAlgorithm: 'SHA-256-FALLBACK'
        };
    }

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: hexToBytes(salt),
            iterations: ADMIN_HASH_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    return {
        passwordHash: bytesToHex(new Uint8Array(derivedBits)),
        passwordSalt: salt,
        passwordIterations: ADMIN_HASH_ITERATIONS,
        passwordAlgorithm: ADMIN_HASH_ALGORITHM
    };
}

function publicAdminAccount(admin) {
    const {
        passwordHash,
        passwordSalt,
        passwordIterations,
        passwordAlgorithm,
        ...publicAdmin
    } = admin;
    return {
        ...publicAdmin,
        isMainAdmin: Number(admin.id) === getLocalMainAdminId()
    };
}

async function registerLocalAdmin(payload) {
    const username = String(payload.username || '').trim();
    const email = String(payload.email || '').trim();
    const password = String(payload.password || '');
    const accounts = getLocalAdminAccounts();

    if (!username || !email || !password) {
        return { success: false, message: 'All admin registration fields are required.' };
    }
    if (password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters.' };
    }
    if (accounts.length > 0) {
        return { success: false, message: 'Only the first admin can register here. Other admins must be added inside the admin panel.' };
    }
    if (accounts.some(account => account.username.toLowerCase() === username.toLowerCase() || account.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, message: 'This admin username or email already exists.' };
    }

    const passwordRecord = await hashAdminPassword(password);
    const admin = {
        id: Date.now(),
        username,
        email,
        ...passwordRecord,
        role: 'admin',
        fullName: username,
        created_at: new Date().toISOString()
    };
    accounts.push(admin);
    saveLocalAdminAccounts(accounts);

    const publicAdmin = publicAdminAccount(admin);
    sessionStorage.setItem('currentAdminUser', JSON.stringify(publicAdmin));
    logLocalAdminActivity('registerAdmin', { message: 'First admin registered' });
    return { success: true, message: 'Admin account created', data: publicAdmin };
}

function listLocalAdminAccounts() {
    const sessionAdmin = JSON.parse(sessionStorage.getItem('currentAdminUser') || 'null');
    const admins = getLocalAdminAccounts().map(admin => ({
        ...publicAdminAccount(admin),
        status: admin.status || 'active',
        is_current: sessionAdmin && Number(sessionAdmin.id) === Number(admin.id)
    }));
    return {
        success: true,
        data: {
            admins,
            admin_count: admins.length,
            admin_limit: ADMIN_ACCOUNT_LIMIT
        }
    };
}

async function createLocalAdminByAdmin(payload) {
    const username = String(payload.username || '').trim();
    const email = String(payload.email || '').trim();
    const password = String(payload.password || '');
    const accounts = getLocalAdminAccounts();

    if (!username || !email || !password) {
        return { success: false, message: 'All admin fields are required.' };
    }
    if (password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters.' };
    }
    if (accounts.length >= ADMIN_ACCOUNT_LIMIT) {
        return { success: false, message: 'This admin can only add two other admins.' };
    }
    if (accounts.some(account => account.username.toLowerCase() === username.toLowerCase() || account.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, message: 'This admin username or email already exists.' };
    }

    const passwordRecord = await hashAdminPassword(password);
    const admin = {
        id: Date.now(),
        username,
        email,
        ...passwordRecord,
        role: 'admin',
        status: 'active',
        fullName: username,
        created_at: new Date().toISOString()
    };
    accounts.push(admin);
    saveLocalAdminAccounts(accounts);
    logLocalAdminActivity('createAdminAccount', { username, email });
    return { success: true, message: 'Admin account added', data: publicAdminAccount(admin) };
}

function deleteLocalAdminAccount(adminId) {
    const sessionAdmin = JSON.parse(sessionStorage.getItem('currentAdminUser') || 'null');
    const accounts = getLocalAdminAccounts();
    if (Number(adminId) === Number(sessionAdmin?.id)) {
        return { success: false, message: 'You cannot remove your own admin account while logged in.' };
    }
    if (accounts.length <= 1) {
        return { success: false, message: 'At least one admin account must remain.' };
    }
    const nextAccounts = accounts.filter(account => Number(account.id) !== Number(adminId));
    if (nextAccounts.length === accounts.length) {
        return { success: false, message: 'Admin account not found.' };
    }
    saveLocalAdminAccounts(nextAccounts);
    logLocalAdminActivity('deleteAdminAccount', { admin_id: adminId });
    return { success: true, message: 'Admin account removed.' };
}

async function verifyLocalAdminPassword(account, password) {
    if (account.passwordSalt && account.passwordAlgorithm === ADMIN_HASH_ALGORITHM) {
        const passwordRecord = await hashAdminPassword(password, account.passwordSalt);
        return account.passwordHash === passwordRecord.passwordHash;
    }
    if (account.passwordSalt && account.passwordAlgorithm === 'SHA-256-FALLBACK') {
        return account.passwordHash === await legacyHashAdminPassword(`${account.passwordSalt}:${password}`);
    }
    return account.passwordHash === await legacyHashAdminPassword(password);
}

async function changeLocalAdminPassword(payload) {
    const currentPassword = String(payload.current_password || '');
    const newPassword = String(payload.new_password || '');
    const sessionAdmin = JSON.parse(sessionStorage.getItem('currentAdminUser') || 'null');
    const accounts = getLocalAdminAccounts();
    const index = accounts.findIndex(account => Number(account.id) === Number(sessionAdmin?.id));
    if (index < 0) {
        return { success: false, message: 'Current admin account not found.' };
    }
    if (!currentPassword || !newPassword) {
        return { success: false, message: 'Current and new password are required.' };
    }
    if (newPassword.length < 6) {
        return { success: false, message: 'New password must be at least 6 characters.' };
    }
    if (!(await verifyLocalAdminPassword(accounts[index], currentPassword))) {
        return { success: false, message: 'Current password is incorrect.' };
    }
    accounts[index] = {
        ...accounts[index],
        ...(await hashAdminPassword(newPassword))
    };
    saveLocalAdminAccounts(accounts);
    logLocalAdminActivity('changeAdminPassword', { admin_id: accounts[index].id });
    return { success: true, message: 'Password changed successfully.' };
}

async function resetLocalAdminPassword(payload) {
    const adminId = Number(payload.admin_id);
    const newPassword = String(payload.new_password || '');
    const accounts = getLocalAdminAccounts();
    const index = accounts.findIndex(account => Number(account.id) === adminId);
    if (index < 0) {
        return { success: false, message: 'Admin account not found.' };
    }
    if (newPassword.length < 6) {
        return { success: false, message: 'New password must be at least 6 characters.' };
    }
    const sessionAdmin = JSON.parse(sessionStorage.getItem('currentAdminUser') || 'null');
    if (Number(sessionAdmin?.id) !== adminId && !isCurrentLocalMainAdmin()) {
        return { success: false, message: 'Only the main admin can reset another admin password.' };
    }
    accounts[index] = {
        ...accounts[index],
        ...(await hashAdminPassword(newPassword))
    };
    saveLocalAdminAccounts(accounts);
    logLocalAdminActivity('resetAdminPassword', { admin_id: adminId });
    return { success: true, message: 'Admin password reset successfully.' };
}

async function loginLocalAdmin(payload) {
    const username = String(payload.username || '').trim();
    const password = String(payload.password || '');
    const accounts = getLocalAdminAccounts();
    const wantsDefaultMainAdmin = username.toLowerCase() === DEFAULT_ADMIN_USERNAME && password === DEFAULT_ADMIN_PASSWORD;
    const defaultAdminAlreadySaved = accounts.some(admin =>
        admin.username.toLowerCase() === DEFAULT_ADMIN_USERNAME ||
        admin.email.toLowerCase() === DEFAULT_ADMIN_EMAIL
    );

    if (wantsDefaultMainAdmin && !defaultAdminAlreadySaved) {
        saveLocalAdminAccounts([]);
        localStorage.removeItem(LOCAL_ADMIN_CLEANUP_KEY);
        return registerLocalAdmin({
            username: DEFAULT_ADMIN_USERNAME,
            email: DEFAULT_ADMIN_EMAIL,
            password: DEFAULT_ADMIN_PASSWORD
        });
    }

    if (wantsDefaultMainAdmin && defaultAdminAlreadySaved) {
        const adminIndex = accounts.findIndex(admin =>
            admin.username.toLowerCase() === DEFAULT_ADMIN_USERNAME ||
            admin.email.toLowerCase() === DEFAULT_ADMIN_EMAIL
        );
        const repairedAdmin = {
            ...accounts[adminIndex],
            username: DEFAULT_ADMIN_USERNAME,
            email: DEFAULT_ADMIN_EMAIL,
            role: 'admin',
            status: 'active',
            fullName: accounts[adminIndex].fullName || DEFAULT_ADMIN_USERNAME,
            ...(await hashAdminPassword(DEFAULT_ADMIN_PASSWORD))
        };
        saveLocalAdminAccounts([repairedAdmin]);
        const publicAdmin = publicAdminAccount(repairedAdmin);
        sessionStorage.setItem('currentAdminUser', JSON.stringify(publicAdmin));
        logLocalAdminActivity('loginAdmin', { message: 'Main admin login repaired and logged in' });
        return { success: true, message: 'Admin login successful', data: publicAdmin };
    }

    const accountIndex = accounts.findIndex(admin =>
        admin.username.toLowerCase() === username.toLowerCase() ||
        admin.email.toLowerCase() === username.toLowerCase()
    );
    const account = accountIndex >= 0 ? accounts[accountIndex] : null;

    if (!account) {
        return { success: false, message: 'Invalid admin username or password.' };
    }

    let passwordMatches = false;
    if (account.passwordSalt && account.passwordAlgorithm === ADMIN_HASH_ALGORITHM) {
        const passwordRecord = await hashAdminPassword(password, account.passwordSalt);
        passwordMatches = account.passwordHash === passwordRecord.passwordHash;
    } else if (account.passwordSalt && account.passwordAlgorithm === 'SHA-256-FALLBACK') {
        passwordMatches = account.passwordHash === await legacyHashAdminPassword(`${account.passwordSalt}:${password}`);
        if (passwordMatches && window.crypto?.subtle) {
            accounts[accountIndex] = {
                ...account,
                ...(await hashAdminPassword(password))
            };
            saveLocalAdminAccounts(accounts);
        }
    } else {
        passwordMatches = account.passwordHash === await legacyHashAdminPassword(password);
        if (passwordMatches) {
            accounts[accountIndex] = {
                ...account,
                ...(await hashAdminPassword(password))
            };
            saveLocalAdminAccounts(accounts);
        }
    }

    if (!passwordMatches) {
        return { success: false, message: 'Invalid admin username or password.' };
    }

    const publicAdmin = publicAdminAccount(accounts[accountIndex]);
    sessionStorage.setItem('currentAdminUser', JSON.stringify(publicAdmin));
    logLocalAdminActivity('loginAdmin', { message: 'Admin logged in' });
    return { success: true, message: 'Admin login successful', data: publicAdmin };
}

function setAdminUser(user) {
    const storedAdmin = useStaticAdminApi ? findLocalAdminAccount(user) : null;
    const resolvedUser = storedAdmin ? publicAdminAccount(storedAdmin) : user;
    const inferredMainAdmin = Boolean(resolvedUser.isMainAdmin) ||
        isKnownMainAdminIdentity(resolvedUser) ||
        (useStaticAdminApi && isLocalMainAdminCandidate(resolvedUser));
    currentAdmin = {
        id: resolvedUser.id,
        username: resolvedUser.username,
        fullName: resolvedUser.fullName || resolvedUser.full_name || resolvedUser.username,
        role: resolvedUser.role,
        isMainAdmin: inferredMainAdmin
    };
    sessionStorage.setItem('currentAdminUser', JSON.stringify(currentAdmin));
    document.getElementById('adminName').textContent = currentAdmin.fullName || currentAdmin.username;
    updateAdminAccessUi();
}

function updateAdminAccessUi() {
    const mainAdminAccountTools = document.getElementById('mainAdminAccountTools');
    mainAdminAccountTools?.classList.toggle('d-none', !currentAdmin?.isMainAdmin);
}

function showAdminLogin(message = '') {
    document.getElementById('adminLoginScreen')?.classList.remove('d-none');
    document.getElementById('adminContainer')?.classList.add('locked');
    const error = document.getElementById('adminLoginError');
    if (error) {
        error.textContent = message;
        error.classList.toggle('active', Boolean(message));
    }
}

function showAdminPanel() {
    document.getElementById('adminLoginScreen')?.classList.add('d-none');
    document.getElementById('adminContainer')?.classList.remove('locked');
    updateAdminAccessUi();
}

async function handleAdminLogin(event) {
    event.preventDefault();
    const lockout = getAdminLoginLockout();
    if (lockout.locked) {
        showAdminLogin(`Too many failed attempts. Try again in ${lockout.minutes} minute(s).`);
        return;
    }
    const username = document.getElementById('adminLoginUsername').value.trim();
    const password = document.getElementById('adminLoginPassword').value;
    const button = document.getElementById('adminLoginButton');
    const error = document.getElementById('adminLoginError');

    if (error) {
        error.textContent = '';
        error.classList.remove('active');
    }

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

    try {
        const response = await fetch(`${API_URL}?action=loginAdmin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();

        if (!result.success || !result.data) {
            recordAdminLoginFailure();
            showAdminLogin(result.message || 'Invalid admin username or password.');
            return;
        }

        clearAdminLoginFailures();
        setAdminUser(result.data);
        showAdminPanel();
        document.getElementById('adminLoginForm').reset();
        startAdminSessionTimer();
        loadAllData();
    } catch (loginError) {
        showAdminLogin('Unable to verify admin login. Please check the server and database.');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-lock"></i> Login to Admin Panel';
    }
}

function getAdminLoginFailures() {
    return JSON.parse(localStorage.getItem(ADMIN_LOGIN_FAILURE_KEY) || '{"count":0,"lockedUntil":0}');
}

function getAdminLoginLockout() {
    const failures = getAdminLoginFailures();
    const now = Date.now();
    if (Number(failures.lockedUntil || 0) > now) {
        return {
            locked: true,
            minutes: Math.ceil((Number(failures.lockedUntil) - now) / 60000)
        };
    }
    return { locked: false, minutes: 0 };
}

function recordAdminLoginFailure() {
    const failures = getAdminLoginFailures();
    const count = Number(failures.count || 0) + 1;
    const lockedUntil = count >= ADMIN_MAX_FAILED_LOGINS ? Date.now() + ADMIN_LOGIN_LOCKOUT_MS : 0;
    localStorage.setItem(ADMIN_LOGIN_FAILURE_KEY, JSON.stringify({ count, lockedUntil }));
}

function clearAdminLoginFailures() {
    localStorage.removeItem(ADMIN_LOGIN_FAILURE_KEY);
}

function startAdminSessionTimer() {
    clearTimeout(adminSessionTimeoutId);
    adminSessionTimeoutId = setTimeout(() => {
        showNotification('Admin session timed out for security. Please log in again.', 'warning');
        setTimeout(logoutAdmin, 1200);
    }, ADMIN_SESSION_TIMEOUT_MS);
}

async function handleAdminRegistration(event) {
    event.preventDefault();
    const username = document.getElementById('adminRegisterUsername').value.trim();
    const email = document.getElementById('adminRegisterEmail').value.trim();
    const password = document.getElementById('adminRegisterPassword').value;
    const confirmPassword = document.getElementById('adminRegisterConfirmPassword').value;
    const button = document.getElementById('adminRegisterButton');
    const error = document.getElementById('adminLoginError');

    if (error) {
        error.textContent = '';
        error.classList.remove('active');
    }
    if (password !== confirmPassword) {
        showAdminLogin('Passwords do not match.');
        return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

    try {
        const response = await fetch(`${API_URL}?action=registerAdmin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const result = await response.json();

        if (!result.success || !result.data) {
            showAdminLogin(result.message || 'Could not create admin account.');
            return;
        }

        setAdminUser(result.data);
        showAdminPanel();
        document.getElementById('adminRegisterForm').reset();
        refreshAdminSetupUi();
        loadAllData();
    } catch (registerError) {
        showAdminLogin('Could not create admin account. Please try again.');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-user-plus"></i> Create Admin Account';
    }
}

// Logout
function logoutAdmin() {
    logLocalAdminActivity('logoutAdmin', { message: 'Admin logged out' });
    fetch(`${API_URL}?action=logoutAdmin`, { method: 'POST' }).catch(() => {});
    sessionStorage.removeItem('currentAdminUser');
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
            'prayer': '<i class="fas fa-mosque"></i> Prayer & Religious Activities',
            'account': '<i class="fas fa-user-gear"></i> My Account',
            'resources': '<i class="fas fa-folder-open"></i> Resources',
            'hadiths': '<i class="fas fa-book"></i> Hadiths'
        };
        document.getElementById('pageTitle').innerHTML = titles[viewName] || '';
        
        // Load view-specific data
        loadViewData(viewName);
    }
}

function showReligiousAdminSection(sectionId) {
    switchAdminView('prayer');
    setTimeout(() => {
        const section = document.getElementById(sectionId);
        if (!section) return;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        section.style.boxShadow = '0 0 0 3px rgba(44,90,160,0.25)';
        setTimeout(() => {
            section.style.boxShadow = '';
        }, 1800);
    }, 120);
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
        case 'account':
            loadAccountAdminTools();
            break;
    }
}

// Load all data for dashboard
function loadAllData() {
    loadDashboardStats();
}

function loadAccountAdminTools() {
    updateAdminAccessUi();
    loadMyAdminActivityLogs();
    if (!currentAdmin?.isMainAdmin) {
        return;
    }
    loadAdminAccounts();
    loadAdminActivityLogs();
}

function loadMyAdminActivityLogs() {
    fetch(`${API_URL}?action=getMyAdminActivityLogs`)
    .then(response => response.json())
    .then(result => {
        if (!result.success) {
            throw new Error(result.message || 'Could not load your activity');
        }
        renderActivityLogTable('myAdminActivityLogList', result.data || [], {
            showMainAdminActions: false,
            showUndoActions: true
        });
    })
    .catch(error => {
        const container = document.getElementById('myAdminActivityLogList');
        if (container) container.innerHTML = `<p class="text-danger">${escapeAdminText(error.message || 'Could not load your activity')}</p>`;
    });
}

function escapeAdminText(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

function loadAdminAccounts() {
    fetch(`${API_URL}?action=listAdminAccounts`)
    .then(response => response.json())
    .then(result => {
        if (!result.success) {
            throw new Error(result.message || 'Could not load admin accounts');
        }

        const payload = result.data || {};
        const admins = payload.admins || [];
        const limit = payload.admin_limit || ADMIN_ACCOUNT_LIMIT;
        const count = payload.admin_count ?? admins.length;
        const badge = document.getElementById('adminAccountLimitBadge');
        const createButton = document.getElementById('managedAdminCreateButton');
        const container = document.getElementById('adminAccountsList');

        if (badge) badge.textContent = `${count} / ${limit} admins`;
        if (createButton) createButton.disabled = count >= limit;

        if (!container) return;
        if (!admins.length) {
            container.innerHTML = '<p class="text-muted">No admin accounts found.</p>';
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-striped align-middle">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${admins.map(admin => `
                            <tr>
                                <td>${escapeAdminText(admin.username)} ${admin.is_current ? '<span class="badge bg-success ms-1">You</span>' : ''}</td>
                                <td>${escapeAdminText(admin.email)}</td>
                                <td><span class="badge bg-${admin.status === 'active' ? 'success' : 'secondary'}">${escapeAdminText(admin.status || 'active')}</span></td>
                                <td>${admin.created_at ? new Date(admin.created_at).toLocaleString() : '-'}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary me-1" onclick="resetManagedAdminPassword(${Number(admin.id)})">
                                        <i class="fas fa-key"></i> Reset
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" ${admin.is_current ? 'disabled' : ''} onclick="removeManagedAdmin(${Number(admin.id)})">
                                        <i class="fas fa-trash"></i> Remove
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    })
    .catch(error => {
        console.error('Error loading admin accounts:', error);
        showNotification(error.message || 'Error loading admin accounts', 'danger');
    });
}

function loadAdminActivityLogs() {
    fetch(`${API_URL}?action=getAdminActivityLogs`)
    .then(response => response.json())
    .then(result => {
        if (!result.success) {
            throw new Error(result.message || 'Could not load admin activity');
        }
        renderActivityLogTable('adminActivityLogList', result.data || [], {
            showMainAdminActions: true,
            showUndoActions: false
        });
    })
    .catch(error => {
        const container = document.getElementById('adminActivityLogList');
        if (container) container.innerHTML = `<p class="text-danger">${escapeAdminText(error.message || 'Could not load admin activity')}</p>`;
    });
}

function renderActivityLogTable(containerId, logs, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!logs.length) {
        container.innerHTML = '<p class="text-muted">No admin activity recorded yet.</p>';
        return;
    }

    container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-striped table-sm align-middle">
                    <thead>
                        <tr>
                            <th>Admin Who Did It</th>
                            <th>Action</th>
                            <th>Details</th>
                            <th>IP</th>
                            <th>Time</th>
                            ${options.showMainAdminActions ? '<th>Main Admin Action</th>' : ''}
                            ${options.showUndoActions ? '<th>Undo</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.map(log => `
                            <tr>
                                <td>${escapeAdminText(log.username || 'Unknown')}</td>
                                <td><span class="badge bg-secondary">${escapeAdminText(formatAdminAction(log.action))}</span></td>
                                <td>${escapeAdminText(formatAdminActivityDetails(log.details))}</td>
                                <td>${escapeAdminText(log.ip_address || '-')}</td>
                                <td>${log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                                ${options.showMainAdminActions ? `<td>${renderAdminActivityControls(log)}</td>` : ''}
                                ${options.showUndoActions ? `<td>${renderUndoActivityControls(log)}</td>` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
}

function renderAdminActivityControls(log) {
    if (log.action === 'pendingAdminApproval') {
        return `
            <button class="btn btn-sm btn-success me-1" onclick="approvePendingAdminActivity(${Number(log.id)})">Approve</button>
            <button class="btn btn-sm btn-outline-danger" onclick="rejectPendingAdminActivity(${Number(log.id)})">Reject</button>
        `;
    }
    if (['opposeAdminActivity', 'deleteAdminActivityItem', 'undoMyAdminActivityItem'].includes(log.action)) {
        return '<span class="text-muted">Recorded</span>';
    }
    const deleteButton = canDeleteActivityItem(log)
        ? `<button class="btn btn-sm btn-outline-danger me-1" onclick="deleteActivityItemFromLog(${Number(log.id)})">Delete Item</button>`
        : '';
    return `
        ${deleteButton}
        <button class="btn btn-sm btn-outline-warning" onclick="opposeAdminActivity(${Number(log.id)})">Oppose</button>
    `;
}

function renderUndoActivityControls(log) {
    if (['opposeAdminActivity', 'deleteAdminActivityItem', 'undoMyAdminActivityItem'].includes(log.action)) {
        return '<span class="text-muted">Recorded</span>';
    }
    if (!canDeleteActivityItem(log)) {
        return '<span class="text-muted">Not undoable</span>';
    }
    return `<button class="btn btn-sm btn-outline-danger" onclick="undoMyAdminActivity(${Number(log.id)})">Undo</button>`;
}

function canDeleteActivityItem(log) {
    return Boolean(getActivityTarget(log.action, log.details || {}));
}

function opposeAdminActivity(logId) {
    const reason = prompt('Reason for opposing this admin action?');
    if (reason === null) return;
    fetch(`${API_URL}?action=opposeAdminActivity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId, reason })
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not record opposition');
        showNotification('Opposition recorded', 'success');
        loadAdminActivityLogs();
    })
    .catch(error => showNotification(error.message || 'Could not record opposition', 'danger'));
}

function deleteActivityItemFromLog(logId) {
    const reason = prompt('Reason for deleting/opposing this admin action?');
    if (reason === null) return;
    fetch(`${API_URL}?action=deleteAdminActivityItem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId, reason })
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not delete item');
        showNotification('Item deleted and action recorded', 'success');
        loadAdminActivityLogs();
        loadDashboardStats();
    })
    .catch(error => showNotification(error.message || 'Could not delete item', 'danger'));
}

function approvePendingAdminActivity(logId) {
    if (!confirm('Approve and apply this pending sub-admin action?')) return;
    fetch(`${API_URL}?action=approvePendingAdminActivity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId })
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not approve action');
        showNotification('Pending action approved and applied', 'success');
        loadAdminActivityLogs();
        loadDashboardStats();
    })
    .catch(error => showNotification(error.message || 'Could not approve action', 'danger'));
}

function rejectPendingAdminActivity(logId) {
    const reason = prompt('Reason for rejecting this pending action?');
    if (reason === null) return;
    fetch(`${API_URL}?action=rejectPendingAdminActivity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId, reason })
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not reject action');
        showNotification('Pending action rejected', 'success');
        loadAdminActivityLogs();
    })
    .catch(error => showNotification(error.message || 'Could not reject action', 'danger'));
}

function undoMyAdminActivity(logId) {
    const reason = prompt('Reason for undoing this action?');
    if (reason === null) return;
    fetch(`${API_URL}?action=undoMyAdminActivityItem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId, reason })
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not undo action');
        showNotification('Your action was undone', 'success');
        loadMyAdminActivityLogs();
        if (currentAdmin?.isMainAdmin) {
            loadAdminActivityLogs();
        }
        loadDashboardStats();
    })
    .catch(error => showNotification(error.message || 'Could not undo action', 'danger'));
}

function formatAdminAction(actionName) {
    const labels = {
        loginAdmin: 'Login',
        logoutAdmin: 'Logout',
        registerAdmin: 'Registered first admin',
        createAdminAccount: 'Added admin',
        deleteAdminAccount: 'Removed admin',
        resetAdminPassword: 'Reset password',
        changeAdminPassword: 'Changed own password',
        createAnnouncement: 'Created announcement',
        deleteAnnouncement: 'Deleted announcement',
        createEvent: 'Created event',
        deleteEvent: 'Deleted event',
        addLeader: 'Added leader',
        deleteLeader: 'Deleted leader',
        addGalleryItem: 'Added gallery item',
        deleteGalleryItem: 'Deleted gallery item',
        addHadith: 'Added hadith',
        deleteHadith: 'Deleted hadith',
        updateWelfareStatus: 'Updated welfare',
        setPrayerTimes: 'Updated prayer times',
        saveReligiousActivity: 'Saved religious activity',
        deleteReligiousActivity: 'Deleted religious activity',
        addResource: 'Added resource',
        deleteResource: 'Deleted resource',
        approvePayment: 'Approved payment',
        approveDonation: 'Approved donation',
        seedSampleData: 'Added sample data',
        pendingAdminApproval: 'Pending main admin approval',
        approvePendingAdminActivity: 'Approved pending action',
        rejectPendingAdminActivity: 'Rejected pending action',
        opposeAdminActivity: 'Opposed admin action',
        deleteAdminActivityItem: 'Deleted item from activity',
        undoMyAdminActivityItem: 'Undid own action'
    };
    return labels[actionName] || actionName || 'Action';
}

function formatAdminActivityDetails(details) {
    if (!details || typeof details !== 'object') return '-';
    const request = details.request || details;
    const nestedItem = request.item || request.previous_item || null;
    const interestingKeys = [
        'title',
        'requested_action',
        'approved_action',
        'rejected_action',
        'undone_action',
        'reason',
        'name',
        'position',
        'category',
        'resource_type',
        'type',
        'location',
        'event_date',
        'date',
        'status',
        'priority',
        'username',
        'email',
        'admin_id',
        'event_id',
        'announcement_id',
        'leader_id',
        'gallery_id',
        'resource_id',
        'hadith_id',
        'request_id',
        'payment_id',
        'donation_id'
    ];
    const parts = interestingKeys
        .filter(key => request[key] !== undefined && request[key] !== null && request[key] !== '')
        .map(key => `${key.replaceAll('_', ' ')}: ${request[key]}`);
    if (nestedItem) {
        ['title', 'event', 'topic', 'date', 'schedule', 'speaker', 'time'].forEach(key => {
            if (nestedItem[key] !== undefined && nestedItem[key] !== null && nestedItem[key] !== '') {
                parts.push(`${key}: ${nestedItem[key]}`);
            }
        });
    }
    if (parts.length) {
        return parts.join(', ');
    }
    if (details.message) return details.message;
    return JSON.stringify(request).slice(0, 120);
}

async function handleManagedAdminCreate(event) {
    event.preventDefault();
    const username = document.getElementById('managedAdminUsername').value.trim();
    const email = document.getElementById('managedAdminEmail').value.trim();
    const password = document.getElementById('managedAdminPassword').value;
    const button = document.getElementById('managedAdminCreateButton');

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    try {
        const response = await fetch(`${API_URL}?action=createAdminAccount`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Could not add admin account');
        }
        document.getElementById('adminCreateForm').reset();
        showNotification('Admin account added successfully', 'success');
        loadAdminAccounts();
    } catch (error) {
        showNotification(error.message || 'Could not add admin account', 'danger');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-save"></i> Add Admin';
    }
}

function removeManagedAdmin(adminId) {
    if (!confirm('Remove this admin from admin-panel access?')) return;
    fetch(`${API_URL}?action=deleteAdminAccount`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId })
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not remove admin account');
        showNotification('Admin account removed', 'success');
        loadAdminAccounts();
    })
    .catch(error => showNotification(error.message || 'Could not remove admin account', 'danger'));
}

function resetManagedAdminPassword(adminId) {
    const newPassword = prompt('Enter a new password for this admin. Minimum 6 characters.');
    if (newPassword === null) return;
    if (newPassword.length < 6) {
        showNotification('New password must be at least 6 characters', 'warning');
        return;
    }

    fetch(`${API_URL}?action=resetAdminPassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, new_password: newPassword })
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not reset password');
        showNotification('Admin password reset successfully', 'success');
    })
    .catch(error => showNotification(error.message || 'Could not reset password', 'danger'));
}

function resetMyAdminPassword() {
    if (!currentAdmin?.id) {
        showNotification('Current admin account not found', 'danger');
        return;
    }
    resetManagedAdminPassword(currentAdmin.id);
}

async function handleAdminPasswordChange(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('adminCurrentPassword').value;
    const newPassword = document.getElementById('adminNewPassword').value;
    const confirmPassword = document.getElementById('adminConfirmNewPassword').value;
    const button = document.getElementById('adminChangePasswordButton');

    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'warning');
        return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    try {
        const response = await fetch(`${API_URL}?action=changeAdminPassword`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
        });
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Could not change password');
        }
        document.getElementById('adminChangePasswordForm').reset();
        showNotification('Password changed successfully', 'success');
    } catch (error) {
        showNotification(error.message || 'Could not change password', 'danger');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-key"></i> Change Password';
    }
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

function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const shouldShow = input.type === 'password';
    input.type = shouldShow ? 'text' : 'password';
    button?.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');
    const icon = button?.querySelector('i');
    if (icon) {
        icon.className = shouldShow ? 'fas fa-eye-slash' : 'fas fa-eye';
    }
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
                        <tr>${columns.map(col => `<td>${formatCell(row[col], col)}</td>`).join('')}${showApprovalActions ? `<td>${renderApprovalAction(type, row)}</td>` : ''}</tr>
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

function formatCell(value, column = '') {
    if (value === null || value === undefined || value === '') return '-';
    const text = String(value);
    const isPhotoColumn = /photo|image|avatar/i.test(column);
    if ((isPhotoColumn || text.startsWith('data:image/')) && text.startsWith('data:image/')) {
        return `<img src="${text}" alt="Member photo" style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid rgba(0,128,0,.18);">`;
    }
    if (isPhotoColumn && (text.startsWith('uploads/') || text.startsWith('http'))) {
        return `<img src="${resolveAdminUrl(text)}" alt="Member photo" style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid rgba(0,128,0,.18);">`;
    }
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
    const course = document.getElementById('leaderCourse').value.trim();
    const yearOfStudy = document.getElementById('leaderYearOfStudy').value.trim();
    const bio = document.getElementById('leaderBio').value.trim();
    const description = document.getElementById('leaderDescription').value.trim();
    const email = document.getElementById('leaderEmail').value.trim();
    const phone = document.getElementById('leaderPhone').value.trim();
    const photoFile = document.getElementById('leaderPassportPhoto')?.files?.[0] || null;
    
    if (!name || !position) {
        showNotification('Name and position are required', 'warning');
        return;
    }
    
    const data = new FormData();
    Object.entries({
        name: name,
        position: position,
        course: course,
        year_of_study: yearOfStudy,
        bio: bio,
        description: description,
        email: email,
        phone: phone,
        user_id: currentAdmin.id || 0
    }).forEach(([key, value]) => data.append(key, value || ''));
    if (photoFile) {
        data.append('leader_passport_photo', photoFile);
    }
    
    fetch(`${API_URL}?action=addLeader`, {
        method: 'POST',
        body: data
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showNotification('Leadership member added successfully!', 'success');
            document.getElementById('leaderName').value = '';
            document.getElementById('leaderPosition').value = '';
            document.getElementById('leaderCourse').value = '';
            document.getElementById('leaderYearOfStudy').value = '';
            document.getElementById('leaderBio').value = '';
            document.getElementById('leaderDescription').value = '';
            document.getElementById('leaderEmail').value = '';
            document.getElementById('leaderPhone').value = '';
            document.getElementById('leaderPassportPhoto').value = '';
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
                    <p><strong>Course:</strong> ${leader.course || 'N/A'}</p>
                    <p><strong>Year of Study:</strong> ${leader.year_of_study || 'N/A'}</p>
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
    Promise.all([
        fetch(`${API_URL}?action=getWelfareRequests`).then(response => response.json()).catch(() => ({ success: false, data: [] })),
        loadAdminStudentRequesters()
    ])
    .then(([result]) => {
        renderWelfareRequests(mergeWelfareRequestsForAdmin(result.data || [], readStore('welfareRequests')));
    });
}

function loadAdminStudentRequesters() {
    return fetch(`${API_URL}?action=getDashboardDetail&type=students`)
        .then(response => response.json())
        .then(result => {
            const databaseStudents = result.success && Array.isArray(result.data) ? result.data : [];
            const localStudents = readStore('allMembers').filter(member => (member.role || 'student') === 'student');
            adminStudentRequesters = [...databaseStudents.map(student => ({
                id: student.id,
                fullName: [student.first_name, student.last_name].filter(Boolean).join(' '),
                studentId: student.student_id,
                email: student.email,
                phone: student.phone,
                course: student.course,
                yearOfStudy: student.year_of_study
            })), ...localStudents];
            return adminStudentRequesters;
        })
        .catch(() => {
            adminStudentRequesters = readStore('allMembers').filter(member => (member.role || 'student') === 'student');
            return adminStudentRequesters;
        });
}

function mergeWelfareRequestsForAdmin(databaseRequests, localRequests) {
    const merged = [...localRequests];
    databaseRequests.forEach(request => {
        const index = merged.findIndex(item => Number(item.id) === Number(request.id));
        if (index >= 0) {
            merged[index] = { ...merged[index], ...request };
        } else {
            merged.push(request);
        }
    });
    return merged.map(enrichWelfareRequestFromMembers).sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
}

function enrichWelfareRequestFromMembers(request) {
    const members = [...adminStudentRequesters, ...readStore('allMembers')];
    const requesterKey = request.submittedByKey || request.submittedByStudentId || request.student_number || request.student_id || request.email || request.submittedByEmail;
    let requester = members.find(member =>
        member.username === requesterKey ||
        member.studentId === requesterKey ||
        member.email === requesterKey ||
        member.fullName === request.submittedBy ||
        member.name === request.submittedBy ||
        member.email === request.email
    );

    if (!requester && isMissingRequesterInfo(request)) {
        const studentMembers = members.filter(member => (member.role || 'student') === 'student' || member.studentId || member.student_id);
        if (studentMembers.length === 1) {
            requester = studentMembers[0];
        }
    }

    if (!requester) return request;

    return {
        ...request,
        submittedByName: request.submittedByName || requester.fullName || requester.name || requester.username,
        submittedBy: request.submittedBy || requester.fullName || requester.name || requester.username,
        submittedByStudentId: request.submittedByStudentId || request.student_number || requester.studentId || requester.username,
        submittedByEmail: request.submittedByEmail || requester.email,
        submittedByPhone: request.submittedByPhone || requester.phone,
        submittedByCourse: request.submittedByCourse || requester.course,
        submittedByYear: request.submittedByYear || requester.yearOfStudy
    };
}

function isMissingRequesterInfo(request) {
    const name = String(request.submittedByName || request.submittedBy || request.name || '').trim().toLowerCase();
    return (!name || name === 'member' || name === 'unknown member') &&
        !request.submittedByEmail &&
        !request.email &&
        !request.submittedByPhone &&
        !request.phone &&
        !request.submittedByStudentId &&
        !request.student_number;
}

function renderWelfareRequests(requests) {
    const container = document.getElementById('welfareRequestsList');
    if (!container) return;

    if (!requests.length) {
        container.innerHTML = '<p class="text-muted">No welfare requests submitted yet.</p>';
        return;
    }

    container.innerHTML = requests.map(enrichWelfareRequestFromMembers).map(req => `
        <div class="item-card">
            <div class="item-info flex-grow-1">
                <h5>${req.type || req.category || 'Welfare Request'}</h5>
                <p>${req.description || ''}</p>
                <p><strong>Amount:</strong> ${req.amount || req.amount_needed || 'Not specified'}</p>
                <div class="alert alert-light border mb-2">
                    <h6 class="mb-2"><i class="fas fa-user-circle"></i> Requester Information</h6>
                    <p class="mb-1"><strong>Name:</strong> ${getWelfareRequesterName(req)}</p>
                    <p class="mb-1"><strong>Student ID:</strong> ${req.submittedByStudentId || req.student_number || 'N/A'}</p>
                    <p class="mb-1"><strong>Email:</strong> ${req.submittedByEmail || req.email || 'N/A'}</p>
                    <p class="mb-1"><strong>Phone:</strong> ${req.submittedByPhone || req.phone || 'N/A'}</p>
                    <p class="mb-0"><strong>Course/Year:</strong> ${[req.submittedByCourse || req.course, req.submittedByYear || req.year_of_study].filter(Boolean).join(' / ') || 'N/A'}</p>
                </div>
                ${renderRequesterAttachControl(req)}
                <span class="badge bg-${getWelfareColor(req.status)}"><i class="fas ${getWelfareStatusIcon(req.status)} me-1"></i>${formatWelfareStatus(req.status)}</span>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-success" onclick="updateWelfareStatus(${req.id}, 'Approved')"><i class="fas fa-circle-check"></i> Approve</button>
                <button class="btn btn-sm btn-outline-danger" onclick="updateWelfareStatus(${req.id}, 'Rejected')"><i class="fas fa-circle-xmark"></i> Reject</button>
            </div>
        </div>
    `).join('');
}

function renderRequesterAttachControl(req) {
    if (!isMissingRequesterInfo(req)) return '';
    if (!adminStudentRequesters.length) {
        return '<div class="alert alert-warning py-2"><i class="fas fa-triangle-exclamation"></i> This old request has no saved requester details. Register/login records are needed before it can be linked.</div>';
    }

    const options = adminStudentRequesters.map((student, index) => {
        const label = `${student.fullName || student.name || student.username || 'Student'}${student.studentId ? ' - ' + student.studentId : ''}`;
        return `<option value="${index}">${label}</option>`;
    }).join('');

    return `
        <div class="alert alert-warning py-2">
            <label class="form-label mb-1"><i class="fas fa-link"></i> Link this old request to a requester before deciding</label>
            <div class="d-flex gap-2 flex-wrap">
                <select class="form-control form-control-sm" id="requesterLink${req.id}" style="max-width: 320px;">
                    <option value="">Select registered student</option>
                    ${options}
                </select>
                <button class="btn btn-sm btn-primary" onclick="attachRequesterToWelfare(${req.id})"><i class="fas fa-user-check"></i> Attach requester</button>
            </div>
        </div>
    `;
}

function attachRequesterToWelfare(requestId) {
    const select = document.getElementById('requesterLink' + requestId);
    const requester = adminStudentRequesters[Number(select?.value)];
    if (!requester) {
        showNotification('Please select a registered student first.', 'warning');
        return;
    }

    const requests = readStore('welfareRequests').map(request => Number(request.id) === Number(requestId)
        ? {
            ...request,
            submittedByName: requester.fullName || requester.name || requester.username,
            submittedBy: requester.fullName || requester.name || requester.username,
            submittedByStudentId: requester.studentId || requester.student_id || requester.username,
            submittedByEmail: requester.email || '',
            submittedByPhone: requester.phone || '',
            submittedByCourse: requester.course || '',
            submittedByYear: requester.yearOfStudy || requester.year_of_study || '',
            submittedByKey: requester.username || requester.studentId || requester.student_id || requester.email || ''
        }
        : request
    );
    writeStore('welfareRequests', requests);
    showNotification('Requester attached to welfare request.', 'success');
    loadWelfareRequests();
}

function getWelfareRequesterName(req) {
    return req.submittedByName ||
        req.submittedBy ||
        req.name ||
        [req.first_name, req.last_name].filter(Boolean).join(' ') ||
        'Unknown member';
}

function updateWelfareStatus(requestId, status) {
    const applyLocalWelfareStatus = () => {
        const requests = readStore('welfareRequests').map(item =>
            Number(item.id) === Number(requestId) ? { ...item, status: status, statusUpdatedAt: new Date().toISOString() } : item
        );
        writeStore('welfareRequests', requests);
    };

    fetch(`${API_URL}?action=updateWelfareStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, status: status, notes: '' })
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success) throw new Error(result.message || 'Could not update request');
        applyLocalWelfareStatus();
        showNotification(`Welfare request ${status.toLowerCase()}.`, 'success');
        loadWelfareRequests();
    })
    .catch(error => {
        applyLocalWelfareStatus();
        showNotification(error.message ? 'Saved status locally because database is unavailable.' : `Welfare request ${status.toLowerCase()}.`, 'warning');
        loadWelfareRequests();
    });
}

function getWelfareColor(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved' || normalized === 'completed') return 'success';
    if (normalized === 'rejected') return 'danger';
    return 'warning text-dark';
}

function getWelfareStatusIcon(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved' || normalized === 'completed') return 'fa-circle-check';
    if (normalized === 'rejected') return 'fa-circle-xmark';
    return 'fa-clock';
}

function formatWelfareStatus(status) {
    const normalized = String(status || 'Pending Review').toLowerCase();
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'rejected') return 'Rejected';
    if (normalized === 'completed') return 'Completed';
    return 'Pending Review';
}

function loadPrayerAdmin() {
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('prayerDate').value = today;
    renderReligiousActivitiesAdmin();
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
    const previousPrayerTimes = JSON.parse(localStorage.getItem('adminPrayerTimes') || 'null');
    const data = {
        date: document.getElementById('prayerDate').value || new Date().toISOString().slice(0, 10),
        fajr: document.getElementById('prayerFajr').value,
        dhuhr: document.getElementById('prayerDhuhr').value,
        asr: document.getElementById('prayerAsr').value,
        maghrib: document.getElementById('prayerMaghrib').value,
        isha: document.getElementById('prayerIsha').value,
        jummah_time: document.getElementById('prayerJummah').value,
        _previous_prayer_times: previousPrayerTimes
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

function getReligiousActivities() {
    return JSON.parse(localStorage.getItem('adminReligiousActivities')) || {
        jummah: [],
        ramadan: [],
        lectures: []
    };
}

function saveReligiousActivities(data) {
    localStorage.setItem('adminReligiousActivities', JSON.stringify(data));
}

function saveReligiousActivity(type) {
    const data = getReligiousActivities();
    let item = null;
    const editId = editingReligiousActivity?.type === type ? editingReligiousActivity.id : null;
    const key = type === 'lecture' ? 'lectures' : type;
    const previousItem = editId ? (data[key] || []).find(existing => Number(existing.id) === Number(editId)) : null;

    if (type === 'jummah') {
        const date = document.getElementById('jummahDate').value;
        const time = document.getElementById('jummahTime').value;
        const topic = document.getElementById('jummahTopic').value.trim();
        const speaker = document.getElementById('jummahSpeaker').value.trim();
        const note = document.getElementById('jummahNote').value.trim();
        if (!date || !time || !topic) {
            showNotification('Date, time, and khutbah topic are required.', 'warning');
            return;
        }
        item = { id: editId || Date.now(), date, time, topic, speaker, note };
        if (!isCurrentLocalMainAdmin() && useStaticAdminApi) {
            queueLocalReligiousApproval(type, item, previousItem, editId);
            ['jummahDate', 'jummahTime', 'jummahTopic', 'jummahSpeaker', 'jummahNote'].forEach(id => document.getElementById(id).value = '');
            return;
        }
        data.jummah = upsertReligiousActivity(data.jummah, item, editId);
        ['jummahDate', 'jummahTime', 'jummahTopic', 'jummahSpeaker', 'jummahNote'].forEach(id => document.getElementById(id).value = '');
    }

    if (type === 'ramadan') {
        const eventName = document.getElementById('ramadanEvent').value.trim();
        const date = document.getElementById('ramadanDate').value.trim();
        const time = document.getElementById('ramadanTime').value.trim();
        const note = document.getElementById('ramadanNote').value.trim();
        if (!eventName || !date) {
            showNotification('Ramadan event and date are required.', 'warning');
            return;
        }
        item = { id: editId || Date.now(), event: eventName, date, time, note };
        if (!isCurrentLocalMainAdmin() && useStaticAdminApi) {
            queueLocalReligiousApproval(type, item, previousItem, editId);
            ['ramadanEvent', 'ramadanDate', 'ramadanTime', 'ramadanNote'].forEach(id => document.getElementById(id).value = '');
            return;
        }
        data.ramadan = upsertReligiousActivity(data.ramadan, item, editId);
        ['ramadanEvent', 'ramadanDate', 'ramadanTime', 'ramadanNote'].forEach(id => document.getElementById(id).value = '');
    }

    if (type === 'lecture') {
        const title = document.getElementById('lectureTitle').value.trim();
        const schedule = document.getElementById('lectureSchedule').value.trim();
        const speaker = document.getElementById('lectureSpeaker').value.trim();
        const description = document.getElementById('lectureDescription').value.trim();
        if (!title || !schedule) {
            showNotification('Lecture title and schedule are required.', 'warning');
            return;
        }
        item = { id: editId || Date.now(), title, schedule, speaker, description };
        if (!isCurrentLocalMainAdmin() && useStaticAdminApi) {
            queueLocalReligiousApproval(type, item, previousItem, editId);
            ['lectureTitle', 'lectureSchedule', 'lectureSpeaker', 'lectureDescription'].forEach(id => document.getElementById(id).value = '');
            return;
        }
        data.lectures = upsertReligiousActivity(data.lectures, item, editId);
        ['lectureTitle', 'lectureSchedule', 'lectureSpeaker', 'lectureDescription'].forEach(id => document.getElementById(id).value = '');
    }

    saveReligiousActivities(data);
    logLocalAdminActivity('saveReligiousActivity', {
        type,
        item,
        previous_item: previousItem || null,
        mode: editId ? 'update' : 'create'
    });
    editingReligiousActivity = null;
    resetReligiousActivityButtons();
    renderReligiousActivitiesAdmin();
    showNotification(editId ? 'Religious activity updated for users.' : 'Religious activity saved for users.', 'success');
}

function queueLocalReligiousApproval(type, item, previousItem, editId) {
    logLocalAdminActivity('pendingAdminApproval', {
        requested_action: 'saveReligiousActivity',
        method: 'POST',
        request: {
            type,
            item,
            previous_item: previousItem || null,
            mode: editId ? 'update' : 'create'
        }
    });
    editingReligiousActivity = null;
    resetReligiousActivityButtons();
    showNotification('Sent to main admin for approval.', 'info');
}

function applyReligiousActivityRequest(request) {
    const data = getReligiousActivities();
    const type = request.type;
    const key = type === 'lecture' ? 'lectures' : type;
    if (!['jummah', 'ramadan', 'lectures'].includes(key) || !request.item) return;
    data[key] = upsertReligiousActivity(data[key] || [], request.item, request.item.id);
    saveReligiousActivities(data);
    renderReligiousActivitiesAdmin();
}

function applyReligiousDeleteRequest(request) {
    const data = getReligiousActivities();
    const type = request.type;
    const key = type === 'lecture' ? 'lectures' : type;
    if (!['jummah', 'ramadan', 'lectures'].includes(key)) return;
    data[key] = (data[key] || []).filter(item => Number(item.id) !== Number(request.item_id));
    saveReligiousActivities(data);
    renderReligiousActivitiesAdmin();
}

function upsertReligiousActivity(items, item, editId) {
    if (!editId) return [...items, item];
    return items.map(existing => Number(existing.id) === Number(editId) ? item : existing);
}

function editReligiousActivity(type, id) {
    const data = getReligiousActivities();
    const key = type === 'lecture' ? 'lectures' : type;
    const item = (data[key] || []).find(entry => Number(entry.id) === Number(id));
    if (!item) return;

    editingReligiousActivity = { type, id };

    if (type === 'jummah') {
        document.getElementById('jummahDate').value = item.date || '';
        document.getElementById('jummahTime').value = item.time || '';
        document.getElementById('jummahTopic').value = item.topic || '';
        document.getElementById('jummahSpeaker').value = item.speaker || '';
        document.getElementById('jummahNote').value = item.note || '';
        document.getElementById('jummahSaveBtn').innerHTML = '<i class="fas fa-save"></i> Update Jumu\'ah Reminder';
    }

    if (type === 'ramadan') {
        document.getElementById('ramadanEvent').value = item.event || '';
        document.getElementById('ramadanDate').value = item.date || '';
        document.getElementById('ramadanTime').value = item.time || '';
        document.getElementById('ramadanNote').value = item.note || '';
        document.getElementById('ramadanSaveBtn').innerHTML = '<i class="fas fa-save"></i> Update Ramadan Item';
    }

    if (type === 'lecture') {
        document.getElementById('lectureTitle').value = item.title || '';
        document.getElementById('lectureSchedule').value = item.schedule || '';
        document.getElementById('lectureSpeaker').value = item.speaker || '';
        document.getElementById('lectureDescription').value = item.description || '';
        document.getElementById('lectureSaveBtn').innerHTML = '<i class="fas fa-save"></i> Update Lecture';
    }
}

function resetReligiousActivityButtons() {
    const jummahBtn = document.getElementById('jummahSaveBtn');
    const ramadanBtn = document.getElementById('ramadanSaveBtn');
    const lectureBtn = document.getElementById('lectureSaveBtn');
    if (jummahBtn) jummahBtn.innerHTML = '<i class="fas fa-save"></i> Add Jumu\'ah Reminder';
    if (ramadanBtn) ramadanBtn.innerHTML = '<i class="fas fa-save"></i> Add Ramadan Item';
    if (lectureBtn) lectureBtn.innerHTML = '<i class="fas fa-save"></i> Add Lecture';
}

function deleteReligiousActivity(type, id) {
    const data = getReligiousActivities();
    const key = type === 'lecture' ? 'lectures' : type;
    const previousItem = (data[key] || []).find(item => Number(item.id) === Number(id));
    if (!isCurrentLocalMainAdmin() && useStaticAdminApi) {
        logLocalAdminActivity('pendingAdminApproval', {
            requested_action: 'deleteReligiousActivity',
            method: 'DELETE',
            request: {
                type,
                item_id: id,
                previous_item: previousItem || null
            }
        });
        showNotification('Sent to main admin for approval.', 'info');
        return;
    }
    data[key] = (data[key] || []).filter(item => Number(item.id) !== Number(id));
    saveReligiousActivities(data);
    logLocalAdminActivity('deleteReligiousActivity', {
        type,
        item_id: id,
        previous_item: previousItem || null
    });
    renderReligiousActivitiesAdmin();
    showNotification('Religious activity removed.', 'success');
}

function renderReligiousActivitiesAdmin() {
    const container = document.getElementById('religiousActivitiesList');
    if (!container) return;

    const data = getReligiousActivities();
    const jummahRows = data.jummah.map(item => `
        <tr>
            <td>Jumu'ah</td>
            <td>${item.date}</td>
            <td>${item.time || '-'}</td>
            <td>${item.topic}</td>
            <td>${item.speaker || '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editReligiousActivity('jummah', ${item.id})">Edit</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteReligiousActivity('jummah', ${item.id})">Delete</button>
            </td>
        </tr>
    `).join('');
    const ramadanRows = data.ramadan.map(item => `
        <tr>
            <td>Ramadan</td>
            <td>${item.date}</td>
            <td>${item.time || '-'}</td>
            <td>${item.event}</td>
            <td>${item.note || '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editReligiousActivity('ramadan', ${item.id})">Edit</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteReligiousActivity('ramadan', ${item.id})">Delete</button>
            </td>
        </tr>
    `).join('');
    const lectureRows = data.lectures.map(item => `
        <tr>
            <td>Lecture</td>
            <td>${item.schedule}</td>
            <td>-</td>
            <td>${item.title}</td>
            <td>${item.speaker || '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editReligiousActivity('lecture', ${item.id})">Edit</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteReligiousActivity('lecture', ${item.id})">Delete</button>
            </td>
        </tr>
    `).join('');
    const rows = jummahRows + ramadanRows + lectureRows;

    container.innerHTML = rows ? `
        <div class="table-responsive">
            <table class="table table-sm table-hover">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Date/Schedule</th>
                        <th>Time</th>
                        <th>Title/Event</th>
                        <th>Speaker/Note</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    ` : '<p class="text-muted">No religious activities have been added yet.</p>';
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
