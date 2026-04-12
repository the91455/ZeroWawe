import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { QRCodeCanvas } from 'qrcode.react';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { generateNickname } from './utils/nicknames';
import { CryptoManager } from './utils/crypto';
import {
  Send, Radio, ArrowRight, Image as ImageIcon,
  Check, CheckCheck, Loader2, RefreshCw,
  Share2, Copy, QrCode, X, ShieldCheck
} from 'lucide-react';

const t = {
  tr: {
    connect: "BAĞLANTI KUR",
    catchFreq: "Frekans Yakala",
    enterNick: "Mesajlaşmak istediğin kişinin takma adını gir.",
    targetPlaceholder: "Hedef Nickname...",
    connected: (nick) => `${nick} ile dalga boyu yakalandı 📡`,
    waitingSecure: "Güvenli bağlantı henüz hazır değil...",
    verifyFirst: "Lütfen önce kimlik doğrulamasını tamamlayın!",
    encryptionError: "Şifreleme hatası!",
    connectionLost: "Dalga boyu koptu.",
    verify: "DOĞRULA VE BAŞLA",
    verificationTitle: "Güvenlik Doğrulaması",
    verificationDesc: "Bu konuşmanın güvenli olduğundan emin olmak için aşağıdaki parmak izlerini karşı taraf ile karşılaştırın.",
    fingerprintLabel: "GÜVENLİK PARMAK İZİ",
    fingerprintMatch: "Eğer kodlar eşleşiyorsa, güvenli bir kanal üzerindesiniz demektir.",
    shareWave: "DALGA BOYUNU PAYLAŞ",
    shareDesc: "Arkadaşın bu kodu taratarak sana bağlanabilir.",
    whisper: "Mesajını şifrele ve fısılda...",
    verifying: "Doğrulama bekleniyor...",
    verifyIdentity: "Kimliği Doğrula",
    waitingVerification: "Kimlik Doğrulaması Bekleniyor...",
    abort: "Vazgeç ve Bağlantıyı Kes",
    close: "KAPAT",
    share: "Paylaş",
    copy: "Kopyala",
    e2eeVerified: "E2EE DOĞRULANDI",
    verificationPending: "DOĞRULAMA BEKLENİYOR",
    identityAssigned: "KİMLİK ATANDI",
    enterFlow: "AKIŞA GİR",
    tagline: "Zero Trace. Pure Wave.",
    idUnavailable: "Bu kullanıcı adı alınmış. Yenileniyor...",
    userNotFound: "Bu takma ada sahip bir kullanıcı bulunamadı. Karşı tarafın online olduğundan emin olun.",
    errorOccurred: (type) => "Bir hata oluştu: " + type,
    cryptoFailed: "Güvenli bağlantı başlatılamadı.",
  },
  en: {
    connect: "CONNECT",
    catchFreq: "Catch the Frequency",
    enterNick: "Enter the nickname of the person you want to message.",
    targetPlaceholder: "Target Nickname...",
    connected: (nick) => `Waveform established with ${nick} 📡`,
    waitingSecure: "Secure connection not ready yet...",
    verifyFirst: "Please complete identity verification first!",
    encryptionError: "Encryption failed!",
    connectionLost: "Connection lost.",
    verify: "VERIFY AND START",
    verificationTitle: "Security Verification",
    verificationDesc: "Compare the fingerprints below with the other party to confirm this conversation is secure.",
    fingerprintLabel: "SECURITY FINGERPRINT",
    fingerprintMatch: "If the codes match, you are on a secure channel.",
    shareWave: "SHARE YOUR WAVEFORM",
    shareDesc: "Your friend can scan this code to connect with you.",
    whisper: "Encrypt your message and whisper...",
    verifying: "Verification pending...",
    verifyIdentity: "Verify Identity",
    waitingVerification: "Waiting for Identity Verification...",
    abort: "Abort and Disconnect",
    close: "CLOSE",
    share: "Share",
    copy: "Copy",
    e2eeVerified: "E2EE VERIFIED",
    verificationPending: "VERIFICATION PENDING",
    identityAssigned: "IDENTITY ASSIGNED",
    enterFlow: "ENTER THE FLOW",
    tagline: "Zero Trace. Pure Wave.",
    idUnavailable: "This username is taken. Refreshing...",
    userNotFound: "No user found with this nickname. Make sure the other party is online.",
    errorOccurred: (type) => "An error occurred: " + type,
    cryptoFailed: "Failed to initiate secure connection.",
  }
};

