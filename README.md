# Pharmacy Dashboard v3 with Authentication

A modern web dashboard for pharmacy data analytics with secure user authentication and automatic session management.

## 🔐 Authentication Features

- **Secure Login System**: Username/password authentication with password hashing
- **Session Management**: 24-hour automatic logout for security
- **Protected Routes**: All API endpoints require authentication
- **Modern UI**: Dark-themed login form matching the dashboard design

### Default Credentials
- **Username**: `Charl`
- **Password**: `Admin1`

> **Note**: The default user is automatically created when the server starts. Change the password in production!

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Flask server**:
   ```bash
   python run_server.py
   ```
   
   The server will:
   - Create the database tables automatically
   - Initialize the default user
   - Start on `http://localhost:5001`
   - Display login credentials in the console

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   
   The frontend will start on `http://localhost:5173` with automatic proxy to the backend.

## 🚀 Production Deployment (Render)

### Backend on Render
1. **Environment Variables** (set in Render dashboard):
   ```
   SECRET_KEY=your-strong-secret-key-here
   SESSION_DIR=/opt/render/project/sessions
   DATABASE_URL=sqlite:///db/daily_reports.db
   ```

2. **Build Command**: `pip install -r requirements.txt`

3. **Start Command**: `python render_start.py`

### Frontend on Render
1. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-app.onrender.com
   ```

2. **Build Command**: `npm install && npm run build`

3. **Publish Directory**: `dist`

### Render Deployment Steps
1. **Backend Service**:
   - Connect your GitHub repository
   - Set service type to "Web Service"
   - Set build command: `pip install -r requirements.txt`
   - Set start command: `python render_start.py`
   - Add environment variables listed above
   - Enable persistent disk for session storage

2. **Frontend Service**:
   - Connect your GitHub repository  
   - Set service type to "Static Site"
   - Set root directory to `frontend`
   - Set build command: `npm install && npm run build`
   - Set publish directory: `dist`
   - Add environment variable: `VITE_API_URL=https://your-backend-url.onrender.com`

### Important Notes for Render
- The authentication system uses filesystem sessions stored in `/opt/render/project/sessions`
- Sessions persist across deployments when using Render's persistent disk
- CORS is configured for your production frontend URL
- The default user is created automatically on first startup
- Backend and frontend are deployed as separate services
- Make sure to update the CORS origins in `app/app.py` with your actual frontend URL

## 🔒 Security Features

### Session Management
- **Duration**: 24 hours from login
- **Automatic Logout**: Sessions expire after 24 hours
- **Secure Cookies**: Session data stored securely server-side
- **CSRF Protection**: Built-in session signing

### Password Security
- Passwords are hashed using SHA-256
- No plain text password storage
- Session-based authentication (no JWT tokens to manage)

### API Protection
All API endpoints require authentication:
- `/api/login` - Public (for login)
- `/api/logout` - Public (for logout)
- `/api/check_session` - Public (for session verification)
- All other `/api/*` endpoints - **Protected** (require login)

## 🎯 Features

### Dashboard Views
- **Daily View**: Single day analytics with KPIs and charts
- **Monthly View**: Month-to-date comparisons and trends
- **Yearly View**: Year-to-date analytics and historical data
- **Stock View**: Inventory and stock management data

### User Experience
- **Responsive Design**: Works on desktop and mobile
- **Loading States**: Beautiful loading animations
- **Error Handling**: Graceful error messages and recovery
- **Auto-Reconnect**: Automatic session checking on page load

## 🛠 Development

### Project Structure
```
WebDashboardv3/
├── app/                    # Flask backend
│   ├── app.py             # Main Flask application
│   ├── models.py          # Database models (User, DailyReport)
│   ├── db.py              # Database configuration
│   └── ...
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   └── LoginForm.jsx
│   │   ├── views/         # Dashboard views
│   │   └── App.jsx        # Main React application
│   └── ...
├── requirements.txt       # Python dependencies
├── run_server.py         # Server startup script
└── README.md
```

### Environment Configuration

**Flask Session Secret** (Optional):
```bash
export SECRET_KEY="your-secret-key-here"
```

**Database** (Default: SQLite):
```bash
export DATABASE_URL="sqlite:///db/daily_reports.db"
```

## 📊 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout  
- `GET /api/check_session` - Check authentication status

### Protected Data Endpoints
All require authentication:
- `GET /api/turnover_for_range/{start}/{end}`
- `GET /api/daily_turnover_for_range/{start}/{end}`
- `GET /api/avg_basket_for_range/{start}/{end}`
- And more...

## 🔧 Troubleshooting

### Common Issues

**Login not working**:
- Check that both backend (port 5001) and frontend (port 5173) are running
- Verify browser allows cookies from localhost
- Check browser console for CORS errors

**Session expires immediately**:
- Ensure `SECRET_KEY` is set consistently
- Check that session files are being created in `/tmp`

**API calls fail with 401**:
- User needs to log in again
- Session may have expired (24 hours)
- Check network connectivity

### Development Tips

**Reset the database**:
```bash
rm -rf db/daily_reports.db
python run_server.py  # Will recreate tables and default user
```

**Check session files** (Linux/Mac):
```bash
ls -la /tmp/flask_session/
```

**View application logs**:
The Flask server runs with debug mode enabled and will show detailed error messages.

## 🚀 Production Deployment

### Security Checklist
- [ ] Change default username/password
- [ ] Set strong `SECRET_KEY` environment variable
- [ ] Use HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Use production database (PostgreSQL recommended)
- [ ] Enable proper logging
- [ ] Set up monitoring

### Environment Variables
```bash
SECRET_KEY="strong-random-secret-key"
DATABASE_URL="postgresql://user:pass@host:port/dbname"
FLASK_ENV="production"
```

---

## Database
The application uses an SQLite database located at `db/daily_reports.db`. The backend server must be started from the project root directory for the relative database path to be resolved correctly.

For production, consider using PostgreSQL or MySQL by setting the `DATABASE_URL` environment variable. 