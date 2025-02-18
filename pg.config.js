// This is the configuration for the postgres database used for testing.
// It is used in the run-with-pg-test.sh script to start the database and run the tests.
module.exports = {
  test: {
    port: 65432,
    pgDb: "dmarc-analyzer",
    pgUser: "dmarc-analyzer",
  },
};
