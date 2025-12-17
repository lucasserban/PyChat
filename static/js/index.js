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
    
    // Verificăm dacă mesajul este al meu
    const isMe = data.username === window.currentUsername;
    
    const div = document.createElement('div');
    // Setăm clasa pentru aliniere (dreapta pt mine, stânga pt alții)
    div.className = isMe ? 'msg-bubble msg-sent' : 'msg-bubble msg-received';
    
    // Dacă mesajul este de la altcineva, adăugăm numele deasupra textului
    if (!isMe) {
        const nameDiv = document.createElement('div');
        nameDiv.className = 'sender-name';
        
        const link = document.createElement('a');
        link.href = `/profile/${data.username}`;
        link.innerText = data.username;
        
        nameDiv.appendChild(link);
        div.appendChild(nameDiv);
    }

    // Adăugăm textul mesajului
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