from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, leave_room, emit


app = Flask(__name__)
app.config['SECRET_KEY'] = 'BestProjectOfAllTime'
socketio = SocketIO(app, cors_allowed_origins='*')


@app.route('/')
def index():
	return render_template('index.html')


# Simple broadcast chat (no rooms required)
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
	# data expected: { 'username': str, 'msg': str }
	username = data.get('username', 'Anonymous')
	msg = data.get('msg', '')
# broadcast to all clients
	emit('receive_message', {'username': username, 'msg': msg}, broadcast=True)


if __name__ == '__main__':
	socketio.run(app, host='0.0.0.0', port=5000, debug=True)