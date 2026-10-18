CREATE FUNCTION category_visible(category text) RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH RECURSIVE ancestry AS (
 SELECT id,parent_id,enabled FROM categories WHERE id=category
 UNION ALL SELECT c.id,c.parent_id,c.enabled FROM categories c JOIN ancestry a ON c.id=a.parent_id
 ) SELECT count(*)>0 AND bool_and(enabled) FROM ancestry
$$;
