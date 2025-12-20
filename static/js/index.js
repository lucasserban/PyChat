// initializes a socket and the DOM elements
const socket = io();
const chatContainer = document.getElementById('chat'); 
const msgInput = document.getElementById('message');   
const sendBtn = document.getElementById('send');       
const imageInput = document.getElementById('image-input');

// adds the cooldown configuration settings
const COOLDOWN_SECONDS = 10; 
let cooldownUntil = 0;       
let cooldownTimerId = null; 

// checks if the user is currently on cooldown
function isOnCooldown() {
    return Date.now() < cooldownUntil;
}

// updates the Send button and inputs to reflect the cooldown state
// disables inputs and shows a countdown timer on the button
function updateCooldownUI() {
    // calculates remaining seconds
    const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
    const onCooldown = remaining > 0;

    if (sendBtn) {
        sendBtn.disabled = onCooldown;
        sendBtn.textContent = onCooldown ? `Wait ${remaining}s` : 'Send';
    }

    // disables image uploads during cooldown
    if (imageInput) {
        imageInput.disabled = onCooldown;
    }
}

// activates the cooldown state for a specific duration
function startCooldown(seconds) {
    cooldownUntil = Date.now() + (seconds * 1000);
    updateCooldownUI();

    // clears existing timer if another one is running
    if (cooldownTimerId) {
        clearInterval(cooldownTimerId);
    }

    // starts an interval to update the button text every 0.5s
    cooldownTimerId = setInterval(() => {
        updateCooldownUI();
        // stops the timer once the cooldown has expired
        if (!isOnCooldown()) {
            clearInterval(cooldownTimerId);
            cooldownTimerId = null;
        }
    }, 500);
}

// displays a system-generated message in the chat.
function showSystemMessage(text) {
    if (!chatContainer || !text) return;

    const div = document.createElement('div');
    div.className = 'msg sys';
    div.innerText = text;

	chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Menu Management (Edit/Delete)

// closes all open message option menus.
function closeAllMenus(exceptMenu) {
    document.querySelectorAll('.msg-menu').forEach(menu => {
        if (menu !== exceptMenu) {
            menu.classList.remove('open');
        }
    });
}

// global event delegation for message menus
document.addEventListener('click', (e) => {
    // handles clicking the 3-dots toggle button
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

    // handles clicking the Edit button inside the menu
    const editBtn = e.target.closest('.msg-menu-edit');
    if (editBtn) {
        e.stopPropagation();
        const messageId = editBtn.getAttribute('data-msg-id');
        handleEditMessage(messageId);
        closeAllMenus(null);
		return;
    }

    // handles clicking the Delete button inside the menu
    const deleteBtn = e.target.closest('.msg-menu-delete');
    if (deleteBtn) {
        e.stopPropagation();

        const messageId = deleteBtn.getAttribute('data-msg-id');
        handleDeleteMessage(messageId);
        closeAllMenus(null);

        return;
    }

    // closes all menus
    closeAllMenus(null);
});

// creates the HTML structure for the options menu
function createMenuElement(messageId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-menu-wrapper';
    wrapper.setAttribute('data-msg-id', messageId);

    // the toggle button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'msg-menu-btn';
    btn.textContent = '⋮';

    // the hidden menu container
    const menu = document.createElement('div');
    menu.className = 'msg-menu';

    // the Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'msg-menu-edit';
    editBtn.textContent = 'Edit';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        handleEditMessage(messageId);
        closeAllMenus(null);
    };

    // the Delete button
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

    // attaches toggle logic directly to the button
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

// replaces the static message text with an editable textarea
function handleEditMessage(messageId) {
    // finds the specific message bubble
    const bubble = document.querySelector(`.msg-bubble[data-msg-id="${messageId}"]`);
    if (!bubble) return;
    
    // prevents opening multiple edit boxes on the same message
    if (bubble.querySelector('.edit-container')) return;

    // gets the current text and hides the display element
    const textDiv = bubble.querySelector('.msg-text');
    const currentText = textDiv ? textDiv.innerText : '';
    if (textDiv) textDiv.style.display = 'none';

    // creates the edit container
    const editContainer = document.createElement('div');
    editContainer.className = 'edit-container';
    editContainer.style.marginTop = '8px';

    // creates and styles the textarea
    const textarea = document.createElement('textarea');
    textarea.value = currentText;
    textarea.style.width = '100%';
    textarea.style.boxSizing = 'border-box';
    textarea.style.minHeight = '60px';
    textarea.style.borderRadius = '8px';
    textarea.style.padding = '8px';
    textarea.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    textarea.style.color = '#fff';
    textarea.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    textarea.style.outline = 'none';
    textarea.style.resize = 'vertical';
    textarea.style.fontFamily = 'inherit';

    // focuses the cursor at the end of the text
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 0);

    // creates action buttons (Cancel / Save)
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '8px';
    btnRow.style.marginTop = '8px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.background = 'transparent';
    cancelBtn.style.border = 'none';
    cancelBtn.style.color = '#aaa';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontSize = '0.9em';
    
    // restores original text on cancel
    cancelBtn.onclick = () => {
        editContainer.remove();
        if (textDiv) textDiv.style.display = 'block';
    };

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.background = '#3b82f6';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '6px';
    saveBtn.style.padding = '4px 12px';
    saveBtn.style.color = 'white';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.fontSize = '0.9em';
    
    // emits socket event on save
    saveBtn.onclick = () => {
        const val = textarea.value.trim();
        if (val) {
            socket.emit('edit_message', { message_id: messageId, content: val });
        }
    };
    
    // adds keyboard shortcuts (Enter=Save, Escape=Cancel)
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

    // inserts the edit container where the text previously was
    if (textDiv) {
        textDiv.parentNode.insertBefore(editContainer, textDiv.nextSibling);
    } else {
        bubble.appendChild(editContainer);
    }
}

