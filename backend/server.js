require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Создание папки для загрузок
if (!fs.existsSync(path.join(__dirname, '../uploads'))) {
    fs.mkdirSync(path.join(__dirname, '../uploads'));
}

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Только изображения: jpeg, jpg, png, gif'));
    }
});

// Middleware для проверки авторизации администратора
const adminAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Не авторизован' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Неверный токен' });
    }
};

// ============ Роуты авторизации ============

// Вход администратора
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Введите логин и пароль' });
    }
    
    db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
        if (err || !admin) {
            return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
        }
        
        // Проверка пароля
        const isValidPassword = bcrypt.compareSync(password, admin.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
        }
        
        // Генерация токена
        const token = jwt.sign(
            { id: admin.id, username: admin.username, name: admin.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ 
            success: true, 
            token,
            admin: { id: admin.id, username: admin.username, name: admin.name }
        });
    });
});

// Проверка токена
app.get('/api/auth/verify', adminAuth, (req, res) => {
    res.json({ success: true, admin: req.admin });
});

// ============ Роуты фото ============

// Получить все фото (доступно всем)
app.get('/api/photos', (req, res) => {
    db.all(`
        SELECT * FROM photos
        ORDER BY created_at DESC
    `, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, photos: rows });
    });
});

// Загрузить фото (только администраторы)
app.post('/api/photos', adminAuth, upload.single('photo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Файл не загружен' });
        }

        const { caption, category } = req.body;
        const src = `/uploads/${req.file.filename}`;

        db.run(
            'INSERT INTO photos (src, caption, category) VALUES (?, ?, ?)',
            [src, caption, category],
            function(err) {
                if (err) {
                    // Удаляем файл при ошибке
                    const filePath = path.join(__dirname, '..', src);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                    return res.status(500).json({ success: false, message: err.message });
                }
                
                res.json({ 
                    success: true, 
                    photo: { 
                        id: this.lastID, 
                        src, 
                        caption, 
                        category
                    } 
                });
            }
        );
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Удалить фото (только администраторы)
app.delete('/api/photos/:id', adminAuth, (req, res) => {
    const photoId = req.params.id;

    // Получаем фото
    db.get('SELECT * FROM photos WHERE id = ?', [photoId], (err, photo) => {
        if (err || !photo) {
            return res.status(404).json({ success: false, message: 'Фото не найдено' });
        }

        // Удаляем файл с сервера
        const filePath = path.join(__dirname, '..', photo.src);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Удаляем из базы
        db.run('DELETE FROM photos WHERE id = ?', [photoId], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, message: 'Фото удалено' });
        });
    });
});

// ============ Роуты фото ============

// Получить все фото (доступно всем)
app.get('/api/photos', (req, res) => {
    db.all(`
        SELECT * FROM photos
        ORDER BY created_at DESC
    `, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, photos: rows });
    });
});

// Загрузить фото (только администраторы)
app.post('/api/photos', adminAuth, upload.single('photo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Файл не загружен' });
        }

        const { caption, category } = req.body;
        const src = `/uploads/${req.file.filename}`;

        db.run(
            'INSERT INTO photos (src, caption, category) VALUES (?, ?, ?)',
            [src, caption, category],
            function(err) {
                if (err) {
                    // Удаляем файл при ошибке
                    const filePath = path.join(__dirname, '..', src);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                    return res.status(500).json({ success: false, message: err.message });
                }
                
                res.json({ 
                    success: true, 
                    photo: { 
                        id: this.lastID, 
                        src, 
                        caption, 
                        category
                    } 
                });
            }
        );
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Удалить фото (только администраторы)
app.delete('/api/photos/:id', adminAuth, (req, res) => {
    const photoId = req.params.id;

    // Получаем фото
    db.get('SELECT * FROM photos WHERE id = ?', [photoId], (err, photo) => {
        if (err || !photo) {
            return res.status(404).json({ success: false, message: 'Фото не найдено' });
        }

        // Удаляем файл с сервера
        const filePath = path.join(__dirname, '..', photo.src);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Удаляем из базы
        db.run('DELETE FROM photos WHERE id = ?', [photoId], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, message: 'Фото удалено' });
        });
    });
});

// ============ Запуск сервера ============

app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║   📸 Фотогалерея запущена!                                ║');
    console.log('║                                                            ║');
    console.log(`║   🌐 Адрес: http://localhost:${PORT}                      ║`);
    console.log(`║   📂 Загрузки: ${path.join(__dirname, '../uploads')}      ║`);
    console.log(`║   🗄️  База данных: ${path.join(__dirname, '../database.db')}║`);
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
});