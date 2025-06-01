const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('./db');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());



const { createCanvas } = require('canvas');
const JsBarcode = require('jsbarcode');
const fs = require('fs');
const path = require('path');

// إنشاء الباركود وحفظه كصورة
app.get('/api/barcode/:id', (req, res) => {
    const { id } = req.params;
    const canvas = createCanvas();
    JsBarcode(canvas, id, {
        format: "CODE128",
        width: 2,
        height: 100,
        displayValue: true
    });

    const buffer = canvas.toBuffer('image/png');
    const barcodePath = path.join(__dirname, 'public', 'barcodes', `${id}.png`);

    // تأكد من أن المجلد موجود
    fs.mkdirSync(path.dirname(barcodePath), { recursive: true });

    // احفظ الصورة
    fs.writeFileSync(barcodePath, buffer);

    // رجع الرابط
    const barcodeUrl = `/barcodes/${id}.png`;
    res.json({ imageUrl: barcodeUrl });
});

// تأكد من تقديم مجلد الباركودات statically
app.use('/barcodes', express.static(path.join(__dirname, 'public', 'barcodes')));

// 🔹 إعداد Multer لتخزين الملف في الذاكرة
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 🔹 مسار رفع ملف Excel
app.post('/api/import-excel', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'لم يتم رفع أي ملف' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 🔹 تحويل البيانات إلى تنسيق الموظفين
        const employees = jsonData.map(row => ({
            employee_id: row['رقم الموظف']?.toString() || '',
            name: row['اسم الموظف']?.toString() || '',
            department: row['القسم']?.toString() || '',
            national_id: row['رقم الهوية']?.toString() || '',
            shift: row['الفترة']?.toString() || 'غير محدد',
            phone_number: row['رقم الجوال']?.toString() || '' // <-- هنا الجديد
        }));
        

        // 🔹 التحقق من صحة البيانات
        const validEmployees = employees.filter(emp =>
            emp.employee_id && emp.name && emp.department && emp.national_id
        );

        if (validEmployees.length === 0) {
            return res.status(400).json({ message: 'لا توجد بيانات صالحة للاستيراد' });
        }

        const values = validEmployees.map(emp => [
            emp.employee_id,
            emp.name,
            emp.department,
            emp.national_id,
            emp.shift,
            emp.phone_number // <-- هنا الجديد
        ]);
        
        const sql = `
            INSERT INTO employees (employee_id, name, department, national_id, shift, phone_number)
            VALUES ?
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                department = VALUES(department),
                national_id = VALUES(national_id),
                shift = VALUES(shift),
                phone_number = VALUES(phone_number)
        `;
        
        pool.query(sql, [values], (err, result) => {
            if (err) return res.status(500).json({ message: 'خطأ في إدخال البيانات', error: err });
            res.json({ message: `تم استيراد ${validEmployees.length} موظف بنجاح` });
        });

    } catch (error) {
        res.status(500).json({ message: 'خطأ في معالجة الملف', error });
    }
});

// جلب جميع الموظفين
app.get('/api/employees', (req, res) => {
    const search = req.query.search || '';
    const sql = `
        SELECT * FROM employees 
        WHERE name LIKE ? OR employee_id LIKE ? OR national_id LIKE ?
        ORDER BY employee_id DESC
    `;
    const searchTerm = `%${search}%`;
    
    pool.query(sql, [searchTerm, searchTerm, searchTerm], (err, results) => {
        if (err) {
            console.error('خطأ في جلب بيانات الموظفين:', err);
            return res.status(500).json({ 
                error: 'حدث خطأ أثناء جلب بيانات الموظفين',
                details: err.message 
            });
        }
        res.json(results || []);
    });
});

