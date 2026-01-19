import { Resend } from 'resend'

const APP_NAME = 'ZITA TODO'
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@zita.sk'

// Initialize Resend client lazily
let resendClient: Resend | null = null
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

interface SendInvitationEmailParams {
  to: string
  inviteeName: string
  inviterName?: string
  inviteUrl: string
  role: string
  departments?: string[]
}

export async function sendInvitationEmail({
  to,
  inviteeName,
  inviterName,
  inviteUrl,
  role,
  departments,
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string }> {
  // If no API key, skip email sending (for development)
  const resend = getResendClient()
  if (!resend) {
    console.warn('RESEND_API_KEY not configured - skipping email send')
    return { success: true }
  }

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    strategicka_rada: 'Strategická rada',
    hr: 'HR',
    member: 'Člen',
  }

  const roleLabel = roleLabels[role] || role
  const departmentList = departments?.length ? departments.join(', ') : 'Žiadne'

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1D1D1F; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #007AFF; margin: 0;">${APP_NAME}</h1>
  </div>

  <div style="background: #f5f5f7; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
    <h2 style="margin-top: 0;">Ahoj ${inviteeName}!</h2>

    <p>${inviterName ? `<strong>${inviterName}</strong> vás pozýva` : 'Boli ste pozvaní'} do tímu ${APP_NAME}.</p>

    <div style="background: white; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Rola:</strong> ${roleLabel}</p>
      <p style="margin: 5px 0;"><strong>Oddelenia:</strong> ${departmentList}</p>
    </div>

    <p>Pre vytvorenie účtu kliknite na tlačidlo nižšie:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" style="display: inline-block; background: #007AFF; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Prijať pozvánku
      </a>
    </div>

    <p style="color: #86868B; font-size: 14px;">
      Ak tlačidlo nefunguje, skopírujte tento odkaz do prehliadača:<br>
      <a href="${inviteUrl}" style="color: #007AFF; word-break: break-all;">${inviteUrl}</a>
    </p>

    <p style="color: #86868B; font-size: 14px; margin-bottom: 0;">
      Táto pozvánka je platná 7 dní.
    </p>
  </div>

  <p style="color: #86868B; font-size: 12px; text-align: center;">
    Tento email bol odoslaný automaticky z ${APP_NAME}.<br>
    Ak ste túto pozvánku neočakávali, môžete tento email ignorovať.
  </p>
</body>
</html>
  `

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Pozvánka do ${APP_NAME}`,
      html: htmlContent,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Email send error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' }
  }
}
