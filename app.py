import os
from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = 'BestProjectOfAllTime'
# SQLite database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize ORM and SocketIO
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins='*')

# --- ORM Models (Database Layer) ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False) 
    email = db.Column(db.String(120), nullable=True)
    bio = db.Column(db.String(200), nullable=True) 

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_username = db.Column(db.String(80), db.ForeignKey('user.username'), nullable=False)
    recipient_username = db.Column(db.String(80), nullable=True) # Null = Public message
    content = db.Column(db.String(500), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# Create tables if they don't exist
with app.app_context():
    db.create_all()

# --- Helper Functions ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- HTTP Routes ---

@app.route('/')
@login_required
def index():
    # 1. Get the NEWEST 50 messages (Desc)
    messages = Message.query.filter_by(recipient_username=None)\
        .order_by(Message.timestamp.desc())\
        .limit(50)\
        .all()
    
    # 2. Reverse them so they display chronologically (Oldest at top, Newest at bottom)
    messages = messages[::-1]
    
    history = [{'username': m.sender_username, 'msg': m.content} for m in messages]
    return render_template('index.html', username=session.get('username'), history=history)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.password == password:
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
            new_user = User(username=username, password=password, email=email)
            db.session.add(new_user)
            db.session.commit()
            flash('Registration successful. Please log in.')
            return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/myAccount', methods=['GET', 'POST'])
@login_required
def account():
    username = session.get('username')
    user = User.query.filter_by(username=username).first()

    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        bio = request.form.get('bio', '').strip()
        
        user.email = email
        user.bio = bio
        db.session.commit()
        flash('Profile updated successfully!')

    return render_template('myAccount.html', user=user)

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

# --- SocketIO Events ---

@socketio.on('connect')
def on_connect():
    print('Client connected:', request.sid)

@socketio.on('join')
def handle_join(data):
    username = data.get('username', 'Anonymous')
    join_room('global_chat') 
    emit('system_message', {'msg': f'{username} joined the chat.'}, room='global_chat')

@socketio.on('send_message')
def handle_message(data):
    username = data.get('username', 'Anonymous')
    msg_content = data.get('msg', '')
    
    if msg_content:
        # Save to Database
        new_msg = Message(sender_username=username, content=msg_content)
        db.session.add(new_msg)
        db.session.commit()
        
        # Emit to global chat
        emit('receive_message', {'username': username, 'msg': msg_content}, room='global_chat')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)