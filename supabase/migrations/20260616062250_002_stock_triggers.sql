-- Function to update stock after purchase
CREATE OR REPLACE FUNCTION update_stock_after_purchase()
RETURNS TRIGGER AS $$
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

-- Function to update stock after sale
CREATE OR REPLACE FUNCTION update_stock_after_sale()
RETURNS TRIGGER AS $$
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

-- Triggers
CREATE TRIGGER after_purchase_insert
    AFTER INSERT ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_after_purchase();

CREATE TRIGGER after_sale_insert
    AFTER INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_after_sale();
