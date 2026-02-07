import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { QRCodeCanvas } from 'qrcode.react';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { generateNickname } from './utils/nicknames';
import {
  Send, Radio, ArrowRight, Image as ImageIcon,
  Check, CheckCheck, Loader2, RefreshCw,
  Share2, Copy, QrCode, X, ExternalLink
} from 'lucide-react';

const Zerowawe = () => {
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

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedNick = localStorage.getItem('zw_nick');
    setNickname(savedNick || generateNickname());
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  const initializePeer = (id) => {
    const newPeer = new Peer(id);

    newPeer.on('open', (id) => {
      setStatus('online');
    });

    newPeer.on('connection', (connection) => {
      setupConnection(connection);
    });

    newPeer.on('error', (err) => {
      console.error('Peer error type:', err.type);
      setIsLoading(false);
      if (err.type === 'unavailable-id') {
        alert('Bu kullanıcı adı alınmış. Yenileniyor...');
        setNickname(generateNickname());
        setIsRegistered(false);
      } else if (err.type === 'peer-not-found') {
        alert('Bu takma ada sahip bir kullanıcı bulunamadı. Karşı tarafın online olduğundan emin olun.');
        setConn(null);
      } else {
        alert('Bir hata oluştu: ' + err.type);
      }
    });

    setPeer(newPeer);
  };

  const setupConnection = (connection) => {
    // Only set the connection state once it is actually open
    connection.on('open', () => {
      setConn(connection);
      setRemoteNick(connection.peer);
      setIsLoading(false);
      connection.send({ type: 'handshake', nick: nickname });
    });

    connection.on('data', (data) => {
      if (data.type === 'handshake') {
        setRemoteNick(data.nick);
      } else if (data.type === 'msg') {
        setMessages((prev) => [...prev, {
          id: data.id,
          sender: 'them',
          text: data.text,
          image: data.image,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        connection.send({ type: 'ack', id: data.id });
      } else if (data.type === 'ack') {
        setMessages((prev) => prev.map(m => m.id === data.id ? { ...m, delivered: true } : m));
      }
    });

    connection.on('close', () => {
      setConn(null);
      setRemoteNick('');
      setMessages([]);
      setIsLoading(false);
      alert('Dalga boyu koptu.');
    });
  };

  const handleRegister = () => {
    if (!nickname) return;
    setIsLoading(true);
    localStorage.setItem('zw_nick', nickname);
    setIsRegistered(true);
    initializePeer(nickname);
    // Note: PeerJS 'open' will clear isLoading
    setTimeout(() => setIsLoading(false), 3000);
  };

  const handleShare = async () => {
    await Share.share({
      title: 'Zerowawe İletişim',
      text: `Selam! Zerowawe üzerinden benimle anonim konuşabilirsin. Nickim: ${nickname}`,
      dialogTitle: 'Nick Paylaş',
    });
  };

  const handleCopy = async () => {
    await Clipboard.write({
      string: nickname
    });
    alert('Nickname kopyalandı!');
  };

  const connectToPeer = () => {
    if (!peer || !targetId) return;
    if (targetId === nickname) {
      alert('Kendine bağlanamazsın delikanlı!');
      return;
    }
    setIsLoading(true);
    const connection = peer.connect(targetId);
    setupConnection(connection);

    // Safety timeout for connection
    setTimeout(() => {
      if (!connection.open) {
        setIsLoading(false);
      }
    }, 10000);
  };

  const sendMessage = (image = null) => {
    if (!conn || (!inputText.trim() && !image)) return;

    const msgId = crypto.randomUUID();
    const msgData = {
      type: 'msg',
      id: msgId,
      text: inputText,
      image: image
    };

    conn.send(msgData);

    setMessages((prev) => [...prev, {
      id: msgId,
      sender: 'me',
      text: inputText,
      image: image,
      delivered: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    setInputText('');
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        sendMessage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isRegistered) {
    return (
      <div className="app-container">
        <div className="bg-wave"></div>
        <div className="content-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <img src="/zerowawe_banner.png" alt="Zerowawe Logo" style={{ width: '180px', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem' }}>Zero Trace. Pure Wave.</p>
          </div>

          <div className="glass-card fade-in-up" style={{ width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 600 }}>IDENTITY ASSIGNED</span>
              <button onClick={() => setNickname(generateNickname())} style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)' }}>
                <RefreshCw size={18} />
              </button>
            </div>

            <input
              className="input-field"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={{ textAlign: 'center', fontWeight: 'bold', letterSpacing: '1px' }}
            />

            <button className="btn-glow" style={{ width: '100%', marginTop: '2rem' }} onClick={handleRegister} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <>ENTER THE FLOW <ArrowRight size={20} /></>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="bg-wave"></div>
      <div className="content-wrapper">
        <header style={{ padding: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              onClick={() => setShowQR(true)}
              style={{ width: '45px', height: '45px', borderRadius: '15px', background: 'linear-gradient(135deg, #1a1a1a, #0d0d0d)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '1px solid rgba(0,229,255,0.2)' }}
            >
              <QrCode size={24} color="var(--accent-secondary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nickname}</h2>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                <span className={`status-indicator status-${status}`}></span> {status.toUpperCase()}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleShare} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '10px', borderRadius: '12px' }}>
              <Share2 size={20} />
            </button>
            {conn && (
              <button onClick={() => setConn(null)} style={{ background: 'rgba(255,23,68,0.1)', color: '#ff1744', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>
                KAPAT
              </button>
            )}
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 0', display: 'flex', flexDirection: 'column' }}>
          {!conn ? (
            <div className="fade-in-up" style={{ marginTop: '5vh' }}>
              <div className="glass-card" style={{ textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: 'rgba(0,229,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem' }}>
                  <Radio size={32} color="var(--accent-secondary)" />
                </div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.4rem' }}>Frekans Yakala</h3>
                <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Mesajlaşmak istediğin kişinin takma adını gir.</p>
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <input
                    className="input-field"
                    placeholder="Hedef Nickname..."
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    style={{ fontSize: '0.9rem' }}
                  />
                  <button
                    onClick={() => {
                      // Example of pasting from clipboard if needed, but for now just a clear button
                      setTargetId('');
                    }}
                    style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)' }}
                  >
                    <X size={18} />
                  </button>
                </div>
                <button className="btn-glow" style={{ width: '100%' }} onClick={connectToPeer} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : 'BAĞLANTI KUR'}
                </button>
              </div>

              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button
                  onClick={handleCopy}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-dim)', padding: '12px 20px', borderRadius: '14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '8px', maxWidth: '100%' }}
                >
                  <Copy size={16} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nickname}</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '20px', color: 'var(--text-dim)', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '90%', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {remoteNick} ile dalga boyu yakalandı 📡
                </span>
              </div>
              {messages.map((m) => (
                <div key={m.id} className={`chat-bubble bubble-${m.sender} fade-in-up`}>
                  {m.image && <img src={m.image} className="img-preview" alt="sent" />}
                  {m.text && <div>{m.text}</div>}
                  <div className="msg-status">
                    <span style={{ opacity: 0.6 }}>{m.time}</span>
                    {m.sender === 'me' && (
                      m.delivered ? <CheckCheck size={14} color="var(--accent-secondary)" /> : <Check size={14} color="#aaa" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {conn && (
          <div style={{ padding: '1rem 0', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <button
              onClick={() => fileInputRef.current.click()}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '1rem', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
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
              placeholder="Mesajını fısılda..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              style={{ flex: 1 }}
            />
            <button className="btn-glow" style={{ padding: '1rem' }} onClick={() => sendMessage()}>
              <Send size={22} />
            </button>
          </div>
        )}

        {/* QR CODE MODAL */}
        {showQR && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
            <div className="glass-card fade-in-up" style={{ width: '100%', maxWidth: '350px', textAlign: 'center', border: '2px solid var(--accent-secondary)' }}>
              <button onClick={() => setShowQR(false)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: 'white' }}>
                <X size={24} />
              </button>
              <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-secondary)' }}>DALGA BOYUNU PAYLAŞ</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '5px' }}>Arkadaşın bu kodu taratarak sana bağlanabilir.</p>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '20px', display: 'inline-block', boxShadow: '0 0 30px rgba(0, 229, 255, 0.3)' }}>
                <QRCodeCanvas value={nickname} size={200} />
              </div>

              <div style={{ marginTop: '1.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {nickname}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                <button className="btn-glow" style={{ flex: 1, padding: '0.8rem' }} onClick={handleShare}>
                  <Share2 size={18} /> Paylaş
                </button>
                <button className="btn-glow" style={{ flex: 1, padding: '0.8rem', background: 'var(--bg-card)', border: '1px solid var(--accent-secondary)' }} onClick={handleCopy}>
                  <Copy size={18} /> Kopyala
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
