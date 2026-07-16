/**
 * supabase.js - Supabase Client Configuration & Database API
 * Kaizen Inventory Management System
 */

const SUPABASE_URL = 'https://jiglufmniplwwrhwxkty.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZ2x1Zm1uaXBsd3dyaHd4a3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODU5NzUsImV4cCI6MjA5OTE2MTk3NX0.81dhc42MB2KAnKj3xDGgSjDtnML3VqW8iDewsxZNMrw';

function getSupabase() {
    if (window.supabaseClient) return window.supabaseClient;
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return window.supabaseClient;
    }
    return null;
}

async function initializeDatabase() {
    try {
        const client = getSupabase();
        if (!client) return true;
        await ensureTablesExist();
        return true;
    } catch (err) {
        return true;
    }
}

async function ensureTablesExist() {
    const client = getSupabase();
    if (!client) return;
    const tables = ['products', 'inventory_in', 'inventory_out', 'inventory_returns'];
    for (const table of tables) {
        try {
            await client.from(table).select('id', { count: 'exact', head: true });
        } catch (err) {
            // silent
        }
    }
}

window.initializeDatabase = initializeDatabase;

var KaizenImages = window.KaizenImages = {
    getMap() {
        try {
            return JSON.parse(localStorage.getItem('kaizen_product_images') || '{}');
        } catch (e) {
            return {};
        }
    },
    get(productName) {
        if (!productName) return '';
        return this.getMap()[productName] || '';
    },
    set(productName, imageUrl) {
        if (!productName) return;
        const map = this.getMap();
        if (!imageUrl) {
            delete map[productName];
        } else {
            map[productName] = imageUrl;
        }
        try {
            localStorage.setItem('kaizen_product_images', JSON.stringify(map));
        } catch (e) {}
    },
    rename(oldName, newName) {
        if (!oldName || !newName || oldName === newName) return;
        const map = this.getMap();
        if (map[oldName]) {
            map[newName] = map[oldName];
            delete map[oldName];
            try {
                localStorage.setItem('kaizen_product_images', JSON.stringify(map));
            } catch (e) {}
        }
    }
};

var KaizenCodes = window.KaizenCodes = {
    getMap() {
        try {
            return JSON.parse(localStorage.getItem('kaizen_product_codes') || '{}');
        } catch (e) {
            return {};
        }
    },
    get(productName) {
        if (!productName) return '';
        return this.getMap()[productName] || '';
    },
    set(productName, code) {
        if (!productName) return;
        const map = this.getMap();
        if (!code) {
            delete map[productName];
        } else {
            map[productName] = code;
        }
        try {
            localStorage.setItem('kaizen_product_codes', JSON.stringify(map));
        } catch (e) {}
    },
    rename(oldName, newName) {
        if (!oldName || !newName || oldName === newName) return;
        const map = this.getMap();
        if (map[oldName]) {
            map[newName] = map[oldName];
            delete map[oldName];
            try {
                localStorage.setItem('kaizen_product_codes', JSON.stringify(map));
            } catch (e) {}
        }
    }
};

// ============================================================
// PRODUCTS API
// ============================================================

