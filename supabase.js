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
        const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
        if (error) {
            console.warn('ProductsAPI.getAll error:', error.message);
            return [];
        }
        return data || [];
    },

    async getByName(name) {
        const { data, error } = await supabase.from('products').select('*').eq('name', name).maybeSingle();
        if (error) {
            console.warn('ProductsAPI.getByName error:', error.message);
            return null;
        }
        return data;
    },

    async upsert(productData) {
        if (productData.id) {
            const { data, error } = await supabase.from('products').update(productData).eq('id', productData.id).select();
            if (error) throw error;
            if (data && data.length > 0) return data[0];
        }
        if (productData.name) {
            const existing = await this.getByName(productData.name);
            if (existing && existing.id) {
                const { data, error } = await supabase.from('products').update(productData).eq('id', existing.id).select();
                if (error) throw error;
                if (data && data.length > 0) return data[0];
            }
        }
        const { data, error } = await supabase.from('products').insert(productData).select();
        if (error) {
            // Try update in case it's a conflict
            if (productData.name) {
                const { data: d2, error: e2 } = await supabase.from('products').update(productData).eq('name', productData.name).select();
                if (!e2 && d2 && d2.length > 0) return d2[0];
            }
            throw error;
        }
        if (data && data.length > 0) return data[0];
        throw new Error('Insert returned no rows');
    },

    async updateQuantity(name, quantityDelta, unitPrice = null, supplierName = '') {
        const existing = await this.getByName(name);
        if (existing && existing.id) {
            const newQuantity = parseFloat(existing.quantity || 0) + parseFloat(quantityDelta || 0);
            const updateData = {
                name: name,
                quantity: Math.max(0, newQuantity),
                updated_at: new Date().toISOString()
            };
            if (unitPrice !== null && !isNaN(unitPrice) && unitPrice > 0) updateData.unit_price = unitPrice;
            if (supplierName && supplierName.trim() !== '') updateData.supplier_name = supplierName;

            const { data, error } = await supabase.from('products')
                .update(updateData)
                .eq('id', existing.id)
                .select();
            if (error) throw error;
            if (data && data.length > 0) return data[0];

            // Fallback: update by name
            const { data: d2, error: e2 } = await supabase.from('products').update(updateData).eq('name', name).select();
            if (e2) throw e2;
            return d2?.[0] || updateData;
        } else {
            const insertData = {
                name: name,
                quantity: Math.max(0, parseFloat(quantityDelta || 0)),
                unit_price: (unitPrice !== null && !isNaN(unitPrice)) ? unitPrice : 0,
                supplier_name: supplierName || ''
            };
            const { data, error } = await supabase.from('products').insert(insertData).select();
            if (error) throw error;
            if (data && data.length > 0) return data[0];
            throw new Error('Insert failed');
        }
    },

    async setQuantity(name, newQuantity) {
        const existing = await this.getByName(name);
        if (existing && existing.id) {
            const updateData = {
                quantity: Math.max(0, parseFloat(newQuantity || 0)),
                updated_at: new Date().toISOString()
            };
            const { data, error } = await supabase.from('products').update(updateData).eq('id', existing.id).select();
            if (error) throw error;
            if (data && data.length > 0) return data[0];
            const { data: d2, error: e2 } = await supabase.from('products').update(updateData).eq('name', name).select();
            if (e2) throw e2;
            return d2?.[0] || updateData;
        } else {
            return await this.upsert({
                name: name,
                quantity: Math.max(0, parseFloat(newQuantity || 0)),
                updated_at: new Date().toISOString()
            });
        }
    },

    async updateProduct(oldName, id, newData) {
        const updatePayload = { updated_at: new Date().toISOString() };
        if (newData.name !== undefined && newData.name.trim() !== '') updatePayload.name = newData.name.trim();
        if (newData.quantity !== undefined) updatePayload.quantity = Math.max(0, parseFloat(newData.quantity || 0));
        if (newData.unit_price !== undefined) updatePayload.unit_price = Math.max(0, parseFloat(newData.unit_price || 0));
        if (newData.supplier_name !== undefined) updatePayload.supplier_name = newData.supplier_name.trim();
        if (newData.sku !== undefined) updatePayload.sku = newData.sku.trim() || null;
        if (newData.image_url !== undefined) {
            if (newData.image_url === '' || newData.image_url === null) {
                updatePayload.image_url = null;
            } else {
                updatePayload.image_url = newData.image_url;
            }
        }
        // Columns (sku, image_url) may not exist; caller retries without them on failure.

        let updatedProduct = null;
        if (id) {
            const { data, error } = await supabase.from('products').update(updatePayload).eq('id', id).select();
            if (error) throw error;
            if (data && data.length > 0) updatedProduct = data[0];
        }
        if (!updatedProduct && oldName) {
            const { data, error } = await supabase.from('products').update(updatePayload).eq('name', oldName).select();
            if (error) throw error;
            if (data && data.length > 0) updatedProduct = data[0];
        }
        if (!updatedProduct) throw new Error('Product not found for update');

        if (updatePayload.name && oldName && updatePayload.name !== oldName) {
            try {
                await supabase.from('inventory_in').update({ product_name: updatePayload.name }).eq('product_name', oldName);
                await supabase.from('inventory_out').update({ product_name: updatePayload.name }).eq('product_name', oldName);
            } catch (e) {
                // silent - records still exist with old name but product is updated
            }
        }
        return updatedProduct;
    },

    async deleteProduct(name, id) {
        if (id) {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
        } else if (name) {
            const { error } = await supabase.from('products').delete().eq('name', name);
            if (error) throw error;
        }
        return true;
    }
};

