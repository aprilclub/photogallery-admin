const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

// Создание таблиц при запуске
db.serialize(() => {
    // Таблица администраторов
    db.run(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Таблица фото
    db.run(`
        CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            src TEXT NOT NULL,
            caption TEXT NOT NULL,
            category TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Создание администраторов по умолчанию
    // Пароль по умолчанию: admin123
    const defaultAdmins = [
        { username: 'admin', name: 'Администратор', password: 'admin123' },
        { username: 'editor1', name: 'Редактор 1', password: 'editor123' },
        { username: 'editor2', name: 'Редактор 2', password: 'editor456' }
    ];
    
    defaultAdmins.forEach(admin => {
        const hashedPassword = bcrypt.hashSync(admin.password, 10);
        
        db.get('SELECT * FROM admins WHERE username = ?', [admin.username], (err, row) => {
            if (!row) {
                db.run(
                    'INSERT INTO admins (username, name, password) VALUES (?, ?, ?)',
                    [admin.username, admin.name, hashedPassword],
                    (err) => {
                        if (!err) {
                            console.log(`✅ Администратор создан: ${admin.username} / ${admin.password}`);
                        }
                    }
                );
            }
        });
    });
    
    // Добавление примеров фото
    db.get('SELECT COUNT(*) as count FROM photos', (err, row) => {
        if (row.count === 0) {
            const samplePhotos = [
                ['/uploads/sample1.jpg', 'Закат над горами', 'nature'],
                ['/uploads/sample2.jpg', 'Городские огни', 'city'],
                ['/uploads/sample3.jpg', 'Портрет девушки', 'portrait'],
                ['/uploads/sample4.jpg', 'Ночной город', 'night'],
                ['/uploads/sample5.jpg', 'Собор Василия Блаженного', 'architecture']
            ];
            
            const stmt = db.prepare(`
                INSERT INTO photos (src, caption, category) 
                VALUES (?, ?, ?)
            `);
            
            samplePhotos.forEach(photo => {
                stmt.run(photo);
            });
            
            stmt.finalize();
            console.log('✅ Примеры фото добавлены');
        }
    });
});

module.exports = db;