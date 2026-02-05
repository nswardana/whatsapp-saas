const crypto = require('crypto');

function generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function generateInstanceName(userId) {
    return `user_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function sanitizePhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present (assuming Indonesian number)
    if (!cleaned.startsWith('62') && cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    } else if (!cleaned.startsWith('62') && !cleaned.startsWith('0')) {
        cleaned = '62' + cleaned;
    }
    
    return cleaned;
}

module.exports = {
    generateApiKey,
    generateToken,
    generateInstanceName,
    sanitizePhoneNumber
};
