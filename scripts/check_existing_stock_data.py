#!/usr/bin/env python3
"""
Check what stock data already exists in the database and what needs to be imported.
"""

import os
import sys
from datetime import date

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def check_existing_tables():
    """Check what stock-related tables exist and their data."""
    print("🔍 Checking existing stock-related tables...")
    
    try:
        from app.db import create_session
        session = create_session()
        
        # Check all tables
        result = session.execute("SELECT name FROM sqlite_master WHERE type='table'")
        all_tables = [row[0] for row in result]
        
        print(f"✅ All tables found: {all_tables}")
        
        # Check stock-related tables specifically
        stock_tables = ['departments', 'stock_items', 'daily_stock_sales', 'processed_stock_sales', 'products']
        
        for table in stock_tables:
            if table in all_tables:
                # Count records
                count_result = session.execute(f"SELECT COUNT(*) FROM {table}")
                count = count_result.fetchone()[0]
                print(f"   📊 {table}: {count:,} records")
                
                # Show sample data for small tables
                if count <= 10:
                    sample_result = session.execute(f"SELECT * FROM {table} LIMIT 3")
                    columns = [description[0] for description in sample_result.description]
                    print(f"      Columns: {columns}")
                    for row in sample_result:
                        print(f"      Sample: {row}")
            else:
                print(f"   ❌ {table}: Not found")
        
        session.close()
        return all_tables
        
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        return []

def check_departments_data():
    """Check if departments have been imported."""
    print("\n🔍 Checking departments data...")
    
    try:
        from app.db import create_session
        session = create_session()
        
        # Check if departments table exists and has data
        result = session.execute("SELECT COUNT(*) FROM departments")
        count = result.fetchone()[0]
        
        if count > 0:
            print(f"✅ Departments: {count:,} records found")
            
            # Check if it looks like our data
            sample_result = session.execute("SELECT department_code, department_name FROM departments LIMIT 5")
            samples = sample_result.fetchall()
            
            print("   Sample departments:")
            for code, name in samples:
                print(f"     - {code}: {name}")
            
            # Check if we have the expected department codes
            expected_codes = ['000100', 'BAAA', 'BAAB', 'BAAC', 'BAAD']
            found_codes = []
            for code in expected_codes:
                result = session.execute("SELECT COUNT(*) FROM departments WHERE department_code = ?", (code,))
                if result.fetchone()[0] > 0:
                    found_codes.append(code)
            
            if len(found_codes) >= 3:
                print(f"   ✅ Found expected department codes: {found_codes}")
                return True
            else:
                print(f"   ⚠️  Missing some expected codes. Found: {found_codes}")
                return False
        else:
            print("   ❌ No departments found")
            return False
            
    except Exception as e:
        print(f"   ❌ Error checking departments: {e}")
        return False

def check_stock_items_data():
    """Check if stock items have been imported."""
    print("\n🔍 Checking stock items data...")
    
    try:
        from app.db import create_session
        session = create_session()
        
        # Check if stock_items table exists
        result = session.execute("SELECT COUNT(*) FROM stock_items")
        count = result.fetchone()[0]
        
        if count > 0:
            print(f"✅ Stock items: {count:,} records found")
            
            # Check pharmacy distribution
            pharmacy_result = session.execute("SELECT pharmacy_code, COUNT(*) FROM stock_items GROUP BY pharmacy_code")
            pharmacies = pharmacy_result.fetchall()
            
            print("   Stock items by pharmacy:")
            for pharmacy, count in pharmacies:
                print(f"     - {pharmacy}: {count:,} items")
            
            # Check if we have Reitz data
            reitz_result = session.execute("SELECT COUNT(*) FROM stock_items WHERE pharmacy_code = 'reitz'")
            reitz_count = reitz_result.fetchone()[0]
            
            if reitz_count > 0:
                print(f"   ✅ Reitz pharmacy: {reitz_count:,} stock items")
                return True
            else:
                print("   ❌ No Reitz pharmacy stock items found")
                return False
        else:
            print("   ❌ No stock items found")
            return False
            
    except Exception as e:
        print(f"   ❌ Error checking stock items: {e}")
        return False

