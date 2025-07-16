#!/usr/bin/env python3
"""
Script to import actual stock data from the Stock information folder into the new database system.
This script will process the Department_codes.csv and Daily_sales.csv files.
"""

import os
import sys
import csv
from datetime import date, datetime
import argparse

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import create_session, setup_db
from app.models import Department, StockItem, DailyStockSales

def clean_department_name(name):
    """Clean department name by removing extra spaces and special characters"""
    if not name:
        return ""
    # Remove extra spaces and clean up
    cleaned = name.strip()
    # Remove any non-printable characters
    cleaned = ''.join(char for char in cleaned if char.isprintable())
    return cleaned

def import_departments_from_csv(session, csv_file_path):
    """Import departments from the actual Department_codes.csv file"""
    print(f"Importing departments from: {csv_file_path}")
    
    imported_count = 0
    skipped_count = 0
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            dept_code = row.get('DepartmentCode', '').strip()
            dept_name = clean_department_name(row.get('DepartmentName', ''))
            
            # Skip empty or invalid entries
            if not dept_code or not dept_name:
                skipped_count += 1
                continue
            
            # Skip header-like entries and system codes
            if dept_code in ['REITZ', 'DEPT', 'CODE', 'ALLOC', 'MARKUP', 'SIONAL', 'SCRIPT', 'OPEN']:
                skipped_count += 1
                continue
            
            # Check if department already exists
            existing = session.query(Department).filter_by(department_code=dept_code).first()
            
            if existing:
                # Update existing department
                existing.department_name = dept_name
                existing.description = f"Imported from {csv_file_path}"
                print(f"Updated department: {dept_code} - {dept_name}")
            else:
                # Create new department
                department = Department(
                    department_code=dept_code,
                    department_name=dept_name,
                    description=f"Imported from {csv_file_path}",
                    is_active=1
                )
                session.add(department)
                print(f"Created department: {dept_code} - {dept_name}")
            
            imported_count += 1
            
            # Commit every 100 records to avoid memory issues
            if imported_count % 100 == 0:
                session.commit()
                print(f"Committed {imported_count} departments...")
    
    session.commit()
    print(f"Department import complete! Imported: {imported_count}, Skipped: {skipped_count}")

def analyze_daily_sales_structure(csv_file_path):
    """Analyze the structure of the daily sales CSV to understand the data"""
    print(f"Analyzing daily sales structure from: {csv_file_path}")
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        # Get first few rows to understand structure
        sample_rows = []
        for i, row in enumerate(reader):
            if i < 5:  # Get first 5 rows as sample
                sample_rows.append(row)
            else:
                break
        
        print("Sample data structure:")
        for i, row in enumerate(sample_rows):
            print(f"Row {i+1}: {dict(row)}")
        
        # Count total rows
        file.seek(0)
        next(file)  # Skip header
        total_rows = sum(1 for line in file)
        print(f"Total rows in file: {total_rows}")

