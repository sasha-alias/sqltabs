--- chart donut
/** ## Top 10 relations **/
SELECT 
    relname,
    pg_total_relation_size(oid)
FROM pg_class
ORDER BY 2 DESC
LIMIT 10

/** 
For more information visit [www.sqltabs.com](http://www.sqltabs.com/doc#charts)
**/