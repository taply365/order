import log from "minhluanlu-color-log";
import { SendWellcomeEmail, SendSupportEmail } from "../email/index.js";

const handleSendWellcomeEmail = async (req, res) => {
    try{
        const user  = req.body;
        log.debug("📧 Received request to send welcome email to:", user?.email);
        await SendWellcomeEmail(user);
        res.status(200).json({ success: true, message: 'Welcome email sent successfully' });
    }
    catch(error){
        console.log('❌ Error in handleSendWellcomeEmail:', error);
        res.status(500).json({ success: false, message: 'Failed to send welcome email' });
    }
};

const handleSendSupportEmail = async (req, res) => {
    try{
        const data = req.body;
        const {email, message}  = data;
        log.debug("📧 Received request to send support email to support team:", email);
        await SendSupportEmail(data);
        res.status(200).json({ success: true, message: 'Support email sent successfully' });
    }
    catch(error){
        console.log('❌ Error in handleSendSupportEmail:', error);
        res.status(500).json({ success: false, message: 'Failed to send support email' });
    }
};

export { handleSendWellcomeEmail, handleSendSupportEmail };