def import_stock_items_from_daily_sales(session, csv_file_path, pharmacy_code="reitz"):
    """Import stock items from the daily sales CSV file"""
    print(f"Importing stock items from daily sales: {csv_file_path}")
    
    imported_count = 0
    updated_count = 0
    skipped_count = 0
    
    # Track unique stock codes and their data
    stock_items_data = {}
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            dept_code = row.get('DepartmentCode', '').strip()
            stock_code = row.get('StockCode', '').strip()
            description = row.get('Description', '').strip()
            
            # Skip empty entries
            if not stock_code or not description:
                skipped_count += 1
                continue
            
            # Get department
            department = session.query(Department).filter_by(department_code=dept_code).first()
            if not department:
                print(f"Warning: Department {dept_code} not found for stock {stock_code}")
                # Create a default department if not found
                department = Department(
                    department_code=dept_code,
                    department_name=f"Auto-created for {dept_code}",
                    description="Auto-created during import",
                    is_active=1
                )
                session.add(department)
                session.commit()
            
            # Parse numeric values
            try:
                on_hand = float(row.get('OnHand', 0) or 0)
                sales_qty = float(row.get('SalesQty', 0) or 0)
                sales_value = float(row.get('SalesValue', 0) or 0)
                sales_cost = float(row.get('SalesCost', 0) or 0)
                gross_profit = float(row.get('GrossProfit', 0) or 0)
            except (ValueError, TypeError):
                print(f"Warning: Invalid numeric data for stock {stock_code}")
                skipped_count += 1
                continue
            
            # Calculate unit price and cost
            unit_price = sales_value / sales_qty if sales_qty > 0 else 0
            unit_cost = sales_cost / sales_qty if sales_qty > 0 else 0
            
            # Store or update stock item data
            if stock_code not in stock_items_data:
                stock_items_data[stock_code] = {
                    'stock_code': stock_code,
                    'stock_name': description,
                    'department_id': department.id,
                    'pharmacy_code': pharmacy_code,
                    'annual_sales_qty': sales_qty,  # This is daily sales, will be updated
                    'annual_sales_value': sales_value,  # This is daily sales, will be updated
                    'avg_monthly_sales': sales_qty / 12,  # This is daily sales, will be updated
                    'unit_cost': unit_cost,
                    'unit_price': unit_price,
                    'last_updated': date.today(),
                    'on_hand': on_hand
                }
            else:
                # Update with latest data
                stock_items_data[stock_code].update({
                    'stock_name': description,
                    'department_id': department.id,
                    'annual_sales_qty': sales_qty,
                    'annual_sales_value': sales_value,
                    'avg_monthly_sales': sales_qty / 12,
                    'unit_cost': unit_cost,
                    'unit_price': unit_price,
                    'on_hand': on_hand
                })
    
    # Now create/update stock items
    for stock_code, data in stock_items_data.items():
        # Check if stock item already exists
        existing = session.query(StockItem).filter_by(
            stock_code=stock_code,
            pharmacy_code=pharmacy_code
        ).first()
        
        if existing:
            # Update existing item
            for key, value in data.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            updated_count += 1
            print(f"Updated stock item: {stock_code} - {data['stock_name']}")
        else:
            # Create new item
            stock_item = StockItem(**data)
            session.add(stock_item)
            imported_count += 1
            print(f"Created stock item: {stock_code} - {data['stock_name']}")
        
        # Commit every 50 records
        if (imported_count + updated_count) % 50 == 0:
            session.commit()
            print(f"Committed {imported_count + updated_count} stock items...")
    
    session.commit()
    print(f"Stock items import complete! Created: {imported_count}, Updated: {updated_count}, Skipped: {skipped_count}")

