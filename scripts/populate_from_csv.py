#!/usr/bin/env python3
"""
Script to populate departments and products tables from CSV files.
Expected files:
- department_codes_full.csv
- full_master_product_listing.csv
"""

import os
import sys
import csv
import pandas as pd

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import create_session
from app.models import Department, Product

def load_departments_from_csv(csv_file_path):
    """Load departments from CSV file."""
    if not os.path.exists(csv_file_path):
        print(f"❌ Department CSV file not found: {csv_file_path}")
        return []
    
    departments = []
    try:
        # Try using pandas first for better CSV handling
        df = pd.read_csv(csv_file_path)
        print(f"✓ Loaded {len(df)} departments from CSV")
        
        for _, row in df.iterrows():
            # Assuming CSV has columns: dept_code, dept_name
            # Adjust column names as needed
            dept_code = str(row.iloc[0]).strip()  # First column
            dept_name = str(row.iloc[1]).strip()  # Second column
            
            if dept_code and dept_name and dept_code != 'nan':
                departments.append({
                    'dept_code': dept_code,
                    'dept_name': dept_name
                })
    
    except Exception as e:
        print(f"❌ Error reading CSV with pandas: {e}")
        print("Trying with standard CSV reader...")
        
        try:
            with open(csv_file_path, 'r', encoding='utf-8') as file:
                reader = csv.reader(file)
                next(reader)  # Skip header if exists
                
                for row in reader:
                    if len(row) >= 2:
                        dept_code = row[0].strip()
                        dept_name = row[1].strip()
                        
                        if dept_code and dept_name:
                            departments.append({
                                'dept_code': dept_code,
                                'dept_name': dept_name
                            })
            
            print(f"✓ Loaded {len(departments)} departments from CSV")
            
        except Exception as e2:
            print(f"❌ Error reading CSV with standard reader: {e2}")
            return []
    
    return departments

def load_products_from_csv(csv_file_path):
    """Load products from CSV file."""
    if not os.path.exists(csv_file_path):
        print(f"❌ Product CSV file not found: {csv_file_path}")
        return []
    
    products = []
    try:
        # Try using pandas first for better CSV handling
        df = pd.read_csv(csv_file_path)
        print(f"✓ Loaded {len(df)} products from CSV")
        
        for _, row in df.iterrows():
            # Assuming CSV has columns: stock_code, description, dept_code
            # Adjust column names as needed
            stock_code = str(row.iloc[0]).strip()  # First column
            description = str(row.iloc[1]).strip()  # Second column
            dept_code = str(row.iloc[2]).strip()    # Third column
            
            if stock_code and description and dept_code and stock_code != 'nan':
                products.append({
                    'stock_code': stock_code,
                    'description': description,
                    'dept_code': dept_code
                })
    
    except Exception as e:
        print(f"❌ Error reading CSV with pandas: {e}")
        print("Trying with standard CSV reader...")
        
        try:
            with open(csv_file_path, 'r', encoding='utf-8') as file:
                reader = csv.reader(file)
                next(reader)  # Skip header if exists
                
                for row in reader:
                    if len(row) >= 3:
                        stock_code = row[0].strip()
                        description = row[1].strip()
                        dept_code = row[2].strip()
                        
                        if stock_code and description and dept_code:
                            products.append({
                                'stock_code': stock_code,
                                'description': description,
                                'dept_code': dept_code
                            })
            
            print(f"✓ Loaded {len(products)} products from CSV")
            
        except Exception as e2:
            print(f"❌ Error reading CSV with standard reader: {e2}")
            return []
    
    return products

def populate_departments(departments_data):
    """Populate departments table with data from CSV."""
    session = create_session()
    
    try:
        # Clear existing departments
        print("Clearing existing departments...")
        session.query(Department).delete()
        session.commit()
        
        # Add new departments
        print(f"Adding {len(departments_data)} departments...")
        for dept_data in departments_data:
            dept = Department(**dept_data)
            session.add(dept)
        
        session.commit()
        print("✓ Departments populated successfully!")
        
        # Verify
        count = session.query(Department).count()
        print(f"✓ Total departments in database: {count}")
        
    except Exception as e:
        print(f"❌ Error populating departments: {e}")
        session.rollback()
        raise
    finally:
        session.close()

def populate_products(products_data):
    """Populate products table with data from CSV."""
    session = create_session()
    
    try:
        # Clear existing products
        print("Clearing existing products...")
        session.query(Product).delete()
        session.commit()
        
        # Add new products
        print(f"Adding {len(products_data)} products...")
        for product_data in products_data:
            product = Product(**product_data)
            session.add(product)
        
        session.commit()
        print("✓ Products populated successfully!")
        
        # Verify
        count = session.query(Product).count()
        print(f"✓ Total products in database: {count}")
        
    except Exception as e:
        print(f"❌ Error populating products: {e}")
        session.rollback()
        raise
    finally:
        session.close()

def main():
    """Main function to populate both tables."""
    print("=== CSV Population Script ===")
    
    # File paths
    dept_csv = "department_codes_full.csv"
    product_csv = "full_master_product_listing.csv"
    
    # Check if CSV files exist
    if not os.path.exists(dept_csv):
        print(f"❌ Department CSV file not found: {dept_csv}")
        print("Please place the department_codes_full.csv file in the project root directory.")
        return
    
    if not os.path.exists(product_csv):
        print(f"❌ Product CSV file not found: {product_csv}")
        print("Please place the full_master_product_listing.csv file in the project root directory.")
        return
    
    # Load data from CSV files
    print("\n1. Loading departments from CSV...")
    departments = load_departments_from_csv(dept_csv)
    
    print("\n2. Loading products from CSV...")
    products = load_products_from_csv(product_csv)
    
    if not departments:
        print("❌ No departments loaded. Please check the CSV file format.")
        return
    
    if not products:
        print("❌ No products loaded. Please check the CSV file format.")
        return
    
    # Populate database
    print("\n3. Populating departments table...")
    populate_departments(departments)
    
    print("\n4. Populating products table...")
    populate_products(products)
    
    print("\n✅ Database population completed successfully!")
    print(f"   - {len(departments)} departments added")
    print(f"   - {len(products)} products added")

if __name__ == "__main__":
    main() 