def check_daily_sales_data():
    """Check if daily sales data exists."""
    print("\n🔍 Checking daily sales data...")
    
    try:
        from app.db import create_session
        session = create_session()
        
        # Check if daily_stock_sales table exists
        result = session.execute("SELECT COUNT(*) FROM daily_stock_sales")
        count = result.fetchone()[0]
        
        if count > 0:
            print(f"✅ Daily sales: {count:,} records found")
            
            # Check date range
            date_result = session.execute("SELECT MIN(report_date), MAX(report_date) FROM daily_stock_sales")
            date_range = date_result.fetchone()
            
            if date_range[0] and date_range[1]:
                print(f"   Date range: {date_range[0]} to {date_range[1]}")
            
            # Check pharmacy distribution
            pharmacy_result = session.execute("SELECT pharmacy_code, COUNT(*) FROM daily_stock_sales GROUP BY pharmacy_code")
            pharmacies = pharmacy_result.fetchall()
            
            print("   Daily sales by pharmacy:")
            for pharmacy, count in pharmacies:
                print(f"     - {pharmacy}: {count:,} records")
            
            return True
        else:
            print("   ❌ No daily sales records found")
            return False
            
    except Exception as e:
        print(f"   ❌ Error checking daily sales: {e}")
        return False

def check_other_stock_tables():
    """Check other stock-related tables that might exist."""
    print("\n🔍 Checking other stock-related tables...")
    
    try:
        from app.db import create_session
        session = create_session()
        
        # Check processed_stock_sales
        try:
            result = session.execute("SELECT COUNT(*) FROM processed_stock_sales")
            count = result.fetchone()[0]
            print(f"   processed_stock_sales: {count:,} records")
        except:
            print("   processed_stock_sales: Table not found")
        
        # Check products
        try:
            result = session.execute("SELECT COUNT(*) FROM products")
            count = result.fetchone()[0]
            print(f"   products: {count:,} records")
        except:
            print("   products: Table not found")
        
        session.close()
        
    except Exception as e:
        print(f"   ❌ Error checking other tables: {e}")

def provide_recommendations():
    """Provide recommendations based on what's already set up."""
    print("\n📋 Recommendations:")
    
    # Check what's already done
    dept_ok = check_departments_data()
    stock_ok = check_stock_items_data()
    sales_ok = check_daily_sales_data()
    
    print("\n🎯 Current Status:")
    print(f"   Departments: {'✅ Complete' if dept_ok else '❌ Missing'}")
    print(f"   Stock Items: {'✅ Complete' if stock_ok else '❌ Missing'}")
    print(f"   Daily Sales: {'✅ Complete' if sales_ok else '❌ Missing'}")
    
    if dept_ok and stock_ok and sales_ok:
        print("\n🎉 Stock database appears to be fully set up!")
        print("   You can now use the stock management API endpoints.")
    elif dept_ok and stock_ok:
        print("\n📈 Stock database partially set up:")
        print("   ✅ Departments and stock items imported")
        print("   ❌ Daily sales data missing")
        print("   📋 Run: python scripts/import_large_stock_data.py")
    elif dept_ok:
        print("\n📦 Stock database partially set up:")
        print("   ✅ Departments imported")
        print("   ❌ Stock items missing")
        print("   📋 Run: python scripts/import_large_stock_data.py")
    else:
        print("\n🚀 Stock database not set up:")
        print("   📋 Run: python scripts/deploy_stock_database.py")

def main():
    """Main function."""
    print("🔍 Stock Database Status Check")
    print("=" * 50)
    
    # Check existing tables
    tables = check_existing_tables()
    
    # Check specific data
    check_other_stock_tables()
    
    # Provide recommendations
    provide_recommendations()
    
    print("\n" + "=" * 50)
    print("✅ Status check complete")

if __name__ == "__main__":
    main() 