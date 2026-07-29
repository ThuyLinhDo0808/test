from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()


# TODO: One problem I am too lazy to change is currently, the websocket opens by clicking the record button (which also starts the mic)
# The actual page should not do this
@router.get("/ws/", response_class=HTMLResponse)
async def websocket_test_page():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Real-Time Voice Chat</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Inter:400,500,700&display=swap">
    <style>
        :root {
        /* Colors for a serious and neat look */
        --primary: #2c3e50;               /* Deep slate */
        --secondary: #e0e0e0;             /* Light gray */
        --bubble-user: #2c3e50;           /* User message bubble */
        --bubble-user-text: #ffffff;      /* White text for user bubble */
        --bubble-assistant: #dcdcdc;      /* Assistant message bubble */
        --bubble-assistant-text: #333333; /* Dark gray text for assistant bubble */
        --bg: #f4f4f4;                    /* Very light gray page background */
        --shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        html, body {
        height: 100%;
        margin: 0;
        padding: 0;
        }
        body {
        font-family: 'Inter', Arial, sans-serif;
        background: url("static/background.jpg") no-repeat center center fixed;
        background-size: cover;
        color: #222;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        }
        #app {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: stretch;
        min-height: 100vh;
        }
        .chat-container {
        flex: 1;
        max-width: 480px;
        width: 100%;
        background: #fff;
        box-shadow: var(--shadow);
        margin: 24px 0;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        }
        .header {
        background: var(--primary);
        color: #fff;
        padding: 18px 24px;
        font-size: 1.25rem;
        letter-spacing: 1px;
        font-weight: 500;
        border-top-left-radius: 16px;
        border-top-right-radius: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        }
        .status {
        font-size: 0.9rem;
        color: #c0c0c0;
        margin-left: auto;
        }
        .messages {
        flex: 1;
        padding: 20px 16px 16px 16px;
        overflow-y: auto;
        background: var(--bg);
        display: flex;
        flex-direction: column;
        gap: 16px;
        }
        .bubble {
        padding: 12px 16px;
        border-radius: 16px;
        max-width: 82%;
        font-size: 1.02rem;
        line-height: 1.6;
        position: relative;
        display: inline-block;
        word-break: break-word;
        box-shadow: 0 0.5px 2px rgba(44,62,80,0.1);
        }
        .bubble.user {
        background: var(--bubble-user);
        color: var(--bubble-user-text);
        align-self: flex-end;
        border-bottom-right-radius: 4px;
        margin-left: auto;
        }
        .bubble.assistant {
        background: var(--bubble-assistant);
        color: var(--bubble-assistant-text);
        align-self: flex-start;
        border-bottom-left-radius: 4px;
        margin-right: auto;
        }
        /* Updated typing bubble to a simpler, lighter color */
        .bubble.typing {
        background: #ebedef;
        color: #444;
        font-style: italic;
        opacity: 0.9;
        animation: pulsebg 1.3s linear infinite;
        min-width: 60px;
        border-radius: 16px;
        }
        @keyframes pulsebg {
        0% { opacity: 0.8; }
        50% { opacity: 1; }
        100% { opacity: 0.8; }
        }
        .input-bar {
        display: flex;
        padding: 12px 12px;
        background: #fff;
        border-top: 1px solid #e1e5ef;
        align-items: center;
        gap: 8px;
        }
        .input-bar button {
        appearance: none;
        outline: none;
        border: none;
        padding: 8px 18px;
        background: var(--primary);
        color: #fff;
        font-size: 1rem;
        border-radius: 7px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.2s;
        margin-left: 4px;
        }
        .input-bar button:active {
        background: #203a4a;
        }
        .input-bar button:disabled {
        background: #a0a0a0;
        cursor: default;
        }
        @media (max-width: 600px) {
        .chat-container {
            margin: 0;
            border-radius: 0;
            max-width: 100vw;
        }
        .header {
            border-radius: 0;
        }
        }
        .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 24px;
        border: none;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        font-weight: 500;
        font-size: 16px;
        cursor: pointer;
        color: white;
        transition: all 0.2s ease;
        }

        .btn svg {
        margin: 0;
        }

        .start-btn {
        background-color: #2a3543;
        }

        .stop-btn {
        background-color: #c04949;
        }

        .reset-btn {
        background-color: #0d65d0;
        }

        .btn:hover {
        opacity: 0.9;
        }

        .btn:active {
        transform: scale(0.98);
        }    
        .text-input-area {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .text-input {
          flex: 1;
          padding: 8px;
          font-size: 14px;
          border: 1px solid #ccc;
          border-radius: 6px;
        }

        .send-btn {
          padding: 8px;
        }
    </style>
    </head>
    <body>
    <div id="app">
        <div class="chat-container">
        <div class="header">
            <!-- Centered “AI” text within the circle -->
            <svg height="24" width="24" viewBox="0 0 22 22" fill="#fff" style="margin-right:8px">
            <circle cx="11" cy="11" r="12" fill="#222F3D" />
            <text
                x="50%"
                y="50%"
                fill="#fff"
                text-anchor="middle"
                alignment-baseline="middle"
                font-size="12"
                font-family="Inter"
            >AI</text>
            </svg>
            Real-Time Voice Chat
            <span class="status" id="status"></span>
        </div>
        <div class="messages" id="messages"></div>
        <div class="input-bar">
            <div class="text-input-area">
              <input type="text" id="textInput" placeholder="Type your message..." class="text-input" />
              <button id="sendTextBtn" class="btn send-btn" title="Send text message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 12L20 4L13 11L20 20L4 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>

            <br>

            <button id="startBtn" title="Start voice chat" class="btn start-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5L8 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M8 5L18 12L8 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            </button>
            
            <button id="stopBtn" title="Stop voice chat" class="btn stop-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="12" height="12" rx="1" stroke="currentColor" stroke-width="2"/>
            </svg>
            </button>
        </button>

        </div>
        </div>
        
        <div id="securityCheckModal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.35); z-index:1000; align-items:center; justify-content:center;">
          <div style="background:#fff; padding:32px; border-radius:12px; min-width:320px; box-shadow:0 4px 24px rgba(0,0,0,0.18);">
            <h3>Security Check</h3>
            <form id="securityCheckForm">
              <label>Card ID: <input type="text" id="sec_card_id" required /></label><br>
              <label>Name: <input type="text" id="sec_name" required /></label><br>
              <label>Date of Birth: <input type="date" id="sec_dob" required /></label><br>
              <label>Liveness Status:
                <select id="sec_liveness">
                  <option value="true">Live</option>
                  <option value="false">Not Live</option>
                </select>
              </label><br>
              <button type="submit" class="btn start-btn">Submit</button>
              <button type="button" id="sec_cancel" class="btn stop-btn" style="margin-left:8px;">Cancel</button>
            </form>
          </div>
        </div>
        <div id="securityResult" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.35); z-index:1001; align-items:center; justify-content:center;">
          <div style="background:#fff; padding:32px; border-radius:12px; min-width:320px; box-shadow:0 4px 24px rgba(0,0,0,0.18);">
            <div id="securityResultContent"></div>
            <button onclick="document.getElementById('securityResult').style.display='none'" class="btn start-btn" style="margin-top:16px;">Close</button>
          </div>
        </div>
    </div>
    <script>
