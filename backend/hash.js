// backend/hash.js
const bcrypt = require('bcryptjs');

// Замените 'ваш-пароль' на желаемый пароль
const password = 'Marrusya#123';

const hash = bcrypt.hashSync(password, 10);
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                                                            ║');
console.log('║   ✅ Хеш для пароля:', password.padEnd(30));
console.log('║                                                            ║');
console.log('║   Скопируйте эту строку и вставьте в поле password:       ║');
console.log('║                                                            ║');
console.log('║   ' + hash);
console.log('║                                                            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');