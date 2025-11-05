//client side user db
const USER_CREDENTIALS = {
    "john.doe": {
        name: "John Doe",
        id: "1001",
        password: "password123"
    },
    "jane.smith": {
        name: "Jane Smith",
        id: "1002",
        password: "password123"
    },
    "guest": {
        name: "Guest User",
        id: "2000",
        password: "password123"
    }
};
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const messageElement = document.getElementById('message');

if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const input = usernameInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        let userKey = null;
        if (USER_CREDENTIALS[input]) {
            userKey = input;
        } else {
            for (const key in USER_CREDENTIALS) {
                if (USER_CREDENTIALS[key].id === input) {
                    userKey = key;
                    break;
                }
            }
        }

        if (userKey && USER_CREDENTIALS[userKey].password === password) {
            const user = USER_CREDENTIALS[userKey];
            showMessage(`Login successful! Redirecting...`, 'success');
            localStorage.setItem('loggedInUser', JSON.stringify(user));
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);

        } else {
            showMessage('Invalid name/ID or password. Please try again.', 'error');
        }
    });
}
 
function showMessage(msg, type) {
    if (messageElement) {
        messageElement.textContent = msg;
        messageElement.className = `message ${type}`;
    }
}