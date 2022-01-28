// Update with your config settings.

module.exports = {
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL
  },
}
