const socket = io();
const chatContainer = document.getElementById('dm-history');
const msgInput = document.getElementById('dm-input');
const sendBtn = document.getElementById('dm-send-btn');

// Scroll to bottom on load
if(chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

socket.on('connect', () => {
    // Join the DM room
    if (window.activeRecipient) {
        socket.emit('join_dm', { 
            recipient: window.activeRecipient,
            username: window.currentUser 
        });
    }
});

function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function appendMessage(text, isSentByMe) {
    if (!chatContainer) return;
    
    const div = document.createElement('div');
    div.className = isSentByMe ? 'msg-bubble msg-sent' : 'msg-bubble msg-received';
    div.innerHTML = escapeHtml(text);
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Listen for incoming private messages
socket.on('receive_private_message', data => {
    // Only append if the message belongs to this conversation
    if (data.sender === window.activeRecipient || data.sender === window.currentUser) {
        const isMe = data.sender === window.currentUser;
        appendMessage(data.msg, isMe);
    }
});

// Send Logic
function sendMessage() {
    if (!msgInput || !window.activeRecipient) return;
    const msg = msgInput.value.trim();
    if (!msg) return;

    // Emit to server
    socket.emit('send_private_message', {
        recipient: window.activeRecipient,
        msg: msg
    });

    // BUG FIX: Removed optimistic appendMessage() here.
    // We now wait for 'receive_private_message' to update the UI.
    
    msgInput.value = '';
}

if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
    msgInput.addEventListener('keydown', e => { 
        if(e.key === 'Enter') sendMessage(); 
    });
}