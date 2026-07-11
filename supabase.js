/**
 * supabase.js - Supabase Client Configuration & Database API
 * Kaizen Inventory Management System
 */

const SUPABASE_URL = 'https://jiglufmniplwwrhwxkty.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZ2x1Zm1uaXBsd3dyaHd4a3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODU5NzUsImV4cCI6MjA5OTE2MTk3NX0.81dhc42MB2KAnKj3xDGgSjDtnML3VqW8iDewsxZNMrw';

// Lazy client - created on first use to avoid CDN timing issues.
// This guarantees the API objects below are always defined even if the
// Supabase library hasn't finished loading yet.
let _sbClient = null;

function getSupabase() {
    if (!_sbClient) {
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            throw new Error('Supabase library not ready. Please refresh the page.');
        }
        _sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return _sbClient;
}

// ============================================================
// PRODUCTS API
// ============================================================

const ProductsAPI = {
    async getAll() {
        const { data, error } = await getSupabase().from('products').select('*').order('name', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async getByName(name) {
        const { data, error } = await getSupabase().from('products').select('*').eq('name', name).maybeSingle();
        if (error) throw error;
        return data;
    },

    async upsert(productData) {
        const { data, error } = await getSupabase().from('products').upsert(productData, { onConflict: 'name' }).select();
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
        const { data, error } = await getSupabase().from('inventory_in').insert({
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
        const { data, error } = await getSupabase().from('inventory_in').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async getById(id) {
        const { data, error } = await getSupabase().from('inventory_in').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data;
    }
};

// ============================================================
// INVENTORY OUT API
// ============================================================

const InventoryOutAPI = {
    async add(record) {
        const { data, error } = await getSupabase().from('inventory_out').insert({
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
        const { data, error } = await getSupabase().from('inventory_out').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async getById(id) {
        const { data, error } = await getSupabase().from('inventory_out').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data;
    }
};
