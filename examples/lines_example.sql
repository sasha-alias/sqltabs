--- chart area-spline
SELECT 
    n,
    sin(n) sinn,
    n*sin(n) nsinn,
    -n nn
FROM generate_series(1, 100) n