import os
from flask import Flask, render_template, request, redirect, url_for, session, flash, abort
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_
from datetime import datetime
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = 'BestProjectOfAllTime'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins='*')

# --- Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False) 
    email = db.Column(db.String(120), nullable=True)
    bio = db.Column(db.String(200), nullable=True) 

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_username = db.Column(db.String(80), db.ForeignKey('user.username'), nullable=False)
    recipient_username = db.Column(db.String(80), nullable=True)
    content = db.Column(db.String(500), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()

# --- Helpers ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- Routes ---

@app.route('/')
@login_required
def index():
    # Global Chat History
    messages = Message.query.filter_by(recipient_username=None)\
        .order_by(Message.timestamp.desc())\
        .limit(50).all()
    messages = messages[::-1]
    
    history = [{'username': m.sender_username, 'msg': m.content} for m in messages]
    return render_template('index.html', username=session.get('username'), history=history)

@app.route('/dms')
@app.route('/dms/<username>')
@login_required
def dms(username=None):
    current_user = session.get('username')
    users = User.query.all()
    history = []
    
    if username:
        messages = Message.query.filter(
            or_(
                (Message.sender_username == current_user) & (Message.recipient_username == username),
                (Message.sender_username == username) & (Message.recipient_username == current_user)
            )
        ).order_by(Message.timestamp.asc()).all()
        history = messages

    return render_template('dms.html', users_list=users, active_recipient=username, history=history)

# --- NEW: Profile Route ---
@app.route('/profile/<username>')
@login_required
def profile(username):
    user = User.query.filter_by(username=username).first_or_404()
    return render_template('profile.html', user=user)

@app.route('/myAccount', methods=['GET', 'POST'])
@login_required
def account():
    username = session.get('username')
    user = User.query.filter_by(username=username).first()

    if request.method == 'POST':
        user.email = request.form.get('email', '').strip()
        user.bio = request.form.get('bio', '').strip()
        db.session.commit()
        flash('Profile updated successfully!')

    return render_template('myAccount.html', user=user)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password, password):
            session['username'] = user.username
            return redirect(url_for('index'))
        flash('Invalid username or password')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        email = request.form.get('email', '').strip()

        if User.query.filter_by(username=username).first():
            flash('Username already exists')
        else:
            pw_hash = generate_password_hash(password)
            new_user = User(username=username, password=pw_hash, email=email)
            db.session.add(new_user)
            db.session.commit()
            flash('Registration successful. Please log in.')
            return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

# --- SocketIO ---
@socketio.on('join')
def handle_join(data):
    username = data.get('username', 'Anonymous')
    join_room('global_chat') 
    emit('system_message', {'msg': f'{username} joined the chat.'}, room='global_chat')

@socketio.on('send_message')
def handle_message(data):
    username = data.get('username', 'Anonymous')
    msg = data.get('msg', '')
    if msg:
        new_msg = Message(sender_username=username, content=msg)
        db.session.add(new_msg)
        db.session.commit()
        emit('receive_message', {'username': username, 'msg': msg}, room='global_chat')

@socketio.on('join_dm')
def handle_join_dm(data):
    username = data.get('username')
    recipient = data.get('recipient')
    room = f"dm_{'-'.join(sorted([username, recipient]))}"
    join_room(room)

@socketio.on('send_private_message')
def handle_private_message(data):
    sender = session.get('username')
    recipient = data.get('recipient')
    msg = data.get('msg')
    if msg and recipient:
        new_msg = Message(sender_username=sender, recipient_username=recipient, content=msg)
        db.session.add(new_msg)
        db.session.commit()
        room = f"dm_{'-'.join(sorted([sender, recipient]))}"
        emit('receive_private_message', {'sender': sender, 'msg': msg}, room=room)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)