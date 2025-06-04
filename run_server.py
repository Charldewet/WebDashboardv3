#!/usr/bin/env python3
"""
Simple script to run the Flask server with authentication
"""

import os
import sys

# Add the current directory to the Python path
sys.path.insert(0, os.path.abspath('.'))

if __name__ == "__main__":
    from app.app import app
    
    # Set development environment
    os.environ['FLASK_ENV'] = 'development'
    
    print("Starting Pharmacy Dashboard with Authentication...")
    print("Default credentials:")
    print("  Username: Charl")
    print("  Password: Admin1")
    print("  Session timeout: 24 hours")
    print("-" * 50)
    
    # Run the Flask app on port 5001 to avoid macOS AirPlay conflicts
    app.run(host="0.0.0.0", port=5001, debug=True) 