#!/usr/bin/env python3
"""
Simple script to run the complete stock data import process.
This will import your actual data from the Stock information folder.
"""

import os
import sys
from datetime import date

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from scripts.import_actual_stock_data import (
    import_departments_from_csv,
    import_stock_items_from_daily_sales,
    import_daily_sales_data,
    analyze_daily_sales_structure
)
from app.db import create_session, setup_db

def main():
    print("=== Stock Data Import Process ===")
    print("This will import your actual data from the Stock information folder.")
    print()
    
    # Check if files exist
    dept_file = 'Stock information/Department_codes.csv'
    sales_file = 'Stock information/Daily_sales.csv'
    
    if not os.path.exists(dept_file):
        print(f"❌ Error: Department file not found: {dept_file}")
        return
    
    if not os.path.exists(sales_file):
        print(f"❌ Error: Sales file not found: {sales_file}")
        return
    
    print("✅ Found data files:")
    print(f"   - {dept_file}")
    print(f"   - {sales_file}")
    print()
    
    # Ask user for pharmacy code
    pharmacy_code = input("Enter pharmacy code (default: reitz): ").strip() or "reitz"
    
    # Ask user for report date
    report_date_str = input("Enter report date (YYYY-MM-DD, default: today): ").strip()
    if report_date_str:
        try:
            from datetime import datetime
            report_date = datetime.strptime(report_date_str, '%Y-%m-%d').date()
        except ValueError:
            print("❌ Invalid date format. Using today's date.")
            report_date = date.today()
    else:
        report_date = date.today()
    
    print(f"\n📊 Importing data for pharmacy: {pharmacy_code}")
    print(f"📅 Report date: {report_date}")
    print()
    
    # Confirm with user
    confirm = input("Proceed with import? (y/N): ").strip().lower()
    if confirm != 'y':
        print("Import cancelled.")
        return
    
    print("\n🚀 Starting import process...")
    print()
    
    session = create_session()
    
    try:
        # Step 1: Analyze data structure
        print("📋 Step 1: Analyzing data structure...")
        analyze_daily_sales_structure(sales_file)
        print()
        
        # Step 2: Import departments
        print("🏢 Step 2: Importing departments...")
        import_departments_from_csv(session, dept_file)
        print()
        
        # Step 3: Import stock items
        print("📦 Step 3: Importing stock items...")
        import_stock_items_from_daily_sales(session, sales_file, pharmacy_code)
        print()
        
        # Step 4: Import daily sales
        print("💰 Step 4: Importing daily sales...")
        import_daily_sales_data(session, sales_file, pharmacy_code, report_date)
        print()
        
        print("✅ Import process completed successfully!")
        print()
        print("📈 Your data is now available in the database.")
        print("🔗 You can access it through the API endpoints:")
        print("   - GET /api/departments")
        print("   - GET /api/stock-items")
        print("   - GET /api/daily-stock-sales/<start_date>/<end_date>")
        print("   - GET /api/stock-summary/<start_date>/<end_date>")
        
    except Exception as e:
        print(f"❌ Error during import: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    main() 