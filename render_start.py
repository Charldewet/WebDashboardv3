#!/usr/bin/env python3
"""
Render-specific startup script for the Pharmacy Dashboard with Authentication
"""

import os
import sys

# Add the current directory to the Python path
sys.path.insert(0, os.path.abspath('.'))

if __name__ == "__main__":
    # Set production environment variables if not already set
    if not os.environ.get('SECRET_KEY'):
        os.environ['SECRET_KEY'] = 'pharmacy-dashboard-render-key-' + os.urandom(24).hex()[:32]
    
    # Set session directory for Render persistent disk
    if not os.environ.get('SESSION_DIR'):
        os.environ['SESSION_DIR'] = '/opt/render/project/sessions'
    
    # Ensure database directory exists
    db_dir = 'db'
    if not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    
    from app.app import app
    
    print("Starting Pharmacy Dashboard on Render...")
    print("Authentication enabled with 24-hour sessions")
    print("Default user 'Charl' will be created if it doesn't exist")
    print("-" * 50)
    
    # Get port from environment (Render sets this automatically)
    port = int(os.environ.get('PORT', 5001))
    
    # Run the Flask app
    app.run(host="0.0.0.0", port=port, debug=False) 