--- chart donut
SELECT 
    relname,
    pg_total_relation_size(oid)
FROM pg_class
ORDER BY 2 DESC
LIMIT 10