// initializes a socket and the DOM elements
const socket = io();
const chatContainer = document.getElementById('dm-history');
const msgInput = document.getElementById('dm-input');
const sendBtn = document.getElementById('dm-send-btn');
const imageInput = document.getElementById('dm-image-input');

// closes all open message menus except the one passed as argument
function closeAllMenus(exceptMenu) {
    document.querySelectorAll('.msg-menu').forEach(menu => {
        if (menu !== exceptMenu) {
            menu.classList.remove('open');
        }
    });
}

// global click listener to handle menu toggles and closing menus when clicking outside
document.addEventListener('click', (e) => {
    // handles opening the menu (3 dots button)
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

    // handles the Edit button click
    const editBtn = e.target.closest('.msg-menu-edit');
    if (editBtn) {
        e.stopPropagation();

        const messageId = editBtn.getAttribute('data-msg-id');
        handleEditMessage(messageId);
        closeAllMenus(null);

        return;
    }

    // handles the Delete button click
    const deleteBtn = e.target.closest('.msg-menu-delete');
    if (deleteBtn) {
        e.stopPropagation();

        const messageId = deleteBtn.getAttribute('data-msg-id');
        handleDeleteMessage(messageId);
        closeAllMenus(null);

        return;
    }

    // closes all menus if clicked elsewhere
    closeAllMenus(null);
});

// creates the DOM structure for the message options menu
function createMenuElement(messageId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-menu-wrapper';
    wrapper.setAttribute('data-msg-id', messageId);

    // the 'three dots' button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'msg-menu-btn';
    btn.textContent = '⋮';

    const menu = document.createElement('div');
    menu.className = 'msg-menu';

    // Edit Button
    const editBtn = document.createElement('button');
    editBtn.className = 'msg-menu-edit';
    editBtn.textContent = 'Edit';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        handleEditMessage(messageId);
        closeAllMenus(null);
    };

    // Delete Button
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

    // toggles logic for the button
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

// replaces the message text with a textarea for editing
function handleEditMessage(messageId) {
    const bubble = document.querySelector(`.msg-bubble[data-msg-id="${messageId}"]`);
    if (!bubble) return;

	// prevents multiple edit boxes
    if (bubble.querySelector('.edit-container')) return; 

    const textDiv = bubble.querySelector('.msg-text');
    const currentText = textDiv ? textDiv.innerText : '';

    // hides original text while editing
    if (textDiv) textDiv.style.display = 'none';

    // creates container and textarea
    const editContainer = document.createElement('div');
    editContainer.className = 'edit-container';
    editContainer.style.marginTop = '8px';

    const textarea = document.createElement('textarea');
    textarea.value = currentText;
    textarea.style.width = '100%';
    textarea.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    textarea.style.color = '#fff';
    textarea.style.border = '1px solid rgba(255, 255, 255, 0.2)';

    // auto-focus logic
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 0);

    // creates Save/Cancel buttons
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '8px';
    btnRow.style.marginTop = '8px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
        editContainer.remove();
        if (textDiv) textDiv.style.display = 'block';
    };

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.onclick = () => {
        const val = textarea.value.trim();
        if (val) {
            // emits the edit event to the server
            socket.emit('edit_message', { message_id: messageId, content: val });
        }
    };
    
    // adds keyboard shortcuts: Enter to save, Escape to cancel
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveBtn.click();
        }
        if (e.key === 'Escape') {
            cancelBtn.click();
        }
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);

    editContainer.appendChild(textarea);
    editContainer.appendChild(btnRow);

    // inserts edit container into DOM
    if (textDiv) {
        textDiv.parentNode.insertBefore(editContainer, textDiv.nextSibling);
    } else {
        bubble.appendChild(editContainer);
    }
}

// emits a delete request to the server after confirmation
function handleDeleteMessage(messageId) {
    if (!confirm('Delete this message?')) return;
    socket.emit('delete_message', { message_id: messageId });
}

