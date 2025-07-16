#!/usr/bin/env python3
"""
Script to delete sales data for a specific pharmacy and date.
Usage: python scripts/delete_sales_data.py <pharmacy_code> <date>
Example: python scripts/delete_sales_data.py reitz 2025-07-06
"""

import os
import sys
from datetime import datetime

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import create_session
from app.models import DailyReport

def delete_sales_data(pharmacy_code, date_str):
    """
    Delete sales data for a specific pharmacy and date.
    
    Args:
        pharmacy_code (str): The pharmacy code (e.g., 'reitz', 'roos', etc.)
        date_str (str): Date in YYYY-MM-DD format
    """
    try:
        # Parse the date
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Create database session
        session = create_session()
        
        # Find the record to delete
        report = session.query(DailyReport).filter(
            DailyReport.pharmacy_code == pharmacy_code,
            DailyReport.report_date == date_obj
        ).first()
        
        if report:
            # Show what we're about to delete
            print(f"Found sales data for {pharmacy_code} on {date_str}:")
            print(f"  - Total Turnover: R{report.total_turnover_today or 0:.2f}")
            print(f"  - Cash Sales: R{report.cash_sales_today or 0:.2f}")
            print(f"  - Account Sales: R{report.account_sales_today or 0:.2f}")
            print(f"  - Transactions: {report.sales_total_trans_today or 0}")
            print(f"  - Scripts Dispensed: {report.scripts_dispensed_today or 0}")
            
            # Confirm deletion
            confirm = input(f"\nAre you sure you want to delete this data? (yes/no): ").lower().strip()
            
            if confirm in ['yes', 'y']:
                session.delete(report)
                session.commit()
                print(f"✅ Successfully deleted sales data for {pharmacy_code} on {date_str}")
            else:
                print("❌ Deletion cancelled")
                session.close()
                return
        else:
            print(f"❌ No sales data found for {pharmacy_code} on {date_str}")
        
        session.close()
        
    except ValueError as e:
        print(f"❌ Error: Invalid date format. Please use YYYY-MM-DD format (e.g., 2025-07-06)")
        print(f"Error details: {e}")
    except Exception as e:
        print(f"❌ Error deleting sales data: {e}")
        if 'session' in locals() and session.is_active:
            session.rollback()
            session.close()

def main():
    if len(sys.argv) != 3:
        print("Usage: python scripts/delete_sales_data.py <pharmacy_code> <date>")
        print("Example: python scripts/delete_sales_data.py reitz 2025-07-06")
        sys.exit(1)
    
    pharmacy_code = sys.argv[1].lower()
    date_str = sys.argv[2]
    
    # Validate pharmacy code
    valid_pharmacies = ['reitz', 'roos', 'tugela', 'villiers', 'winterton']
    if pharmacy_code not in valid_pharmacies:
        print(f"❌ Error: Invalid pharmacy code '{pharmacy_code}'")
        print(f"Valid pharmacy codes: {', '.join(valid_pharmacies)}")
        sys.exit(1)
    
    print(f"🗑️  Deleting sales data for {pharmacy_code} on {date_str}")
    print("=" * 50)
    
    delete_sales_data(pharmacy_code, date_str)

if __name__ == "__main__":
    main() 