const securityCheckModal = document.getElementById("securityCheckModal");
const securityCheckForm = document.getElementById("securityCheckForm");
const securityResult = document.getElementById("securityResult");
const securityResultContent = document.getElementById("securityResultContent");
let securityCheckCancel = document.getElementById("sec_cancel");

function showSecurityCheck() {
  securityCheckModal.style.display = "flex";
  securityCheckForm.reset();
}
function hideSecurityCheck() {
  securityCheckModal.style.display = "none";
}
function showSecurityResult(html) {
  securityResultContent.innerHTML = html;
  securityResult.style.display = "flex";
}
function hideSecurityResult() {
  securityResult.style.display = "none";
}

// Handle security check form submit
securityCheckForm.onsubmit = async function(e) {
  e.preventDefault();
  const card_id = document.getElementById("sec_card_id").value;
  const name = document.getElementById("sec_name").value;
  const dobInput = document.getElementById("sec_dob").value;
  const dob = dobInput ? dobInput + "T00:00:00" : "";
  const liveness_status = document.getElementById("sec_liveness").value === "true";
  try {
    await fetch("http://localhost:8000/api/chat/chatbot/security/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cancel: false,
        liveness: liveness_status,
        card_id: card_id,
        name: name,
        dob: dob
      })
    });
    hideSecurityCheck();
  } catch (err) {
    alert("Failed to submit security check.");
  }
};

// Handle cancel
securityCheckCancel.onclick = function() {
  // Get today date in YYYY-MM-DD format
  fetch("http://localhost:8000/api/chat/chatbot/security/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cancel: true,
      card_id: null,
      name: null,
      dob: null,
      liveness: false
    })
  });
  hideSecurityCheck();
};

(function() {
  const originalLog = console.log.bind(console);
  console.log = (...args) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    originalLog(
      `[${hh}:${mm}:${ss}.${ms}]`,
      ...args
    );
  };
})();

const statusDiv = document.getElementById("status");
const messagesDiv = document.getElementById("messages");

let socket = null;
let audioContext = null;
let mediaStream = null;
let micWorkletNode = null;
let ttsWorkletNode = null;

let isTTSPlaying = false;
let ignoreIncomingTTS = false;

let chatHistory = [];
let typingUser = "";
let typingAssistant = "";

// --- batching + fixed 8‑byte header setup ---
const BATCH_SAMPLES = 2048;
const HEADER_BYTES  = 8;
const FRAME_BYTES   = BATCH_SAMPLES * 2;
const MESSAGE_BYTES = HEADER_BYTES + FRAME_BYTES;

const bufferPool = [];
let batchBuffer = null;
let batchView = null;
let batchInt16 = null;
let batchOffset = 0;

function initBatch() {
  if (!batchBuffer) {
    batchBuffer = bufferPool.pop() || new ArrayBuffer(MESSAGE_BYTES);
    batchView   = new DataView(batchBuffer);
    batchInt16  = new Int16Array(batchBuffer, HEADER_BYTES);
    batchOffset = 0;
    console.log("Init batch")
  }
  console.log("Not complete Init batch")
}

function flushBatch() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    // Don't send if socket is not open
    return;
  }
  const ts = Date.now() & 0xFFFFFFFF;
  batchView.setUint32(0, ts, false);
  const flags = isTTSPlaying ? 1 : 0;
  batchView.setUint32(4, flags, false);

  socket.send(batchBuffer);

  bufferPool.push(batchBuffer);
  batchBuffer = null;
}

function flushRemainder() {
  if (batchOffset > 0) {
    for (let i = batchOffset; i < BATCH_SAMPLES; i++) {
      batchInt16[i] = 0;
    }
    flushBatch();
  }
}

function initAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
}

function base64ToInt16Array(b64) {
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) {
    view[i] = raw.charCodeAt(i);
  }
  return new Int16Array(buf);
}