// updates the DOM with the new message content after a successful edit
function applyMessageUpdate(messageId, newContent) {
    const bubble = document.querySelector(`.msg-bubble[data-msg-id="${messageId}"]`);
    if (!bubble) return;
    
    const editContainer = bubble.querySelector('.edit-container');
    if (editContainer) editContainer.remove();

    let textDiv = bubble.querySelector('.msg-text');
    if (!textDiv) {
        textDiv = document.createElement('div');
        textDiv.className = 'msg-text';
        const reactions = bubble.querySelector('.msg-reactions');
        bubble.insertBefore(textDiv, reactions || bubble.firstChild);
    }
    
	textDiv.style.display = 'block';
    textDiv.innerText = newContent;
}

// removes the message row from the DOM after a successful delete
function applyMessageDelete(messageId) {
    const bubble = document.querySelector(`.msg-bubble[data-msg-id="${messageId}"]`);
    if (!bubble) return;

    const row = bubble.closest('.msg-row');
    if (row && row.parentNode) {
        row.parentNode.removeChild(row);
    }
}

// auto-scroll to bottom on load
if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Socket Event Listeners

socket.on('connect', () => {
    // joins the specific DM room based on recipient and username
    if (window.activeRecipient) {
        socket.emit('join_dm', { 
            recipient: window.activeRecipient,
            username: window.currentUser 
        });
    }
});

// Reactions Logic

window.sendReaction = function(arg1, arg2) {
    let messageId, emoji;

    // handles being called from an event listener or directly
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

// updates reaction counts/state when notified by the server
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

// appends a new message to the chat container
function appendMessage(data, isSentByMe) {
    if (!chatContainer) return;
    
    const rowDiv = document.createElement('div');
    rowDiv.className = isSentByMe ? 'msg-row sent' : 'msg-row received';

    // the reaction picker UI
    const reactionPickerHTML = `
        <div class="reaction-picker-wrapper">
            <button class="add-reaction-btn">☺</button>
            <div class="reaction-menu">
                <span onclick="sendReaction(this)" data-id="${data.id || ''}" data-emoji="👍">👍</span>
                <span onclick="sendReaction(this)" data-id="${data.id || ''}" data-emoji="😡">😡</span>
            </div>
        </div>
    `;

    // adds options menu to sent messages
    if (isSentByMe && data.id) {
        const menu = createMenuElement(data.id);
        rowDiv.appendChild(menu);
        
        // adds reaction picker to sent messages
        const temp = document.createElement('div');
        temp.innerHTML = reactionPickerHTML;
        rowDiv.appendChild(temp.firstElementChild);
    }

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = isSentByMe ? 'msg-bubble msg-sent' : 'msg-bubble msg-received';
    if(data.id) bubbleDiv.setAttribute('data-msg-id', data.id);

    // handles image content
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

    // handles text content
    if (data.msg) {
        const textDiv = document.createElement('div');
        textDiv.className = 'msg-text';
        textDiv.innerText = data.msg;
        bubbleDiv.appendChild(textDiv);
    }

    // prepares reactions container
    if (data.id) {
        const reactDiv = document.createElement('div');
        reactDiv.className = 'msg-reactions';

        const listDiv = document.createElement('div');
        listDiv.className = 'reaction-list';
        listDiv.id = `reactions-${data.id}`;

        reactDiv.appendChild(listDiv);
        bubbleDiv.appendChild(reactDiv);
    }

    // adds timestamp
    if (data.timestamp) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'msg-time';
        timeDiv.innerText = data.timestamp;
        bubbleDiv.appendChild(timeDiv);
    }

    rowDiv.appendChild(bubbleDiv);

    // adds reaction picker to received messages
    if (!isSentByMe && data.id) {
        const temp = document.createElement('div');
        temp.innerHTML = reactionPickerHTML;
        rowDiv.appendChild(temp.firstElementChild);        
    }
    
    chatContainer.appendChild(rowDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Core Socket Listeners

socket.on('receive_private_message', data => {
    // only displays message if it belongs to the active conversation
    if (data.sender === window.activeRecipient || data.sender === window.currentUser) {
        const isMe = data.sender === window.currentUser;
        
        appendMessage({
            id: data.id, 
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

// Message Sending Logic

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

// Image Upload Logic

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

// binds Send button and Enter key
if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
    msgInput.addEventListener('keydown', e => { 
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            sendMessage(); 
        }
    });
}
