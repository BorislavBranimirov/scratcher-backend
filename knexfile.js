require('dotenv').config(); // required for npm scripts

const strToSnake = (str) => {
  return str.replace(/[A-Z]/g, (match) => {
    return '_' + match.toLowerCase();
  });
};

const objToCamel = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const newObj = {};
  for (const [key, value] of Object.entries(obj)) {
    newObj[key.replace(/_[a-z]/g, (match) => {
      return match[1].toUpperCase();
    })] = value;
  }
  return newObj;
};

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.PG_URL || {
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
      database: process.env.PG_DB,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD
    },
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    },
    wrapIdentifier: (id, wrapper) => {
      return wrapper(strToSnake(id));
    },
    postProcessResponse: (result) => {
      if (Array.isArray(result)) {
        return result.map(row => objToCamel(row));
      } else {
        return objToCamel(result);
      }
    },
    debug: true
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    },
    wrapIdentifier: (id, wrapper) => {
      return wrapper(strToSnake(id));
    },
    postProcessResponse: (result) => {
      if (Array.isArray(result)) {
        return result.map(row => objToCamel(row));
      } else {
        return objToCamel(result);
      }
    }
  }
};
