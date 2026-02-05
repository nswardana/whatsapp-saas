require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const bcrypt = require('bcrypt');

const pool = require('./config/database');
const { getNextServer, EVOLUTION_API_KEY } = require('./config/evolution');
const { authenticateUser } = require('./middleware/auth');
const { 
    generateApiKey, 
    generateToken, 
    generateInstanceName,
    sanitizePhoneNumber 
} = require('./utils/helpers');

const app = express();

// Trust only the first proxy (nginx)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));
// ========================================
// RATE LIMITER (DISABLED FOR DEVELOPMENT)
// ========================================

const noopLimiter = (req, res, next) => next();

const apiLimiter =
  process.env.NODE_ENV === 'production'
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => req.ip || 'unknown'
      })
    : noopLimiter;

const authLimiter =
  process.env.NODE_ENV === 'production'
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => req.ip || 'unknown'
      })
    : noopLimiter;

// ========================================
// HEALTH CHECK
// ========================================
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ========================================
// AUTHENTICATION ENDPOINTS
// ========================================

// Register
app.post('/auth/register', authLimiter, async (req, res) => {
    const { email, password, full_name, company_name, plan_type } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false,
            error: 'Email and password are required' 
        });
    }
    
    if (password.length < 8) {
        return res.status(400).json({ 
            success: false,
            error: 'Password must be at least 8 characters' 
        });
    }
    
    try {
        
       // const password_hash = await bcrypt.hash(password, 10);
        const api_key = generateApiKey();
        
        return res.status(400).json({ 
            success: false,
            error: 'Password'+ "API_KEY"+api_key 
        });
    /*
        let maxPhones = 3;
        let maxMessages = 1000;
        
        if (plan_type === 'business') {
            maxPhones = 10;
            maxMessages = 5000;
        } else if (plan_type === 'enterprise') {
            maxPhones = 50;
            maxMessages = 50000;
        }
        
        const result = await pool.query(
            `INSERT INTO users 
             (email, password_hash, api_key, full_name, company_name, plan_type, max_phone_numbers, max_messages_per_day)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, email, api_key, full_name, plan_type, max_phone_numbers, created_at`,
            [
                email.toLowerCase(),
                password_hash,
                api_key,
                full_name || null,
                company_name || null,
                plan_type || 'starter',
                maxPhones,
                maxMessages
            ]
        );
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: result.rows[0].id,
                email: result.rows[0].email,
                api_key: result.rows[0].api_key,
                full_name: result.rows[0].full_name,
                plan_type: result.rows[0].plan_type,
                max_phone_numbers: result.rows[0].max_phone_numbers,
                created_at: result.rows[0].created_at
            }
        });
        */
        
    } catch (error) {
        console.error('Register error:', error);
        
        if (error.constraint === 'users_email_key') {
            return res.status(400).json({ 
                success: false,
                error: 'Email already registered' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Registration failed' 
        });
    }
});

// Login
app.post('/auth/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false,
            error: 'Email and password are required' 
        });
    }
    
    try {
        const result = await pool.query(
            `SELECT id, email, password_hash, api_key, full_name, plan_type, status 
             FROM users 
             WHERE email = $1 AND deleted_at IS NULL`,
            [email.toLowerCase()]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid email or password' 
            });
        }
        
        const user = result.rows[0];
        
        if (user.status !== 'active') {
            return res.status(403).json({ 
                success: false,
                error: `Account ${user.status}` 
            });
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid email or password' 
            });
        }
        
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                api_key: user.api_key,
                plan_type: user.plan_type
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Login failed' 
        });
    }
});

