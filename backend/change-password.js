// backend/change-password.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

// Параметры нового пароля
const username = 'admin'; // или 'editor1', 'editor2'
const newPassword = 'ваш-новый-пароль'; // ← ЗАМЕНИТЕ НА ВАШ ПАРОЛЬ!

// Хешируем новый пароль
const hashedPassword = bcrypt.hashSync(newPassword, 10);

// Обновляем пароль в базе данных
db.run(
    'UPDATE admins SET password = ? WHERE username = ?',
    [hashedPassword, username],
    function(err) {
        if (err) {
            console.error('❌ Ошибка:', err.message);
        } else if (this.changes === 0) {
            console.log('⚠️ Пользователь не найден');
        } else {
            console.log('✅ Пароль успешно изменён!');
            console.log(`👤 Пользователь: ${username}`);
            console.log(`🔑 Новый пароль: ${newPassword}`);
        }
        db.close();
    }
);