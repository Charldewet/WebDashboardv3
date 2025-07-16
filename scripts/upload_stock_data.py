#!/usr/bin/env python3
"""
Script to upload stock data from CSV files and manage the stock database.
Supports uploading:
1. Department data
2. Stock items with 12-month sales history
3. Daily sales reports
"""

import os
import sys
import csv
from datetime import date, datetime
import argparse

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import create_session
from app.models import Department, StockItem, DailyStockSales

def upload_departments_from_csv(session, csv_file_path):
    """Upload departments from CSV file"""
    print(f"Uploading departments from: {csv_file_path}")
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # Check if department already exists
            existing = session.query(Department).filter_by(department_code=row['department_code']).first()
            
            if existing:
                # Update existing department
                existing.department_name = row['department_name']
                existing.description = row.get('description', '')
                existing.is_active = int(row.get('is_active', 1))
                print(f"Updated department: {row['department_name']}")
            else:
                # Create new department
                department = Department(
                    department_code=row['department_code'],
                    department_name=row['department_name'],
                    description=row.get('description', ''),
                    is_active=int(row.get('is_active', 1))
                )
                session.add(department)
                print(f"Created department: {row['department_name']}")
    
    session.commit()
    print("Department upload complete!")

def upload_stock_items_from_csv(session, csv_file_path):
    """Upload stock items from CSV file"""
    print(f"Uploading stock items from: {csv_file_path}")
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # Get department
            department = session.query(Department).filter_by(department_code=row['department_code']).first()
            if not department:
                print(f"Warning: Department {row['department_code']} not found for item {row['stock_code']}")
                continue
            
            # Check if stock item already exists
            existing = session.query(StockItem).filter_by(
                stock_code=row['stock_code'],
                pharmacy_code=row['pharmacy_code']
            ).first()
            
            # Calculate average monthly sales
            annual_qty = float(row.get('annual_sales_qty', 0))
            avg_monthly = annual_qty / 12 if annual_qty > 0 else 0
            
            stock_data = {
                'stock_code': row['stock_code'],
                'stock_name': row['stock_name'],
                'department_id': department.id,
                'pharmacy_code': row['pharmacy_code'],
                'annual_sales_qty': annual_qty,
                'annual_sales_value': float(row.get('annual_sales_value', 0)),
                'avg_monthly_sales': avg_monthly,
                'unit_cost': float(row.get('unit_cost', 0)),
                'unit_price': float(row.get('unit_price', 0)),
                'last_updated': date.today()
            }
            
            if existing:
                # Update existing item
                for key, value in stock_data.items():
                    setattr(existing, key, value)
                print(f"Updated stock item: {row['stock_name']}")
            else:
                # Create new item
                stock_item = StockItem(**stock_data)
                session.add(stock_item)
                print(f"Created stock item: {row['stock_name']}")
    
    session.commit()
    print("Stock items upload complete!")

def upload_daily_sales_from_csv(session, csv_file_path):
    """Upload daily sales data from CSV file"""
    print(f"Uploading daily sales from: {csv_file_path}")
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # Get stock item
            stock_item = session.query(StockItem).filter_by(
                stock_code=row['stock_code'],
                pharmacy_code=row['pharmacy_code']
            ).first()
            
            if not stock_item:
                print(f"Warning: Stock item {row['stock_code']} not found for pharmacy {row['pharmacy_code']}")
                continue
            
            # Parse date
            try:
                report_date = datetime.strptime(row['report_date'], '%Y-%m-%d').date()
            except ValueError:
                print(f"Warning: Invalid date format for {row['stock_code']}: {row['report_date']}")
                continue
            
            # Check if daily sales record already exists
            existing = session.query(DailyStockSales).filter_by(
                stock_item_id=stock_item.id,
                pharmacy_code=row['pharmacy_code'],
                report_date=report_date
            ).first()
            
            # Calculate derived values
            daily_sales_qty = float(row.get('daily_sales_qty', 0))
            daily_sales_value = float(row.get('daily_sales_value', 0))
            unit_cost = stock_item.unit_cost
            
            daily_cost_of_sales = daily_sales_qty * unit_cost
            daily_gross_profit = daily_sales_value - daily_cost_of_sales
            daily_gross_profit_percent = (daily_gross_profit / daily_sales_value * 100) if daily_sales_value > 0 else 0
            
            sales_data = {
                'stock_item_id': stock_item.id,
                'pharmacy_code': row['pharmacy_code'],
                'report_date': report_date,
                'daily_sales_qty': daily_sales_qty,
                'daily_sales_value': daily_sales_value,
                'daily_cost_of_sales': daily_cost_of_sales,
                'daily_gross_profit': daily_gross_profit,
                'daily_gross_profit_percent': daily_gross_profit_percent,
                'opening_stock': float(row.get('opening_stock', 0)),
                'closing_stock': float(row.get('closing_stock', 0)),
                'stock_value': float(row.get('stock_value', 0)),
                'transactions_count': int(row.get('transactions_count', 0)),
                'avg_unit_price': float(row.get('avg_unit_price', 0))
            }
            
            if existing:
                # Update existing record
                for key, value in sales_data.items():
                    setattr(existing, key, value)
                print(f"Updated daily sales for {row['stock_code']} on {report_date}")
            else:
                # Create new record
                daily_sales = DailyStockSales(**sales_data)
                session.add(daily_sales)
                print(f"Created daily sales for {row['stock_code']} on {report_date}")
    
    session.commit()
    print("Daily sales upload complete!")

