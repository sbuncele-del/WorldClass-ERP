/**
 * Daily.co Video Meeting Service
 * 
 * Provides video conferencing capabilities for the Communications Hub.
 * Uses Daily.co's API for creating and managing video meeting rooms.
 * 
 * Free tier includes:
 * - 2,000 participant minutes/month
 * - Up to 50 participants per room
 * - Screen sharing
 * - Recording (limited)
 * 
 * @see https://docs.daily.co/reference
 */

import axios from 'axios';

const DAILY_API_URL = process.env.DAILY_API_URL || 'https://api.daily.co/v1';
const DAILY_API_KEY = process.env.DAILY_API_KEY;

interface DailyRoomConfig {
  name?: string;
  privacy?: 'public' | 'private';
  properties?: {
    exp?: number;                    // Expiration timestamp (Unix)
    nbf?: number;                    // Not before timestamp (Unix)
    max_participants?: number;       // Max participants (default 50)
    enable_screenshare?: boolean;
    enable_chat?: boolean;
    enable_knocking?: boolean;       // Waiting room
    start_video_off?: boolean;
    start_audio_off?: boolean;
    owner_only_broadcast?: boolean;  // Webinar mode
    enable_recording?: 'cloud' | 'local' | 'raw-tracks' | undefined;
    eject_at_room_exp?: boolean;
    lang?: string;                   // UI language
  };
}

interface DailyRoom {
  id: string;
  name: string;
  api_created: boolean;
  privacy: 'public' | 'private';
  url: string;
  created_at: string;
  config: DailyRoomConfig['properties'];
}

interface MeetingToken {
  token: string;
}

interface MeetingParticipant {
  user_id: string;
  user_name: string;
  join_time: string;
  duration: number;
}

interface MeetingRecording {
  id: string;
  room_name: string;
  start_ts: number;
  duration: number;
  status: string;
  download_link?: string;
}

class DailyMeetingService {
  private apiClient = axios.create({
    baseURL: DAILY_API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DAILY_API_KEY}`
    }
  });

  /**
   * Check if Daily.co is configured
   */
  isConfigured(): boolean {
    return !!DAILY_API_KEY;
  }

  /**
   * Create a new meeting room
   * @param options Room configuration options
   */
  async createRoom(options: {
    name?: string;
    expiryMinutes?: number;
    maxParticipants?: number;
    enableWaitingRoom?: boolean;
    enableRecording?: boolean;
    isWebinar?: boolean;
  } = {}): Promise<DailyRoom> {
    if (!this.isConfigured()) {
      throw new Error('Daily.co API key not configured');
    }

    const {
      name,
      expiryMinutes = 60,
      maxParticipants = 50,
      enableWaitingRoom = false,
      enableRecording = false,
      isWebinar = false
    } = options;

    // Generate room name if not provided
    const roomName = name || `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate expiration (Unix timestamp)
    const exp = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);

    const config: DailyRoomConfig = {
      name: roomName,
      privacy: enableWaitingRoom ? 'private' : 'public',
      properties: {
        exp,
        max_participants: maxParticipants,
        enable_screenshare: true,
        enable_chat: true,
        enable_knocking: enableWaitingRoom,
        start_video_off: false,
        start_audio_off: false,
        owner_only_broadcast: isWebinar,
        enable_recording: enableRecording ? 'cloud' : undefined,
        eject_at_room_exp: true,
        lang: 'en'
      }
    };

