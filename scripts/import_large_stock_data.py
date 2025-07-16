#!/usr/bin/env python3
"""
Optimized script to import large stock data:
- 127,382 items in full sales history
- 484 items in daily sales (yesterday)
- 2,207 department codes
"""

import os
import sys
import csv
from datetime import date, datetime
import gc

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import create_session, setup_db
from app.models import Department, StockItem, DailyStockSales

def import_departments(session, csv_file_path):
    """Import all departments efficiently"""
    print(f"Importing departments from: {csv_file_path}")
    
    # Clear existing departments
    session.execute("DELETE FROM departments")
    session.commit()
    
    departments_added = 0
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            dept_code = row.get('DepartmentCode', '').strip()
            dept_name = row.get('DepartmentName', '').strip()
            
            if dept_code and dept_name and dept_code != 'DepartmentCode':
                department = Department(
                    department_code=dept_code,
                    department_name=dept_name,
                    description=f"Department: {dept_name}",
                    is_active=1
                )
                session.add(department)
                departments_added += 1
                
                if departments_added % 100 == 0:
                    session.commit()
                    print(f"Imported {departments_added} departments...")
                    gc.collect()
        
        session.commit()
    
    print(f"✅ Successfully imported {departments_added} departments")
    return departments_added

def import_stock_items(session, csv_file_path, pharmacy_code):
    """Import stock items efficiently"""
    print(f"Importing stock items for pharmacy: {pharmacy_code}")
    
    # Clear existing stock items for this pharmacy
    session.execute("DELETE FROM stock_items WHERE pharmacy_code = :pharmacy", 
                   {"pharmacy": pharmacy_code})
    session.commit()
    
    # Create department lookup
    dept_lookup = {}
    departments = session.query(Department).all()
    for dept in departments:
        dept_lookup[dept.department_code] = dept.id
    
    items_added = 0
    skipped_items = 0
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            try:
                stock_code = row.get('StockCode', '').strip()
                description = row.get('Description', '').strip()
                dept_code = row.get('DepartmentCode', '').strip()
                
                if not stock_code or not description or not dept_code:
                    skipped_items += 1
                    continue
                
                dept_id = dept_lookup.get(dept_code)
                if not dept_id:
                    skipped_items += 1
                    continue
                
                # Parse numeric values
                sales_qty = float(row.get('SalesQty', 0) or 0)
                sales_value = float(row.get('SalesValue', 0) or 0)
                sales_cost = float(row.get('SalesCost', 0) or 0)
                
                avg_monthly_sales = sales_qty / 12 if sales_qty > 0 else 0
                unit_cost = sales_cost / sales_qty if sales_qty > 0 else 0
                unit_price = sales_value / sales_qty if sales_qty > 0 else 0
                
                stock_item = StockItem(
                    stock_code=stock_code,
                    stock_name=description,
                    department_id=dept_id,
                    pharmacy_code=pharmacy_code,
                    annual_sales_qty=sales_qty,
                    annual_sales_value=sales_value,
                    avg_monthly_sales=avg_monthly_sales,
                    unit_cost=unit_cost,
                    unit_price=unit_price,
                    last_updated=date.today()
                )
                
                session.add(stock_item)
                items_added += 1
                
                if items_added % 1000 == 0:
                    session.commit()
                    print(f"Imported {items_added} stock items...")
                    gc.collect()
                    
            except Exception as e:
                skipped_items += 1
                continue
        
        session.commit()
    
    print(f"✅ Successfully imported {items_added} stock items")
    print(f"⚠️  Skipped {skipped_items} items")
    return items_added

