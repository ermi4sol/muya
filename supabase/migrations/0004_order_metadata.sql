-- Phase 7: per-order metadata (chosen coaching slot, custom-product answer,
-- selected variant summary, customer locale at purchase)
alter table orders add column metadata jsonb default '{}';
