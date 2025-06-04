from flask import jsonify, request, Blueprint, Flask
from app.models import DailyReport
from app.db import create_session
import subprocess
import threading
import time
import os
import psutil
from flask_cors import CORS

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

@api_bp.route('/force_update', methods=['POST'])
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
        print("=== [Periodic Fetch] Loop End, sleeping 120s ===", flush=True)
        time.sleep(120)

# Start the periodic fetch thread on app import (works with Gunicorn/Render)
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
CORS(app, origins=["https://webdashfront.onrender.com"])
app.register_blueprint(api_bp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000) 