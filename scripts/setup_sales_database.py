#!/usr/bin/env python3
"""
Script to set up the new sales database tables for stock management and sales history.
This script will create the new tables and can be used to populate initial data.
"""

import os
import sys
from datetime import date

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import create_session, setup_db
from app.models import Department, StockItem, DailyStockSales

def create_sample_departments(session):
    """Create sample departments for testing"""
    departments = [
        {
            "department_code": "PHARM",
            "department_name": "Pharmacy",
            "description": "Prescription medications and pharmaceutical products"
        },
        {
            "department_code": "OTC",
            "department_name": "Over the Counter",
            "description": "Non-prescription medications and health products"
        },
        {
            "department_code": "COSMETIC",
            "department_name": "Cosmetics",
            "description": "Beauty and personal care products"
        },
        {
            "department_code": "SUPPLEMENTS",
            "department_name": "Supplements",
            "description": "Vitamins, minerals, and dietary supplements"
        },
        {
            "department_code": "MEDICAL",
            "department_name": "Medical Supplies",
            "description": "Medical devices and supplies"
        }
    ]
    
    for dept_data in departments:
        # Check if department already exists
        existing = session.query(Department).filter_by(department_code=dept_data["department_code"]).first()
        if not existing:
            department = Department(**dept_data)
            session.add(department)
            print(f"Created department: {dept_data['department_name']}")
        else:
            print(f"Department already exists: {dept_data['department_name']}")
    
    session.commit()

def create_sample_stock_items(session):
    """Create sample stock items for testing"""
    # Get department IDs
    pharmacy_dept = session.query(Department).filter_by(department_code="PHARM").first()
    otc_dept = session.query(Department).filter_by(department_code="OTC").first()
    
    if not pharmacy_dept or not otc_dept:
        print("Error: Required departments not found. Please run create_sample_departments first.")
        return
    
    stock_items = [
        {
            "stock_code": "PAN001",
            "stock_name": "Panado 500mg Tablets",
            "department_id": otc_dept.id,
            "pharmacy_code": "reitz",
            "annual_sales_qty": 1200,
            "annual_sales_value": 4800.00,
            "avg_monthly_sales": 100,
            "unit_cost": 3.50,
            "unit_price": 4.00,
            "last_updated": date.today()
        },
        {
            "stock_code": "ASP002",
            "stock_name": "Aspirin 100mg Tablets",
            "department_id": otc_dept.id,
            "pharmacy_code": "reitz",
            "annual_sales_qty": 800,
            "annual_sales_value": 3200.00,
            "avg_monthly_sales": 67,
            "unit_cost": 3.00,
            "unit_price": 4.00,
            "last_updated": date.today()
        },
        {
            "stock_code": "VIT001",
            "stock_name": "Vitamin C 1000mg",
            "department_id": pharmacy_dept.id,
            "pharmacy_code": "reitz",
            "annual_sales_qty": 600,
            "annual_sales_value": 9000.00,
            "avg_monthly_sales": 50,
            "unit_cost": 12.00,
            "unit_price": 15.00,
            "last_updated": date.today()
        }
    ]
    
    for item_data in stock_items:
        # Check if stock item already exists
        existing = session.query(StockItem).filter_by(
            stock_code=item_data["stock_code"],
            pharmacy_code=item_data["pharmacy_code"]
        ).first()
        
        if not existing:
            stock_item = StockItem(**item_data)
            session.add(stock_item)
            print(f"Created stock item: {item_data['stock_name']}")
        else:
            print(f"Stock item already exists: {item_data['stock_name']}")
    
    session.commit()

def main():
    print("=== Setting up Sales Database ===")
    
    try:
        # Create all tables
        print("Creating database tables...")
        setup_db()
        print("Tables created successfully!")
        
        # Create sample data
        session = create_session()
        
        print("\nCreating sample departments...")
        create_sample_departments(session)
        
        print("\nCreating sample stock items...")
        create_sample_stock_items(session)
        
        print("\n=== Database Setup Complete ===")
        print("The following tables have been created:")
        print("- departments")
        print("- stock_items") 
        print("- daily_stock_sales")
        print("\nSample data has been added for testing.")
        
    except Exception as e:
        print(f"Error setting up database: {e}")
        if 'session' in locals():
            session.rollback()
    finally:
        if 'session' in locals():
            session.close()

if __name__ == "__main__":
    main() 