// إضافة موظف
app.post('/api/employees', (req, res) => {
    const { employee_id, name, department, national_id, shift, phone_number } = req.body;
    const sql = `
        INSERT INTO employees (employee_id, name, department, national_id, shift, phone_number)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    pool.query(sql, [employee_id, name, department, national_id, shift, phone_number], (err, result) => {
    
        if (err) return res.status(500).json({ error: err });
        res.json({ message: 'تمت إضافة الموظف', employeeId: result.insertId });
    });
});

// تعديل موظف
app.put('/api/employees/:id', (req, res) => {
    const { name, department, national_id, shift, phone_number } = req.body; // ⬅️ أضفنا phone_number
    const { id } = req.params;
    const sql = `
        UPDATE employees 
        SET name=?, department=?, national_id=?, shift=?, phone_number=?
        WHERE employee_id=?
    `;
    pool.query(sql, [name, department, national_id, shift, phone_number, id], (err, result) => {
        if (err) {
            console.error('خطأ في تعديل الموظف:', err);
            return res.status(500).json({ 
                error: 'حدث خطأ أثناء تعديل بيانات الموظف',
                details: err.message 
            });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'لم يتم العثور على الموظف المطلوب لتعديله أو لم يتم إجراء تغييرات' });
        }
        res.json({ message: 'تم تعديل بيانات الموظف بنجاح' });
    });
});


// حذف موظف
app.delete('/api/employees/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM employees WHERE employee_id=?';
    pool.query(sql, [id], (err, result) => {
        if (err) {
            console.error('خطأ في حذف الموظف:', err);
            return res.status(500).json({ 
                error: 'حدث خطأ أثناء حذف الموظف',
                details: err.message 
            });
        }
        // التحقق مما إذا تم العثور على الموظف وحذفه بنجاح
        if (result.affectedRows === 0) {
             return res.status(404).json({ message: 'لم يتم العثور على الموظف المطلوب حذفه' });
        }
        res.json({ message: 'تم حذف الموظف بنجاح' });
    });
});



// الحصول على الإحصائيات
app.get('/api/stats', (req, res) => {
    const stats = {};
    pool.query('SELECT COUNT(*) AS totalEmployees FROM employees', (err, result) => {
        if (err) return res.status(500).json({ error: err });
        stats.totalEmployees = result[0].totalEmployees;
        pool.query('SELECT COUNT(*) AS totalMeals FROM meals', (err2, result2) => {
            if (err2) return res.status(500).json({ error: err2 });
            stats.totalMeals = result2[0].totalMeals;
            res.json(stats);
        });
    });
});

// التحقق من حالة قاعدة البيانات
app.get('/api/health', (req, res) => {
    pool.query('SELECT 1', (err) => {
        if (err) {
            console.error('خطأ في الاتصال بقاعدة البيانات:', err);
            return res.status(500).json({ 
                status: 'error',
                message: 'فشل الاتصال بقاعدة البيانات',
                error: err.message
            });
        }
        res.json({ 
            status: 'ok',
            message: 'قاعدة البيانات متصلة وتعمل بشكل صحيح'
        });
    });
});



app.get('/api/employees/:id/phone', (req, res) => {
    const { id } = req.params;
    pool.query(
        'SELECT phone_number FROM employees WHERE employee_id = ?',
        [id],
        (err, result) => {
            if (err) {
                console.error('Database error fetching phone number:', err); // More detailed error logging
                return res.status(500).json({ error: 'خطأ في جلب رقم الجوال' });
            }
            if (result.length === 0) {
                console.log(`Employee with ID ${id} not found.`); // Log not found
                return res.status(404).json({ message: 'الموظف غير موجود' });
            }
            console.log(`Fetched phone number for employee ${id}:`, result[0].phone_number); // Log fetched number
            res.json({ phone_number: result[0].phone_number });
        }
    );
});

app.post('/api/meals', (req, res) => {
    const { employee_id } = req.body;
    if (!employee_id) {
        return res.status(400).json({ message: 'رقم الموظف مفقود في الطلب.' });
    }

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('خطأ في الحصول على اتصال قاعدة البيانات:', err);
            return res.status(500).json({ error: 'فشل داخلي في السيرفر.' });
        }

        // 1️⃣ جلب بيانات الموظف
        const getEmployeeSql = 'SELECT employee_id, shift FROM employees WHERE employee_id = ?';
        connection.query(getEmployeeSql, [employee_id], (err, employeeResults) => {
            if (err) {
                connection.release();
                return res.status(500).json({ error: 'فشل في جلب بيانات الموظف.' });
            }

            if (employeeResults.length === 0) {
                connection.release();
                return res.status(404).json({ message: 'الموظف غير موجود.' });
            }

            const employee = employeeResults[0];

            // 2️⃣ التحقق من آخر 24 ساعة
            const timeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const countMealsSql = `
                SELECT meal_type, meal_time
                FROM meals 
                WHERE employee_id = ? AND meal_time >= ?
                ORDER BY meal_time DESC
            `;
            connection.query(countMealsSql, [employee_id, timeWindow], (err, mealResults) => {
                if (err) {
                    connection.release();
                    return res.status(500).json({ error: 'فشل في التحقق من سجل الوجبات.' });
                }

                let nextMeal = '';
                if (employee.shift === 'صباحي') {
                    // الإفطار والعشاء فقط
                    const eatenMeals = mealResults.map(r => r.meal_type);
                    if (!eatenMeals.includes('إفطار')) {
                        nextMeal = 'إفطار';
                    } else if (!eatenMeals.includes('عشاء')) {
                        nextMeal = 'عشاء';
                    } else {
                        connection.release();
                        return res.status(400).json({ message: 'لقد استنفدت وجباتك لهذا اليوم (إفطار + عشاء).' });
                    }
                } else if (employee.shift === 'مسائي') {
                    // الغداء فقط
                    const hasLunch = mealResults.some(r => r.meal_type === 'غداء');
                    if (!hasLunch) {
                        nextMeal = 'غداء';
                    } else {
                        connection.release();
                        return res.status(400).json({ message: 'لقد استنفدت وجبة الغداء لهذا اليوم.' });
                    }
                } else {
                    connection.release();
                    return res.status(400).json({ message: 'ليس وقتك الآن لتناول الوجبة.' });
                }

                // 3️⃣ تسجيل الوجبة
                const recordMealSql = `
                    INSERT INTO meals (employee_id, meal_type)
                    VALUES (?, ?)
                `;
                connection.query(recordMealSql, [employee_id, nextMeal], (err) => {
                    connection.release();
                    if (err) {
                        return res.status(500).json({ error: 'فشل في تسجيل الوجبة.' });
                    }
                    res.json({ message: `تم تسجيل ${nextMeal} بنجاح.` });
                });
            });
        });
    });
});

// جلب بيانات الوجبات
app.get('/api/meals', (req, res) => {
    const sql = `
    SELECT m.*, e.name as employee_name, e.department, e.shift as period
    FROM meals m
    LEFT JOIN employees e ON m.employee_id = e.employee_id
    ORDER BY m.meal_time DESC
`;

    
    pool.query(sql, (err, results) => {
        if (err) {
            console.error('خطأ في جلب بيانات الوجبات:', err);
            return res.status(500).json({ 
                error: 'حدث خطأ أثناء جلب بيانات الوجبات',
                details: err.message 
            });
        }
        res.json(results || []);
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
