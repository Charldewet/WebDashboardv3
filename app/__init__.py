from flask import Flask
from flask_cors import CORS
from .app import api_bp, start_periodic_fetch_once

def create_app():
    """Application factory function."""
    app = Flask(__name__)

    # Configure CORS
    CORS(app, resources={r"/api/*": {"origins": "https://webdashfront.onrender.com"}}, supports_credentials=True)

    # Register blueprints
    app.register_blueprint(api_bp)

    # Start the periodic fetcher only in production
    start_periodic_fetch_once()

    return app

app = create_app()

# The if __name__ == '__main__': block is generally not needed here
# when using the 'flask run' command with FLASK_APP, as 'flask run'
# handles running the app. It's more for direct execution like 'python -m app'.
# if __name__ == '__main__':
#     app.run(debug=True) 