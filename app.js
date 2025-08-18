// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc,
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    addDoc,
    serverTimestamp,
    query,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===================================================================================
// CONFIGURATION IS LOADED FROM config.js via the window object
// ===================================================================================
const { firebaseConfig, DEFAULT_GEMINI_API_KEY, ADMIN_UID } = window.appConfig;
// ===================================================================================

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM Elements ---
const mainAppContent = document.getElementById('main-app-content');
const loginPrompt = document.getElementById('login-prompt');
const adminPanel = document.getElementById('admin-panel');
const authButtons = document.getElementById('auth-buttons');
const userView = document.getElementById('user-view');
const adminView = document.getElementById('admin-view');
const userEmailDisplay = document.getElementById('user-email');
const adminEmailDisplay = document.getElementById('admin-email');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const authModal = document.getElementById('auth-modal');
const authModalOverlay = document.getElementById('auth-modal-overlay');
const authModalContent = document.getElementById('auth-modal-content');
const closeModalBtn = document.getElementById('close-modal-btn');
const tabButtons = document.querySelectorAll('.tab-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const backToLoginLink = document.getElementById('back-to-login-link');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const forgotError = document.getElementById('forgot-error');
const apiKeysContainer = document.getElementById('api-keys-container');
const userManagementTableBody = document.getElementById('user-management-table-body');
const userStatusMessage = document.getElementById('user-status-message');
const contactLink = document.getElementById('contact-link');
const pricingLink = document.getElementById('pricing-link');
const featuresLink = document.getElementById('features-link');
const deleteAllHistoryBtn = document.getElementById('delete-all-history-btn');
const voiceSelect = document.getElementById('voice-select');
const previewVoiceBtn = document.getElementById('preview-voice-btn');
const previewBtnText = document.getElementById('preview-btn-text');
const previewLoader = document.getElementById('preview-loader');
const previewPlayer = document.getElementById('preview-player');
const generationOverlay = document.getElementById('generation-overlay');
const overlayStatusMessage = document.getElementById('overlay-status-message');
const overlayProgressCounter = document.getElementById('overlay-progress-counter');
const choosePlanBtns = document.querySelectorAll('.choose-plan-btn');

// Custom Modal Elements
const apiKeyModal = document.getElementById('api-key-modal');
const apiKeyModalOverlay = document.getElementById('api-key-modal-overlay');
const apiKeyModalContent = document.getElementById('api-key-modal-content');
const apiKeyModalTitle = document.getElementById('api-key-modal-title');
const apiKeyInput = document.getElementById('api-key-input');
const apiKeyCancelBtn = document.getElementById('api-key-cancel-btn');
const apiKeySaveBtn = document.getElementById('api-key-save-btn');

const confirmModal = document.getElementById('confirm-modal');
const confirmModalOverlay = document.getElementById('confirm-modal-overlay');
const confirmModalContent = document.getElementById('confirm-modal-content');
const confirmModalTitle = document.getElementById('confirm-modal-title');
const confirmModalText = document.getElementById('confirm-modal-text');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
const confirmOkBtn = document.getElementById('confirm-ok-btn');

const historyModal = document.getElementById('history-modal');
const historyModalOverlay = document.getElementById('history-modal-overlay');
const historyModalContent = document.getElementById('history-modal-content');
const historyModalTitle = document.getElementById('history-modal-title');
const historyTableBody = document.getElementById('history-table-body');
const historyCloseBtn = document.getElementById('history-close-btn');

const contactModal = document.getElementById('contact-modal');
const contactModalOverlay = document.getElementById('contact-modal-overlay');
const contactModalContent = document.getElementById('contact-modal-content');
const contactCloseBtn = document.getElementById('contact-close-btn');
const contactForm = document.getElementById('contact-form');

const pricingModal = document.getElementById('pricing-modal');
const pricingModalOverlay = document.getElementById('pricing-modal-overlay');
const pricingModalContent = document.getElementById('pricing-modal-content');
const pricingCloseBtn = document.getElementById('pricing-close-btn');

const featuresModal = document.getElementById('features-modal');
const featuresModalOverlay = document.getElementById('features-modal-overlay');
const featuresModalContent = document.getElementById('features-modal-content');
const featuresCloseBtn = document.getElementById('features-close-btn');

const apiKeyToggle = document.getElementById('api-key-toggle');
const apiKeyArrow = document.getElementById('api-key-arrow');
const apiKeysCollapsibleContent = document.getElementById('api-keys-collapsible-content');

let currentUser = null;
let currentUserData = null;
let isAdmin = false;
let apiKeysStore = new Array(10).fill(null);
let activeApiKeys = [DEFAULT_GEMINI_API_KEY]; 
let uploadedFileName = null;

// --- Firestore Reference ---
const apiKeysDocRef = doc(db, "admin_settings", ADMIN_UID);

// --- Authentication State Observer ---
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        isAdmin = user.uid === ADMIN_UID;
        await loadUserData(user.uid);
        updateUIForAuthState();
        userEmailDisplay.textContent = user.email;
        adminEmailDisplay.textContent = user.email;
        await loadKeysFromFirestore(); 
        if (isAdmin) {
            await loadAllUsersForAdmin();
        }
    } else {
        isAdmin = false;
        currentUserData = null;
        updateUIForAuthState();
    }
});

