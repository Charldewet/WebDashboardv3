#!/usr/bin/env python3
"""
Script to parse stock sales data from PDF files and insert into the database.
Usage: python scripts/parse_stock_sales_pdf.py path/to/file.pdf
"""

import os
import sys
import re
import fitz  # PyMuPDF
import pandas as pd
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models import Base, StockSale, Product
from config.settings import DATABASE_URI

# Constants
engine = create_engine(DATABASE_URI)
Session = sessionmaker(bind=engine)

# Compile pattern once for better performance
pattern = re.compile(
    r"(?P<Date>\d{4}/\d{2}/\d{2})\s+"
    r"(?P<StockCode>LP\d{7})\s+"
    r"(?P<Description>.+?)\s+"
    r"(?P<Quantity>\d+\.\d{3})\s+"
    r"(?P<Cost>\d+\.\d{3})\s+"
    r"(?P<Sell>\d+\.\d{2})\s+"
    r"(?P<GP>\d+\.\d{2})",
    re.MULTILINE
)

def parse_pdf_stock_sales(pdf_path):
    """Parse stock sales data from PDF and insert into database."""
    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        return False
    
    try:
        print(f"📄 Opening PDF: {pdf_path}")
        doc = fitz.open(pdf_path)
        
        # Extract text from all pages
        print("📖 Extracting text from PDF...")
        full_text = "".join(page.get_text() for page in doc)
        doc.close()
        
        # Find all matches
        print("🔍 Searching for stock sale patterns...")
        matches = list(pattern.finditer(full_text))
        print(f"✓ Found {len(matches)} potential stock sale records")
        
        if not matches:
            print("⚠️  No stock sale records found in PDF")
            return False
        
        # Process matches and insert into database
        session = Session()
        inserted = 0
        skipped = 0
        errors = 0
        
        print("💾 Processing and inserting records...")
        
        for i, match in enumerate(matches):
            try:
                stock_code = match.group("StockCode")
                
                # Check if product exists in database
                product = session.query(Product).filter_by(stock_code=stock_code).first()
                if not product:
                    print(f"⚠️  Stock code not found in product table: {stock_code}")
                    skipped += 1
                    continue
                
                # Create stock sale record
                sale = StockSale(
                    stock_code=stock_code,
                    sale_date=datetime.strptime(match.group("Date"), "%Y/%m/%d").date(),
                    qty=float(match.group("Quantity")),
                    cost=float(match.group("Cost")),
                    sell=float(match.group("Sell")),
                    gp_pct=float(match.group("GP"))
                )
                session.add(sale)
                inserted += 1
                
                # Progress indicator for large files
                if (i + 1) % 100 == 0:
                    print(f"   Processed {i + 1}/{len(matches)} records...")
                    
            except Exception as e:
                print(f"❌ Error processing record {i + 1}: {e}")
                errors += 1
                continue
        
        # Commit all changes
        session.commit()
        session.close()
        
        print(f"\n📊 Processing Summary:")
        print(f"   ✓ Successfully inserted: {inserted} records")
        print(f"   ⚠️  Skipped (product not found): {skipped} records")
        print(f"   ❌ Errors: {errors} records")
        
        return True
        
    except Exception as e:
        print(f"❌ Error parsing PDF: {e}")
        return False

def verify_products_exist():
    """Verify that products table has data before processing."""
    try:
        session = Session()
        product_count = session.query(Product).count()
        session.close()
        
        if product_count == 0:
            print("❌ No products found in database. Please run load_static_data.py first.")
            return False
        
        print(f"✓ Found {product_count} products in database")
        return True
        
    except Exception as e:
        print(f"❌ Error checking products: {e}")
        return False

def show_sample_data():
    """Show sample stock sales data after processing."""
    try:
        session = Session()
        total_sales = session.query(StockSale).count()
        
        if total_sales > 0:
            print(f"\n📈 Stock Sales Summary:")
            print(f"   - Total stock sales records: {total_sales}")
            
            # Show sample record
            sample = session.query(StockSale).first()
            if sample:
                print(f"   - Sample sale: {sample.stock_code} on {sample.sale_date}")
                print(f"     Qty: {sample.qty}, Cost: {sample.cost}, Sell: {sample.sell}, GP%: {sample.gp_pct}")
        
        session.close()
        
    except Exception as e:
        print(f"❌ Error showing sample data: {e}")

def main():
    """Main function to parse stock sales PDF."""
    print("=== Stock Sales PDF Parser ===")
    
    # Check command line arguments
    if len(sys.argv) != 2:
        print("❌ Usage: python scripts/parse_stock_sales_pdf.py path/to/file.pdf")
        print("\nExample:")
        print("  python scripts/parse_stock_sales_pdf.py 'Master Listing CSVs/stock_sales_report.pdf'")
        return
    
    pdf_path = sys.argv[1]
    
    # Verify products exist in database
    if not verify_products_exist():
        return
    
    # Parse PDF and insert data
    success = parse_pdf_stock_sales(pdf_path)
    
    if success:
        # Show results
        show_sample_data()
        print("\n✅ Stock sales parsing completed successfully!")
    else:
        print("\n❌ Stock sales parsing failed.")

if __name__ == "__main__":
    main() 