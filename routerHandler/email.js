import log from "minhluanlu-color-log";
import { SendWellcomeEmail} from "../email/index.js";

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

export { handleSendWellcomeEmail };