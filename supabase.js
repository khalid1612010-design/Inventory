/**
 * supabase.js - Supabase Client Configuration & Database API
 * Kaizen Inventory Management System
 */

const SUPABASE_URL = 'https://jiglufmniplwwrhwxkty.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZ2x1Zm1uaXBsd3dyaHd4a3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODU5NzUsImV4cCI6MjA5OTE2MTk3NX0.81dhc42MB2KAnKj3xDGgSjDtnML3VqW8iDewsxZNMrw';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabase;

async function initializeDatabase() {
    try {
        await ensureTablesExist();
        return true;
    } catch (err) {
        return true;
    }
}

async function ensureTablesExist() {
    const tables = ['products', 'inventory_in', 'inventory_out'];
    for (const table of tables) {
        try {
            await supabase.from(table).select('id', { count: 'exact', head: true });
        } catch (err) {
            // silent
        }
    }
}

window.initializeDatabase = initializeDatabase;

// ============================================================
// PRODUCTS API
// ============================================================

var ProductsAPI = window.ProductsAPI = {
    async getAll() {
        try {
            const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
            if (error) return [];
            return data || [];
        } catch (e) {
            return [];
        }
    },

    async getByName(name) {
        try {
            const { data, error } = await supabase.from('products').select('*').eq('name', name).maybeSingle();
            if (error) return null;
            return data;
        } catch (e) {
            return null;
        }
    },

    async upsert(productData) {
        try {
            if (productData.id) {
                const { data, error } = await supabase.from('products').update(productData).eq('id', productData.id).select();
                if (!error && data && data.length > 0) return data[0];
            }
            if (productData.name) {
                const existing = await this.getByName(productData.name);
                if (existing && existing.id) {
                    const { data, error } = await supabase.from('products').update(productData).eq('id', existing.id).select();
                    if (!error && data && data.length > 0) return data[0];
                }
            }
            const { data, error } = await supabase.from('products').insert(productData).select();
            if (error && productData.name) {
                const { data: d2 } = await supabase.from('products').update(productData).eq('name', productData.name).select();
                return d2?.[0] || productData;
            }
            return data?.[0] || productData;
        } catch (e) {
            return productData;
        }
    },

    async updateQuantity(name, quantityDelta, unitPrice = null, supplierName = '') {
        try {
            const existing = await this.getByName(name);
            if (existing && existing.id) {
                const newQuantity = parseFloat(existing.quantity || 0) + parseFloat(quantityDelta || 0);
                const updateData = {
                    name: name,
                    quantity: Math.max(0, newQuantity),
                    updated_at: new Date().toISOString()
                };
                if (unitPrice !== null && !isNaN(unitPrice) && unitPrice > 0) updateData.unit_price = unitPrice;
                if (supplierName) updateData.supplier_name = supplierName;

                const { data, error } = await supabase.from('products')
                    .update(updateData)
                    .eq('id', existing.id)
                    .select();
                if (error || !data || data.length === 0) {
                    const { data: d2 } = await supabase.from('products').update(updateData).eq('name', name).select();
                    return d2?.[0] || { ...existing, ...updateData };
                }
                return data?.[0] || { ...existing, ...updateData };
            } else {
                const insertData = {
                    name: name,
                    quantity: Math.max(0, parseFloat(quantityDelta || 0)),
                    unit_price: (unitPrice !== null && !isNaN(unitPrice)) ? unitPrice : 0,
                    supplier_name: supplierName || '',
                    updated_at: new Date().toISOString()
                };
                const { data, error } = await supabase.from('products').insert(insertData).select();
                if (error) {
                    const { data: d2 } = await supabase.from('products').update({
                        quantity: Math.max(0, parseFloat(quantityDelta || 0)),
                        unit_price: (unitPrice !== null && !isNaN(unitPrice)) ? unitPrice : 0,
                        ...(supplierName ? { supplier_name: supplierName } : {}),
                        updated_at: new Date().toISOString()
                    }).eq('name', name).select();
                    return d2?.[0] || insertData;
                }
                return data?.[0] || insertData;
            }
        } catch (e) {
            return { name, quantity: quantityDelta, unit_price: unitPrice || 0 };
        }
    }
};

