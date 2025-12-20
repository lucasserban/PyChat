const socket = io();
const chatContainer = document.getElementById('dm-history');
const msgInput = document.getElementById('dm-input');
const sendBtn = document.getElementById('dm-send-btn');
const imageInput = document.getElementById('dm-image-input');

function closeAllMenus(exceptMenu) {
    document.querySelectorAll('.msg-menu').forEach(menu => {
        if (menu !== exceptMenu) {
            menu.classList.remove('open');
        }
    });
}

document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.msg-menu-btn');
    if (toggleBtn) {
        e.stopPropagation();
        const menu = toggleBtn.parentElement.querySelector('.msg-menu');
        const isOpen = menu.classList.contains('open');
        closeAllMenus(menu);
        if (!isOpen) {
            menu.classList.add('open');
        }
        return;
    }

    const editBtn = e.target.closest('.msg-menu-edit');
    if (editBtn) {
        e.stopPropagation();
        const messageId = editBtn.getAttribute('data-msg-id');
        handleEditMessage(messageId);
        closeAllMenus(null);
        return;
    }

    const deleteBtn = e.target.closest('.msg-menu-delete');
    if (deleteBtn) {
        e.stopPropagation();
        const messageId = deleteBtn.getAttribute('data-msg-id');
        handleDeleteMessage(messageId);
        closeAllMenus(null);
        return;
    }

    closeAllMenus(null);
});

function createMenuElement(messageId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-menu-wrapper';
    wrapper.setAttribute('data-msg-id', messageId);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'msg-menu-btn';
    btn.textContent = '⋮';

    const menu = document.createElement('div');
    menu.className = 'msg-menu';

    const editBtn = document.createElement('button');
    editBtn.className = 'msg-menu-edit';
    editBtn.textContent = 'Edit';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        handleEditMessage(messageId);
        closeAllMenus(null);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'msg-menu-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        handleDeleteMessage(messageId);
        closeAllMenus(null);
    };

    menu.appendChild(editBtn);
    menu.appendChild(deleteBtn);

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.contains('open');
        closeAllMenus(menu);
        if (!isOpen) {
            menu.classList.add('open');
        }
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(menu);
    return wrapper;
}

function handleEditMessage(messageId) {
    const bubble = document.querySelector(`.msg-bubble[data-msg-id="${messageId}"]`);
    const textDiv = bubble ? bubble.querySelector('.msg-text') : null;
    const currentText = textDiv ? textDiv.innerText : '';
    const newText = prompt('Edit your message:', currentText);
    if (newText === null) return;
    const trimmed = newText.trim();
    if (!trimmed) return;
    socket.emit('edit_message', { message_id: messageId, content: trimmed });
}

function handleDeleteMessage(messageId) {
    if (!confirm('Delete this message?')) return;
    socket.emit('delete_message', { message_id: messageId });
}

function applyMessageUpdate(messageId, newContent) {
    const bubble = document.querySelector(`.msg-bubble[data-msg-id="${messageId}"]`);
    if (!bubble) return;
    let textDiv = bubble.querySelector('.msg-text');
    if (!textDiv) {
        textDiv = document.createElement('div');
        textDiv.className = 'msg-text';
        const reactions = bubble.querySelector('.msg-reactions');
        bubble.insertBefore(textDiv, reactions || bubble.firstChild);
    }
    textDiv.innerText = newContent;
}

function applyMessageDelete(messageId) {
    const bubble = document.querySelector(`.msg-bubble[data-msg-id="${messageId}"]`);
    if (!bubble) return;
    const row = bubble.closest('.msg-row');
    if (row && row.parentNode) {
        row.parentNode.removeChild(row);
    }
}

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

    // 2. Dacă e mesajul MEU, punem menu + picker ÎNAINTE
    if (isSentByMe && data.id) {
        const menu = createMenuElement(data.id);
        rowDiv.appendChild(menu);
        
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

    // 4. Dacă e mesajul LOR, punem picker + menu DUPĂ
    if (!isSentByMe && data.id) {
        const temp = document.createElement('div');
        temp.innerHTML = reactionPickerHTML;
        rowDiv.appendChild(temp.firstElementChild);
        
        const menu = createMenuElement(data.id);
        rowDiv.appendChild(menu);
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

socket.on('message_updated', data => {
    if (!data || !data.message_id) return;
    applyMessageUpdate(data.message_id, data.content || '');
});

socket.on('message_deleted', data => {
    if (!data || !data.message_id) return;
    applyMessageDelete(data.message_id);
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