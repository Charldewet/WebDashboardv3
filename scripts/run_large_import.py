#!/usr/bin/env python3
"""
Simple runner script for the large stock data import.
This script will import your 127,382 stock items efficiently.
"""

import os
import sys
from datetime import date

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def main():
    print("🚀 Starting Reitz Pharmacy Stock Data Import")
    print("=" * 50)
    
    # Configuration - REITZ PHARMACY SPECIFIC
    PHARMACY_CODE = "reitz"  # Reitz pharmacy identifier
    REPORT_DATE = date.today()
    
    print(f"Pharmacy: {PHARMACY_CODE}")
    print(f"Date: {REPORT_DATE}")
    print()
    
    # Check if data files exist
    dept_file = 'Stock information/Department_codes.csv'
    stock_file = 'Stock information/Daily_sales.csv'
    
    if not os.path.exists(dept_file):
        print(f"❌ Department file not found: {dept_file}")
        print("Please ensure the file exists in the Stock information folder.")
        return
    
    if not os.path.exists(stock_file):
        print(f"❌ Stock file not found: {stock_file}")
        print("Please ensure the file exists in the Stock information folder.")
        return
    
    # Count lines in files for verification
    print("📊 Verifying data files...")
    try:
        with open(dept_file, 'r', encoding='utf-8') as f:
            dept_lines = sum(1 for line in f) - 1  # Subtract header
        print(f"   Department codes: {dept_lines:,} lines")
        
        with open(stock_file, 'r', encoding='utf-8') as f:
            stock_lines = sum(1 for line in f) - 1  # Subtract header
        print(f"   Stock items: {stock_lines:,} lines")
        
    except Exception as e:
        print(f"Error reading files: {e}")
        return
    
    print()
    print("⚠️  IMPORTANT NOTES:")
    print("   - This will clear existing stock data for REITZ PHARMACY ONLY")
    print("   - The process may take several minutes for 127,382 items")
    print("   - Progress will be shown every 1,000 items")
    print("   - Other pharmacies will be imported separately later")
    print()
    
    # Ask for confirmation
    response = input("Do you want to proceed with the import? (y/N): ")
    if response.lower() not in ['y', 'yes']:
        print("Import cancelled.")
        return
    
    print()
    print("🔄 Starting import process...")
    print()
    
    # Import the large stock data module and run it
    try:
        from scripts.import_large_stock_data import main as import_main
        
        # Set the pharmacy code in the import script
        import sys
        sys.argv = [sys.argv[0], '--pharmacy', PHARMACY_CODE, '--date', REPORT_DATE.strftime('%Y-%m-%d')]
        
        import_main()
        
    except ImportError as e:
        print(f"❌ Error importing script: {e}")
        print("Please ensure all required files are in place.")
    except Exception as e:
        print(f"❌ Error during import: {e}")
        print("Please check the error details above.")

if __name__ == "__main__":
    main() 