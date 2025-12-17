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
    
    const isMe = data.username === window.currentUsername;
    
    const div = document.createElement('div');
    div.className = isMe ? 'msg-bubble msg-sent' : 'msg-bubble msg-received';
    
    if (!isMe) {
        const nameDiv = document.createElement('div');
        nameDiv.className = 'sender-name';
        
        const link = document.createElement('a');
        link.href = `/profile/${data.username}`;
        link.innerText = data.username;
        
        nameDiv.appendChild(link);
        div.appendChild(nameDiv);
    }

    // MODIFICARE: Creăm un div separat pentru text
    const textDiv = document.createElement('div');
    textDiv.className = 'msg-text';
    textDiv.innerText = data.msg; // Folosim innerText pentru a interpreta corect \n
    
    div.appendChild(textDiv);
    
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

if (sendBtn && msgInput) {
    sendBtn.addEventListener('click', sendMessage);

    msgInput.addEventListener('keydown', e => { 
        // Dacă apeși Enter FĂRĂ Shift -> Trimite mesajul
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            sendMessage();
            // Nu mai este nevoie să resetăm înălțimea, ea fiind fixă din CSS
        }
        // Shift+Enter va funcționa normal (rând nou + scroll)
    });

    // AM ȘTERS evenimentul 'input' care modifica this.style.height
}