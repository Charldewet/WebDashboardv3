# Render Deployment Fix

## Issue
The previous deployment failed due to circular imports between `app/app.py` and `app/__init__.py`.

## Solution
We've created a new `wsgi.py` file at the root level that serves as the entry point for gunicorn.

## Required Changes in Render Dashboard

### 1. Update the Start Command
In your Render service settings, change the **Start Command** from:
```
gunicorn app.app:app --workers 2
```

to:
```
gunicorn wsgi:app --workers 2
```

### 2. Steps to Update:
1. Go to your Render dashboard
2. Navigate to your backend service (tlcwebdashboard2)
3. Go to "Settings"
4. Scroll down to "Start Command"
5. Change it to: `gunicorn wsgi:app --workers 2`
6. Click "Save Changes"
7. Your service will automatically redeploy

## What This Fixes
- Eliminates circular import issues
- Provides a clean entry point for the Flask application
- Maintains all existing CORS configuration for:
  - https://webdashfront.onrender.com
  - http://localhost:5173  
  - http://192.168.0.136:5173

## Files Changed
- Created: `wsgi.py` (new entry point)
- Modified: `app/app.py` (removed circular import)
- Modified: `app/__init__.py` (updated CORS configuration)

After making this change, your deployment should work successfully. 