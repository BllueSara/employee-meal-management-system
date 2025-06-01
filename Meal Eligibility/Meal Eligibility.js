let employees = [];

// 🟢 عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    fetchEmployees();
    setupEventListeners();
});

// 🟢 جلب الموظفين
function fetchEmployees() {
    fetch('http://localhost:3000/api/employees')
        .then(res => res.json())
        .then(data => {
            employees = data.map(emp => ({
                id: emp.employee_id.toString(),
                name: emp.name,
                department: emp.department,
                idNumber: emp.national_id,
                period: emp.shift,
                phoneNumber: emp.phone_number // ⬅️ هنا ضيفه
            }));
            renderEmployees(employees);
        })
        .catch(err => console.error('خطأ في جلب الموظفين:', err));
}


// 🟢 عرض بيانات الموظفين في الجدول
function renderEmployees(data) {
    const tbody = document.querySelector('#employeeTable tbody');
    tbody.innerHTML = '';

    data.forEach(employee => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${employee.id}</td>
            <td>${employee.name}</td>
            <td>${employee.department}</td>
            <td>${employee.idNumber}</td>
            <td>
                <span class="period-badge period-${getPeriodClass(employee.period)}" 
                      onclick="cyclePeriod('${employee.id}')">
                    ${employee.period}
                </span>
            </td>
            <td class="actions">
                <button class="action-button" onclick="viewBarcode('${employee.id}')">
                    <i class="fas fa-barcode"></i>
                </button>
                <button class="action-button" onclick="sendWhatsApp('${employee.id}')">
                    <i class="fab fa-whatsapp"></i>
                </button>
                <button class="action-button" onclick="printEmployee('${employee.id}')">
                    <i class="fas fa-print"></i>
                </button>
                <button class="action-button" onclick="editEmployee('${employee.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-button" onclick="deleteEmployee('${employee.id}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 🟢 إضافة موظف
function addEmployee(newEmployee) {
    fetch('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
    })
    .then(() => fetchEmployees())
    .catch(err => console.error('خطأ في إضافة الموظف:', err));
}

// 🟢 تعديل موظف
// 🟢 تعديل موظف
function updateEmployee(id, updatedEmployee) {
    return fetch(`http://localhost:3000/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEmployee)
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => {
                throw new Error(err.message || 'حدث خطأ في تعديل الموظف.');
            });
        }
        return res.json();
    })
    .then(() => fetchEmployees());
}



// 🟢 حذف موظف
function deleteEmployee(id) {
    const employee = employees.find(emp => emp.id === id);
    if (employee && confirm(`هل أنت متأكد من حذف الموظف "${employee.name}"؟`)) {
        fetch(`http://localhost:3000/api/employees/${id}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) {
                // إذا لم تكن الاستجابة ناجحة (مثل حالة 500 Server Error أو 404 Not Found)
                return res.json().then(err => {
                    throw new Error(err.message || 'حدث خطأ أثناء حذف الموظف في الخادم.');
                });
            }
            return res.json();
        })
        .then(data => {
            // إذا كان الحذف ناجحاً
            alert(data.message || 'تم حذف الموظف بنجاح');
            fetchEmployees(); // إعادة تحميل الموظفين بعد الحذف
        })
        .catch(err => {
            // معالجة أي أخطاء (شبكة، خادم، إلخ)
            console.error('خطأ في حذف الموظف:', err);
            alert(err.message || 'فشل حذف الموظف.');
        });
    }
}

// 🟢 تغيير الفترة
function cyclePeriod(employeeId) {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
        switch (employee.period) {
            case 'صباحي': employee.period = 'مسائي'; break;
            case 'مسائي': employee.period = 'غير محدد'; break;
            default: employee.period = 'صباحي'; break;
        }

        updateEmployee(employee.id, {
            name: employee.name,
            department: employee.department,
            national_id: employee.idNumber,
            shift: employee.period
        });
    }
}

// 🔹 تحديد صنف الفترة للتنسيق
function getPeriodClass(period) {
    switch (period) {
        case 'صباحي': return 'morning';
        case 'مسائي': return 'evening';
        default: return 'undefined';
    }
}