async function startRawPcmCapture() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: { ideal: 24000 },
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      }
    });
    mediaStream = stream;
    initAudioContext();

    // Inline the PCMWorkletProcessor
    const pcmProcessorCode = `
      class PCMWorkletProcessor extends AudioWorkletProcessor {
        process(inputs) {
          const in32 = inputs[0][0];
          if (in32) {
            const int16 = new Int16Array(in32.length);
            for (let i = 0; i < in32.length; i++) {
              let s = in32[i];
              s = s < -1 ? -1 : s > 1 ? 1 : s;
              int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            this.port.postMessage(int16.buffer, [int16.buffer]);
          }
          return true;
        }
      }

      registerProcessor('pcm-worklet-processor', PCMWorkletProcessor);
    `;
    const blob = new Blob([pcmProcessorCode], { type: "application/javascript" });
    const moduleURL = URL.createObjectURL(blob);
    await audioContext.audioWorklet.addModule(moduleURL);

    micWorkletNode = new AudioWorkletNode(audioContext, 'pcm-worklet-processor');

    micWorkletNode.port.onmessage = ({ data }) => {
      const incoming = new Int16Array(data);
      let read = 0;
      while (read < incoming.length) {
        initBatch();
        const toCopy = Math.min(
          incoming.length - read,
          BATCH_SAMPLES - batchOffset
        );
        batchInt16.set(
          incoming.subarray(read, read + toCopy),
          batchOffset
        );
        batchOffset += toCopy;
        read += toCopy;
        if (batchOffset === BATCH_SAMPLES) {
          flushBatch();
        }
      }
    };

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(micWorkletNode);
    statusDiv.textContent = "Recording...";
  } catch (err) {
    statusDiv.textContent = "Mic access denied.";
    console.error(err);
  }
}

// sets up a custom audio playback pipeline for handling streaming TTS (text-to-speech) audio
// Receive raw PCM audio buffers
// Stream them to the browser’s audio output using a custom AudioWorklet processor (TTSPlaybackProcessor).
// Emit playback lifecycle events (ttsPlaybackStarted / ttsPlaybackStopped) so the frontend and backend can stay synchronized. 
async function setupTTSPlayback() {
  const processorCode = `
    class TTSPlaybackProcessor extends AudioWorkletProcessor {
      constructor() {
        super();
        this.bufferQueue = [];
        this.readOffset = 0;
        this.samplesRemaining = 0;
        this.isPlaying = false;

        this.port.onmessage = (event) => {
          if (event.data && typeof event.data === "object" && event.data.type === "clear") {
            this.bufferQueue = [];
            this.readOffset = 0;
            this.samplesRemaining = 0;
            this.isPlaying = false;
            return;
          }
          this.bufferQueue.push(event.data);
          this.samplesRemaining += event.data.length;
        };
      }

      process(inputs, outputs) {
        const outputChannel = outputs[0][0];

        if (this.samplesRemaining === 0) {
          outputChannel.fill(0);
          if (this.isPlaying) {
            this.isPlaying = false;
            this.port.postMessage({ type: 'ttsPlaybackStopped' });
          }
          return true;
        }

        if (!this.isPlaying) {
          this.isPlaying = true;
          this.port.postMessage({ type: 'ttsPlaybackStarted' });
        }

        let outIdx = 0;
        while (outIdx < outputChannel.length && this.bufferQueue.length > 0) {
          const currentBuffer = this.bufferQueue[0];
          const sampleValue = currentBuffer[this.readOffset] / 32768;
          outputChannel[outIdx++] = sampleValue;

          this.readOffset++;
          this.samplesRemaining--;

          if (this.readOffset >= currentBuffer.length) {
            this.bufferQueue.shift();
            this.readOffset = 0;
          }
        }

        while (outIdx < outputChannel.length) {
          outputChannel[outIdx++] = 0;
        }

        return true;
      }
    }

    registerProcessor('tts-playback-processor', TTSPlaybackProcessor);
  `;

  const blob = new Blob([processorCode], { type: "application/javascript" });
  const moduleURL = URL.createObjectURL(blob);
  await audioContext.audioWorklet.addModule(moduleURL);

  ttsWorkletNode = new AudioWorkletNode(audioContext, 'tts-playback-processor');

  ttsWorkletNode.port.onmessage = (event) => {
    const { type } = event.data;
    if (type === 'ttsPlaybackStarted') {
      if (!isTTSPlaying && socket && socket.readyState === WebSocket.OPEN) {
        isTTSPlaying = true;
        console.log("TTS playback started. Reason: ttsWorkletNode Event ttsPlaybackStarted.");
        socket.send(JSON.stringify({ type: 'tts_start' }));
      }
    } else if (type === 'ttsPlaybackStopped') {
      if (isTTSPlaying && socket && socket.readyState === WebSocket.OPEN) {
        isTTSPlaying = false;
        console.log("TTS playback stopped. Reason: ttsWorkletNode Event ttsPlaybackStopped.");
         socket.send(JSON.stringify({ type: 'tts_stop' }));
      }
    }
  };

  ttsWorkletNode.connect(audioContext.destination);
}


