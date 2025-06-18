from flask import jsonify, request, Blueprint, g
from .models import DailyReport, StockSale, Product
from .db import create_session, cleanup_db_sessions
import os
import jwt
from datetime import datetime, timedelta
import sys
from sqlalchemy import func, desc
from functools import wraps
import gc

api_bp = Blueprint('api', __name__, url_prefix='/api')

SECRET_KEY = os.environ.get('SECRET_KEY', 'your_default_secret_key')

USERS = {
    "Charl": {
        "password": "Koeberg7#",
        "pharmacies": ["reitz", "roos", "tugela", "villiers", "winterton"]
    },
    "user": {
        "password": "password",
        "pharmacies": ["DUMMY1", "DUMMY2"]
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

def memory_cleanup(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        finally:
            try:
                gc.collect()
                cleanup_db_sessions()
            except Exception as e:
                print(f"[Memory] Cleanup error in {f.__name__}: {e}", flush=True)
    return decorated_function

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
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return jsonify({'message': 'Token is invalid or expired!'}), 401
        return f(*args, **kwargs)
    return decorated

def authorize_pharmacy(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        pharmacy_code = request.headers.get('X-Pharmacy')
        if not pharmacy_code:
            return jsonify({"error": "X-Pharmacy header is required"}), 400
        if pharmacy_code not in g.current_user['pharmacies']:
            return jsonify({"error": "You are not authorized to access this pharmacy"}), 403
        return f(*args, **kwargs)
    return decorated_function

# --- Route Definitions ---

@api_bp.route('/login', methods=['POST'])
@memory_cleanup
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Could not verify'}), 401
    user = USERS.get(data['username'])
    if user and user['password'] == data['password']:
        token = jwt.encode({'sub': data['username'], 'exp': datetime.utcnow() + timedelta(hours=8)}, SECRET_KEY, "HS256")
        return jsonify({'token': token})
    return jsonify({'message': 'Login failed!'}), 401

@api_bp.route('/pharmacies', methods=['GET'])
@token_required
def get_pharmacies():
    return jsonify(g.current_user['pharmacies'])

# ... (all other routes from app.py will be here)

@api_bp.route('/top_products_by_qty/<date>', methods=['GET'])
@token_required
@memory_cleanup
def get_top_products_by_qty(date):
    """Returns the top 10 products by quantity sold for a given date."""
    try:
        sale_date = datetime.strptime(date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    session = create_session()
    try:
        top_products = (
            session.query(
                Product.description,
                func.sum(StockSale.qty).label('total_qty')
            )
            .join(Product, StockSale.stock_code == Product.stock_code)
            .filter(StockSale.sale_date == sale_date)
            .group_by(Product.description)
            .order_by(desc('total_qty'))
            .limit(10)
            .all()
        )
        result = [{"product": desc, "quantity": float(qty)} for desc, qty in top_products]
        return jsonify(result)
    except Exception as e:
        print(f"Error fetching top products: {e}", file=sys.stderr)
        return jsonify({"error": "Could not retrieve top products data."}), 500
    finally:
        session.close()

# Note: All other route definitions from app.py should be pasted here.
# For brevity, I am only showing the new one and a few examples.
# The tool will move all of them. 