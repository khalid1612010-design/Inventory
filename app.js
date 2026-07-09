/**
 * app.js - Kaizen Inventory Management System
 * Main Application File (includes Supabase + PDF + App Logic)
 */

// ============================================================
// SUPABASE CONFIGURATION
// ============================================================
const SUPABASE_URL = 'https://jiglufmniplwwrhwxkty.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZ2x1Zm1uaXBsd3dyaHd4a3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODU5NzUsImV4cCI6MjA5OTE2MTk3NX0.81dhc42MB2KAnKj3xDGgSjDtnML3VqW8iDewsxZNMrw';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// DATABASE INITIALIZATION
// ============================================================
async function initializeDatabase() {
    const tables = ['products', 'inventory_in', 'inventory_out'];
    for (const table of tables) {
        try {
            const { error } = await supabase.from(table).select('id', { count: 'exact', head: true });
            if (error) {
                console.warn(`⚠ Table "${table}" not found. Run init.sql in Supabase SQL Editor.`);
            }
        } catch (err) {
            console.warn(`⚠ Table "${table}" error:`, err.message);
        }
    }
    console.log('%c📦 Kaizen Inventory System - Connected to Supabase', 'font-weight:bold;color:#1e3a8a;');
}
initializeDatabase();

// ============================================================
// DATABASE API - PRODUCTS
// ============================================================
const ProductsAPI = {
    async getAll() {
        const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
        if (error) throw error;
        return data || [];
    },
    async getByName(name) {
        const { data, error } = await supabase.from('products').select('*').eq('name', name).maybeSingle();
        if (error) throw error;
        return data;
    },
    async upsert(productData) {
        const { data, error } = await supabase.from('products').upsert(productData, { onConflict: 'name' }).select();
        if (error) throw error;
        return data?.[0] || null;
    },
    async updateQuantity(name, quantityDelta, unitPrice = null) {
        const existing = await this.getByName(name);
        if (existing) {
            const newQuantity = parseFloat(existing.quantity) + parseFloat(quantityDelta);
            const updateData = { name, quantity: Math.max(0, newQuantity), updated_at: new Date().toISOString() };
            if (unitPrice !== null) updateData.unit_price = unitPrice;
            return await this.upsert(updateData);
        } else {
            return await this.upsert({ name, quantity: Math.max(0, parseFloat(quantityDelta)), unit_price: unitPrice || 0, updated_at: new Date().toISOString() });
        }
    }
};