function updateUIForAuthState() {
    authButtons.classList.add('hidden');
    userView.classList.add('hidden');
    adminView.classList.add('hidden');
    adminPanel.classList.add('hidden');
    loginPrompt.classList.add('hidden');
    userStatusMessage.classList.add('hidden');

    if (currentUser) {
        mainAppContent.classList.remove('blur-sm', 'pointer-events-none');
        if (isAdmin) {
            adminView.classList.remove('hidden');
            adminView.classList.add('flex');
            adminPanel.classList.remove('hidden');
        } else {
            userView.classList.remove('hidden');
            userView.classList.add('flex');
            updateUserStatusMessage();
        }
    } else { // Logged out
        authButtons.classList.remove('hidden');
        authButtons.classList.add('flex');
        loginPrompt.classList.remove('hidden');
        mainAppContent.classList.add('blur-sm', 'pointer-events-none');
    }
}

function openModal(modal, overlay, content) {
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        content.classList.remove('scale-95');
    }, 10);
}

function closeModal(modal, overlay, content) {
    overlay.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');

        // Reset confirm modal button if it's the one being closed
        if (modal.id === 'confirm-modal') {
            confirmOkBtn.textContent = 'Confirm';
            confirmOkBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            confirmOkBtn.classList.add('bg-red-600', 'hover:bg-red-700');
            confirmOkBtn.onclick = null; // Clear the specific onclick handler
        }
    }, 300);
}

// --- Event Listeners ---
loginBtn.addEventListener('click', () => openModal(authModal, authModalOverlay, authModalContent));
registerBtn.addEventListener('click', () => {
    openModal(authModal, authModalOverlay, authModalContent);
    switchTab('register');
});
closeModalBtn.addEventListener('click', () => closeModal(authModal, authModalOverlay, authModalContent));
authModalOverlay.addEventListener('click', () => closeModal(authModal, authModalOverlay, authModalContent));

logoutBtn.addEventListener('click', () => signOut(auth));
adminLogoutBtn.addEventListener('click', () => signOut(auth));
historyCloseBtn.addEventListener('click', () => closeModal(historyModal, historyModalOverlay, historyModalContent));

contactLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(contactModal, contactModalOverlay, contactModalContent);
});
contactCloseBtn.addEventListener('click', () => closeModal(contactModal, contactModalOverlay, contactModalContent));
contactModalOverlay.addEventListener('click', () => closeModal(contactModal, contactModalOverlay, contactModalContent));

pricingLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(pricingModal, pricingModalOverlay, pricingModalContent);
});
pricingCloseBtn.addEventListener('click', () => closeModal(pricingModal, pricingModalOverlay, pricingModalContent));
pricingModalOverlay.addEventListener('click', () => closeModal(pricingModal, pricingModalOverlay, pricingModalContent));

featuresLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(featuresModal, featuresModalOverlay, featuresModalContent);
});
featuresCloseBtn.addEventListener('click', () => closeModal(featuresModal, featuresModalOverlay, featuresModalContent));
featuresModalOverlay.addEventListener('click', () => closeModal(featuresModal, featuresModalOverlay, featuresModalContent));

apiKeyToggle.addEventListener('click', () => {
    apiKeysCollapsibleContent.classList.toggle('hidden');
    apiKeyArrow.classList.toggle('rotate-90');
});

deleteAllHistoryBtn.addEventListener('click', () => {
    confirmModalTitle.textContent = 'Confirm Mass Deletion';
    confirmModalText.textContent = 'Are you sure you want to delete the usage history for ALL users? This action is irreversible.';
    openModal(confirmModal, confirmModalOverlay, confirmModalContent);

    confirmOkBtn.onclick = async () => {
        console.log("Starting deletion of all user histories...");
        closeModal(confirmModal, confirmModalOverlay, confirmModalContent);
        alert("Deletion process started. This may take a while. Please do not close the page.");

        try {
            const usersCol = collection(db, "users");
            const userSnapshot = await getDocs(usersCol);
            
            const deletionPromises = [];
            userSnapshot.forEach(userDoc => {
                if (userDoc.id !== ADMIN_UID) {
                    const historyPath = `users/${userDoc.id}/usage_history`;
                    deletionPromises.push(deleteSubcollection(historyPath));
                }
            });

            await Promise.all(deletionPromises);
            
            console.log("All user histories have been deleted.");
            alert("Successfully deleted all user usage history.");
        } catch (error) {
            console.error("Error deleting user histories: ", error);
            alert("An error occurred while deleting user histories. Check the console for details.");
        }
    };
});

choosePlanBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        
        confirmModalTitle.textContent = 'Activate Plan';
        confirmModalText.textContent = 'To activate this plan, please contact us directly on WhatsApp.';
        confirmOkBtn.textContent = 'Contact on WhatsApp';
        
        confirmOkBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        confirmOkBtn.classList.add('bg-green-600', 'hover:bg-green-700');

        confirmOkBtn.onclick = () => {
            window.open('https://wa.me/8801712680242', '_blank');
            closeModal(confirmModal, confirmModalOverlay, confirmModalContent);
        };
        
        openModal(confirmModal, confirmModalOverlay, confirmModalContent);
    });
});


// --- Form Handling ---
function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}
function hideError(element) {
    element.classList.add('hidden');
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(loginError);
    const email = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        closeModal(authModal, authModalOverlay, authModalContent);
        loginForm.reset();
    } catch (error) {
        showError(loginError, "Incorrect email or password.");
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(registerError);
    const name = registerForm['register-name'].value;
    const email = registerForm['register-email'].value;
    const password = registerForm['register-password'].value;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // Create user profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: user.email,
            status: 'pending',
            characterLimit: 0,
            charactersUsed: 0,
            lastUsageDate: '1970-01-01'
        });
        alert('Registration successful! Your account is now pending admin approval.');
        switchTab('login');
        registerForm.reset();
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            showError(registerError, "This email is already in use.");
        } else if (error.code === 'auth/weak-password') {
            showError(registerError, "The password is too weak.");
        } else {
            showError(registerError, "An error occurred. Please try again.");
        }
    }
});

forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(forgotError);
    const email = forgotPasswordForm['forgot-email'].value;
    try {
        await sendPasswordResetEmail(auth, email);
        alert('A password reset link has been sent to your email.');
        switchTab('login');
        forgotPasswordForm.reset();
    } catch (error) {
        showError(forgotError, "Error: Could not send email.");
    }
});

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = contactForm['contact-name'].value;
    const email = contactForm['contact-email'].value;
    const message = contactForm['contact-message'].value;

    try {
        await addDoc(collection(db, "contact_messages"), {
            name,
            email,
            message,
            timestamp: serverTimestamp()
        });
        alert('Thank you for your message! We will get back to you soon.');
        contactForm.reset();
        closeModal(contactModal, contactModalOverlay, contactModalContent);
    } catch (error) {
        console.error("Error sending message: ", error);
        alert("Sorry, there was an error sending your message. Please try again later.");
    }
});

function switchTab(tabName) {
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    forgotPasswordForm.classList.add('hidden');
    hideError(loginError);
    hideError(registerError);
    hideError(forgotError);
    
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('border-blue-500', 'text-white');
            btn.classList.remove('border-transparent', 'text-gray-400');
        } else {
            btn.classList.remove('border-blue-500', 'text-white');
            btn.classList.add('border-transparent', 'text-gray-400');
        }
    });

    if (tabName === 'login') loginForm.classList.remove('hidden');
    else if (tabName === 'register') registerForm.classList.remove('hidden');
    else if (tabName === 'forgot-password') forgotPasswordForm.classList.remove('hidden');
}

tabButtons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); switchTab('forgot-password'); });
backToLoginLink.addEventListener('click', (e) => { e.preventDefault(); switchTab('login'); });

// --- Admin Panel API Key Management ---
async function saveKeysToFirestore() {
    try {
        await setDoc(apiKeysDocRef, { keys: apiKeysStore });
        console.log("API Keys saved to Firestore.");
    } catch (error) {
        console.error("Error saving keys to Firestore: ", error);
        alert("Could not save API keys to the database.");
    }
}

async function loadKeysFromFirestore() {
    try {
        const docSnap = await getDoc(apiKeysDocRef);
        if (docSnap.exists()) {
            apiKeysStore = docSnap.data().keys || new Array(10).fill(null);
        } else {
            apiKeysStore = new Array(10).fill(null);
        }
    } catch (error) {
        console.error("Error loading keys from Firestore: ", error);
        apiKeysStore = new Array(10).fill(null);
    }
    updateActiveApiKeys();
    if(isAdmin) {
        renderApiKeySlots();
    }
}

