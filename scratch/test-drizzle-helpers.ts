import * as schema from "../drizzle/schema";
import { is, getTableColumns } from "drizzle-orm";
import { MySqlTable } from "drizzle-orm/mysql-core";

for (const [key, value] of Object.entries(schema)) {
  if (is(value, MySqlTable)) {
    const columns = getTableColumns(value);
    const colObj = Object.values(columns)[0];
    console.log("Column object keys:", Object.keys(colObj));
    console.log("Column type name:", (colObj as any).columnType);
    console.log("Column SQL type:", (colObj as any).getSQLType ? (colObj as any).getSQLType() : "no getSQLType");
    break;
  }
}
