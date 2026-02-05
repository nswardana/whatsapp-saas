const pool = require('../config/database');

async function authenticateUser(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.headers['apikey'];
    
    if (!apiKey) {
        return res.status(401).json({ 
            success: false,
            error: 'API Key required. Please provide x-api-key header' 
        });
    }
    
    try {
        const result = await pool.query(
            `SELECT id, email, plan_type, max_phone_numbers, max_messages_per_day, status 
             FROM users 
             WHERE api_key = $1 AND deleted_at IS NULL`,
            [apiKey]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid API Key' 
            });
        }
        
        if (result.rows[0].status !== 'active') {
            return res.status(403).json({ 
                success: false,
                error: `Account ${result.rows[0].status}. Please contact support.` 
            });
        }
        
        req.user = result.rows[0];
        
        // Log API request (non-blocking)
        pool.query(
            `INSERT INTO api_requests (user_id, endpoint, method, ip_address, user_agent) 
             VALUES ($1, $2, $3, $4, $5)`,
            [
                req.user.id,
                req.path,
                req.method,
                req.ip,
                req.headers['user-agent']
            ]
        ).catch(err => console.error('Log API request error:', err));
        
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Authentication failed' 
        });
    }
}

module.exports = { authenticateUser };
