#!/usr/bin/env python3
"""
Script to load static department and product data from CSV files.
Loads:
- Departments from department_codes_full.csv
- Products from full_master_product_listing.csv
"""

import os
import sys
import pandas as pd
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models import Department, Product, Base
from config.settings import DATABASE_URI

def load_departments(csv_path):
    """Load departments from CSV file."""
    if not os.path.exists(csv_path):
        print(f"❌ Department CSV file not found: {csv_path}")
        return False
    
    try:
        df = pd.read_csv(csv_path)
        print(f"✓ Loaded {len(df)} departments from CSV")
        
        # Create engine and session
        engine = create_engine(DATABASE_URI)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Load departments using merge (upsert behavior)
        for _, row in df.iterrows():
            dept = Department(
                dept_code=row["Department Code"],
                dept_name=row["Department Description"]
            )
            session.merge(dept)
        
        session.commit()
        session.close()
        print("✓ Departments loaded successfully.")
        return True
        
    except Exception as e:
        print(f"❌ Error loading departments: {e}")
        return False

def load_products(csv_path):
    """Load products from CSV file."""
    if not os.path.exists(csv_path):
        print(f"❌ Product CSV file not found: {csv_path}")
        return False
    
    try:
        df = pd.read_csv(csv_path)
        print(f"✓ Loaded {len(df)} products from CSV")
        
        # Create engine and session
        engine = create_engine(DATABASE_URI)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Load products using merge (upsert behavior)
        for _, row in df.iterrows():
            prod = Product(
                stock_code=row["Stock Code"],
                description=row["Description"],
                dept_code=row["Department Code"]
            )
            session.merge(prod)
        
        session.commit()
        session.close()
        print("✓ Products loaded successfully.")
        return True
        
    except Exception as e:
        print(f"❌ Error loading products: {e}")
        return False

def verify_data():
    """Verify that data was loaded correctly."""
    try:
        engine = create_engine(DATABASE_URI)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        dept_count = session.query(Department).count()
        product_count = session.query(Product).count()
        
        print(f"\n📊 Data verification:")
        print(f"   - Departments: {dept_count}")
        print(f"   - Products: {product_count}")
        
        # Show sample data
        if dept_count > 0:
            sample_dept = session.query(Department).first()
            print(f"   - Sample department: {sample_dept.dept_code} - {sample_dept.dept_name}")
        
        if product_count > 0:
            sample_product = session.query(Product).first()
            print(f"   - Sample product: {sample_product.stock_code} - {sample_product.description}")
        
        session.close()
        
    except Exception as e:
        print(f"❌ Error verifying data: {e}")

def main():
    """Main function to load both departments and products."""
    print("=== Static Data Loading Script ===")
    
    # Ensure tables are created
    print("Ensuring database tables exist...")
    engine = create_engine(DATABASE_URI)
    Base.metadata.create_all(engine)
    print("✓ Tables ready")
    
    # File paths - updated to use the correct directory
    dept_csv = "Master Listing CSVs/department_codes_full.csv"
    product_csv = "Master Listing CSVs/full_master_product_listing.csv"
    
    # Check if CSV files exist
    if not os.path.exists(dept_csv):
        print(f"❌ Department CSV file not found: {dept_csv}")
        print("Please check the file path.")
        return
    
    if not os.path.exists(product_csv):
        print(f"❌ Product CSV file not found: {product_csv}")
        print("Please check the file path.")
        return
    
    # Load departments first (products depend on departments)
    print(f"\n1. Loading departments from {dept_csv}...")
    dept_success = load_departments(dept_csv)
    
    if not dept_success:
        print("❌ Failed to load departments. Stopping.")
        return
    
    # Load products
    print(f"\n2. Loading products from {product_csv}...")
    product_success = load_products(product_csv)
    
    if not product_success:
        print("❌ Failed to load products.")
        return
    
    # Verify data
    print(f"\n3. Verifying loaded data...")
    verify_data()
    
    print("\n✅ Static data loading completed successfully!")

if __name__ == "__main__":
    main() 