// Get Profile
app.get('/user/profile', authenticateUser, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM user_dashboard WHERE id = $1`,
            [req.user.id]
        );
        
        res.json({
            success: true,
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch profile' 
        });
    }
});

// ========================================
// PHONE NUMBER MANAGEMENT
// ========================================

// Create Phone Number
app.post('/phone-numbers/create', authenticateUser, apiLimiter, async (req, res) => {
    const { display_name, webhook_url } = req.body;
    
    try {
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM phone_numbers WHERE user_id = $1 AND deleted_at IS NULL',
            [req.user.id]
        );
        
        const currentCount = parseInt(countResult.rows[0].count);
        
        if (currentCount >= req.user.max_phone_numbers) {
            return res.status(403).json({ 
                success: false,
                error: 'Phone number limit reached',
                current: currentCount,
                max: req.user.max_phone_numbers
            });
        }
        
        const instanceName = generateInstanceName(req.user.id);
        const token = generateToken();
        const server = getNextServer();
        
        console.log(`Creating instance on ${server}: ${instanceName}`);
        
        const evolutionResponse = await axios.post(
            `${server}/instance/create`,
            {
                instanceName: instanceName,
                token: token,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
                webhookUrl: webhook_url || process.env.WEBHOOK_URL,
                webhookByEvents: true,
                webhookBase64: false
            },
            {
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        const dbResult = await pool.query(
            `INSERT INTO phone_numbers 
             (user_id, instance_name, token, display_name, server_instance, status, webhook_url, qr_code, qr_expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '5 minutes')
             RETURNING *`,
            [
                req.user.id,
                instanceName,
                token,
                display_name || `Phone ${currentCount + 1}`,
                server,
                'qr_ready',
                webhook_url || null,
                evolutionResponse.data.qrcode?.base64 || null
            ]
        );
        
        res.status(201).json({
            success: true,
            message: 'Phone number instance created successfully',
            phone_number: {
                id: dbResult.rows[0].id,
                instance_name: instanceName,
                token: token,
                display_name: dbResult.rows[0].display_name,
                status: 'qr_ready',
                qr_code: evolutionResponse.data.qrcode?.base64,
                qr_expires_at: dbResult.rows[0].qr_expires_at,
                server: server
            }
        });
        
    } catch (error) {
        console.error('Create instance error:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create phone number instance',
            details: error.response?.data?.message || error.message
        });
    }
});

// List Phone Numbers
app.get('/phone-numbers', authenticateUser, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM phone_number_details WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );
        
        res.json({
            success: true,
            count: result.rows.length,
            phone_numbers: result.rows
        });
        
    } catch (error) {
        console.error('List phone numbers error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch phone numbers' 
        });
    }
});

// Get QR Code
app.get('/phone-numbers/:id/qr', authenticateUser, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT instance_name, token, server_instance, status, qr_code, qr_expires_at
             FROM phone_numbers 
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [req.params.id, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Phone number not found' 
            });
        }
        
        const phoneNumber = result.rows[0];
        
        if (!phoneNumber.qr_code || new Date(phoneNumber.qr_expires_at) < new Date()) {
            try {
                const qrResponse = await axios.get(
                    `${phoneNumber.server_instance}/instance/connect/${phoneNumber.instance_name}`,
                    {
                        headers: {
                            'apikey': EVOLUTION_API_KEY
                        },
                        timeout: 15000
                    }
                );
                
                await pool.query(
                    `UPDATE phone_numbers 
                     SET qr_code = $1, qr_expires_at = NOW() + INTERVAL '5 minutes', status = 'qr_ready'
                     WHERE id = $2`,
                    [qrResponse.data.base64, req.params.id]
                );
                
                return res.json({
                    success: true,
                    qr_code: qrResponse.data.base64,
                    expires_at: new Date(Date.now() + 5 * 60 * 1000)
                });
                
            } catch (error) {
                console.error('QR generation error:', error.response?.data || error.message);
                return res.status(500).json({ 
                    success: false,
                    error: 'Failed to generate QR code',
                    details: error.response?.data?.message || error.message
                });
            }
        }
        
        res.json({
            success: true,
            qr_code: phoneNumber.qr_code,
            expires_at: phoneNumber.qr_expires_at,
            status: phoneNumber.status
        });
        
    } catch (error) {
        console.error('Get QR error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get QR code' 
        });
    }
});

// Get Status
app.get('/phone-numbers/:id/status', authenticateUser, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT instance_name, server_instance, status, phone_number, last_connected_at
             FROM phone_numbers 
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [req.params.id, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Phone number not found' 
            });
        }
        
        const phoneNumber = result.rows[0];
        
        try {
            const statusResponse = await axios.get(
                `${phoneNumber.server_instance}/instance/connectionState/${phoneNumber.instance_name}`,
                {
                    headers: {
                        'apikey': EVOLUTION_API_KEY
                    },
                    timeout: 10000
                }
            );
            
            await pool.query(
                'UPDATE phone_numbers SET status = $1 WHERE id = $2',
                [statusResponse.data.state, req.params.id]
            );
            
            res.json({
                success: true,
                instance_name: phoneNumber.instance_name,
                status: statusResponse.data.state,
                phone_number: phoneNumber.phone_number,
                last_connected_at: phoneNumber.last_connected_at,
                details: statusResponse.data
            });
            
        } catch (error) {
            res.json({
                success: true,
                instance_name: phoneNumber.instance_name,
                status: phoneNumber.status,
                phone_number: phoneNumber.phone_number,
                last_connected_at: phoneNumber.last_connected_at,
                note: 'Using cached status (Evolution API unavailable)'
            });
        }
        
    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get status' 
        });
    }
});

// Delete Phone Number
app.delete('/phone-numbers/:id', authenticateUser, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT instance_name, server_instance FROM phone_numbers 
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [req.params.id, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Phone number not found' 
            });
        }
        
        const phoneNumber = result.rows[0];
        
        try {
            await axios.delete(
                `${phoneNumber.server_instance}/instance/delete/${phoneNumber.instance_name}`,
                {
                    headers: {
                        'apikey': EVOLUTION_API_KEY
                    },
                    timeout: 10000
                }
            );
        } catch (error) {
            console.log('Evolution API delete warning:', error.message);
        }
        
        await pool.query(
            'UPDATE phone_numbers SET deleted_at = NOW(), is_active = false WHERE id = $1',
            [req.params.id]
        );
        
        res.json({
            success: true,
            message: 'Phone number deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete phone number error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete phone number' 
        });
    }
});

// ========================================
// MESSAGING ENDPOINTS
// ========================================

// Send Text Message
app.post('/messages/send-text', authenticateUser, apiLimiter, async (req, res) => {
    const { token, number, text } = req.body;
    
    if (!token || !number || !text) {
        return res.status(400).json({ 
            success: false,
            error: 'token, number, and text are required' 
        });
    }
    
    try {
        const phoneResult = await pool.query(
            `SELECT id, instance_name, server_instance, status FROM phone_numbers 
             WHERE token = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [token, req.user.id]
        );
        
        if (phoneResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Invalid token or phone number not found' 
            });
        }
        
        const phoneNumber = phoneResult.rows[0];
        
        if (phoneNumber.status !== 'connected' && phoneNumber.status !== 'open') {
            return res.status(400).json({ 
                success: false,
                error: `Phone number not connected. Current status: ${phoneNumber.status}` 
            });
        }
        
        const cleanNumber = sanitizePhoneNumber(number);
        
        const sendResponse = await axios.post(
            `${phoneNumber.server_instance}/message/sendText/${phoneNumber.instance_name}`,
            {
                number: cleanNumber,
                text: text
            },
            {
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        await pool.query(
            `INSERT INTO message_stats (phone_number_id, date, messages_sent)
             VALUES ($1, CURRENT_DATE, 1)
             ON CONFLICT (phone_number_id, date) 
             DO UPDATE SET messages_sent = message_stats.messages_sent + 1`,
            [phoneNumber.id]
        );
        
        res.json({
            success: true,
            message: 'Message sent successfully',
            message_id: sendResponse.data.key?.id,
            data: sendResponse.data
        });
        
    } catch (error) {
        console.error('Send message error:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to send message',
            details: error.response?.data?.message || error.message
        });
    }
});