function renderApiKeySlots() {
    apiKeysContainer.innerHTML = ''; // Clear existing slots
    for (let i = 0; i < 10; i++) {
        const key = apiKeysStore[i];
        const slot = document.createElement('div');
        slot.className = 'p-4 rounded-lg flex items-center justify-between';

        if (key) {
            const maskedKey = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : key;
            slot.classList.add('bg-green-500/20', 'border', 'border-green-500/50');
            slot.innerHTML = `
                <div>
                    <h4 class="font-semibold text-white">Global API Key ${i + 1}</h4>
                    <p class="text-sm text-gray-300 font-mono" title="${key}">${maskedKey}</p>
                </div>
                <button data-key-index="${i}" class="remove-key-btn bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Remove</button>
            `;
        } else {
            slot.classList.add('bg-red-500/20', 'border', 'border-red-500/50');
            slot.innerHTML = `
                <div>
                    <h4 class="font-semibold text-white">Global API Key ${i + 1}</h4>
                    <p class="text-sm text-red-300">API Key is not set.</p>
                </div>
                <button data-key-index="${i}" class="add-key-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Add/Change</button>
            `;
        }
        apiKeysContainer.appendChild(slot);
    }
}

function updateActiveApiKeys() {
    const filteredKeys = apiKeysStore.filter(key => key !== null);
    if (filteredKeys.length > 0) {
        activeApiKeys = filteredKeys;
    } else {
        activeApiKeys = [DEFAULT_GEMINI_API_KEY];
    }
    console.log("Updated Active API Keys:", activeApiKeys);
}

apiKeysContainer.addEventListener('click', (e) => {
    const target = e.target;
    if (target.tagName !== 'BUTTON') return;

    const keyIndex = parseInt(target.dataset.keyIndex, 10);

    if (target.classList.contains('add-key-btn')) {
        apiKeyModalTitle.textContent = `Update API Key for Slot ${keyIndex + 1}`;
        apiKeyInput.value = apiKeysStore[keyIndex] || '';
        openModal(apiKeyModal, apiKeyModalOverlay, apiKeyModalContent);
        
        apiKeySaveBtn.onclick = () => {
            const newKey = apiKeyInput.value.trim();
            if (newKey) {
                apiKeysStore[keyIndex] = newKey;
                saveKeysToFirestore();
                updateActiveApiKeys();
                renderApiKeySlots();
            }
            closeModal(apiKeyModal, apiKeyModalOverlay, apiKeyModalContent);
        };
    }

    if (target.classList.contains('remove-key-btn')) {
        confirmModalTitle.textContent = 'Confirm Deletion';
        confirmModalText.textContent = `Are you sure you want to remove the API key from slot ${keyIndex + 1}?`;
        openModal(confirmModal, confirmModalOverlay, confirmModalContent);

        confirmOkBtn.onclick = () => {
            apiKeysStore[keyIndex] = null;
            saveKeysToFirestore();
            updateActiveApiKeys();
            renderApiKeySlots();
            closeModal(confirmModal, confirmModalOverlay, confirmModalContent);
        };
    }
});

apiKeyCancelBtn.addEventListener('click', () => closeModal(apiKeyModal, apiKeyModalOverlay, apiKeyModalContent));
confirmCancelBtn.addEventListener('click', () => closeModal(confirmModal, confirmModalOverlay, confirmModalContent));

// --- User Management ---
async function loadUserData(uid) {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
        currentUserData = docSnap.data();
    } else {
        console.log("No such user document!");
        currentUserData = null;
    }
}

async function loadAllUsersForAdmin() {
    const usersCol = collection(db, "users");
    const userSnapshot = await getDocs(usersCol);
    const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderUserManagementTable(userList);
}

function renderUserManagementTable(users) {
    userManagementTableBody.innerHTML = '';
    users.forEach(user => {
        if(user.id === ADMIN_UID) return; // Don't show admin in the list
        
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-700';

        let statusClass = 'text-yellow-400';
        if (user.status === 'approved') statusClass = 'text-green-400';
        if (user.status === 'blocked') statusClass = 'text-red-400';

        const today = new Date().toISOString().slice(0, 10);
        const usageToday = (user.lastUsageDate === today) ? (user.charactersUsed || 0) : 0;
        const remainingChars = user.characterLimit - usageToday;
        const isUnlimited = user.characterLimit >= 999999999;

        let actionButtons = '';
        if (user.status === 'pending') {
            actionButtons += `<button data-uid="${user.id}" class="approve-user-btn bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded">Approve</button>`;
        } else if (user.status === 'approved') {
            actionButtons += `<button data-uid="${user.id}" class="block-user-btn bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded">Block</button>`;
        } else if (user.status === 'blocked') {
            actionButtons += `<button data-uid="${user.id}" class="unblock-user-btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded">Unblock</button>`;
        }

        row.innerHTML = `
            <td class="p-3">${user.name || 'N/A'}</td>
            <td class="p-3">${user.email}</td>
            <td class="p-3 ${statusClass}">${user.status}</td>
            <td class="p-3">${isUnlimited ? 'Unlimited' : user.characterLimit.toLocaleString()}</td>
            <td class="p-3">${isUnlimited ? 'N/A' : `${usageToday.toLocaleString()} / ${remainingChars.toLocaleString()} left`}</td>
            <td class="p-3 space-x-2">
                ${actionButtons}
                <select data-uid="${user.id}" class="set-limit-select bg-gray-600 text-white rounded p-1">
                    <option value="5000" ${user.characterLimit === 5000 ? 'selected' : ''}>5,000</option>
                    <option value="10000" ${user.characterLimit === 10000 ? 'selected' : ''}>10,000</option>
                    <option value="20000" ${user.characterLimit === 20000 ? 'selected' : ''}>20,000</option>
                    <option value="999999999" ${isUnlimited ? 'selected' : ''}>Unlimited</option>
                </select>
                <button data-uid="${user.id}" data-email="${user.email}" class="view-history-btn bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded">History</button>
                <button data-uid="${user.id}" data-email="${user.email}" class="delete-user-btn bg-red-800 hover:bg-red-900 text-white font-bold py-1 px-3 rounded">Delete</button>
            </td>
        `;
        userManagementTableBody.appendChild(row);
    });
}

