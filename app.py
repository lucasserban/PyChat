import os
import base64
from flask import Flask, render_template, request, redirect, url_for, session, flash, abort
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_
from datetime import datetime
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import timezone, timedelta

app = Flask(__name__)
app.config['SECRET_KEY'] = 'BestProjectOfAllTime'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# --- Upload Configuration ---
UPLOAD_FOLDER = os.path.join('static', 'profile_pics')
CHAT_UPLOAD_FOLDER = os.path.join('static', 'chat_uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['CHAT_UPLOAD_FOLDER'] = CHAT_UPLOAD_FOLDER

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['CHAT_UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins='*')

# --- Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False) 
    email = db.Column(db.String(120), nullable=False) 
    bio = db.Column(db.String(200), nullable=True) 
    profile_pic = db.Column(db.String(150), nullable=True) 

class Friendship(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')
    
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_requests')
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref='received_requests')

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_username = db.Column(db.String(80), db.ForeignKey('user.username'), nullable=False)
    recipient_username = db.Column(db.String(80), nullable=True)
    content = db.Column(db.String(500), nullable=True)
    image_filename = db.Column(db.String(200), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class MessageReaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)
    user_username = db.Column(db.String(80), db.ForeignKey('user.username'), nullable=False)
    emoji = db.Column(db.String(10), nullable=False)

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
    
    history = []
    current_user = session.get('username')

    for m in messages:
        reactions = MessageReaction.query.filter_by(message_id=m.id).all()
        
        reactions_map = {}
        for r in reactions:
            if r.emoji not in reactions_map:
                reactions_map[r.emoji] = {'count': 0, 'users': []}
            reactions_map[r.emoji]['count'] += 1
            reactions_map[r.emoji]['users'].append(r.user_username)
        
        reactions_list = []
        for emoji, data in reactions_map.items():
            reactions_list.append({
                'emoji': emoji,
                'count': data['count'],
                'user_has_reacted': current_user in data['users']
            })

        history.append({
            'id': m.id, 
            'username': m.sender_username, 
            'msg': m.content if m.content else "", 
            'image': m.image_filename,
            'timestamp': m.timestamp.strftime('%H:%M'),
            'reactions': reactions_list
        })
    
    return render_template('index.html', username=current_user, history=history)

@app.route('/dms', methods=['GET', 'POST'])
@app.route('/dms/<username>', methods=['GET', 'POST'])
@login_required
def dms(username=None):
    current_username = session.get('username')
    current_user_obj = User.query.filter_by(username=current_username).first()
    
    search_results = []
    if request.method == 'POST':
        search_query = request.form.get('search_username', '').strip()
        if search_query:
            results = User.query.filter(User.username.ilike(f"%{search_query}%"), User.username != current_username).all()
            search_results = results

    friends_sent = Friendship.query.filter_by(sender_id=current_user_obj.id, status='accepted').all()
    friends_received = Friendship.query.filter_by(receiver_id=current_user_obj.id, status='accepted').all()
    
    friends = []
    for f in friends_sent:
        friends.append(f.receiver)
    for f in friends_received:
        friends.append(f.sender)

    history = []
    if username:
        messages = Message.query.filter(
            or_(
                (Message.sender_username == current_username) & (Message.recipient_username == username),
                (Message.sender_username == username) & (Message.recipient_username == current_username)
            )
        ).order_by(Message.timestamp.asc()).all()
        
        for m in messages:
            # --- LOGICĂ ADĂUGATĂ PENTRU REACȚII ---
            reactions = MessageReaction.query.filter_by(message_id=m.id).all()
            reactions_map = {}
            for r in reactions:
                if r.emoji not in reactions_map:
                    reactions_map[r.emoji] = {'count': 0, 'users': []}
                reactions_map[r.emoji]['count'] += 1
                reactions_map[r.emoji]['users'].append(r.user_username)
            
            reactions_list = []
            for emoji, data in reactions_map.items():
                reactions_list.append({
                    'emoji': emoji,
                    'count': data['count'],
                    'user_has_reacted': current_username in data['users']
                })
            # ---------------------------------------

            romania_tz = timezone(timedelta(hours=2))
            current_time = datetime.now(romania_tz).strftime('%H:%M')
            history.append({
                'id': m.id,  # IMPORTANT: Avem nevoie de ID
                'sender_username': m.sender_username,
                'content': m.content,
                'image_filename': m.image_filename,
                'timestamp': current_time,
                'reactions': reactions_list # Trimitem reacțiile
            })

    return render_template('dms.html', 
                         users_list=friends,
                         search_results=search_results,
                         active_recipient=username, 
                         history=history)

@app.route('/send_request/<username>')
@login_required
def send_request(username):
    sender = User.query.filter_by(username=session['username']).first()
    receiver = User.query.filter_by(username=username).first()
    
    if not receiver:
        flash('User not found.')
        return redirect(url_for('dms'))
    
    existing = Friendship.query.filter(
        or_(
            (Friendship.sender_id == sender.id) & (Friendship.receiver_id == receiver.id),
            (Friendship.sender_id == receiver.id) & (Friendship.receiver_id == sender.id)
        )
    ).first()
    
    if existing:
        flash('Friendship or request already exists.')
    else:
        req = Friendship(sender_id=sender.id, receiver_id=receiver.id, status='pending')
        db.session.add(req)
        db.session.commit()
        flash(f'Friend request sent to {username}!')
        
    if request.referrer and 'profile' in request.referrer:
        return redirect(request.referrer)
        
    return redirect(url_for('dms'))

@app.route('/accept_request/<int:request_id>')
@login_required
def accept_request(request_id):
    req = Friendship.query.get_or_404(request_id)
    current_user = User.query.filter_by(username=session['username']).first()
    
    if req.receiver_id != current_user.id:
        abort(403)
        
    req.status = 'accepted'
    db.session.commit()
    flash(f'You are now friends with {req.sender.username}!')
    return redirect(url_for('account'))

@app.route('/reject_request/<int:request_id>')
@login_required
def reject_request(request_id):
    req = Friendship.query.get_or_404(request_id)
    current_user = User.query.filter_by(username=session['username']).first()
    
    if req.receiver_id != current_user.id:
        abort(403)
        
    db.session.delete(req)
    db.session.commit()
    flash('Friend request removed.')
    return redirect(url_for('account'))

@app.route('/profile/<username>')
@login_required
def profile(username):
    user = User.query.filter_by(username=username).first_or_404()
    
    current_username = session.get('username')
    current_user = User.query.filter_by(username=current_username).first()
    
    # Determine Friendship Status
    friendship_status = 'none' # Default: no relationship
    
    if current_username == username:
        friendship_status = 'self'
    else:
        # Check database for any existing friendship record
        friendship = Friendship.query.filter(
            or_(
                (Friendship.sender_id == current_user.id) & (Friendship.receiver_id == user.id),
                (Friendship.sender_id == user.id) & (Friendship.receiver_id == current_user.id)
            )
        ).first()

        if friendship:
            if friendship.status == 'accepted':
                friendship_status = 'friends'
            elif friendship.status == 'pending':
                if friendship.sender_id == current_user.id:
                    friendship_status = 'pending_sent'     # You sent the request
                else:
                    friendship_status = 'pending_received' # They sent you a request

    return render_template('profile.html', user=user, friendship_status=friendship_status)

@app.route('/account', methods=['GET', 'POST'])
@login_required
def account():
    username = session.get('username')
    user = User.query.filter_by(username=username).first()

    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        bio = request.form.get('bio', '').strip()
        
        if not email:
            flash('Email is required.')
        else:
            user.email = email
            user.bio = bio
            if 'profile_pic' in request.files:
                file = request.files['profile_pic']
                if file and file.filename != '' and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    unique_filename = f"{user.id}_{filename}"
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(file_path)
                    user.profile_pic = unique_filename
            db.session.commit()
            flash('Profile updated successfully!')
            return redirect(url_for('account'))

    pending_requests = Friendship.query.filter_by(receiver_id=user.id, status='pending').all()

    return render_template('account.html', user=user, pending_requests=pending_requests)

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
        bio = request.form.get('bio', '').strip()

        if not username or not password or not email:
            flash('All fields (Username, Password, Email) are mandatory.')
        elif User.query.filter_by(username=username).first():
            flash('Username already exists')
        else:
            profile_pic_filename = None
            if 'profile_pic' in request.files:
                file = request.files['profile_pic']
                if file and file.filename != '':
                    if allowed_file(file.filename):
                        filename = secure_filename(file.filename)
                        unique_filename = f"{username}_{int(datetime.utcnow().timestamp())}_{filename}"
                        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                        try:
                            file.save(file_path)
                            profile_pic_filename = unique_filename
                        except Exception as e:
                            print(f"Error saving profile pic: {e}")
                    else:
                        flash('Invalid file type. Allowed: png, jpg, jpeg, gif')
            
            pw_hash = generate_password_hash(password)
            new_user = User(
                username=username, 
                password=pw_hash, 
                email=email,
                bio=bio,
                profile_pic=profile_pic_filename
            )
            
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
    
@socketio.on('send_message')
def handle_message(data):
    username = data.get('username', 'Anonymous')
    msg = data.get('msg', '')
    if msg:
        new_msg = Message(sender_username=username, content=msg)
        db.session.add(new_msg)
        db.session.commit()
        
        romania_tz = timezone(timedelta(hours=2))
        current_time = datetime.now(romania_tz).strftime('%H:%M')
        
        emit('receive_message', {
            'id': new_msg.id, # IMPORTANT for reactions
            'username': username, 
            'msg': msg,
            'timestamp': current_time 
        }, room='global_chat')

@socketio.on('upload_image')
def handle_image(data):
    username = data.get('username', 'Anonymous')
    file_data = data.get('image')
    file_name = data.get('fileName')
    
    if file_data and file_name:
        try:
            if "," in file_data:
                _, encoded = file_data.split(",", 1)
            else:
                encoded = file_data
                
            data_bytes = base64.b64decode(encoded)
            safe_name = secure_filename(file_name)
            unique_name = f"{int(datetime.now(timezone.utc).timestamp())}_{safe_name}"
            file_path = os.path.join(app.config['CHAT_UPLOAD_FOLDER'], unique_name)
            
            with open(file_path, "wb") as f:
                f.write(data_bytes)
                
            new_msg = Message(
                sender_username=username, 
                content="", 
                image_filename=unique_name
            )
            db.session.add(new_msg)
            db.session.commit()
            
            romania_tz = timezone(timedelta(hours=2))
            current_time = datetime.now(romania_tz).strftime('%H:%M')

            emit('receive_message', {
                'id': new_msg.id,
                'username': username, 
                'msg': "", 
                'image': unique_name,
                'timestamp': current_time
            }, room='global_chat')
            
        except Exception as e:
            print(f"Error saving image: {e}")

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
        
        romania_tz = timezone(timedelta(hours=2))
        current_time = datetime.now(romania_tz).strftime('%H:%M')

        room = f"dm_{'-'.join(sorted([sender, recipient]))}"
        emit('receive_private_message', {
            'sender': sender, 
            'msg': msg,
            'timestamp': current_time
        }, room=room)

@socketio.on('upload_private_image')
def handle_private_image(data):
    sender = session.get('username') 
    recipient = data.get('recipient')
    file_data = data.get('image')
    file_name = data.get('fileName')

    if file_data and file_name and sender and recipient:
        try:
            if "," in file_data:
                header, encoded = file_data.split(",", 1)
            else:
                encoded = file_data
                
            data_bytes = base64.b64decode(encoded)
            safe_name = secure_filename(file_name)
            unique_name = f"{int(datetime.utcnow().timestamp())}_{safe_name}"
            file_path = os.path.join(app.config['CHAT_UPLOAD_FOLDER'], unique_name)
            
            with open(file_path, "wb") as f:
                f.write(data_bytes)
                
            new_msg = Message(
                sender_username=sender, 
                recipient_username=recipient,
                content="", 
                image_filename=unique_name
            )
            db.session.add(new_msg)
            db.session.commit()
            
            room = f"dm_{'-'.join(sorted([sender, recipient]))}"
            
            emit('receive_private_message', {
                'sender': sender, 
                'msg': "", 
                'image': unique_name
            }, room=room)
            
        except Exception as e:
            print(f"Error saving private image: {e}")

# --- REACTION LOGIC (Must be BEFORE socketio.run) ---
@socketio.on('react_to_message')
def handle_reaction(data):
    username = data.get('username')
    msg_id = data.get('message_id')
    emoji = data.get('emoji')

    try:
        msg_id = int(msg_id)
    except (TypeError, ValueError):
        return
    
    if not username or not msg_id or not emoji:
        return

    # 1. Găsim mesajul pentru a vedea dacă e DM sau Global
    message = Message.query.get(msg_id)
    if not message:
        return

    existing = MessageReaction.query.filter_by(message_id=msg_id, user_username=username, emoji=emoji).first()
    
    if existing:
        db.session.delete(existing)
    else:
        new_r = MessageReaction(message_id=msg_id, user_username=username, emoji=emoji)
        db.session.add(new_r)
    
    db.session.commit()
    
    # Recalculăm reacțiile
    all_reactions = MessageReaction.query.filter_by(message_id=msg_id).all()
    
    reactions_map = {}
    for r in all_reactions:
        if r.emoji not in reactions_map:
            reactions_map[r.emoji] = {'count': 0, 'users': []}
        reactions_map[r.emoji]['count'] += 1
        reactions_map[r.emoji]['users'].append(r.user_username)
        
    reactions_list = []
    for emoji, r_data in reactions_map.items():
        reactions_list.append({
            'emoji': emoji,
            'count': r_data['count'],
            'users': r_data['users']
        })
        
    response_data = {
        'message_id': msg_id,
        'reactions': reactions_list
    }

    # 2. Trimitem evenimentul în camera corectă
    if message.recipient_username:
        # Este un mesaj privat (DM)
        # Reconstruim numele camerei DM: dm_user1-user2 (sortat alfabetic)
        participants = sorted([message.sender_username, message.recipient_username])
        room_name = f"dm_{'-'.join(participants)}"
        emit('update_message_reactions', response_data, room=room_name)
    else:
        # Este mesaj global
        emit('update_message_reactions', response_data, room='global_chat')

# --- MAIN ENTRY POINT (Must be at the very END) ---
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)