// ============================================
// DevPublish Authentication System
// MongoDB + Express + JWT
// ============================================

const API_BASE_URL = "http://localhost:5000/api";


// ============================================
// TOKEN MANAGEMENT
// ============================================

// Get token from localStorage OR sessionStorage
function getToken() {
    return (
        localStorage.getItem("devpublish_token") ||
        sessionStorage.getItem("devpublish_token")
    );
}


// Save token
function saveToken(token, remember = true) {

    // Clear old tokens first
    localStorage.removeItem("devpublish_token");
    sessionStorage.removeItem("devpublish_token");

    if (remember) {
        localStorage.setItem("devpublish_token", token);
    } else {
        sessionStorage.setItem("devpublish_token", token);
    }
}


// Remove token
function removeToken() {
    localStorage.removeItem("devpublish_token");
    sessionStorage.removeItem("devpublish_token");
}


// ============================================
// USER MANAGEMENT
// ============================================

// Get current user
function getCurrentUser() {

    const user =
        localStorage.getItem("devpublish_user") ||
        sessionStorage.getItem("devpublish_user");

    if (!user) {
        return null;
    }

    try {
        return JSON.parse(user);
    } catch (error) {
        console.error("Invalid stored user:", error);
        return null;
    }
}


// Save user
function saveUser(user, remember = true) {

    localStorage.removeItem("devpublish_user");
    sessionStorage.removeItem("devpublish_user");

    if (remember) {

        localStorage.setItem(
            "devpublish_user",
            JSON.stringify(user)
        );

    } else {

        sessionStorage.setItem(
            "devpublish_user",
            JSON.stringify(user)
        );
    }
}


// ============================================
// LOGIN STATUS
// ============================================

function isLoggedIn() {
    return !!getToken();
}


// ============================================
// LOGOUT
// ============================================

function logout() {
    removeToken();

    localStorage.removeItem("devpublish_user");
    sessionStorage.removeItem("devpublish_user");

    const currentPath = window.location.pathname;

    if (currentPath.includes("/pages/")) {
        window.location.href = "login.html";
    } else {
        window.location.href = "./pages/login.html";
    }
}

// ============================================
// REGISTER USER
// ============================================

async function registerUser(
    name,
    username,
    email,
    password
) {

    try {

        const response = await fetch(
            `${API_BASE_URL}/users/register`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    username,
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Registration failed"
            );
        }

        return {
            success: true,
            data
        };

    } catch (error) {

        console.error(
            "Registration error:",
            error
        );

        return {
            success: false,
            message: error.message
        };
    }
}


// ============================================
// LOGIN USER
// ============================================

async function loginUser(
    email,
    password,
    remember = true
) {

    try {

        const response = await fetch(
            `${API_BASE_URL}/users/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Login failed"
            );
        }


        // Save JWT
        if (data.token) {

            saveToken(
                data.token,
                remember
            );
        }


        // Save user
        if (data.user) {

            saveUser(
                data.user,
                remember
            );
        }


        return {
            success: true,
            data
        };

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        return {
            success: false,
            message: error.message
        };
    }
}


// ============================================
// GET AUTHENTICATED PROFILE
// ============================================

async function getProfile() {

    const token = getToken();

    if (!token) {

        return {
            success: false,
            message: "Please login first"
        };
    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/users/profile`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            // Token expired/invalid
            if (response.status === 401) {

                removeToken();

                localStorage.removeItem(
                    "devpublish_user"
                );

                sessionStorage.removeItem(
                    "devpublish_user"
                );
            }

            throw new Error(
                data.message ||
                "Unable to get profile"
            );
        }


        // Update user information
        if (data.user) {

            const remember =
                !!localStorage.getItem(
                    "devpublish_token"
                );

            saveUser(
                data.user,
                remember
            );
        }


        return {
            success: true,
            data
        };


    } catch (error) {

        console.error(
            "Profile error:",
            error
        );

        return {
            success: false,
            message: error.message
        };
    }
}


// ============================================
// PROTECT PAGE
// ============================================

function requireLogin() {

    if (!isLoggedIn()) {

        const currentPage =
            window.location.pathname
            .split("/")
            .pop();

        window.location.href =
            `login.html?redirect=${encodeURIComponent(currentPage)}`;
    }
}


// ============================================
// UPDATE DEV PUBLISH HEADER
// ============================================

function updateAuthUI() {

    const token = getToken();
    const user = getCurrentUser();


    const guestActions =
        document.getElementById(
            "guestActions"
        );

    const userActions =
        document.getElementById(
            "userActions"
        );

    const avatarCircle =
        document.getElementById(
            "avatarCircle"
        );

    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );


    // USER LOGGED IN
    if (token) {

        if (guestActions) {
            guestActions.hidden = true;
        }

        if (userActions) {
            userActions.hidden = false;
        }


        // Show first letter in avatar
        if (avatarCircle && user) {

            const name =
                user.name ||
                user.username ||
                "User";

            avatarCircle.textContent =
                name.charAt(0).toUpperCase();
        }


        // Logout
        if (logoutBtn) {

            logoutBtn.onclick = function () {
                logout();
            };
        }


    }

    // USER NOT LOGGED IN
    else {

        if (guestActions) {
            guestActions.hidden = false;
        }

        if (userActions) {
            userActions.hidden = true;
        }
    }
}


// ============================================
// INITIALIZE AUTH SYSTEM
// ============================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateAuthUI();

    }
);