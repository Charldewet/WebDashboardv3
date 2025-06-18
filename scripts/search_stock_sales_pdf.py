#!/usr/bin/env python3
"""
Script to search for stock sales PDF attachments from cdewet05@gmail.com
in the dmr.tlc.reitz@gmail.com email account.
"""

import os
import sys
import imaplib
import email
from email.header import decode_header
import datetime
import tempfile
import socket

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config.settings import MAILBOXES

def get_reitz_pharmacy_config():
    """Get the Reitz pharmacy email configuration."""
    for mailbox in MAILBOXES:
        if mailbox['code'] == 'reitz':
            return mailbox
    return None

def _get_imap_connection(pharmacy_config):
    """Get IMAP connection with proper timeout and error handling."""
    user = pharmacy_config.get("email_user")
    password = pharmacy_config.get("email_password")
    server = pharmacy_config.get("imap_server", "imap.gmail.com")
    
    if not user or not password:
        raise ValueError(f"Missing email credentials for pharmacy {pharmacy_config.get('code', 'unknown')}")
    
    try:
        # Set socket timeout to prevent hanging connections
        socket.setdefaulttimeout(30)
        mail = imaplib.IMAP4_SSL(server)
        mail.login(user, password)
        return mail
    except imaplib.IMAP4.error as e:
        raise Exception(f"IMAP authentication failed for {user}: {e}")
    except socket.timeout:
        raise Exception(f"IMAP connection timed out for server {server}")
    except Exception as e:
        raise Exception(f"Failed to connect to IMAP server {server}: {e}")

def search_emails_comprehensive(pharmacy_config, sender_email=None, days_back=90):
    """Search for emails comprehensively, including different search criteria."""
    mail = None
    try:
        pharmacy_name = pharmacy_config.get('name', pharmacy_config.get('code', 'unknown'))
        print(f"🔍 Comprehensive email search in {pharmacy_name}...")
        
        mail = _get_imap_connection(pharmacy_config)
        mail.select("inbox")
        
        # Try different search criteria
        search_criteria_list = []
        
        if sender_email:
            search_criteria_list.append(f'(FROM "{sender_email}")')
        
        # Search for emails with stock sales related keywords
        search_criteria_list.extend([
            '(SUBJECT "stock sales")',
            '(SUBJECT "sales report")',
            '(SUBJECT "daily sales")',
            '(SUBJECT "PDF")',
            '(SUBJECT "report")'
        ])
        
        all_emails = []
        
        for search_criteria in search_criteria_list:
            print(f"\n📧 Searching with criteria: {search_criteria}")
            
            status, messages = mail.search(None, search_criteria)
            if status != "OK":
                print(f"❌ IMAP search failed: {status}")
                continue
            
            if not messages[0]:
                print(f"⚠️  No emails found with criteria: {search_criteria}")
                continue
            
            email_ids = messages[0].split()
            print(f"✓ Found {len(email_ids)} email(s) with criteria: {search_criteria}")
            
            for email_id in email_ids:
                if email_id not in all_emails:
                    all_emails.append(email_id)
        
        print(f"\n📊 Total unique emails found: {len(all_emails)}")
        return all_emails
        
    except Exception as e:
        print(f"❌ Error searching emails: {e}")
        return []
    finally:
        if mail:
            try:
                mail.close()
                mail.logout()
            except Exception as e_logout:
                print(f"⚠️  Error during IMAP logout: {e_logout}")

