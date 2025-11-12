    const socket = io();
    const chat = document.getElementById('chat');
    const sendBtn = document.getElementById('send');
    const msgInput = document.getElementById('message');
    const usernameInput = document.getElementById('username');


    function appendMessage(html, cls='msg'){
        const d = document.createElement('div');
        d.className = cls;
        d.innerHTML = html;
        chat.appendChild(d);
        chat.scrollTop = chat.scrollHeight;
    }


    socket.on('connect', () => {
        appendMessage('Connected to server.', 'sys');
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
        const username = usernameInput.value.trim() || 'Anonymous';
        const msg = msgInput.value.trim();
        if(!msg) return;
        socket.emit('send_message', { username, msg });
        msgInput.value = '';
    }


    // Announce join when username field loses focus (optional)
    usernameInput.addEventListener('change', () => {
        const username = usernameInput.value.trim() || 'Anonymous';
        socket.emit('join', { username });
    });


    // Simple escape
    function escapeHtml(s) { 
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }