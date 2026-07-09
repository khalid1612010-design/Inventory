/**
 * supabase.js - Supabase Client Configuration & Database API
 * Kaizen Inventory Management System
 */

const SUPABASE_URL = 'https://jiglufmniplwwrhwxkty.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZ2x1Zm1uaXBsd3dyaHd4a3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODU5NzUsImV4cCI6MjA5OTE2MTk3NX0.81dhc42MB2KAnKj3xDGgSjDtnML3VqW8iDewsxZNMrw';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// DATABASE INITIALIZATION
// ============================================================

async function initializeDatabase() {
    try {
        await ensureTablesExist();
        console.log('%c📦 Kaizen Inventory System %c- Supabase connected',
            'font-weight:bold;color:#1e3a8a;', 'color:#64748b;');
        return true;
    } catch (err) {
        console.warn('Database initialization note:', err.message);
        return true;
    }
}

async function ensureTablesExist() {
    const tables = ['products', 'inventory_in', 'inventory_out'];
    const results = [];
    for (const table of tables) {
        try {
            const { error } = await supabase.from(table).select('id', { count: 'exact', head: true });
            results.push({ table, exists: !error, error: error?.message || null });
        } catch (err) {
            results.push({ table, exists: false, error: err.message });
        }
    }
    const missing = results.filter(r => !r.exists);
    if (missing.length > 0) {
        console.warn('⚠ Missing tables:', missing.map(m => m.table).join(', '));
        console.warn('📋 Run init.sql in Supabase SQL Editor');
    } else {
        console.log('✅ All tables accessible.');
    }
    return results;
}

// ============================================================
// PRODUCTS API
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
            return await this.upsert({
                name,
                quantity: Math.max(0, parseFloat(quantityDelta)),
                unit_price: unitPrice || 0,
                updated_at: new Date().toISOString()
            });
        }
    }
};

// ============================================================
// INVENTORY IN API
// ============================================================

const InventoryInAPI = {
    async add(record) {
        const { data, error } = await supabase.from('inventory_in').insert({
            product_name: record.product_name,
            quantity: record.quantity,
            unit_price: record.unit_price,
            total_price: record.total_price,
            supplier_name: record.supplier_name || '',
            entry_date: record.entry_date,
            employee_name: record.employee_name || '',
            notes: record.notes || ''
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
// INVENTORY OUT API
// ============================================================

const InventoryOutAPI = {
    async add(record) {
        const { data, error } = await supabase.from('inventory_out').insert({
            product_name: record.product_name,
            quantity: record.quantity,
            total_selling_price: record.total_selling_price,
            customer_name: record.customer_name || '',
            date: record.date,
            employee_name: record.employee_name || '',
            notes: record.notes || ''
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

// Initialize on load
initializeDatabase();