def analyze_email_attachments(mail, email_ids):
    """Analyze emails for any type of attachments, especially PDFs (including inline)."""
    pdf_attachments = []
    other_attachments = []
    
    for i, email_id in enumerate(reversed(email_ids)):  # Process newest first
        try:
            print(f"\n📄 Processing email {i+1}/{len(email_ids)}...")
            status, msg_data = mail.fetch(email_id, "(RFC822)")
            if status != "OK":
                print(f"❌ Failed to fetch email {email_id}: {status}")
                continue
            
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    try:
                        msg = email.message_from_bytes(response_part[1])
                        
                        # Get email details
                        subject = decode_header(msg["Subject"])[0][0]
                        if isinstance(subject, bytes):
                            subject = subject.decode()
                        
                        from_header = decode_header(msg["From"])[0][0]
                        if isinstance(from_header, bytes):
                            from_header = from_header.decode()
                        
                        date_str = msg["Date"]
                        email_date = None
                        try:
                            email_date = email.utils.parsedate_to_datetime(date_str)
                        except:
                            email_date = datetime.datetime.now()
                        
                        print(f"   📧 Subject: {subject}")
                        print(f"   👤 From: {from_header}")
                        print(f"   📅 Date: {email_date.strftime('%Y-%m-%d %H:%M')}")
                        
                        # Check for attachments (including inline PDFs)
                        has_attachments = False
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition", "")).lower()
                            filename = part.get_filename()
                            
                            if filename and filename.lower().endswith('.pdf'):
                                has_attachments = True
                                file_ext = os.path.splitext(filename.lower())[1]
                                print(f"   📎 PDF Detected: {filename} ({content_type}, disposition: {content_disposition})")
                                try:
                                    pdf_data = part.get_payload(decode=True)
                                    safe_filename = filename.replace('/', '_').replace('\\', '_')
                                    pdf_path = os.path.join(os.getcwd(), safe_filename)
                                    with open(pdf_path, 'wb') as f:
                                        f.write(pdf_data)
                                    pdf_attachments.append({
                                        'filename': filename,
                                        'saved_path': pdf_path,
                                        'subject': subject,
                                        'from': from_header,
                                        'date': email_date,
                                        'email_id': email_id.decode(),
                                        'content_type': content_type,
                                        'disposition': content_disposition
                                    })
                                    print(f"   💾 PDF saved to: {pdf_path}")
                                except Exception as e:
                                    print(f"   ❌ Error saving PDF: {e}")
                            elif filename:
                                has_attachments = True
                                other_attachments.append({
                                    'filename': filename,
                                    'subject': subject,
                                    'from': from_header,
                                    'date': email_date,
                                    'content_type': content_type,
                                    'disposition': content_disposition
                                })
                        if not has_attachments:
                            print(f"   ⚠️  No attachments found")
                    except Exception as e:
                        print(f"   ❌ Error processing email content: {e}")
                        continue
        except Exception as e:
            print(f"❌ Error processing email {email_id}: {e}")
            continue
    return pdf_attachments, other_attachments

def main():
    """Main function to search for stock sales PDFs."""
    print("=== Comprehensive Stock Sales PDF Search ===")
    
    # Get Reitz pharmacy configuration
    reitz_config = get_reitz_pharmacy_config()
    if not reitz_config:
        print("❌ Reitz pharmacy configuration not found in settings")
        return
    
    # Search for emails comprehensively
    sender_email = "cdewet05@gmail.com"
    email_ids = search_emails_comprehensive(reitz_config, sender_email, days_back=90)
    
    if not email_ids:
        print(f"\n⚠️  No emails found")
        return
    
    # Analyze attachments in found emails
    print(f"\n🔍 Analyzing attachments in {len(email_ids)} emails...")
    
    mail = _get_imap_connection(reitz_config)
    mail.select("inbox")
    
    try:
        pdf_attachments, other_attachments = analyze_email_attachments(mail, email_ids)
        
        # Report results
        if pdf_attachments:
            print(f"\n✅ Found {len(pdf_attachments)} PDF attachment(s):")
            for i, attachment in enumerate(pdf_attachments, 1):
                print(f"\n{i}. {attachment['filename']}")
                print(f"   Subject: {attachment['subject']}")
                print(f"   From: {attachment['from']}")
                print(f"   Date: {attachment['date'].strftime('%Y-%m-%d %H:%M')}")
                print(f"   Saved to: {attachment['saved_path']}")
            
            print(f"\n📋 Next steps:")
            print(f"   1. Review the PDF files above")
            print(f"   2. Run the parsing script on the stock sales PDF:")
            print(f"      python scripts/parse_stock_sales_pdf.py 'filename.pdf'")
        else:
            print(f"\n⚠️  No PDF attachments found")
        
        if other_attachments:
            print(f"\n📎 Other attachments found ({len(other_attachments)}):")
            for i, attachment in enumerate(other_attachments[:5], 1):  # Show first 5
                print(f"   {i}. {attachment['filename']} ({attachment['content_type']})")
                print(f"      Subject: {attachment['subject']}")
                print(f"      From: {attachment['from']}")
            if len(other_attachments) > 5:
                print(f"   ... and {len(other_attachments) - 5} more")
        
    finally:
        mail.close()
        mail.logout()

if __name__ == "__main__":
    main() 