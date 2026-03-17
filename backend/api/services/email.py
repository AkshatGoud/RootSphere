import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_APP_PASSWORD = os.getenv("SMTP_APP_PASSWORD")


def send_reset_code(to_email: str, code: str):
    if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
        logger.warning("SMTP not configured — printing code to console instead")
        print(f"\n[EMAIL SIMULATION] Password Reset Code for {to_email}: {code}\n", flush=True)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"RootSphere — Your Password Reset Code: {code}"
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email

    html = f"""\
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #059669; margin: 0;">🌱 RootSphere AI</h2>
        </div>
        <h3 style="color: #111827;">Password Reset</h3>
        <p style="color: #4b5563;">Use the code below to reset your password. It expires in 15 minutes.</p>
        <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #059669;
                         background: #ecfdf5; padding: 12px 24px; border-radius: 8px;">
                {code}
            </span>
        </div>
        <p style="color: #9ca3af; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    """

    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
        server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

    logger.info(f"Password reset email sent to {to_email}")