userManagementTableBody.addEventListener('click', async (e) => {
    const target = e.target;
    // Ensure the click is on a button, not the select or other elements
    if (target.tagName !== 'BUTTON') {
        return;
    }

    const uid = target.dataset.uid;
    if (!uid) return;

    if (target.classList.contains('approve-user-btn')) {
        await updateDoc(doc(db, "users", uid), { status: 'approved' });
    } else if (target.classList.contains('block-user-btn')) {
        await updateDoc(doc(db, "users", uid), { status: 'blocked' });
    } else if (target.classList.contains('unblock-user-btn')) {
        await updateDoc(doc(db, "users", uid), { status: 'approved' });
    } else if (target.classList.contains('delete-user-btn')) {
        const email = target.dataset.email;
        confirmModalTitle.textContent = 'Confirm User Deletion';
        confirmModalText.textContent = `Are you sure you want to permanently delete the user ${email}? This action cannot be undone.`;
        openModal(confirmModal, confirmModalOverlay, confirmModalContent);
        confirmOkBtn.onclick = async () => {
            await deleteDoc(doc(db, "users", uid));
            closeModal(confirmModal, confirmModalOverlay, confirmModalContent);
            loadAllUsersForAdmin();
        };
        return; 
    } else if (target.classList.contains('view-history-btn')) {
        const email = target.dataset.email;
        await showUserHistory(uid, email);
        return;
    }
    loadAllUsersForAdmin();
});

userManagementTableBody.addEventListener('change', async (e) => {
     const target = e.target;
    if (target.classList.contains('set-limit-select')) {
        const uid = target.dataset.uid;
        const newLimit = parseInt(target.value, 10);
        await updateDoc(doc(db, "users", uid), { characterLimit: newLimit });
        loadAllUsersForAdmin();
    }
});

async function showUserHistory(uid, email) {
    historyModalTitle.textContent = `Usage History for ${email}`;
    historyTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Loading history...</td></tr>';
    openModal(historyModal, historyModalOverlay, historyModalContent);

    const historyCol = collection(db, "users", uid, "usage_history");
    const historySnapshot = await getDocs(historyCol);
    
    if (historySnapshot.empty) {
        historyTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">No usage history found.</td></tr>';
        return;
    }
    
    historyTableBody.innerHTML = '';
    historySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-700';
        const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'N/A';
        row.innerHTML = `
            <td class="p-3">${date}</td>
            <td class="p-3">${data.textSnippet}</td>
            <td class="p-3">${data.charactersUsed.toLocaleString()}</td>
            <td class="p-3">${data.language || 'N/A'}</td>
            <td class="p-3">${data.voice || 'N/A'}</td>
        `;
        historyTableBody.appendChild(row);
    });
}

function updateUserStatusMessage() {
    if (!currentUserData || isAdmin) {
        userStatusMessage.classList.add('hidden');
        return;
    }

    userStatusMessage.classList.remove('hidden', 'bg-yellow-500/20', 'text-yellow-200', 'bg-green-500/20', 'text-green-200', 'bg-red-500/20', 'text-red-200');
    
    if (currentUserData.status === 'pending') {
        userStatusMessage.innerHTML = 'Your account is pending approval from the administrator. Please wait.<br>For faster activation, please contact us via WhatsApp from the contact button.';
        userStatusMessage.classList.add('bg-yellow-500/20', 'text-yellow-200');
    } else if (currentUserData.status === 'approved') {
        const isUnlimited = currentUserData.characterLimit >= 999999999;
        if (isUnlimited) {
            userStatusMessage.textContent = `Welcome! You have an Unlimited plan.`;
        } else {
            const today = new Date().toISOString().slice(0, 10);
            const usageToday = (currentUserData.lastUsageDate === today) ? (currentUserData.charactersUsed || 0) : 0;
            const remaining = currentUserData.characterLimit - usageToday;
            userStatusMessage.textContent = `Welcome! You have ${remaining.toLocaleString()} characters remaining for today.`;
        }
        userStatusMessage.classList.add('bg-green-500/20', 'text-green-200');
    } else if (currentUserData.status === 'blocked') {
        userStatusMessage.textContent = 'Your account has been blocked by the administrator.';
        userStatusMessage.classList.add('bg-red-500/20', 'text-red-200');
    }
}


