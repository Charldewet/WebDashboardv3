#!/usr/bin/env python3
"""
Manually triggers the stock sales PDF fetching and processing logic.
"""
import os
import sys

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.stock_sales_fetcher import fetch_and_process_stock_sales_pdfs

def main():
    """Main function to run the manual fetch."""
    print("=== Running Manual Stock Sales Fetch ===")
    try:
        fetch_and_process_stock_sales_pdfs()
        print("\n✅ Manual fetch completed successfully!")
    except Exception as e:
        print(f"\n❌ An error occurred during the manual fetch: {e}")

if __name__ == "__main__":
    main() 