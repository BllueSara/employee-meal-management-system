// تهيئة المتغيرات
const barcodeInput = document.getElementById('barcodeInput');
const resultCard = document.getElementById('resultCard');

// التركيز على حقل الإدخال عند تحميل الصفحة
window.onload = () => barcodeInput.focus();

// دالة إظهار الكرت
function showCard(status, title, message) {
    let cardHTML = '';
    switch(status) {
        case 'success':
            cardHTML = `
                <div class="status-card success">
                    <div class="icon-circle">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h2>${title}</h2>
                    <p>${message}</p>
                </div>
            `;
            break;
        case 'waiting':
            cardHTML = `
                <div class="status-card waiting">
                    <div class="icon-circle">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 6V12L16 14M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h2>${title}</h2>
                    <p>${message}</p>
                </div>
            `;
            break;
        case 'error':
            cardHTML = `
                <div class="status-card error">
                    <div class="icon-circle">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h2>${title}</h2>
                    <p>${message}</p>
                </div>
            `;
            break;
    }
    resultCard.innerHTML = cardHTML;
}

// دالة معالجة الباركود
async function handleBarcode(barcode) {
    try {
        const response = await fetch('http://localhost:3000/api/barcode-scans', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ barcode: barcode })
        });
        const data = await response.json();
        
        if (data.status === 'success') {
            showCard('success', 'تمت قراءة الباركود بنجاح', 'تم تسجيل الوجبة بنجاح');
        } else if (data.status === 'waiting') {
            showCard('waiting', 'ليس وقتك الآن', 'يرجى الانتظار حتى موعدك المحدد');
        } else {
            showCard('error', 'لم تتم قراءة الباركود', 'الباركود غير صالح');
        }

        // مسح حقل الإدخال وإعادة التركيز
        barcodeInput.value = '';
        barcodeInput.focus();

        // إخفاء الكرت بعد 3 ثواني
        setTimeout(() => {
            resultCard.innerHTML = '';
        }, 3000);

    } catch (error) {
        console.error('Error:', error);
        showCard('error', 'خطأ في الاتصال', 'يرجى المحاولة مرة أخرى');
    }
}

// استماع لحدث إدخال الباركود
barcodeInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        const barcode = barcodeInput.value.trim();
        if (barcode) {
            handleBarcode(barcode);
        }
    }
}); 