// ============================================================
// DATABASE API - INVENTORY IN
// ============================================================
const InventoryInAPI = {
    async add(record) {
        const { data, error } = await supabase.from('inventory_in').insert({
            product_name: record.product_name, quantity: record.quantity, unit_price: record.unit_price,
            total_price: record.total_price, supplier_name: record.supplier_name || '',
            entry_date: record.entry_date, employee_name: record.employee_name || '', notes: record.notes || ''
        }).select();
        if (error) throw error;
        return data?.[0] || null;
    },
    async getAll() {
        const { data, error } = await supabase.from('inventory_in').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    async getById(id) {
        const { data, error } = await supabase.from('inventory_in').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data;
    }
};

// ============================================================
// DATABASE API - INVENTORY OUT
// ============================================================
const InventoryOutAPI = {
    async add(record) {
        const { data, error } = await supabase.from('inventory_out').insert({
            product_name: record.product_name, quantity: record.quantity,
            total_selling_price: record.total_selling_price, customer_name: record.customer_name || '',
            date: record.date, employee_name: record.employee_name || '', notes: record.notes || ''
        }).select();
        if (error) throw error;
        return data?.[0] || null;
    },
    async getAll() {
        const { data, error } = await supabase.from('inventory_out').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    async getById(id) {
        const { data, error } = await supabase.from('inventory_out').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data;
    }
};

// ============================================================
// PDF GENERATOR
// ============================================================
const PDFGenerator = {
    async generateInventoryInPDF(record, tr) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pw = 210, m = 15;
        let y = m;

        // Header
        doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(30, 58, 138);
        doc.text('KAIZEN', pw / 2, y, { align: 'center' });
        y += 8; doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(tr.inventoryManagementSystem || 'Inventory Management System', pw / 2, y, { align: 'center' });
        y += 5; doc.setDrawColor(30, 58, 138); doc.setLineWidth(0.5); doc.line(m, y, pw - m, y);

        // Title
        y += 10; doc.setFontSize(16); doc.setTextColor(22, 163, 74); doc.setFont('helvetica', 'bold');
        doc.text(tr.inventoryInReceipt || 'INVENTORY IN - RECEIPT', pw / 2, y, { align: 'center' });

        // Info box
        y += 8; doc.setDrawColor(220, 220, 220); doc.setFillColor(248, 250, 252);
        doc.roundedRect(m, y, pw - m * 2, 8, 2, 2, 'F');
        doc.setFontSize(9); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'normal');
        const ds = record.created_at ? new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
        doc.text(`${tr.date || 'Date'}: ${ds}`, m + 3, y + 5.5);
        doc.text(`${tr.receiptNo || 'Receipt No'}: ${record.id ? record.id.slice(0, 8).toUpperCase() : '-'}`, pw / 2, y + 5.5);
        doc.text(`${tr.entryDate || 'Entry Date'}: ${record.entry_date || '-'}`, pw - m - 3, y + 5.5, { align: 'right' });

        // Details
        y += 16; doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138);
        doc.text(tr.transactionDetails || 'Transaction Details', m, y);
        y += 7;
        const details = [
            { label: tr.productName || 'Product Name', value: record.product_name || '-' },
            { label: tr.quantity || 'Quantity', value: String(record.quantity || '-') },
            { label: tr.unitPrice || 'Unit Price', value: record.unit_price ? `$${parseFloat(record.unit_price).toFixed(2)}` : '-' },
            { label: tr.totalPrice || 'Total Price', value: record.total_price ? `$${parseFloat(record.total_price).toFixed(2)}` : '-' },
            { label: tr.supplierName || 'Supplier Name', value: record.supplier_name || '-' },
            { label: tr.employeeName || 'Employee Name', value: record.employee_name || '-' },
            { label: tr.notes || 'Notes', value: record.notes || '-' }
        ];
        details.forEach(d => {
            doc.setFillColor(245, 247, 250); doc.roundedRect(m, y, pw - m * 2, 7, 1, 1, 'F');
            doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60);
            doc.text(d.label + ':', m + 3, y + 4.5);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
            doc.text(d.value, m + 55, y + 4.5); y += 8;
        });

        // Footer
        y += 10; doc.setDrawColor(200, 200, 200); doc.line(m, y, pw - m, y); y += 5;
        doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal');
        doc.text(tr.generatedByKaizen || 'Generated by Kaizen Inventory Management System', pw / 2, y, { align: 'center' });
        y += 4;
        doc.text(`${tr.generatedOn || 'Generated on'}: ${new Date().toLocaleString()}`, pw / 2, y, { align: 'center' });
        doc.save(`Kaizen_InventoryIn_${record.id ? record.id.slice(0, 8) : 'receipt'}.pdf`);
    },

    async generateInventoryOutPDF(record, tr) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pw = 210, m = 15;
        let y = m;

        // Header
        doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(30, 58, 138);
        doc.text('KAIZEN', pw / 2, y, { align: 'center' });
        y += 8; doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(tr.inventoryManagementSystem || 'Inventory Management System', pw / 2, y, { align: 'center' });
        y += 5; doc.setDrawColor(30, 58, 138); doc.setLineWidth(0.5); doc.line(m, y, pw - m, y);

        // Title
        y += 10; doc.setFontSize(16); doc.setTextColor(220, 38, 38); doc.setFont('helvetica', 'bold');
        doc.text(tr.inventoryOutReceipt || 'INVENTORY OUT - ISSUE SLIP', pw / 2, y, { align: 'center' });

        // Info box
        y += 8; doc.setDrawColor(220, 220, 220); doc.setFillColor(248, 250, 252);
        doc.roundedRect(m, y, pw - m * 2, 8, 2, 2, 'F');
        doc.setFontSize(9); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'normal');
        const ds = record.created_at ? new Date(record.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
        doc.text(`${tr.date || 'Date'}: ${ds}`, m + 3, y + 5.5);
        doc.text(`${tr.issueNo || 'Issue No'}: ${record.id ? record.id.slice(0, 8).toUpperCase() : '-'}`, pw / 2, y + 5.5);
        doc.text(`${tr.issueDate || 'Issue Date'}: ${record.date || '-'}`, pw - m - 3, y + 5.5, { align: 'right' });

        // Details
        y += 16; doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138);
        doc.text(tr.transactionDetails || 'Transaction Details', m, y);
        y += 7;
        const details = [
            { label: tr.productName || 'Product Name', value: record.product_name || '-' },
            { label: tr.quantity || 'Quantity', value: String(record.quantity || '-') },
            { label: tr.totalSellingPrice || 'Total Selling Price', value: record.total_selling_price ? `$${parseFloat(record.total_selling_price).toFixed(2)}` : '-' },
            { label: tr.customerName || 'Customer Name', value: record.customer_name || '-' },
            { label: tr.employeeName || 'Employee/Seller Name', value: record.employee_name || '-' },
            { label: tr.notes || 'Notes', value: record.notes || '-' }
        ];
        details.forEach(d => {
            doc.setFillColor(245, 247, 250); doc.roundedRect(m, y, pw - m * 2, 7, 1, 1, 'F');
            doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60);
            doc.text(d.label + ':', m + 3, y + 4.5);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
            doc.text(d.value, m + 55, y + 4.5); y += 8;
        });

        // Footer
        y += 10; doc.setDrawColor(200, 200, 200); doc.line(m, y, pw - m, y); y += 5;
        doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal');
        doc.text(tr.generatedByKaizen || 'Generated by Kaizen Inventory Management System', pw / 2, y, { align: 'center' });
        y += 4;
        doc.text(`${tr.generatedOn || 'Generated on'}: ${new Date().toLocaleString()}`, pw / 2, y, { align: 'center' });
        doc.save(`Kaizen_InventoryOut_${record.id ? record.id.slice(0, 8) : 'issue'}.pdf`);
    }
};