def import_daily_sales(session, csv_file_path, pharmacy_code, report_date):
    """Import daily sales data"""
    print(f"Importing daily sales for {report_date}")
    
    # Clear existing daily sales for this date and pharmacy
    session.execute("""
        DELETE FROM daily_stock_sales 
        WHERE pharmacy_code = :pharmacy AND report_date = :date
    """, {"pharmacy": pharmacy_code, "date": report_date})
    session.commit()
    
    # Create stock item lookup
    stock_lookup = {}
    stock_items = session.query(StockItem).filter_by(pharmacy_code=pharmacy_code).all()
    for item in stock_items:
        stock_lookup[item.stock_code] = item.id
    
    sales_added = 0
    skipped_sales = 0
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            try:
                stock_code = row.get('StockCode', '').strip()
                
                if not stock_code:
                    skipped_sales += 1
                    continue
                
                stock_item_id = stock_lookup.get(stock_code)
                if not stock_item_id:
                    skipped_sales += 1
                    continue
                
                # Parse numeric values
                daily_sales_qty = float(row.get('SalesQty', 0) or 0)
                daily_sales_value = float(row.get('SalesValue', 0) or 0)
                daily_cost_of_sales = float(row.get('SalesCost', 0) or 0)
                opening_stock = float(row.get('OnHand', 0) or 0)
                
                daily_gross_profit = daily_sales_value - daily_cost_of_sales
                daily_gross_profit_percent = (daily_gross_profit / daily_sales_value * 100) if daily_sales_value > 0 else 0
                
                daily_sales = DailyStockSales(
                    stock_item_id=stock_item_id,
                    pharmacy_code=pharmacy_code,
                    report_date=report_date,
                    daily_sales_qty=daily_sales_qty,
                    daily_sales_value=daily_sales_value,
                    daily_cost_of_sales=daily_cost_of_sales,
                    daily_gross_profit=daily_gross_profit,
                    daily_gross_profit_percent=daily_gross_profit_percent,
                    opening_stock=opening_stock,
                    closing_stock=opening_stock,
                    stock_value=0,
                    transactions_count=1 if daily_sales_qty > 0 else 0,
                    avg_unit_price=daily_sales_value / daily_sales_qty if daily_sales_qty > 0 else 0
                )
                
                session.add(daily_sales)
                sales_added += 1
                
                if sales_added % 100 == 0:
                    session.commit()
                    print(f"Imported {sales_added} daily sales records...")
                    gc.collect()
                    
            except Exception as e:
                skipped_sales += 1
                continue
        
        session.commit()
    
    print(f"✅ Successfully imported {sales_added} daily sales records")
    print(f"⚠️  Skipped {skipped_sales} records")
    return sales_added

def main():
    print("=== Reitz Pharmacy Stock Data Import ===")
    
    # Configuration - REITZ PHARMACY SPECIFIC
    pharmacy_code = "reitz"  # Reitz pharmacy identifier
    report_date = date.today()
    
    dept_file = 'Stock information/Department_codes.csv'
    stock_file = 'Stock information/Daily_sales.csv'
    
    if not os.path.exists(dept_file):
        print(f"❌ Department file not found: {dept_file}")
        return
    
    if not os.path.exists(stock_file):
        print(f"❌ Stock file not found: {stock_file}")
        return
    
    # Setup database
    print("🗄️  Setting up database...")
    setup_db()
    
    session = create_session()
    
    try:
        # Import departments
        print(f"\n📁 Importing departments...")
        import_departments(session, dept_file)
        
        # Import stock items
        print(f"\n📦 Importing stock items...")
        import_stock_items(session, stock_file, pharmacy_code)
        
        # Import daily sales
        print(f"\n📈 Importing daily sales...")
        import_daily_sales(session, stock_file, pharmacy_code, report_date)
        
        print("\n🎉 Import completed successfully!")
        
        # Show summary
        dept_count = session.query(Department).count()
        stock_count = session.query(StockItem).filter_by(pharmacy_code=pharmacy_code).count()
        daily_count = session.query(DailyStockSales).filter_by(
            pharmacy_code=pharmacy_code, 
            report_date=report_date
        ).count()
        
        print(f"\n📊 Summary:")
        print(f"   Departments: {dept_count}")
        print(f"   Stock Items: {stock_count}")
        print(f"   Daily Sales: {daily_count}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    main() 