// Send Media Message
app.post('/messages/send-media', authenticateUser, apiLimiter, async (req, res) => {
    const { token, number, mediaUrl, caption, mediaType } = req.body;
    
    if (!token || !number || !mediaUrl) {
        return res.status(400).json({ 
            success: false,
            error: 'token, number, and mediaUrl are required' 
        });
    }
    
    try {
        const phoneResult = await pool.query(
            `SELECT id, instance_name, server_instance, status FROM phone_numbers 
             WHERE token = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [token, req.user.id]
        );
        
        if (phoneResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Invalid token or phone number not found' 
            });
        }
        
        const phoneNumber = phoneResult.rows[0];
        
        if (phoneNumber.status !== 'connected' && phoneNumber.status !== 'open') {
            return res.status(400).json({ 
                success: false,
                error: `Phone number not connected. Current status: ${phoneNumber.status}` 
            });
        }
        
        const cleanNumber = sanitizePhoneNumber(number);
        
        let endpoint = 'sendMedia';
        if (mediaType === 'audio') endpoint = 'sendWhatsAppAudio';
        
        const sendResponse = await axios.post(
            `${phoneNumber.server_instance}/message/${endpoint}/${phoneNumber.instance_name}`,
            {
                number: cleanNumber,
                mediaUrl: mediaUrl,
                caption: caption || '',
                mediatype: mediaType || 'image'
            },
            {
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );
        
        await pool.query(
            `INSERT INTO message_stats (phone_number_id, date, messages_sent, media_sent)
             VALUES ($1, CURRENT_DATE, 1, 1)
             ON CONFLICT (phone_number_id, date) 
             DO UPDATE SET messages_sent = message_stats.messages_sent + 1,
                          media_sent = message_stats.media_sent + 1`,
            [phoneNumber.id]
        );
        
        res.json({
            success: true,
            message: 'Media sent successfully',
            message_id: sendResponse.data.key?.id,
            data: sendResponse.data
        });
        
    } catch (error) {
        console.error('Send media error:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to send media',
            details: error.response?.data?.message || error.message
        });
    }
});

// ========================================
// WEBHOOK ENDPOINT
// ========================================

app.post('/webhook', async (req, res) => {
    const { event, instance, data } = req.body;
    
    console.log(`Webhook received: ${event} for instance: ${instance}`);
    
    try {
        const phoneResult = await pool.query(
            'SELECT id, user_id, webhook_url FROM phone_numbers WHERE instance_name = $1 AND deleted_at IS NULL',
            [instance]
        );
        
        if (phoneResult.rows.length === 0) {
            console.log(`Instance not found: ${instance}`);
            return res.sendStatus(404);
        }
        
        const phoneNumber = phoneResult.rows[0];
        
        switch (event) {
            case 'connection.update':
                await pool.query(
                    `UPDATE phone_numbers 
                     SET status = $1, 
                         phone_number = COALESCE($2, phone_number),
                         last_connected_at = CASE WHEN $1 IN ('connected', 'open') THEN NOW() ELSE last_connected_at END,
                         last_disconnected_at = CASE WHEN $1 = 'close' THEN NOW() ELSE last_disconnected_at END,
                         connection_attempts = CASE WHEN $1 = 'connecting' THEN connection_attempts + 1 ELSE connection_attempts END
                     WHERE instance_name = $3`,
                    [data.state, data.phoneNumber, instance]
                );
                console.log(`Connection updated: ${instance} -> ${data.state}`);
                break;
                
            case 'messages.upsert':
                const messageType = data.key?.fromMe ? 'sent' : 'received';
                await pool.query(
                    `INSERT INTO message_stats (phone_number_id, date, messages_${messageType})
                     VALUES ($1, CURRENT_DATE, 1)
                     ON CONFLICT (phone_number_id, date) 
                     DO UPDATE SET messages_${messageType} = message_stats.messages_${messageType} + 1`,
                    [phoneNumber.id]
                );
                break;
                
            case 'qrcode.updated':
                if (data.qrcode) {
                    await pool.query(
                        `UPDATE phone_numbers 
                         SET qr_code = $1, qr_expires_at = NOW() + INTERVAL '5 minutes', status = 'qr_ready'
                         WHERE instance_name = $2`,
                        [data.qrcode, instance]
                    );
                    console.log(`QR code updated for: ${instance}`);
                }
                break;
        }
        
        if (phoneNumber.webhook_url) {
            try {
                const webhookStart = Date.now();
                const webhookResponse = await axios.post(
                    phoneNumber.webhook_url,
                    req.body,
                    { timeout: 5000 }
                );
                const responseTime = Date.now() - webhookStart;
                
                await pool.query(
                    `INSERT INTO webhook_logs (phone_number_id, event_type, payload, status_code, response_body, response_time_ms, sent_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                    [
                        phoneNumber.id,
                        event,
                        req.body,
                        webhookResponse.status,
                        JSON.stringify(webhookResponse.data),
                        responseTime
                    ]
                );
            } catch (webhookError) {
                console.error('Webhook forward error:', webhookError.message);
                
                await pool.query(
                    `INSERT INTO webhook_logs (phone_number_id, event_type, payload, status_code, error_message, sent_at)
                     VALUES ($1, $2, $3, $4, $5, NOW())`,
                    [
                        phoneNumber.id,
                        event,
                        req.body,
                        webhookError.response?.status || 0,
                        webhookError.message
                    ]
                );
            }
        }
        
        res.sendStatus(200);
        
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.sendStatus(500);
    }
});

