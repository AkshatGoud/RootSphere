import os
import logging
import threading
import requests

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "RootSphere <onboarding@resend.dev>")


def _send_email(to_email: str, subject: str, html: str):
    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={
                "from": EMAIL_FROM,
                "to": [to_email],
                "subject": subject,
                "html": html,
            },
            timeout=10,
        )
        if resp.status_code == 200:
            logger.info(f"Email sent to {to_email}")
        else:
            logger.error(f"Resend API error: {resp.status_code} {resp.text}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")


def send_reset_code(to_email: str, code: str):
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — printing code to console instead")
        print(f"\n[EMAIL SIMULATION] Password Reset Code for {to_email}: {code}\n", flush=True)
        return

    subject = f"RootSphere — Your Password Reset Code: {code}"

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

    threading.Thread(target=_send_email, args=(to_email, subject, html), daemon=True).start()
