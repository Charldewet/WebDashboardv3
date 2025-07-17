from flask import jsonify, request, Blueprint, Flask, g
from app.models import DailyReport, Department, StockItem, DailyStockSales
from app.db import create_session, cleanup_db_sessions
import subprocess
import threading
import time
import os
import psutil
from flask_cors import CORS
import datetime
import gc
from functools import wraps
import jwt
from datetime import datetime, timedelta

# Memory optimization at startup
def optimize_memory():
    """Optimize memory usage at startup and during operation."""
    try:
        # Force garbage collection
        gc.collect()
        
        # Clean up any database sessions
        cleanup_db_sessions()
        
        # Get current memory usage
        memory_usage = psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2
        print(f"[Memory] Optimized to {memory_usage:.2f} MB", flush=True)
        
        return memory_usage
    except Exception as e:
        print(f"[Memory] Error during optimization: {e}", flush=True)
        return None

def memory_cleanup(f):
    """Decorator to automatically clean up memory after API calls."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            result = f(*args, **kwargs)
            return result
        finally:
            # Clean up after every API call
            try:
                gc.collect()
                cleanup_db_sessions()
            except Exception as e:
                print(f"[Memory] Cleanup error in {f.__name__}: {e}", flush=True)
    return decorated_function

# Optimize memory at startup
startup_memory = optimize_memory()
print(f"[Startup] Application started with {startup_memory:.2f} MB memory usage", flush=True)

api_bp = Blueprint('api', __name__, url_prefix='/api')

# Secret key for JWT
SECRET_KEY = os.environ.get('SECRET_KEY', 'your_default_secret_key')

# In-memory user store
# In a real app, this would be in a database and passwords would be hashed
USERS = {
    "Charl": {
        "password": "Koeberg7#",
        "pharmacies": ["reitz", "roos", "tugela", "villiers", "winterton"]
    },
    "user": {
        "password": "password",
        "pharmacies": ["reitz", "roos", "villiers", "winterton"],
        "use_friendly_names": True
    },
    "newuser": {
        "password": "securepassword123",
        "pharmacies": ["reitz", "roos", "tugela", "villiers", "winterton"]
    },
    "Elani": {
        "password": "Elani123",
        "pharmacies": ["villiers"]
    }
}

# Pharmacy friendly names mapping
PHARMACY_FRIENDLY_NAMES = {
    "reitz": "TLC Pharm 1",
    "roos": "TLC Pharm 2", 
    "tugela": "TLC Pharm 3",
    "villiers": "TLC Pharm 4",
    "winterton": "TLC Pharm 5"
}

# decorator for verifying the JWT
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
  
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            g.current_user = USERS.get(data['sub'])
            if not g.current_user:
                return jsonify({'message': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
  
        return f(*args, **kwargs)
  
    return decorated

def authorize_pharmacy(f):
    """Decorator to check if the user is allowed to access the requested pharmacy."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        pharmacy_code = request.headers.get('X-Pharmacy')
        if not pharmacy_code:
            return jsonify({"error": "X-Pharmacy header is required"}), 400
        
        # Correctly get the list of allowed pharmacy codes
        allowed_pharmacy_codes = g.current_user['pharmacies']
        if pharmacy_code not in allowed_pharmacy_codes:
            return jsonify({"error": "You are not authorized to access this pharmacy"}), 403
            
        return f(*args, **kwargs)
    return decorated_function

@api_bp.route('/login', methods=['POST'])
@memory_cleanup
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Could not verify'}), 401

    user = USERS.get(data['username'])

    if user and user['password'] == data['password']:
        token = jwt.encode({
            'sub': data['username'],
            'exp': datetime.utcnow() + timedelta(hours=8)
        }, SECRET_KEY, algorithm="HS256")
        return jsonify({'token': token})

    return jsonify({'message': 'Login failed!'}), 401

@api_bp.route('/pharmacies', methods=['GET'])
@token_required
def get_pharmacies():
    """Returns the list of pharmacies the user is allowed to see."""
    if not g.current_user:
        return jsonify({"error": "User not found or not authenticated"}), 401
    
    pharmacies = g.current_user['pharmacies']
    
    # Check if user should see friendly names
    if g.current_user.get('use_friendly_names', False):
        # Return friendly names with pharmacy codes as values
        friendly_pharmacies = []
        for pharmacy_code in pharmacies:
            friendly_name = PHARMACY_FRIENDLY_NAMES.get(pharmacy_code, pharmacy_code)
            friendly_pharmacies.append({
                "code": pharmacy_code,
                "name": friendly_name
            })
        return jsonify(friendly_pharmacies)
    else:
        # Return pharmacy codes as before
        return jsonify(pharmacies)

@api_bp.route('/turnover', methods=['GET'])
@token_required
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
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
def get_transactions_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    )
    reports = query.all()
    total_transactions = sum(r.sales_total_trans_today for r in reports if r.sales_total_trans_today)
    total_scripts = sum(r.scripts_dispensed_today for r in reports if r.scripts_dispensed_today)
    session.close()
    return jsonify({
        'pharmacy': pharmacy,
        'total_transactions': int(total_transactions),
        'total_scripts': int(total_scripts)
    })