function cleanupAudio() {
  if (micWorkletNode) {
    micWorkletNode.disconnect();
    micWorkletNode = null;
  }
  if (ttsWorkletNode) {
    ttsWorkletNode.disconnect();
    ttsWorkletNode = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (mediaStream) {
    mediaStream.getAudioTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

// Dynamically rendering the chat UI by updating the DOM
function renderMessages() {
  messagesDiv.innerHTML = "";
  chatHistory.forEach(msg => {
    const bubble = document.createElement("div");
    bubble.className = `bubble ${msg.role}`;
    bubble.textContent = msg.content;
    messagesDiv.appendChild(bubble);
  });
  if (typingUser) {
    const typing = document.createElement("div");
    typing.className = "bubble user typing";
    typing.innerHTML = typingUser + '<span style="opacity:.6;">✏️</span>';
    messagesDiv.appendChild(typing);
  }
  if (typingAssistant) {
    const typing = document.createElement("div");
    typing.className = "bubble assistant typing";
    typing.innerHTML = typingAssistant + '<span style="opacity:.6;">✏️</span>';
    messagesDiv.appendChild(typing);
  }
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}


function handleJSONMessage({ type, content }) {
  if (type === "security_check_request") {
    showSecurityCheck();
    hideSecurityResult();
    return;
  }
  if (type === "security_op_completed") {
    hideSecurityCheck();
    let html = "";
    if (content && content.success) {
      // Show permission data (access code, qr_hash)
      html = `<b>Access Granted!</b><br>
        <b>Access Code:</b> ${content.data?.access_code ?? "N/A"}<br>
        <b>QR Hash:</b> ${content.data?.qr_hash ?? "N/A"}`;
    } else {
      html = `<b style="color:red;">Access Denied</b>`;
    }
    showSecurityResult(html);
    return;
  }
  if (type === "partial_user_request") {
    console.log("Partial user request received:", content);
    typingUser = content?.trim() ? escapeHtml(content) : "";
    renderMessages();
    return;
  }
  if (type === "final_user_request") {
    if (content?.trim()) {
      // If last message is user, replace it; else, push new
      if (
        chatHistory.length > 0 &&
        chatHistory[chatHistory.length - 1].role === "user"
      ) {
        chatHistory[chatHistory.length - 1].content = content;
      } else {
        chatHistory.push({ role: "user", content, type: "final" });
      }
    }
    typingUser = "";
    renderMessages();
    return;
  }
  if (type === "partial_assistant_answer") {
    typingAssistant = content?.trim() ? escapeHtml(content) : "";
    console.log("Partial assistant answer received:", content);
    renderMessages();
    return;
  }
  if (type === "final_assistant_answer") {
    if (content?.trim()) {
      chatHistory.push({ role: "assistant", content, type: "final" });
    }
    typingAssistant = "";
    renderMessages();
    return;
  }
  if (type === "tts_chunk") {
    if (ignoreIncomingTTS) return;
    const int16Data = base64ToInt16Array(content);
    if (ttsWorkletNode) {
      ttsWorkletNode.port.postMessage(int16Data);
    }
    return;
  }
  if (type === "tts_interruption") {
    if (ttsWorkletNode) {
      ttsWorkletNode.port.postMessage({ type: "clear" });
    }
    isTTSPlaying = false;
    ignoreIncomingTTS = false;
    return;
  }
  if (type === "stop_tts") {
    if (ttsWorkletNode) {
      ttsWorkletNode.port.postMessage({ type: "clear" });
    }
    isTTSPlaying = false;
    ignoreIncomingTTS = true;
    console.log("TTS playback stopped. Reason: tts_interruption.");
    socket.send(JSON.stringify({ type: 'tts_stop' }));
    return;
  }
  if (type === "word_timing") {
    // Handle word timing data for lipsync
    //console.log("Word timing data received:", content);
    return;
  }
}


function escapeHtml(str) {
  return (str ?? '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&quot;");
}

// UI Controls

document.getElementById("startBtn").onclick = async () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    statusDiv.textContent = "Already recording.";
    return;
  }
  statusDiv.textContent = "Initializing connection...";

  socket = new WebSocket("ws://localhost:8000/api/chat/chatbot/");

  socket.onopen = async () => {
    statusDiv.textContent = "Connected. Activating mic and TTS…";
    await startRawPcmCapture();
    await setupTTSPlayback();
  };

  socket.onmessage = (evt) => {
    if (typeof evt.data === "string") {
      try {
        const msg = JSON.parse(evt.data);
        handleJSONMessage(msg);
      } catch (e) {
        console.error("Error parsing message:", e);
      }
    }
  };

  socket.onclose = () => {
    statusDiv.textContent = "Connection closed.";
    flushRemainder();
    cleanupAudio();
  };

  socket.onerror = (err) => {
    statusDiv.textContent = "Connection error.";
    cleanupAudio();
    console.error(err);
  };
};

document.getElementById("stopBtn").onclick = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        flushRemainder();
        socket.close();
    }
    cleanupAudio();
    statusDiv.textContent = "Recording stopped.";
};

// implementing the text input functionality
document.getElementById("sendTextBtn").onclick = () => {
  const input = document.getElementById("textInput");
  const query = input.value.trim();

  if (!query) return;

  if (socket && socket.readyState === WebSocket.OPEN) {
    const message = {
      type: "text_query",
      query: query
    };
    socket.send(JSON.stringify(message));
    console.log("Sent text_query:", query);
    input.value = ""; // clear input after sending
  } else {
    statusDiv.textContent = "Socket not connected.";
  }
};

document.getElementById("textInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    document.getElementById("sendTextBtn").click();
  }
});


