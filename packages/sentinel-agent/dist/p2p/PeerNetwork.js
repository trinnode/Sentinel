"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeerNetwork = void 0;
const events_1 = require("events");
const crypto_1 = require("crypto");
const ws_1 = require("ws");
const Config_1 = require("../core/Config");
const Logger_1 = require("../utils/Logger");
class PeerNetwork extends events_1.EventEmitter {
    constructor() {
        super();
        this.peers = new Map();
        this.config = Config_1.Config.getInstance();
        this.logger = Logger_1.Logger.getInstance();
        this.agentId = this.config.getAgentId();
        this.bootstrapPeers = this.config.getP2PBootstrapPeers();
    }
    async start() {
        if (!this.config.isP2PEnabled()) {
            this.logger.debug("Peer network is disabled via configuration");
            return;
        }
        await this.startServer();
        this.bootstrapPeers.forEach((peerUrl) => this.connectToPeer(peerUrl));
        if (this.config.getConfig().p2pDiscoveryInterval > 0) {
            this.discoveryInterval = setInterval(() => {
                this.bootstrapPeers.forEach((peerUrl) => {
                    if (!this.isConnectedTo(peerUrl)) {
                        this.connectToPeer(peerUrl);
                    }
                });
            }, this.config.getConfig().p2pDiscoveryInterval);
        }
    }
    async stop() {
        if (this.discoveryInterval) {
            clearInterval(this.discoveryInterval);
            this.discoveryInterval = undefined;
        }
        for (const peer of this.peers.values()) {
            peer.socket.terminate();
        }
        this.peers.clear();
        if (this.server) {
            await new Promise((resolve) => {
                this.server?.close(() => resolve());
            });
            this.server = undefined;
        }
    }
    async startServer() {
        if (this.server) {
            return;
        }
        const port = this.config.getConfig().p2pPort;
        this.server = new ws_1.WebSocketServer({ port });
        this.server.on("connection", (socket) => {
            this.logger.info("Peer connected", { direction: "inbound" });
            this.setupSocket(socket);
            this.sendHello(socket);
        });
        this.server.on("listening", () => {
            this.logger.info("P2P server listening", { port });
        });
        this.server.on("error", (error) => {
            this.logger.error("P2P server error", error instanceof Error ? error : undefined);
        });
    }
    connectToPeer(url) {
        try {
            const socket = new ws_1.WebSocket(url);
            socket.on("open", () => {
                this.logger.info("Connected to peer", { url });
                this.setupSocket(socket, url);
                this.sendHello(socket);
            });
            socket.on("error", (error) => {
                this.logger.error("Failed to connect to peer", error instanceof Error ? error : undefined);
            });
        }
        catch (error) {
            this.logger.error("Error while connecting to peer", error instanceof Error ? error : undefined);
        }
    }
    isConnectedTo(url) {
        for (const peer of this.peers.values()) {
            if (peer.url === url && peer.socket.readyState === ws_1.WebSocket.OPEN) {
                return true;
            }
        }
        return false;
    }
    setupSocket(socket, url) {
        let peerId = "";
        const send = (message) => {
            if (socket.readyState === ws_1.WebSocket.OPEN) {
                socket.send(JSON.stringify(message));
            }
        };
        send({
            type: "peer_hello",
            from: this.agentId,
            timestamp: new Date(),
            data: {},
        });
        socket.on("message", (raw) => {
            try {
                const payload = JSON.parse(raw.toString());
                if (!payload.type) {
                    return;
                }
                switch (payload.type) {
                    case "peer_hello": {
                        if (typeof payload.from === "string") {
                            peerId = payload.from;
                            this.registerPeer(peerId, socket, url);
                        }
                        break;
                    }
                    case "consensus_request":
                        this.emit("consensus_request", payload.data);
                        break;
                    case "consensus_response":
                        this.emit("consensus_response", payload.data);
                        break;
                    case "health_report":
                        this.emit("health_report", payload.data);
                        break;
                    default:
                        this.emit("message", payload);
                }
            }
            catch (error) {
                this.logger.error("Failed to handle P2P message", error instanceof Error ? error : undefined);
            }
        });
        socket.on("close", () => {
            if (peerId) {
                this.logger.info("Peer disconnected", { peerId });
                this.peers.delete(peerId);
            }
        });
    }
    registerPeer(peerId, socket, url) {
        if (peerId === this.agentId) {
            return;
        }
        if (this.peers.has(peerId)) {
            const existing = this.peers.get(peerId);
            existing.socket.terminate();
            this.peers.delete(peerId);
        }
        this.peers.set(peerId, { id: peerId, socket, url });
        this.logger.info("Registered peer", {
            peerId,
            totalPeers: this.peers.size,
        });
    }
    sendHello(socket) {
        this.sendMessage(socket, {
            type: "peer_hello",
            from: this.agentId,
            timestamp: new Date(),
            data: {},
        });
    }
    sendMessage(socket, message) {
        if (socket.readyState === ws_1.WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }
    broadcast(message) {
        this.peers.forEach((peer) => {
            this.sendMessage(peer.socket, message);
        });
    }
    async requestConsensus(request, timeoutMs) {
        const consensusId = (0, crypto_1.randomUUID)();
        if (this.peers.size === 0) {
            return {
                consensusId,
                responses: [],
                agreeCount: 0,
                totalPeers: 0,
            };
        }
        const responses = [];
        const handler = (response) => {
            if (response.consensusId === consensusId &&
                response.requesterId === this.agentId) {
                const existingIndex = responses.findIndex((res) => res.agentId === response.agentId);
                if (existingIndex >= 0) {
                    responses[existingIndex] = response;
                }
                else {
                    responses.push(response);
                }
            }
        };
        this.on("consensus_response", handler);
        const message = {
            type: "consensus_request",
            from: this.agentId,
            timestamp: new Date(),
            data: {
                ...request,
                consensusId,
            },
        };
        this.broadcast(message);
        await new Promise((resolve) => setTimeout(resolve, timeoutMs));
        this.off("consensus_response", handler);
        const agreeCount = responses.filter((response) => response.agree).length;
        return {
            consensusId,
            responses,
            agreeCount,
            totalPeers: this.peers.size,
        };
    }
    sendConsensusResponse(response) {
        const message = {
            type: "consensus_response",
            from: this.agentId,
            timestamp: new Date(),
            data: response,
        };
        this.broadcast(message);
    }
}
exports.PeerNetwork = PeerNetwork;
//# sourceMappingURL=PeerNetwork.js.map