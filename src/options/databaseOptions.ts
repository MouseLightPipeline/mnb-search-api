export const Databases = {
    search: {
        database: "search_production",
        username: "postgres",
        host: "search-db",
        user: "postgres",
        password: "pgsecret",
        port: 5432,
        dialect: "postgres",
        logging: null,
        operatorsAliases: false,
    },
    metrics: {
        host: "metrics-db",
        port: 8086,
        database: "query_metrics_db"
    }
};

function loadDatabaseOptions() {
    const options = Object.assign({}, Databases);

    options.search.host = process.env.SEARCH_DB_HOST || options.search.host;
    options.search.port = parseInt(process.env.SEARCH_DB_PORT) || options.search.port;
    options.search.user = process.env.DATABASE_USER || options.search.user;
    options.search.password = process.env.DATABASE_PW || "pgsecret";

    options.metrics.host = process.env.METRICS_DB_HOST || options.metrics.host;
    options.metrics.port = parseInt(process.env.METRICS_DB_PORT) || options.metrics.port;

    return options;
}

const DatabaseOptions = loadDatabaseOptions();

export const SequelizeOptions = DatabaseOptions.search;

export const MetricsOptions = DatabaseOptions.metrics;
