#!/usr/bin/env python3
import os
import sys
import datetime
import shutil
import argparse

# Add project root to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

from app.db import create_session
from app.models import DailyReport
from app.parser import parse_html_daily
from app.email_fetcher import fetch_emails_last_n_days, sync_all_emails
from config import settings

TEMP_HTML_DIR = "/tmp/daily_html/"

def main():
    parser = argparse.ArgumentParser(description="Fetch and parse latest pharmacy emails for all pharmacies.")
    parser.add_argument('--all', action='store_true', help='Fetch all emails (not just last 7 days)')
    args = parser.parse_args()

    session = create_session()
    print(f"Database: {settings.DATABASE_URI}")

    days_to_fetch = 7
    total_emails_processed = 0
    latest_date = None
    for pharmacy_config in settings.MAILBOXES:
        pharmacy_name = pharmacy_config.get("name", pharmacy_config["code"])
        print(f"{'[ALL]' if args.all else '[LATEST]'} Now fetching {pharmacy_name}...")
        processed_files_count = 0
        email_count = 0
        try:
            if args.all:
                email_iter = sync_all_emails(pharmacy_config)
            else:
                email_iter = fetch_emails_last_n_days(pharmacy_config, days=days_to_fetch)
            email_iter = list(email_iter)  # Materialize to count
            email_count = len(email_iter)
            print(f"{pharmacy_name}: {email_count} emails found.")
            for filepath, report_date_obj in email_iter:
                if filepath:
                    print(f"Parsing report: {filepath} for date: {report_date_obj.strftime('%Y-%m-%d')}")
                    try:
                        data = parse_html_daily(filepath)
                        data['pharmacy_code'] = pharmacy_config["code"]
                        data['report_date'] = report_date_obj
                        session.query(DailyReport).filter_by(
                            pharmacy_code=pharmacy_config["code"],
                            report_date=report_date_obj
                        ).delete(synchronize_session='fetch')
                        new_report = DailyReport(**data)
                        session.add(new_report)
                        session.commit()
                        print(f"[SUCCESS] Report data saved to database for {pharmacy_config['code']} - {report_date_obj.strftime('%Y-%m-%d')}")
                        processed_files_count += 1
                        total_emails_processed += 1
                        if latest_date is None or report_date_obj > latest_date:
                            latest_date = report_date_obj
                    except Exception as e:
                        session.rollback()
                        print(f"[ERROR] Failed to parse or save report {filepath}: {e}")
                    finally:
                        if os.path.exists(filepath):
                            try:
                                os.remove(filepath)
                                print(f"Removed temporary file: {filepath}")
                            except OSError as e_rm:
                                print(f"[ERROR] Could not remove temp file {filepath}: {e_rm}")
                else:
                    print(f"[WARN] fetch_emails yielded None filepath for {report_date_obj}")
            if processed_files_count == 0:
                print(f"No new email reports found or processed for {pharmacy_name}.")
        except Exception as e_fetch:
            print(f"[ERROR] Could not fetch emails for {pharmacy_name}: {e_fetch}")
        print(f"Finished fetching emails for {pharmacy_name}.")
    if os.path.exists(TEMP_HTML_DIR) and not os.listdir(TEMP_HTML_DIR):
        try:
            shutil.rmtree(TEMP_HTML_DIR)
            print(f"Cleaned up empty temporary directory: {TEMP_HTML_DIR}")
        except OSError as e_rmdir:
            print(f"[ERROR] Could not remove temp directory {TEMP_HTML_DIR}: {e_rmdir}")
    session.close()
    if total_emails_processed > 0:
        print(f"{total_emails_processed} emails processed, all pharmacies now up to date until {latest_date.strftime('%Y-%m-%d') if latest_date else 'N/A'}.")
    else:
        print("No emails processed. Database may already be up to date.")

if __name__ == "__main__":
    main()
