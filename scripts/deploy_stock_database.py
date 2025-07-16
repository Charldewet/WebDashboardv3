#!/usr/bin/env python3
"""
Deployment script for setting up the stock database on Render.
This script will create the necessary tables and import initial data.
"""

import os
import sys
from datetime import date

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def check_environment():
    """Check if we're running on Render and verify environment variables."""
    print("🔍 Checking environment...")
    
    is_render = os.environ.get("RENDER") == "true"
    database_url = os.environ.get("DATABASE_URL")
    
    print(f"   Environment: {'Render (Production)' if is_render else 'Local (Development)'}")
    print(f"   Database URL: {'Set' if database_url else 'Not set'}")
    
    if not database_url:
        print("⚠️  Warning: DATABASE_URL not set. Using default SQLite database.")
    
    return is_render, database_url

def setup_database():
    """Set up the database tables."""
    print("\n🗄️  Setting up database tables...")
    
    try:
        from app.db import setup_db
        from app.models import Base
        
        # Create all tables
        setup_db()
        print("✅ Database tables created successfully")
        
        # Verify tables exist
        from app.db import create_session
        session = create_session()
        
        # Check if tables exist by trying to query them
        try:
            session.execute("SELECT 1 FROM departments LIMIT 1")
            session.execute("SELECT 1 FROM stock_items LIMIT 1")
            session.execute("SELECT 1 FROM daily_stock_sales LIMIT 1")
            print("✅ All stock management tables verified")
        except Exception as e:
            print(f"⚠️  Warning: Some tables may not exist: {e}")
        finally:
            session.close()
            
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False
    
    return True

def import_initial_data():
    """Import initial data for Reitz pharmacy."""
    print("\n📦 Importing initial data for Reitz pharmacy...")
    
    # Check if data files exist
    dept_file = 'Stock information/Department_codes.csv'
    stock_file = 'Stock information/Daily_sales.csv'
    
    if not os.path.exists(dept_file):
        print(f"❌ Department file not found: {dept_file}")
        print("   Please ensure the file exists before running this script.")
        return False
    
    if not os.path.exists(stock_file):
        print(f"❌ Stock file not found: {stock_file}")
        print("   Please ensure the file exists before running this script.")
        return False
    
    try:
        # Import the large stock data module
        from scripts.import_large_stock_data import (
            import_departments,
            import_stock_items,
            import_daily_sales
        )
        
        from app.db import create_session
        session = create_session()
        
        # Import departments
        print("   Importing departments...")
        dept_count = import_departments(session, dept_file)
        
        # Import stock items for Reitz
        print("   Importing stock items for Reitz...")
        stock_count = import_stock_items(session, stock_file, "reitz")
        
        # Import daily sales for today
        print("   Importing daily sales...")
        sales_count = import_daily_sales(session, stock_file, "reitz", date.today())
        
        session.close()
        
        print(f"✅ Import completed successfully:")
        print(f"   Departments: {dept_count}")
        print(f"   Stock Items: {stock_count}")
        print(f"   Daily Sales: {sales_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error importing data: {e}")
        return False

def verify_deployment():
    """Verify the deployment was successful."""
    print("\n🔍 Verifying deployment...")
    
    try:
        from app.db import create_session
        from app.models import Department, StockItem, DailyStockSales
        
        session = create_session()
        
        # Check table counts
        dept_count = session.query(Department).count()
        stock_count = session.query(StockItem).filter_by(pharmacy_code="reitz").count()
        sales_count = session.query(DailyStockSales).filter_by(pharmacy_code="reitz").count()
        
        session.close()
        
        print(f"✅ Verification results:")
        print(f"   Departments: {dept_count}")
        print(f"   Stock Items (Reitz): {stock_count}")
        print(f"   Daily Sales (Reitz): {sales_count}")
        
        # Basic validation
        if dept_count < 2000:
            print("⚠️  Warning: Department count seems low (expected ~2,207)")
        
        if stock_count < 100000:
            print("⚠️  Warning: Stock item count seems low (expected ~127,382)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        return False

def main():
    """Main deployment function."""
    print("🚀 Stock Database Deployment Script")
    print("=" * 50)
    
    # Check environment
    is_render, database_url = check_environment()
    
    if is_render:
        print("\n🎯 Running on Render - Production deployment")
    else:
        print("\n🔧 Running locally - Development deployment")
    
    # Confirm deployment
    if is_render:
        response = input("\n⚠️  This will deploy to PRODUCTION. Continue? (y/N): ")
        if response.lower() not in ['y', 'yes']:
            print("Deployment cancelled.")
            return
    else:
        response = input("\nContinue with local deployment? (y/N): ")
        if response.lower() not in ['y', 'yes']:
            print("Deployment cancelled.")
            return
    
    print("\n🔄 Starting deployment process...")
    
    # Step 1: Setup database
    if not setup_database():
        print("❌ Database setup failed. Deployment aborted.")
        return
    
    # Step 2: Import data
    if not import_initial_data():
        print("❌ Data import failed. Deployment aborted.")
        return
    
    # Step 3: Verify deployment
    if not verify_deployment():
        print("❌ Deployment verification failed.")
        return
    
    print("\n🎉 Deployment completed successfully!")
    
    if is_render:
        print("\n📋 Next steps:")
        print("   1. Test the API endpoints")
        print("   2. Verify data in your application")
        print("   3. Monitor database performance")
        print("   4. Set up regular backups")
    else:
        print("\n📋 Next steps:")
        print("   1. Test the API endpoints locally")
        print("   2. Deploy to Render when ready")
        print("   3. Run this script on Render")

if __name__ == "__main__":
    main() 