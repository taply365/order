import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import log from "minhluanlu-color-log";


// reconstruct __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Reads and returns an HTML template file as a string.
 * @param {string} templatePath - Relative path to the HTML template
 */
function getTemplate(templatePath) {
  if (!templatePath) return null;

  const fullPath = path.join(__dirname, `../templates/${templatePath}`);
  const template = fs.readFileSync(fullPath, "utf8");
  return template;
}
    

async function GenWellcomeTemplate(user) {
    try{
        const template = getTemplate('wellcome.html');
        const html = template.replace('{{ userName }}', user?.userName || "there");
        return html;
    }
    catch(error){
        log.err('❌ Error sending email:', error);
        throw error;
    }
}

export { GenWellcomeTemplate };
