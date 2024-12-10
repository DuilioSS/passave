const API_BASE_URL = 'http://localhost:3000'; // URL del backend

async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nella richiesta al server');
    }
    return await response.json();
}

// Login
async function loginUser(username, password) {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
}

// Register
async function registerUser(userData) {
    const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
    });
    return handleResponse(response);
}

// Get Passwords
async function getPasswords(userId) {
    const response = await fetch(`${API_BASE_URL}/get-passwords/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
}

// Add Password
async function addPassword(passwordData) {
    const response = await fetch(`${API_BASE_URL}/add-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
    });
    return handleResponse(response);
}

// Logout
function logoutUser() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

export { loginUser, registerUser, getPasswords, addPassword, logoutUser };