var ProductsAPI = window.ProductsAPI = {
    async getAll() {
        try {
            const client = getSupabase();
            if (!client) return [];
            const { data, error } = await client.from('products').select('*').order('name', { ascending: true });
            if (error) return [];
            return (data || []).map(p => ({
                ...p,
                image_url: p.image_url || (window.KaizenImages ? window.KaizenImages.get(p.name) : ''),
                product_code: p.product_code || (window.KaizenCodes ? window.KaizenCodes.get(p.name) : '')
            }));
        } catch (e) {
            return [];
        }
    },

    async getByName(name) {
        try {
            const client = getSupabase();
            if (!client) return null;
            const { data, error } = await client.from('products').select('*').eq('name', name).maybeSingle();
            if (error) return null;
            if (data) {
                data.image_url = data.image_url || (window.KaizenImages ? window.KaizenImages.get(data.name) : '');
                data.product_code = data.product_code || (window.KaizenCodes ? window.KaizenCodes.get(data.name) : '');
            }
            return data;
        } catch (e) {
            return null;
        }
    },

    async upsert(productData) {
        try {
            const client = getSupabase();
            if (!client) return productData;
            if (productData.id) {
                const { data, error } = await client.from('products').update(productData).eq('id', productData.id).select();
                if (!error && data && data.length > 0) return data[0];
            }
            if (productData.name) {
                const existing = await this.getByName(productData.name);
                if (existing && existing.id) {
                    const { data, error } = await client.from('products').update(productData).eq('id', existing.id).select();
                    if (!error && data && data.length > 0) return data[0];
                }
            }
            const { data, error } = await client.from('products').insert(productData).select();
            if (error && productData.name) {
                const { data: d2 } = await client.from('products').update(productData).eq('name', productData.name).select();
                return d2?.[0] || productData;
            }
            return data?.[0] || productData;
        } catch (e) {
            return productData;
        }
    },

    async updateQuantity(name, quantityDelta, unitPrice = null, supplierName = '', productCode = '') {
        try {
            if (productCode && window.KaizenCodes) {
                window.KaizenCodes.set(name, productCode);
            }
            const client = getSupabase();
            if (!client) return { name, quantity: quantityDelta, unit_price: unitPrice || 0 };
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
                if (productCode) updateData.product_code = productCode;

                let { data, error } = await client.from('products').update(updateData).eq('id', existing.id).select();
                if (error) {
                    delete updateData.updated_at;
                    ({ data, error } = await client.from('products').update(updateData).eq('id', existing.id).select());
                }
                if (error || !data || data.length === 0) {
                    const simpleUpdate = { quantity: Math.max(0, newQuantity) };
                    const { data: d2 } = await client.from('products').update(simpleUpdate).eq('name', name).select();
                    return d2?.[0] || { ...existing, ...updateData };
                }
                return data?.[0] || { ...existing, ...updateData };
            } else {
                const qty = Math.max(0, parseFloat(quantityDelta || 0));
                const price = (unitPrice !== null && !isNaN(unitPrice)) ? unitPrice : 0;
                
                // Step 1: try full insert
                let res = await client.from('products').insert({
                    name: name,
                    quantity: qty,
                    unit_price: price,
                    supplier_name: supplierName || '',
                    product_code: productCode || '',
                    updated_at: new Date().toISOString()
                }).select();
                
                // Step 2: without updated_at
                if (res.error) {
                    res = await client.from('products').insert({
                        name: name,
                        quantity: qty,
                        unit_price: price,
                        supplier_name: supplierName || ''
                    }).select();
                }
                
                // Step 3: without supplier_name
                if (res.error) {
                    res = await client.from('products').insert({
                        name: name,
                        quantity: qty,
                        unit_price: price
                    }).select();
                }
                
                // Step 4: minimal { name, quantity }
                if (res.error) {
                    res = await client.from('products').insert({
                        name: name,
                        quantity: qty
                    }).select();
                }
                return res.data?.[0] || { name, quantity: qty };
            }
        } catch (e) {
            return { name, quantity: quantityDelta, unit_price: unitPrice || 0 };
        }
    },

    async setQuantity(name, newQuantity) {
        try {
            const client = getSupabase();
            if (!client) return { name, quantity: newQuantity };
            const existing = await this.getByName(name);
            if (existing && existing.id) {
                const updateData = {
                    quantity: Math.max(0, parseFloat(newQuantity || 0)),
                    updated_at: new Date().toISOString()
                };
                const { data, error } = await client.from('products').update(updateData).eq('id', existing.id).select();
                if (error || !data || data.length === 0) {
                    const { data: d2 } = await client.from('products').update(updateData).eq('name', name).select();
                    return d2?.[0] || { ...existing, ...updateData };
                }
                return data?.[0] || { ...existing, ...updateData };
            } else {
                return await this.upsert({
                    name: name,
                    quantity: Math.max(0, parseFloat(newQuantity || 0)),
                    updated_at: new Date().toISOString()
                });
            }
        } catch (e) {
            return { name, quantity: newQuantity };
        }
    },

    async updateProduct(oldName, id, newData) {
        try {
            if (newData.image_url !== undefined && window.KaizenImages) {
                if (newData.name && oldName && newData.name !== oldName) {
                    window.KaizenImages.rename(oldName, newData.name);
                }
                window.KaizenImages.set(newData.name || oldName, newData.image_url);
            }
            if (newData.product_code !== undefined && window.KaizenCodes) {
                if (newData.name && oldName && newData.name !== oldName) {
                    window.KaizenCodes.rename(oldName, newData.name);
                }
                window.KaizenCodes.set(newData.name || oldName, newData.product_code);
            }

            const client = getSupabase();
            if (!client) return { name: oldName, ...newData };
            const updatePayload = {
                updated_at: new Date().toISOString()
            };
            if (newData.name !== undefined && newData.name.trim() !== '') updatePayload.name = newData.name.trim();
            if (newData.quantity !== undefined) updatePayload.quantity = Math.max(0, parseFloat(newData.quantity || 0));
            if (newData.unit_price !== undefined) updatePayload.unit_price = Math.max(0, parseFloat(newData.unit_price || 0));
            if (newData.supplier_name !== undefined) updatePayload.supplier_name = newData.supplier_name.trim();
            if (newData.image_url !== undefined) updatePayload.image_url = newData.image_url;
            if (newData.product_code !== undefined) updatePayload.product_code = newData.product_code.trim();

            let updatedProduct = null;
            if (id) {
                let { data, error } = await client.from('products').update(updatePayload).eq('id', id).select();
                if (error) {
                    if (updatePayload.image_url !== undefined || updatePayload.product_code !== undefined) {
                        if (error.code === 'PGRST204' || error.message?.includes('image_url') || error.message?.includes('product_code')) {
                            if (window.showToast) window.showToast('⚠️ تم الحفظ! (ملحوظة: يرجى إضافة عمود product_code أو image_url في السوبابيز إذا أردت ظهورهما على أجهزة أخرى)', 'info');
                        }
                        const cleanPayload = { ...updatePayload };
                        delete cleanPayload.image_url;
                        delete cleanPayload.product_code;
                        ({ data, error } = await client.from('products').update(cleanPayload).eq('id', id).select());
                    }
                }
                if (!error && data && data.length > 0) updatedProduct = data[0];
            }
            if (!updatedProduct && oldName) {
                let { data, error } = await client.from('products').update(updatePayload).eq('name', oldName).select();
                if (error) {
                    if (updatePayload.image_url !== undefined || updatePayload.product_code !== undefined) {
                        if (error.code === 'PGRST204' || error.message?.includes('image_url') || error.message?.includes('product_code')) {
                            if (window.showToast) window.showToast('⚠️ تم الحفظ! (ملحوظة: يرجى إضافة عمود product_code أو image_url في السوبابيز إذا أردت ظهورهما على أجهزة أخرى)', 'info');
                        }
                        const cleanPayload = { ...updatePayload };
                        delete cleanPayload.image_url;
                        delete cleanPayload.product_code;
                        ({ data, error } = await client.from('products').update(cleanPayload).eq('name', oldName).select());
                    }
                }
                if (!error && data && data.length > 0) updatedProduct = data[0];
            }

            if (updatePayload.name && oldName && updatePayload.name !== oldName) {
                try {
                    await client.from('inventory_in').update({ product_name: updatePayload.name }).eq('product_name', oldName);
                    await client.from('inventory_out').update({ product_name: updatePayload.name }).eq('product_name', oldName);
                } catch (e) {
                    // silent
                }
            }

            return updatedProduct || { name: oldName, ...updatePayload };
        } catch (e) {
            return { name: oldName, ...newData };
        }
    },

    async deleteProduct(name, id) {
        try {
            if (window.KaizenImages && name) {
                window.KaizenImages.set(name, '');
            }
            if (window.KaizenCodes && name) {
                window.KaizenCodes.set(name, '');
            }
            const client = getSupabase();
            if (!client) return true;
            if (id) {
                await client.from('products').delete().eq('id', id);
            }
            if (name) {
                await client.from('products').delete().eq('name', name);
            }
            return true;
        } catch (e) {
            return true;
        }
    }
};

// ============================================================
// INVENTORY IN API
// ============================================================

var InventoryInAPI = window.InventoryInAPI = {
    async add(record) {
        try {
            const client = getSupabase();
            if (!client) return record;
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
            let res = await client.from('inventory_in').insert(payload).select();
            if (res.error) {
                res = await client.from('inventory_in').insert({
                    product_name: payload.product_name,
                    quantity: payload.quantity,
                    unit_price: payload.unit_price,
                    total_price: payload.total_price,
                    supplier_name: payload.supplier_name,
                    entry_date: payload.entry_date,
                    employee_name: payload.employee_name
                }).select();
            }
            if (res.error) {
                res = await client.from('inventory_in').insert({
                    product_name: payload.product_name,
                    quantity: payload.quantity,
                    unit_price: payload.unit_price,
                    total_price: payload.total_price,
                    entry_date: payload.entry_date,
                    employee_name: payload.employee_name
                }).select();
            }
            if (res.error) {
                res = await client.from('inventory_in').insert({
                    product_name: payload.product_name,
                    quantity: payload.quantity,
                    unit_price: payload.unit_price,
                    total_price: payload.total_price
                }).select();
            }
            if (res.error) {
                res = await client.from('inventory_in').insert({
                    product_name: payload.product_name,
                    quantity: payload.quantity
                }).select();
            }
            return res.data?.[0] || payload;
        } catch (e) {
            return record;
        }
    },

    async getAll() {
        try {
            const client = getSupabase();
            if (!client) return [];
            const { data, error } = await client.from('inventory_in').select('*').order('created_at', { ascending: false });
            if (error) return [];
            return data || [];
        } catch (e) {
            return [];
        }
    },

    async getById(id) {
        try {
            const client = getSupabase();
            if (!client) return null;
            const { data, error } = await client.from('inventory_in').select('*').eq('id', id).maybeSingle();
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
            const client = getSupabase();
            if (!client) return record;
            const payload = {
                product_name: record.product_name || '',
                quantity: parseFloat(record.quantity || 0),
                total_selling_price: parseFloat(record.total_selling_price || 0),
                customer_name: record.customer_name || '',
                date: record.date || new Date().toISOString().split('T')[0],
                employee_name: record.employee_name || '',
                notes: record.notes || ''
            };
            let res = await client.from('inventory_out').insert(payload).select();
            if (res.error) {
                res = await client.from('inventory_out').insert({
                    product_name: payload.product_name,
                    quantity: payload.quantity,
                    total_selling_price: payload.total_selling_price,
                    customer_name: payload.customer_name,
                    date: payload.date,
                    employee_name: payload.employee_name
                }).select();
            }
            if (res.error) {
                res = await client.from('inventory_out').insert({
                    product_name: payload.product_name,
                    quantity: payload.quantity,
                    total_selling_price: payload.total_selling_price,
                    date: payload.date,
                    employee_name: payload.employee_name
                }).select();
            }
            if (res.error) {
                res = await client.from('inventory_out').insert({
                    product_name: payload.product_name,
                    quantity: payload.quantity,
                    total_selling_price: payload.total_selling_price
                }).select();
            }
            if (res.error) {
                res = await client.from('inventory_out').insert({
                    product_name: payload.product_name,
                    quantity: payload.quantity
                }).select();
            }
            return res.data?.[0] || payload;
        } catch (e) {
            return record;
        }
    },

    async getAll() {
        try {
            const client = getSupabase();
            if (!client) return [];
            const { data, error } = await client.from('inventory_out').select('*').order('created_at', { ascending: false });
            if (error) return [];
            return data || [];
        } catch (e) {
            return [];
        }
    },

    async getById(id) {
        try {
            const client = getSupabase();
            if (!client) return null;
            const { data, error } = await client.from('inventory_out').select('*').eq('id', id).maybeSingle();
            if (error) return null;
            return data;
        } catch (e) {
            return null;
        }
    }
};