// ========================================
// STATISTICS ENDPOINTS
// ========================================

app.get('/statistics', authenticateUser, async (req, res) => {
    const { phone_number_id, start_date, end_date, limit } = req.query;
    
    try {
        let query = `
            SELECT 
                p.id as phone_number_id,
                p.display_name,
                p.phone_number,
                m.date,
                m.messages_sent,
                m.messages_received,
                m.messages_failed,
                m.media_sent,
                m.media_received
            FROM message_stats m
            JOIN phone_numbers p ON m.phone_number_id = p.id
            WHERE p.user_id = $1 AND p.deleted_at IS NULL
        `;
        
        const params = [req.user.id];
        
        if (phone_number_id) {
            params.push(phone_number_id);
            query += ` AND m.phone_number_id = $${params.length}`;
        }
        
        if (start_date) {
            params.push(start_date);
            query += ` AND m.date >= $${params.length}`;
        }
        
        if (end_date) {
            params.push(end_date);
            query += ` AND m.date <= $${params.length}`;
        }
        
        query += ` ORDER BY m.date DESC LIMIT ${limit || 100}`;
        
        const result = await pool.query(query, params);
        
        const totals = result.rows.reduce((acc, row) => ({
            messages_sent: acc.messages_sent + row.messages_sent,
            messages_received: acc.messages_received + row.messages_received,
            messages_failed: acc.messages_failed + row.messages_failed,
            media_sent: acc.media_sent + row.media_sent,
            media_received: acc.media_received + row.media_received
        }), {
            messages_sent: 0,
            messages_received: 0,
            messages_failed: 0,
            media_sent: 0,
            media_received: 0
        });
        
        res.json({
            success: true,
            statistics: result.rows,
            totals: totals,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Statistics error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch statistics' 
        });
    }
});

// Get Dashboard Summary
app.get('/dashboard', authenticateUser, async (req, res) => {
    try {
        const dashboard = await pool.query(
            'SELECT * FROM user_dashboard WHERE id = $1',
            [req.user.id]
        );
        
        res.json({
            success: true,
            dashboard: dashboard.rows[0]
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch dashboard' 
        });
    }
});

// ========================================
// ERROR HANDLERS
// ========================================

app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Endpoint not found' 
    });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION:', reason);
});


app.listen(PORT, () => {
    console.log('========================================');
    console.log(`🚀 WhatsApp SaaS API Server Started`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
    console.log('========================================');
});

process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await pool.end();
    process.exit(0);
});

