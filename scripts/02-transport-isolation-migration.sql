-- ============================================
-- Transport Isolation Migration Script
-- ============================================
-- This migration establishes complete account isolation
-- so that each transport (company) is a completely separate entity
-- with its own data, settings, and LR number sequences.

-- ============================================
-- 1. ADD transport_id TO MASTER TABLES
-- ============================================

-- Add transport_id to consignors table
ALTER TABLE IF EXISTS consignors ADD COLUMN IF NOT EXISTS transport_id INTEGER REFERENCES transports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_consignors_transport_id ON consignors(transport_id);
COMMENT ON COLUMN consignors.transport_id IS 'Transport/Company this consignor belongs to. NULL = legacy data';

-- Add transport_id to consignees table
ALTER TABLE IF EXISTS consignees ADD COLUMN IF NOT EXISTS transport_id INTEGER REFERENCES transports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_consignees_transport_id ON consignees(transport_id);
COMMENT ON COLUMN consignees.transport_id IS 'Transport/Company this consignee belongs to. NULL = legacy data';

-- Add transport_id to drivers table
ALTER TABLE IF EXISTS drivers ADD COLUMN IF NOT EXISTS transport_id INTEGER REFERENCES transports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_drivers_transport_id ON drivers(transport_id);
COMMENT ON COLUMN drivers.transport_id IS 'Transport/Company this driver belongs to. NULL = legacy data';

-- Add transport_id to vehicles table
ALTER TABLE IF EXISTS vehicles ADD COLUMN IF NOT EXISTS transport_id INTEGER REFERENCES transports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_vehicles_transport_id ON vehicles(transport_id);
COMMENT ON COLUMN vehicles.transport_id IS 'Transport/Company this vehicle belongs to. NULL = legacy data';

-- Add transport_id to cities table (routes)
ALTER TABLE IF EXISTS cities ADD COLUMN IF NOT EXISTS transport_id INTEGER REFERENCES transports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cities_transport_id ON cities(transport_id);
COMMENT ON COLUMN cities.transport_id IS 'Transport/Company this city/route belongs to. NULL = shared data';

-- Add transport_id to freight_rates table
ALTER TABLE IF EXISTS freight_rates ADD COLUMN IF NOT EXISTS transport_id INTEGER REFERENCES transports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_freight_rates_transport_id ON freight_rates(transport_id);
COMMENT ON COLUMN freight_rates.transport_id IS 'Transport/Company this rate card belongs to. NULL = legacy data';

-- Add transport_id to routes table
ALTER TABLE IF EXISTS routes ADD COLUMN IF NOT EXISTS transport_id INTEGER REFERENCES transports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_routes_transport_id ON routes(transport_id);
COMMENT ON COLUMN routes.transport_id IS 'Transport/Company this route belongs to. NULL = legacy data';

-- Add transport_id to challans table (truck movements)
ALTER TABLE IF EXISTS challans ADD COLUMN IF NOT EXISTS transport_id INTEGER REFERENCES transports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_challans_transport_id ON challans(transport_id);
COMMENT ON COLUMN challans.transport_id IS 'Transport/Company this challan belongs to';

-- Add transport_id to invoices table
ALTER TABLE IF EXISTS invoices ADD COLUMN IF NOT EXISTS transport_id INTEGER REFERENCES transports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_invoices_transport_id ON invoices(transport_id);
COMMENT ON COLUMN invoices.transport_id IS 'Transport/Company this invoice belongs to';

-- Add transport_id to receipts table
ALTER TABLE IF EXISTS receipts ADD COLUMN IF NOT EXISTS transport_id INTEGER REFERENCES transports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_receipts_transport_id ON receipts(transport_id);
COMMENT ON COLUMN receipts.transport_id IS 'Transport/Company this receipt belongs to';

-- ============================================
-- 2. ADD transport_id TO LR_ENTRIES TABLE
-- ============================================
-- This enables per-transport LR numbering sequences

ALTER TABLE IF EXISTS lr_entries ADD COLUMN IF NOT EXISTS transport_id INTEGER REFERENCES transports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_lr_entries_transport_id ON lr_entries(transport_id);
COMMENT ON COLUMN lr_entries.transport_id IS 'Transport/Company this LR belongs to';

-- Create composite index for efficient querying by transport and status
CREATE INDEX IF NOT EXISTS idx_lr_entries_transport_status ON lr_entries(transport_id, status);

-- ============================================
-- 3. CREATE PER-TRANSPORT LR SEQUENCES
-- ============================================
-- Each transport will have its own sequence for LR numbering starting from 1

-- Create a table to track LR sequence counters per transport
CREATE TABLE IF NOT EXISTS transport_lr_sequences (
  id INTEGER PRIMARY KEY REFERENCES transports(id) ON DELETE CASCADE,
  next_lr_number INTEGER DEFAULT 1,
  lr_prefix VARCHAR(20) DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE transport_lr_sequences IS 'Per-transport LR number sequencing. Maintains separate LR number sequences for each transport company.';

CREATE INDEX IF NOT EXISTS idx_transport_lr_sequences_updated_at ON transport_lr_sequences(updated_at);

-- ============================================
-- 4. UPDATE APP_SETTINGS TO BE PER-TRANSPORT
-- ============================================
-- Make app_settings per-transport while maintaining backward compatibility

-- Add transport_id to app_settings
ALTER TABLE IF EXISTS app_settings ADD COLUMN IF NOT EXISTS transport_id INTEGER;
ALTER TABLE IF EXISTS app_settings ADD CONSTRAINT fk_app_settings_transport_id FOREIGN KEY (transport_id) REFERENCES transports(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_app_settings_transport_id ON app_settings(transport_id);
COMMENT ON COLUMN app_settings.transport_id IS 'Transport/Company this setting belongs to. NULL = global setting';

-- Create unique index for per-transport settings
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_transport_unique ON app_settings(COALESCE(transport_id, -1)) 
WHERE transport_id IS NOT NULL;

-- ============================================
-- 5. CREATE HELPER FUNCTION FOR GETTING LR NUMBER
-- ============================================

CREATE OR REPLACE FUNCTION get_next_lr_number_for_transport(p_transport_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
  v_next_number INTEGER;
  v_lr_prefix VARCHAR(20);
  v_lr_no VARCHAR(50);
BEGIN
  -- Lock and increment sequence for this transport
  UPDATE transport_lr_sequences
  SET next_lr_number = next_lr_number + 1,
      updated_at = NOW()
  WHERE id = p_transport_id
  RETURNING next_lr_number - 1, lr_prefix INTO v_next_number, v_lr_prefix;
  
  -- If no row found, initialize it
  IF v_next_number IS NULL THEN
    INSERT INTO transport_lr_sequences (id, next_lr_number, lr_prefix, updated_at)
    VALUES (p_transport_id, 2, '')
    ON CONFLICT (id) DO UPDATE
    SET next_lr_number = transport_lr_sequences.next_lr_number + 1,
        updated_at = NOW()
    RETURNING next_lr_number - 1, lr_prefix INTO v_next_number, v_lr_prefix;
  END IF;
  
  -- Format LR number with prefix and zero-padded number
  v_lr_no := v_lr_prefix || LPAD(v_next_number::VARCHAR, 5, '0');
  
  RETURN v_lr_no;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_lr_number_for_transport(INTEGER) IS 'Gets the next LR number for a specific transport in sequence (1, 2, 3...)';

-- ============================================
-- 6. CREATE MIGRATION TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS migration_log (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO migration_log (migration_name) VALUES ('02-transport-isolation-migration')
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================
-- Done: Transport Isolation Migration Complete
-- ============================================

COMMIT;
