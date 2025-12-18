const socket = io();
const chatContainer = document.getElementById('dm-history');
const msgInput = document.getElementById('dm-input');
const sendBtn = document.getElementById('dm-send-btn');
const imageInput = document.getElementById('dm-image-input');

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

// --- REACTION LOGIC (Same as index.js) ---
window.sendReaction = function(arg1, arg2) {
    let messageId, emoji;

    if (arg1 && typeof arg1.getAttribute === 'function') {
        messageId = arg1.getAttribute('data-id');
        emoji = arg1.getAttribute('data-emoji');
    } else {
        messageId = arg1;
        emoji = arg2;
    }
    
    if (messageId && emoji && window.currentUser) {
        socket.emit('react_to_message', {
            message_id: messageId,
            emoji: emoji,
            username: window.currentUser
        });
    }
};

// Listen for updates (Works for both Global and DM rooms now)
socket.on('update_message_reactions', data => {
    const msgId = data.message_id;
    const reactions = data.reactions; 
    
    const reactionList = document.getElementById(`reactions-${msgId}`);
    if (reactionList) {
        let html = '';
        reactions.forEach(r => {
            const isMe = r.users.includes(window.currentUser);
            html += `<span class="reaction-tag ${isMe ? 'active' : ''}" 
                           onclick="sendReaction(this)"
                           data-id="${msgId}"
                           data-emoji="${r.emoji}">
                       ${r.emoji} ${r.count}
                     </span>`;
        });
        reactionList.innerHTML = html;
    }
});

// --- NEW APPEND MESSAGE FUNCTION ---
function appendMessage(data, isSentByMe) {
    if (!chatContainer) return;
    
    // 1. Creăm rândul (Row)
    const rowDiv = document.createElement('div');
    rowDiv.className = isSentByMe ? 'msg-row sent' : 'msg-row received';

    // HTML pentru butonul de reacție
    // Notă: `data.id` ar putea lipsi la mesajele trimise instant de mine înainte de reload, 
    // dar serverul ar trebui să trimită ID-ul înapoi în 'receive_private_message' dacă modificăm socket-ul.
    // Pentru simplitate, presupunem că ID-ul vine sau butonul nu funcționează până la refresh dacă nu e ID.
    const reactionPickerHTML = `
        <div class="reaction-picker-wrapper">
            <button class="add-reaction-btn">☺</button>
            <div class="reaction-menu">
                <span onclick="sendReaction(this)" data-id="${data.id || ''}" data-emoji="👍">👍</span>
                <span onclick="sendReaction(this)" data-id="${data.id || ''}" data-emoji="❤️">❤️</span>
                <span onclick="sendReaction(this)" data-id="${data.id || ''}" data-emoji="😂">😂</span>
                <span onclick="sendReaction(this)" data-id="${data.id || ''}" data-emoji="😮">😮</span>
                <span onclick="sendReaction(this)" data-id="${data.id || ''}" data-emoji="😢">😢</span>
                <span onclick="sendReaction(this)" data-id="${data.id || ''}" data-emoji="😡">😡</span>
            </div>
        </div>
    `;

    // 2. Dacă e mesajul MEU, punem picker-ul ÎNAINTE
    if (isSentByMe && data.id) {
        const temp = document.createElement('div');
        temp.innerHTML = reactionPickerHTML;
        rowDiv.appendChild(temp.firstElementChild);
    }

    // 3. Construim Bula
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = isSentByMe ? 'msg-bubble msg-sent' : 'msg-bubble msg-received';
    if(data.id) bubbleDiv.setAttribute('data-msg-id', data.id);

    // Imagine
    if (data.image) {
        const img = document.createElement('img');
        if (data.image.startsWith('data:')) {
             img.src = data.image; 
        } else {
             img.src = '/static/chat_uploads/' + data.image;
        }
        img.className = 'chat-image';
        bubbleDiv.appendChild(img);
    }

    // Text
    if (data.msg) {
        const textDiv = document.createElement('div');
        textDiv.className = 'msg-text';
        textDiv.innerText = data.msg;
        bubbleDiv.appendChild(textDiv);
    }

    // Container Reacții (gol inițial pentru mesaje noi)
    if (data.id) {
        const reactDiv = document.createElement('div');
        reactDiv.className = 'msg-reactions';
        const listDiv = document.createElement('div');
        listDiv.className = 'reaction-list';
        listDiv.id = `reactions-${data.id}`;
        reactDiv.appendChild(listDiv);
        bubbleDiv.appendChild(reactDiv);
    }

    // Oră
    if (data.timestamp) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'msg-time';
        timeDiv.innerText = data.timestamp;
        bubbleDiv.appendChild(timeDiv);
    }

    rowDiv.appendChild(bubbleDiv);

    // 4. Dacă e mesajul LOR, punem picker-ul DUPĂ
    if (!isSentByMe && data.id) {
        const temp = document.createElement('div');
        temp.innerHTML = reactionPickerHTML;
        rowDiv.appendChild(temp.firstElementChild);
    }
    
    chatContainer.appendChild(rowDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Listen for incoming private messages
socket.on('receive_private_message', data => {
    if (data.sender === window.activeRecipient || data.sender === window.currentUser) {
        const isMe = data.sender === window.currentUser;
        
        // Notă: Pentru ca reacțiile să meargă pe mesaje noi fără refresh,
        // trebuie să asigurăm că serverul trimite 'id'-ul mesajului în 'receive_private_message'.
        // Momentan 'app.py' nu trimite ID-ul la 'receive_private_message' (vezi codul original),
        // dar am lăsat logica aici pentru când vei adăuga 'id': new_msg.id în backend.
        
        appendMessage({
            id: data.id, // Trebuie adăugat în app.py la emit('receive_private_message')
            msg: data.msg,
            image: data.image,
            timestamp: data.timestamp
        }, isMe);
    }
});

function sendMessage() {
    if (!msgInput || !window.activeRecipient) return;
    const msg = msgInput.value.trim();
    if (!msg) return;

    socket.emit('send_private_message', {
        recipient: window.activeRecipient,
        msg: msg
    });
    
    msgInput.value = '';
    msgInput.style.height = '50px'; 
}

if (imageInput) {
    imageInput.addEventListener('change', function() {
        if (!window.activeRecipient) return;

        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                socket.emit('upload_private_image', {
                    recipient: window.activeRecipient,
                    username: window.currentUser,
                    image: evt.target.result, 
                    fileName: file.name
                });
            };
            reader.readAsDataURL(file);
            this.value = ''; 
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