// ============================================================
// INVENTORY IN API
// ============================================================

var InventoryInAPI = window.InventoryInAPI = {
    async add(record) {
        try {
            const payload = {
                product_name: record.product_name || '',
                quantity: parseFloat(record.quantity || 0),
                unit_price: parseFloat(record.unit_price || 0),
                total_price: parseFloat(record.total_price || (record.quantity * record.unit_price) || 0),
                supplier_name: record.supplier_name || '',
                entry_date: record.entry_date || new Date().toISOString().split('T')[0],
                employee_name: record.employee_name || '',
                notes: record.notes || ''
            };
            const { data, error } = await supabase.from('inventory_in').insert(payload).select();
            if (error) {
                const minimalPayload = {
                    product_name: payload.product_name,
                    quantity: payload.quantity,
                    unit_price: payload.unit_price,
                    total_price: payload.total_price
                };
                if (payload.supplier_name) minimalPayload.supplier_name = payload.supplier_name;
                if (payload.entry_date) minimalPayload.entry_date = payload.entry_date;
                if (payload.employee_name) minimalPayload.employee_name = payload.employee_name;
                if (payload.notes) minimalPayload.notes = payload.notes;

                const { data: d2, error: e2 } = await supabase.from('inventory_in').insert(minimalPayload).select();
                if (e2) {
                    delete minimalPayload.entry_date;
                    const { data: d3 } = await supabase.from('inventory_in').insert(minimalPayload).select();
                    return d3?.[0] || payload;
                }
                return d2?.[0] || payload;
            }
            return data?.[0] || payload;
        } catch (e) {
            return record;
        }
    },

    async getAll() {
        try {
            const { data, error } = await supabase.from('inventory_in').select('*').order('created_at', { ascending: false });
            if (error) return [];
            return data || [];
        } catch (e) {
            return [];
        }
    },

    async getById(id) {
        try {
            const { data, error } = await supabase.from('inventory_in').select('*').eq('id', id).maybeSingle();
            if (error) return null;
            return data;
        } catch (e) {
            return null;
        }
    }
};

// ============================================================
// INVENTORY OUT API
// ============================================================

var InventoryOutAPI = window.InventoryOutAPI = {
    async add(record) {
        try {
            const payload = {
                product_name: record.product_name || '',
                quantity: parseFloat(record.quantity || 0),
                total_selling_price: parseFloat(record.total_selling_price || 0),
                customer_name: record.customer_name || '',
                date: record.date || new Date().toISOString().split('T')[0],
                employee_name: record.employee_name || '',
                notes: record.notes || ''
            };
            const { data, error } = await supabase.from('inventory_out').insert(payload).select();
            if (error) {
                const minimalPayload = {
                    product_name: payload.product_name,
                    quantity: payload.quantity,
                    total_selling_price: payload.total_selling_price
                };
                if (payload.customer_name) minimalPayload.customer_name = payload.customer_name;
                if (payload.date) minimalPayload.date = payload.date;
                if (payload.employee_name) minimalPayload.employee_name = payload.employee_name;
                if (payload.notes) minimalPayload.notes = payload.notes;

                const { data: d2, error: e2 } = await supabase.from('inventory_out').insert(minimalPayload).select();
                if (e2) {
                    delete minimalPayload.date;
                    const { data: d3 } = await supabase.from('inventory_out').insert(minimalPayload).select();
                    return d3?.[0] || payload;
                }
                return d2?.[0] || payload;
            }
            return data?.[0] || payload;
        } catch (e) {
            return record;
        }
    },

    async getAll() {
        try {
            const { data, error } = await supabase.from('inventory_out').select('*').order('created_at', { ascending: false });
            if (error) return [];
            return data || [];
        } catch (e) {
            return [];
        }
    },

    async getById(id) {
        try {
            const { data, error } = await supabase.from('inventory_out').select('*').eq('id', id).maybeSingle();
            if (error) return null;
            return data;
        } catch (e) {
            return null;
        }
    }
};

window.initializeDatabase = initializeDatabase;
initializeDatabase();