// ============================================================
// TRANSLATIONS (Arabic & English)
// ============================================================
const translations = {
    en: {
        appName: 'KAIZEN', appSubtitle: 'Inventory Management System',
        dashboard: 'Dashboard', inventoryIn: 'Inventory In', inventoryOut: 'Inventory Out',
        products: 'Products', operations: 'Operations History',
        totalProducts: 'Total Products', totalQuantity: 'Total Inventory Quantity',
        totalValue: 'Total Inventory Value', totalInOps: 'Total Inventory In Operations',
        totalOutOps: 'Total Inventory Out Operations',
        inventoryInAction: 'Inventory In', inventoryOutAction: 'Inventory Out',
        recentOperations: 'Recent Operations',
        newInventoryIn: 'New Inventory In', newInventoryOut: 'New Inventory Out',
        productName: 'Product Name', quantity: 'Quantity', unitPrice: 'Unit Price',
        totalPrice: 'Total Price', supplierName: 'Supplier Name',
        entryDate: 'Entry Date', employeeName: 'Employee Name',
        notes: 'Notes (Optional)', submit: 'Submit', cancel: 'Cancel', reset: 'Reset',
        totalSellingPrice: 'Total Selling Price', customerName: 'Customer Name',
        date: 'Date', employeeSellerName: 'Employee / Seller Name',
        currentQuantity: 'Current Quantity', stockValue: 'Stock Value',
        lastUpdated: 'Last Updated', search: 'Search...',
        filterByDate: 'Filter by date', filterByEmployee: 'Filter by employee',
        filterByProduct: 'Filter by product', all: 'All', type: 'Type',
        downloadPDF: 'Download PDF', noData: 'No data available',
        noProducts: 'No products in inventory', noOperations: 'No operations recorded',
        confirmDelete: 'Are you sure?', success: 'Success', error: 'Error',
        recordAdded: 'Record added successfully!',
        recordError: 'Error adding record. Please try again.',
        insufficientStock: 'Insufficient stock! Available:',
        selectProduct: 'Select a product...', loading: 'Loading...',
        generatedByKaizen: 'Generated by Kaizen Inventory Management System',
        generatedOn: 'Generated on',
        inventoryInReceipt: 'INVENTORY IN - RECEIPT',
        inventoryOutReceipt: 'INVENTORY OUT - ISSUE SLIP',
        transactionDetails: 'Transaction Details',
        receiptNo: 'Receipt No', issueNo: 'Issue No', issueDate: 'Issue Date',
        inventoryManagementSystem: 'Inventory Management System',
        stock: 'Stock', in: 'In', out: 'Out',
        autoCalculated: 'Auto-calculated', viewAll: 'View All',
        langEn: 'EN', langAr: 'العربية', confirm: 'Confirm', close: 'Close'
    },
    ar: {
        appName: 'كايزن', appSubtitle: 'نظام إدارة المخزون',
        dashboard: 'لوحة التحكم', inventoryIn: 'إدخال مخزون', inventoryOut: 'إخراج مخزون',
        products: 'المنتجات', operations: 'سجل العمليات',
        totalProducts: 'إجمالي المنتجات', totalQuantity: 'إجمالي كمية المخزون',
        totalValue: 'إجمالي قيمة المخزون', totalInOps: 'إجمالي عمليات الإدخال',
        totalOutOps: 'إجمالي عمليات الإخراج',
        inventoryInAction: 'إدخال مخزون', inventoryOutAction: 'إخراج مخزون',
        recentOperations: 'آخر العمليات',
        newInventoryIn: 'عملية إدخال جديدة', newInventoryOut: 'عملية إخراج جديدة',
        productName: 'اسم المنتج', quantity: 'الكمية', unitPrice: 'سعر الوحدة',
        totalPrice: 'السعر الإجمالي', supplierName: 'اسم المورد',
        entryDate: 'تاريخ الإدخال', employeeName: 'اسم الموظف',
        notes: 'ملاحظات (اختياري)', submit: 'إرسال', cancel: 'إلغاء', reset: 'إعادة تعيين',
        totalSellingPrice: 'سعر البيع الإجمالي', customerName: 'اسم العميل',
        date: 'التاريخ', employeeSellerName: 'اسم الموظف / البائع',
        currentQuantity: 'الكمية الحالية', stockValue: 'قيمة المخزون',
        lastUpdated: 'آخر تحديث', search: 'بحث...',
        filterByDate: 'تصفية حسب التاريخ', filterByEmployee: 'تصفية حسب الموظف',
        filterByProduct: 'تصفية حسب المنتج', all: 'الكل', type: 'النوع',
        downloadPDF: 'تحميل PDF', noData: 'لا توجد بيانات',
        noProducts: 'لا توجد منتجات في المخزون', noOperations: 'لا توجد عمليات مسجلة',
        confirmDelete: 'هل أنت متأكد؟', success: 'تم بنجاح', error: 'خطأ',
        recordAdded: 'تمت إضافة السجل بنجاح!',
        recordError: 'خطأ في إضافة السجل. يرجى المحاولة مرة أخرى.',
        insufficientStock: 'مخزون غير كاف! المتاح:',
        selectProduct: 'اختر منتج...', loading: 'جاري التحميل...',
        generatedByKaizen: 'تم إنشاؤه بواسطة نظام كايزن لإدارة المخزون',
        generatedOn: 'تاريخ الإنشاء',
        inventoryInReceipt: 'إيصال إدخال مخزون',
        inventoryOutReceipt: 'إيصال إخراج مخزون',
        transactionDetails: 'تفاصيل العملية',
        receiptNo: 'رقم الإيصال', issueNo: 'رقم الصرف', issueDate: 'تاريخ الصرف',
        inventoryManagementSystem: 'نظام إدارة المخزون',
        stock: 'المخزون', in: 'داخل', out: 'خارج',
        autoCalculated: 'تحسب تلقائيا', viewAll: 'عرض الكل',
        langEn: 'EN', langAr: 'العربية', confirm: 'تأكيد', close: 'إغلاق'
    }
};

