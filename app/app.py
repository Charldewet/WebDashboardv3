from flask import jsonify, request, Blueprint, Flask, session
from app.models import DailyReport, User
from app.db import create_session
import subprocess
import threading
import time
import os
import psutil
from flask_cors import CORS
from flask_session import Session
from datetime import datetime, timedelta
from functools import wraps

api_bp = Blueprint('api', __name__, url_prefix='/api')

def login_required(f):
    """Decorator to require login for protected routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Check if session has expired (24 hours)
        if 'login_time' in session:
            login_time = datetime.fromisoformat(session['login_time'])
            if datetime.now() - login_time > timedelta(hours=24):
                session.clear()
                return jsonify({'error': 'Session expired'}), 401
        
        return f(*args, **kwargs)
    return decorated_function

@api_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    db_session = create_session()
    user = db_session.query(User).filter(User.username == username).first()
    
    if user and user.check_password(password):
        session['user_id'] = user.id
        session['username'] = user.username
        session['login_time'] = datetime.now().isoformat()
        session.permanent = True
        db_session.close()
        return jsonify({'message': 'Login successful', 'username': user.username}), 200
    
    db_session.close()
    return jsonify({'error': 'Invalid username or password'}), 401

@api_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logout successful'}), 200

@api_bp.route('/check_session', methods=['GET'])
def check_session():
    if 'user_id' not in session:
        return jsonify({'authenticated': False}), 200
    
    # Check if session has expired (24 hours)
    if 'login_time' in session:
        login_time = datetime.fromisoformat(session['login_time'])
        if datetime.now() - login_time > timedelta(hours=24):
            session.clear()
            return jsonify({'authenticated': False, 'reason': 'Session expired'}), 200
    
    return jsonify({
        'authenticated': True, 
        'username': session.get('username'),
        'login_time': session.get('login_time')
    }), 200

def init_default_user():
    """Initialize the default user 'Charl' with password 'Admin1'"""
    db_session = create_session()
    
    # Check if user already exists
    existing_user = db_session.query(User).filter(User.username == 'Charl').first()
    if not existing_user:
        user = User(username='Charl')
        user.set_password('Admin1')
        db_session.add(user)
        db_session.commit()
        print("Default user 'Charl' created successfully")
    else:
        print("Default user 'Charl' already exists")
    
    db_session.close()

@api_bp.route('/turnover', methods=['GET'])
@login_required
def get_turnover():
    pharmacy = request.args.get('pharmacy')
    date = request.args.get('date')  # Optionally filter by date
    session = create_session()
    query = session.query(DailyReport).filter(DailyReport.pharmacy_code == pharmacy)
    if date:
        query = query.filter(DailyReport.report_date == date)
    reports = query.all()
    turnover = sum([r.total_turnover_today for r in reports if r.total_turnover_today])
    session.close()
    return jsonify({'pharmacy': pharmacy, 'turnover': turnover})

@api_bp.route('/turnover_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_turnover_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    )
    reports = query.all()
    turnover = sum([r.total_turnover_today for r in reports if r.total_turnover_today])
    session.close()
    return jsonify({'pharmacy': pharmacy, 'turnover': turnover})

@api_bp.route('/daily_turnover_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_daily_turnover_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_turnover = [
        {"date": r.report_date.strftime('%Y-%m-%d'), "turnover": r.total_turnover_today or 0}
        for r in reports
    ]
    session.close()
    return jsonify({"pharmacy": pharmacy, "daily_turnover": daily_turnover})

@api_bp.route('/daily_avg_basket_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_daily_avg_basket_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_avg_basket = [
        {
            "date": r.report_date.strftime('%Y-%m-%d'),
            "avg_basket_value": round(r.avg_value_per_basket, 2) if r.avg_value_per_basket else 0
        }
        for r in reports
    ]
    session.close()
    return jsonify({"pharmacy": pharmacy, "daily_avg_basket": daily_avg_basket})

@api_bp.route('/avg_basket_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_avg_basket_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    )
    reports = query.all()
    valid_reports = [r for r in reports if r.avg_value_per_basket and r.avg_value_per_basket > 0]
    if valid_reports:
        avg_basket_value = sum(r.avg_value_per_basket for r in valid_reports) / len(valid_reports)
        avg_basket_size = sum(r.avg_items_per_basket for r in valid_reports) / len(valid_reports)
    else:
        avg_basket_value = 0
        avg_basket_size = 0
    session.close()
    return jsonify({
        'pharmacy': pharmacy,
        'avg_basket_value': round(avg_basket_value, 2),
        'avg_basket_size': round(avg_basket_size, 2),
        'days_counted': len(valid_reports)
    })

@api_bp.route('/gp_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_gp_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    )
    reports = query.all()
    valid_gp_percent = [r.stock_gross_profit_percent_today for r in reports if r.stock_gross_profit_percent_today not in (None, 0)]
    if valid_gp_percent:
        avg_gp_percent = sum(valid_gp_percent) / len(valid_gp_percent)
    else:
        avg_gp_percent = 0
    cumulative_gp_value = sum(r.stock_gross_profit_today for r in reports if r.stock_gross_profit_today)
    session.close()
    return jsonify({
        'pharmacy': pharmacy,
        'avg_gp_percent': round(avg_gp_percent, 2),
        'cumulative_gp_value': round(cumulative_gp_value, 2),
        'days_counted': len(valid_gp_percent)
    })

@api_bp.route('/costs_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_costs_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    )
    reports = query.all()
    cost_of_sales = sum(r.cost_of_sales_today for r in reports if r.cost_of_sales_today)
    purchases = sum(r.stock_purchases_today for r in reports if r.stock_purchases_today)
    session.close()
    return jsonify({
        'pharmacy': pharmacy,
        'cost_of_sales': round(cost_of_sales, 2),
        'purchases': round(purchases, 2)
    })

@api_bp.route('/transactions_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_transactions_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    )
    reports = query.all()
    total_transactions = sum(r.pos_turnover_trans_today for r in reports if r.pos_turnover_trans_today)
    total_scripts = sum(r.scripts_dispensed_today for r in reports if r.scripts_dispensed_today)
    session.close()
    return jsonify({
        'pharmacy': pharmacy,
        'total_transactions': int(total_transactions),
        'total_scripts': round(total_scripts / 100, 2)
    })

@api_bp.route('/dispensary_vs_total_turnover/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_dispensary_vs_total_turnover(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    )
    reports = query.all()
    dispensary_turnover = sum(r.dispensary_turnover_today for r in reports if r.dispensary_turnover_today)
    total_turnover = sum(r.total_turnover_today for r in reports if r.total_turnover_today)
    session.close()
    percent = (dispensary_turnover / total_turnover * 100) if total_turnover else 0
    return jsonify({
        'pharmacy': pharmacy,
        'dispensary_turnover': round(dispensary_turnover, 2),
        'total_turnover': round(total_turnover, 2),
        'percent': round(percent, 2)
    })

@api_bp.route('/daily_purchases_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_daily_purchases_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_purchases = [
        {"date": r.report_date.strftime('%Y-%m-%d'), "purchases": r.stock_purchases_today or 0}
        for r in reports
    ]
    session.close()
    return jsonify({"pharmacy": pharmacy, "daily_purchases": daily_purchases})

@api_bp.route('/daily_cost_of_sales_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_daily_cost_of_sales_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_cost_of_sales = [
        {"date": r.report_date.strftime('%Y-%m-%d'), "cost_of_sales": r.cost_of_sales_today or 0}
        for r in reports
    ]
    session.close()
    return jsonify({"pharmacy": pharmacy, "daily_cost_of_sales": daily_cost_of_sales})

@api_bp.route('/daily_cash_sales_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_daily_cash_sales_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_cash_sales = [
        {"date": r.report_date.strftime('%Y-%m-%d'), "cash_sales": r.cash_sales_today or 0}
        for r in reports
    ]
    session.close()
    return jsonify({"pharmacy": pharmacy, "daily_cash_sales": daily_cash_sales})

@api_bp.route('/daily_account_sales_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_daily_account_sales_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_account_sales = [
        {"date": r.report_date.strftime('%Y-%m-%d'), "account_sales": r.account_sales_today or 0}
        for r in reports
    ]
    session.close()
    return jsonify({"pharmacy": pharmacy, "daily_account_sales": daily_account_sales})

@api_bp.route('/daily_cod_sales_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_daily_cod_sales_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_cod_sales = [
        {"date": r.report_date.strftime('%Y-%m-%d'), "cod_sales": r.cod_sales_today or 0}
        for r in reports
    ]
    session.close()
    return jsonify({"pharmacy": pharmacy, "daily_cod_sales": daily_cod_sales})

@api_bp.route('/daily_cash_tenders_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_daily_cash_tenders_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_cash_tenders = [
        {"date": r.report_date.strftime('%Y-%m-%d'), "cash_tenders_today": r.cash_tenders_today or 0}
        for r in reports
    ]
    session.close()
    return jsonify({"daily_cash_tenders": daily_cash_tenders, "pharmacy": pharmacy})

@api_bp.route('/daily_credit_card_tenders_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_daily_credit_card_tenders_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_credit_card_tenders = [
        {"date": r.report_date.strftime('%Y-%m-%d'), "credit_card_tenders_today": r.credit_card_tenders_today or 0}
        for r in reports
    ]
    session.close()
    return jsonify({"daily_credit_card_tenders": daily_credit_card_tenders, "pharmacy": pharmacy})

@api_bp.route('/daily_scripts_dispensed_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_daily_scripts_dispensed_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_scripts = [
        {"date": r.report_date.strftime('%Y-%m-%d'), "scripts_dispensed": int(r.scripts_dispensed_today or 0)}
        for r in reports
    ]
    session.close()
    return jsonify({"pharmacy": pharmacy, "daily_scripts_dispensed": daily_scripts})

@api_bp.route('/daily_gp_percent_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_daily_gp_percent_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_gp_percent = [
        {"date": r.report_date.strftime('%Y-%m-%d'), "gp_percent": r.stock_gross_profit_percent_today if r.stock_gross_profit_percent_today is not None else 0}
        for r in reports
    ]
    session.close()
    return jsonify({"pharmacy": pharmacy, "daily_gp_percent": daily_gp_percent})

@api_bp.route('/daily_dispensary_percent_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_daily_dispensary_percent_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_dispensary_percent = []
    for r in reports:
        if r.total_turnover_today and r.total_turnover_today != 0:
            percent = (r.dispensary_turnover_today or 0) / r.total_turnover_today * 100
        else:
            percent = 0
        daily_dispensary_percent.append({
            "date": r.report_date.strftime('%Y-%m-%d'),
            "dispensary_percent": percent
        })
    session.close()
    return jsonify({"pharmacy": pharmacy, "daily_dispensary_percent": daily_dispensary_percent})

@api_bp.route('/daily_dispensary_turnover_for_range/<start_date>/<end_date>', methods=['GET'])
@login_required
def get_daily_dispensary_turnover_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_dispensary_turnover = [
        {"date": r.report_date.strftime('%Y-%m-%d'), "dispensary_turnover": r.dispensary_turnover_today or 0}
        for r in reports
    ]
    session.close()
    return jsonify({"pharmacy": pharmacy, "daily_dispensary_turnover": daily_dispensary_turnover})

@api_bp.route('/force_update', methods=['POST'])
@login_required
def force_update():
    print("=== /api/force_update called ===", flush=True)
    try:
        result = subprocess.run(
            ['python3', 'scripts/fetch_latest.py'],
            capture_output=True,
            text=True,
            timeout=600  # 10 minutes max
        )
        print("=== subprocess finished ===", flush=True)
        print("stdout:", result.stdout, flush=True)
        print("stderr:", result.stderr, flush=True)
        if result.returncode == 0:
            return jsonify({"status": "success", "output": result.stdout}), 200
        else:
            if not result.stderr:
                return jsonify({"status": "error", "output": "Unknown error: no stderr output"}), 500
            return jsonify({"status": "error", "output": result.stderr}), 500
    except Exception as e:
        print("Exception in force_update:", str(e), flush=True)
        return jsonify({"status": "error", "output": str(e)}), 500

def periodic_fetch():
    while True:
        print("=== [Periodic Fetch] Loop Start ===", flush=True)
        mem_usage = psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2
        print(f"[Periodic Fetch] Memory usage before: {mem_usage:.2f} MB", flush=True)
        if mem_usage > 400:
            print(f"[Periodic Fetch] Memory usage exceeded 400MB, exiting process to allow restart.", flush=True)
            os._exit(1)
        try:
            result = subprocess.run(
                ['python3', 'scripts/fetch_latest.py'],
                capture_output=True,
                text=True,
                timeout=600
            )
            print(result.stdout, flush=True)
            if result.stderr:
                print(result.stderr, flush=True)
        except Exception as e:
            print(f"[Periodic Fetch] Error: {e}", flush=True)
        mem_usage_after = psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2
        print(f"[Periodic Fetch] Memory usage after: {mem_usage_after:.2f} MB", flush=True)
        print("=== [Periodic Fetch] Loop End, sleeping 600s ===", flush=True)
        time.sleep(600)

def start_periodic_fetch_once():
    # Only start in the main process, not in Gunicorn worker forks
    if (
        os.environ.get("RUN_MAIN") == "true" or
        os.environ.get("WERKZEUG_RUN_MAIN") == "true" or
        os.environ.get("RENDER") == "true" or
        os.environ.get("FLASK_ENV") == "development"
    ):
        threading.Thread(target=periodic_fetch, daemon=True).start()

start_periodic_fetch_once()

app = Flask(__name__)
# Session configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'pharmacy-dashboard-secret-key-change-in-production')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_KEY_PREFIX'] = 'pharmacy_session:'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)
app.config['SESSION_FILE_DIR'] = os.environ.get('SESSION_DIR', '/tmp/flask_session')

# Ensure session directory exists
session_dir = app.config['SESSION_FILE_DIR']
if not os.path.exists(session_dir):
    os.makedirs(session_dir, exist_ok=True)

# Initialize session
Session(app)

CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://localhost:3000", "https://webdashfront.onrender.com"]}}, supports_credentials=True, allow_headers=["Content-Type", "Authorization"], methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
app.register_blueprint(api_bp)

# Create database tables and initialize default user
with app.app_context():
    from app.db import engine
    from app.models import Base
    Base.metadata.create_all(engine)
    init_default_user()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001) 