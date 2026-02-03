// backend/hash-all.js
const bcrypt = require('bcryptjs');

const admins = [
    { username: 'admin', password: 'Marrusya#123' },
    { username: 'editor1', password: 'cucumber777' },
    { username: 'editor2', password: 'htlfrnjh#123' }
];

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                                                            ║');
console.log('║   📋 Хеши для всех администраторов                        ║');
console.log('║                                                            ║');

admins.forEach(admin => {
    const hash = bcrypt.hashSync(admin.password, 10);
    console.log('║   ' + admin.username.padEnd(15) + ': ' + admin.password);
    console.log('║   Хеш: ' + hash);
    console.log('║');
});

console.log('╚════════════════════════════════════════════════════════════╝\n');