// ============================================================
// APPLICATION STATE
// ============================================================
const AppState = {
    currentPage: 'dashboard',
    currentLang: 'en',
    products: [],
    inventoryIn: [],
    inventoryOut: []
};

// ============================================================
// UTILITIES
// ============================================================
function t(key) { return translations[AppState.currentLang][key] || key; }

function formatCurrency(amount) {
    return new Intl.NumberFormat(AppState.currentLang === 'ar' ? 'ar-SA' : 'en-US', {
        style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(parseFloat(amount) || 0);
}

function formatNumber(num) {
    return new Intl.NumberFormat(AppState.currentLang === 'ar' ? 'ar-SA' : 'en-US').format(parseFloat(num) || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(AppState.currentLang === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getTodayDate() { return new Date().toISOString().split('T')[0]; }

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function showLoading() { document.getElementById('loadingOverlay').classList.add('active'); }
function hideLoading() { document.getElementById('loadingOverlay').classList.remove('active'); }

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(page) {
    AppState.currentPage = page;
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });
    renderPage(page);
    closeSidebar();
    const titles = { dashboard: t('dashboard'), 'inventory-in': t('inventoryIn'), 'inventory-out': t('inventoryOut'), products: t('products'), operations: t('operations') };
    document.getElementById('pageTitle').textContent = titles[page] || 'Kaizen';
}

function renderPage(page) {
    const content = document.getElementById('contentArea');
    switch (page) {
        case 'dashboard': content.innerHTML = renderDashboard(); loadDashboardData(); break;
        case 'inventory-in': content.innerHTML = renderInventoryInForm(); initInventoryInForm(); break;
        case 'inventory-out': content.innerHTML = renderInventoryOutForm(); initInventoryOutForm(); break;
        case 'products': content.innerHTML = renderProductsPage(); loadProductsData(); break;
        case 'operations': content.innerHTML = renderOperationsPage(); loadOperationsData(); break;
        default: content.innerHTML = renderDashboard(); loadDashboardData();
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// ============================================================
// LANGUAGE SWITCHING
// ============================================================
function switchLanguage(lang) {
    AppState.currentLang = lang;
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    // Update sidebar labels
    document.querySelectorAll('.sidebar-nav a [data-key]').forEach(el => {
        const key = el.dataset.key;
        if (translations[lang][key]) el.textContent = translations[lang][key];
    });
    renderPage(AppState.currentPage);
    localStorage.setItem('kaizen_lang', lang);
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
    return `
        <div class="stats-grid">
            <div class="stat-card card-products">
                <div class="stat-icon" style="background:#dbeafe;color:#1e3a8a;">📦</div>
                <div class="stat-value" id="statProducts">-</div>
                <div class="stat-label">${t('totalProducts')}</div>
            </div>
            <div class="stat-card card-quantity">
                <div class="stat-icon" style="background:#dcfce7;color:#16a34a;">📊</div>
                <div class="stat-value" id="statQuantity">-</div>
                <div class="stat-label">${t('totalQuantity')}</div>
            </div>
            <div class="stat-card card-value">
                <div class="stat-icon" style="background:#fef3c7;color:#f59e0b;">💰</div>
                <div class="stat-value" id="statValue">-</div>
                <div class="stat-label">${t('totalValue')}</div>
            </div>
            <div class="stat-card card-in">
                <div class="stat-icon" style="background:#cffafe;color:#06b6d4;">📥</div>
                <div class="stat-value" id="statInOps">-</div>
                <div class="stat-label">${t('totalInOps')}</div>
            </div>
            <div class="stat-card card-out">
                <div class="stat-icon" style="background:#fee2e2;color:#dc2626;">📤</div>
                <div class="stat-value" id="statOutOps">-</div>
                <div class="stat-label">${t('totalOutOps')}</div>
            </div>
        </div>
        <div class="action-buttons">
            <button class="btn-action btn-in" onclick="navigateTo('inventory-in')">
                <span class="action-icon">📥</span>
                <span>${t('inventoryInAction')}</span>
                <span style="font-size:0.8rem;opacity:0.7;">${t('newInventoryIn')}</span>
            </button>
            <button class="btn-action btn-out" onclick="navigateTo('inventory-out')">
                <span class="action-icon">📤</span>
                <span>${t('inventoryOutAction')}</span>
                <span style="font-size:0.8rem;opacity:0.7;">${t('newInventoryOut')}</span>
            </button>
        </div>
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">${t('recentOperations')}</h3>
                <button class="btn btn-outline btn-sm" onclick="navigateTo('operations')">${t('viewAll')} →</button>
            </div>
            <div class="table-wrap">
                <table>
                    <thead><tr>
                        <th>${t('type')}</th><th>${t('productName')}</th>
                        <th>${t('quantity')}</th><th>${t('date')}</th>
                        <th>${t('employeeName')}</th>
                    </tr></thead>
                    <tbody id="recentOpsBody">
                        <tr><td colspan="5" class="empty-state"><p>${t('loading')}</p></td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;
}

async function loadDashboardData() {
    try {
        showLoading();
        const [products, inRecords, outRecords] = await Promise.all([
            ProductsAPI.getAll(), InventoryInAPI.getAll(), InventoryOutAPI.getAll()
        ]);
        AppState.products = products; AppState.inventoryIn = inRecords; AppState.inventoryOut = outRecords;

        const totalProducts = products.length;
        const totalQuantity = products.reduce((s, p) => s + parseFloat(p.quantity || 0), 0);
        const totalValue = products.reduce((s, p) => s + (parseFloat(p.quantity || 0) * parseFloat(p.unit_price || 0)), 0);

        document.getElementById('statProducts').textContent = formatNumber(totalProducts);
        document.getElementById('statQuantity').textContent = formatNumber(totalQuantity);
        document.getElementById('statValue').textContent = formatCurrency(totalValue);
        document.getElementById('statInOps').textContent = formatNumber(inRecords.length);
        document.getElementById('statOutOps').textContent = formatNumber(outRecords.length);

        const allOps = [
            ...inRecords.map(r => ({ ...r, opType: 'in', dateField: r.entry_date || r.created_at })),
            ...outRecords.map(r => ({ ...r, opType: 'out', dateField: r.date || r.created_at }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

        const tbody = document.getElementById('recentOpsBody');
        if (allOps.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><p>${t('noOperations')}</p></td></tr>`;
        } else {
            tbody.innerHTML = allOps.map(op => `<tr>
                <td><span class="badge ${op.opType === 'in' ? 'badge-in' : 'badge-out'}">${op.opType === 'in' ? '📥 ' + t('in') : '📤 ' + t('out')}</span></td>
                <td>${escapeHtml(op.product_name)}</td>
                <td>${formatNumber(op.quantity)}</td>
                <td>${formatDate(op.dateField)}</td>
                <td>${escapeHtml(op.employee_name || '-')}</td>
            </tr>`).join('');
        }
    } catch (err) {
        console.error('Dashboard error:', err);
        showToast(t('error') + ': ' + err.message, 'error');
    } finally { hideLoading(); }
}

// ============================================================
// INVENTORY IN FORM
// ============================================================
function renderInventoryInForm() {
    return `
        <div class="form-card">
            <h2 class="form-card-title">📥 ${t('newInventoryIn')}</h2>
            <form id="inventoryInForm" onsubmit="handleInventoryInSubmit(event)">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">${t('productName')} <span class="required">*</span></label>
                        <input type="text" class="form-input" id="inProductName" required placeholder="${t('productName')}" list="productSuggestions">
                        <datalist id="productSuggestions"></datalist>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('quantity')} <span class="required">*</span></label>
                        <input type="number" class="form-input" id="inQuantity" required min="0.01" step="0.01" placeholder="0" oninput="calcInTotalPrice()">
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('unitPrice')} <span class="required">*</span></label>
                        <input type="number" class="form-input" id="inUnitPrice" required min="0.01" step="0.01" placeholder="0.00" oninput="calcInTotalPrice()">
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('totalPrice')} <span class="required">*</span></label>
                        <input type="number" class="form-input calculated" id="inTotalPrice" required min="0.01" step="0.01" placeholder="0.00" oninput="calcInUnitPrice()">
                        <span class="form-hint">${t('autoCalculated')}</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('supplierName')}</label>
                        <input type="text" class="form-input" id="inSupplierName" placeholder="${t('supplierName')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('entryDate')} <span class="required">*</span></label>
                        <input type="date" class="form-input" id="inEntryDate" required value="${getTodayDate()}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('employeeName')} <span class="required">*</span></label>
                        <input type="text" class="form-input" id="inEmployeeName" required placeholder="${t('employeeName')}">
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">${t('notes')}</label>
                        <textarea class="form-textarea" id="inNotes" placeholder="${t('notes')}"></textarea>
                    </div>
                </div>
                <div class="btn-group">
                    <button type="submit" class="btn btn-success btn-lg">✓ ${t('submit')}</button>
                    <button type="reset" class="btn btn-outline btn-lg">↺ ${t('reset')}</button>
                </div>
            </form>
        </div>`;
}

async function initInventoryInForm() {
    if (AppState.products.length === 0) {
        try { AppState.products = await ProductsAPI.getAll(); } catch (e) {}
    }
    updateProductSuggestions();
}

function calcInTotalPrice() {
    const q = parseFloat(document.getElementById('inQuantity').value) || 0;
    const u = parseFloat(document.getElementById('inUnitPrice').value) || 0;
    if (q > 0 && u > 0) document.getElementById('inTotalPrice').value = (q * u).toFixed(2);
}

function calcInUnitPrice() {
    const q = parseFloat(document.getElementById('inQuantity').value) || 0;
    const tp = parseFloat(document.getElementById('inTotalPrice').value) || 0;
    if (q > 0 && tp > 0) document.getElementById('inUnitPrice').value = (tp / q).toFixed(2);
}

async function handleInventoryInSubmit(event) {
    event.preventDefault();
    try {
        showLoading();
        const record = {
            product_name: document.getElementById('inProductName').value.trim(),
            quantity: parseFloat(document.getElementById('inQuantity').value),
            unit_price: parseFloat(document.getElementById('inUnitPrice').value),
            total_price: parseFloat(document.getElementById('inTotalPrice').value),
            supplier_name: document.getElementById('inSupplierName').value.trim(),
            entry_date: document.getElementById('inEntryDate').value,
            employee_name: document.getElementById('inEmployeeName').value.trim(),
            notes: document.getElementById('inNotes').value.trim()
        };
        if (!record.product_name || !record.quantity || !record.unit_price) {
            showToast(t('error') + ': Please fill all required fields', 'error'); hideLoading(); return;
        }
        if (record.quantity <= 0) {
            showToast(t('error') + ': Quantity must be greater than 0', 'error'); hideLoading(); return;
        }
        await InventoryInAPI.add(record);
        await ProductsAPI.updateQuantity(record.product_name, record.quantity, record.unit_price);
        showToast(t('recordAdded'), 'success');
        document.getElementById('inventoryInForm').reset();
        document.getElementById('inEntryDate').value = getTodayDate();
        AppState.products = await ProductsAPI.getAll();
        updateProductSuggestions();
    } catch (err) {
        console.error('Inventory In error:', err);
        showToast(t('recordError') + ' ' + err.message, 'error');
    } finally { hideLoading(); }
}

function updateProductSuggestions() {
    const dl = document.getElementById('productSuggestions');
    if (!dl) return;
    dl.innerHTML = AppState.products.map(p =>
        `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)} (${t('stock')}: ${formatNumber(p.quantity)})</option>`
    ).join('');
}

// ============================================================
// INVENTORY OUT FORM
// ============================================================
function renderInventoryOutForm() {
    return `
        <div class="form-card">
            <h2 class="form-card-title">📤 ${t('newInventoryOut')}</h2>
            <form id="inventoryOutForm" onsubmit="handleInventoryOutSubmit(event)">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">${t('productName')} <span class="required">*</span></label>
                        <select class="form-select" id="outProductName" required onchange="onOutProductChange()">
                            <option value="">${t('selectProduct')}</option>
                        </select>
                        <span class="form-hint" id="outStockInfo"></span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('quantity')} <span class="required">*</span></label>
                        <input type="number" class="form-input" id="outQuantity" required min="0.01" step="0.01" placeholder="0" oninput="validateOutQuantity()">
                        <span class="form-hint" id="outQuantityHint"></span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('totalSellingPrice')} <span class="required">*</span></label>
                        <input type="number" class="form-input" id="outTotalPrice" required min="0.01" step="0.01" placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('customerName')}</label>
                        <input type="text" class="form-input" id="outCustomerName" placeholder="${t('customerName')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('date')} <span class="required">*</span></label>
                        <input type="date" class="form-input" id="outDate" required value="${getTodayDate()}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">${t('employeeSellerName')} <span class="required">*</span></label>
                        <input type="text" class="form-input" id="outEmployeeName" required placeholder="${t('employeeSellerName')}">
                    </div>
                    <div class="form-group full-width">
                        <label class="form-label">${t('notes')}</label>
                        <textarea class="form-textarea" id="outNotes" placeholder="${t('notes')}"></textarea>
                    </div>
                </div>
                <div class="btn-group">
                    <button type="submit" class="btn btn-danger btn-lg">✓ ${t('submit')}</button>
                    <button type="reset" class="btn btn-outline btn-lg">↺ ${t('reset')}</button>
                </div>
            </form>
        </div>`;
}

async function initInventoryOutForm() { await loadProductsForSelect(); }

async function loadProductsForSelect() {
    try {
        const products = await ProductsAPI.getAll();
        AppState.products = products;
        const select = document.getElementById('outProductName');
        if (!select) return;
        select.innerHTML = `<option value="">${t('selectProduct')}</option>`;
        products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = `${p.name} (${t('stock')}: ${formatNumber(p.quantity)})`;
            opt.dataset.quantity = p.quantity;
            select.appendChild(opt);
        });
    } catch (err) { console.error('Load products error:', err); }
}

function onOutProductChange() {
    const sel = document.getElementById('outProductName').selectedOptions[0];
    const info = document.getElementById('outStockInfo');
    if (sel && sel.dataset.quantity) {
        const qty = parseFloat(sel.dataset.quantity);
        info.textContent = `${t('currentQuantity')}: ${formatNumber(qty)}`;
        document.getElementById('outQuantity').max = qty;
        document.getElementById('outQuantityHint').textContent = `${t('stock')}: ${formatNumber(qty)}`;
    } else { info.textContent = ''; document.getElementById('outQuantityHint').textContent = ''; }
}

function validateOutQuantity() {
    const sel = document.getElementById('outProductName').selectedOptions[0];
    const hint = document.getElementById('outQuantityHint');
    if (sel && sel.dataset.quantity) {
        const avail = parseFloat(sel.dataset.quantity);
        const req = parseFloat(document.getElementById('outQuantity').value) || 0;
        if (req > avail) {
            hint.style.color = '#dc2626';
            hint.textContent = `⚠ ${t('insufficientStock')} ${formatNumber(avail)}`;
        } else {
            hint.style.color = '';
            hint.textContent = `${t('stock')}: ${formatNumber(avail)}`;
        }
    }
}

async function handleInventoryOutSubmit(event) {
    event.preventDefault();
    try {
        showLoading();
        const sel = document.getElementById('outProductName').selectedOptions[0];
        const availQty = sel ? parseFloat(sel.dataset.quantity) : 0;
        const reqQty = parseFloat(document.getElementById('outQuantity').value);

        if (reqQty > availQty) {
            showToast(`${t('insufficientStock')} ${formatNumber(availQty)}`, 'error'); hideLoading(); return;
        }
        if (reqQty <= 0) {
            showToast(t('error') + ': Quantity must be greater than 0', 'error'); hideLoading(); return;
        }

        const record = {
            product_name: document.getElementById('outProductName').value,
            quantity: reqQty,
            total_selling_price: parseFloat(document.getElementById('outTotalPrice').value) || 0,
            customer_name: document.getElementById('outCustomerName').value.trim(),
            date: document.getElementById('outDate').value,
            employee_name: document.getElementById('outEmployeeName').value.trim(),
            notes: document.getElementById('outNotes').value.trim()
        };
        if (!record.product_name || !record.quantity) {
            showToast(t('error') + ': Please fill all required fields', 'error'); hideLoading(); return;
        }

        await InventoryOutAPI.add(record);
        await ProductsAPI.updateQuantity(record.product_name, -record.quantity);
        showToast(t('recordAdded'), 'success');

        document.getElementById('inventoryOutForm').reset();
        document.getElementById('outDate').value = getTodayDate();
        document.getElementById('outStockInfo').textContent = '';
        document.getElementById('outQuantityHint').textContent = '';
        AppState.products = await ProductsAPI.getAll();
        await loadProductsForSelect();
    } catch (err) {
        console.error('Inventory Out error:', err);
        showToast(t('recordError') + ' ' + err.message, 'error');
    } finally { hideLoading(); }
}

// ============================================================
// PRODUCTS PAGE
// ============================================================
function renderProductsPage() {
    return `
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">📦 ${t('products')}</h3>
                <div class="table-filters">
                    <input type="text" class="form-input" id="productSearch" placeholder="${t('search')}" oninput="filterProductsTable()">
                </div>
            </div>
            <div class="table-wrap">
                <table><thead><tr>
                    <th>${t('productName')}</th><th>${t('currentQuantity')}</th>
                    <th>${t('unitPrice')}</th><th>${t('stockValue')}</th>
                    <th>${t('supplierName')}</th><th>${t('lastUpdated')}</th>
                </tr></thead>
                <tbody id="productsTableBody">
                    <tr><td colspan="6" class="empty-state"><p>${t('loading')}</p></td></tr>
                </tbody></table>
            </div>
        </div>`;
}

async function loadProductsData() {
    try {
        showLoading();
        AppState.products = await ProductsAPI.getAll();
        renderProductsTable(AppState.products);
    } catch (err) {
        console.error('Load products error:', err);
        showToast(t('error') + ': ' + err.message, 'error');
    } finally { hideLoading(); }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><div class="empty-icon">📦</div><p>${t('noProducts')}</p></td></tr>`;
        return;
    }
    tbody.innerHTML = products.map(p => `<tr>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td>${formatNumber(p.quantity)}</td>
        <td>${formatCurrency(p.unit_price)}</td>
        <td><strong>${formatCurrency(parseFloat(p.quantity || 0) * parseFloat(p.unit_price || 0))}</strong></td>
        <td>${escapeHtml(p.supplier_name || '-')}</td>
        <td>${formatDate(p.updated_at)}</td>
    </tr>`).join('');
}

function filterProductsTable() {
    const q = (document.getElementById('productSearch')?.value || '').toLowerCase();
    renderProductsTable(AppState.products.filter(p =>
        p.name.toLowerCase().includes(q) || (p.supplier_name && p.supplier_name.toLowerCase().includes(q))
    ));
}

// ============================================================
// OPERATIONS HISTORY
// ============================================================
function renderOperationsPage() {
    return `
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">📋 ${t('operations')}</h3>
                <div class="table-filters">
                    <input type="text" class="form-input" id="opsSearch" placeholder="${t('search')}" oninput="filterOpsTable()">
                    <input type="date" class="form-input" id="opsDateFilter" onchange="filterOpsTable()">
                    <input type="text" class="form-input" id="opsEmployeeFilter" placeholder="${t('filterByEmployee')}" oninput="filterOpsTable()">
                    <select class="form-select" id="opsTypeFilter" onchange="filterOpsTable()">
                        <option value="all">${t('all')}</option>
                        <option value="in">📥 ${t('in')}</option>
                        <option value="out">📤 ${t('out')}</option>
                    </select>
                </div>
            </div>
            <div class="table-wrap">
                <table><thead><tr>
                    <th>${t('type')}</th><th>${t('productName')}</th>
                    <th>${t('quantity')}</th><th>${t('unitPrice')} / ${t('totalPrice')}</th>
                    <th>${t('supplierName')} / ${t('customerName')}</th>
                    <th>${t('date')}</th><th>${t('employeeName')}</th><th>PDF</th>
                </tr></thead>
                <tbody id="operationsTableBody">
                    <tr><td colspan="8" class="empty-state"><p>${t('loading')}</p></td></tr>
                </tbody></table>
            </div>
        </div>`;
}

async function loadOperationsData() {
    try {
        showLoading();
        const [inR, outR] = await Promise.all([InventoryInAPI.getAll(), InventoryOutAPI.getAll()]);
        AppState.inventoryIn = inR; AppState.inventoryOut = outR;
        renderOpsTable();
    } catch (err) {
        console.error('Load operations error:', err);
        showToast(t('error') + ': ' + err.message, 'error');
    } finally { hideLoading(); }
}

function getAllOps() {
    return [
        ...AppState.inventoryIn.map(r => ({ ...r, opType: 'in', contactField: r.supplier_name, dateField: r.entry_date, priceField: r.unit_price })),
        ...AppState.inventoryOut.map(r => ({ ...r, opType: 'out', contactField: r.customer_name, dateField: r.date, priceField: r.total_selling_price }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function renderOpsTable(ops = null) {
    const tbody = document.getElementById('operationsTableBody');
    if (!tbody) return;
    const operations = ops || getAllOps();
    if (operations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><div class="empty-icon">📋</div><p>${t('noOperations')}</p></td></tr>`;
        return;
    }
    tbody.innerHTML = operations.map(op => `<tr>
        <td><span class="badge ${op.opType === 'in' ? 'badge-in' : 'badge-out'}">${op.opType === 'in' ? '📥 ' + t('in') : '📤 ' + t('out')}</span></td>
        <td><strong>${escapeHtml(op.product_name)}</strong></td>
        <td>${formatNumber(op.quantity)}</td>
        <td>${op.opType === 'in' ? formatCurrency(op.priceField) + ' / ' + formatCurrency(op.total_price) : formatCurrency(op.total_selling_price)}</td>
        <td>${escapeHtml(op.contactField || '-')}</td>
        <td>${formatDate(op.dateField)}</td>
        <td>${escapeHtml(op.employee_name || '-')}</td>
        <td><button class="btn btn-sm btn-outline" onclick="downloadOpPDF('${op.id}','${op.opType}')">📄 PDF</button></td>
    </tr>`).join('');
}

