import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Button, Space, Typography, Modal, Input, message, Spin, Result, Tooltip
} from 'antd';
import { 
  VideoCameraOutlined, CopyOutlined, ArrowLeftOutlined,
  UserAddOutlined, ExclamationCircleOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import './VideoCall.css';

const { Title, Text } = Typography;

const DAILY_DOMAIN = 'aetheros.daily.co';

const VideoCall: React.FC = () => {
  const navigate = useNavigate();
  const { callId } = useParams();
  const [searchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<DailyCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetingUrl, setMeetingUrl] = useState<string>('');
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);

  // Resolve meeting URL from params or search params
  useEffect(() => {
    const urlParam = searchParams.get('url');
    const tokenParam = searchParams.get('t');
    
    if (urlParam) {
      const fullUrl = tokenParam ? `${urlParam}?t=${tokenParam}` : urlParam;
      setMeetingUrl(fullUrl);
    } else if (callId) {
      if (callId.startsWith('http')) {
        setMeetingUrl(callId);
      } else {
        const url = `https://${DAILY_DOMAIN}/${callId}`;
        setMeetingUrl(tokenParam ? `${url}?t=${tokenParam}` : url);
      }
    } else {
      setError('No meeting URL or room ID provided');
      setLoading(false);
    }
  }, [callId, searchParams]);

  // Create and join the Daily.co call
  useEffect(() => {
    if (!meetingUrl || !containerRef.current || hasLeft) return;

    let callFrame: DailyCall | null = null;

    const startCall = async () => {
      try {
        setLoading(true);
        setError(null);

        // Destroy any existing call frame
        if (callFrameRef.current) {
          try {
            await callFrameRef.current.destroy();
          } catch (e) {
            // ignore
          }
          callFrameRef.current = null;
        }

        // Create Daily.co iframe embedded in our container
        callFrame = DailyIframe.createFrame(containerRef.current!, {
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '12px',
          },
          showLeaveButton: true,
          showFullscreenButton: true,
          showLocalVideo: true,
          showParticipantsBar: true,
        });

        callFrameRef.current = callFrame;

        // Event listeners
        callFrame.on('joined-meeting', () => {
          setLoading(false);
          console.log('[VideoCall] Joined meeting');
        });

        callFrame.on('left-meeting', () => {
          console.log('[VideoCall] Left meeting');
          setHasLeft(true);
          message.info('You left the meeting');
        });

        callFrame.on('error', (event) => {
          console.error('[VideoCall] Daily error:', event);
          setError(event?.errorMsg || 'An error occurred during the meeting');
          setLoading(false);
        });

        // Parse URL and token
        const [baseUrl, queryString] = meetingUrl.split('?');
        const params = new URLSearchParams(queryString || '');
        const token = params.get('t') || undefined;

        // Join the meeting
        await callFrame.join({
          url: baseUrl,
          token: token,
          showLeaveButton: true,
          showFullscreenButton: true,
        });
      } catch (err: any) {
        console.error('[VideoCall] Failed to join:', err);
        setError(err.message || 'Failed to join the meeting. The room may have expired or the link may be invalid.');
        setLoading(false);
      }
    };

    startCall();

    return () => {
      if (callFrame) {
        try {
          callFrame.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, [meetingUrl, hasLeft]);

  const handleLeave = useCallback(() => {
    if (callFrameRef.current) {
      callFrameRef.current.leave();
    }
    navigate('/communication');
  }, [navigate]);

  const handleRejoin = useCallback(() => {
    setHasLeft(false);
    setError(null);
    setLoading(true);
  }, []);

  const copyMeetingLink = useCallback(() => {
    const [baseUrl] = meetingUrl.split('?');
    navigator.clipboard.writeText(baseUrl);
    message.success('Meeting link copied!');
  }, [meetingUrl]);

  // User left the meeting
  if (hasLeft) {
    return (
      <div className="video-call" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Result
          icon={<VideoCameraOutlined style={{ color: '#1890ff' }} />}
          title="You left the meeting"
          subTitle="The meeting may still be in progress for other participants."
          extra={[
            <Button key="rejoin" type="primary" icon={<ReloadOutlined />} onClick={handleRejoin}>
              Rejoin Meeting
            </Button>,
            <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => navigate('/communication')}>
              Back to Communications
            </Button>
          ]}
        />
      </div>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <div className="video-call" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Result
          status="warning"
          icon={<ExclamationCircleOutlined />}
          title="Unable to join meeting"
          subTitle={error}
          extra={[
            <Button key="retry" type="primary" icon={<ReloadOutlined />} onClick={handleRejoin}>
              Try Again
            </Button>,
            <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => navigate('/communication')}>
              Back to Communications
            </Button>
          ]}
        />
      </div>
    );
  }

  return (
    <div className="video-call">
      {/* Header */}
      <div className="call-header">
        <div className="call-info">
          <Space>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              style={{ color: 'white' }} 
              onClick={() => {
                Modal.confirm({
                  title: 'Leave Meeting?',
                  content: 'Are you sure you want to leave this meeting?',
                  okText: 'Leave',
                  okType: 'danger',
                  onOk: handleLeave,
                });
              }}
            />
            <Title level={5} style={{ margin: 0, color: 'white' }}>Video Meeting</Title>
          </Space>
        </div>
        <Space>
          <Tooltip title="Invite participants">
            <Button 
              type="text" 
              icon={<UserAddOutlined />} 
              style={{ color: 'white' }} 
              onClick={() => setInviteModalVisible(true)} 
            />
          </Tooltip>
          <Tooltip title="Copy meeting link">
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              style={{ color: 'white' }} 
              onClick={copyMeetingLink}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Daily.co Video Frame */}
      <div className="video-container" ref={containerRef}>
        {loading && (
          <div className="video-loading">
            <Spin size="large" />
            <Text style={{ color: 'white', marginTop: 16 }}>Connecting to meeting...</Text>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal
        title="Invite to Meeting"
        open={inviteModalVisible}
        onCancel={() => setInviteModalVisible(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text type="secondary">Meeting Link</Text>
            <Input.Search
              value={meetingUrl.split('?')[0]}
              readOnly
              enterButton="Copy"
              onSearch={() => copyMeetingLink()}
            />
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Share this link with participants. They can join directly from their browser - no software download needed.
          </Text>
        </Space>
      </Modal>
    </div>
  );
};

export default VideoCall;