// 🟢 إعداد مستمعي الأحداث
// 🟢 إعداد مستمعي الأحداث
function setupEventListeners() {
    // البحث
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredEmployees = employees.filter(employee => 
            employee.id.toLowerCase().includes(searchTerm) ||
            employee.name.toLowerCase().includes(searchTerm) ||
            employee.idNumber.toLowerCase().includes(searchTerm)
        );
        renderEmployees(filteredEmployees);
    });

    // نافذة إضافة موظف
    const addEmployeeBtn = document.querySelector('.add-employee');
    const modal = document.getElementById('addEmployeeModal');
    const closeBtn = document.querySelector('.close-modal');
    const cancelBtn = document.querySelector('.btn-cancel');
    const addEmployeeForm = document.getElementById('addEmployeeForm');

    addEmployeeBtn.addEventListener('click', () => {
        modal.classList.add('show');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    cancelBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    addEmployeeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newEmployee = {
            employee_id: document.getElementById('employeeId').value,
            name: document.getElementById('employeeName').value,
            department: document.getElementById('department').value,
            national_id: document.getElementById('idNumber').value,
            shift: document.getElementById('period').value,
            phone_number: document.getElementById('phoneNumber').value // إضافة
        };
        addEmployee(newEmployee);
        modal.classList.remove('show');
        addEmployeeForm.reset();
    });

    // 🟢 رفع ملف إكسل
    const importBtn = document.querySelector('.import');
    const fileInput = document.getElementById('fileInput');

    importBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleExcelImport(file);
            e.target.value = ''; // إعادة تعيين input لرفع نفس الملف لاحقًا
        }
    });
}

// 🔹 رفع الملف إلى السيرفر
function handleExcelImport(file) {
    const formData = new FormData();
    formData.append('file', file);

    fetch('http://localhost:3000/api/import-excel', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        fetchEmployees(); // إعادة تحميل الموظفين بعد الاستيراد
    })
    .catch(err => {
        console.error('خطأ في رفع الملف:', err);
        alert('حدث خطأ أثناء رفع الملف');
    });
}



// تصدير البيانات إلى ملف إكسل
function exportToExcel() {
    const data = employees.map(emp => ({
        'رقم الموظف': emp.id,
        'اسم الموظف': emp.name,
        'القسم': emp.department,
        'رقم الهوية': emp.idNumber,
        'الفترة': emp.period
    }));

    const ws = XLSX.utils.json_to_sheet(data, { header: ['رقم الموظف', 'اسم الموظف', 'القسم', 'رقم الهوية', 'الفترة'] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'قائمة_الموظفين.xlsx');
}

// إنشاء الباركود
function generateBarcode(employeeId) {
    const canvas = document.getElementById('barcodeCanvas');
    JsBarcode(canvas, employeeId, {
        format: "CODE128",
        width: 2,
        height: 100,
        displayValue: true,
        text: `رقم الموظف: ${employeeId}`,
        textAlign: "center",
        textPosition: "bottom",
        textMargin: 10,
        fontSize: 16,
        background: "#ffffff",
        lineColor: "#000000",
        margin: 10
    });
    return canvas.toDataURL("image/png");
}


// عرض الباركود
function viewBarcode(id) {
    const employee = employees.find(emp => emp.id === id);
    if (employee) {
        const barcodeImage = generateBarcode(employee.id);

        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2>باركود الموظف</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <h3>${employee.name}</h3>
                    <img src="${barcodeImage}" style="max-width: 100%; margin: 20px 0;">
                    <button class="btn-save" onclick="printBarcode('${employee.id}')">
                        <i class="fas fa-print"></i> طباعة الباركود
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // إغلاق عند الضغط على الخلفية
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // منع إغلاق المودال عند الضغط داخل المحتوى
        const modalContent = modal.querySelector('.modal-content');
        modalContent.addEventListener('click', (e) => e.stopPropagation());

        // زر إغلاق المودال
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => modal.remove());
    }
}


