import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { navigate } from '../navigation/navigationRef';
import {
  createCall,
  updateCallStatus,
  subscribeToIncomingCalls,
  subscribeToCall,
  CALL_STATUS,
  isTerminalStatus,
} from '../services/callService';
import { isCallingSupported, callingUnavailableReason } from '../services/agoraService';
import IncomingCallModal from '../components/IncomingCallModal';
import { showAlert } from '../utils/alert';

const CallContext = createContext();

export function CallProvider({ children }) {
  const { user, profile } = useAuth();
  const [incomingCall, setIncomingCall] = useState(null);
  const ringingUnsubRef = useRef(null);

  // Listen for calls ringing this user. Skipped where calling can't run (web /
  // Expo Go) so the user isn't shown a call they have no way to answer.
  useEffect(() => {
    if (!user?.uid || !isCallingSupported) {
      setIncomingCall(null);
      return undefined;
    }
    const unsub = subscribeToIncomingCalls(user.uid, (call) => {
      setIncomingCall((prev) => {
        // Keep the one we're already showing if it's still the active ring.
        if (prev && call && prev.callId === call.callId) return prev;
        return call;
      });
    });
    return () => unsub();
  }, [user?.uid]);

  // While an incoming call is on screen, watch that specific doc so the modal
  // disappears the moment the caller cancels (or it otherwise ends).
  useEffect(() => {
    ringingUnsubRef.current?.();
    ringingUnsubRef.current = null;
    if (!incomingCall?.callId) return undefined;

    ringingUnsubRef.current = subscribeToCall(incomingCall.callId, (call) => {
      if (!call || isTerminalStatus(call.status) || call.status === CALL_STATUS.ACCEPTED) {
        setIncomingCall(null);
      }
    });
    return () => {
      ringingUnsubRef.current?.();
      ringingUnsubRef.current = null;
    };
  }, [incomingCall?.callId]);

  const startCall = useCallback(
    async (otherUser, type) => {
      if (!isCallingSupported) {
        showAlert('Calls unavailable', callingUnavailableReason);
        return;
      }
      if (!user?.uid || !otherUser?.id) return;
      if (otherUser.id === user.uid) return;
      try {
        const call = await createCall({
          caller: {
            id: user.uid,
            username: profile?.username || user.displayName || 'Unknown',
            photoURL: profile?.photoURL || '',
          },
          callee: otherUser,
          type,
        });
        navigate('Call', { callId: call.callId, role: 'caller' });
      } catch (e) {
        showAlert('Could not start the call', e?.message || 'Please try again.');
      }
    },
    [user?.uid, user?.displayName, profile?.username, profile?.photoURL]
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const call = incomingCall;
    setIncomingCall(null);
    await updateCallStatus(call.callId, CALL_STATUS.ACCEPTED);
    navigate('Call', { callId: call.callId, role: 'callee' });
  }, [incomingCall]);

  const declineCall = useCallback(async () => {
    if (!incomingCall) return;
    const call = incomingCall;
    setIncomingCall(null);
    await updateCallStatus(call.callId, CALL_STATUS.DECLINED);
  }, [incomingCall]);

  const value = { startCall, acceptCall, declineCall, incomingCall, isCallingSupported };

  return (
    <CallContext.Provider value={value}>
      {children}
      <IncomingCallModal
        call={incomingCall}
        onAccept={acceptCall}
        onDecline={declineCall}
      />
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}
