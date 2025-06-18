import os
import imaplib
import email
from email.header import decode_header
import datetime
import socket
from app.models import ProcessedStockSales
from app.db import create_session
from config.settings import MAILBOXES
from scripts.parse_stock_sales_pdf import parse_pdf_stock_sales

PDF_SAVE_DIR = os.getcwd()
SENDER_EMAIL = "cdewet05@gmail.com"

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

def fetch_and_process_stock_sales_pdfs():
    print(f"[{datetime.datetime.now()}] [StockSalesFetcher] Start fetch and process.")
    reitz_config = get_reitz_pharmacy_config()
    if not reitz_config:
        print("[StockSalesFetcher] Reitz pharmacy config not found.")
        return
    session = create_session()
    try:
        mail = _get_imap_connection(reitz_config)
        mail.select("inbox")
        search_criteria = f'(FROM "{SENDER_EMAIL}")'
        status, messages = mail.search(None, search_criteria)
        if status != "OK":
            print(f"[StockSalesFetcher] IMAP search failed: {status}")
            mail.logout()
            return
        email_ids = messages[0].split()
        print(f"[StockSalesFetcher] Found {len(email_ids)} email(s) from {SENDER_EMAIL}.")
        new_count = 0
        for email_id in reversed(email_ids):
            # Check if already processed
            if session.query(ProcessedStockSales).filter_by(email_id=email_id.decode()).first():
                continue
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
                    found_pdf = False
                    for part in msg.walk():
                        filename = part.get_filename()
                        content_disposition = str(part.get("Content-Disposition", "")).lower()
                        if filename and filename.lower().endswith('.pdf'):
                            found_pdf = True
                            pdf_data = part.get_payload(decode=True)
                            safe_filename = filename.replace('/', '_').replace('\\', '_')
                            pdf_path = os.path.join(PDF_SAVE_DIR, safe_filename)
                            with open(pdf_path, 'wb') as f:
                                f.write(pdf_data)
                            print(f"[StockSalesFetcher] Saved PDF: {pdf_path} (from email {email_id.decode()})")
                            try:
                                print(f"[StockSalesFetcher] Parsing PDF: {pdf_path}")
                                parse_pdf_stock_sales(pdf_path)
                                print(f"[StockSalesFetcher] Parsed and imported: {pdf_path}")
                                # Mark as processed
                                processed = ProcessedStockSales(
                                    email_id=email_id.decode(),
                                    filename=safe_filename
                                )
                                session.add(processed)
                                session.commit()
                                new_count += 1
                            except Exception as e:
                                print(f"[StockSalesFetcher] Error parsing {pdf_path}: {e}")
                                session.rollback()
                                continue
                    if not found_pdf:
                        print(f"[StockSalesFetcher] No PDF found in email {email_id.decode()}.")
        mail.logout()
        print(f"[StockSalesFetcher] Import complete. {new_count} new PDF(s) processed.")
    except Exception as e:
        print(f"[StockSalesFetcher] Error: {e}")
    finally:
        session.close() 