    try {
      const response = await this.apiClient.post<DailyRoom>('/rooms', config);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create Daily.co room:', error.response?.data || error.message);
      throw new Error(`Failed to create meeting room: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get an existing room by name
   */
  async getRoom(roomName: string): Promise<DailyRoom | null> {
    if (!this.isConfigured()) {
      throw new Error('Daily.co API key not configured');
    }

    try {
      const response = await this.apiClient.get<DailyRoom>(`/rooms/${roomName}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all rooms
   */
  async listRooms(limit: number = 50): Promise<DailyRoom[]> {
    if (!this.isConfigured()) {
      throw new Error('Daily.co API key not configured');
    }

    try {
      const response = await this.apiClient.get<{ data: DailyRoom[] }>('/rooms', {
        params: { limit }
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to list rooms:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomName: string): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Daily.co API key not configured');
    }

    try {
      await this.apiClient.delete(`/rooms/${roomName}`);
      return true;
    } catch (error: any) {
      console.error('Failed to delete room:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Create a meeting token for a participant
   * Tokens can have restricted permissions (e.g., for guests vs hosts)
   */
  async createMeetingToken(options: {
    roomName: string;
    userName: string;
    isOwner?: boolean;
    expiryMinutes?: number;
    userId?: string;
  }): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Daily.co API key not configured');
    }

    const {
      roomName,
      userName,
      isOwner = false,
      expiryMinutes = 60,
      userId
    } = options;

    const exp = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);

    try {
      const response = await this.apiClient.post<MeetingToken>('/meeting-tokens', {
        properties: {
          room_name: roomName,
          user_name: userName,
          user_id: userId,
          is_owner: isOwner,
          exp,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false
        }
      });
      return response.data.token;
    } catch (error: any) {
      console.error('Failed to create meeting token:', error.response?.data || error.message);
      throw new Error(`Failed to create meeting token: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get meeting analytics/logs for a room
   */
  async getMeetingLogs(roomName: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Daily.co API key not configured');
    }

    try {
      const response = await this.apiClient.get('/logs', {
        params: {
          room: roomName,
          limit: 100
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to get meeting logs:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get domain/account information
   */
  async getAccountInfo(): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Daily.co API key not configured');
    }

    try {
      const response = await this.apiClient.get('/');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get account info:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create an instant meeting (quick room with short expiry)
   */
  async createInstantMeeting(hostName: string): Promise<{
    room: DailyRoom;
    hostToken: string;
    guestUrl: string;
  }> {
    // Create room with 2-hour expiry
    const room = await this.createRoom({
      expiryMinutes: 120,
      maxParticipants: 10
    });

    // Create host token
    const hostToken = await this.createMeetingToken({
      roomName: room.name,
      userName: hostName,
      isOwner: true,
      expiryMinutes: 120
    });

    return {
      room,
      hostToken,
      guestUrl: room.url
    };
  }

  /**
   * Schedule a meeting (room with future start time)
   */
  async scheduleMeeting(options: {
    title: string;
    startTime: Date;
    durationMinutes: number;
    hostName: string;
    maxParticipants?: number;
    enableWaitingRoom?: boolean;
  }): Promise<{
    room: DailyRoom;
    hostToken: string;
    guestUrl: string;
    startTime: Date;
    endTime: Date;
  }> {
    const { title, startTime, durationMinutes, hostName, maxParticipants, enableWaitingRoom } = options;

    // Calculate room expiry (30 min after scheduled end time)
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    const expiryMinutes = Math.ceil((endTime.getTime() - Date.now()) / 60000) + 30;

    // Create sanitized room name from title
    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
    const roomName = `${sanitizedTitle}-${Date.now()}`;

    const room = await this.createRoom({
      name: roomName,
      expiryMinutes,
      maxParticipants,
      enableWaitingRoom
    });

    const hostToken = await this.createMeetingToken({
      roomName: room.name,
      userName: hostName,
      isOwner: true,
      expiryMinutes
    });

    return {
      room,
      hostToken,
      guestUrl: room.url,
      startTime,
      endTime
    };
  }

  /**
   * Generate a guest invitation link
   */
  async createGuestInvite(roomName: string, guestName: string, expiryMinutes: number = 120): Promise<{
    url: string;
    token: string;
  }> {
    const room = await this.getRoom(roomName);
    if (!room) {
      throw new Error('Room not found');
    }

    const token = await this.createMeetingToken({
      roomName,
      userName: guestName,
      isOwner: false,
      expiryMinutes
    });

    // Return URL with token for direct join
    return {
      url: `${room.url}?t=${token}`,
      token
    };
  }
}

export const dailyMeetingService = new DailyMeetingService();
export default dailyMeetingService;
