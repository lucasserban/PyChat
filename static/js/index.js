const socket = io();
const chatContainer = document.getElementById('chat');
const msgInput = document.getElementById('message');
const sendBtn = document.getElementById('send');
const imageInput = document.getElementById('image-input');
const COOLDOWN_SECONDS = 10;

let cooldownUntil = 0;
let cooldownTimerId = null;

function isOnCooldown() {
    return Date.now() < cooldownUntil;
}

function updateCooldownUI() {
    const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
    const onCooldown = remaining > 0;

    if (sendBtn) {
        sendBtn.disabled = onCooldown;
        sendBtn.textContent = onCooldown ? `Wait ${remaining}s` : 'Send';
    }

    if (imageInput) {
        imageInput.disabled = onCooldown;
    }
}

function startCooldown(seconds) {
    cooldownUntil = Date.now() + (seconds * 1000);
    updateCooldownUI();

    if (cooldownTimerId) {
        clearInterval(cooldownTimerId);
    }

    cooldownTimerId = setInterval(() => {
        updateCooldownUI();
        if (!isOnCooldown()) {
            clearInterval(cooldownTimerId);
            cooldownTimerId = null;
        }
    }, 500);
}

function showSystemMessage(text) {
    if (!chatContainer || !text) return;
    const div = document.createElement('div');
    div.className = 'msg sys';
    div.innerText = text;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

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
    if (window.currentUsername) {
        socket.emit('join', { username: window.currentUsername });
    }
});

// --- UNIVERSAL REACTION FUNCTION ---
// Fixes the "can't click" bug by handling both HTML styles:
// 1. onclick="sendReaction(this)"
// 2. onclick="sendReaction(msg.id, 'emoji')"
window.sendReaction = function(arg1, arg2) {
    let messageId, emoji;

    // Case A: Passed as an HTML Element (using 'this')
    if (arg1 && typeof arg1.getAttribute === 'function') {
        messageId = arg1.getAttribute('data-id');
        emoji = arg1.getAttribute('data-emoji');
    } 
    // Case B: Passed as raw values (ID and Emoji string)
    else {
        messageId = arg1;
        emoji = arg2;
    }
    
    // Debug: Check your console if it's still not working
    console.log("Attempting reaction:", messageId, emoji, window.currentUsername);

    if (messageId && emoji && window.currentUsername) {
        socket.emit('react_to_message', {
            message_id: messageId,
            emoji: emoji,
            username: window.currentUsername
        });
    } else {
        console.error("Reaction failed: Missing data", {messageId, emoji, user: window.currentUsername});
    }
};

