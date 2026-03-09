require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// We still serve /uploads statically in case there are old files, but new ones go to Cloudinary
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -------------------------------------------------------------
// Database Setup (PostgreSQL via Supabase or Render)
// -------------------------------------------------------------
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for most managed DBs
});

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                media_url TEXT,
                media_type TEXT,
                news_link TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS gallery (
                id SERIAL PRIMARY KEY,
                image_url TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("PostgreSQL database tables initialized.");
    } catch (err) {
        console.error("Database initialization error:", err);
    }
}
initDB();

// -------------------------------------------------------------
// Cloudinary & Multer Setup
// -------------------------------------------------------------
// Cloudinary configures itself automatically if CLOUDINARY_URL is in the environment
// We use multer with memory storage so we can stream the buffers directly to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

const uploadToCloudinary = (fileBuffer, resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: resourceType, folder: 'busqueda_engels' },
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};

// API Endpoints

// GET /api/posts - Fetch all posts
app.get('/api/posts', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM posts ORDER BY created_at DESC");
        res.json({
            "message": "success",
            "data": result.rows
        });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// GET /api/gallery - Fetch all gallery images
app.get('/api/gallery', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM gallery ORDER BY created_at DESC");
        res.json({
            "message": "success",
            "data": result.rows
        });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// POST /api/gallery - Upload a gallery image
app.post('/api/gallery', upload.single('image'), async (req, res) => {
    if (!req.file || !req.file.mimetype.startsWith('image/')) {
        res.status(400).json({ "error": "Solo se permiten imágenes." });
        return;
    }

    try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'image');
        const imageUrl = uploadResult.secure_url;
        const description = req.body.description || null;
        
        const sql = `INSERT INTO gallery (image_url, description) VALUES ($1, $2) RETURNING id`;
        
        const dbResult = await pool.query(sql, [imageUrl, description]);
        res.status(201).json({
            "message": "success",
            "data": {
                id: dbResult.rows[0].id,
                image_url: imageUrl,
                description: description
            }
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ "error": err.message || "Error al subir a Cloudinary" });
    }
});

// PUT /api/gallery/:id - Update an existing gallery image/description
app.put('/api/gallery/:id', upload.single('image'), async (req, res) => {
    const id = req.params.id;
    const description = req.body.description || null;
    let imageUrl = null;

    try {
        if (req.file) {
            if (!req.file.mimetype.startsWith('image/')) {
                return res.status(400).json({ "error": "Solo se permiten imágenes." });
            }
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'image');
            imageUrl = uploadResult.secure_url;
        }

        const params = [description];
        let paramCount = 2;
        let sql = `UPDATE gallery SET description = $1`;

        if (imageUrl) {
            sql += `, image_url = $${paramCount++}`;
            params.push(imageUrl);
        }

        sql += ` WHERE id = $${paramCount}`;
        params.push(id);

        await pool.query(sql, params);
        
        res.json({
            "message": "success",
            "data": { id, image_url: imageUrl, description: description }
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ "error": err.message || "Error interno" });
    }
});

// DELETE /api/gallery/:id - Delete a gallery image
app.delete('/api/gallery/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM gallery WHERE id = $1`, [req.params.id]);
        res.json({ "message": "deleted", changes: result.rowCount });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// POST /api/posts - Create a new post
app.post('/api/posts', upload.single('media'), async (req, res) => {
    const { title, content, created_at, news_link } = req.body;
    let mediaUrl = null;
    let mediaType = null;

    if (!title || !content) {
        res.status(400).json({ "error": "El título y contenido son requeridos" });
        return;
    }

    try {
        if (req.file) {
            mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
            const uploadResult = await uploadToCloudinary(req.file.buffer, mediaType);
            mediaUrl = uploadResult.secure_url;
        }

        let sql, params;
        if (created_at) {
            sql = `INSERT INTO posts (title, content, media_url, media_type, news_link, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
            params = [title, content, mediaUrl, mediaType, news_link || null, created_at];
        } else {
            sql = `INSERT INTO posts (title, content, media_url, media_type, news_link) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
            params = [title, content, mediaUrl, mediaType, news_link || null];
        }

        const dbResult = await pool.query(sql, params);
        
        res.status(201).json({
            "message": "success",
            "data": {
                id: dbResult.rows[0].id,
                title,
                content,
                media_url: mediaUrl,
                media_type: mediaType,
                created_at: created_at || new Date().toISOString()
            }
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ "error": err.message || "Error interno" });
    }
});

// PUT /api/posts/:id - Update an existing post
app.put('/api/posts/:id', upload.single('media'), async (req, res) => {
    const id = req.params.id;
    const { title, content, created_at, news_link } = req.body;
    let mediaUrl = null;
    let mediaType = null;

    if (!title || !content) {
        res.status(400).json({ "error": "El título y contenido son requeridos" });
        return;
    }

    try {
        if (req.file) {
            mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
            const uploadResult = await uploadToCloudinary(req.file.buffer, mediaType);
            mediaUrl = uploadResult.secure_url;
        }

        const params = [title, content, news_link || null];
        let paramCount = 4;
        let sql = `UPDATE posts SET title = $1, content = $2, news_link = $3`;

        if (created_at) {
            sql += `, created_at = $${paramCount++}`;
            params.push(created_at);
        }

        if (mediaUrl) {
            sql += `, media_url = $${paramCount++}, media_type = $${paramCount++}`;
            params.push(mediaUrl, mediaType);
        }

        sql += ` WHERE id = $${paramCount}`;
        params.push(id);

        await pool.query(sql, params);
        
        res.json({
            "message": "success",
            "data": { id, title, content, media_url: mediaUrl, media_type: mediaType }
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({ "error": err.message || "Error interno" });
    }
});

// DELETE /api/posts/:id - Delete a post
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM posts WHERE id = $1`, [req.params.id]);
        res.json({ "message": "deleted", changes: result.rowCount });
    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
