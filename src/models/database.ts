// @ts-ignore
import mariadb =require('mariadb');

export const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'abvesc',
    connectionLimit: 100
})

