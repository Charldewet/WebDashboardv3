import os
import sys
import random
from datetime import date, timedelta
from faker import Faker

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import create_session
from app.models import DailyReport

fake = Faker()

def generate_data_for_pharmacy(session, pharmacy_code, base_turnover):
    """
    Generates two years of dummy data for a single pharmacy.
    """
    print(f"Generating data for {pharmacy_code}...")
    today = date.today()
    start_date = today - timedelta(days=365 * 2)
    
    # Initial stock value, based on average daily cost of sales.
    # This ensures the first day's data is consistent with the rest.
    avg_cos_percentage = (0.65 + 0.78) / 2
    initial_cost_of_sales = base_turnover * avg_cos_percentage
    current_stock = initial_cost_of_sales * random.uniform(0.75, 1.25)

    for i in range((today - start_date).days + 1):
        current_date = start_date + timedelta(days=i)
        
        # Skip Sundays
        if current_date.weekday() == 6:
            continue

        # Check if data already exists
        exists = session.query(DailyReport).filter_by(pharmacy_code=pharmacy_code, report_date=current_date).first()
        if exists:
            continue
            
        # Seasonal and weekly variation
        month = current_date.month
        day_of_week = current_date.weekday()

        seasonality = 1.0
        if month == 12: seasonality = 1.25  # December peak
        if month in [1, 2]: seasonality = 0.85 # Post-holiday slump
        
        daily_factor = 1.0
        if day_of_week == 5: daily_factor = 0.5  # Saturday half-day
        if day_of_week == 4: daily_factor = 1.15 # Friday rush
        
        # Base turnover for the day
        turnover = base_turnover * seasonality * daily_factor * random.uniform(0.9, 1.1)
        
        # Financials
        cost_of_sales_percentage = random.uniform(0.65, 0.78)
        gp_percent = (1 - cost_of_sales_percentage) * 100
        cost_of_sales = turnover * cost_of_sales_percentage
        gp_value = turnover - cost_of_sales
        
        opening_stock = current_stock
        # Per user request: closing stock should be around cost of sales (+- 25%)
        closing_stock = cost_of_sales * random.uniform(0.75, 1.25)
        
        # Adjustments are a small random factor
        adjustments = turnover * random.uniform(-0.01, 0.01)
        
        # Purchases are calculated to balance the stock equation:
        # closing = opening + purchases - cost_of_sales + adjustments
        purchases = closing_stock - opening_stock + cost_of_sales - adjustments
        
        current_stock = closing_stock # Carry over for next day
        
        # Basket and transaction metrics
        avg_basket_value = random.uniform(250, 450)
        transactions = int(turnover / avg_basket_value) if avg_basket_value > 0 else 0
        avg_basket_size = random.uniform(2.1, 3.5)
        
        # Dispensary metrics
        dispensary_turnover_percent = random.uniform(0.4, 0.6)
        dispensary_turnover = turnover * dispensary_turnover_percent
        scripts_dispensed = int(dispensary_turnover / random.uniform(300, 500))
        
        # Sales and tenders
        cash_sales = turnover * random.uniform(0.4, 0.6)
        account_sales = turnover - cash_sales
        cash_tenders = cash_sales * random.uniform(0.95, 1.05)
        card_tenders = (turnover - cash_tenders) * random.uniform(0.98, 1.02)
        
        report = DailyReport(
            pharmacy_code=pharmacy_code,
            report_date=current_date,
            total_turnover_today=turnover,
            pos_turnover_today=turnover,
            stock_sales_today=turnover,
            cost_of_sales_today=cost_of_sales,
            stock_gross_profit_today=gp_value,
            stock_gross_profit_percent_today=gp_percent,
            stock_purchases_today=purchases,
            stock_adjustments_today=adjustments,
            opening_stock_today=opening_stock,
            closing_stock_today=closing_stock,
            avg_value_per_basket=avg_basket_value,
            avg_items_per_basket=avg_basket_size,
            sales_total_trans_today=transactions,
            dispensary_turnover_today=dispensary_turnover,
            scripts_dispensed_today=scripts_dispensed,
            cash_sales_today=cash_sales,
            account_sales_today=account_sales,
            cash_tenders_today=cash_tenders,
            credit_card_tenders_today=card_tenders,
            # Add small random values for other fields if needed
            cod_payments_today=turnover * random.uniform(0.01, 0.03),
            receipt_on_account_today=turnover * random.uniform(0.05, 0.1),
            paid_outs_today=turnover * random.uniform(0.005, 0.01),
        )
        session.add(report)

    print(f"Data generation for {pharmacy_code} complete.")


if __name__ == "__main__":
    session = create_session()
    
    pharmacies_to_generate = {
        "DUMMY1": 25000000 / 287, # Approx R25m annual / working days
        "DUMMY2": 16000000 / 287  # Approx R16m annual / working days
    }

    try:
        for code, avg_turnover in pharmacies_to_generate.items():
            generate_data_for_pharmacy(session, code, avg_turnover)
        
        print("Committing changes to the database...")
        session.commit()
        print("Dummy data generation successful!")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        session.rollback()
    finally:
        session.close()
        print("Database session closed.") 