// --- Main App Logic (TTS Generation) ---
const fileUpload = document.getElementById('file-upload');
const fileNameDisplay = document.getElementById('file-name');
const textInput = document.getElementById('text-input');
const generateBtn = document.getElementById('generate-btn');
const downloadSection = document.getElementById('download-section');
const downloadAllBtn = document.getElementById('download-all-btn');
let audioChunks = [];

fileUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        fileNameDisplay.textContent = `Selected file: ${file.name}`;
        uploadedFileName = file.name.split('.').slice(0, -1).join('.');
        const reader = new FileReader();
        reader.onload = (e) => { textInput.value = e.target.result; };
        reader.readAsText(file);
    }
});

generateBtn.addEventListener('click', async () => {
    if (!currentUser) {
        alert('Please log in to use this feature.');
        return;
    }

    const fullText = textInput.value.trim();
    if (!fullText) {
        alert('Please upload a file or paste some text.');
        return;
    }

    // Show loading UI immediately
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    generationOverlay.classList.remove('hidden');
    generationOverlay.classList.add('flex');
    downloadSection.classList.add('hidden');

    try {
        await loadUserData(currentUser.uid);

        if (!currentUserData) {
            throw new Error("Could not retrieve your user profile. Please try logging out and back in.");
        }

        if (!isAdmin) {
            if (currentUserData.status !== 'approved') {
                throw new Error('Your account is not approved to generate audio. Please contact the administrator.');
            }

            const isUnlimited = currentUserData.characterLimit >= 999999999;
            if (!isUnlimited) {
                const today = new Date().toISOString().slice(0, 10);
                let usageToday = currentUserData.lastUsageDate === today ? (currentUserData.charactersUsed || 0) : 0;

                if (currentUserData.lastUsageDate !== today) {
                    await updateDoc(doc(db, "users", currentUser.uid), {
                        charactersUsed: 0,
                        lastUsageDate: today
                    });
                    currentUserData.charactersUsed = 0;
                    currentUserData.lastUsageDate = today;
                    updateUserStatusMessage();
                    usageToday = 0;
                }

                const remainingChars = currentUserData.characterLimit - usageToday;
                if (fullText.length > remainingChars) {
                    throw new Error(`The text is too long. You have ${remainingChars.toLocaleString()} characters remaining today, but the text is ${fullText.length.toLocaleString()} characters.`);
                }
            }
        }

        await processText(fullText);

    } catch (error) {
        console.error("Error during generation process:", error);
        alert(error.message);
    } finally {
        // Always hide overlay and re-enable button
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Audio';
        generationOverlay.classList.add('hidden');
        generationOverlay.classList.remove('flex');
    }
});

function splitText(text, chunkSize) {
    const chunks = [];
    let remainingText = text;

    while (remainingText.length > 0) {
        if (remainingText.length <= chunkSize) {
            chunks.push(remainingText);
            break;
        }

        let chunk = remainingText.substring(0, chunkSize);
        let lastSpaceIndex = chunk.lastIndexOf(' ');
        let lastNewlineIndex = chunk.lastIndexOf('\n');
        let lastSentenceEnd = Math.max(chunk.lastIndexOf('.'), chunk.lastIndexOf('!'), chunk.lastIndexOf('?'));

        let splitIndex = -1;
        if (lastSentenceEnd > 0) {
            splitIndex = lastSentenceEnd + 1;
        } else if (lastNewlineIndex > 0) {
            splitIndex = lastNewlineIndex + 1;
        } else if (lastSpaceIndex > 0) {
            splitIndex = lastSpaceIndex + 1;
        } else {
            splitIndex = chunkSize;
        }
        
        chunks.push(remainingText.substring(0, splitIndex).trim());
        remainingText = remainingText.substring(splitIndex).trim();
    }
    return chunks;
}

