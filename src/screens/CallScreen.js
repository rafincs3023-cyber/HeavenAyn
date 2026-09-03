import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import Avatar from '../components/Avatar';
import {
  subscribeToCall,
  updateCallStatus,
  fetchAgoraToken,
  CALL_STATUS,
  isTerminalStatus,
} from '../services/callService';
import { getAgora, requestCallPermissions, isCallingSupported } from '../services/agoraService';
import { AGORA_APP_ID, CALL_RING_TIMEOUT_MS, hashUid } from '../config/agoraConfig';

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function CallScreen({ route, navigation }) {
  const { callId, role } = route.params; // role: 'caller' | 'callee'
  const { user } = useAuth();
  const { theme } = useAppTheme();

  const agora = getAgora();
  const RtcSurfaceView = agora?.RtcSurfaceView;

  const [call, setCall] = useState(null);
  const [callType, setCallType] = useState(null); // set once, triggers engine init
  const [joined, setJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState(0);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  const callRef = useRef(null);
  const engineRef = useRef(null);
  const handlerRef = useRef(null);
  const startedRef = useRef(false);
  const endedRef = useRef(false);

  const isVideo = callType === 'video';
  const other =
    role === 'caller'
      ? { name: call?.calleeName, photo: call?.calleePhoto }
      : { name: call?.callerName, photo: call?.callerPhoto };

  // ---- teardown ----------------------------------------------------------
  const cleanupEngine = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      if (handlerRef.current) engine.unregisterEventHandler(handlerRef.current);
      engine.stopPreview?.();
      engine.leaveChannel();
      engine.release();
    } catch (e) {
      // engine already released
    }
    engineRef.current = null;
    handlerRef.current = null;
  }, []);

  const leaveAndGoBack = useCallback(() => {
    cleanupEngine();
    if (navigation.canGoBack()) navigation.goBack();
  }, [cleanupEngine, navigation]);

  // End the call from this side. Picks "cancelled" if the caller bails before
  // the callee ever answered, otherwise "ended".
  const hangUp = useCallback(
    async (nextStatus) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const current = callRef.current;
      const status =
        nextStatus ||
        (current && current.status === CALL_STATUS.RINGING && role === 'caller'
          ? CALL_STATUS.CANCELLED
          : CALL_STATUS.ENDED);
      cleanupEngine();
      try {
        await updateCallStatus(callId, status);
      } catch (e) {
        // best effort — the other side also writes a terminal status
      }
      if (navigation.canGoBack()) navigation.goBack();
    },
    [callId, role, cleanupEngine, navigation]
  );

  // ---- live call document ----------------------------------------------------
  useEffect(() => {
    const unsub = subscribeToCall(callId, (doc) => {
      callRef.current = doc;
      setCall(doc);

      if (!doc) {
        if (!endedRef.current) {
          endedRef.current = true;
          leaveAndGoBack();
        }
        return;
      }
      if (doc.type) setCallType((prev) => prev || doc.type);
      if (isTerminalStatus(doc.status) && !endedRef.current) {
        endedRef.current = true;
        leaveAndGoBack();
      }
    });
    return unsub;
  }, [callId, leaveAndGoBack]);

  // ---- ring timeout (caller only) --------------------------------------------
  useEffect(() => {
    if (role !== 'caller' || remoteJoined) return undefined;
    const t = setTimeout(() => {
      if (!remoteJoined && !endedRef.current) hangUp(CALL_STATUS.MISSED);
    }, CALL_RING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [role, remoteJoined, hangUp]);

  // ---- call duration timer -------------------------------------------------
  useEffect(() => {
    if (!remoteJoined) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [remoteJoined]);

  // ---- Agora engine: init + join (runs once, when the call type is known) ---
  useEffect(() => {
    if (!callType || startedRef.current || !isCallingSupported || !agora) return undefined;
    startedRef.current = true;

    const { createAgoraRtcEngine, ChannelProfileType, ClientRoleType } = agora;
    const video = callType === 'video';
    let cancelled = false;

    (async () => {
      const granted = await requestCallPermissions(video);
      if (cancelled) return;
      if (!granted) {
        hangUp(CALL_STATUS.ENDED);
        return;
      }

      const engine = createAgoraRtcEngine();
      engineRef.current = engine;
      engine.initialize({ appId: AGORA_APP_ID });

      const handler = {
        onJoinChannelSuccess: () => !cancelled && setJoined(true),
        onUserJoined: (_conn, uid) => {
          if (cancelled) return;
          setRemoteUid(uid);
          setRemoteJoined(true);
        },
        onUserOffline: () => {
          if (!cancelled) hangUp(CALL_STATUS.ENDED);
        },
        onError: (err, msg) => console.warn('[agora] error', err, msg),
      };
      handlerRef.current = handler;
      engine.registerEventHandler(handler);

      if (video) {
        engine.enableVideo();
        engine.startPreview();
      } else {
        engine.enableAudio();
      }
      engine.setEnableSpeakerphone(video);
      if (!cancelled) setSpeakerOn(video);

      const agoraUid = hashUid(user.uid);
      const channel = callRef.current?.channelName || callId;
      const token = await fetchAgoraToken(channel, agoraUid);
      if (cancelled) return;

      engine.joinChannel(token || '', channel, agoraUid, {
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: video,
        autoSubscribeAudio: true,
        autoSubscribeVideo: video,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [callType, agora, user.uid, callId, hangUp]);

  // ---- unmount safety ----------------------------------------------------
  useEffect(() => cleanupEngine, [cleanupEngine]);

  // ---- controls ---------------------------------------------------------------
  const toggleMic = () => {
    const next = !micMuted;
    setMicMuted(next);
    engineRef.current?.muteLocalAudioStream(next);
  };
  const toggleCamera = () => {
    const next = !cameraOff;
    setCameraOff(next);
    engineRef.current?.muteLocalVideoStream(next);
    engineRef.current?.enableLocalVideo(!next);
  };
  const toggleSpeaker = () => {
    const next = !speakerOn;
    setSpeakerOn(next);
    engineRef.current?.setEnableSpeakerphone(next);
  };
  const flipCamera = () => engineRef.current?.switchCamera();

  // ---- render ---------------------------------------------------------------
  const statusText = endedRef.current
    ? 'Call ended'
    : remoteJoined
    ? formatDuration(seconds)
    : role === 'caller'
    ? 'Ringing…'
    : 'Connecting…';

  const showRemoteVideo = isVideo && remoteJoined && !!RtcSurfaceView && !endedRef.current;
  const showLocalVideo = isVideo && joined && !cameraOff && !!RtcSurfaceView && !endedRef.current;

  return (
    <View style={[styles.container, { backgroundColor: theme.header }]}>
      {showRemoteVideo ? (
        <RtcSurfaceView style={StyleSheet.absoluteFill} canvas={{ uid: remoteUid }} />
      ) : (
        <View style={styles.centerInfo}>
          <Avatar uri={other.photo} name={other.name} size={130} />
          <Text style={[styles.name, { color: theme.headerText }]}>{other.name || 'Calling…'}</Text>
          <Text style={[styles.status, { color: theme.headerText }]}>{statusText}</Text>
          {!isVideo && (
            <Ionicons
              name="call"
              size={22}
              color={theme.headerText}
              style={{ opacity: 0.5, marginTop: 18 }}
            />
          )}
        </View>
      )}

      {showRemoteVideo && (
        <View style={styles.remoteHeader}>
          <Text style={[styles.name, styles.nameSmall, { color: '#FFFFFF' }]}>{other.name}</Text>
          <Text style={[styles.status, { color: '#FFFFFF' }]}>{statusText}</Text>
        </View>
      )}

      {showLocalVideo && (
        <View style={[styles.localWrap, { borderColor: theme.header }]}>
          <RtcSurfaceView style={styles.localView} canvas={{ uid: 0 }} zOrderMediaOverlay />
        </View>
      )}

      <View style={styles.controls}>
        <ControlButton
          icon={micMuted ? 'mic-off' : 'mic'}
          active={micMuted}
          label={micMuted ? 'Unmute' : 'Mute'}
          onPress={toggleMic}
          theme={theme}
        />

        {isVideo ? (
          <>
            <ControlButton
              icon={cameraOff ? 'videocam-off' : 'videocam'}
              active={cameraOff}
              label={cameraOff ? 'Start video' : 'Stop video'}
              onPress={toggleCamera}
              theme={theme}
            />
            <ControlButton icon="camera-reverse" label="Flip" onPress={flipCamera} theme={theme} />
          </>
        ) : (
          <ControlButton
            icon={speakerOn ? 'volume-high' : 'volume-medium'}
            active={speakerOn}
            label="Speaker"
            onPress={toggleSpeaker}
            theme={theme}
          />
        )}

        <ControlButton
          icon="call"
          label="End"
          onPress={() => hangUp()}
          bg={theme.danger}
          rotate
          theme={theme}
        />
      </View>
    </View>
  );
}

function ControlButton({ icon, label, onPress, active, bg, rotate, theme }) {
  return (
    <View style={styles.control}>
      <TouchableOpacity
        style={[
          styles.controlBtn,
          { backgroundColor: bg || (active ? '#FFFFFF' : 'rgba(255,255,255,0.18)') },
        ]}
        onPress={onPress}
      >
        <Ionicons
          name={icon}
          size={24}
          color={bg ? '#FFFFFF' : active ? theme.header : '#FFFFFF'}
          style={rotate ? { transform: [{ rotate: '135deg' }] } : undefined}
        />
      </TouchableOpacity>
      <Text style={styles.controlLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerInfo: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  name: { fontSize: 26, fontWeight: '700', marginTop: 22, textAlign: 'center', paddingHorizontal: 24 },
  nameSmall: { fontSize: 18, marginTop: 0 },
  status: { fontSize: 15, marginTop: 8, opacity: 0.9 },
  remoteHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    alignItems: 'flex-start',
  },
  localWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 16,
    width: 108,
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
  },
  localView: { flex: 1 },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 22,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  control: { alignItems: 'center' },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: { color: '#FFFFFF', fontSize: 11, marginTop: 7, opacity: 0.85 },
});
