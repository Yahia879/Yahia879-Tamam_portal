import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// فحص التصنيفات الموجودة
const [categories] = await conn.execute('SELECT * FROM categories ORDER BY type, sortOrder');
console.log('التصنيفات الموجودة:');
console.table(categories);

// فحص قيم التصنيفات
const [values] = await conn.execute(`
  SELECT cv.*, c.type as categoryType, c.nameAr as categoryName 
  FROM category_values cv 
  JOIN categories c ON cv.categoryId = c.id 
  ORDER BY c.type, cv.sortOrder
`);
console.log('\nقيم التصنيفات:');
console.table(values);

await conn.end();
