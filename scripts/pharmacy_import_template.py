#!/usr/bin/env python3
"""
Template script for importing stock data for different pharmacies.
Copy this file and modify the pharmacy_code for each pharmacy.

Usage:
1. Copy this file: cp scripts/pharmacy_import_template.py scripts/import_roos_pharmacy.py
2. Change pharmacy_code to "roos"
3. Run: python scripts/import_roos_pharmacy.py
"""

import os
import sys
from datetime import date

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def main():
    print("🚀 Starting Pharmacy Stock Data Import")
    print("=" * 50)
    
    # ============================================================================
    # CONFIGURATION - MODIFY THESE FOR EACH PHARMACY
    # ============================================================================
    PHARMACY_CODE = "pharmacy_code_here"  # CHANGE THIS: "roos", "tugela", "villiers", "winterton"
    PHARMACY_NAME = "Pharmacy Name Here"  # CHANGE THIS: "Roos Pharmacy", "Tugela Pharmacy", etc.
    REPORT_DATE = date.today()
    
    # ============================================================================
    # DATA FILES - MODIFY IF NEEDED
    # ============================================================================
    dept_file = 'Stock information/Department_codes.csv'
    stock_file = f'Stock information/{PHARMACY_CODE}_Daily_sales.csv'  # Adjust filename as needed
    
    print(f"Pharmacy: {PHARMACY_NAME} ({PHARMACY_CODE})")
    print(f"Date: {REPORT_DATE}")
    print()
    
    # Check if data files exist
    if not os.path.exists(dept_file):
        print(f"❌ Department file not found: {dept_file}")
        print("Please ensure the file exists in the Stock information folder.")
        return
    
    if not os.path.exists(stock_file):
        print(f"❌ Stock file not found: {stock_file}")
        print("Please ensure the file exists in the Stock information folder.")
        print("Expected format: Stock information/{pharmacy_code}_Daily_sales.csv")
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
    print(f"   - This will clear existing stock data for {PHARMACY_NAME.upper()} ONLY")
    print(f"   - The process may take several minutes for {stock_lines:,} items")
    print("   - Progress will be shown every 1,000 items")
    print("   - Each pharmacy has its own separate stock database")
    print()
    
    # Ask for confirmation
    response = input(f"Do you want to proceed with importing {PHARMACY_NAME}? (y/N): ")
    if response.lower() not in ['y', 'yes']:
        print("Import cancelled.")
        return
    
    print()
    print("🔄 Starting import process...")
    print()
    
    # Import the large stock data module and run it
    try:
        from scripts.import_large_stock_data import main as import_main
        
        # Override the pharmacy code in the import script
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