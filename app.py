from flask import Flask, render_template

app = Flask(__name__)
app.secret_key = 'BestPythonProject'

@app.route('/')
def home():
    return render_template('chat_list.html')

if __name__ == '__main__':
    app.run(debug=True)