async function processText(text) {
    audioChunks = [];
    const textChunks = splitText(text, 4500);
    const totalParts = textChunks.length;
    let completedParts = 0;
    overlayProgressCounter.textContent = `${completedParts} / ${totalParts} Parts Completed`;
    
    const allAudioData = [];
    const CONCURRENCY_LIMIT = 10; 
    const selectedVoice = voiceSelect.value;

    const queue = textChunks.map((chunk, index) => ({ chunk, index }));

    async function worker() {
        while (queue.length > 0) {
            const task = queue.shift();
            if (!task) continue;

            const { chunk, index } = task;
            const partNumber = index + 1;
            const startingKeyIndex = partNumber % activeApiKeys.length;
            
            const result = await generateAudioWithFailover(chunk, partNumber, activeApiKeys, startingKeyIndex, selectedVoice);

            if (result !== null) {
                allAudioData.push(result);
            }
            completedParts++;
            overlayProgressCounter.textContent = `${completedParts} / ${totalParts} Parts Completed`;
        }
    }

    const workers = [];
    for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
        workers.push(worker());
    }

    await Promise.all(workers);
    
    if (completedParts === totalParts) {
        overlayStatusMessage.textContent = 'All parts generated successfully!';
        allAudioData.sort((a, b) => a.partNumber - b.partNumber);
        audioChunks = allAudioData.map(data => data.pcm);
        downloadSection.classList.remove('hidden');
    } else {
        overlayStatusMessage.textContent = `Generation failed. ${completedParts} of ${totalParts} parts were successful. Please try again.`;
    }

    // Log history for all users (admin, unlimited, regular)
    const today = new Date().toISOString().slice(0, 10);
    let newUsage = currentUserData.charactersUsed || 0;
    const isUnlimited = currentUserData.characterLimit >= 999999999;

    if (!isAdmin && !isUnlimited) {
        const usageToday = currentUserData.lastUsageDate === today ? (currentUserData.charactersUsed || 0) : 0;
        newUsage = usageToday + text.length;
        await updateDoc(doc(db, "users", currentUser.uid), { 
            charactersUsed: newUsage,
            lastUsageDate: today
        });
    }
    
    await addDoc(collection(db, "users", currentUser.uid, "usage_history"), {
        timestamp: serverTimestamp(),
        textSnippet: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        charactersUsed: text.length,
        language: 'Auto-Detected',
        voice: selectedVoice
    });
    
    await loadUserData(currentUser.uid);
    updateUserStatusMessage();
}

