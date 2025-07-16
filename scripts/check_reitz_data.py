#!/usr/bin/env python3
"""
Quick script to check what data exists for Reitz pharmacy
"""

import os
import sys
from datetime import datetime, timedelta

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import create_session
from app.models import DailyReport

def check_reitz_data():
    session = create_session()
    
    try:
        # Get all Reitz data
        reitz_data = session.query(DailyReport).filter(
            DailyReport.pharmacy_code == 'reitz'
        ).order_by(DailyReport.report_date.desc()).limit(10).all()
        
        print("📊 Recent Reitz Pharmacy Data:")
        print("=" * 50)
        
        if not reitz_data:
            print("❌ No data found for Reitz pharmacy")
        else:
            for record in reitz_data:
                print(f"📅 {record.report_date.strftime('%Y-%m-%d')} - Turnover: R{record.total_turnover_today or 0:.2f}")
        
        # Check specifically for July 2025
        july_2025_data = session.query(DailyReport).filter(
            DailyReport.pharmacy_code == 'reitz',
            DailyReport.report_date >= datetime(2025, 7, 1).date(),
            DailyReport.report_date <= datetime(2025, 7, 31).date()
        ).order_by(DailyReport.report_date).all()
        
        print(f"\n📅 July 2025 Reitz Data ({len(july_2025_data)} records):")
        print("=" * 50)
        
        if not july_2025_data:
            print("❌ No data found for Reitz pharmacy in July 2025")
        else:
            for record in july_2025_data:
                print(f"📅 {record.report_date.strftime('%Y-%m-%d')} - Turnover: R{record.total_turnover_today or 0:.2f}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    check_reitz_data() 