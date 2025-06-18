#!/usr/bin/env python3
"""
Script to create the new database tables (departments, products, stock_sales)
and verify they're working properly.
"""

import os
import sys
from datetime import date

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import setup_db, create_session
from app.models import Department, Product, StockSale

def create_tables():
    """Create all new tables in the database."""
    print("Creating new database tables...")
    setup_db()
    print("Tables created successfully!")

def verify_tables():
    """Verify that the new tables exist and can be used."""
    session = create_session()
    
    try:
        # Test Department table
        print("\nTesting Department table...")
        dept = Department(dept_code="TEST001", dept_name="Test Department")
        session.add(dept)
        session.commit()
        print("✓ Department table working")
        
        # Test Product table
        print("Testing Product table...")
        product = Product(
            stock_code="PROD001", 
            description="Test Product", 
            dept_code="TEST001"
        )
        session.add(product)
        session.commit()
        print("✓ Product table working")
        
        # Test StockSale table
        print("Testing StockSale table...")
        stock_sale = StockSale(
            stock_code="PROD001",
            sale_date=date.today(),
            qty=10.0,
            cost=5.0,
            sell=8.0,
            gp_pct=37.5
        )
        session.add(stock_sale)
        session.commit()
        print("✓ StockSale table working")
        
        # Test relationships
        print("Testing relationships...")
        dept = session.query(Department).filter_by(dept_code="TEST001").first()
        print(f"✓ Department '{dept.dept_name}' has {len(dept.products)} products")
        
        product = session.query(Product).filter_by(stock_code="PROD001").first()
        print(f"✓ Product '{product.description}' belongs to department '{product.department.dept_name}'")
        
        # Clean up test data
        print("\nCleaning up test data...")
        session.query(StockSale).filter_by(stock_code="PROD001").delete()
        session.query(Product).filter_by(stock_code="PROD001").delete()
        session.query(Department).filter_by(dept_code="TEST001").delete()
        session.commit()
        print("✓ Test data cleaned up")
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        session.rollback()
        raise
    finally:
        session.close()

def check_existing_tables():
    """Check what tables currently exist in the database."""
    session = create_session()
    
    try:
        # Check if tables exist by trying to query them
        dept_count = session.query(Department).count()
        product_count = session.query(Product).count()
        stock_sale_count = session.query(StockSale).count()
        
        print(f"\nCurrent table status:")
        print(f"  - departments: {dept_count} records")
        print(f"  - products: {product_count} records")
        print(f"  - stock_sales: {stock_sale_count} records")
        
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    print("=== Database Table Creation and Verification ===")
    
    # Create tables
    create_tables()
    
    # Check existing tables
    check_existing_tables()
    
    # Verify tables work
    verify_tables()
    
    print("\n✅ All new tables created and verified successfully!") 