async function generateAudioWithFailover(text, partNumber, keys, startIndex, voiceName) {
    const maxKeyAttempts = keys.length;
    for (let keyAttempt = 0; keyAttempt < maxKeyAttempts; keyAttempt++) {
        const keyIndex = (startIndex + keyAttempt) % maxKeyAttempts;
        const currentKey = keys[keyIndex];
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${currentKey}`;
        
        const maxRetries = 3;
        let delay = 1000; // start with 1 second delay

        for (let retry = 0; retry < maxRetries; retry++) {
            try {
                const payload = {
                    contents: [{ parts: [{ text: `Say this clearly: ${text}` }] }],
                    generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } } },
                    model: "gemini-2.5-flash-preview-tts"
                };
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    const partData = result?.candidates?.[0]?.content?.parts?.[0];
                    const audioData = partData?.inlineData?.data;
                    const mimeType = partData?.inlineData?.mimeType;

                    if (audioData && mimeType && mimeType.startsWith("audio/")) {
                        console.log(`Part ${partNumber} generated successfully with Key ${keyIndex + 1}.`);
                        const sampleRate = mimeType.match(/rate=(\d+)/) ? parseInt(mimeType.match(/rate=(\d+)/)[1], 10) : 24000;
                        const pcm = new Int16Array(base64ToArrayBuffer(audioData));
                        return { pcm, sampleRate, partNumber };
                    }
                } else if (response.status === 429) { // Specifically handle rate limiting
                    console.warn(`Rate limit hit for Part ${partNumber} on Key ${keyIndex + 1}. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Exponential backoff
                } else {
                    console.warn(`Key ${keyIndex + 1} failed for part ${partNumber}. Status: ${response.status}. Retrying...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                }
            } catch (error) {
                console.error(`Network error for Part ${partNumber} on Key ${keyIndex + 1}. Retrying in ${delay / 1000}s...`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
        console.error(`All retries failed for Part ${partNumber} with Key ${keyIndex + 1}. Trying next key.`);
    }

    console.error(`All API keys and retries failed for part ${partNumber}.`);
    return null;
}

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function pcmToMp3(pcm, sampleRate) {
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128); // 1 channel, 24000 sample rate, 128kbps
    const mp3Data = [];
    const samples = pcm;
    const sampleBlockSize = 1152; 

    for (let i = 0; i < samples.length; i += sampleBlockSize) {
        const sampleChunk = samples.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }
    
    return new Blob(mp3Data, {type: 'audio/mpeg'});
}

async function deleteSubcollection(collectionPath) {
    const collectionRef = collection(db, collectionPath);
    const q = query(collectionRef);
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log(`No documents to delete in ${collectionPath}`);
        return;
    }

    const batchSize = 500;
    let currentBatch = writeBatch(db);
    let count = 0;

    for (const doc of snapshot.docs) {
        currentBatch.delete(doc.ref);
        count++;
        if (count === batchSize) {
            await currentBatch.commit();
            currentBatch = writeBatch(db);
            count = 0;
        }
    }

    if (count > 0) {
        await currentBatch.commit();
    }
    console.log(`Deleted ${snapshot.size} documents from ${collectionPath}`);
}

downloadAllBtn.addEventListener('click', () => {
    if (audioChunks.length === 0) {
        alert("No audio parts to download.");
        return;
    }

    // Combine all PCM data chunks
    let totalLength = 0;
    audioChunks.forEach(chunk => {
        totalLength += chunk.length;
    });

    const combinedPcm = new Int16Array(totalLength);
    let offset = 0;
    audioChunks.forEach(chunk => {
        combinedPcm.set(chunk, offset);
        offset += chunk.length;
    });

    // Assuming all chunks have the same sample rate, using 24000 as standard
    const mp3Blob = pcmToMp3(combinedPcm, 24000);
    const audioUrl = URL.createObjectURL(mp3Blob);

    const a = document.createElement('a');
    a.href = audioUrl;
    
    const downloadName = uploadedFileName ? `${uploadedFileName}.mp3` : 'combined_audio.mp3';
    a.download = downloadName;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Reset for next generation
    uploadedFileName = null;
    fileNameDisplay.textContent = '';
});

// --- Voice Selection Logic ---
const availableVoices = [
    // Special & Attractive Voices
    { name: "Puck", description: "Upbeat" }, 
    { name: "Charon", description: "Informative" }, 
    { name: "Kore", description: "Firm" }, 
    { name: "Sulafat", description: "Warm" }, 
    { name: "Achird", description: "Friendly" },
    { name: "Iapetus", description: "Clear" }, 
    { name: "Algenib", description: "Gravelly" }, 
    { name: "Rasalgethi", description: "Informative" },
    // Other Voices
    { name: "Zephyr", description: "Bright" }, 
    { name: "Fenrir", description: "Excitable" }, 
    { name: "Leda", description: "Youthful" }, 
    { name: "Orus", description: "Firm" }, 
    { name: "Aoede", description: "Breezy" }, 
    { name: "Callirrhoe", description: "Easy-going" }, 
    { name: "Autonoe", description: "Bright" }, 
    { name: "Enceladus", description: "Breathy" }, 
    { name: "Umbriel", description: "Easy-going" }, 
    { name: "Algieba", description: "Smooth" }, 
    { name: "Despina", description: "Smooth" }, 
    { name: "Erinome", description: "Clear" }, 
    { name: "Laomedeia", description: "Upbeat" }, 
    { name: "Achernar", description: "Soft" }, 
    { name: "Alnilam", description: "Firm" }, 
    { name: "Schedar", description: "Even" }, 
    { name: "Gacrux", description: "Mature" }, 
    { name: "Pulcherrima", description: "Forward" }, 
    { name: "Zubenelgenubi", description: "Casual" }, 
    { name: "Vindemiatrix", description: "Gentle" }, 
    { name: "Sadachbia", description: "Lively" }, 
    { name: "Sadaltager", description: "Knowledgeable" }
];

function populateVoiceSelector() {
    availableVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.description})`;
        voiceSelect.appendChild(option);
    });
}

previewVoiceBtn.addEventListener('click', async () => {
    const selectedVoice = voiceSelect.value;
    previewBtnText.classList.add('hidden');
    previewLoader.classList.remove('hidden');
    previewVoiceBtn.disabled = true;

    const sampleText = "This is a preview of the selected voice.";
    const audioData = await generateAudioWithFailover(sampleText, 'preview', activeApiKeys, 0, selectedVoice);

    if (audioData) {
        const mp3Blob = pcmToMp3(audioData.pcm, audioData.sampleRate);
        const audioUrl = URL.createObjectURL(mp3Blob);
        previewPlayer.src = audioUrl;
        previewPlayer.play();
    } else {
        alert("Could not generate voice preview. Please check API keys.");
    }
    
    previewPlayer.onended = () => {
        previewBtnText.classList.remove('hidden');
        previewLoader.classList.add('hidden');
        previewVoiceBtn.disabled = false;
    };
     // Add a timeout to re-enable the button in case of an error
    setTimeout(() => {
         if(previewVoiceBtn.disabled) {
            previewBtnText.classList.remove('hidden');
            previewLoader.classList.add('hidden');
            previewVoiceBtn.disabled = false;
         }
    }, 5000); 
});

// Initial setup
populateVoiceSelector();