const Zerowawe = () => {
  // ── Lang (must come first so txt is available everywhere)
  const [lang, setLang] = useState(() => localStorage.getItem('zw_lang') || 'tr');
  const txt = t[lang];

  const [nickname, setNickname] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [peer, setPeer] = useState(null);
  const [conn, setConn] = useState(null);
  const [targetId, setTargetId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState('offline');
  const [remoteNick, setRemoteNick] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isSecure, setIsSecure] = useState(false);
  const [fingerprint, setFingerprint] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const cryptoManager = useRef(new CryptoManager());
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Persist lang preference
  useEffect(() => {
    localStorage.setItem('zw_lang', lang);
  }, [lang]);

  // Load saved nickname
  useEffect(() => {
    const savedNick = localStorage.getItem('zw_nick');
    setNickname(savedNick || generateNickname());
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  const initializePeer = (id) => {
    const newPeer = new Peer(id);

    newPeer.on('open', () => {
      setStatus('online');
    });

    newPeer.on('connection', (connection) => {
      setupConnection(connection);
    });

    newPeer.on('error', (err) => {
      console.error('Peer error type:', err.type);
      setIsLoading(false);
      if (err.type === 'unavailable-id') {
        alert(txt.idUnavailable);
        setNickname(generateNickname());
        setIsRegistered(false);
      } else if (err.type === 'peer-not-found') {
        alert(txt.userNotFound);
        setConn(null);
      } else {
        alert(txt.errorOccurred(err.type));
      }
    });

    setPeer(newPeer);
  };

  const setupConnection = (connection) => {
    connection.on('open', async () => {
      setConn(connection);
      setRemoteNick(connection.peer);
      setIsLoading(false);
      setIsVerified(false);

      try {
        await cryptoManager.current.generateKeyPair();
        const publicKey = await cryptoManager.current.exportPublicKey();
        connection.send({ type: 'handshake-syn', nick: nickname, key: publicKey });
      } catch (err) {
        console.error('Crypto handshake init failed:', err);
        alert(txt.cryptoFailed);
      }
    });

    connection.on('data', async (data) => {
      try {
        if (data.type === 'handshake-syn') {
          setRemoteNick(data.nick);
          if (data.key) {
            await cryptoManager.current.deriveSharedSecret(data.key);
            const myPublicKey = await cryptoManager.current.exportPublicKey();
            connection.send({ type: 'handshake-ack', nick: nickname, key: myPublicKey });
            setIsSecure(true);
            const fp = await cryptoManager.current.computeFingerprint(data.key);
            setFingerprint(fp);
            setShowVerificationModal(true);
          }
        } else if (data.type === 'handshake-ack') {
          if (data.key) {
            await cryptoManager.current.deriveSharedSecret(data.key);
            setIsSecure(true);
            const fp = await cryptoManager.current.computeFingerprint(data.key);
            setFingerprint(fp);
            setShowVerificationModal(true);
          }
        } else if (data.type === 'secure-msg') {
          const decryptedPayload = await cryptoManager.current.decrypt(data.payload);
          setMessages((prev) => [...prev, {
            id: decryptedPayload.id,
            sender: 'them',
            text: decryptedPayload.text,
            image: decryptedPayload.image,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          connection.send({ type: 'ack', id: decryptedPayload.id });
        } else if (data.type === 'ack') {
          setMessages((prev) => prev.map(m => m.id === data.id ? { ...m, delivered: true } : m));
        }
      } catch (err) {
        console.error('Secure processing error:', err);
      }
    });

    connection.on('close', () => {
      setConn(null);
      setRemoteNick('');
      setMessages([]);
      setIsLoading(false);
      setIsSecure(false);
      setIsVerified(false);
      setFingerprint('');
      setShowVerificationModal(false);
      alert(txt.connectionLost);
    });
  };

  const handleRegister = () => {
    if (!nickname.trim()) return;
    setIsLoading(true);
    localStorage.setItem('zw_nick', nickname);
    initializePeer(nickname);
    setIsRegistered(true);
    setIsLoading(false);
  };

  const connectToPeer = () => {
    if (!peer || !targetId.trim()) return;
    setIsLoading(true);
    const connection = peer.connect(targetId.trim());
    setupConnection(connection);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Zerowawe',
        text: `${txt.shareDesc} ${nickname}`,
        dialogTitle: txt.shareWave,
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handleCopy = async () => {
    try {
      await Clipboard.write({ string: nickname });
    } catch (err) {
      navigator.clipboard.writeText(nickname);
    }
  };

  const handleVerify = () => {
    setIsVerified(true);
    setShowVerificationModal(false);
  };

  const sendMessage = async (image = null) => {
    if (!conn || (!inputText.trim() && !image)) return;
    if (!isSecure) {
      alert(txt.waitingSecure);
      return;
    }
    if (!isVerified) {
      alert(txt.verifyFirst);
      setShowVerificationModal(true);
      return;
    }

    const msgId = crypto.randomUUID();
    const payload = { id: msgId, text: inputText, image };

    try {
      const encrypted = await cryptoManager.current.encrypt(payload);
      conn.send({
        type: 'secure-msg',
        payload: {
          iv: Array.from(encrypted.iv),
          ciphertext: Array.from(encrypted.ciphertext)
        }
      });

      setMessages((prev) => [...prev, {
        id: msgId,
        sender: 'me',
        text: inputText,
        image,
        delivered: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setInputText('');
    } catch (err) {
      console.error('Encryption failed:', err);
      alert(txt.encryptionError);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => sendMessage(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── LANG TOGGLE BUTTON (reusable)
  const LangToggle = () => (
    <button
      onClick={() => setLang(l => l === 'tr' ? 'en' : 'tr')}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'white',
        padding: '8px 14px',
        borderRadius: '12px',
        fontWeight: 700,
        fontSize: '0.8rem',
        cursor: 'pointer',
        letterSpacing: '0.05em'
      }}
    >
      {lang === 'tr' ? 'EN' : 'TR'}
    </button>
  );

  // ── REGISTER SCREEN
  if (!isRegistered) {
    return (
      <div className="app-container">
        <div className="bg-wave"></div>
        <div className="content-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>

          {/* Lang toggle top-right */}
          <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
            <LangToggle />
          </div>

          <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="logo-container">
              <img src="/logo.png" alt="Zerowawe Logo" className="neon-logo" />
            </div>
            <p className="splash-subtitle">{txt.tagline}</p>
          </div>

          <div className="glass-card fade-in-up" style={{ width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                {txt.identityAssigned}
              </span>
              <button
                onClick={() => setNickname(generateNickname())}
                style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer' }}
              >
                <RefreshCw size={18} />
              </button>
            </div>

            <input
              className="input-field"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={{ textAlign: 'center', fontWeight: 'bold', letterSpacing: '1px' }}
            />

            <button
              className="btn-glow"
              style={{ width: '100%', marginTop: '2rem' }}
              onClick={handleRegister}
              disabled={isLoading}
            >
              {isLoading
                ? <Loader2 className="animate-spin" />
                : <>{txt.enterFlow} <ArrowRight size={20} /></>
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN SCREEN
  return (
    <div className="app-container">
      <div className="bg-wave"></div>
      <div className="content-wrapper">

        {/* ── HEADER */}
        <header style={{
          padding: '1.5rem 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              onClick={() => setShowQR(true)}
              style={{
                width: '45px', height: '45px', borderRadius: '15px',
                background: 'linear-gradient(135deg, #1a1a1a, #0d0d0d)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                cursor: 'pointer', border: '1px solid rgba(0,229,255,0.2)'
              }}
            >
              <QrCode size={24} color="var(--accent-secondary)" />
            </div>
            <div>
              <h2 style={{
                fontSize: '1rem', fontWeight: 800,
                maxWidth: '180px', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {nickname}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                <span className={`status-indicator status-${status}`}></span> {status.toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <LangToggle />
            <button
              onClick={handleShare}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}
            >
              <Share2 size={20} />
            </button>
            {conn && (
              <button
                onClick={() => setConn(null)}
                style={{ background: 'rgba(255,23,68,0.1)', color: '#ff1744', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {txt.close}
              </button>
            )}
          </div>
        </header>

        {/* ── BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 0', display: 'flex', flexDirection: 'column' }}>

          {!conn ? (
            /* ── CONNECT SCREEN */
            <div className="fade-in-up" style={{ marginTop: '5vh' }}>
              <div className="glass-card" style={{ textAlign: 'center' }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '20px',
                  backgroundColor: 'rgba(0,229,255,0.1)',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  margin: '0 auto 1.5rem'
                }}>
                  <Radio size={32} color="var(--accent-secondary)" />
                </div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.4rem' }}>{txt.catchFreq}</h3>
                <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{txt.enterNick}</p>

                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <input
                    className="input-field"
                    placeholder={txt.targetPlaceholder}
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') connectToPeer(); }}
                    style={{ fontSize: '0.9rem' }}
                  />
                  <button
                    onClick={() => setTargetId('')}
                    style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <button className="btn-glow" style={{ width: '100%' }} onClick={connectToPeer} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : txt.connect}
                </button>
              </div>

              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button
                  onClick={handleCopy}
                  style={{
                    background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-dim)', padding: '12px 20px', borderRadius: '14px',
                    fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center',
                    gap: '8px', maxWidth: '100%', cursor: 'pointer'
                  }}
                >
                  <Copy size={16} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nickname}</span>
                </button>
              </div>
            </div>

          ) : (
            /* ── CHAT SCREEN */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{
                  fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)',
                  padding: '6px 14px', borderRadius: '20px', color: 'var(--text-dim)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  maxWidth: '90%', display: 'inline-block',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {txt.connected(remoteNick)}
                </span>

                {isSecure && (
                  <div style={{
                    marginTop: '0.5rem', display: 'flex', justifyContent: 'center',
                    alignItems: 'center', gap: '5px',
                    color: isVerified ? '#00e676' : '#ffea00', fontSize: '0.7rem'
                  }}>
                    {isVerified
                      ? <><ShieldCheck size={14} /> {txt.e2eeVerified}</>
                      : <><Loader2 size={14} className="animate-spin" /> {txt.verificationPending}</>
                    }
                  </div>
                )}
              </div>

              {!isVerified && isSecure ? (
                <div className="fade-in-up" style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  justifyContent: 'center', alignItems: 'center', opacity: 0.7
                }}>
                  <ShieldCheck size={48} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-dim)' }}>{txt.waitingVerification}</p>
                  <button
                    className="btn-glow"
                    style={{ marginTop: '1rem', padding: '0.5rem 1.5rem' }}
                    onClick={() => setShowVerificationModal(true)}
                  >
                    {txt.verifyIdentity}
                  </button>
                </div>
              ) : (
                <>
                  {messages.map((m, index) => (
                    <div
                      key={m.id}
                      className={`chat-bubble bubble-${m.sender} ${index === messages.length - 1 ? 'fade-in-up' : ''}`}
                    >
                      {m.image && <img src={m.image} className="img-preview" alt="sent" />}
                      {m.text && <div>{m.text}</div>}
                      <div className="msg-status">
                        <span style={{ opacity: 0.6 }}>{m.time}</span>
                        {m.sender === 'me' && (
                          m.delivered
                            ? <CheckCheck size={14} color="var(--accent-secondary)" />
                            : <Check size={14} color="#aaa" />
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          )}
        </div>

        {/* ── INPUT BAR */}
        {conn && (
          <div style={{
            padding: '1rem 0', display: 'flex', gap: '0.8rem', alignItems: 'center',
            opacity: isVerified ? 1 : 0.5,
            pointerEvents: isVerified ? 'auto' : 'none'
          }}>
            <button
              onClick={() => fileInputRef.current.click()}
              style={{
                background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white',
                padding: '1rem', borderRadius: '16px',
                display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
              }}
            >
              <ImageIcon size={22} />
            </button>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleImageSelect}
            />
            <input
              className="input-field"
              placeholder={isVerified ? txt.whisper : txt.verifying}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }}
              style={{ flex: 1 }}
              disabled={!isSecure || !isVerified}
            />
            <button
              className="btn-glow"
              style={{ padding: '1rem' }}
              onClick={(e) => { e.preventDefault(); sendMessage(); }}
              disabled={!isSecure || !isVerified}
            >
              <Send size={22} />
            </button>
          </div>
        )}

        {/* ── VERIFICATION MODAL */}
        {showVerificationModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 3000,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem'
          }}>
            <div className="glass-card fade-in-up" style={{
              width: '100%', maxWidth: '400px', textAlign: 'center',
              border: '2px solid #ffea00', boxShadow: '0 0 50px rgba(255,234,0,0.2)'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <ShieldCheck size={48} color="#ffea00" style={{ margin: '0 auto' }} />
                <h2 style={{ marginTop: '1rem', color: '#ffea00' }}>{txt.verificationTitle}</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  {txt.verificationDesc}
                </p>
              </div>

              <div style={{
                background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px',
                marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                  {txt.fingerprintLabel}
                </div>
                <div style={{
                  fontFamily: 'monospace', fontSize: '1rem', fontWeight: 'bold',
                  color: 'white', letterSpacing: '1px', wordBreak: 'break-all'
                }}>
                  {fingerprint}
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '2rem' }}>
                {txt.fingerprintMatch}
              </p>

              <button
                className="btn-glow"
                style={{ width: '100%', background: '#ffea00', color: 'black', fontWeight: 'bold' }}
                onClick={handleVerify}
              >
                {txt.verify}
              </button>
              <button
                style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--text-dim)', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => setConn(null)}
              >
                {txt.abort}
              </button>
            </div>
          </div>
        )}

        {/* ── QR CODE MODAL */}
        {showQR && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem'
          }}>
            <div className="glass-card fade-in-up" style={{
              width: '100%', maxWidth: '350px', textAlign: 'center',
              border: '2px solid var(--accent-secondary)', position: 'relative'
            }}>
              <button
                onClick={() => setShowQR(false)}
                style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>

              <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-secondary)' }}>{txt.shareWave}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '5px' }}>{txt.shareDesc}</p>
              </div>

              <div style={{
                padding: '1rem', backgroundColor: 'white', borderRadius: '20px',
                display: 'inline-block', boxShadow: '0 0 30px rgba(0,229,255,0.3)'
              }}>
                <QRCodeCanvas value={nickname} size={200} />
              </div>

              <div style={{ marginTop: '1.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {nickname}
              </div>

              {isSecure && fingerprint && (
                <div style={{
                  marginTop: '1rem', padding: '10px',
                  background: 'rgba(0,255,0,0.1)', borderRadius: '10px',
                  border: '1px solid rgba(0,255,0,0.3)'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#00e676', fontWeight: 'bold' }}>
                    {txt.fingerprintLabel}
                  </div>
                  <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: '4px' }}>
                    {fingerprint}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                <button className="btn-glow" style={{ flex: 1, padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={handleShare}>
                  <Share2 size={18} /> {txt.share}
                </button>
                <button
                  className="btn-glow"
                  style={{ flex: 1, padding: '0.8rem', background: 'var(--bg-card)', border: '1px solid var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={handleCopy}
                >
                  <Copy size={18} /> {txt.copy}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Zerowawe;
