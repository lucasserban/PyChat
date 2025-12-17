const socket = io();
const chatContainer = document.getElementById('chat');
const msgInput = document.getElementById('message');
const sendBtn = document.getElementById('send');

// Scroll to bottom on load
if(chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

socket.on('connect', () => {
    socket.emit('join', { username: window.currentUsername });
});

function appendMessage(data) {
    if (!chatContainer) return;
    
    const div = document.createElement('div');
    div.className = 'msg';
    
    // Create the username link
    const strong = document.createElement('strong');
    strong.innerText = data.username + ': ';
    
    // Create the link wrapper (to keep consistent with your HTML)
    const link = document.createElement('a');
    link.href = `/profile/${data.username}`;
    link.className = 'username-link';
    link.appendChild(strong);

    div.appendChild(link);
    div.appendChild(document.createTextNode(data.msg));
    
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Listen for incoming global messages
socket.on('receive_message', data => {
    appendMessage(data);
});

socket.on('system_message', data => {
    if (!chatContainer) return;
    const div = document.createElement('div');
    div.className = 'msg sys';
    div.innerText = data.msg;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
});

// Send Logic
function sendMessage() {
    if (!msgInput) return;
    const msg = msgInput.value.trim();
    if (!msg) return;

    socket.emit('send_message', {
        username: window.currentUsername,
        msg: msg
    });
    
    msgInput.value = '';
}

if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
    msgInput.addEventListener('keydown', e => { 
        if(e.key === 'Enter') sendMessage(); 
    });
}