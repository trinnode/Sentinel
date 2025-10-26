import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { WebSocketServer, WebSocket, RawData } from "ws";
import { Config } from "../core/Config";
import { Logger } from "../utils/Logger";
import { ConsensusRequest, ConsensusResponse, P2PMessage } from "../types";

interface PeerInfo {
  id: string;
  socket: WebSocket;
  url?: string;
}

export interface ConsensusResult {
  consensusId: string;
  responses: ConsensusResponse[];
  agreeCount: number;
  totalPeers: number;
}

export class PeerNetwork extends EventEmitter {
  private config: Config;
  private logger: Logger;
  private server?: WebSocketServer;
  private peers: Map<string, PeerInfo> = new Map();
  private bootstrapPeers: string[];
  private discoveryInterval?: NodeJS.Timeout;
  private agentId: string;

  constructor() {
    super();
    this.config = Config.getInstance();
    this.logger = Logger.getInstance();
    this.agentId = this.config.getAgentId();
    this.bootstrapPeers = this.config.getP2PBootstrapPeers();
  }

  public async start(): Promise<void> {
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

  public async stop(): Promise<void> {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = undefined;
    }

    for (const peer of this.peers.values()) {
      peer.socket.terminate();
    }
    this.peers.clear();

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server?.close(() => resolve());
      });
      this.server = undefined;
    }
  }

  private async startServer(): Promise<void> {
    if (this.server) {
      return;
    }

    const port = this.config.getConfig().p2pPort;
    this.server = new WebSocketServer({ port });

    this.server.on("connection", (socket: WebSocket) => {
      this.logger.info("Peer connected", { direction: "inbound" });
      this.setupSocket(socket);
      this.sendHello(socket);
    });

    this.server.on("listening", () => {
      this.logger.info("P2P server listening", { port });
    });

    this.server.on("error", (error) => {
      this.logger.error(
        "P2P server error",
        error instanceof Error ? error : undefined
      );
    });
  }

  private connectToPeer(url: string): void {
    try {
      const socket = new WebSocket(url);
      socket.on("open", () => {
        this.logger.info("Connected to peer", { url });
        this.setupSocket(socket, url);
        this.sendHello(socket);
      });
      socket.on("error", (error) => {
        this.logger.error(
          "Failed to connect to peer",
          error instanceof Error ? error : undefined
        );
      });
    } catch (error) {
      this.logger.error(
        "Error while connecting to peer",
        error instanceof Error ? error : undefined
      );
    }
  }

  private isConnectedTo(url: string): boolean {
    for (const peer of this.peers.values()) {
      if (peer.url === url && peer.socket.readyState === WebSocket.OPEN) {
        return true;
      }
    }
    return false;
  }

  private setupSocket(socket: WebSocket, url?: string): void {
    let peerId = "";

    const send = (message: P2PMessage) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    };

    send({
      type: "peer_hello",
      from: this.agentId,
      timestamp: new Date(),
      data: {},
    });

    socket.on("message", (raw: RawData) => {
      try {
        const payload = JSON.parse(raw.toString()) as P2PMessage;
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
            this.emit("consensus_request", payload.data as ConsensusRequest);
            break;
          case "consensus_response":
            this.emit("consensus_response", payload.data as ConsensusResponse);
            break;
          case "health_report":
            this.emit("health_report", payload.data);
            break;
          default:
            this.emit("message", payload);
        }
      } catch (error) {
        this.logger.error(
          "Failed to handle P2P message",
          error instanceof Error ? error : undefined
        );
      }
    });

    socket.on("close", () => {
      if (peerId) {
        this.logger.info("Peer disconnected", { peerId });
        this.peers.delete(peerId);
      }
    });
  }

  private registerPeer(peerId: string, socket: WebSocket, url?: string): void {
    if (peerId === this.agentId) {
      return;
    }

    if (this.peers.has(peerId)) {
      const existing = this.peers.get(peerId)!;
      existing.socket.terminate();
      this.peers.delete(peerId);
    }

    this.peers.set(peerId, { id: peerId, socket, url });
    this.logger.info("Registered peer", {
      peerId,
      totalPeers: this.peers.size,
    });
  }

  private sendHello(socket: WebSocket): void {
    this.sendMessage(socket, {
      type: "peer_hello",
      from: this.agentId,
      timestamp: new Date(),
      data: {},
    });
  }

  private sendMessage(socket: WebSocket, message: P2PMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private broadcast(message: P2PMessage): void {
    this.peers.forEach((peer) => {
      this.sendMessage(peer.socket, message);
    });
  }

  public async requestConsensus(
    request: ConsensusRequest,
    timeoutMs: number
  ): Promise<ConsensusResult> {
    const consensusId = randomUUID();

    if (this.peers.size === 0) {
      return {
        consensusId,
        responses: [],
        agreeCount: 0,
        totalPeers: 0,
      };
    }

    const responses: ConsensusResponse[] = [];

    const handler = (response: ConsensusResponse) => {
      if (
        response.consensusId === consensusId &&
        response.requesterId === this.agentId
      ) {
        const existingIndex = responses.findIndex(
          (res) => res.agentId === response.agentId
        );
        if (existingIndex >= 0) {
          responses[existingIndex] = response;
        } else {
          responses.push(response);
        }
      }
    };

    this.on("consensus_response", handler);

    const message: P2PMessage = {
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

  public sendConsensusResponse(response: ConsensusResponse): void {
    const message: P2PMessage = {
      type: "consensus_response",
      from: this.agentId,
      timestamp: new Date(),
      data: response,
    };

    this.broadcast(message);
  }
}