function filterOpsTable() {
    const sq = (document.getElementById('opsSearch')?.value || '').toLowerCase();
    const df = document.getElementById('opsDateFilter')?.value || '';
    const ef = (document.getElementById('opsEmployeeFilter')?.value || '').toLowerCase();
    const tf = document.getElementById('opsTypeFilter')?.value || 'all';
    let ops = getAllOps();
    if (sq) ops = ops.filter(o => o.product_name.toLowerCase().includes(sq) || (o.contactField && o.contactField.toLowerCase().includes(sq)));
    if (df) ops = ops.filter(o => (o.dateField || '').split('T')[0] === df);
    if (ef) ops = ops.filter(o => o.employee_name && o.employee_name.toLowerCase().includes(ef));
    if (tf !== 'all') ops = ops.filter(o => o.opType === tf);
    renderOpsTable(ops);
}

// ============================================================
// PDF DOWNLOAD
// ============================================================
async function downloadOpPDF(id, opType) {
    try {
        showLoading();
        let record;
        if (opType === 'in') {
            record = await InventoryInAPI.getById(id);
            if (record) await PDFGenerator.generateInventoryInPDF(record, translations[AppState.currentLang]);
        } else {
            record = await InventoryOutAPI.getById(id);
            if (record) await PDFGenerator.generateInventoryOutPDF(record, translations[AppState.currentLang]);
        }
        if (!record) showToast(t('error') + ': Record not found', 'error');
    } catch (err) {
        console.error('PDF error:', err);
        showToast(t('error') + ': ' + err.message, 'error');
    } finally { hideLoading(); }
}

// ============================================================
// APP INITIALIZATION
// ============================================================
function initApp() {
    const savedLang = localStorage.getItem('kaizen_lang') || 'en';
    switchLanguage(savedLang);
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); const page = link.dataset.page; if (page) navigateTo(page); });
    });
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
    renderPage('dashboard');
}

document.addEventListener('DOMContentLoaded', initApp);
