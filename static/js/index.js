// filepath: [index.js](http://_vscodecontentref_/1)
const socket = io();
const chat = document.getElementById('chat');
const sendBtn = document.getElementById('send');
const msgInput = document.getElementById('message');
const username = window.currentUsername; // Get username from Flask

function appendMessage(html, cls='msg'){
    const d = document.createElement('div');
    d.className = cls;
    d.innerHTML = html;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

socket.on('connect', () => {
    appendMessage('Connected to server.', 'sys');
    socket.emit('join', { username });
});

socket.on('disconnect', () => {
    appendMessage('Disconnected from server.', 'sys');
});

socket.on('system_message', data => {
    appendMessage(escapeHtml(data.msg), 'sys');
});

socket.on('receive_message', data => {
    const name = escapeHtml(data.username || 'Anonymous');
    const text = escapeHtml(data.msg || '');
    appendMessage(`<strong>${name}:</strong> ${text}`);
});

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', e => { if(e.key === 'Enter') sendMessage(); });

function sendMessage(){
    const msg = msgInput.value.trim();
    if(!msg) return;
    socket.emit('send_message', { username, msg });
    msgInput.value = '';
}

// Simple escape
function escapeHtml(s) { 
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}