import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface PeerConnection {
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  data: any;
}

export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private signalChannel: RealtimeChannel | null = null;
  private channelId: string;
  private userId: string;
  private onRemoteStream?: (userId: string, stream: MediaStream) => void;

  private configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor(
    channelId: string,
    userId: string,
    onRemoteStream?: (userId: string, stream: MediaStream) => void
  ) {
    this.channelId = channelId;
    this.userId = userId;
    this.onRemoteStream = onRemoteStream;
  }

  async initialize(localStream: MediaStream) {
    this.localStream = localStream;

    // Setup signaling channel
    this.signalChannel = supabase.channel(`webrtc:${this.channelId}`, {
      config: {
        broadcast: { self: false }
      }
    });

    this.signalChannel
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        await this.handleSignal(payload as SignalMessage);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[WebRTC] Signaling channel ready');
        }
      });
  }

  async connectToPeer(peerId: string) {
    if (this.peers.has(peerId)) {
      console.log(`[WebRTC] Already connected to ${peerId}`);
      return;
    }

    console.log(`[WebRTC] Connecting to peer: ${peerId}`);
    const peerConnection = this.createPeerConnection(peerId);
    this.peers.set(peerId, { connection: peerConnection });

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    this.sendSignal({
      type: 'offer',
      from: this.userId,
      to: peerId,
      data: offer
    });
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'ice-candidate',
          from: this.userId,
          to: peerId,
          data: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from ${peerId}`);
      const [remoteStream] = event.streams;

      const peer = this.peers.get(peerId);
      if (peer) {
        peer.stream = remoteStream;
      }

      if (this.onRemoteStream && remoteStream) {
        this.onRemoteStream(peerId, remoteStream);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state with ${peerId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        this.removePeer(peerId);
      }
    };

    return pc;
  }

  private async handleSignal(message: SignalMessage) {
    if (message.to !== this.userId) return;

    console.log(`[WebRTC] Received ${message.type} from ${message.from}`);

    switch (message.type) {
      case 'offer':
        await this.handleOffer(message.from, message.data);
        break;
      case 'answer':
        await this.handleAnswer(message.from, message.data);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(message.from, message.data);
        break;
    }
  }

  private async handleOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    let peerConnection = this.peers.get(peerId)?.connection;

    if (!peerConnection) {
      peerConnection = this.createPeerConnection(peerId);
      this.peers.set(peerId, { connection: peerConnection });

      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection!.addTrack(track, this.localStream!);
        });
      }
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    this.sendSignal({
      type: 'answer',
      from: this.userId,
      to: peerId,
      data: answer
    });
  }

  private async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    const peer = this.peers.get(peerId);
    if (peer) {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const peer = this.peers.get(peerId);
    if (peer && peer.connection.remoteDescription) {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private sendSignal(message: SignalMessage) {
    if (this.signalChannel) {
      this.signalChannel.send({
        type: 'broadcast',
        event: 'signal',
        payload: message
      });
    }
  }

  removePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connection.close();
      this.peers.delete(peerId);
      console.log(`[WebRTC] Removed peer: ${peerId}`);
    }
  }

  updateLocalStream(stream: MediaStream) {
    this.localStream = stream;

    // Update all peer connections with new tracks
    this.peers.forEach((peer) => {
      const senders = peer.connection.getSenders();
      const audioTrack = stream.getAudioTracks()[0];

      const audioSender = senders.find(s => s.track?.kind === 'audio');
      if (audioSender && audioTrack) {
        audioSender.replaceTrack(audioTrack);
      }
    });
  }

  destroy() {
    // Close all peer connections
    this.peers.forEach((peer) => {
      peer.connection.close();
    });
    this.peers.clear();

    // Unsubscribe from signaling channel
    if (this.signalChannel) {
      supabase.removeChannel(this.signalChannel);
      this.signalChannel = null;
    }

    console.log('[WebRTC] Manager destroyed');
  }
}