// طباعة الباركود
function printBarcode(id) {
    const employee = employees.find(emp => emp.id === id);
    if (employee) {
        const barcodeImage = generateBarcode(employee.id);
        
        // إنشاء محتوى الطباعة
        const printContent = `
            <div style="text-align: center; direction: rtl; padding: 20px;">
                <h2 style="margin-bottom: 20px;">بطاقة وجبة الموظف</h2>
                <div style="border: 2px solid #000; padding: 20px; max-width: 400px; margin: 0 auto;">
                    <h3 style="margin-bottom: 10px;">${employee.name}</h3>
                    <p style="margin-bottom: 20px;">${employee.department}</p>
                    <img src="${barcodeImage}" style="max-width: 100%; margin-bottom: 10px;">
                    <p style="font-size: 14px; color: #666;">صالح ليوم واحد فقط</p>
                </div>
            </div>
        `;

        // إنشاء نافذة الطباعة
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>طباعة باركود الموظف</title>');
        printWindow.document.write('<style>@media print { body { margin: 0; } }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        // طباعة بعد تحميل الصورة
        const img = printWindow.document.querySelector('img');
        if (img) {
            img.onload = function() {
                printWindow.print();
                // printWindow.close();
            };
        } else {
            printWindow.print();
            // printWindow.close();
        }
    }
}

// تحديث وظيفة الطباعة الأصلية لتطبع الباركود
function printEmployee(id) {
    printBarcode(id);
}

function sendWhatsApp(id) {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) {
        console.error('خطأ: الموظف غير موجود.');
        return;
    }

    // 1️⃣ جلب رقم الجوال من الخادم
    fetch(`http://localhost:3000/api/employees/${id}/phone`)
        .then(res => res.json())
        .then(data => {
            const phoneNumber = data.phone_number || '';

            // 2️⃣ جلب رابط الباركود من الخادم
            fetch(`http://localhost:3000/api/barcode/${employee.id}`)
                .then(res => res.json())
                .then(barcodeData => {
                    const barcodeImageUrl = `http://localhost:3000${barcodeData.imageUrl || ''}`;

                    // 3️⃣ تجهيز نص الرسالة
                    const message = `مرحباً بك ${employee.name}
إدارة التغذية و خدمات الغذاء بمستشفى الملك عبدالعزيز

مرفق لك باركود تأكيد هويتك عند الدخول الى صالة الطعام.
رقم الموظف: ${employee.id}

رابط الباركود: ${barcodeImageUrl}

علماً أنه لا يتم الدخول إلا بموجب الباركود.`;

                    // 4️⃣ إنشاء نافذة المودال
                    const modal = document.createElement('div');
                    modal.className = 'modal show';

                    const modalContent = document.createElement('div');
                    modalContent.className = 'modal-content';
                    modalContent.style.maxWidth = '500px';

                    // رأس المودال
                    modalContent.innerHTML = `
                        <div class="modal-header">
                            <h2>إرسال رسالة واتساب</h2>
                            <button class="close-modal">&times;</button>
                        </div>
                        <div class="modal-body" style="text-align: right;">
                            <div style="white-space: pre-line; margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                                ${message}
                            </div>
                            <img src="${barcodeImageUrl}" style="max-width: 100%; margin: 20px 0;">
                            <div class="form-group">
                                <label for="whatsAppPhone">رقم الجوال:</label>
                                <input type="tel" id="whatsAppPhone" value="${phoneNumber}" 
                                    style="width: 100%; padding: 8px; margin-top: 5px; direction: ltr;" 
                                    placeholder="966xxxxxxxxx">
                            </div>
                            <button class="btn-save" id="sendWhatsAppBtn">
                                <i class="fab fa-whatsapp"></i> إرسال واتساب
                            </button>
                        </div>
                    `;

                    // إضافة المودال إلى الصفحة
                    modal.appendChild(modalContent);
                    document.body.appendChild(modal);

                    // 5️⃣ إرسال رسالة واتساب
                    const sendBtn = modalContent.querySelector('#sendWhatsAppBtn');
                    sendBtn.onclick = () => {
                        const inputPhone = modalContent.querySelector('#whatsAppPhone').value;
                        confirmAndSendWhatsApp(employee.id, inputPhone, message);
                    };

                    // 🔥 إغلاق عند الضغط بالخلفية
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) modal.remove();
                    });

                    // 🔥 منع إغلاق المودال عند النقر داخل المحتوى
                    modalContent.addEventListener('click', (e) => e.stopPropagation());

                    // 🔥 زر إغلاق المودال
                    const closeBtn = modalContent.querySelector('.close-modal');
                    closeBtn.onclick = () => modal.remove();

                })
                .catch(err => {
                    console.error('خطأ في جلب رابط الباركود:', err);
                    alert('حدث خطأ أثناء جلب رابط الباركود.');
                });
        })
        .catch(err => {
            console.error('خطأ في جلب رقم الجوال:', err);
            alert('حدث خطأ أثناء جلب رقم الجوال.');
        });
}