// --- LISTENER FOR UPDATES ---
socket.on('update_message_reactions', data => {
    const msgId = data.message_id;
    const reactions = data.reactions; 
    
    const reactionList = document.getElementById(`reactions-${msgId}`);
    if (reactionList) {
        let html = '';
        reactions.forEach(r => {
            const isMe = r.users.includes(window.currentUsername);
            // We use the robust 'this' method for dynamically added tags
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

function appendMessage(data) {
    if (!chatContainer) return;
    
    const isMe = data.username === window.currentUsername;
    
    // 1. Creăm containerul rând (Row)
    const rowDiv = document.createElement('div');
    rowDiv.className = `msg-row ${isMe ? 'sent' : 'received'}`;
    
    // 2. Construim butonul de reacție (HTML-ul pentru el)
    // Îl definim ca string HTML pentru simplitate
    const reactionPickerHTML = `
        <div class="reaction-picker-wrapper">
            <button class="add-reaction-btn">☺</button>
            <div class="reaction-menu">
                <span onclick="sendReaction(this)" data-id="${data.id}" data-emoji="👍">👍</span>
                <span onclick="sendReaction(this)" data-id="${data.id}" data-emoji="❤️">❤️</span>
                <span onclick="sendReaction(this)" data-id="${data.id}" data-emoji="😂">😂</span>
                <span onclick="sendReaction(this)" data-id="${data.id}" data-emoji="😮">😮</span>
                <span onclick="sendReaction(this)" data-id="${data.id}" data-emoji="😢">😢</span>
                <span onclick="sendReaction(this)" data-id="${data.id}" data-emoji="😡">😡</span>
            </div>
        </div>
    `;

    // 3. Dacă e mesajul MEU, punem menu + picker ÎNAINTE de bulă
    if (isMe && data.id) {
        const menu = createMenuElement(data.id);
        rowDiv.appendChild(menu);
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = reactionPickerHTML;
        rowDiv.appendChild(tempDiv.firstElementChild);
    }

    // 4. Construim Bula (Bubble)
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = isMe ? 'msg-bubble msg-sent' : 'msg-bubble msg-received';
    if (data.id) bubbleDiv.setAttribute('data-msg-id', data.id);
    
    if (!isMe) {
        const nameDiv = document.createElement('div');
        nameDiv.className = 'sender-name';
        const link = document.createElement('a');
        link.href = `/profile/${data.username}`;
        link.innerText = data.username;
        nameDiv.appendChild(link);
        bubbleDiv.appendChild(nameDiv);
    }

    if (data.image) {
        const img = document.createElement('img');
        img.src = '/static/chat_uploads/' + data.image;
        img.className = 'chat-image';
        bubbleDiv.appendChild(img);
    }

    if (data.msg) {
        const textDiv = document.createElement('div');
        textDiv.className = 'msg-text';
        textDiv.innerText = data.msg;
        bubbleDiv.appendChild(textDiv);
    }

    // Container pentru reacțiile deja existente (sub text)
    if (data.id) {
        const reactDiv = document.createElement('div');
        reactDiv.className = 'msg-reactions';
        
        const listDiv = document.createElement('div');
        listDiv.className = 'reaction-list';
        listDiv.id = `reactions-${data.id}`;
        
        // Dacă primești mesajul cu reacții deja (rar la append live, dar util)
        if (data.reactions && data.reactions.length > 0) {
            data.reactions.forEach(r => {
                const tag = document.createElement('span');
                tag.className = `reaction-tag ${r.user_has_reacted ? 'active' : ''}`;
                tag.setAttribute('onclick', 'sendReaction(this)');
                tag.setAttribute('data-id', data.id);
                tag.setAttribute('data-emoji', r.emoji);
                tag.innerText = `${r.emoji} ${r.count}`;
                listDiv.appendChild(tag);
            });
        }
        reactDiv.appendChild(listDiv);
        bubbleDiv.appendChild(reactDiv);
    }

    if (data.timestamp) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'msg-time';
        timeDiv.innerText = data.timestamp;
        bubbleDiv.appendChild(timeDiv);
    }

    // Adăugăm bula în rând
    rowDiv.appendChild(bubbleDiv);

    // 5. Dacă e mesajul ALTCUIVA, punem picker + menu DUPĂ bulă
    if (!isMe && data.id) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = reactionPickerHTML;
        rowDiv.appendChild(tempDiv.firstElementChild);
        
        const menu = createMenuElement(data.id);
        rowDiv.appendChild(menu);
    }
    
    // Adăugăm tot rândul în chat
    chatContainer.appendChild(rowDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

socket.on('receive_message', data => {
    appendMessage(data);
});

socket.on('system_message', data => {
    showSystemMessage(data.msg);
});

socket.on('rate_limited', data => {
    const seconds = Math.max(1, Math.ceil((data && data.remaining) ? data.remaining : COOLDOWN_SECONDS));
    startCooldown(seconds);
    showSystemMessage(`Please wait ${seconds}s before sending another global message.`);
});

socket.on('cooldown_started', data => {
    const seconds = Math.max(1, Math.ceil((data && data.seconds) ? data.seconds : COOLDOWN_SECONDS));
    startCooldown(seconds);
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
    if (!msgInput) return;
    const msg = msgInput.value.trim();
    if (!msg) return;

    if (isOnCooldown()) {
        const remaining = Math.max(1, Math.ceil((cooldownUntil - Date.now()) / 1000));
        showSystemMessage(`Please wait ${remaining}s before sending another global message.`);
        return;
    }

    socket.emit('send_message', {
        username: window.currentUsername,
        msg: msg
    });
    
    msgInput.value = '';
    msgInput.style.height = '50px'; 
}

if (imageInput) {
    imageInput.addEventListener('change', function() {
        if (isOnCooldown()) {
            const remaining = Math.max(1, Math.ceil((cooldownUntil - Date.now()) / 1000));
            showSystemMessage(`Please wait ${remaining}s before sending another global message.`);
            this.value = '';
            return;
        }

        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                socket.emit('upload_image', {
                    username: window.currentUsername,
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