@api_bp.route('/dispensary_vs_total_turnover/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
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
    return jsonify({"pharmacy": pharmacy, "daily_cash_tenders": daily_cash_tenders})

@api_bp.route('/daily_credit_card_tenders_for_range/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
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
    return jsonify({"pharmacy": pharmacy, "daily_credit_card_tenders": daily_credit_card_tenders})

@api_bp.route('/daily_scripts_dispensed_for_range/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
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

@api_bp.route('/avg_script_metrics_for_range/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
def get_avg_script_metrics_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    )
    reports = query.all()
    valid_reports = [r for r in reports if r.avg_script_value_today and r.avg_script_value_today > 0]
    if valid_reports:
        avg_script_value = sum(r.avg_script_value_today for r in valid_reports) / len(valid_reports)
        avg_items_per_script = sum(r.avg_items_per_script_today for r in valid_reports) / len(valid_reports)
    else:
        avg_script_value = 0
        avg_items_per_script = 0
    session.close()
    return jsonify({
        'pharmacy': pharmacy,
        'avg_script_value': round(avg_script_value, 2),
        'avg_items_per_script': round(avg_items_per_script, 2),
        'days_counted': len(valid_reports)
    })

@api_bp.route('/daily_avg_script_value_for_range/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
def get_daily_avg_script_value_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_avg_script_value = [
        {
            "date": r.report_date.strftime('%Y-%m-%d'),
            "avg_script_value": round(r.avg_script_value_today, 2) if r.avg_script_value_today else 0
        }
        for r in reports
    ]
    session.close()
    return jsonify({"pharmacy": pharmacy, "daily_avg_script_value": daily_avg_script_value})

@api_bp.route('/daily_avg_items_per_script_for_range/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
def get_daily_avg_items_per_script_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).order_by(DailyReport.report_date)
    reports = query.all()
    daily_avg_items_per_script = [
        {
            "date": r.report_date.strftime('%Y-%m-%d'),
            "avg_items_per_script": round(r.avg_items_per_script_today, 2) if r.avg_items_per_script_today else 0
        }
        for r in reports
    ]
    session.close()
    return jsonify({"pharmacy": pharmacy, "daily_avg_items_per_script": daily_avg_items_per_script})

@api_bp.route('/daily_gp_percent_for_range/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
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
@token_required
@authorize_pharmacy
@memory_cleanup
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

@api_bp.route('/opening_stock_for_range/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
def get_opening_stock_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    from datetime import datetime
    try:
        # Parse the start_date
        date_obj = datetime.strptime(start_date, '%Y-%m-%d')
        # Query for this specific date
        report = session.query(DailyReport).filter(
            DailyReport.pharmacy_code == pharmacy,
            DailyReport.report_date == start_date
        ).first()
        if report and report.opening_stock_today and report.opening_stock_today > 0:
            opening_stock = report.opening_stock_today
            success = True
        else:
            opening_stock = 0
            success = False
        session.close()
        return jsonify({
            'pharmacy': pharmacy,
            'opening_stock': round(opening_stock, 2),
            'date_requested': start_date,
            'success': success
        })
    except ValueError as e:
        session.close()
        return jsonify({
            'pharmacy': pharmacy,
            'opening_stock': 0,
            'error': f'Invalid date format: {str(e)}',
            'date_requested': start_date,
            'success': False
        }), 400
    except Exception as e:
        session.close()
        return jsonify({
            'pharmacy': pharmacy,
            'opening_stock': 0,
            'error': f'Database error: {str(e)}',
            'date_requested': start_date,
            'success': False
        }), 500

@api_bp.route('/stock_adjustments_for_range/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
def get_stock_adjustments_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    )
    reports = query.all()
    total_adjustments = sum(r.stock_adjustments_today for r in reports if r.stock_adjustments_today)
    session.close()
    return jsonify({
        'pharmacy': pharmacy,
        'stock_adjustments': round(total_adjustments, 2)
    })

@api_bp.route('/closing_stock_for_range/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
def get_closing_stock_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    
    # Get the most recent closing stock in the date range
    query = session.query(DailyReport).filter(
        DailyReport.pharmacy_code == pharmacy,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date,
        DailyReport.closing_stock_today.isnot(None)
    ).order_by(DailyReport.report_date.desc()).first()
    
    closing_stock = query.closing_stock_today if query and query.closing_stock_today else 0
    
    session.close()
    return jsonify({
        'pharmacy': pharmacy,
        'closing_stock': round(closing_stock, 2),
        'date_used': query.report_date.strftime('%Y-%m-%d') if query else None
    })

@api_bp.route('/monthly_closing_stock_for_range/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
def get_monthly_closing_stock_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    
    from datetime import datetime
    import calendar
    
    try:
        # Parse the date range
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
        
        monthly_closing_stock = []
        
        # Calculate months to include
        current_year = start_date_obj.year
        current_month = start_date_obj.month
        
        # Generate month by month data
        year = current_year
        month = current_month
        
        while year < end_date_obj.year or (year == end_date_obj.year and month <= end_date_obj.month):
            # Get the last day of this month
            last_day_of_month = calendar.monthrange(year, month)[1]
            
            # Find the most recent closing stock value for this month
            month_start = f"{year}-{month:02d}-01"
            month_end = f"{year}-{month:02d}-{last_day_of_month}"
            
            query = session.query(DailyReport).filter(
                DailyReport.pharmacy_code == pharmacy,
                DailyReport.report_date >= month_start,
                DailyReport.report_date <= month_end,
                DailyReport.closing_stock_today.isnot(None),
                DailyReport.closing_stock_today > 0
            ).order_by(DailyReport.report_date.desc()).first()
            
            closing_stock_value = 0
            fallback_used = False
            
            if query and query.closing_stock_today:
                closing_stock_value = query.closing_stock_today
            else:
                # Fallback: Look for opening stock in the next month
                next_month = month + 1
                next_year = year
                if next_month > 12:
                    next_month = 1
                    next_year += 1
                
                # Check up to 31 days in the next month for opening stock
                for day in range(1, 32):
                    try:
                        if day > calendar.monthrange(next_year, next_month)[1]:
                            break  # Don't go beyond the last day of the month
                        
                        next_month_date = f"{next_year}-{next_month:02d}-{day:02d}"
                        fallback_query = session.query(DailyReport).filter(
                            DailyReport.pharmacy_code == pharmacy,
                            DailyReport.report_date == next_month_date,
                            DailyReport.opening_stock_today.isnot(None),
                            DailyReport.opening_stock_today > 0
                        ).first()
                        
                        if fallback_query and fallback_query.opening_stock_today:
                            closing_stock_value = fallback_query.opening_stock_today
                            fallback_used = True
                            break
                    except:
                        continue  # Skip invalid dates
            
            monthly_closing_stock.append({
                "month": f"{year}-{month:02d}",
                "month_name": datetime(year, month, 1).strftime('%b %Y'),
                "closing_stock": round(closing_stock_value, 2),
                "fallback_used": fallback_used
            })
            
            # Move to next month
            month += 1
            if month > 12:
                month = 1
                year += 1
        
        session.close()
        return jsonify({
            "pharmacy": pharmacy,
            "monthly_closing_stock": monthly_closing_stock
        })
        
    except Exception as e:
        session.close()
        return jsonify({
            'pharmacy': pharmacy,
            'monthly_closing_stock': [],
            'error': f'Error fetching monthly closing stock: {str(e)}'
        }), 500

@api_bp.route('/turnover_ratio_for_range/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
def get_turnover_ratio_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    
    try:
        # Get cost of sales for the period
        query = session.query(DailyReport).filter(
            DailyReport.pharmacy_code == pharmacy,
            DailyReport.report_date >= start_date,
            DailyReport.report_date <= end_date
        )
        reports = query.all()
        
        total_cost_of_sales = sum(r.cost_of_sales_today for r in reports if r.cost_of_sales_today)
        
        # Get opening and closing stock for average inventory calculation
        # Opening stock from first day of period
        opening_query = session.query(DailyReport).filter(
            DailyReport.pharmacy_code == pharmacy,
            DailyReport.report_date >= start_date,
            DailyReport.opening_stock_today.isnot(None),
            DailyReport.opening_stock_today > 0
        ).order_by(DailyReport.report_date.asc()).first()
        
        # Closing stock from last day of period  
        closing_query = session.query(DailyReport).filter(
            DailyReport.pharmacy_code == pharmacy,
            DailyReport.report_date <= end_date,
            DailyReport.closing_stock_today.isnot(None),
            DailyReport.closing_stock_today > 0
        ).order_by(DailyReport.report_date.desc()).first()
        
        opening_stock = opening_query.opening_stock_today if opening_query else 0
        closing_stock = closing_query.closing_stock_today if closing_query else 0
        
        # Calculate average inventory
        average_inventory = (opening_stock + closing_stock) / 2 if (opening_stock + closing_stock) > 0 else 1
        
        # Calculate inventory turnover ratio (times per period)
        turnover_ratio = total_cost_of_sales / average_inventory if average_inventory > 0 else 0
        
        session.close()
        return jsonify({
            'pharmacy': pharmacy,
            'turnover_ratio': round(turnover_ratio, 2),
            'cost_of_sales': round(total_cost_of_sales, 2),
            'average_inventory': round(average_inventory, 2)
        })
        
    except Exception as e:
        session.close()
        return jsonify({
            'pharmacy': pharmacy,
            'turnover_ratio': 0,
            'error': f'Error calculating turnover ratio: {str(e)}'
        }), 500

@api_bp.route('/days_of_inventory_for_range/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
def get_days_of_inventory_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    
    from datetime import datetime
    
    try:
        # Get cost of sales for the period to calculate daily average
        query = session.query(DailyReport).filter(
            DailyReport.pharmacy_code == pharmacy,
            DailyReport.report_date >= start_date,
            DailyReport.report_date <= end_date
        )
        reports = query.all()
        
        total_cost_of_sales = sum(r.cost_of_sales_today for r in reports if r.cost_of_sales_today)
        
        # Calculate number of days in the period
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
        days_in_period = (end_date_obj - start_date_obj).days + 1
        
        # Calculate average daily cost of sales
        avg_daily_cost_of_sales = total_cost_of_sales / days_in_period if days_in_period > 0 else 0
        
        # Get current closing stock
        closing_query = session.query(DailyReport).filter(
            DailyReport.pharmacy_code == pharmacy,
            DailyReport.report_date <= end_date,
            DailyReport.closing_stock_today.isnot(None),
            DailyReport.closing_stock_today > 0
        ).order_by(DailyReport.report_date.desc()).first()
        
        current_inventory = closing_query.closing_stock_today if closing_query else 0
        
        # Calculate days of inventory
        days_of_inventory = current_inventory / avg_daily_cost_of_sales if avg_daily_cost_of_sales > 0 else 0
        
        session.close()
        return jsonify({
            'pharmacy': pharmacy,
            'days_of_inventory': round(days_of_inventory, 1),
            'current_inventory': round(current_inventory, 2),
            'avg_daily_cost_of_sales': round(avg_daily_cost_of_sales, 2)
        })
        
    except Exception as e:
        session.close()
        return jsonify({
            'pharmacy': pharmacy,
            'days_of_inventory': 0,
            'error': f'Error calculating days of inventory: {str(e)}'
        }), 500

@api_bp.route('/missing_turnover_dates/<pharmacy_code>/<start_date>/<end_date>', methods=['GET'])
@token_required
@memory_cleanup
def get_missing_turnover_dates(pharmacy_code, start_date, end_date):
    """Get dates in the specified range that have no turnover data for the given pharmacy."""
    try:
        session = create_session()
        
        # Get all dates in the range that have either no record or null/zero turnover
        from datetime import datetime, timedelta
        
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Generate all dates in range
        all_dates = []
        current_date = start_date_obj
        while current_date <= end_date_obj:
            all_dates.append(current_date)
            current_date += timedelta(days=1)
        
        # Get existing reports in the date range
        existing_reports = session.query(DailyReport).filter(
            DailyReport.pharmacy_code == pharmacy_code,
            DailyReport.report_date >= start_date,
            DailyReport.report_date <= end_date
        ).all()
        
        # Create a set of dates that have valid turnover data
        dates_with_turnover = set()
        for report in existing_reports:
            # Consider a date as having turnover only if it has a positive value
            if report.total_turnover_today is not None and report.total_turnover_today > 0:
                # Convert to date object for consistent comparison
                if isinstance(report.report_date, str):
                    report_date = datetime.strptime(report.report_date, '%Y-%m-%d').date()
                else:
                    report_date = report.report_date
                dates_with_turnover.add(report_date)
        
        # Find missing dates (includes dates with zero/null turnover and completely missing dates)
        missing_dates = []
        for date in all_dates:
            if date not in dates_with_turnover:
                missing_dates.append(date.strftime('%Y-%m-%d'))
        
        print(f"[DEBUG] Missing turnover dates for {pharmacy_code}: {len(missing_dates)} dates")
        print(f"[DEBUG] Sample missing dates: {missing_dates[:5]}")  # Show first 5
        
        session.close()
        return jsonify({
            'pharmacy': pharmacy_code,
            'missing_dates': missing_dates,
            'total_missing': len(missing_dates)
        })
        
    except Exception as e:
        session.close() if 'session' in locals() else None
        return jsonify({
            'error': f'Error fetching missing turnover dates: {str(e)}'
        }), 500

@api_bp.route('/manual_turnover', methods=['POST'])
@token_required
@memory_cleanup
def add_manual_daily_report():
    """Add or update manual daily report data for a specific pharmacy and date."""
    try:
        data = request.get_json()
        
        if not data or not all(key in data for key in ['pharmacy_code', 'date']):
            return jsonify({
                'error': 'Missing required fields: pharmacy_code, date'
            }), 400
        
        pharmacy_code = data['pharmacy_code']
        date_str = data['date']
        
        # Parse date
        try:
            from datetime import datetime
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'error': 'Invalid date format. Use YYYY-MM-DD'
            }), 400
        
        session = create_session()
        
        # Check if a record already exists
        report = session.query(DailyReport).filter(
            DailyReport.pharmacy_code == pharmacy_code,
            DailyReport.report_date == date_obj
        ).first()
        
        if not report:
            # Create a new report if it doesn't exist
            report = DailyReport(
                pharmacy_code=pharmacy_code,
                report_date=date_obj
            )
            session.add(report)
            message_action = "Created new report"
        else:
            message_action = "Updated report"

        # Update fields from request data if they exist
        # Turnover and GP
        if 'turnover_value' in data:
            report.total_turnover_today = float(data['turnover_value'])
        if 'gp_value' in data:
            report.stock_gross_profit_today = float(data['gp_value'])
        if 'daily_gp_percent' in data:
            report.stock_gross_profit_percent_today = float(data['daily_gp_percent'])
        
        # Basket metrics
        if 'avg_basket_size' in data:
            report.avg_items_per_basket = float(data['avg_basket_size'])
        if 'avg_basket_value' in data:
            report.avg_value_per_basket = float(data['avg_basket_value'])

        # Stock and Cost
        if 'cost_of_sales' in data:
            report.cost_of_sales_today = float(data['cost_of_sales'])
        if 'purchases' in data:
            report.stock_purchases_today = float(data['purchases'])
            
        # Quantities
        if 'transaction_qty' in data:
            report.pos_turnover_trans_today = int(data['transaction_qty'])
        if 'script_qty' in data:
            report.scripts_dispensed_today = int(data['script_qty'])

        session.commit()
        message = f'{message_action} for {pharmacy_code} on {date_str}'
        
        session.close()
        return jsonify({
            'success': True,
            'message': message,
            'pharmacy_code': pharmacy_code,
            'date': date_str,
            'data': data # Return submitted data
        })
        
    except (ValueError, TypeError) as e:
        return jsonify({
            'error': f'Invalid data type. Please ensure values are correct numbers. Details: {e}'
        }), 400
    except Exception as e:
        if 'session' in locals() and session.is_active:
            session.rollback()
            session.close()
        return jsonify({
            'error': f'Error adding manual data: {str(e)}'
        }), 500

@api_bp.route('/check_turnover/<pharmacy_code>/<date>', methods=['GET'])
@token_required
@memory_cleanup
def check_turnover_exists(pharmacy_code, date):
    """Check if turnover data exists for a specific pharmacy and date."""
    try:
        from datetime import datetime
        date_obj = datetime.strptime(date, '%Y-%m-%d').date()
        
        session = create_session()
        
        report = session.query(DailyReport).filter(
            DailyReport.pharmacy_code == pharmacy_code,
            DailyReport.report_date == date_obj
        ).first()
        
        has_turnover = bool(report and report.total_turnover_today and report.total_turnover_today > 0)
        turnover_value = report.total_turnover_today if has_turnover else None
        
        session.close()
        return jsonify({
            'pharmacy_code': pharmacy_code,
            'date': date,
            'has_turnover': has_turnover,
            'turnover_value': turnover_value
        })
        
    except ValueError:
        return jsonify({
            'error': 'Invalid date format. Use YYYY-MM-DD'
        }), 400
    except Exception as e:
        session.close() if 'session' in locals() else None
        return jsonify({
            'error': f'Error checking turnover: {str(e)}'
        }), 500

@api_bp.route('/status', methods=['GET'])
@token_required
@memory_cleanup  
def app_status():
    """Get application status including periodic fetch info."""
    try:
        process = psutil.Process(os.getpid())
        memory_usage = process.memory_info().rss / 1024 ** 2
        
        # Count active threads
        thread_count = threading.active_count()
        
        return jsonify({
            "status": "running",
            "timestamp": datetime.utcnow().isoformat(),
            "memory_mb": round(memory_usage, 2),
            "thread_count": thread_count,
            "periodic_fetch_enabled": os.environ.get("RENDER") == "true",
            "environment": "production" if os.environ.get("RENDER") == "true" else "development"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@api_bp.route('/health', methods=['GET'])
@memory_cleanup
def health_check():
    """Health check endpoint to monitor application status."""
    try:
        # Check database connectivity
        session = create_session()
        session.execute("SELECT 1")
        session.close()
        
        # Check memory usage with more detail
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        memory_usage = memory_info.rss / 1024 ** 2
        memory_percent = process.memory_percent()
        
        # Get system memory info if available
        try:
            system_memory = psutil.virtual_memory()
            system_total = system_memory.total / 1024 ** 2
            system_available = system_memory.available / 1024 ** 2
        except:
            system_total = None
            system_available = None
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "memory": {
                "usage_mb": round(memory_usage, 2),
                "usage_percent": round(memory_percent, 2),
                "system_total_mb": round(system_total, 2) if system_total else None,
                "system_available_mb": round(system_available, 2) if system_available else None
            },
            "database": "connected",
            "memory_threshold": "200MB (Render optimized)"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }), 500

# ============================================================================
# STOCK MANAGEMENT API ENDPOINTS
# ============================================================================

@api_bp.route('/departments', methods=['GET'])
@token_required
@memory_cleanup
def get_departments():
    """Get all departments"""
    session = create_session()
    try:
        departments = session.query(Department).filter_by(is_active=1).all()
        return jsonify([{
            'id': dept.id,
            'department_code': dept.department_code,
            'department_name': dept.department_name,
            'description': dept.description
        } for dept in departments])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@api_bp.route('/departments', methods=['POST'])
@token_required
@memory_cleanup
def create_department():
    """Create a new department"""
    data = request.get_json()
    if not data or not data.get('department_code') or not data.get('department_name'):
        return jsonify({'error': 'Missing required fields: department_code, department_name'}), 400
    
    session = create_session()
    try:
        # Check if department already exists
        existing = session.query(Department).filter_by(department_code=data['department_code']).first()
        if existing:
            return jsonify({'error': 'Department code already exists'}), 400
        
        department = Department(
            department_code=data['department_code'],
            department_name=data['department_name'],
            description=data.get('description', ''),
            is_active=1
        )
        session.add(department)
        session.commit()
        
        return jsonify({
            'id': department.id,
            'department_code': department.department_code,
            'department_name': department.department_name,
            'description': department.description
        }), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@api_bp.route('/stock-items', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
def get_stock_items():
    """Get stock items for the authorized pharmacy"""
    pharmacy = request.headers.get('X-Pharmacy')
    session = create_session()
    try:
        items = session.query(StockItem).filter_by(
            pharmacy_code=pharmacy,
            is_active=1
        ).all()
        
        return jsonify([{
            'id': item.id,
            'stock_code': item.stock_code,
            'stock_name': item.stock_name,
            'department_code': item.department.department_code,
            'department_name': item.department.department_name,
            'annual_sales_qty': item.annual_sales_qty,
            'annual_sales_value': item.annual_sales_value,
            'avg_monthly_sales': item.avg_monthly_sales,
            'unit_cost': item.unit_cost,
            'unit_price': item.unit_price,
            'last_updated': item.last_updated.strftime('%Y-%m-%d')
        } for item in items])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@api_bp.route('/stock-items', methods=['POST'])
@token_required
@authorize_pharmacy
@memory_cleanup
def create_stock_item():
    """Create a new stock item"""
    data = request.get_json()
    pharmacy = request.headers.get('X-Pharmacy')
    
    required_fields = ['stock_code', 'stock_name', 'department_code']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': f'Missing required fields: {", ".join(required_fields)}'}), 400
    
    session = create_session()
    try:
        # Get department
        department = session.query(Department).filter_by(department_code=data['department_code']).first()
        if not department:
            return jsonify({'error': 'Department not found'}), 400
        
        # Check if stock item already exists
        existing = session.query(StockItem).filter_by(
            stock_code=data['stock_code'],
            pharmacy_code=pharmacy
        ).first()
        if existing:
            return jsonify({'error': 'Stock item already exists for this pharmacy'}), 400
        
        # Calculate average monthly sales
        annual_qty = float(data.get('annual_sales_qty', 0))
        avg_monthly = annual_qty / 12 if annual_qty > 0 else 0
        
        stock_item = StockItem(
            stock_code=data['stock_code'],
            stock_name=data['stock_name'],
            department_id=department.id,
            pharmacy_code=pharmacy,
            annual_sales_qty=annual_qty,
            annual_sales_value=float(data.get('annual_sales_value', 0)),
            avg_monthly_sales=avg_monthly,
            unit_cost=float(data.get('unit_cost', 0)),
            unit_price=float(data.get('unit_price', 0)),
            last_updated=date.today()
        )
        session.add(stock_item)
        session.commit()
        
        return jsonify({
            'id': stock_item.id,
            'stock_code': stock_item.stock_code,
            'stock_name': stock_item.stock_name,
            'department_code': department.department_code,
            'pharmacy_code': stock_item.pharmacy_code
        }), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@api_bp.route('/daily-stock-sales/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
def get_daily_stock_sales(start_date, end_date):
    """Get daily stock sales for a date range"""
    pharmacy = request.headers.get('X-Pharmacy')
    session = create_session()
    try:
        sales = session.query(DailyStockSales).join(StockItem).filter(
            DailyStockSales.pharmacy_code == pharmacy,
            DailyStockSales.report_date >= start_date,
            DailyStockSales.report_date <= end_date
        ).all()
        
        return jsonify([{
            'id': sale.id,
            'stock_code': sale.stock_item.stock_code,
            'stock_name': sale.stock_item.stock_name,
            'department_code': sale.stock_item.department.department_code,
            'report_date': sale.report_date.strftime('%Y-%m-%d'),
            'daily_sales_qty': sale.daily_sales_qty,
            'daily_sales_value': sale.daily_sales_value,
            'daily_cost_of_sales': sale.daily_cost_of_sales,
            'daily_gross_profit': sale.daily_gross_profit,
            'daily_gross_profit_percent': sale.daily_gross_profit_percent,
            'opening_stock': sale.opening_stock,
            'closing_stock': sale.closing_stock,
            'stock_value': sale.stock_value,
            'transactions_count': sale.transactions_count,
            'avg_unit_price': sale.avg_unit_price
        } for sale in sales])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@api_bp.route('/daily-stock-sales', methods=['POST'])
@token_required
@authorize_pharmacy
@memory_cleanup
def create_daily_stock_sales():
    """Create or update daily stock sales data"""
    data = request.get_json()
    pharmacy = request.headers.get('X-Pharmacy')
    
    if not data or not data.get('stock_code') or not data.get('report_date'):
        return jsonify({'error': 'Missing required fields: stock_code, report_date'}), 400
    
    session = create_session()
    try:
        # Get stock item
        stock_item = session.query(StockItem).filter_by(
            stock_code=data['stock_code'],
            pharmacy_code=pharmacy
        ).first()
        if not stock_item:
            return jsonify({'error': 'Stock item not found'}), 400
        
        # Parse date
        try:
            report_date = datetime.strptime(data['report_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Check if record already exists
        existing = session.query(DailyStockSales).filter_by(
            stock_item_id=stock_item.id,
            pharmacy_code=pharmacy,
            report_date=report_date
        ).first()
        
        # Calculate derived values
        daily_sales_qty = float(data.get('daily_sales_qty', 0))
        daily_sales_value = float(data.get('daily_sales_value', 0))
        unit_cost = stock_item.unit_cost
        
        daily_cost_of_sales = daily_sales_qty * unit_cost
        daily_gross_profit = daily_sales_value - daily_cost_of_sales
        daily_gross_profit_percent = (daily_gross_profit / daily_sales_value * 100) if daily_sales_value > 0 else 0
        
        sales_data = {
            'stock_item_id': stock_item.id,
            'pharmacy_code': pharmacy,
            'report_date': report_date,
            'daily_sales_qty': daily_sales_qty,
            'daily_sales_value': daily_sales_value,
            'daily_cost_of_sales': daily_cost_of_sales,
            'daily_gross_profit': daily_gross_profit,
            'daily_gross_profit_percent': daily_gross_profit_percent,
            'opening_stock': float(data.get('opening_stock', 0)),
            'closing_stock': float(data.get('closing_stock', 0)),
            'stock_value': float(data.get('stock_value', 0)),
            'transactions_count': int(data.get('transactions_count', 0)),
            'avg_unit_price': float(data.get('avg_unit_price', 0))
        }
        
        if existing:
            # Update existing record
            for key, value in sales_data.items():
                setattr(existing, key, value)
            message = "Updated daily sales record"
        else:
            # Create new record
            daily_sales = DailyStockSales(**sales_data)
            session.add(daily_sales)
            message = "Created daily sales record"
        
        session.commit()
        return jsonify({
            'success': True,
            'message': message,
            'stock_code': data['stock_code'],
            'report_date': data['report_date']
        })
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@api_bp.route('/stock-summary/<start_date>/<end_date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
def get_stock_summary(start_date, end_date):
    """Get stock summary for a date range"""
    pharmacy = request.headers.get('X-Pharmacy')
    session = create_session()
    try:
        # Get total sales and stock value
        sales_data = session.query(
            DailyStockSales.daily_sales_qty,
            DailyStockSales.daily_sales_value,
            DailyStockSales.closing_stock,
            DailyStockSales.stock_value
        ).join(StockItem).filter(
            DailyStockSales.pharmacy_code == pharmacy,
            DailyStockSales.report_date >= start_date,
            DailyStockSales.report_date <= end_date
        ).all()
        
        total_sales_qty = sum(sale.daily_sales_qty for sale in sales_data)
        total_sales_value = sum(sale.daily_sales_value for sale in sales_data)
        avg_closing_stock = sum(sale.closing_stock for sale in sales_data) / len(sales_data) if sales_data else 0
        avg_stock_value = sum(sale.stock_value for sale in sales_data) / len(sales_data) if sales_data else 0
        
        return jsonify({
            'pharmacy': pharmacy,
            'date_range': f"{start_date} to {end_date}",
            'total_sales_qty': total_sales_qty,
            'total_sales_value': round(total_sales_value, 2),
            'avg_closing_stock': round(avg_closing_stock, 2),
            'avg_stock_value': round(avg_stock_value, 2),
            'records_count': len(sales_data)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@api_bp.route('/force_update', methods=['POST'])
@token_required
def force_update():
    print("=== /api/force_update called ===", flush=True)
    
    # Check memory before starting
    try:
        initial_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2
        print(f"[Force Update] Memory before start: {initial_memory:.2f} MB", flush=True)
        
        if initial_memory > 150:  # Don't start if already high
            return jsonify({
                "status": "error", 
                "message": f"Memory usage too high ({initial_memory:.2f} MB) to start update safely"
            }), 503
    except Exception as e:
        print(f"Error checking memory: {e}", flush=True)
    
    try:
        print("Starting manual email fetch...", flush=True)
        result = subprocess.run(
            ['python3', 'scripts/fetch_latest.py'],
            capture_output=True,
            text=True,
            timeout=300  # Reduced to 5 minutes to match periodic fetch
        )
        print("=== subprocess finished ===", flush=True)
        
        # Always log the output for debugging
        if result.stdout:
            print("stdout:", result.stdout, flush=True)
        if result.stderr:
            print("stderr:", result.stderr, flush=True)
        
        # Force garbage collection after subprocess
        import gc
        gc.collect()
        
        # Check final memory usage
        try:
            final_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2
            print(f"[Force Update] Memory after completion: {final_memory:.2f} MB", flush=True)
        except Exception:
            pass
            
        if result.returncode == 0:
            return jsonify({
                "status": "success", 
                "message": "Email fetch completed successfully",
                "output": result.stdout
            }), 200
        else:
            error_msg = result.stderr if result.stderr else "Unknown error: no stderr output"
            return jsonify({
                "status": "error", 
                "message": "Email fetch failed",
                "error": error_msg,
                "return_code": result.returncode
            }), 500
            
    except subprocess.TimeoutExpired:
        print("Force update timeout after 5 minutes", flush=True)
        return jsonify({
            "status": "error", 
            "message": "Email fetch timed out after 5 minutes"
        }), 500
    except FileNotFoundError:
        print("fetch_latest.py script not found", flush=True)
        return jsonify({
            "status": "error", 
            "message": "Fetch script not found"
        }), 500
    except Exception as e:
        print("Exception in force_update:", str(e), flush=True)
        return jsonify({
            "status": "error", 
            "message": "Unexpected error during email fetch",
            "error": str(e)
        }), 500

def periodic_fetch():
    # Wait 5 minutes after startup before starting periodic fetches
    print("[Periodic Fetch] Waiting 5 minutes before starting periodic fetch...", flush=True)
    time.sleep(300)  # Wait 5 minutes for system to stabilize
    
    while True:
        print("=== [Periodic Fetch] Loop Start ===", flush=True)
        try:
            mem_usage = psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2
            print(f"[Periodic Fetch] Memory usage before: {mem_usage:.2f} MB", flush=True)
            
            # Much more aggressive memory threshold for Render
            if mem_usage > 200:  # Reduced from 350MB to 200MB for Render
                print(f"[Periodic Fetch] Memory usage exceeded 200MB, skipping this cycle.", flush=True)
                # Don't exit, just skip this cycle
                time.sleep(600)
                continue
            
            try:
                print("[Periodic Fetch] Starting email fetch process...", flush=True)
                # Use a shorter timeout for production stability
                result = subprocess.run(
                    ['python3', 'scripts/fetch_latest.py'],
                    capture_output=True,
                    text=True,
                    timeout=300  # Reduced to 5 minutes to prevent hanging
                )
                
                if result.stdout:
                    print(f"[Periodic Fetch] Script output:\n{result.stdout}", flush=True)
                if result.stderr:
                    print(f"[Periodic Fetch] Script errors:\n{result.stderr}", flush=True)
                    
                if result.returncode != 0:
                    print(f"[Periodic Fetch] Script failed with return code: {result.returncode}", flush=True)
                else:
                    print("[Periodic Fetch] Email fetch completed successfully", flush=True)
                    
            except subprocess.TimeoutExpired:
                print("[Periodic Fetch] Script timeout after 5 minutes, continuing...", flush=True)
                # Kill any hanging processes
                try:
                    subprocess.run(['pkill', '-f', 'fetch_latest.py'], timeout=10)
                except:
                    pass
            except FileNotFoundError:
                print("[Periodic Fetch] Error: fetch_latest.py not found", flush=True)
            except Exception as e:
                print(f"[Periodic Fetch] Error running subprocess: {e}", flush=True)
                
        except Exception as e:
            print(f"[Periodic Fetch] Unexpected error in periodic fetch loop: {e}", flush=True)
        
        # Force garbage collection after each cycle
        import gc
        gc.collect()
        
        try:
            mem_usage_after = psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2
            print(f"[Periodic Fetch] Memory usage after: {mem_usage_after:.2f} MB", flush=True)
            
            # Additional safety check after processing
            if mem_usage_after > 250:  # Even after cleanup, if still high, skip next few cycles
                print(f"[Periodic Fetch] Memory still high after cleanup ({mem_usage_after:.2f} MB), sleeping longer...", flush=True)
                time.sleep(1800)  # Sleep 30 minutes if memory is high
                continue
        except Exception as e:
            print(f"[Periodic Fetch] Error checking memory after fetch: {e}", flush=True)
            
        print("=== [Periodic Fetch] Loop End, sleeping 600s ===", flush=True)
        time.sleep(600)

@api_bp.route('/low_gp_products/<date>', methods=['GET'])
@token_required
@authorize_pharmacy
@memory_cleanup
def get_low_gp_products(date):
    """Get products with GP percentage below a threshold for a specific date."""
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    threshold = float(request.args.get('threshold', 20))  # Default threshold of 20%
    
    session = create_session()
    try:
        # Query daily stock sales for the specific date and pharmacy
        query = session.query(DailyStockSales).join(StockItem).filter(
            DailyStockSales.pharmacy_code == pharmacy,
            DailyStockSales.report_date == date,
            DailyStockSales.daily_gross_profit_percent < threshold,
            DailyStockSales.daily_gross_profit_percent.isnot(None),
            DailyStockSales.daily_sales_qty > 0  # Only include items that had sales
        ).order_by(DailyStockSales.daily_gross_profit_percent.asc())
        
        results = query.all()
        
        products = []
        for item in results:
            products.append({
                'stock_code': item.stock_item.stock_code,
                'description': item.stock_item.stock_name,
                'on_hand': item.closing_stock,
                'sales_qty': item.daily_sales_qty,
                'sales_value': item.daily_sales_value,
                'gp_percent': item.daily_gross_profit_percent,
                'gp_value': item.daily_gross_profit
            })
        
        return jsonify({
            'pharmacy': pharmacy,
            'date': date,
            'threshold': threshold,
            'count': len(products),
            'products': products
        })
        
    except Exception as e:
        print(f"[Low GP Products] Error: {e}", flush=True)
        return jsonify({'error': 'Failed to fetch low GP products'}), 500
    finally:
        session.close()

def start_periodic_fetch_once():
    # Only start in production environments and only in one process
    if os.environ.get("RENDER") == "true":
        # Only start periodic fetch in production on Render
        # Use a separate thread that won't block the main application
        threading.Thread(target=periodic_fetch, daemon=True).start()
        print("[Startup] Periodic fetch thread started for Render environment", flush=True)
    else:
        print("[Startup] Periodic fetch disabled for local development", flush=True)

start_periodic_fetch_once()

if __name__ == "__main__":
    from app import app
    app.run(host="0.0.0.0", port=5000) 