// triggers the delete confirmation and emits the delete event
function handleDeleteMessage(messageId) {
    if (!confirm('Delete this message?')) return;
    socket.emit('delete_message', { message_id: messageId });
}

// updates the DOM when a message is successfully edited
function applyMessageUpdate(messageId, newContent) {
    const bubble = document.querySelector(`.msg-bubble[data-msg-id="${messageId}"]`);
    if (!bubble) return;
    
    // removes the textarea/buttons
    const editContainer = bubble.querySelector('.edit-container');
    if (editContainer) editContainer.remove();

    // updates the text content
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

// removes the message from the DOM when successfully deleted
function applyMessageDelete(messageId) {
    const bubble = document.querySelector(`.msg-bubble[data-msg-id="${messageId}"]`);
    if (!bubble) return;

    // removes the entire row
    const row = bubble.closest('.msg-row');
    if (row && row.parentNode) {
        row.parentNode.removeChild(row);
    }
}

// auto-scroll to the bottom when the page is loaded
if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Socket Event Listeners

socket.on('connect', () => {
    // rejoins the global chat channel on connection
    if (window.currentUsername) {
        socket.emit('join', { username: window.currentUsername });
    }
});

// Reaction Logic

// handles sending a reaction
window.sendReaction = function(arg1, arg2) {
    let messageId, emoji;

    // determines if called via DOM click or direct call
    if (arg1 && typeof arg1.getAttribute === 'function') {
        messageId = arg1.getAttribute('data-id');
        emoji = arg1.getAttribute('data-emoji');
    } else {
        messageId = arg1;
        emoji = arg2;
    }
    
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

// listens for the updated reaction counts from the server
socket.on('update_message_reactions', data => {
    const msgId = data.message_id;
    const reactions = data.reactions; 
    const reactionList = document.getElementById(`reactions-${msgId}`);

    // re-renders the reaction pills
    if (reactionList) {
        let html = '';
        reactions.forEach(r => {
            const isMe = r.users.includes(window.currentUsername);
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

// appends a new message to the chat view
function appendMessage(data) {
    if (!chatContainer) return;
    
    const isMe = data.username === window.currentUsername;    
	const rowDiv = document.createElement('div');
    rowDiv.className = `msg-row ${isMe ? 'sent' : 'received'}`;
    
    // the reaction picker
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

    // adds the Edit/Delete menu and the Reaction Picker
    if (isMe && data.id) {
        const menu = createMenuElement(data.id);
        rowDiv.appendChild(menu);
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = reactionPickerHTML;
        rowDiv.appendChild(tempDiv.firstElementChild);
    }

    // creates the message bubble
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = isMe ? 'msg-bubble msg-sent' : 'msg-bubble msg-received';
    if (data.id) bubbleDiv.setAttribute('data-msg-id', data.id);
    
    // adds sender name (only for received messages)
    if (!isMe) {
        const nameDiv = document.createElement('div');
        nameDiv.className = 'sender-name';

        const link = document.createElement('a');
        link.href = `/profile/${data.username}`;
        link.innerText = data.username;

        nameDiv.appendChild(link);
        bubbleDiv.appendChild(nameDiv);
    }

    // renders image content (if it exists)
    if (data.image) {
        const img = document.createElement('img');
        img.src = '/static/chat_uploads/' + data.image;
        img.className = 'chat-image';
        bubbleDiv.appendChild(img);
    }

    // renders text content (if it exists)
    if (data.msg) {
        const textDiv = document.createElement('div');
        textDiv.className = 'msg-text';
        textDiv.innerText = data.msg;
        bubbleDiv.appendChild(textDiv);
    }

    // renders existing reactions
    if (data.id) {
        const reactDiv = document.createElement('div');
        reactDiv.className = 'msg-reactions';
        
        const listDiv = document.createElement('div');
        listDiv.className = 'reaction-list';
        listDiv.id = `reactions-${data.id}`;
        
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

    // renders timestamp
    if (data.timestamp) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'msg-time';
        timeDiv.innerText = data.timestamp;
        bubbleDiv.appendChild(timeDiv);
    }

    rowDiv.appendChild(bubbleDiv);

    // adds the Reaction Picker on the right side
    if (!isMe && data.id) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = reactionPickerHTML;
        rowDiv.appendChild(tempDiv.firstElementChild);        
    }
    
    chatContainer.appendChild(rowDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Socket Event Handlers

// handles receiving a standard chat message
socket.on('receive_message', data => {
    appendMessage(data);
});

// handles system messages
socket.on('system_message', data => {
    showSystemMessage(data.msg);
});

// hadnles the rate limiting
socket.on('rate_limited', data => {
    const seconds = Math.max(1, Math.ceil((data && data.remaining) ? data.remaining : COOLDOWN_SECONDS));
    startCooldown(seconds);
    showSystemMessage(`Please wait ${seconds}s before sending another global message.`);
});

// handles cooldown initiated by server logic
socket.on('cooldown_started', data => {
    const seconds = Math.max(1, Math.ceil((data && data.seconds) ? data.seconds : COOLDOWN_SECONDS));
    startCooldown(seconds);
});

// updates UI when a message is edited elsewhere
socket.on('message_updated', data => {
    if (!data || !data.message_id) return;
    applyMessageUpdate(data.message_id, data.content || '');
});

// updates UI when a message is deleted elsewhere
socket.on('message_deleted', data => {
    if (!data || !data.message_id) return;
    applyMessageDelete(data.message_id);
});

// Message Sending Logic

function sendMessage() {
    if (!msgInput) return;
	
    const msg = msgInput.value.trim();
    if (!msg) return;

    // checks the client-side cooldown to prevent unnecessary network requests
    if (isOnCooldown()) {
        const remaining = Math.max(1, Math.ceil((cooldownUntil - Date.now()) / 1000));
        showSystemMessage(`Please wait ${remaining}s before sending another global message.`);
        return;
    }

    socket.emit('send_message', {
        username: window.currentUsername,
        msg: msg
    });
    
    // clears the input
    msgInput.value = '';
    msgInput.style.height = '50px'; 
}

// Image Upload Logic

if (imageInput) {
    imageInput.addEventListener('change', function() {
        // enforces cooldown for images
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

// binds Send Button and Enter Key
if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
    msgInput.addEventListener('keydown', e => { 
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            sendMessage(); 
        }
    });
}
