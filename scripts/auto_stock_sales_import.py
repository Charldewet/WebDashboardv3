#!/usr/bin/env python3
"""
Automated stock sales PDF importer.
- Searches inbox for new emails with PDF attachments (inline or not)
- Downloads and parses new PDFs, inserting data into the database
- Tracks processed PDFs by email ID and filename in processed_pdfs.json
- Safe to run every 10 minutes (idempotent)
"""

import os
import sys
import json
import imaplib
import email
from email.header import decode_header
import datetime
import socket
import time
from pathlib import Path

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config.settings import MAILBOXES
from scripts.parse_stock_sales_pdf import parse_pdf_stock_sales

PROCESSED_FILE = "processed_pdfs.json"
PDF_SAVE_DIR = os.getcwd()
SENDER_EMAIL = "cdewet05@gmail.com"

# --- Email helpers (from search_stock_sales_pdf.py, with inline PDF support) ---
def get_reitz_pharmacy_config():
    for mailbox in MAILBOXES:
        if mailbox['code'] == 'reitz':
            return mailbox
    return None

def _get_imap_connection(pharmacy_config):
    user = pharmacy_config.get("email_user")
    password = pharmacy_config.get("email_password")
    server = pharmacy_config.get("imap_server", "imap.gmail.com")
    if not user or not password:
        raise ValueError(f"Missing email credentials for pharmacy {pharmacy_config.get('code', 'unknown')}")
    try:
        socket.setdefaulttimeout(30)
        mail = imaplib.IMAP4_SSL(server)
        mail.login(user, password)
        return mail
    except Exception as e:
        raise Exception(f"IMAP connection failed: {e}")

def search_for_pdf_attachments(pharmacy_config, sender_email, days_back=7):
    mail = _get_imap_connection(pharmacy_config)
    mail.select("inbox")
    search_criteria = f'(FROM "{sender_email}")'
    status, messages = mail.search(None, search_criteria)
    if status != "OK":
        print(f"IMAP search failed: {status}")
        mail.logout()
        return []
    email_ids = messages[0].split()
    pdfs = []
    for email_id in reversed(email_ids):
        status, msg_data = mail.fetch(email_id, "(RFC822)")
        if status != "OK":
            continue
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg = email.message_from_bytes(response_part[1])
                subject = decode_header(msg["Subject"])[0][0]
                if isinstance(subject, bytes):
                    subject = subject.decode()
                date_str = msg["Date"]
                try:
                    email_date = email.utils.parsedate_to_datetime(date_str)
                except:
                    email_date = datetime.datetime.now()
                for part in msg.walk():
                    filename = part.get_filename()
                    content_disposition = str(part.get("Content-Disposition", "")).lower()
                    if filename and filename.lower().endswith('.pdf'):
                        pdf_data = part.get_payload(decode=True)
                        safe_filename = filename.replace('/', '_').replace('\\', '_')
                        pdf_path = os.path.join(PDF_SAVE_DIR, safe_filename)
                        pdfs.append({
                            'email_id': email_id.decode(),
                            'filename': safe_filename,
                            'saved_path': pdf_path,
                            'subject': subject,
                            'date': email_date.strftime('%Y-%m-%d %H:%M'),
                            'raw_date': email_date,
                            'content_disposition': content_disposition,
                            'data': pdf_data
                        })
    mail.logout()
    return pdfs

# --- Processed PDFs tracking ---
def load_processed():
    if not os.path.exists(PROCESSED_FILE):
        return set()
    with open(PROCESSED_FILE, 'r') as f:
        try:
            data = json.load(f)
            return set(data)
        except Exception:
            return set()

def save_processed(processed_set):
    with open(PROCESSED_FILE, 'w') as f:
        json.dump(list(processed_set), f)

# --- Main automation logic ---
def main():
    print(f"[{datetime.datetime.now()}] Auto stock sales import started.")
    reitz_config = get_reitz_pharmacy_config()
    if not reitz_config:
        print("Reitz pharmacy config not found.")
        return
    processed = load_processed()
    print(f"Loaded {len(processed)} processed PDFs.")
    pdfs = search_for_pdf_attachments(reitz_config, SENDER_EMAIL, days_back=7)
    print(f"Found {len(pdfs)} PDF(s) in inbox.")
    new_count = 0
    for pdf in pdfs:
        unique_id = f"{pdf['email_id']}|{pdf['filename']}"
        if unique_id in processed:
            continue
        # Save PDF
        with open(pdf['saved_path'], 'wb') as f:
            f.write(pdf['data'])
        print(f"Saved new PDF: {pdf['saved_path']} (from email {pdf['email_id']})")
        # Parse PDF
        try:
            print(f"Parsing PDF: {pdf['saved_path']}")
            parse_pdf_stock_sales(pdf['saved_path'])
            print(f"Parsed and imported: {pdf['saved_path']}")
        except Exception as e:
            print(f"Error parsing {pdf['saved_path']}: {e}")
            continue
        processed.add(unique_id)
        new_count += 1
    save_processed(processed)
    print(f"Import complete. {new_count} new PDF(s) processed.")

if __name__ == "__main__":
    main() 