function confirmAndSendWhatsApp(id, phoneNumber, message) {
    console.log('confirmAndSendWhatsApp called with id:', id, 'phoneNumber:', phoneNumber, 'message:', message); // Added log
    const employee = employees.find(emp => emp.id === id);
    if (employee) {
        console.log('Employee found:', employee); // Added log
        console.log('Input phone number:', phoneNumber); // Log input value
        
        if (!phoneNumber) {
            alert('الرجاء إدخال رقم الجوال');
            return;
        }

        // تنظيف رقم الهاتف
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        console.log('Cleaned phone number:', cleanPhone); // Log cleaned value
        
        // التأكد من أن الرقم يبدأ بـ 966
        const finalPhone = cleanPhone.startsWith('966') ? cleanPhone : `966${cleanPhone.replace(/^0+/, '')}`;
        console.log('Final phone number for WhatsApp:', finalPhone); // Log final value

        // فتح واتساب
        const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
        console.log('Opening WhatsApp URL:', whatsappUrl); // Added log
        window.open(whatsappUrl, '_blank');

        // إغلاق النافذة المنبثقة
        const modal = document.querySelector('.modal');
        if (modal) {
            console.log('Modal found, removing it.'); // Added log
            modal.remove();
        } else {
            console.log('Modal not found.'); // Added log
        }
    } else {
        console.log('Employee not found for id:', id); // Added log
    }
}

function editEmployee(id) {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) {
        console.error('خطأ: لم يتم العثور على الموظف.');
        return;
    }

    // تعبئة النموذج
    document.getElementById('editEmployeeId').value = employee.id;
    document.getElementById('editEmployeeName').value = employee.name;
    document.getElementById('editDepartment').value = employee.department;
    document.getElementById('editIdNumber').value = employee.idNumber;
    document.getElementById('editPeriod').value = employee.period;

    // جلب رقم الجوال
    fetch(`http://localhost:3000/api/employees/${id}/phone`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('editPhoneNumber').value = data.phone_number || '';
        })
        .catch(err => {
            console.error('خطأ في جلب رقم الجوال:', err);
            document.getElementById('editPhoneNumber').value = '';
        });

    // عرض المودال
    const modal = document.getElementById('editEmployeeModal');
    modal.classList.add('show');

    // منع إغلاق المودال عند الضغط داخل المحتوى
    const modalContent = modal.querySelector('.modal-content');
    modalContent.addEventListener('click', (e) => e.stopPropagation());

    // إغلاق عند الضغط بالخلفية
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    // زر الإغلاق
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.onclick = () => modal.classList.remove('show');

    // زر الإلغاء
    const cancelBtn = modal.querySelector('.btn-cancel');
    cancelBtn.onclick = () => modal.classList.remove('show');

    // معالجة النموذج
    const form = document.getElementById('editEmployeeForm');
    form.onsubmit = (e) => {
        e.preventDefault();
    
        const updatedEmployee = {
            name: document.getElementById('editEmployeeName').value,
            department: document.getElementById('editDepartment').value,
            national_id: document.getElementById('editIdNumber').value,
            shift: document.getElementById('editPeriod').value,
            phone_number: document.getElementById('editPhoneNumber').value
        };
    
        updateEmployee(employee.id, updatedEmployee)
            .then(() => {
                modal.classList.remove('show');
            })
            .catch((err) => {
                console.error('خطأ في تعديل الموظف:', err);
                alert('حدث خطأ أثناء تعديل الموظف.');
            });
    };
    
}
