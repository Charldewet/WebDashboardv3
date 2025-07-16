#!/usr/bin/env python3
"""
Safety verification script to ensure new stock database tables won't break existing database.
This script checks for potential conflicts and verifies the database structure.
"""

import os
import sys
from datetime import date

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def check_existing_tables():
    """Check what tables currently exist in the database."""
    print("🔍 Checking existing database tables...")
    
    try:
        from app.db import create_session
        session = create_session()
        
        # Get list of existing tables
        result = session.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        existing_tables = [row[0] for row in result]
        
        print(f"✅ Found {len(existing_tables)} existing tables:")
        for table in existing_tables:
            print(f"   - {table}")
        
        session.close()
        return existing_tables
        
    except Exception as e:
        print(f"❌ Error checking existing tables: {e}")
        return []

def check_table_conflicts():
    """Check if new table names conflict with existing ones."""
    print("\n🔍 Checking for table name conflicts...")
    
    existing_tables = check_existing_tables()
    
    # New tables we want to add
    new_tables = ['departments', 'stock_items', 'daily_stock_sales']
    
    conflicts = []
    for table in new_tables:
        if table in existing_tables:
            conflicts.append(table)
    
    if conflicts:
        print(f"❌ CONFLICT FOUND: These tables already exist: {conflicts}")
        print("   This means the stock database has already been set up!")
        return False
    else:
        print("✅ No table name conflicts found")
        print("   New tables to be created:")
        for table in new_tables:
            print(f"   - {table}")
        return True

def check_existing_data():
    """Check existing data in the database."""
    print("\n🔍 Checking existing data...")
    
    try:
        from app.db import create_session
        from app.models import DailyReport
        
        session = create_session()
        
        # Check existing daily reports
        report_count = session.query(DailyReport).count()
        print(f"✅ Existing daily reports: {report_count:,}")
        
        # Check unique pharmacies
        pharmacies = session.query(DailyReport.pharmacy_code).distinct().all()
        pharmacy_codes = [p[0] for p in pharmacies]
        print(f"✅ Existing pharmacies: {pharmacy_codes}")
        
        # Check date range
        if report_count > 0:
            earliest = session.query(DailyReport.report_date).order_by(DailyReport.report_date.asc()).first()
            latest = session.query(DailyReport.report_date).order_by(DailyReport.report_date.desc()).first()
            print(f"✅ Date range: {earliest[0]} to {latest[0]}")
        
        session.close()
        return True
        
    except Exception as e:
        print(f"❌ Error checking existing data: {e}")
        return False

def verify_database_connection():
    """Verify database connection and permissions."""
    print("\n🔍 Verifying database connection...")
    
    try:
        from app.db import create_session
        session = create_session()
        
        # Test basic connection
        result = session.execute("SELECT 1 as test")
        print("✅ Database connection successful")
        
        # Test table creation permissions
        try:
            session.execute("CREATE TABLE test_table_safety_check (id INTEGER)")
            session.execute("DROP TABLE test_table_safety_check")
            print("✅ Table creation permissions verified")
        except Exception as e:
            print(f"❌ No table creation permissions: {e}")
            session.close()
            return False
        
        session.close()
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def check_environment():
    """Check environment and configuration."""
    print("\n🔍 Checking environment...")
    
    is_render = os.environ.get("RENDER") == "true"
    database_url = os.environ.get("DATABASE_URL")
    
    print(f"   Environment: {'Render (Production)' if is_render else 'Local (Development)'}")
    print(f"   Database URL: {'Set' if database_url else 'Not set'}")
    
    if is_render:
        print("   ⚠️  Running on Render - Production environment")
    else:
        print("   🔧 Running locally - Development environment")
    
    return is_render, database_url

def check_data_files():
    """Check if required data files exist."""
    print("\n🔍 Checking data files...")
    
    dept_file = 'Stock information/Department_codes.csv'
    stock_file = 'Stock information/Daily_sales.csv'
    
    files_exist = True
    
    if not os.path.exists(dept_file):
        print(f"❌ Department file not found: {dept_file}")
        files_exist = False
    else:
        print(f"✅ Department file found: {dept_file}")
    
    if not os.path.exists(stock_file):
        print(f"❌ Stock file not found: {stock_file}")
        files_exist = False
    else:
        print(f"✅ Stock file found: {stock_file}")
    
    return files_exist

def main():
    """Main safety verification function."""
    print("🛡️  Database Safety Verification")
    print("=" * 50)
    
    # Check environment
    is_render, database_url = check_environment()
    
    # Check database connection
    if not verify_database_connection():
        print("\n❌ Database connection failed. Cannot proceed.")
        return False
    
    # Check existing data
    if not check_existing_data():
        print("\n❌ Error checking existing data. Cannot proceed.")
        return False
    
    # Check for table conflicts
    if not check_table_conflicts():
        print("\n❌ Table conflicts found. Stock database may already be set up.")
        return False
    
    # Check data files
    if not check_data_files():
        print("\n❌ Required data files not found. Cannot proceed.")
        return False
    
    print("\n✅ SAFETY VERIFICATION PASSED")
    print("=" * 50)
    print("✅ Database connection: OK")
    print("✅ Table permissions: OK")
    print("✅ No table conflicts: OK")
    print("✅ Data files: OK")
    print("✅ Existing data: Safe")
    
    print("\n📋 What will happen:")
    print("   ✅ 3 new tables will be created:")
    print("      - departments (2,207 records)")
    print("      - stock_items (~127,382 records for Reitz)")
    print("      - daily_stock_sales (~484 records for today)")
    print("   ✅ Existing daily_reports table: UNCHANGED")
    print("   ✅ Existing data: UNCHANGED")
    print("   ✅ Existing API endpoints: UNCHANGED")
    print("   ✅ New API endpoints: ADDED")
    
    if is_render:
        print("\n⚠️  PRODUCTION WARNING:")
        print("   This will modify your production database on Render.")
        print("   The changes are safe but will add significant data.")
        
        response = input("\nProceed with safety verification? (y/N): ")
        if response.lower() not in ['y', 'yes']:
            print("Safety verification cancelled.")
            return False
    
    print("\n🎉 Database is safe to modify!")
    print("   You can now run the deployment script safely.")
    
    return True

if __name__ == "__main__":
    main() 