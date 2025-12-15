import json
import os
from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_socketio import SocketIO, join_room, leave_room, emit
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = 'BestProjectOfAllTime'
socketio = SocketIO(app, cors_allowed_origins='*')

USERS_FILE = 'users.json'

def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            data = json.load(f)
            # Normalize older format where value was password string -> convert to dict
            for uname, val in list(data.items()):
                if isinstance(val, str):
                    data[uname] = {'password': val, 'email': ''}
            return data
    return {}

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

users = load_users()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
@login_required
def index():
    return render_template('index.html', username=session.get('username'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        if username in users:
            user = users[username]
            if user.get('password') == password:
                session['username'] = username
                return redirect(url_for('index'))
        flash('Invalid username or password')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        email = request.form.get('email', '').strip()
        if not email:
            flash('Email is required')
        elif username in users:
            flash('Username already exists')
        else:
            users[username] = {'password': password, 'email': email}
            save_users(users)
            flash('Registration successful. Please log in.')
            return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/myAccount')
@login_required
def account():
    return render_template('myAccount.html', username=session.get('username'))

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

# SocketIO events (no change needed)
@socketio.on('connect')
def on_connect():
    print('Client connected:', request.sid)

@socketio.on('disconnect')
def on_disconnect():
    print('Client disconnected:', request.sid)

@socketio.on('join')
def handle_join(data):
    username = data.get('username', 'Anonymous')
    emit('system_message', {'msg': f'{username} joined the chat.'}, broadcast=True)

@socketio.on('leave')
def handle_leave(data):
    username = data.get('username', 'Anonymous')
    emit('system_message', {'msg': f'{username} left the chat.'}, broadcast=True)

@socketio.on('send_message')
def handle_message(data):
    username = data.get('username', 'Anonymous')
    msg = data.get('msg', '')
    emit('receive_message', {'username': username, 'msg': msg}, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)