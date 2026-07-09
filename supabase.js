/**
 * supabase.js - Supabase Client Configuration
 * Kaizen Inventory Management System
 * 
 * Initializes the Supabase client using the project URL and anon key.
 * No authentication required - uses anonymous access.
 */

const SUPABASE_URL = 'https://jiglufmniplwwrhwxkty.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZ2x1Zm1uaXBsd3dyaHd4a3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODU5NzUsImV4cCI6MjA5OTE2MTk3NX0.81dhc42MB2KAnKj3xDGgSjDtnML3VqW8iDewsxZNMrw';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// DATABASE TABLE INITIALIZATION
// ============================================================
// These functions create the required tables if they don't exist.
// In production, tables should be created via Supabase dashboard,
// but we attempt creation here for convenience.

async function initializeDatabase() {
    try {
        // Try to ensure tables exist
        await ensureTablesExist();
        
        // If tables don't exist, provide clear guidance
        console.log('%c📦 Kaizen Inventory System %c- Supabase connected',
            'font-weight:bold;color:#1e3a8a;', 'color:#64748b;');
        console.log('%c⚠ If you see table errors, run init.sql in Supabase SQL Editor',
            'color:#f59e0b;');
        console.log('%c🔗 https://jiglufmniplwwrhwxkty.supabase.co',
            'color:#3b82f6;');
        
        return true;
    } catch (err) {
        console.warn('Database initialization note:', err.message);
        console.log('%c📋 Please run init.sql in Supabase SQL Editor first.',
            'color:#f59e0b;font-weight:bold;');
        return true;
    }
}

/**
 * Ensures required tables exist by attempting a safe operation.
 * The tables should be pre-created in Supabase dashboard:
 * 
 * Table: products
 * - id: uuid (primary key, default gen_random_uuid())
 * - name: text (not null, unique)
 * - quantity: numeric (default 0)
 * - unit_price: numeric (default 0)
 * - supplier_name: text
 * - created_at: timestamptz (default now())
 * - updated_at: timestamptz (default now())
 * 
 * Table: inventory_in
 * - id: uuid (primary key, default gen_random_uuid())
 * - product_name: text (not null)
 * - quantity: numeric (not null)
 * - unit_price: numeric (not null)
 * - total_price: numeric (not null)
 * - supplier_name: text
 * - entry_date: date
 * - employee_name: text
 * - notes: text
 * - created_at: timestamptz (default now())
 * 
 * Table: inventory_out
 * - id: uuid (primary key, default gen_random_uuid())
 * - product_name: text (not null)
 * - quantity: numeric (not null)
 * - total_selling_price: numeric (not null)
 * - customer_name: text
 * - date: date
 * - employee_name: text
 * - notes: text
 * - created_at: timestamptz (default now())
 */
async function ensureTablesExist() {
    const tables = ['products', 'inventory_in', 'inventory_out'];
    const results = [];
    
    for (const table of tables) {
        try {
            const { error } = await supabase.from(table).select('id', { count: 'exact', head: true });
            if (error) {
                results.push({ table, exists: false, error: error.message });
            } else {
                results.push({ table, exists: true, error: null });
            }
        } catch (err) {
            results.push({ table, exists: false, error: err.message });
        }
    }
    
    const missing = results.filter(r => !r.exists);
    if (missing.length > 0) {
        console.warn('⚠ Missing tables:', missing.map(m => m.table).join(', '));
        console.warn('📋 Please run init.sql in the Supabase SQL Editor:');
        console.warn('🔗 https://jiglufmniplwwrhwxkty.supabase.co → SQL Editor');
    } else {
        console.log('✅ All required tables are accessible.');
    }
    
    return results;
}

// ============================================================
// PRODUCTS API
// ============================================================

const ProductsAPI = {
    /**
     * Get all products
     */
    async getAll() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        return data || [];
    },

    /**
     * Get a product by name
     */
    async getByName(name) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('name', name)
            .maybeSingle();
        
        if (error) throw error;
        return data;
    },

    /**
     * Upsert a product (create or update)
     */
    async upsert(productData) {
        const { data, error } = await supabase
            .from('products')
            .upsert(productData, { onConflict: 'name' })
            .select();
        
        if (error) throw error;
        return data?.[0] || null;
    },

    /**
     * Update product quantity
     */
    async updateQuantity(name, quantityDelta, unitPrice = null) {
        const existing = await this.getByName(name);
        
        if (existing) {
            const newQuantity = parseFloat(existing.quantity) + parseFloat(quantityDelta);
            const updateData = {
                name: name,
                quantity: Math.max(0, newQuantity),
                updated_at: new Date().toISOString()
            };
            if (unitPrice !== null) {
                updateData.unit_price = unitPrice;
            }
            return await this.upsert(updateData);
        } else {
            // Create new product
            return await this.upsert({
                name: name,
                quantity: Math.max(0, parseFloat(quantityDelta)),
                unit_price: unitPrice || 0,
                updated_at: new Date().toISOString()
            });
        }
    },

    /**
     * Get total count, quantity, and value
     */
    async getStats() {
        const products = await this.getAll();
        const totalProducts = products.length;
        const totalQuantity = products.reduce((sum, p) => sum + parseFloat(p.quantity || 0), 0);
        const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.quantity || 0) * parseFloat(p.unit_price || 0)), 0);
        
        return { totalProducts, totalQuantity, totalValue };
    }
};

// ============================================================
// INVENTORY IN API
// ============================================================

const InventoryInAPI = {
    /**
     * Add an inventory-in operation
     */
    async add(record) {
        const { data, error } = await supabase
            .from('inventory_in')
            .insert({
                product_name: record.product_name,
                quantity: record.quantity,
                unit_price: record.unit_price,
                total_price: record.total_price,
                supplier_name: record.supplier_name || '',
                entry_date: record.entry_date,
                employee_name: record.employee_name || '',
                notes: record.notes || ''
            })
            .select();
        
        if (error) throw error;
        return data?.[0] || null;
    },

    /**
     * Get all inventory-in records
     */
    async getAll() {
        const { data, error } = await supabase
            .from('inventory_in')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },

    /**
     * Get record by ID
     */
    async getById(id) {
        const { data, error } = await supabase
            .from('inventory_in')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        
        if (error) throw error;
        return data;
    },

    /**
     * Get total count of in operations
     */
    async getCount() {
        const { count, error } = await supabase
            .from('inventory_in')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        return count || 0;
    }
};

// ============================================================
// INVENTORY OUT API
// ============================================================

const InventoryOutAPI = {
    /**
     * Add an inventory-out operation
     */
    async add(record) {
        const { data, error } = await supabase
            .from('inventory_out')
            .insert({
                product_name: record.product_name,
                quantity: record.quantity,
                total_selling_price: record.total_selling_price,
                customer_name: record.customer_name || '',
                date: record.date,
                employee_name: record.employee_name || '',
                notes: record.notes || ''
            })
            .select();
        
        if (error) throw error;
        return data?.[0] || null;
    },

    /**
     * Get all inventory-out records
     */
    async getAll() {
        const { data, error } = await supabase
            .from('inventory_out')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },

    /**
     * Get record by ID
     */
    async getById(id) {
        const { data, error } = await supabase
            .from('inventory_out')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        
        if (error) throw error;
        return data;
    },

    /**
     * Get total count of out operations
     */
    async getCount() {
        const { count, error } = await supabase
            .from('inventory_out')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        return count || 0;
    }
};

// Initialize on load
initializeDatabase();