// First render
renderMessages();

    </script>
    </body>
    </html>
    """


@router.get("/faq-test/", response_class=HTMLResponse)
async def faq_test_page():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>FAQ Test Page</title>
        <style>
            body { font-family: sans-serif; padding: 20px; }
            input, textarea, button { display: block; margin: 10px 0; width: 100%; }
            pre { background: #f0f0f0; padding: 10px; border: 1px solid #ccc; }
        </style>
    </head>
    <body>
        <h1>FAQ API Test</h1>

        <h3>Create FAQ</h3>
        <input type="text" id="question" placeholder="Question" />
        <textarea id="answer" placeholder="Answer"></textarea>
        <button onclick="createFAQ()">Create FAQ</button>

        <h3>All FAQs</h3>
        <button onclick="fetchFAQs()">Get FAQs</button>
        <pre id="faqList"></pre>

        <h3>Delete FAQ</h3>
        <input type="text" id="deleteId" placeholder="FAQ ID to delete" />
        <button onclick="deleteFAQ()">Delete</button>

        <h3>Update FAQ</h3>
        <input type="text" id="updateId" placeholder="FAQ ID to update" />
        <input type="text" id="updateQuestion" placeholder="New Question" />
        <textarea id="updateAnswer" placeholder="New Answer"></textarea>
        <button onclick="updateFAQ()">Update</button>

        <script>
            async function fetchFAQs() {
                const res = await fetch("/api/admin/faqs/");
                const data = await res.json();
                document.getElementById("faqList").textContent = JSON.stringify(data, null, 2);
            }

            async function createFAQ() {
                const question = document.getElementById("question").value;
                const answer = document.getElementById("answer").value;
                const res = await fetch("/api/admin/faqs/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ question, answer })
                });
                const data = await res.json();
                alert("Created FAQ: " + JSON.stringify(data));
                fetchFAQs();
            }

            async function deleteFAQ() {
                const id = document.getElementById("deleteId").value;
                await fetch(`/api/admin/faqs/${id}/`, { method: "DELETE" });
                alert("Deleted FAQ with ID: " + id);
                fetchFAQs();
            }

            async function updateFAQ() {
                const id = document.getElementById("updateId").value;
                const question = document.getElementById("updateQuestion").value;
                const answer = document.getElementById("updateAnswer").value;
                const res = await fetch(`/api/admin/faqs/${id}/`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ question, answer })
                });
                const data = await res.json();
                alert("Updated FAQ: " + JSON.stringify(data));
                fetchFAQs();
            }
        </script>
    </body>
    </html>
    """