def create_sample_csv_files():
    """Create sample CSV files for reference"""
    
    # Sample departments CSV
    departments_csv = """department_code,department_name,description,is_active
PHARM,Pharmacy,Prescription medications and pharmaceutical products,1
OTC,Over the Counter,Non-prescription medications and health products,1
COSMETIC,Cosmetics,Beauty and personal care products,1
SUPPLEMENTS,Supplements,Vitamins minerals and dietary supplements,1
MEDICAL,Medical Supplies,Medical devices and supplies,1"""
    
    # Sample stock items CSV
    stock_items_csv = """stock_code,stock_name,department_code,pharmacy_code,annual_sales_qty,annual_sales_value,unit_cost,unit_price
PAN001,Panado 500mg Tablets,OTC,reitz,1200,4800.00,3.50,4.00
ASP002,Aspirin 100mg Tablets,OTC,reitz,800,3200.00,3.00,4.00
VIT001,Vitamin C 1000mg,SUPPLEMENTS,reitz,600,9000.00,12.00,15.00"""
    
    # Sample daily sales CSV
    daily_sales_csv = """stock_code,pharmacy_code,report_date,daily_sales_qty,daily_sales_value,opening_stock,closing_stock,stock_value,transactions_count,avg_unit_price
PAN001,reitz,2025-01-15,5,20.00,50,45,180.00,3,4.00
ASP002,reitz,2025-01-15,3,12.00,30,27,108.00,2,4.00
VIT001,reitz,2025-01-15,2,30.00,20,18,270.00,1,15.00"""
    
    # Write sample files
    with open('sample_departments.csv', 'w', encoding='utf-8') as f:
        f.write(departments_csv)
    
    with open('sample_stock_items.csv', 'w', encoding='utf-8') as f:
        f.write(stock_items_csv)
    
    with open('sample_daily_sales.csv', 'w', encoding='utf-8') as f:
        f.write(daily_sales_csv)
    
    print("Sample CSV files created:")
    print("- sample_departments.csv")
    print("- sample_stock_items.csv")
    print("- sample_daily_sales.csv")

def main():
    parser = argparse.ArgumentParser(description="Upload stock data from CSV files")
    parser.add_argument('--departments', help='CSV file containing department data')
    parser.add_argument('--stock-items', help='CSV file containing stock items data')
    parser.add_argument('--daily-sales', help='CSV file containing daily sales data')
    parser.add_argument('--create-samples', action='store_true', help='Create sample CSV files')
    
    args = parser.parse_args()
    
    if args.create_samples:
        create_sample_csv_files()
        return
    
    session = create_session()
    
    try:
        if args.departments:
            upload_departments_from_csv(session, args.departments)
        
        if args.stock_items:
            upload_stock_items_from_csv(session, args.stock_items)
        
        if args.daily_sales:
            upload_daily_sales_from_csv(session, args.daily_sales)
        
        if not any([args.departments, args.stock_items, args.daily_sales, args.create_samples]):
            print("No action specified. Use --help for usage information.")
            print("Use --create-samples to generate sample CSV files.")
    
    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    main() 