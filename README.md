# PyChat

PyChat is a real-time web messaging application built with Flask and Socket.IO. It provides a platform for users to communicate globally or privately, share images, and manage friendships in a modern, dark-themed interface.

## 🚀 Features

### Core Messaging
- **Global Chat**: A public channel where all connected users can interact in real-time.
- **Direct Messages (DMs)**: Private, one-on-one conversations between friends.
- **Multimedia Sharing**: Support for uploading and viewing images in both global and private chats.
- **Message Management**:
  - *Edit & Delete*: Users can edit or delete their own messages after sending.
  - *Reactions*: Users can react to messages with emojis (👍, ❤️, 😂, 😮, 😢, 😡).

### Social & Account
- **Friend System**:
  - Send, accept, and reject friend requests.
  - Search for users to add as friends.
  - View pending requests in the account dashboard.
- **User Profiles**: Customizable profiles with bios and profile pictures.
- **Secure Authentication**: User registration and login system with password hashing.

### Technical
- **Rate Limiting**: Cooldown system to prevent spam in global chat.
- **Responsive UI**: A fully responsive dark mode design using custom CSS.

## 🛠️ Tech Stack
- **Backend**: Python 3.11, Flask.
- **Real-time Communication**: Flask-SocketIO, Eventlet.
- **Database**: SQLite (via Flask-SQLAlchemy).
- **Frontend**: HTML5, CSS3, Vanilla JavaScript.
- **Containerization**: Docker.

## 📂 Project Structure
```
/pychat
├── app.py # Main application logic and Socket.IO events
├── requirements.txt # Python dependencies
├── Dockerfile # Docker build instructions
├── static/
│ ├── css/ # Stylesheets (base, index, dms, etc.)
│ ├── js/ # Client-side scripts (auth, chat logic)
│ ├── profile_pics/ # Directory for user avatars
│ └── chat_uploads/ # Directory for shared images
└── templates/ # Jinja2 HTML templates
├── base.html # Base layout
├── index.html # Global chat interface
├── dms.html # Direct messaging interface
└── ...
```


## ⚡ Installation

### Option 1: Local Development

1. Clone the repository:
```
   git clone <repository-url>
   cd pychat
```

Create and activate a virtual environment:

```
python -m venv venv
```

# Windows
### Option 1: Python

```
venv\Scripts\activate
```

### Option 2: Wsl

Open the wsl terminal and follow the linux installation.


# macOS/Linux

### Option 1: Python

```
source venv/bin/activate
```

Install dependencies:

```
pip install -r requirements.txt
```

Run the application:

```
python app.py
```

The app will be accessible at http://localhost:5000. The SQLite database will be created automatically on the first run.

### Option 2: Docker


Build the Docker image:

```
docker build -t pychat:latest .
```

Run the container:
```
docker run -p 5000:5000 pychat:latest
```

Note: To persist data (images and database), ensure you mount volumes for /app/instance and /app/static.


## 📖 Usage

Register/Login: Create an account to access the chat features.

Global Chat: Post messages immediately on the home page.

Add Friends: Go to "Direct Messages" to search for users. Once they accept your request (via "My Account"), you can DM them.

Customize: Visit "My Account" to upload a profile picture and set a bio.

## 🤝 Contributers

- Neacsa Leonard 325CA
- Tene Gabriel-Victor 325CA
- Serban Lucas-Nicolae 325CA