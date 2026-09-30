-- Fix search_path security issue by setting explicit search_path
-- This prevents search_path injection attacks

CREATE OR REPLACE FUNCTION update_stock_after_purchase()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO stock_summary (product_id, available_quantity, last_purchase_price, user_id)
    VALUES (NEW.product_id, NEW.quantity, NEW.purchase_price / NEW.quantity, NEW.user_id)
    ON CONFLICT (product_id)
    DO UPDATE SET
        available_quantity = stock_summary.available_quantity + NEW.quantity,
        last_purchase_price = NEW.purchase_price / NEW.quantity,
        last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_stock_after_sale()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE stock_summary
    SET 
        available_quantity = GREATEST(available_quantity - NEW.quantity_sold, 0),
        last_selling_price = NEW.selling_price,
        last_updated = NOW()
    WHERE product_id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
