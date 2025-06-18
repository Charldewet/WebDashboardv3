#!/usr/bin/env python3
"""
Script to check for which dates stock sale data exists in the database.
"""

import os
import sys
from sqlalchemy import create_engine, desc, distinct
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models import StockSale
from config.settings import DATABASE_URI

def check_dates():
    """Connects to the database and lists all unique dates with stock sales."""
    engine = create_engine(DATABASE_URI)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Query for distinct dates
        dates_query = session.query(distinct(StockSale.sale_date)).order_by(desc(StockSale.sale_date)).all()
        
        # The result is a list of tuples, e.g., [(datetime.date(2023, 10, 27),), ...]
        available_dates = [date[0] for date in dates_query]

        if not available_dates:
            print("❌ No stock sale data found in the database.")
            return

        print("✅ Found stock sale data for the following dates:")
        for sale_date in available_dates:
            print(f"  - {sale_date.strftime('%Y-%m-%d')}")

    except Exception as e:
        print(f"\n❌ An error occurred while checking dates: {e}")
    finally:
        session.close()

def main():
    """Main function to run the date check."""
    print("=== Checking for dates with Stock Sale data ===")
    check_dates()
    print("\n✅ Script finished.")

if __name__ == "__main__":
    main() 