def import_daily_sales_data(session, csv_file_path, pharmacy_code="reitz", report_date=None):
    """Import daily sales data from the CSV file"""
    print(f"Importing daily sales from: {csv_file_path}")
    
    if not report_date:
        # Use today's date if not specified
        report_date = date.today()
    
    imported_count = 0
    updated_count = 0
    skipped_count = 0
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            stock_code = row.get('StockCode', '').strip()
            
            # Skip empty entries
            if not stock_code:
                skipped_count += 1
                continue
            
            # Get stock item
            stock_item = session.query(StockItem).filter_by(
                stock_code=stock_code,
                pharmacy_code=pharmacy_code
            ).first()
            
            if not stock_item:
                print(f"Warning: Stock item {stock_code} not found for pharmacy {pharmacy_code}")
                skipped_count += 1
                continue
            
            # Parse numeric values
            try:
                on_hand = float(row.get('OnHand', 0) or 0)
                sales_qty = float(row.get('SalesQty', 0) or 0)
                sales_value = float(row.get('SalesValue', 0) or 0)
                sales_cost = float(row.get('SalesCost', 0) or 0)
                gross_profit = float(row.get('GrossProfit', 0) or 0)
                turnover_percent = float(row.get('TurnoverPercent', 0) or 0)
                gross_profit_percent = float(row.get('GrossProfitPercent', 0) or 0)
            except (ValueError, TypeError):
                print(f"Warning: Invalid numeric data for stock {stock_code}")
                skipped_count += 1
                continue
            
            # Check if daily sales record already exists
            existing = session.query(DailyStockSales).filter_by(
                stock_item_id=stock_item.id,
                pharmacy_code=pharmacy_code,
                report_date=report_date
            ).first()
            
            sales_data = {
                'stock_item_id': stock_item.id,
                'pharmacy_code': pharmacy_code,
                'report_date': report_date,
                'daily_sales_qty': sales_qty,
                'daily_sales_value': sales_value,
                'daily_cost_of_sales': sales_cost,
                'daily_gross_profit': gross_profit,
                'daily_gross_profit_percent': gross_profit_percent,
                'opening_stock': on_hand,  # Using OnHand as opening stock
                'closing_stock': on_hand,  # Using OnHand as closing stock for now
                'stock_value': on_hand * stock_item.unit_cost if stock_item.unit_cost else 0,
                'transactions_count': 1,  # Default to 1 transaction
                'avg_unit_price': sales_value / sales_qty if sales_qty > 0 else 0
            }
            
            if existing:
                # Update existing record
                for key, value in sales_data.items():
                    setattr(existing, key, value)
                updated_count += 1
            else:
                # Create new record
                daily_sales = DailyStockSales(**sales_data)
                session.add(daily_sales)
                imported_count += 1
            
            # Commit every 100 records
            if (imported_count + updated_count) % 100 == 0:
                session.commit()
                print(f"Committed {imported_count + updated_count} daily sales records...")
    
    session.commit()
    print(f"Daily sales import complete! Created: {imported_count}, Updated: {updated_count}, Skipped: {skipped_count}")

def main():
    parser = argparse.ArgumentParser(description="Import actual stock data from Stock information folder")
    parser.add_argument('--departments', action='store_true', help='Import departments from Department_codes.csv')
    parser.add_argument('--stock-items', action='store_true', help='Import stock items from Daily_sales.csv')
    parser.add_argument('--daily-sales', action='store_true', help='Import daily sales from Daily_sales.csv')
    parser.add_argument('--analyze', action='store_true', help='Analyze the data structure')
    parser.add_argument('--pharmacy', default='reitz', help='Pharmacy code (default: reitz)')
    parser.add_argument('--date', help='Report date for daily sales (YYYY-MM-DD format)')
    parser.add_argument('--all', action='store_true', help='Import all data')
    
    args = parser.parse_args()
    
    # Define file paths
    dept_file = 'Stock information/Department_codes.csv'
    sales_file = 'Stock information/Daily_sales.csv'
    
    # Check if files exist
    if not os.path.exists(dept_file):
        print(f"Error: Department file not found: {dept_file}")
        return
    
    if not os.path.exists(sales_file):
        print(f"Error: Sales file not found: {sales_file}")
        return
    
    session = create_session()
    
    try:
        if args.analyze:
            analyze_daily_sales_structure(sales_file)
            return
        
        if args.departments or args.all:
            import_departments_from_csv(session, dept_file)
        
        if args.stock_items or args.all:
            import_stock_items_from_daily_sales(session, sales_file, args.pharmacy)
        
        if args.daily_sales or args.all:
            report_date = None
            if args.date:
                try:
                    report_date = datetime.strptime(args.date, '%Y-%m-%d').date()
                except ValueError:
                    print("Error: Invalid date format. Use YYYY-MM-DD")
                    return
            
            import_daily_sales_data(session, sales_file, args.pharmacy, report_date)
        
        if not any([args.departments, args.stock_items, args.daily_sales, args.analyze, args.all]):
            print("No action specified. Use --help for usage information.")
            print("Use --analyze to examine the data structure first.")
    
    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    main() 