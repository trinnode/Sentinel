import { EventEmitter } from "events";
import { ConsensusRequest, ConsensusResponse } from "../types";
export interface ConsensusResult {
    consensusId: string;
    responses: ConsensusResponse[];
    agreeCount: number;
    totalPeers: number;
}
export declare class PeerNetwork extends EventEmitter {
    private config;
    private logger;
    private server?;
    private peers;
    private bootstrapPeers;
    private discoveryInterval?;
    private agentId;
    constructor();
    start(): Promise<void>;
    stop(): Promise<void>;
    private startServer;
    private connectToPeer;
    private isConnectedTo;
    private setupSocket;
    private registerPeer;
    private sendHello;
    private sendMessage;
    private broadcast;
    requestConsensus(request: ConsensusRequest, timeoutMs: number): Promise<ConsensusResult>;
    sendConsensusResponse(response: ConsensusResponse): void;
}
//# sourceMappingURL=PeerNetwork.d.ts.map