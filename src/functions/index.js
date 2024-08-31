const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: functions.config().gmail.email,
        pass: functions.config().gmail.password
    }
});

exports.sendInvitationEmail = functions.database.ref('/sharedLists/{listId}')
    .onCreate(async (snapshot, context) => {
        console.log('Nueva invitación creada');
        const invitedEmail = snapshot.val().invitedEmail;
        console.log('Email invitado:', invitedEmail);

        const mailOptions = {
            from: 'wishlistapp@gmail.com',
            to: invitedEmail,
            subject: 'Invitación a lista compartida',
            text: 'Has sido invitado a una lista compartida. Por favor, inicia sesión en la aplicación para verla.'
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Email enviado con éxito a:', invitedEmail);
            return null;
        } catch (error) {
            console.error('Error al enviar email:', error);
            throw new functions.https.HttpsError('internal', 'Error al enviar el email de invitación');
        }
    });