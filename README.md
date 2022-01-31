# Neuron Browser Search API
The Search API service exposes a [GraphQL](https://graphql.org) interface to the denormalized, query-optimized neuron browser data.

It  is a read-only interface and the search database only contains the portion of the data required to present the 
interactive browser.

### Caching/Performance
Tracing data (node data) is provided through a plain `GET` interface rather than through the GraphQL interface for
performance.

At the time of this writing the data set is small enough that the complete list of tracings with nodes is pre-loaded
into memory when the service starts.  As the data set grows it may be necessary to transition to a more formal
intermediary cache with a less recently used eviction policy or similar such as [Redis](https://redis.io).

The pre-loaded cache is not updated if the database is updated while the instance is running.  The service must be 
restarted to initiate the cache load.

### Migrations
When run from the Docker container, migrations are automatically applied at startup.

### Build

Building requires the Typescript compiler and a Node.js package manager (yarn/npm).  Automation of the `build->docker image build->
docker image release` process is through a [Taskfile](https://taskfile.dev).  The tasks
also require `jq` to parse `package.json` for version information.