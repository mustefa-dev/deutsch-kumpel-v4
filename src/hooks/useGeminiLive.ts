import { useState, useRef, useCallback } from 'react';
import { AudioStreamer } from '../lib/audioStreamer';

const GEMINI_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

export function useGeminiLive(systemInstruction: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);

  const connect = useCallback(async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AQ.Ab8RN6JBieN6u7xKXZQ6z-9QGOr0ZkH0TrfT6g495BW1FEwSxQ";
      const url = `\${GEMINI_WS_URL}?key=\${apiKey}`;
      
      wsRef.current = new WebSocket(url);
      streamerRef.current = new AudioStreamer();

      wsRef.current.onopen = () => {
        setIsConnected(true);
        // Send initial setup with system prompt
        wsRef.current?.send(JSON.stringify({
          setup: {
            model: "models/gemini-2.0-flash-exp",
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            }
          }
        }));
        startRecording();
      };

      wsRef.current.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          const text = await event.data.text();
          handleServerMessage(JSON.parse(text));
        } else {
          handleServerMessage(JSON.parse(event.data));
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        stopRecording();
      };
    } catch (e) {
      console.error("Gemini Live connection failed", e);
    }
  }, [systemInstruction]);

  const handleServerMessage = (data: any) => {
    if (data.serverContent?.modelTurn?.parts) {
      for (const part of data.serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          setIsSpeaking(true);
          streamerRef.current?.playPCM16Base64(part.inlineData.data);
          setTimeout(() => setIsSpeaking(false), 500); // Hacky fallback for speaking state
        }
        if (part.text) {
          setTranscript(prev => prev + part.text);
        }
      }
    }
  };

  const startRecording = async () => {
    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      await audioContextRef.current.audioWorklet.addModule('/worklets/audio-recorder.js');
      
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      const processor = new AudioWorkletNode(audioContextRef.current, 'audio-recorder-worklet');
      
      processor.port.onmessage = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          // Convert Int16Array to base64
          const buffer = e.data;
          let binary = '';
          const bytes = new Uint8Array(buffer.buffer);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Audio = btoa(binary);
          
          wsRef.current.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: "audio/pcm;rate=16000",
                data: base64Audio
              }]
            }
          }));
        }
      };
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const disconnect = useCallback(() => {
    stopRecording();
    wsRef.current?.close();
    wsRef.current = null;
    streamerRef.current?.stopAll();
    setIsConnected(false);
  }, []);

  const stopRecording = () => {
    audioContextRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
  };

  // Barge-in (Interruption)
  const interrupt = () => {
    streamerRef.current?.stopAll();
    // Send cancellation to Gemini
    wsRef.current?.send(JSON.stringify({
      clientContent: {
        turnComplete: true,
        turns: [] 
      }
    }));
  };

  return { connect, disconnect, isConnected, isSpeaking, transcript, interrupt };
}
