from flask import Flask
from flask_cors import CORS
from flask_session import Session
import app.app as routes_module # Import the app.py module specifically
import os

# Create the main Flask application instance
app = Flask(__name__)

# Configure session management
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_FILE_THRESHOLD'] = 100

# Initialize Flask-Session
Session(app)

# Enable CORS for all routes and all origins on this app instance
CORS(app, supports_credentials=True)

# Register the Blueprint from the imported module
# Access api_bp as an attribute of routes_module
app.register_blueprint(routes_module.api_bp)

# The if __name__ == '__main__': block is generally not needed here
# when using the 'flask run' command with FLASK_APP, as 'flask run'
# handles running the app. It's more for direct execution like 'python -m app'.
# if __name__ == '__main__':
#     app.run(debug=True) 