// ============================================================
// INVENTORY RETURNS API
// ============================================================

var InventoryReturnsAPI = window.InventoryReturnsAPI = {
    async add(record) {
        try {
            const client = getSupabase();
            if (!client) return record;
            const payload = {
                out_id: record.out_id || '',
                product_name: record.product_name || '',
                quantity: parseFloat(record.quantity || 0),
                return_type: record.return_type || 'all',
                customer_name: record.customer_name || '',
                date: record.date || new Date().toISOString().split('T')[0],
                employee_name: record.employee_name || '',
                notes: record.notes || ''
            };
            let res = await client.from('inventory_returns').insert(payload).select();
            if (res.error) {
                // If table doesn't exist or fails, save cleanly into inventory_in with return marker
                const unitP = parseFloat(record.unit_price || (record.total_selling_price / record.original_quantity) || 0);
                const totalP = parseFloat(unitP * payload.quantity) || 0;
                return await window.InventoryInAPI.add({
                    product_name: payload.product_name,
                    quantity: payload.quantity,
                    unit_price: unitP,
                    total_price: totalP,
                    supplier_name: '🔁 مرتجع من العميل: ' + (payload.customer_name || 'عميل'),
                    entry_date: payload.date,
                    employee_name: payload.employee_name,
                    notes: '[RETURN] ' + (payload.return_type === 'all' ? 'ارتجاع كلي' : 'ارتجاع جزئي') + ' من عملية صادر رقم (' + (payload.out_id || 'سابق') + ')' + (payload.notes ? ' - ' + payload.notes : '')
                });
            }
            return res.data?.[0] || payload;
        } catch (e) {
            return record;
        }
    },

    async getAll() {
        try {
            const client = getSupabase();
            if (!client) return [];
            const { data, error } = await client.from('inventory_returns').select('*').order('created_at', { ascending: false });
            if (error) return [];
            return data || [];
        } catch (e) {
            return [];
        }
    },

    async getById(id) {
        try {
            const client = getSupabase();
            if (!client) return null;
            const { data, error } = await client.from('inventory_returns').select('*').eq('id', id).maybeSingle();
            if (error) return null;
            return data;
        } catch (e) {
            return null;
        }
    }
};

// Initialize if client already loaded
if (getSupabase()) {
    initializeDatabase();
}
