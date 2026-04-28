export interface Topology {
  localPeerId: string
  peers: { peerId: string; address: string }[]
}

export interface AgentCard {
  name: string
  description: string
  capabilities: string[]
  services: string[]
}

export interface A2AMessage {
  type: string
  payload: unknown
}

export class AXLClient {
  constructor(private baseUrl: string = 'http://127.0.0.1:9002') {}

  async getTopology(): Promise<Topology> {
    const res = await fetch(`${this.baseUrl}/topology`)
    if (!res.ok) throw new Error(`AXL topology error: ${res.status}`)
    const raw = await res.json()
    return {
      localPeerId: raw.our_public_key || raw.localPeerId,
      peers: (raw.peers || []).map((p: any) => ({
        peerId: p.public_key || p.peerId,
        address: p.uri || p.address,
      })),
    }
  }

  async send(destinationPeerId: string, data: Buffer | Uint8Array): Promise<number> {
    const res = await fetch(`${this.baseUrl}/send`, {
      method: 'POST',
      headers: {
        'X-Destination-Peer-Id': destinationPeerId,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(data),
    })
    if (!res.ok) throw new Error(`AXL send error: ${res.status}`)
    return parseInt(res.headers.get('X-Sent-Bytes') || '0')
  }

  async recv(): Promise<{ from: string; data: Buffer } | null> {
    const res = await fetch(`${this.baseUrl}/recv`)
    if (res.status === 204) return null
    if (!res.ok) throw new Error(`AXL recv error: ${res.status}`)
    return {
      from: res.headers.get('X-From-Peer-Id')!,
      data: Buffer.from(await res.arrayBuffer()),
    }
  }

  async callMCP(peerId: string, service: string, request: object): Promise<object> {
    const res = await fetch(`${this.baseUrl}/mcp/${peerId}/${service}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (!res.ok) throw new Error(`AXL MCP call error: ${res.status}`)
    return res.json()
  }

  async getAgentCard(peerId: string): Promise<AgentCard> {
    const res = await fetch(`${this.baseUrl}/a2a/${peerId}`)
    if (!res.ok) throw new Error(`AXL A2A error: ${res.status}`)
    return res.json()
  }

  async sendA2A(peerId: string, message: A2AMessage): Promise<object> {
    const res = await fetch(`${this.baseUrl}/a2a/${peerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    if (!res.ok) throw new Error(`AXL A2A send error: ${res.status}`)
    return res.json()
  }

  async registerMCPService(
    name: string,
    targetUrl: string,
    description: string,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/mcp/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, target_url: targetUrl, description }),
    })
    if (!res.ok) throw new Error(`AXL MCP register error: ${res.status}`)
  }
}
