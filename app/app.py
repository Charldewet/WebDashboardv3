from flask import jsonify, request, Blueprint, Flask
from app.models import DailyReport
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

@api_bp.route('/turnover', methods=['GET'])
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
def get_opening_stock_for_range(start_date, end_date):
    pharmacy = request.headers.get('X-Pharmacy') or request.args.get('pharmacy')
    session = create_session()
    
    from datetime import datetime, timedelta
    import calendar
    
    try:
        # Parse the start_date to get the month and year
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
        year = start_date_obj.year
        month = start_date_obj.month
        
        # Get the last day of the month
        last_day_of_month = calendar.monthrange(year, month)[1]
        
        # Start checking from the 1st day of the month
        current_day = 1
        opening_stock = 0
        actual_date_used = start_date
        
        while current_day <= last_day_of_month:
            # Format the current date we're checking
            check_date = f"{year}-{month:02d}-{current_day:02d}"
            
            # Query for this specific date
            query = session.query(DailyReport).filter(
                DailyReport.pharmacy_code == pharmacy,
                DailyReport.report_date == check_date
            ).first()
            
            # Check if we found a valid opening stock value
            if query and query.opening_stock_today and query.opening_stock_today > 0:
                opening_stock = query.opening_stock_today
                actual_date_used = check_date
                break
            
            # Move to the next day
            current_day += 1
        
        session.close()
        
        return jsonify({
            'pharmacy': pharmacy,
            'opening_stock': round(opening_stock, 2),
            'date_requested': start_date,
            'actual_date_used': actual_date_used,
            'days_checked': current_day if opening_stock > 0 else last_day_of_month,
            'success': opening_stock > 0
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

@api_bp.route('/status', methods=['GET'])
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
            "timestamp": datetime.datetime.utcnow().isoformat(),
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
            "timestamp": datetime.datetime.utcnow().isoformat(),
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
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "error": str(e)
        }), 500

@api_bp.route('/force_update', methods=['POST'])
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
                    print(f"[Periodic Fetch] Script output: {result.stdout[-500:]}", flush=True)  # Only last 500 chars
                if result.stderr:
                    print(f"[Periodic Fetch] Script errors: {result.stderr[-500:]}", flush=True)  # Only last 500 chars
                    
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

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "https://webdashfront.onrender.com"}})
app.register_blueprint(api_bp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000) 