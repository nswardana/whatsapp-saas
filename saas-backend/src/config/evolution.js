const EVOLUTION_SERVERS = [
    'http://evolution-api-1:8080',
    'http://evolution-api-2:8080'
];

let currentServerIndex = 0;

function getNextServer() {
    const server = EVOLUTION_SERVERS[currentServerIndex];
    currentServerIndex = (currentServerIndex + 1) % EVOLUTION_SERVERS.length;
    return server;
}

function getAllServers() {
    return EVOLUTION_SERVERS;
}

module.exports = {
    getNextServer,
    getAllServers,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY
};
