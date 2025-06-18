#!/usr/bin/env python3
"""
Test script to verify stock sales table setup and show sample data.
"""

import os
import sys
from datetime import date

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db import create_session
from app.models import StockSale, Product, Department

def test_stock_sales_setup():
    """Test the stock sales table setup."""
    print("=== Stock Sales Table Test ===")
    
    session = create_session()
    
    try:
        # Check table structure
        print("1. Checking table structure...")
        stock_sale_count = session.query(StockSale).count()
        print(f"   ✓ Stock sales table exists with {stock_sale_count} records")
        
        # Check relationships
        print("\n2. Checking relationships...")
        product_count = session.query(Product).count()
        dept_count = session.query(Department).count()
        print(f"   ✓ Products: {product_count} records")
        print(f"   ✓ Departments: {dept_count} records")
        
        # Test inserting a sample record
        print("\n3. Testing sample record insertion...")
        
        # Get a sample product
        sample_product = session.query(Product).first()
        if sample_product:
            print(f"   ✓ Found sample product: {sample_product.stock_code} - {sample_product.description}")
            
            # Create a test stock sale
            test_sale = StockSale(
                stock_code=sample_product.stock_code,
                sale_date=date.today(),
                qty=1.0,
                cost=10.50,
                sell=15.00,
                gp_pct=30.0
            )
            session.add(test_sale)
            session.commit()
            print(f"   ✓ Test stock sale inserted successfully")
            
            # Verify the relationship works
            print(f"   ✓ Stock sale linked to product: {test_sale.product.description}")
            print(f"   ✓ Product belongs to department: {test_sale.product.department.dept_name}")
            
            # Clean up test data
            session.delete(test_sale)
            session.commit()
            print(f"   ✓ Test data cleaned up")
            
        else:
            print("   ❌ No products found in database")
            return False
        
        print("\n✅ Stock sales table is properly set up and ready for data!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing stock sales setup: {e}")
        session.rollback()
        return False
    finally:
        session.close()

def show_expected_pdf_format():
    """Show the expected PDF format for stock sales."""
    print("\n=== Expected PDF Format ===")
    print("The script expects PDF files with stock sales data in this format:")
    print("")
    print("YYYY/MM/DD  LP1234567  Product Description    1.000  10.500  15.00  30.00")
    print("")
    print("Where:")
    print("  - YYYY/MM/DD: Date in format 2024/01/15")
    print("  - LP1234567: Stock code (must match products in database)")
    print("  - Product Description: Product name/description")
    print("  - 1.000: Quantity (3 decimal places)")
    print("  - 10.500: Cost price (3 decimal places)")
    print("  - 15.00: Sell price (2 decimal places)")
    print("  - 30.00: Gross profit percentage (2 decimal places)")
    print("")
    print("Usage:")
    print("  python scripts/parse_stock_sales_pdf.py path/to/your/file.pdf")

if __name__ == "__main__":
    success = test_stock_sales_setup()
    if success:
        show_expected_pdf_format()
    else:
        print("\n❌ Stock sales setup test failed.") 