@router.get("/vector-ui/", response_class=HTMLResponse)
async def vector_ui_test_page():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Vector Store API Test</title>
        <style>
            body { font-family: sans-serif; margin: 20px; }
            input, button { margin: 5px 0; }
            pre { background: #f3f3f3; padding: 10px; border: 1px solid #ccc; }
            table, th, td { border: 1px solid black; border-collapse: collapse; padding: 8px; }
        </style>
    </head>
    <body>
        <h1>📤 Upload Document</h1>
        <form id="upload-form">
            <input type="file" id="file-input" name="file" required />
            <button type="submit">Upload</button>
        </form>

        <hr>

        <h1>🗑 Delete Document</h1>
        <input type="text" id="delete-name" placeholder="Enter file name" />
        <button onclick="deleteDoc()">Delete</button>

        <hr>

        <h1>📄 All Documents</h1>
        <button onclick="getAllDocs()">Fetch All</button>
        <pre id="docs-output"></pre>
        
        <hr>

        <h1>📋 All Upload Tasks</h1>
        <button onclick="getAllTasks()">Fetch All Tasks</button>
        <button onclick="deleteAllSuccessTasks()"> Delete All Success Tasks</button>
        <button onclick="getPendingTasks()"> Get Pending Tasks</button>
        <table>
            <thead>
                <tr>
                    <th>Task ID</th>
                    <th>File Name</th>
                    <th>File Size</th>
                    <th>File Type</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody id="task-list"></tbody>
        </table>

        <hr>

        <h1>📋 Upload Task</h1>
        <table id="table">
            <thead>
                <tr>
                    <th>Task ID</th>
                    <th>Status</th>
                    <th>Result</th>
                </tr>
            </thead>
            <tbody id="tasks"></tbody>
        </table>

        <script>
            document.getElementById("upload-form").addEventListener("submit", async function(event) {
                event.preventDefault();
                const fileInput = document.getElementById("file-input");
                const file = fileInput.files[0];
                const formData = new FormData();
                formData.append("file", file);

                try {
                    const res = await fetch("/api/admin/doc/upload_doc/", {
                        method: "POST",
                        body: formData,
                    });

                    const data = await res.json();
                    if (res.ok && data.task_id) {
                        alert("Upload started: " + data.task_id);
                        console.log("Status:" + data )
                        getStatus(data.task_id);
                    } else {
                        console.error("Upload failed:", data);
                        alert("Upload failed: " + (data.detail || "Unknown error"));
                    }
                } catch (err) {
                    console.error("Upload error:", err);
                }
            });

            async function deleteDoc() {
                const fileName = document.getElementById("delete-name").value;
                const res = await fetch(`/api/admin/doc/delete_doc/${fileName}/`, { method: "DELETE" });
                const data = await res.json();
                alert("Deleted: " + JSON.stringify(data));
            }

            async function getAllDocs() {
                const res = await fetch("/api/admin/doc/all_docs/");
                const data = await res.json();
                document.getElementById("docs-output").textContent = JSON.stringify(data, null, 2);
            }

            async function getStatus(taskID) {
                try {
                    const res = await fetch(`/api/admin/doc/get_task/${taskID}/`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });

                    const data = await res.json();

                    const html = `
                        <tr>
                            <td>${taskID}</td>
                            <td>${data.task_status}</td>
                            <td>${data.task_result || "N/A"}</td>
                        </tr>
                    `;

                    const row = document.createElement("tr");
                    row.innerHTML = html;
                    document.getElementById("tasks").prepend(row);

                    if (data.task_status !== "SUCCESS" && data.task_status !== "FAILURE") {
                        setTimeout(() => getStatus(taskID), 1000);
                        console.log("Task still running, checking again in 1 second...");
                    }
                } catch (err) {
                    console.error("Status check error:", err);
                }
            }

            async function getAllTasks() {
                try {
                    const res = await fetch("/api/admin/doc/get_all_tasks/");
                    const data = await res.json();
                    const tbody = document.getElementById("task-list");
                    tbody.innerHTML = "";
                    console.log("Tasks:", data);

                    data.tasks.forEach(task => {
                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td>${task.task_id}</td>
                            <td>${task.file_name}</td>
                            <td>${task.file_size}</td>
                            <td>${task.file_type}</td>
                            <td>${task.status}</td>
                        `;
                        tbody.appendChild(row);
                    });
                } catch (err) {
                    console.error("Error fetching tasks:", err);
                }
            }


            async function deleteAllSuccessTasks(){
                if (!confirm("Are you sure you want to delete all success tasks? This action cannot be undone.")) return;

                try {
                    const res = await fetch("/api/admin/doc/delete_success_tasks/", {
                        method: "DELETE"
                    });
                    const result = await res.json();
                    alert(result.message || "All tasks deleted.");
                    getAllTasks(); // Refresh the list
                } catch (err) {
                    console.error("Error deleting tasks:", err);
                    alert("Failed to delete tasks.");
                }
            }

            async function getPendingTasks() {
                try {
                    const res = await fetch("/api/admin/doc/pending_tasks/");
                    const data = await res.json();
                    const tbody = document.getElementById("task-list");
                    tbody.innerHTML = "";  // Clear existing rows

                    if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
                        data.tasks.forEach(task => {
                            const row = document.createElement("tr");
                            row.innerHTML = `
                                <td>${task.task_id}</td>
                                <td>${task.file_name}</td>
                                <td>${task.file_type}</td>
                                <td>${task.status}</td>
                            `;
                            tbody.appendChild(row);
                        });
                    } else {
                        const row = document.createElement("tr");
                        row.innerHTML = `<td colspan="4">No pending tasks found.</td>`;
                        tbody.appendChild(row);
                    }
                } catch (err) {
                    console.error("Error fetching pending tasks:", err);
                    alert("Failed to fetch pending tasks.");
                }
            }
        </script>
    </body>
    </html>
    """


@router.get("/security-test/", response_class=HTMLResponse)
async def security_test_page():
    return """
    <!DOCTYPE html>
    <html>
        <head>
            <title>Security Visitor Test</title>
            <style>
                body { font-family: sans-serif; margin: 20px; }
                input, select { margin-bottom: 10px; display: block; padding: 6px; width: 300px; }
                label { font-weight: bold; }
                #result, #all_visitors { margin-top: 20px; padding: 10px; border: 1px solid #ccc; background: #f3f3f3; white-space: pre-wrap; }
            </style>
        </head>
        <body>
            <h2>Insert Visitor</h2>
            <input id="name" placeholder="Name" />
            <input id="dob" type="date" placeholder="Date of Birth" />

            <input id="card_id" placeholder="Card ID" />
            <input id="purpose" placeholder="Purpose" />
            <button onclick="submitVisitor()">Submit</button>
            <pre id="result"></pre>

            <h2>Get All Visitors</h2>
            <button onclick="fetchAllVisitors()">Fetch All Visitors</button>
            <pre id="all_visitors"></pre>

            <h2>Update Visitor by ID</h2>
            <input id="update_id" placeholder="Visitor ID" type="number" />
            <input id="update_name" placeholder="New Name" />
            <input id="update_dob" type="date" placeholder="New Date of Birth" />
            <input id="update_purpose" placeholder="New Purpose" />
            <button onclick="updateVisitorById()">Update</button>
            <pre id="update_result_by_id"></pre>

            <h2>Delete Visitor by ID</h2>
            <input id="delete_id" type="number" placeholder="Visitor ID" />
            <button onclick="deleteVisitorById()">Delete</button>
            <pre id="delete_result_by_id"></pre>

            <script>
                async function submitVisitor() {
                const data = {
                    name: document.getElementById("name").value,
                    dob: document.getElementById("dob").value,
                    card_id: document.getElementById("card_id").value,
                    purpose: document.getElementById("purpose").value,
                };

                const res = await fetch("/api/admin/visitors/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });

                const json = await res.json();
                document.getElementById("result").textContent = JSON.stringify(json, null, 2);
                }

                async function fetchAllVisitors() {
                const res = await fetch("/api/admin/visitors/");
                const json = await res.json();
                document.getElementById("all_visitors").textContent = JSON.stringify(json, null, 2);
                }

                async function updateVisitorById() {
                const data = {
                    id: parseInt(document.getElementById("update_id").value),
                    name: document.getElementById("update_name").value || undefined,
                    dob: document.getElementById("update_dob").value || undefined,
                    purpose: document.getElementById("update_purpose").value || undefined,
                };

                Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

                const res = await fetch("/api/admin/visitors/update_by_id/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });

                const json = await res.json();
                document.getElementById("update_result_by_id").textContent = JSON.stringify(json, null, 2);
                }

                async function deleteVisitorById() {
                const data = {
                    id: parseInt(document.getElementById("delete_id").value),
                };

                const res = await fetch("/api/admin/visitors/delete_by_id/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });

                const json = await res.json();
                document.getElementById("delete_result_by_id").textContent = JSON.stringify(json, null, 2);
                }
            </script>
            </body>


    </html>
    """


@router.get("/workflow-ui/", response_class=HTMLResponse)
async def workflow_ui_test_page():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Workflow Metadata Viewer</title>
        <style>
            body { font-family: sans-serif; padding: 2rem; background: #f9f9f9; color: #333; }
            h1 { font-size: 1.8rem; }
            h2 { margin-top: 2rem; }
            pre { background: #eee; padding: 1rem; border-radius: 5px; overflow-x: auto; }
            button { margin-top: 1rem; padding: 0.5rem 1rem; }
        </style>
    </head>
    <body>
        <h1>Workflow Metadata Viewer</h1>
        <p>This page fetches node and edge metadata from your FastAPI backend and displays it.</p>
        <button onclick="loadMetadata()">Load Metadata</button>

        <div>
            <h2>Registered Nodes</h2>
            <pre id="nodes">Click "Load Metadata" to fetch.</pre>
        </div>

        <div>
            <h2>Registered Edges</h2>
            <pre id="edges">Click "Load Metadata" to fetch.</pre>
        </div>

        <script>
            async function loadMetadata() {
                const nodesEl = document.getElementById("nodes");
                const edgesEl = document.getElementById("edges");

                try {
                    const [nodesResp, edgesResp] = await Promise.all([
                        fetch("/api/admin/workflow/metadata/nodes/"),
                        fetch("/api/admin/workflow/metadata/edges/")
                    ]);

                    const nodesData = await nodesResp.json();
                    const edgesData = await edgesResp.json();

                    nodesEl.textContent = JSON.stringify(nodesData, null, 2);
                    edgesEl.textContent = JSON.stringify(edgesData, null, 2);
                } catch (error) {
                    nodesEl.textContent = "Error loading nodes: " + error;
                    edgesEl.textContent = "Error loading edges: " + error;
                }
            }
        </script>
    </body>
    </html>
    """


@router.get("/stream/", response_class=HTMLResponse)
async def stream_test():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Aura WebSocket Test</title>
        <style>
            body { font-family: sans-serif; padding: 20px; }
            #output { white-space: pre-wrap; border: 1px solid #ccc; padding: 10px; margin-top: 10px; min-height: 50px; }
        </style>
    </head>
    <body>
        <h1>Chat with Aura (WebSocket Test)</h1>
        <input id="message" type="text" placeholder="Type your message..." />
        <button onclick="sendMessage()">Send</button>
        <div id="output"></div>

        <script>
            const ws = new WebSocket("ws://localhost:8000/api/chat/chatbot/stream/"); // change port/route if needed
            const output = document.getElementById("output");

            ws.onmessage = function(event) {
                output.insertAdjacentText("beforeend", event.data);
                output.scrollTop = output.scrollHeight;
            };

            function sendMessage() {
                const input = document.getElementById("message");
                output.textContent = "";
                ws.send(input.value);
                input.value = "";
            }

            ws.onerror = function(err) {
                console.error("WebSocket error:", err);
            };
        </script>
    </body>
    </html>
    """


@router.get("/vision-test/", response_class=HTMLResponse)
async def vision_test_page():
    return HTMLResponse(
        """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Vision Test: Eye Tracking & Liveness</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { color-scheme: dark light; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; background: #0b0c10; color: #e5e7eb;}
    h1 { margin: 0 0 16px; font-size: 20px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .card { background: #111318; border: 1px solid #2a2e37; border-radius: 12px; padding: 16px; }
    label { display:block; margin: 10px 0 6px; font-size: 13px; color: #aab0bb; }
    input[type="range"] { width: 100%; }
    button { cursor: pointer; background:#2563eb; color:white; border:none; padding:10px 14px; border-radius:8px; }
    button.secondary { background:#374151; }
    .stat { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color:#a5b4fc; }
    video, canvas { width: 100%; max-height: 300px; background:#000; border-radius:8px; }
    pre { white-space: pre-wrap; word-wrap: break-word; background:#0f172a; color:#d1d5db; padding:12px; border-radius:8px; border:1px solid #243045; max-height:260px; overflow:auto;}
    .row-3 { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px;}
  </style>
</head>
<body>
  <h1>Vision Test: Eye Tracking (WebSocket) & Liveness (HTTP)</h1>

  <div class="row">
    <!-- Eye Tracking -->
    <div class="card">
      <h2>Eye Tracking Stream</h2>
      <div class="row-3">
        <div>
          <label>JPEG Quality <span id="qVal">0.7</span></label>
          <input id="quality" type="range" min="0.3" max="0.95" step="0.05" value="0.7">
        </div>
        <div>
          <label>Send Every Nth Frame <span id="nthVal">1</span></label>
          <input id="nth" type="range" min="1" max="10" step="1" value="1">
        </div>
        <div>
          <label>Canvas Downscale (%) <span id="scaleVal">100</span></label>
          <input id="scale" type="range" min="30" max="100" step="5" value="100">
        </div>
      </div>

      <label>Camera</label>
      <video id="video" autoplay playsinline muted></video>
      <canvas id="canvas" hidden></canvas>

      <div style="margin-top:12px; display:flex; gap:8px;">
        <button id="startBtn">Start Streaming</button>
        <button class="secondary" id="stopBtn">Stop</button>
        <button class="secondary" id="snapBtn">Send Single Frame</button>
      </div>

      <div style="margin-top:12px;">
        <div class="stat" id="wsState">WS: (not connected)</div>
        <div class="stat" id="stats">sent: 0 | last: 0 KB | avg FPS: 0.0</div>
        <div class="stat">Note: this WS endpoint prints results on the server. If you later make it echo back JSON, they’ll appear below.</div>
      </div>

      <label style="margin-top:12px;">(Optional) Server Messages</label>
      <pre id="serverLog">—</pre>
    </div>

    <!-- Liveness -->
    <div class="card">
      <h2>Liveness Check (Upload)</h2>
      <label>Select Image</label>
      <input id="file" type="file" accept="image/*" />
      <div style="margin-top:12px; display:flex; gap:8px;">
        <button id="liveBtn">Upload & Check</button>
        <button class="secondary" id="liveSnapBtn">Snap From Camera & Check</button>
      </div>

      <label style="margin-top:12px;">Response JSON</label>
      <pre id="liveOut">—</pre>
    </div>
  </div>

<script>
(function() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const qInput = document.getElementById('quality');
  const nthInput = document.getElementById('nth');
  const scaleInput = document.getElementById('scale');
  const qVal = document.getElementById('qVal');
  const nthVal = document.getElementById('nthVal');
  const scaleVal = document.getElementById('scaleVal');

  const wsState = document.getElementById('wsState');
  const statsEl = document.getElementById('stats');
  const serverLog = document.getElementById('serverLog');

  const fileInput = document.getElementById('file');
  const liveOut = document.getElementById('liveOut');

  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const snapBtn = document.getElementById('snapBtn');
  const liveBtn = document.getElementById('liveBtn');
  const liveSnapBtn = document.getElementById('liveSnapBtn');

  let stream, ws, rafId = null, frameCount = 0, sentCount = 0;
  let lastReport = performance.now(), fpsSamples = [];
  let nth = parseInt(nthInput.value, 10);
  let quality = parseFloat(qInput.value);
  let downscale = parseInt(scaleInput.value, 10);

  qInput.oninput = () => (quality = parseFloat(qInput.value), qVal.textContent = qInput.value);
  nthInput.oninput = () => (nth = parseInt(nthInput.value, 10), nthVal.textContent = nthInput.value);
  scaleInput.oninput = () => (downscale = parseInt(scaleInput.value, 10), scaleVal.textContent = scaleInput.value);

  function wsUrl() {
    const proto = (location.protocol === 'https:') ? 'wss' : 'ws';
    return `${proto}://${location.host}/eye_tracking/`;
  }

  function updateStats(lastSizeBytes) {
    const now = performance.now();
    fpsSamples.push(1000 / (now - lastReport));
    if (fpsSamples.length > 20) fpsSamples.shift();
    const avgFps = fpsSamples.reduce((a,b) => a+b, 0) / Math.max(1, fpsSamples.length);

    statsEl.textContent = `sent: ${sentCount} | last: ${(lastSizeBytes/1024).toFixed(1)} KB | avg FPS: ${avgFps.toFixed(1)}`;
    lastReport = now;
  }

  async function ensureCamera() {
    if (stream) return;
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    console.log("Video tracking eyes:",stream)
    video.srcObject = stream;
    await video.play();
  }

  function drawToCanvas() {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return false;
    const s = Math.max(0.3, Math.min(1.0, downscale / 100));
    canvas.width = Math.round(vw * s);
    canvas.height = Math.round(vh * s);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return true;
  }

  async function sendOneFrame() {
    if (!ws || ws.readyState !== 1) return;
    if (!drawToCanvas()) return;
    console.log(ws)
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(); return; }
        const buf = await blob.arrayBuffer();
        ws.send(buf);
        sentCount++;
        updateStats(buf.byteLength);
        resolve();
      }, 'image/jpeg', quality);
    });
  }

  async function loop() {
    if (!ws || ws.readyState !== 1) { rafId = null; return; }
    frameCount++;
    if (frameCount % nth === 0) {
      await sendOneFrame();
    }
    rafId = requestAnimationFrame(loop);
  }

  function startStreaming() {
    if (rafId) return;
    ws = new WebSocket("ws://localhost:8000/api/chat/chatbot/eye_tracking/");
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => { wsState.textContent = 'WS: connected'; loop(); };
    ws.onclose = () => { wsState.textContent = 'WS: closed'; if (rafId) cancelAnimationFrame(rafId); rafId = null; };
    ws.onerror = (e) => { wsState.textContent = 'WS: error'; console.error(e); };

    // If you modify the server to echo JSON results, they’ll show here:
    ws.onmessage = (ev) => {
      try {
        const obj = JSON.parse(ev.data);
        serverLog.textContent = JSON.stringify(obj, null, 2);
      } catch {
        serverLog.textContent = String(ev.data || '—');
      }
    };
  }

  function stopStreaming() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (ws) { ws.close(); ws = null; }
  }

  // Buttons
  startBtn.onclick = async () => { await ensureCamera(); startStreaming(); };
  stopBtn.onclick = () => stopStreaming();
  snapBtn.onclick = async () => { await ensureCamera(); if (!ws || ws.readyState !== 1) { alert('WebSocket not connected'); return; } await sendOneFrame(); };

  // Liveness: upload file
  liveBtn.onclick = async () => {
    const file = fileInput.files?.[0];
    if (!file) { alert('Choose an image file first.'); return; }
    const fd = new FormData();
    fd.append('file', file, file.name);
    const res = await fetch('http://localhost:8000/api/chat/chatbot/liveness_check/', { method: 'POST', body: fd });
    const json = await res.json();
    liveOut.textContent = JSON.stringify(json, null, 2);
  };

  // Liveness: snap from camera
  liveSnapBtn.onclick = async () => {
    await ensureCamera();
    if (!drawToCanvas()) { alert('Camera not ready'); return; }
    canvas.toBlob(async (blob) => {
      const fd = new FormData();
      fd.append('file', new File([blob], 'snap.jpg', { type: 'image/jpeg' }));
      const res = await fetch('http://localhost:8000/api/chat/chatbot/liveness_check/', { method: 'POST', body: fd });
      const json = await res.json();
      liveOut.textContent = JSON.stringify(json, null, 2);
    }, 'image/jpeg', 0.9);
  };

  // Autostart camera preview (not streaming) for convenience
  ensureCamera().catch(console.error);
})();
</script>
</body>
</html>
    """
    )
