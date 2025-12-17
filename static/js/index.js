const socket = io();
const chatContainer = document.getElementById('chat');
const msgInput = document.getElementById('message');
const sendBtn = document.getElementById('send');
const imageInput = document.getElementById('image-input');

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

    // 1. Dacă mesajul are imagine, o creăm
    if (data.image) {
        const img = document.createElement('img');
        img.src = '/static/chat_uploads/' + data.image;
        img.className = 'chat-image';
        div.appendChild(img);
    }

    // 2. Dacă mesajul are text, îl creăm
    if (data.msg) {
        const textDiv = document.createElement('div');
        textDiv.className = 'msg-text';
        textDiv.innerText = data.msg;
        div.appendChild(textDiv);
    }
    
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

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
    msgInput.style.height = '50px'; // Reset height if auto-expand was used
}

// Send Image Logic (NOU)
if (imageInput) {
    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                // Trimitem imaginea ca base64
                socket.emit('upload_image', {
                    username: window.currentUsername,
                    image: evt.target.result, // base64 string
                    fileName: file.name
                });
            };
            reader.readAsDataURL(file);
            this.value = ''; // Reset input
        }
    });
}

if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
    msgInput.addEventListener('keydown', e => { 
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            sendMessage(); 
        }
    });
}