const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'company_meals',
    charset: 'utf8mb4',
    connectionLimit: 10
});

// اختبار الاتصال بقاعدة البيانات
pool.getConnection((err, connection) => {
    if (err) {
        console.error('خطأ في الاتصال بقاعدة البيانات:', err);
        return;
    }
    console.log('تم الاتصال بقاعدة البيانات بنجاح');
    connection.release();
});

module.exports = pool;
