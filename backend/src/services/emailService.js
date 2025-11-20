/**
 * Servicio de Email usando Resend
 */
import { Resend } from 'resend';

/**
 * Enviar email de recuperación de contraseña
 * @param {string} resendApiKey - API key de Resend
 * @param {string} toEmail - Email del destinatario
 * @param {string} token - Token de recuperación
 * @param {string} frontendUrl - URL del frontend
 * @returns {Promise<void>}
 */
export async function sendPasswordResetEmail(resendApiKey, toEmail, token, frontendUrl) {
  if (!resendApiKey) {
    console.error('❌ RESEND_API_KEY no configurada');
    throw new Error('Servicio de email no configurado');
  }

  const resend = new Resend(resendApiKey);

  const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'APP Presupuesto <noreply@resend.dev>', // Cambiar a tu dominio verificado
      to: [toEmail],
      subject: 'Recuperación de Contraseña - APP Presupuesto',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperación de Contraseña</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #0d6efd; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🔐 Recuperación de Contraseña</h1>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hola,</p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>APP Presupuesto</strong>.
            </p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              Para crear una nueva contraseña, haz clic en el siguiente botón:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #0d6efd; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px; font-weight: bold;">
                Restablecer Contraseña
              </a>
            </div>

            <p style="font-size: 14px; color: #6c757d; margin-bottom: 15px;">
              O copia y pega este enlace en tu navegador:
            </p>
            <p style="font-size: 12px; color: #6c757d; word-break: break-all; background-color: #e9ecef; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="font-size: 14px; color: #6c757d; margin-bottom: 10px;">
                ⏱️ <strong>Este enlace expira en 1 hora</strong>
              </p>

              <p style="font-size: 14px; color: #6c757d; margin-bottom: 10px;">
                ⚠️ Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura.
              </p>

              <p style="font-size: 14px; color: #6c757d; margin-bottom: 0;">
                🔒 Por tu seguridad, nunca compartas este enlace con nadie.
              </p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6c757d; font-size: 12px;">
            <p style="margin: 5px 0;">© ${new Date().getFullYear()} APP Presupuesto</p>
            <p style="margin: 5px 0;">Gestión de Gastos Personales</p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Error al enviar email:', error);
      throw new Error('Error al enviar el email de recuperación');
    }

    console.log('✅ Email de recuperación enviado:', data?.id);
  } catch (error) {
    console.error('❌ Error en sendPasswordResetEmail:', error);
    throw new Error('Error al enviar el email de recuperación');
  }
}

/**
 * Enviar email de confirmación de cambio de contraseña
 * @param {string} resendApiKey - API key de Resend
 * @param {string} toEmail - Email del destinatario
 * @returns {Promise<void>}
 */
export async function sendPasswordChangedEmail(resendApiKey, toEmail) {
  if (!resendApiKey) {
    console.error('❌ RESEND_API_KEY no configurada');
    return; // No fallar si no está configurado
  }

  const resend = new Resend(resendApiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: 'APP Presupuesto <noreply@resend.dev>', // Cambiar a tu dominio verificado
      to: [toEmail],
      subject: 'Contraseña Actualizada - APP Presupuesto',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contraseña Actualizada</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">✅ Contraseña Actualizada</h1>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hola,</p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              Tu contraseña de <strong>APP Presupuesto</strong> ha sido actualizada exitosamente.
            </p>

            <div style="background-color: #d1f4e0; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #0f6039;">
                <strong>✓ Confirmación:</strong> Tu cuenta ahora está protegida con tu nueva contraseña.
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="font-size: 14px; color: #dc3545; margin-bottom: 10px;">
                ⚠️ <strong>¿No realizaste este cambio?</strong>
              </p>

              <p style="font-size: 14px; color: #6c757d; margin-bottom: 10px;">
                Si no solicitaste este cambio de contraseña, tu cuenta podría estar comprometida.
                Contacta al soporte inmediatamente.
              </p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6c757d; font-size: 12px;">
            <p style="margin: 5px 0;">© ${new Date().getFullYear()} APP Presupuesto</p>
            <p style="margin: 5px 0;">Gestión de Gastos Personales</p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Error al enviar email de confirmación:', error);
      // No lanzar error para no bloquear el proceso
    } else {
      console.log('✅ Email de confirmación enviado:', data?.id);
    }
  } catch (error) {
    console.error('❌ Error en sendPasswordChangedEmail:', error);
    // No lanzar error para no bloquear el proceso
  }
}