// ============================================================
// INVENTORY IN API
// ============================================================

var InventoryInAPI = window.InventoryInAPI = {
    async add(record) {
        // Minimal payload always
        const payload = {
            product_name: record.product_name || '',
            quantity: parseFloat(record.quantity || 0),
            unit_price: parseFloat(record.unit_price || 0),
            total_price: parseFloat(record.total_price || 0)
        };
        if (record.supplier_name) payload.supplier_name = record.supplier_name;
        if (record.entry_date) payload.entry_date = record.entry_date;
        if (record.employee_name) payload.employee_name = record.employee_name;
        if (record.notes) payload.notes = record.notes;

        // Try with all provided fields first
        const { data, error } = await supabase.from('inventory_in').insert(payload).select();
        if (!error && data && data.length > 0) return data[0];
        if (error) {
            // Try minimal (only required fields)
            const minimal = {
                product_name: payload.product_name,
                quantity: payload.quantity,
                unit_price: payload.unit_price,
                total_price: payload.total_price
            };
            const { data: d2, error: e2 } = await supabase.from('inventory_in').insert(minimal).select();
            if (!e2 && d2 && d2.length > 0) return d2[0];
            throw error;
        }
        throw new Error('Insert returned no rows');
    },

    async getAll() {
        const { data, error } = await supabase.from('inventory_in').select('*').order('created_at', { ascending: false });
        if (error) { console.warn('InventoryInAPI.getAll error:', error.message); return []; }
        return data || [];
    },

    async getById(id) {
        const { data, error } = await supabase.from('inventory_in').select('*').eq('id', id).maybeSingle();
        if (error) { console.warn('InventoryInAPI.getById error:', error.message); return null; }
        return data;
    }
};

// ============================================================
// INVENTORY OUT API
// ============================================================

var InventoryOutAPI = window.InventoryOutAPI = {
    async add(record) {
        const payload = {
            product_name: record.product_name || '',
            quantity: parseFloat(record.quantity || 0),
            total_selling_price: parseFloat(record.total_selling_price || 0)
        };
        if (record.customer_name) payload.customer_name = record.customer_name;
        if (record.date) payload.date = record.date;
        if (record.employee_name) payload.employee_name = record.employee_name;
        if (record.notes) payload.notes = record.notes;

        const { data, error } = await supabase.from('inventory_out').insert(payload).select();
        if (!error && data && data.length > 0) return data[0];
        if (error) {
            const minimal = {
                product_name: payload.product_name,
                quantity: payload.quantity,
                total_selling_price: payload.total_selling_price
            };
            const { data: d2, error: e2 } = await supabase.from('inventory_out').insert(minimal).select();
            if (!e2 && d2 && d2.length > 0) return d2[0];
            throw error;
        }
        throw new Error('Insert returned no rows');
    },

    async getAll() {
        const { data, error } = await supabase.from('inventory_out').select('*').order('created_at', { ascending: false });
        if (error) { console.warn('InventoryOutAPI.getAll error:', error.message); return []; }
        return data || [];
    },

    async getById(id) {
        const { data, error } = await supabase.from('inventory_out').select('*').eq('id', id).maybeSingle();
        if (error) { console.warn('InventoryOutAPI.getById error:', error.message); return null; }
        return data;
    }
};

window.initializeDatabase = initializeDatabase;
initializeDatabase();
