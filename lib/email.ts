import { Resend } from 'resend';

// Lazy-initialized to avoid build-time errors
let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables');
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendApprovalEmail(
  to: string,
  memberName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: `The Forge Functional Fitness <${FROM_EMAIL}>`,
      to,
      subject: 'Welcome to The Forge! Your Account Has Been Approved',
      html: getApprovalEmailHtml(memberName),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

function getApprovalEmailHtml(memberName: string): string {
  const loginUrl = `${APP_URL}/login`;
  const firstName = memberName.split(' ')[0];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to The Forge</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="${APP_URL}/logo.png" alt="The Forge Functional Fitness" width="180" style="display: block; max-width: 180px; height: auto;" />
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden;">

              <!-- Teal Header Bar -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #178da6, #14b8a6); padding: 32px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">
                      You're In!
                    </h1>
                    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 400;">
                      Your account has been approved
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Body Content -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 40px;">

                    <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                      Hey ${firstName},
                    </p>

                    <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                      Great news! Your coach has approved your membership at <strong style="color: #2dd4bf;">The Forge Functional Fitness</strong>. You can now log in and start booking classes.
                    </p>

                    <!-- What You Can Do -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background-color: #0f172a; border-radius: 12px; border: 1px solid #334155;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 16px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                            What you can do now
                          </p>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 6px 0; color: #e2e8f0; font-size: 14px;">
                                &#10003;&nbsp;&nbsp;Book classes and reserve your spot
                              </td>
                            </tr>
                          </table>

                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; background-color: #1e293b; border-radius: 8px; border: 1px solid #334155;">
                            <tr>
                              <td style="padding: 16px;">
                                <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                  Upgrade to Athlete App
                                </p>
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding: 4px 0; color: #cbd5e1; font-size: 14px;">
                                      &#9733;&nbsp;&nbsp;Personal workout logbook
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 4px 0; color: #cbd5e1; font-size: 14px;">
                                      &#9733;&nbsp;&nbsp;Track PRs and lift records
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 4px 0; color: #cbd5e1; font-size: 14px;">
                                      &#9733;&nbsp;&nbsp;Leaderboards and achievements
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 4px 0; color: #cbd5e1; font-size: 14px;">
                                      &#9733;&nbsp;&nbsp;Progress charts and analytics
                                    </td>
                                  </tr>
                                </table>
                                <p style="margin: 12px 0 0; color: #2dd4bf; font-size: 13px; font-weight: 600;">
                                  30 days free &mdash; activate after you log in
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0 16px;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #178da6, #14b8a6); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 48px; border-radius: 10px; letter-spacing: 0.3px;">
                            Log In Now
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 24px 0 0; color: #64748b; font-size: 13px; text-align: center; line-height: 1.5;">
                      Use the email address and password you registered with.
                    </p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px; text-align: center;">
              <p style="margin: 0 0 8px; color: #475569; font-size: 13px;">
                The Forge Functional Fitness
              </p>
              <p style="margin: 0; color: #334155; font-size: 12px;">
                This email was sent because your coach approved your membership.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
