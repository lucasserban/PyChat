const socket = io();
const chatContainer = document.getElementById('dm-history');
const msgInput = document.getElementById('dm-input');
const sendBtn = document.getElementById('dm-send-btn');
const imageInput = document.getElementById('dm-image-input'); // Definim input-ul de imagine

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

// Funcție modificată pentru a accepta obiectul DATA (care poate avea msg si image)
function appendMessage(data, isSentByMe) {
    if (!chatContainer) return;
    
    const div = document.createElement('div');
    div.className = isSentByMe ? 'msg-bubble msg-sent' : 'msg-bubble msg-received';
    
    // 1. Dacă mesajul are imagine
    if (data.image) {
        const img = document.createElement('img');
        // Verificăm dacă e base64 (începe cu data:) sau path de server
        if (data.image.startsWith('data:')) {
             img.src = data.image; // Pentru preview rapid (opțional) sau dacă serverul întoarce base64
        } else {
             img.src = '/static/chat_uploads/' + data.image;
        }
        img.className = 'chat-image';
        div.appendChild(img);
    }

    // 2. Dacă mesajul are text
    if (data.msg) {
        const textDiv = document.createElement('div');
        textDiv.className = 'msg-text';
        textDiv.innerText = data.msg;
        div.appendChild(textDiv);
    }
    
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Listen for incoming private messages
socket.on('receive_private_message', data => {
    // Verificăm dacă mesajul aparține conversației curente
    if (data.sender === window.activeRecipient || data.sender === window.currentUser) {
        const isMe = data.sender === window.currentUser;
        
        // Adaptăm datele pentru appendMessage
        // Serverul trimite probabil { msg: "...", image: "..." }
        appendMessage({
            msg: data.msg,
            image: data.image
        }, isMe);
    }
});

// Logică Trimitere Text
function sendMessage() {
    if (!msgInput || !window.activeRecipient) return;
    const msg = msgInput.value.trim();
    if (!msg) return;

    socket.emit('send_private_message', {
        recipient: window.activeRecipient,
        msg: msg
        // image: null (opțional, serverul ar trebui să se descurce fără)
    });
    
    msgInput.value = '';
    msgInput.style.height = '50px'; // Reset height
}

// Logică Trimitere Imagine (NOU)
if (imageInput) {
    imageInput.addEventListener('change', function() {
        if (!window.activeRecipient) return;

        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                // Trimitem evenimentul 'upload_private_image'
                socket.emit('upload_private_image', {
                    recipient: window.activeRecipient,
                    username: window.currentUser,
                    image: evt.target.result, // base64
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
