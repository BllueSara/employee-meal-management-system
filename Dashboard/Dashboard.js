// متغيرات عامة للجدول
const tbody = document.getElementById("employeeTableBody");
let currentPage = 0;
const rowsPerPage = 6;
let filteredData = [];

// دالة جلب بيانات الباركود من السيرفر
async function fetchBarcodeData() {
    try {
        const response = await fetch('http://localhost:3000/api/meals')

        if (!response.ok) {
            throw new Error('فشل في جلب بيانات الباركود');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('خطأ في جلب بيانات الباركود:', error);
        return [];
    }
}

// دالة جلب بيانات الموظفين من السيرفر
async function fetchEmployeeData() {
    try {
        const response = await fetch('http://localhost:3000/api/employees');
        if (!response.ok) {
            throw new Error('فشل في جلب بيانات الموظفين');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('خطأ في جلب بيانات الموظفين:', error);
        return [];
    }
}

// دالة تحديث البيانات في لوحة التحكم
async function updateDashboard() {
    try {
        // جلب بيانات الباركود والموظفين
        const [barcodeData, employeeData] = await Promise.all([
            fetchBarcodeData(),
            fetchEmployeeData()
        ]);

        // تحديث الإحصائيات اليومية والشهرية
        updateStatistics(barcodeData);
        
        // تحديث الرسوم البيانية
        updateCharts(barcodeData);
        
        // تحديث جدول الموظفين
        updateEmployeeTable(barcodeData, employeeData);
    } catch (error) {
        console.error('خطأ في تحديث لوحة التحكم:', error);
    }
}

// دالة تحديث الإحصائيات
function updateStatistics(barcodeData) {
    const today = new Date().toLocaleDateString('ar-SA');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // حساب الإحصائيات اليومية
    const todayData = barcodeData.filter(scan => 
        new Date(scan.meal_time).toLocaleDateString('ar-SA') === today
    );

    const breakfastCount = todayData.filter(scan => scan.meal_type === 'إفطار').length;
    const lunchCount = todayData.filter(scan => scan.meal_type === 'غداء').length;
    const dinnerCount = todayData.filter(scan => scan.meal_type === 'عشاء').length;

    // حساب الإحصائيات الشهرية
    const monthData = barcodeData.filter(scan => {
        const scanDate = new Date(scan.meal_time);
        return scanDate.getMonth() + 1 === currentMonth && 
               scanDate.getFullYear() === currentYear;
    });

    const monthlyBreakfastCount = monthData.filter(scan => scan.meal_type === 'إفطار').length;
    const monthlyLunchCount = monthData.filter(scan => scan.meal_type === 'غداء').length;
    const monthlyDinnerCount = monthData.filter(scan => scan.meal_type === 'عشاء').length;

    // تحديث الأرقام في الواجهة
    document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = dinnerCount;
    document.querySelector('.stat-card:nth-child(1) .monthly-stat').textContent = 
        `إجمالي الشهر: ${monthlyDinnerCount}`;

    document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = lunchCount;
    document.querySelector('.stat-card:nth-child(2) .monthly-stat').textContent = 
        `إجمالي الشهر: ${monthlyLunchCount}`;

    document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = breakfastCount;
    document.querySelector('.stat-card:nth-child(3) .monthly-stat').textContent = 
        `إجمالي الشهر: ${monthlyBreakfastCount}`;
}

// دالة تحديث جدول الموظفين
function updateEmployeeTable(barcodeData, employeeData) {
    tbody.innerHTML = '';

    // دمج بيانات الباركود مع بيانات الموظفين
    const combinedData = barcodeData.map(scan => {
        const employee = employeeData.find(emp => emp.employee_id === scan.employee_id);
        return {
            ...scan,
            name: employee ? employee.name : 'غير معروف',
            department: employee ? employee.department : 'غير معروف'
        };
    });

    // عرض البيانات في الجدول
    combinedData.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage).forEach(scan => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${scan.name}</td>
            <td>${scan.department}</td>
            <td>${scan.meal_type}</td>
            <td>${new Date(scan.meal_time).toLocaleTimeString('ar-SA')}</td>
            <td>${scan.period}</td>
        `;
        tbody.appendChild(row);
    });

    // تحديث معلومات الصفحة
    document.querySelector('.table-footer span').textContent = 
        `عرض ${currentPage * rowsPerPage + 1}-${Math.min((currentPage + 1) * rowsPerPage, combinedData.length)} من ${combinedData.length}`;
}

// دالة تحديث الرسوم البيانية
function updateCharts(barcodeData) {
    const breakfastData = getMealChartData(barcodeData, "إفطار");
    const lunchData = getMealChartData(barcodeData, "غداء");
    const eveningData = getMealChartData(barcodeData, "عشاء");

    // رسم المخططات المصغرة
    renderChart("miniBreakfastChart", breakfastData.labels, breakfastData.data, "#34D399");
    renderChart("miniLunchChart", lunchData.labels, lunchData.data, "#60A5FA");
    renderChart("miniEveningChart", eveningData.labels, eveningData.data, "#A78BFA");

    // رسم المخططات الكبيرة
    renderBarChart("breakfastChart", breakfastData.labels, breakfastData.data, "#10B981");
    renderBarChart("lunchChart", lunchData.labels, lunchData.data, "#3B82F6");
    renderBarChart("eveningChart", eveningData.labels, eveningData.data, "#8B5CF6");
}

// دالة تحضير بيانات الرسوم البيانية
function getMealChartData(barcodeData, mealType) {
    const countsByDate = {};
    barcodeData.forEach(scan => {
        if (scan.meal_type === mealType) {
            const date = new Date(scan.meal_time).toLocaleDateString('ar-SA');
            countsByDate[date] = (countsByDate[date] || 0) + 1;
        }
    });

    const labels = Object.keys(countsByDate).sort();
    const data = labels.map(label => countsByDate[label]);
    return { labels, data };
}

// معالجة أزرار التنقل بين الصفحات
document.querySelector(".btn-next").addEventListener("click", () => {
    if ((currentPage + 1) * rowsPerPage < filteredData.length) {
        currentPage++;
        updateEmployeeTable(filteredData);
    }
});

document.querySelector(".btn-prev").addEventListener("click", () => {
    if (currentPage > 0) {
        currentPage--;
        updateEmployeeTable(filteredData);
    }
});

// معالجة زر تصدير البيانات
document.querySelector(".btn-export").addEventListener("click", async () => {
    try {
        const [barcodeData, employeeData] = await Promise.all([
            fetchBarcodeData(),
            fetchEmployeeData()
        ]);

        // إنشاء مصنف Excel جديد
        const wb = XLSX.utils.book_new();
        const wsData = [["الاسم", "القسم", "الوجبة", "الوقت", "الفترة"]];

        // دمج البيانات
        const combinedData = barcodeData.map(scan => {
            const employee = employeeData.find(emp => emp.employee_id === scan.employee_id);
            return {
                name: employee ? employee.name : 'غير معروف',
                department: employee ? employee.department : 'غير معروف',
                meal: scan.meal_type,
                time: new Date(scan.meal_time).toLocaleTimeString('ar-SA'),
                period: scan.period
            };
        });

        // إضافة البيانات إلى مصفوفة Excel
        combinedData.forEach(scan => {
            wsData.push([scan.name, scan.department, scan.meal, scan.time, scan.period]);
        });

        // إنشاء ورقة عمل وإضافتها للمصنف
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "سجلات الباركود");

        // تحديد اسم الملف وتصديره
        const now = new Date();
        const filename = `سجلات_باركود_${now.toLocaleDateString("ar-SA")}_${now.toLocaleTimeString("ar-SA").replace(/:/g, '-')}.xlsx`;
        XLSX.writeFile(wb, filename);
    } catch (error) {
        console.error('خطأ في تصدير البيانات:', error);
    }
});

// معالجة قائمة التصفية
const toggleBtn = document.getElementById("filterToggleBtn");
const dropdown = document.getElementById("filterDropdown");

// إغلاق القائمة عند النقر خارجها
document.addEventListener('click', (e) => {
    if (!toggleBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// فتح/إغلاق قائمة التصفية
toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
});

// معالجة خيارات التصفية
document.querySelectorAll(".filter-option").forEach(btn => {
    btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const value = e.target.dataset.value;
        
        // تحديث نص زر التصفية
        const filterText = e.target.textContent.trim();
        toggleBtn.querySelector('span').textContent = filterText;
        
        // إغلاق القائمة
        dropdown.classList.remove('show');

        try {
            const [barcodeData, employeeData] = await Promise.all([
                fetchBarcodeData(),
                fetchEmployeeData()
            ]);

            // دمج البيانات
            const combinedData = barcodeData.map(scan => {
                const employee = employeeData.find(emp => emp.employee_id === scan.employee_id);
                return {
                    ...scan,
                    name: employee ? employee.name : 'غير معروف'
                };
            });

            // حساب عدد عمليات المسح لكل موظف
            const counts = {};
            combinedData.forEach(scan => {
                counts[scan.name] = (counts[scan.name] || 0) + 1;
            });

            // تطبيق التصفية حسب الخيار المحدد
            if (value === "most") {
                const target = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
                filteredData = combinedData.filter(scan => scan.name === target);
            } else if (value === "least") {
                const target = Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0];
                filteredData = combinedData.filter(scan => scan.name === target);
            } else {
                filteredData = combinedData;
                toggleBtn.querySelector('span').textContent = 'تصفية';
            }

            // تحديث عرض الجدول
            currentPage = 0;
            updateEmployeeTable(filteredData);
        } catch (error) {
            console.error('خطأ في تطبيق التصفية:', error);
        }
    });
});

// تحديث البيانات كل دقيقة
setInterval(updateDashboard, 60000);

// تحديث البيانات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', updateDashboard);

// معالجة زر الرجوع
document.querySelector('.back-button').addEventListener('click', () => {
    window.history.back();
});

// دالة رسم المخططات المصغرة
function renderChart(canvasId, labels, data, color) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        borderColor: color,
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } },
      elements: { line: { borderJoinStyle: 'round' } }
    }
  });
}

// دالة رسم المخططات العمودية
function renderBarChart(canvasId, labels, data, color) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: color,
        borderRadius: 6,
        barPercentage: 0.55,
        categoryPercentage: 0.5
      }]
    },
    options: {
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}
