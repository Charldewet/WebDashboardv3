from flask import Flask
from flask_cors import CORS
import os
import threading
import psutil
import gc

# Local application imports
from app.db import cleanup_db_sessions
from app.stock_sales_fetcher import fetch_and_process_stock_sales_pdfs
from app.routes import api_bp

def optimize_memory():
    """Performs memory optimization tasks."""
    gc.collect()
    cleanup_db_sessions()
    memory_usage = psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2
    print(f"[Memory] Optimized to {memory_usage:.2f} MB", flush=True)
    return memory_usage

def periodic_fetch():
    """The function that runs periodically to fetch data."""
    # The actual fetching logic is in fetch_and_process_stock_sales_pdfs
    fetch_and_process_stock_sales_pdfs()

# --- Main Application Factory ---
def create_app():
    """Creates and configures the Flask application."""
    
    app = Flask(__name__)
    
    # Configure CORS
    CORS(app, resources={r"/api/*": {"origins": "https://webdashfront.onrender.com"}}, supports_credentials=True)
    
    # Register the blueprint that contains all our routes
    app.register_blueprint(api_bp)
    
    # Perform initial memory optimization
    optimize_memory()
    
    # Start the periodic fetcher in a background thread in production
    if os.environ.get('FLASK_ENV') == 'production' and not os.environ.get('WERKZEUG_RUN_MAIN'):
        if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
            thread = threading.Thread(target=periodic_fetch, daemon=True)
            thread.start()
            print("[Startup] Periodic fetch thread started.", flush=True)
            
    return app

# --- Create the app instance for Gunicorn ---
app = create_app()

# --- For local development ---
if __name__ == '__main__':
    # When running directly, we use a different CORS setting for local development
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    app.run(host='0.0.0.0', port=5001, debug=True)